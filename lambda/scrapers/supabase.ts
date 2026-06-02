import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isBlacklistedCompany } from './blacklist'

let supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    }

    supabase = createClient(url, key)
  }
  return supabase
}

export interface TrackerRoleInsert {
  company_name: string
  company_domain?: string | null
  industry?: string | null
  funding_stage?: string | null
  role_title: string
  role_level?: string | null
  role_type?: string | null
  work_mode?: string | null
  location?: string | null
  compensation_text?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  offers_equity?: boolean | null
  company_description?: string | null
  role_description?: string | null
  offers_sponsorship?: boolean | null
  funding_details?: string | null
  funding_round?: string | null
  backers?: string[] | null
  posting_date?: string | null
  closing_date?: string | null
  is_active: boolean
  first_seen_at: string
  last_seen_at: string
}

export interface TrackerRoleSourceInsert {
  tracker_role_id: string
  source: string
  source_role_id: string
  source_url: string
  application_url: string
  last_seen_at: string
  last_scraped_at: string
  scrape_status: string
  raw_payload: any
}

export async function upsertJob(job: {
  company_name: string
  industry?: string | null
  location: string
  funding_stage?: string | null
  role_title: string
  role_type: string
  role_level: string
  work_mode: string
  compensation: string
  equity?: string | null
  posting_date: Date
  closing_date?: Date | null
  company_description: string
  role_description?: string | null
  offers_sponsorship?: boolean | null
  funding_details?: string | null
  funding_round?: string | null
  backers?: string[] | null
  application_link: string
  source_website: string
  is_active: boolean
}): Promise<{ success: boolean; isNew: boolean; roleId?: string; error?: string }> {
  // Skip blacklisted companies entirely so they never enter the DB.
  if (isBlacklistedCompany(job.company_name)) {
    return { success: true, isNew: false }
  }

  const supabase = getSupabase()
  const now = new Date().toISOString()

  try {
    // 1. Find existing role by company_name + role_title
    //    Pull backers too so we can union them with any newly-discovered ones.
    const { data: existingRoles, error: findError } = await supabase
      .from('tracker_roles')
      .select('id, backers')
      .eq('company_name', job.company_name)
      .eq('role_title', job.role_title)
      .limit(1)

    if (findError) throw findError

    let trackerRoleId: string
    let isNewRole = false

    if (existingRoles && existingRoles.length > 0) {
      // Update existing role's last_seen_at, re-activate, and backfill missing fields
      trackerRoleId = existingRoles[0].id
      const updateData: Record<string, unknown> = { last_seen_at: now, is_active: true }
      // Backfill funding_stage if it was previously null
      if (job.funding_stage) {
        updateData.funding_stage = job.funding_stage
      }
      // Backfill industry if it was previously null
      if (job.industry) {
        updateData.industry = job.industry
      }
      // Backfill role_description if it was previously null
      if (job.role_description) {
        updateData.role_description = job.role_description
      }
      if (job.offers_sponsorship != null) {
        updateData.offers_sponsorship = job.offers_sponsorship
      }
      if (job.funding_details) {
        updateData.funding_details = job.funding_details
      }
      if (job.funding_round) {
        updateData.funding_round = job.funding_round
      }
      // Backfill compensation_text only when the new value is real (not the
      // 'Not specified' placeholder). Avoids overwriting a previously-extracted
      // salary with the default on scrapers that didn't manage to extract one.
      if (job.compensation && job.compensation !== 'Not specified') {
        updateData.compensation_text = job.compensation
      }
      // Merge backers — keep any we already had, add any newly discovered ones.
      // Only write if the set actually grew, to avoid no-op updates.
      const existingBackers: string[] = Array.isArray((existingRoles[0] as any).backers)
        ? (existingRoles[0] as any).backers
        : []
      const incoming = job.backers ?? []
      const merged = Array.from(new Set([...existingBackers, ...incoming]))
      if (merged.length > existingBackers.length) {
        updateData.backers = merged
      }
      const { error: updateError } = await supabase
        .from('tracker_roles')
        .update(updateData)
        .eq('id', trackerRoleId)

      if (updateError) throw updateError
    } else {
      // Create new role
      const roleData: TrackerRoleInsert = {
        company_name: job.company_name,
        industry: job.industry,
        funding_stage: job.funding_stage,
        role_title: job.role_title,
        role_level: job.role_level,
        role_type: job.role_type,
        work_mode: job.work_mode,
        location: job.location,
        compensation_text: job.compensation,
        offers_equity: job.equity ? true : null,
        company_description: job.company_description,
        role_description: job.role_description ?? null,
        offers_sponsorship: job.offers_sponsorship ?? null,
        funding_details: job.funding_details ?? null,
        funding_round: job.funding_round ?? null,
        backers: job.backers ?? [],
        posting_date: job.posting_date ? new Date(job.posting_date).toISOString() : null,
        closing_date: job.closing_date ? new Date(job.closing_date).toISOString() : null,
        is_active: job.is_active,
        first_seen_at: now,
        last_seen_at: now,
      }

      const { data: newRole, error: createError } = await supabase
        .from('tracker_roles')
        .insert(roleData)
        .select('id')
        .single()

      if (createError) throw createError
      trackerRoleId = newRole.id
      isNewRole = true
    }

    // 2. Upsert source
    // First check if source exists
    const { data: existingSource } = await supabase
      .from('tracker_role_sources')
      .select('id')
      .eq('source', job.source_website)
      .eq('source_role_id', job.application_link)
      .limit(1)

    if (existingSource && existingSource.length > 0) {
      // Update existing source
      const { error: updateSourceError } = await supabase
        .from('tracker_role_sources')
        .update({
          last_seen_at: now,
          last_scraped_at: now,
          scrape_status: 'success',
          raw_payload: job,
        })
        .eq('id', existingSource[0].id)

      if (updateSourceError) throw updateSourceError
    } else {
      // Create new source
      const sourceData: TrackerRoleSourceInsert = {
        tracker_role_id: trackerRoleId,
        source: job.source_website,
        source_role_id: job.application_link,
        source_url: job.source_website,
        application_url: job.application_link,
        last_seen_at: now,
        last_scraped_at: now,
        scrape_status: 'success',
        raw_payload: job,
      }

      const { error: createSourceError } = await supabase
        .from('tracker_role_sources')
        .insert(sourceData)

      if (createSourceError) throw createSourceError
    }

    return { success: true, isNew: isNewRole, roleId: trackerRoleId }
  } catch (error) {
    // Supabase errors arrive as plain objects ({ message, code, details, hint }),
    // not Error instances — handle both so we don't swallow them as "Unknown error".
    let message = 'Unknown error'
    if (error instanceof Error) {
      message = error.message
    } else if (error && typeof error === 'object') {
      const e = error as { message?: string; code?: string; details?: string; hint?: string }
      message = [e.message, e.code, e.details, e.hint].filter(Boolean).join(' | ') || JSON.stringify(error)
    }
    return { success: false, isNew: false, error: message }
  }
}
