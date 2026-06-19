/**
 * One-off: import community members from the "Join Uncooked" Google Sheet
 * (Tally form export) into the community_members table. Only the name / email /
 * phone columns are used; all other form fields are ignored. Dedupes on email
 * and only ADDS members not already present (never updates/removes).
 *
 *   npx tsx lambda/import-community.ts <csv-json-path>            # dry run
 *   npx tsx lambda/import-community.ts <csv-json-path> --apply    # insert new rows
 *
 * <csv-json-path> is the saved download_file_content result ({content: base64 csv}).
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
const jsonPath = process.argv[2]
if (!jsonPath || jsonPath === '--apply') {
  console.error('Usage: npx tsx lambda/import-community.ts <csv-json-path> [--apply]')
  process.exit(1)
}

// Header labels in the sheet → community_members columns.
const NAME_HEADER = 'Tell us a bit more about yourself'
const EMAIL_HEADER = 'Email'
const PHONE_HEADER_PREFIX = 'Phone Number' // "Phone Number (for WhatsApp GC)"

// RFC4180 CSV parser (handles quoted fields with commas / newlines / "").
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

const normPhone = (p: string) => p.replace(/[\s\-()]/g, '').trim()
const normEmail = (e: string) => e.trim().toLowerCase()

async function main() {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  const csv = Buffer.from(raw.content, 'base64').toString('utf-8')
  const rows = parseCSV(csv)
  const headers = rows[0].map(h => h.replace(/\r?\n/g, ' ').trim())

  const nameIdx = headers.indexOf(NAME_HEADER)
  const emailIdx = headers.indexOf(EMAIL_HEADER)
  const phoneIdx = headers.findIndex(h => h.startsWith(PHONE_HEADER_PREFIX))
  console.log(`Column mapping → name[${nameIdx}], email[${emailIdx}], phone[${phoneIdx}]`)
  if (nameIdx < 0 || emailIdx < 0 || phoneIdx < 0) {
    console.error('Could not locate all required columns. Headers:', JSON.stringify(headers))
    process.exit(1)
  }

  const data = rows.slice(1).filter(r => r.length > Math.max(nameIdx, emailIdx, phoneIdx))
  let noEmail = 0
  const byEmail = new Map<string, { full_name: string; email: string; phone: string }>()
  for (const r of data) {
    const email = normEmail(r[emailIdx] || '')
    if (!email || !email.includes('@')) { noEmail++; continue }
    byEmail.set(email, {
      full_name: (r[nameIdx] || '').trim(),
      email,
      phone: normPhone(r[phoneIdx] || ''),
    })
  }

  const sb = getSupabase()
  // Existing emails (paginate to be safe).
  const existing = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data: ex, error } = await sb.from('community_members').select('email').range(from, from + 999)
    if (error) { console.error('read community_members:', error.message); process.exit(1) }
    if (!ex || ex.length === 0) break
    for (const e of ex as any[]) if (e.email) existing.add(normEmail(e.email))
    if (ex.length < 1000) break
  }

  const toAdd = [...byEmail.values()].filter(m => !existing.has(m.email))

  console.log(`\nSheet data rows:        ${data.length}`)
  console.log(`Skipped (no email):     ${noEmail}`)
  console.log(`Distinct emails:        ${byEmail.size}`)
  console.log(`Already in table:       ${byEmail.size - toAdd.length}`)
  console.log(`NEW members to add:     ${toAdd.length}`)
  console.log(`(community_members currently has ${existing.size} rows)`)
  console.log('\nSample of new members:')
  for (const m of toAdd.slice(0, 5)) console.log(`  ${m.full_name || '(no name)'} | ${m.email} | ${m.phone || '(no phone)'}`)

  if (!APPLY) {
    console.log('\nDRY RUN — no rows written. Re-run with --apply to insert the new members.')
    return
  }

  let inserted = 0
  for (let i = 0; i < toAdd.length; i += 100) {
    const batch = toAdd.slice(i, i + 100).map(m => ({
      id: crypto.randomUUID(),
      full_name: m.full_name,
      email: m.email,
      phone: m.phone || null,
    }))
    const { error } = await sb.from('community_members').insert(batch)
    if (error) { console.error(`insert batch ${i}:`, error.message); process.exit(1) }
    inserted += batch.length
  }
  console.log(`\nInserted ${inserted} new community members.`)
}

main().catch(e => { console.error(e); process.exit(1) })
