/**
 * Shared stale-role pruning, used by BOTH the local runner (run-all.ts) and the
 * deployed Lambda (handler.ts) so expiry behaves identically wherever the scrape
 * executes.
 *
 * Two passes:
 *  1. verifyAndDeactivateUnseenJobs — for every active role NOT seen in this run,
 *     directly fetch its source URL(s). A role survives only if a source is
 *     genuinely live (direct fetch resolves to a real posting) and isn't showing
 *     an expired banner. Catches dead postings that Jina masks with cached 200s.
 *  2. deactivateOldJobs — backstop age cap on posting_date.
 *
 * Both are idempotent, so the unseen pass accepts an optional wall-clock deadline:
 * inside a time-limited Lambda it prunes what it can and the next run continues.
 */
import { getSupabase } from './supabase'
import { fetchDescription, isExpiredPage, checkUrlLiveness } from './description-enricher'

export interface PruneOptions {
  /** Stop launching new URL checks once Date.now() passes this. Omit = no limit. */
  deadlineAt?: number
  log?: (msg: string) => void
}

type ActiveRole = { id: string; urls: string[] }

/** Page through active roles (light) + batch their source URLs. Joining across
 *  all rows trips Supabase's statement timeout, and a plain select is capped at
 *  1000 rows — so we paginate explicitly. */
async function loadActiveRoles(): Promise<ActiveRole[]> {
  const supabase = getSupabase()
  const ids: string[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('tracker_roles')
      .select('id')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    for (const r of data as any[]) ids.push(r.id)
    if (data.length < PAGE) break
  }

  const urlsByRole = new Map<string, string[]>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('tracker_role_sources')
      .select('tracker_role_id, application_url')
      .in('tracker_role_id', ids.slice(i, i + 200))
    if (error) throw new Error(error.message)
    for (const s of (data as any[]) || []) {
      if (!s.application_url) continue
      const arr = urlsByRole.get(s.tracker_role_id) || []
      arr.push(s.application_url)
      urlsByRole.set(s.tracker_role_id, arr)
    }
  }
  return ids.map(id => ({ id, urls: urlsByRole.get(id) || [] }))
}

/** A role is live unless we have POSITIVE evidence every source is gone.
 *
 *  A source counts as gone only if the direct fetch says 'dead' (404/410,
 *  redirect to a listing root, not-found) OR Jina content shows an explicit
 *  expired banner. Anything inconclusive — 'unknown' (bot-blocked / throttled)
 *  with no readable content — is treated as alive, so a transient block (or a
 *  failed scraper that left the role unseen) can't deactivate a live posting.
 *  Genuinely-dead-but-unreachable URLs are caught later by the 60-day age cap. */
async function isRoleLive(urls: string[]): Promise<boolean> {
  for (const url of urls) {
    const liveness = await checkUrlLiveness(url)
    if (liveness === 'dead') continue // positive evidence this source is gone
    // 'live' or 'unknown': alive unless the page explicitly shows an expired banner.
    const desc = await fetchDescription(url)
    if (!desc || !isExpiredPage(desc)) return true
  }
  return false
}

export async function verifyAndDeactivateUnseenJobs(
  seenRoleIds: Set<string>,
  opts: PruneOptions = {},
): Promise<{ deactivated: number; checked: number; unseen: number; timedOut: boolean }> {
  const log = opts.log ?? console.log
  const supabase = getSupabase()

  let active: ActiveRole[]
  try {
    active = await loadActiveRoles()
  } catch (e) {
    log(`Error fetching active roles: ${e instanceof Error ? e.message : e}`)
    return { deactivated: 0, checked: 0, unseen: 0, timedOut: false }
  }

  const unseen = active.filter(r => !seenRoleIds.has(r.id))
  if (unseen.length === 0) return { deactivated: 0, checked: 0, unseen: 0, timedOut: false }

  log(`Verifying ${unseen.length} unseen active roles via URL fetch...`)

  const toDeactivate: string[] = []
  let checked = 0
  let timedOut = false

  // Bounded worker pool; checkUrlLiveness/fetchDescription have their own
  // internal concurrency caps, so a handful of workers is plenty.
  let cursor = 0
  const worker = async () => {
    while (cursor < unseen.length) {
      if (opts.deadlineAt && Date.now() > opts.deadlineAt) { timedOut = true; return }
      const role = unseen[cursor++]
      if (role.urls.length === 0) {
        // Orphaned role with no sources — UI hides it anyway; mark inactive.
        toDeactivate.push(role.id)
        continue
      }
      checked += role.urls.length
      const live = await isRoleLive(role.urls)
      if (!live) toDeactivate.push(role.id)
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()))

  let deactivated = 0
  for (let i = 0; i < toDeactivate.length; i += 100) {
    const batch = toDeactivate.slice(i, i + 100)
    const { error } = await supabase.from('tracker_roles').update({ is_active: false }).in('id', batch)
    if (error) log(`Error deactivating roles: ${error.message}`)
    else deactivated += batch.length
  }

  if (timedOut) log(`Prune hit time budget — deactivated ${deactivated} so far; remaining unseen will be checked next run.`)
  return { deactivated, checked, unseen: unseen.length, timedOut }
}

/** Deactivate roles whose posting_date is older than maxAgeDays (cheap backstop). */
export async function deactivateOldJobs(
  maxAgeDays: number,
  log: (msg: string) => void = console.log,
): Promise<{ deactivated: number }> {
  const supabase = getSupabase()
  const threshold = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)

  const { data: oldRoles, error } = await supabase
    .from('tracker_roles')
    .select('id')
    .eq('is_active', true)
    .lt('posting_date', threshold.toISOString())

  if (error) { log(`Error finding old jobs: ${error.message}`); return { deactivated: 0 } }
  if (!oldRoles || oldRoles.length === 0) return { deactivated: 0 }

  const ids = oldRoles.map((r: any) => r.id)
  let deactivated = 0
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const { error: e } = await supabase.from('tracker_roles').update({ is_active: false }).in('id', batch)
    if (e) log(`Error deactivating old jobs: ${e.message}`)
    else deactivated += batch.length
  }
  return { deactivated }
}
