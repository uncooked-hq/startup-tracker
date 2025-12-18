/**
 * Type definitions based on TrackerRole and TrackerRoleSource schemas
 */

export interface TrackerRoleData {
  // Company
  company_name: string
  company_domain?: string | null
  industry?: string | null
  funding_stage?: string | null
  
  // Role
  role_title: string
  role_level?: string | null
  role_type?: string | null
  work_mode?: string | null
  location?: string | null
  
  // Compensation
  compensation_text?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  offers_equity?: boolean | null
  
  // Content
  company_description?: string | null
  role_description?: string | null
  
  // Dates
  posting_date?: Date | null
  closing_date?: Date | null
}

export interface TrackerRoleSourceData {
  // Source information
  source: string
  source_role_id: string
  
  // URLs
  source_url: string
  application_url: string
  
  // Raw data (optional, for debugging/auditing)
  raw_payload?: Record<string, any> | null
}

export interface TrackerScraperResult {
  success: boolean
  roles: Array<{
    role: TrackerRoleData
    source: TrackerRoleSourceData
  }>
  error?: string
  source: string
}

export interface PlaywrightOptions {
  waitForSelector?: string
  timeout?: number
  scrollToLoad?: boolean
  maxScrolls?: number
}

export interface ScraperOptions {
  jobTypes?: string[]
  postedSince?: string
  locations?: string[]
  seniority?: string[]
}

export interface Scraper {
  name: string
  url: string | ((options?: ScraperOptions) => string)
  parse: (html: string) => Promise<Array<{
    role: TrackerRoleData
    source: TrackerRoleSourceData
  }>>
  usePlaywright?: boolean
  playwrightOptions?: PlaywrightOptions
  options?: ScraperOptions
}

