import { createClient } from '@supabase/supabase-js'

// Server-only. These are read in API routes; do NOT prefix with NEXT_PUBLIC_ —
// that would bundle them into client JS. Supabase access is purely server-side.
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database tables
export interface TrackerRoleRow {
  id: string
  company_name: string
  company_domain: string | null
  industry: string | null
  funding_stage: string | null
  role_title: string
  role_level: string | null
  role_type: string | null
  work_mode: string | null
  location: string | null
  compensation_text: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  offers_equity: boolean | null
  company_description: string | null
  role_description: string | null
  offers_sponsorship: boolean | null
  funding_details: string | null
  backers: string[] | null
  posting_date: string | null
  closing_date: string | null
  is_active: boolean
  first_seen_at: string
  last_seen_at: string
  created_at: string
  updated_at: string
}

export interface TrackerRoleSourceRow {
  id: string
  tracker_role_id: string
  source: string
  source_role_id: string
  source_url: string
  application_url: string
  last_seen_at: string
  last_scraped_at: string | null
  scrape_status: string | null
  raw_payload: any
  created_at: string
  updated_at: string
}

export interface TrackerRoleWithSources extends TrackerRoleRow {
  tracker_role_sources: TrackerRoleSourceRow[]
}
