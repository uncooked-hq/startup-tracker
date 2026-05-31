/**
 * One-off: backfill posting_date (from first_seen_at) for any active row that's
 * missing it, then deactivate anything older than 60 days.
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

const MAX_AGE_DAYS = 60

async function backfillPostingDate() {
  const supabase = getSupabase()
  console.log('Backfilling posting_date from first_seen_at where NULL...')

  let total = 0
  while (true) {
    const { data: rows, error } = await supabase
      .from('tracker_roles')
      .select('id, first_seen_at')
      .is('posting_date', null)
      .limit(1000)
    if (error) { console.error(error.message); return total }
    if (!rows || rows.length === 0) break

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100)
      // Each row needs its own first_seen_at value, so update one at a time
      await Promise.all(batch.map(async r => {
        await supabase
          .from('tracker_roles')
          .update({ posting_date: r.first_seen_at })
          .eq('id', r.id)
      }))
      total += batch.length
    }
    console.log(`  backfilled ${total} so far...`)
    if (rows.length < 1000) break
  }
  console.log(`Backfilled ${total} rows.`)
  return total
}

async function sweepOldJobs() {
  const supabase = getSupabase()
  const threshold = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
  console.log(`\nSweep threshold: ${threshold.toISOString().slice(0, 10)} (${MAX_AGE_DAYS} days ago)`)

  const { data: oldRoles, error } = await supabase
    .from('tracker_roles')
    .select('id, posting_date')
    .eq('is_active', true)
    .lt('posting_date', threshold.toISOString())

  if (error) { console.error(error.message); return }
  if (!oldRoles || oldRoles.length === 0) { console.log('No old active jobs.'); return }

  console.log(`Found ${oldRoles.length} active jobs older than ${MAX_AGE_DAYS} days`)
  const byMonth: Record<string, number> = {}
  for (const r of oldRoles) {
    const m = (r.posting_date as string || '').slice(0, 7)
    byMonth[m] = (byMonth[m] || 0) + 1
  }
  console.log('By month:')
  for (const k of Object.keys(byMonth).sort()) console.log(`  ${k}: ${byMonth[k]}`)

  const ids = oldRoles.map(r => r.id)
  let deactivated = 0
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const { error: e } = await supabase
      .from('tracker_roles')
      .update({ is_active: false })
      .in('id', batch)
    if (e) { console.error(e.message); continue }
    deactivated += batch.length
  }
  console.log(`\nDeactivated ${deactivated}/${oldRoles.length} jobs.`)
}

async function main() {
  await backfillPostingDate()
  await sweepOldJobs()
}

main().catch(e => { console.error(e); process.exit(1) })
