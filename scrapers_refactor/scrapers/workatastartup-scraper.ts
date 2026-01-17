/**
 * Work at a Startup (YC) Scraper
 * Scrapes https://www.workatastartup.com using Playwright with stealth
 */

import * as cheerio from 'cheerio'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

chromium.use(StealthPlugin())

const BASE_URL = 'https://www.workatastartup.com'

const CATEGORY_URLS = [
  'https://www.workatastartup.com/jobs',
  'https://www.workatastartup.com/jobs?role=eng',
  'https://www.workatastartup.com/jobs?role=design',
  'https://www.workatastartup.com/jobs?role=product',
  'https://www.workatastartup.com/jobs?role=sales',
  'https://www.workatastartup.com/jobs?role=marketing',
  'https://www.workatastartup.com/jobs?role=operations',
]

async function fetchWithStealth(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(2000)

    // Scroll to load more jobs
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1000)
    }

    return await page.content()
  } finally {
    await browser.close()
  }
}

function parseJobsFromPage($: cheerio.CheerioAPI, seenIds: Set<string>): Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> {
  const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

  // Look for job links - they typically contain /jobs/ in the URL
  $('a[href*="/jobs/"]').each((_i, el) => {
    const $link = $(el)
    const href = $link.attr('href') || ''

    // Extract job ID from URL
    const idMatch = href.match(/\/jobs\/(\d+)/)
    if (!idMatch) return

    const jobId = idMatch[1]
    if (seenIds.has(jobId)) return
    seenIds.add(jobId)

    const jobTitle = $link.text().trim()
    if (!jobTitle || jobTitle.length < 5 || jobTitle.length > 200) return

    const applicationUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`

    // Find parent container for company info
    const $container = $link.closest('div, tr, li, article').first()
    const containerText = $container.text()

    // Try to extract company name
    let companyName = ''
    $container.find('a[href*="/companies/"]').each((_j, companyEl) => {
      const text = $(companyEl).text().trim()
      if (text && !companyName && text.length > 1 && text.length < 100) {
        companyName = text
      }
    })

    // Extract location
    let location = 'Remote'
    const locationMatch = containerText.match(/(Remote|San Francisco|New York|Los Angeles|Seattle|Boston|Austin|Denver|Chicago|London|Berlin|Toronto)/i)
    if (locationMatch) {
      location = locationMatch[1]
    }

    // Work mode
    let workMode: 'Remote' | 'Hybrid' | 'Onsite' = 'Onsite'
    if (/remote/i.test(containerText)) workMode = 'Remote'
    else if (/hybrid/i.test(containerText)) workMode = 'Hybrid'

    // Extract YC batch if present
    let fundingStage = null
    const batchMatch = containerText.match(/\b([WS]\d{2})\b/)
    if (batchMatch) {
      fundingStage = `YC ${batchMatch[1]}`
    }

    if (!companyName) companyName = 'Unknown'
    if (!isValidJob(jobTitle, companyName, applicationUrl)) return

    const role: TrackerRoleData = {
      company_name: normalizeText(companyName),
      role_title: normalizeText(jobTitle),
      location: normalizeText(location),
      funding_stage: fundingStage,
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
      source: 'Work at a Startup',
      source_role_id: jobId,
      source_url: BASE_URL,
      application_url: applicationUrl,
      raw_payload: null,
    }

    results.push({ role, source })
  })

  return results
}

export const workAtAStartupScraper: Scraper = {
  name: 'Work at a Startup',
  url: BASE_URL,
  usePlaywright: true,

  async parse(_html: string) {
    const allResults: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []
    const seenIds = new Set<string>()

    for (const url of CATEGORY_URLS) {
      try {
        console.log(`[${this.name}] Fetching ${url} (with stealth)`)
        const html = await fetchWithStealth(url)

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

if (require.main === module) {
  ;(async () => {
    console.log('Testing Work at a Startup scraper...\n')
    const result = await workAtAStartupScraper.parse('')
    console.log(`\nTotal: ${result.length} jobs`)
    result.slice(0, 5).forEach((item, i) => {
      console.log(`[${i + 1}] ${item.role.company_name} - ${item.role.role_title}`)
    })
  })()
}
