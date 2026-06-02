export interface JobData {
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
  // Structured funding round name (Pre-Seed, Seed, Series A…G, IPO).
  // Populated by AI lab scrapers from `lastFunding` + by description-enricher.
  // Powers the Company Stage filter; funding_details still drives display.
  funding_round?: string | null
  // Confirmed backer names (VC funds / accelerators). Set by VC portfolio
  // scrapers and by description-enricher's "funded by X" extraction.
  backers?: string[] | null
  application_link: string
  source_website: string
  is_active: boolean
}

export interface ScraperResult {
  success: boolean
  jobs: JobData[]
  error?: string
  source: string
}

export interface Scraper {
  name: string
  sourceUrl: string
  scrape(): Promise<ScraperResult>
}
