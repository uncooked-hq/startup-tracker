/**
 * One-off: backfill funding_round on active tracker_roles from the STRUCTURED
 * funding_details only (e.g. "$30B Series G · Founded 2021").
 *
 * Deliberately does NOT read role_description — scanning free text for stage
 * words produced wrong/random rounds (e.g. a Series D company tagged "Seed"),
 * which is exactly the data cleanup-bad-stages.ts removes. Stage now comes only
 * from authoritative structured sources.
 *
 * Run with: npx tsx lambda/backfill-funding-round.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
const envPath = resolve(__dirname, '.env')
for (const line of readFileSync(envPath, 'utf-8').replace(/\r/g, '').split('\n')) {
  const m = line.match(/^([^#=]+)=(.+)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

import { getSupabase } from './scrapers/supabase'

// Latest-round-wins. pre-seed must be checked before seed (regex word boundary
// on `seed` would match inside `pre-seed`).
function extractRound(text: string): string | null {
  if (/\bpre-?seed\b/i.test(text)) return 'Pre-Seed'
  if (/\bipo\b/i.test(text)) return 'IPO'
  const m = text.match(/\bseries\s+([a-h])\b/i)
  if (m) return `Series ${m[1].toUpperCase()}`
  if (/\bseed\b/i.test(text)) return 'Seed'
  return null
}

async function main() {
  const sb = getSupabase()
  const PAGE = 1000

  let offset = 0
  let scanned = 0
  let updated = 0
  const counts: Record<string, number> = {}

  while (true) {
    // Order + offset advance is critical — the previous version filtered on
    // `funding_round IS NULL` without advancing offset, so unmatchable rows
    // (no extractable round → stayed NULL) kept re-appearing forever.
    const { data, error } = await sb
      .from('tracker_roles')
      .select('id, funding_details')
      .eq('is_active', true)
      .is('funding_round', null)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) { console.error('Fetch error:', error.message); return }
    if (!data || data.length === 0) break

    const updates: Array<{ id: string; round: string }> = []
    for (const row of data) {
      // Only trust the structured funding_details ("·"-separated) — never the
      // free-text role_description.
      const details = String(row.funding_details ?? '')
      const round = details.includes(' · ') ? extractRound(details) : null
      scanned++
      if (round) updates.push({ id: row.id, round })
    }

    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50)
      await Promise.all(batch.map(async u => {
        const { error: e } = await sb.from('tracker_roles')
          .update({ funding_round: u.round })
          .eq('id', u.id)
        if (e) { console.error(`update ${u.id}: ${e.message}`); return }
        updated++
        counts[u.round] = (counts[u.round] ?? 0) + 1
      }))
    }

    console.log(`  scanned ${scanned}, updated ${updated} so far...`)
    if (data.length < PAGE) break
    // Advance past the rows we just looked at. Updated ones drop out of the
    // NULL filter; non-matching ones stay NULL but we've already inspected
    // them so we skip past in this scan.
    offset += data.length - updates.length
  }

  console.log(`\n=== Backfill summary ===`)
  console.log(`Scanned:  ${scanned}`)
  console.log(`Updated:  ${updated}`)
  for (const [round, n] of Object.entries(counts).sort()) {
    console.log(`  ${round.padEnd(10)} ${n}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
