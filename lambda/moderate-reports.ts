/**
 * Moderation CLI for user-submitted listing reports (tracker_reports).
 *
 * Reports are REVIEWED here — nothing is ever auto-pruned. Approving a report
 * deactivates the reported listing (is_active=false, the same mechanism as
 * prune.ts); rejecting leaves the listing untouched.
 *
 *   npx tsx lambda/moderate-reports.ts              # list pending reports
 *   npx tsx lambda/moderate-reports.ts approve <id> # approve -> deactivate listing
 *   npx tsx lambda/moderate-reports.ts reject  <id> # reject  -> listing left active
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(__dirname, '.env')
for (const line of readFileSync(envPath, 'utf-8').replace(/\r/g, '').split('\n')) {
  const m = line.match(/^([^#=]+)=(.+)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

import { getSupabase } from './scrapers/supabase'

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired listing',
  compliance: 'Compliance concern',
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3.6e6)
  if (h < 1) return '<1h'
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

async function list() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('tracker_reports')
    .select('id, tracker_role_id, company_name, role_title, reason, explanation, reporter_contact, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) { console.error(error.message); process.exit(1) }
  if (!data || data.length === 0) { console.log('No pending reports.'); return }

  console.log(`${data.length} pending report(s):\n`)
  for (const r of data as any[]) {
    console.log(`  id:      ${r.id}`)
    console.log(`  reason:  ${REASON_LABELS[r.reason] || r.reason}`)
    console.log(`  listing: ${r.company_name || '?'} — ${r.role_title || '?'}  (role ${r.tracker_role_id})`)
    console.log(`  note:    ${(r.explanation || '').replace(/\s+/g, ' ').slice(0, 300)}`)
    if (r.reporter_contact) console.log(`  from:    ${r.reporter_contact}`)
    console.log(`  age:     ${ago(r.created_at)}`)
    console.log(`  -> approve: npx tsx lambda/moderate-reports.ts approve ${r.id}`)
    console.log(`     reject:  npx tsx lambda/moderate-reports.ts reject ${r.id}\n`)
  }
}

async function decide(id: string, decision: 'approve' | 'reject') {
  const sb = getSupabase()
  const { data: rows, error } = await sb
    .from('tracker_reports')
    .select('id, tracker_role_id, company_name, role_title, status')
    .eq('id', id)
    .limit(1)
  if (error) { console.error(error.message); process.exit(1) }
  if (!rows || rows.length === 0) { console.error(`Report ${id} not found.`); process.exit(1) }
  const report = rows[0] as any
  if (report.status !== 'pending') {
    console.log(`Report ${id} is already "${report.status}" — no change.`)
    return
  }

  const now = new Date().toISOString()
  const status = decision === 'approve' ? 'approved' : 'rejected'
  const { error: uErr } = await sb.from('tracker_reports').update({ status, updated_at: now }).eq('id', id)
  if (uErr) { console.error(uErr.message); process.exit(1) }

  if (decision === 'approve') {
    const { error: dErr } = await sb
      .from('tracker_roles')
      .update({ is_active: false })
      .eq('id', report.tracker_role_id)
    if (dErr) { console.error(`Report approved but failed to deactivate the listing: ${dErr.message}`); process.exit(1) }
    console.log(`Approved report ${id} — deactivated listing "${report.company_name || ''} — ${report.role_title || ''}" (${report.tracker_role_id}).`)
  } else {
    console.log(`Rejected report ${id} — listing left active.`)
  }
}

async function main() {
  const [cmd, id] = process.argv.slice(2)
  if (!cmd || cmd === 'list') return list()
  if (cmd === 'approve' || cmd === 'reject') {
    if (!id) { console.error(`Usage: npx tsx lambda/moderate-reports.ts ${cmd} <reportId>`); process.exit(1) }
    return decide(id, cmd)
  }
  console.error('Usage: npx tsx lambda/moderate-reports.ts [list | approve <id> | reject <id>]')
  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
