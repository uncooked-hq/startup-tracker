/**
 * One-off: deactivate active roles whose apply URLs are dead — 404/410 or a
 * removed-posting redirect to a board/careers root. These slip past the normal
 * prune because Jina returns cached 200 content for them; this uses a direct
 * fetch (checkUrlLiveness) instead. The prune in run-all.ts now does the same
 * going forward; this clears the backlog already in the DB.
 *
 * Only deactivates a role when EVERY one of its source URLs is 'dead' — 'unknown'
 * (blocked / throttled / timeout) is treated as inconclusive and left active.
 *
 * Dry-run by default. Pass --apply to deactivate.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(__dirname, '.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.replace(/\r/g, '').split('\n')) {
  const match = line.match(/^([^#=]+)=(.+)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

import { getSupabase } from './scrapers/supabase'
import { checkUrlLiveness, type Liveness } from './scrapers/description-enricher'

const APPLY = process.argv.includes('--apply')
const CONCURRENCY = 20

async function pool<T>(items: T[], fn: (t: T) => Promise<void>) {
  let i = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const idx = i++
        await fn(items[idx])
      }
    }),
  )
}

async function main() {
  const supabase = getSupabase()

  // Page through active roles (light), then batch-fetch their sources.
  const roles: { id: string; company_name: string }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('tracker_roles')
      .select('id, company_name')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) { console.error(error.message); process.exit(1) }
    if (!data || data.length === 0) break
    roles.push(...(data as any))
    if (data.length < PAGE) break
  }
  if (roles.length === 0) { console.log('No active roles.'); return }

  const ids = roles.map(r => r.id)
  const sourcesByRole = new Map<string, string[]>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('tracker_role_sources')
      .select('tracker_role_id, application_url')
      .in('tracker_role_id', ids.slice(i, i + 200))
    if (error) { console.error(error.message); process.exit(1) }
    for (const s of (data as any[]) || []) {
      if (!s.application_url) continue
      const arr = sourcesByRole.get(s.tracker_role_id) || []
      arr.push(s.application_url)
      sourcesByRole.set(s.tracker_role_id, arr)
    }
  }

  // Build the set of roles to check (those with at least one source URL).
  const toCheck = roles
    .map(r => ({ ...r, urls: sourcesByRole.get(r.id) || [] }))
    .filter(r => r.urls.length > 0)
  console.log(`Checking apply-URL liveness for ${toCheck.length} active roles (concurrency ${CONCURRENCY})...\n`)

  // Cache liveness per URL so shared URLs aren't fetched twice.
  const livenessCache = new Map<string, Liveness>()
  const allUrls = Array.from(new Set(toCheck.flatMap(r => r.urls)))
  let done = 0
  await pool(allUrls, async (url) => {
    livenessCache.set(url, await checkUrlLiveness(url))
    if (++done % 250 === 0) console.log(`  …checked ${done}/${allUrls.length} URLs`)
  })

  // A role is dead only if every one of its sources is 'dead'.
  const dead: { id: string; company: string; host: string }[] = []
  for (const r of toCheck) {
    if (r.urls.every(u => livenessCache.get(u) === 'dead')) {
      let host = ''
      try { host = new URL(r.urls[0]).hostname } catch {}
      dead.push({ id: r.id, company: r.company_name, host })
    }
  }

  // Liveness distribution for context.
  const dist: Record<Liveness, number> = { live: 0, dead: 0, unknown: 0 }
  for (const v of livenessCache.values()) dist[v]++
  console.log(`\nURL liveness: live=${dist.live}  dead=${dist.dead}  unknown=${dist.unknown}`)

  if (dead.length === 0) { console.log('No fully-dead roles found.'); return }

  const byHost: Record<string, number> = {}
  for (const d of dead) byHost[d.host] = (byHost[d.host] || 0) + 1
  console.log(`\n${dead.length} roles with all-dead apply URLs. Top hosts:`)
  for (const [h, c] of Object.entries(byHost).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${c.toString().padStart(4)}  ${h}`)
  }
  console.log('\nSample:')
  for (const d of dead.slice(0, 15)) console.log(`  ${d.company}  (${d.host})`)

  if (!APPLY) {
    console.log('\nDRY RUN — no changes made. Re-run with --apply to deactivate these.')
    return
  }

  const leakIds = dead.map(d => d.id)
  let deactivated = 0
  for (let i = 0; i < leakIds.length; i += 100) {
    const batch = leakIds.slice(i, i + 100)
    const { error } = await supabase.from('tracker_roles').update({ is_active: false }).in('id', batch)
    if (error) { console.error(error.message); continue }
    deactivated += batch.length
  }
  console.log(`\nDeactivated ${deactivated}/${dead.length} dead roles.`)
}

main().catch(e => { console.error(e); process.exit(1) })
