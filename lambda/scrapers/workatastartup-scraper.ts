/**
 * Work at a Startup (YC) Scraper
 *
 * Scrapes https://www.workatastartup.com/jobs using Puppeteer.
 * Fetches multiple category pages for broader coverage.
 */

import * as cheerio from 'cheerio'
import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const BASE_URL = 'https://www.workatastartup.com'

const CATEGORY_URLS = [
  'https://www.workatastartup.com/jobs',
  'https://www.workatastartup.com/jobs?role=eng',
  'https://www.workatastartup.com/jobs?role=design',
  'https://www.workatastartup.com/jobs?role=product',
]

export class WorkAtAStartupScraper extends BaseScraper {
  name = 'Work at a Startup'
  sourceUrl = BASE_URL

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) throw new Error('Page not initialized')

    try {
      const allJobs: JobData[] = []
      const seenIds = new Set<string>()

      for (const url of CATEGORY_URLS) {
        try {
          console.log(`[${this.name}] Fetching ${url}`)
          await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
          await this.wait(3000)

          // Scroll to load more
          for (let i = 0; i < 5; i++) {
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
            await this.wait(1000)
          }

          const html = await this.page.content()

          // Check for bot protection
          if (html.includes('Just a moment') || html.includes('Checking your browser')) {
            console.log(`[${this.name}]   Blocked by Cloudflare`)
            continue
          }

          const $ = cheerio.load(html)
          const jobs = this.parseJobs($, seenIds)
          console.log(`[${this.name}]   Found ${jobs.length} new jobs`)
          allJobs.push(...jobs)
        } catch (error) {
          console.error(`[${this.name}] Error fetching ${url}:`, error)
        }
      }

      console.log(`[${this.name}] Total unique jobs: ${allJobs.length}`)
      return { success: true, jobs: allJobs, source: this.name }
    } catch (error) {
      return {
        success: false,
        jobs: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.name,
      }
    }
  }

  private parseJobs($: cheerio.CheerioAPI, seenIds: Set<string>): JobData[] {
    const results: JobData[] = []

    $('a[href*="/jobs/"]').each((_i, el) => {
      const $link = $(el)
      const href = $link.attr('href') || ''

      const idMatch = href.match(/\/jobs\/(\d+)/)
      if (!idMatch) return

      const jobId = idMatch[1]
      if (seenIds.has(jobId)) return
      seenIds.add(jobId)

      const jobTitle = $link.text().trim()
      if (!jobTitle || jobTitle.length < 5 || jobTitle.length > 200) return

      const applicationUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

      const $container = $link.closest('div, tr, li, article').first()
      const containerText = $container.text()

      // Company name
      let companyName = ''
      $container.find('a[href*="/companies/"]').each((_j, companyEl) => {
        const text = $(companyEl).text().trim()
        if (text && !companyName && text.length > 1 && text.length < 100) {
          companyName = text
        }
      })

      // Location
      let location = 'Remote'
      const locationMatch = containerText.match(
        /(Remote|San Francisco|New York|Los Angeles|Seattle|Boston|Austin|Denver|Chicago|London|Berlin|Toronto)/i,
      )
      if (locationMatch) location = locationMatch[1]

      // Filter Israel
      const israelPattern = /\bisrael\b|tel\s*aviv|jerusalem|haifa|ramat\s*gan|herzliya/i
      if (israelPattern.test(location) || israelPattern.test(containerText)) return

      // Work mode
      let workMode = 'Onsite'
      if (/remote/i.test(containerText)) workMode = 'Remote'
      else if (/hybrid/i.test(containerText)) workMode = 'Hybrid'

      // YC batch
      let fundingStage: string | null = null
      const batchMatch = containerText.match(/\b([WS]\d{2})\b/)
      if (batchMatch) fundingStage = `YC ${batchMatch[1]}`

      if (!companyName) companyName = 'Unknown'
      if (!BaseScraper.isValidJob(jobTitle, companyName, applicationUrl)) return

      const { industry } = classifyIndustry(companyName, jobTitle, '')

      results.push({
        company_name: this.normalizeText(companyName),
        industry,
        location: this.normalizeText(location),
        funding_stage: fundingStage,
        role_title: this.normalizeText(jobTitle),
        role_type: 'Full-time',
        role_level: this.extractRoleLevel(jobTitle, containerText),
        work_mode: workMode,
        compensation: 'Not specified',
        equity: null,
        posting_date: new Date(),
        closing_date: null,
        company_description: '',
        application_link: applicationUrl,
        source_website: this.sourceUrl,
        is_active: true,
      })
    })

    return results
  }
}
