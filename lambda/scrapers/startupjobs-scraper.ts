/**
 * Startup.jobs Scraper
 *
 * Scrapes https://startup.jobs using Puppeteer.
 * Fetches multiple category pages for broader coverage.
 */

import * as cheerio from 'cheerio'
import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const STARTUPJOBS_URL = 'https://startup.jobs'

const CATEGORY_URLS = [
  'https://startup.jobs',
  'https://startup.jobs/developer-jobs',
  'https://startup.jobs/design-jobs',
  'https://startup.jobs/marketing-jobs',
  'https://startup.jobs/devops-jobs',
  'https://startup.jobs/remote-jobs',
]

export class StartupJobsScraper extends BaseScraper {
  name = 'Startup.jobs'
  sourceUrl = STARTUPJOBS_URL

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) throw new Error('Page not initialized')

    try {
      const allJobs: JobData[] = []
      const seenIds = new Set<string>()

      for (const url of CATEGORY_URLS) {
        try {
          console.log(`[${this.name}] Fetching ${url}`)
          await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
          await this.wait(3000)

          const html = await this.page.content()

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

    // Startup.jobs uses slug-id pattern for job URLs
    const jobLinks = $('a[href^="/"]').filter((_i, el) => {
      const href = $(el).attr('href') || ''
      return /^\/[\w-]+-\d+$/.test(href) && !href.includes('/company/') && !href.includes('/locations/')
    })

    jobLinks.each((_i, el) => {
      const $link = $(el)
      const href = $link.attr('href') || ''
      const jobTitle = $link.text().trim()

      const idMatch = href.match(/-(\d+)$/)
      if (!idMatch) return

      const jobId = idMatch[1]
      if (seenIds.has(jobId)) return
      seenIds.add(jobId)

      if (!jobTitle || jobTitle.length < 5 || jobTitle.length > 200) return

      const applicationUrl = `${STARTUPJOBS_URL}${href}`
      const $container = $link.closest('div, article, section, li').first()

      // Company
      let companyName = ''
      $container.find('a[href^="/company/"]').each((_j, companyEl) => {
        const text = $(companyEl).text().trim()
        if (text && !companyName && text.length > 1 && text.length < 100) {
          companyName = text
        }
      })
      if (!companyName) {
        $link.parent().find('a[href^="/company/"]').each((_j, companyEl) => {
          const text = $(companyEl).text().trim()
          if (text && !companyName && text.length > 1) companyName = text
        })
      }

      // Location
      let location = 'Remote'
      $container.find('a[href^="/locations/"]').each((_j, locEl) => {
        const text = $(locEl).text().trim()
        if (text) location = text
      })

      // Filter Israel
      const israelPattern = /\bisrael\b|tel\s*aviv|jerusalem|haifa|ramat\s*gan|herzliya/i
      if (israelPattern.test(location)) return

      // Work mode
      const containerText = $container.text().toLowerCase()
      let workMode = 'Onsite'
      if (containerText.includes('remote')) workMode = 'Remote'
      else if (containerText.includes('hybrid')) workMode = 'Hybrid'

      if (!companyName) companyName = 'Unknown'
      if (!BaseScraper.isValidJob(jobTitle, companyName, applicationUrl)) return

      const { industry } = classifyIndustry(companyName, jobTitle, '')

      results.push({
        company_name: this.normalizeText(companyName),
        industry,
        location: this.normalizeText(location),
        funding_stage: null,
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
