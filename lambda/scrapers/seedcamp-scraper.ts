/**
 * Seedcamp Talent Scraper
 *
 * Scrapes https://talent.seedcamp.com/jobs
 * Jobs are embedded in Next.js __NEXT_DATA__ script tag (Getro platform).
 * No browser needed — pure fetch + JSON extraction.
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const SEEDCAMP_JOBS_URL = 'https://talent.seedcamp.com/jobs'

interface SeedcampJob {
  id: number
  title: string
  slug: string
  organization: {
    id: number
    name: string
    slug: string
    stage?: string
    headCount?: number
    industryTags?: string[]
  }
  locations: string[]
  workMode?: string
  url: string
  createdAt: number
  seniority?: string | null
  compensationAmountMinCents?: number | null
  compensationAmountMaxCents?: number | null
  compensationCurrency?: string | null
  isDiscarded?: boolean
}

function mapWorkMode(mode?: string): string {
  switch (mode?.toLowerCase()) {
    case 'remote': return 'Remote'
    case 'hybrid': return 'Hybrid'
    default: return 'Onsite'
  }
}

function mapFundingStage(stage?: string): string | null {
  switch (stage?.toLowerCase()) {
    case 'seed': return 'Seed'
    case 'series_a': return 'Series A'
    case 'series_b': return 'Series B'
    case 'series_c': return 'Series C'
    case 'ipo': return 'IPO'
    default: return null
  }
}

function mapSeniority(seniority?: string | null): string {
  switch (seniority?.toLowerCase()) {
    case 'entry': case 'entry_level': case 'junior': return 'Entry'
    case 'senior': case 'executive': case 'director': return 'Senior'
    default: return 'Mid'
  }
}

export class SeedcampScraper extends BaseScraper {
  name = 'Seedcamp (API)'
  sourceUrl = SEEDCAMP_JOBS_URL

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      console.log(`[${this.name}] Fetching ${SEEDCAMP_JOBS_URL}...`)

      const response = await fetch(SEEDCAMP_JOBS_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()

      // Extract __NEXT_DATA__
      const nextDataMatch = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
      )
      if (!nextDataMatch) {
        throw new Error('Could not find __NEXT_DATA__ in page')
      }

      const nextData = JSON.parse(nextDataMatch[1])
      const seedcampJobs: SeedcampJob[] =
        nextData.props?.pageProps?.initialState?.jobs?.found || []

      console.log(`[${this.name}] Found ${seedcampJobs.length} jobs in page data`)

      const jobs: JobData[] = []

      for (const job of seedcampJobs) {
        if (job.isDiscarded) continue

        const title = this.normalizeText(job.title)
        const company = this.normalizeText(job.organization?.name || '')
        const applicationUrl = job.url || `${SEEDCAMP_JOBS_URL}/${job.slug}`

        if (!BaseScraper.isValidJob(title, company, applicationUrl)) continue

        const location = job.locations?.join(', ') || 'Not specified'

        // Filter Israel
        const israelPattern = /\bisrael\b|tel\s*aviv|jerusalem|haifa/i
        if (israelPattern.test(location)) continue

        // Salary
        let compensation = 'Not specified'
        if (job.compensationAmountMinCents || job.compensationAmountMaxCents) {
          const min = job.compensationAmountMinCents
            ? Math.round(job.compensationAmountMinCents / 100)
            : null
          const max = job.compensationAmountMaxCents
            ? Math.round(job.compensationAmountMaxCents / 100)
            : null
          const currency = job.compensationCurrency || 'USD'

          if (min && max) {
            compensation = `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`
          } else if (min) {
            compensation = `${currency} ${min.toLocaleString()}+`
          }
        }

        const { industry } = classifyIndustry(company, title, '')

        const postingDate = job.createdAt ? new Date(job.createdAt * 1000) : new Date()

        jobs.push({
          company_name: company,
          industry,
          location,
          funding_stage: 'Seedcamp',
          funding_details: mapFundingStage(job.organization?.stage) || null,
          role_title: title,
          role_type: 'Full-time',
          role_level: mapSeniority(job.seniority),
          work_mode: mapWorkMode(job.workMode),
          compensation,
          equity: null,
          posting_date: postingDate,
          closing_date: null,
          company_description: '',
          application_link: applicationUrl,
          source_website: this.sourceUrl,
          is_active: true,
        })
      }

      console.log(`[${this.name}] Returning ${jobs.length} valid jobs`)

      return { success: true, jobs, source: this.name }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return { success: false, jobs: [], error: msg, source: this.name }
    }
  }
}
