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
  scrapeInternal?(): Promise<ScraperResult>
}

