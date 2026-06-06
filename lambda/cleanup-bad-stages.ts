/**
 * One-off: remove funding stage info that was inferred from free-text job
 * descriptions (unreliable — e.g. Ashby, a Series D company, got "Seed" because
 * its description mentions "seed stage"). Per product call: leave stage blank
 * rather than show wrong info.
 *
 * Nulls:
 *  - funding_round when it's NOT authoritative — i.e. not an AI-lab company AND
 *    not backed by a structured funding_details ("AMT ROUND · … · Founded YYYY").
 *    Those come from description scanning (enricher + backfill-funding-round.ts).
 *  - funding_details that are bare phrases (no " · " separator) — the enricher's
 *    free-text matches like "seed stage" / "raised $116M". Structured ones from
 *    AI-labs / TopStartups / Seedcamp are kept.
 *
 * Dry-run by default. Pass --apply to write.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
const envPath = resolve(__dirname, '.env')
for (const line of readFileSync(envPath, 'utf-8').replace(/\r/g, '').split('\n')) {
  const m = line.match(/^([^#=]+)=(.+)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}
import { getSupabase } from './scrapers/supabase'

const APPLY = process.argv.includes('--apply')

// Companies whose funding_round is set authoritatively (curated AI_LABS list).
const AI_LABS = new Set(['Anthropic', 'Google DeepMind', 'xAI', 'OpenAI', 'Cohere', 'Hugging Face'])

function roundToken(round: string): string {
  return round.toLowerCase().trim()
}

/** Is this funding_round corroborated by a structured ("·"-separated) funding_details? */
function backedByStructuredDetails(round: string | null, details: string | null): boolean {
  if (!round || !details || !details.includes(' · ')) return false
  return details.toLowerCase().includes(roundToken(round))
}

async function main() {
  const sb = getSupabase()
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from('tracker_roles')
      .select('id, company_name, funding_round, funding_details')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) { console.error(error.message); process.exit(1) }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
  }
  console.log(`Scanning ${rows.length} active roles...\n`)

  const nullRound: string[] = []
  const nullDetails: string[] = []
  const roundDist: Record<string, number> = {}
  for (const r of rows) {
    if (r.funding_round && !AI_LABS.has(r.company_name) && !backedByStructuredDetails(r.funding_round, r.funding_details)) {
      nullRound.push(r.id)
      roundDist[r.funding_round] = (roundDist[r.funding_round] || 0) + 1
    }
    if (r.funding_details && !String(r.funding_details).includes(' · ')) {
      nullDetails.push(r.id)
    }
  }

  console.log(`funding_round to null (inferred from description): ${nullRound.length}`)
  console.log('  by value:', JSON.stringify(roundDist))
  console.log(`funding_details to null (bare phrases): ${nullDetails.length}`)

  if (!APPLY) {
    console.log('\nDRY RUN — no changes. Re-run with --apply to write.')
    return
  }

  let r1 = 0
  for (let i = 0; i < nullRound.length; i += 100) {
    const batch = nullRound.slice(i, i + 100)
    const { error } = await sb.from('tracker_roles').update({ funding_round: null }).in('id', batch)
    if (error) console.error(error.message); else r1 += batch.length
  }
  let r2 = 0
  for (let i = 0; i < nullDetails.length; i += 100) {
    const batch = nullDetails.slice(i, i + 100)
    const { error } = await sb.from('tracker_roles').update({ funding_details: null }).in('id', batch)
    if (error) console.error(error.message); else r2 += batch.length
  }
  console.log(`\nNulled funding_round on ${r1} roles, funding_details on ${r2} roles.`)
}
main().catch(e => { console.error(e); process.exit(1) })
