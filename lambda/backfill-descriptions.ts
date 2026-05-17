/**
 * One-shot backfill: populate role_description for existing tracker_roles that
 * don't have one, using the same enricher the scrapers now use.
 *
 * Run: npx tsx backfill-descriptions.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

for (const line of readFileSync(resolve(__dirname, '.env'), 'utf-8').replace(/\r/g, '').split('\n')) {
  const m = line.match(/^([^#=]+)=(.+)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

import { getSupabase } from './scrapers/supabase'
import { enrichDescriptions } from './scrapers/description-enricher'
import type { JobData } from './scrapers/types'

async function run() {
  const supabase = getSupabase()

  const { data: rows, error } = await supabase
    .from('tracker_roles')
    .select('id, company_name, role_title, tracker_role_sources(application_url)')
    .eq('is_active', true)
    .is('role_description', null)
    .order('last_seen_at', { ascending: false })
    .limit(1000)

  if (error) { console.error(error); return }

  const jobs: (JobData & { _id: string })[] = []
  for (const r of rows || []) {
    const url = (r.tracker_role_sources as any)?.[0]?.application_url
    if (!url?.startsWith('http')) continue
    jobs.push({
      _id: r.id,
      company_name: r.company_name,
      role_title: r.role_title,
      application_link: url,
      // unused fillers
      location: '', industry: null, funding_stage: null,
      role_type: '', role_level: '', work_mode: '',
      compensation: '', equity: null,
      posting_date: new Date(), closing_date: null,
      company_description: '', source_website: '', is_active: true,
    } as any)
  }

  console.log(`Backfilling descriptions for ${jobs.length} roles...`)
  const stats = await enrichDescriptions(jobs)
  console.log(`Fetched: ${stats.fetched}  Cached: ${stats.skipped}  Failed: ${stats.failed}`)

  // Write back
  let written = 0
  for (const j of jobs as any[]) {
    if (j.role_description) {
      await supabase.from('tracker_roles')
        .update({ role_description: j.role_description.slice(0, 5000) })
        .eq('id', j._id)
      written++
    }
  }
  console.log(`Wrote ${written} descriptions to DB`)
}

run()
