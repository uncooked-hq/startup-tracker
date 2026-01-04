/**
 * Startup.jobs Scraper
 * Scrapes https://startup.jobs using Playwright with stealth to bypass Cloudflare
 */

import * as cheerio from 'cheerio'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

// Add stealth plugin
chromium.use(StealthPlugin())

const STARTUPJOBS_URL = 'https://startup.jobs'

// Category pages to scrape
const CATEGORY_URLS = [
  'https://startup.jobs',
  'https://startup.jobs/developer-jobs',
  'https://startup.jobs/design-jobs',
  'https://startup.jobs/marketing-jobs',
  'https://startup.jobs/support-jobs',
  'https://startup.jobs/business-development-jobs',
  'https://startup.jobs/devops-jobs',
  'https://startup.jobs/remote-jobs',
]

/**
 * Parse jobs from HTML
 */
function parseJobsFromPage($: cheerio.CheerioAPI, seenIds: Set<string>): Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> {
  const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

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
        if (text && !companyName && text.length > 1) {
          companyName = text
        }
      })
    }

    let location = 'Remote'
    $container.find('a[href^="/locations/"]').each((_j, locEl) => {
      const text = $(locEl).text().trim()
      if (text) location = text
    })

    let workMode: 'Remote' | 'Hybrid' | 'Onsite' = 'Onsite'
    const containerText = $container.text().toLowerCase()
    if (containerText.includes('remote')) workMode = 'Remote'
    else if (containerText.includes('hybrid')) workMode = 'Hybrid'

    if (!companyName) companyName = 'Unknown'
    if (!isValidJob(jobTitle, companyName, applicationUrl)) return

    const role: TrackerRoleData = {
      company_name: normalizeText(companyName),
      role_title: normalizeText(jobTitle),
      location: normalizeText(location),
      funding_stage: null,
      role_type: 'Full-time',
      role_level: extractRoleLevel(jobTitle),
      work_mode: workMode,
      compensation_text: null,
      company_description: null,
      company_domain: null,
      industry: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      offers_equity: null,
      role_description: null,
      posting_date: new Date(),
      closing_date: null,
    }

    const source: TrackerRoleSourceData = {
      source: 'Startup.jobs',
      source_role_id: jobId,
      source_url: STARTUPJOBS_URL,
      application_url: applicationUrl,
      raw_payload: null,
    }

    results.push({ role, source })
  })

  return results
}

/**
 * Fetch page with stealth Playwright
 */
async function fetchWithStealth(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    // Wait a bit for any JS to settle
    await page.waitForTimeout(2000)
    const html = await page.content()
    return html
  } finally {
    await browser.close()
  }
}

export const startupJobsScraper: Scraper = {
  name: 'Startup.jobs',
  url: STARTUPJOBS_URL,
  usePlaywright: true,

  async parse(_html: string) {
    const allResults: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []
    const seenIds = new Set<string>()

    for (const url of CATEGORY_URLS) {
      try {
        console.log(`[${this.name}] Fetching ${url} (with stealth)`)
        const html = await fetchWithStealth(url)

        // Check if we got blocked
        if (html.includes('Just a moment') || html.includes('Checking your browser')) {
          console.log(`[${this.name}]   Blocked by Cloudflare`)
          continue
        }

        const $ = cheerio.load(html)
        const jobs = parseJobsFromPage($, seenIds)
        console.log(`[${this.name}]   Found ${jobs.length} new jobs`)
        allResults.push(...jobs)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[${this.name}] Error fetching ${url}: ${msg}`)
      }
    }

    console.log(`[${this.name}] Total unique jobs: ${allResults.length}`)
    return allResults
  }
}

// Standalone test
if (require.main === module) {
  ;(async () => {
    console.log('Testing Startup.jobs scraper with stealth...\n')
    const result = await startupJobsScraper.parse('')

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.length}`)
    console.log('='.repeat(60))

    result.slice(0, 10).forEach((item, i) => {
      console.log(`\n[${i + 1}] ${item.role.company_name} - ${item.role.role_title}`)
      console.log(`    Location: ${item.role.location} | Mode: ${item.role.work_mode}`)
    })

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Summary: ${result.length} total roles`)
    console.log('='.repeat(60))
  })()
}
