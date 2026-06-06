/**
 * One-off: deactivate existing "parent-ATS leak" roles — jobs mislabelled with a
 * portfolio company's name whose apply URL is actually a different company's
 * enterprise ATS account (e.g. Koch's koch.avature.net roles labelled "Sentient
 * Energy"). See scrapers/ats.ts for the detection logic.
 *
 * These aren't caught by the URL-verify sweep because the apply URLs are live —
 * they just point at the wrong employer. The scraper now drops them at source;
 * this clears the ones already in the DB.
 *
 * Dry-run by default. Pass --apply to actually deactivate.
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
import { isAtsLeak, extractAtsTenant } from './scrapers/ats'

const APPLY = process.argv.includes('--apply')

async function main() {
  const supabase = getSupabase()

  // Page through active roles (light query — joining sources across all rows
  // trips Supabase's statement timeout, so fetch sources separately below).
  const roles: { id: string; company_name: string; role_title: string }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('tracker_roles')
      .select('id, company_name, role_title')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) { console.error(error.message); process.exit(1) }
    if (!data || data.length === 0) break
    roles.push(...(data as any))
    if (data.length < PAGE) break
  }
  if (roles.length === 0) { console.log('No active roles.'); return }

  console.log(`Scanning ${roles.length} active roles for parent-ATS leaks...`)

  // Fetch sources in batches keyed by role id.
  const sourcesByRole = new Map<string, string[]>()
  const ids = roles.map(r => r.id)
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200)
    const { data, error } = await supabase
      .from('tracker_role_sources')
      .select('tracker_role_id, application_url')
      .in('tracker_role_id', batch)
    if (error) { console.error(error.message); process.exit(1) }
    for (const s of (data as any[]) || []) {
      if (!s.application_url) continue
      const arr = sourcesByRole.get(s.tracker_role_id) || []
      arr.push(s.application_url)
      sourcesByRole.set(s.tracker_role_id, arr)
    }
  }
  console.log('')

  // A role is a leak only if it has sources AND every source is a mismatched
  // ATS account — if any source is company-hosted/matching, the label is real.
  const leaks: { id: string; company: string; title: string; host: string }[] = []
  for (const role of roles) {
    const urls = sourcesByRole.get(role.id) || []
    if (urls.length === 0) continue
    const allLeak = urls.every(u => isAtsLeak(role.company_name, u))
    if (allLeak) {
      let host = ''
      try { host = new URL(urls[0]).hostname } catch {}
      const tenant = extractAtsTenant(urls[0])
      leaks.push({ id: role.id, company: role.company_name, title: role.role_title, host: `${host} (tenant: ${tenant})` })
    }
  }

  if (leaks.length === 0) { console.log('No leaks found.'); return }

  // Group for a readable summary
  const byCompany: Record<string, { count: number; host: string }> = {}
  for (const l of leaks) {
    byCompany[l.company] = byCompany[l.company] || { count: 0, host: l.host }
    byCompany[l.company].count++
  }
  console.log(`Found ${leaks.length} leak roles across ${Object.keys(byCompany).length} mislabelled companies:`)
  for (const [co, info] of Object.entries(byCompany).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${info.count.toString().padStart(3)}  ${co}  <-  ${info.host}`)
  }

  if (!APPLY) {
    console.log('\nDRY RUN — no changes made. Re-run with --apply to deactivate these.')
    return
  }

  const leakIds = leaks.map(l => l.id)
  let deactivated = 0
  for (let i = 0; i < leakIds.length; i += 100) {
    const batch = leakIds.slice(i, i + 100)
    const { error: e } = await supabase
      .from('tracker_roles')
      .update({ is_active: false })
      .in('id', batch)
    if (e) { console.error(e.message); continue }
    deactivated += batch.length
  }
  console.log(`\nDeactivated ${deactivated}/${leaks.length} leak roles.`)
}

main().catch(e => { console.error(e); process.exit(1) })
