/**
 * Bright Network Jobs Scraper
 * Scrapes https://www.brightnetwork.co.uk/graduate-jobs/technology/ using Playwright with stealth
 *
 * Note: This site has aggressive bot protection (WAF + CAPTCHA).
 * The stealth plugin may not be enough - manual testing required.
 */

import * as cheerio from 'cheerio'
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

// Add stealth plugin
chromium.use(StealthPlugin())

const BRIGHTNETWORK_BASE_URL = 'https://www.brightnetwork.co.uk'

// Main page to scrape (site uses search interface, not category URLs)
const BASE_URL = 'https://www.brightnetwork.co.uk/graduate-jobs/technology/'

// Number of pages to scrape (each page has ~10 results)
// Set higher for production (e.g., 10-15 to get ~100-150 jobs)
const MAX_PAGES = 3

/**
 * Parse jobs from HTML
 * Structure: .search-result-card divs containing job data
 */
function parseJobsFromPage($: cheerio.CheerioAPI, seenIds: Set<string>): Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> {
  const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

  // Find job cards - the main container for each job listing
  const jobCards = $('.search-result-card')
  console.log(`[Bright Network] Found ${jobCards.length} job cards`)

  jobCards.each((_i, el) => {
    try {
      const $card = $(el)

      // Get job URL from data-href attribute or from the main link
      let href = $card.attr('data-href') || ''
      if (!href) {
        const mainLink = $card.find('a[data-testid="search-result-link"]').first()
        href = mainLink.attr('href') || ''
      }

      if (!href) return

      // Extract job ID from data-object-id (e.g., "job.Job:460361") or URL
      let jobId = ''
      const objectId = $card.find('a[data-object-id]').attr('data-object-id') || ''
      const idMatch = objectId.match(/job\.Job:(\d+)/)
      if (idMatch) {
        jobId = idMatch[1]
      } else {
        // Fallback: extract from URL
        jobId = href.replace(/[^a-zA-Z0-9]/g, '-').slice(-50)
      }

      if (seenIds.has(jobId)) return
      seenIds.add(jobId)

      // Build full URL (remove query params for cleaner URL)
      const cleanHref = href.split('?')[0]
      const applicationUrl = cleanHref.startsWith('http') ? cleanHref : `${BRIGHTNETWORK_BASE_URL}${cleanHref}`

      // Extract job title from h6 inside the result link
      const jobTitle = normalizeText($card.find('a[data-testid="search-result-link"] h6').text())
      if (!jobTitle || jobTitle.length < 5) return

      // Extract company name - could be a link or span
      let companyName = ''
      const companyLink = $card.find('a[href*="/graduate-employer-company/"]')
      if (companyLink.length) {
        companyName = normalizeText(companyLink.text())
      } else {
        // Fallback: look for span with company name (non-linked employers)
        const companySpan = $card.find('.tw-font-medium').filter((_i, el) => {
          const text = $(el).text().trim()
          // Company names are typically short and don't contain typical field text
          return text.length > 2 && text.length < 100 &&
                 !text.includes('£') && !text.includes('Deadline') &&
                 !text.includes('Rolling')
        }).first()
        if (companySpan.length) {
          companyName = normalizeText(companySpan.text())
        }
      }

      if (!companyName) companyName = 'Unknown'

      // Extract location - find text near location icon
      let location = 'United Kingdom'
      const locationDiv = $card.find('img[alt="Available locations"]').parent()
      if (locationDiv.length) {
        const locationText = normalizeText(locationDiv.text())
        if (locationText) location = locationText
      }

      // Determine work mode from location text
      let workMode: 'Remote' | 'Hybrid' | 'Onsite' = 'Onsite'
      const locationLower = location.toLowerCase()
      if (locationLower.includes('remote')) workMode = 'Remote'
      else if (locationLower.includes('hybrid')) workMode = 'Hybrid'

      // Extract salary if present
      let salaryMin: number | null = null
      let salaryMax: number | null = null
      let salaryCurrency: string | null = null
      let compensationText: string | null = null

      const salaryDiv = $card.find('img[alt="Salary"]').parent()
      if (salaryDiv.length) {
        const salaryText = salaryDiv.text()
        // Match patterns like £25,948 or £34,000 or £25,000 - £35,000
        const rangeMatch = salaryText.match(/£([\d,]+)\s*[-–to]+\s*£([\d,]+)/)
        const singleMatch = salaryText.match(/£([\d,]+)/)

        if (rangeMatch) {
          salaryMin = parseInt(rangeMatch[1].replace(/,/g, ''), 10)
          salaryMax = parseInt(rangeMatch[2].replace(/,/g, ''), 10)
          salaryCurrency = 'GBP'
          compensationText = `£${salaryMin.toLocaleString()} - £${salaryMax.toLocaleString()}`
        } else if (singleMatch) {
          const salary = parseInt(singleMatch[1].replace(/,/g, ''), 10)
          salaryMin = salary
          salaryMax = salary
          salaryCurrency = 'GBP'
          compensationText = `£${salary.toLocaleString()}`
        }
      }

      // Extract deadline if present
      let closingDate: Date | null = null
      const deadlineDiv = $card.find('img[alt="Calendar"]').parent()
      if (deadlineDiv.length) {
        const deadlineText = deadlineDiv.text()
        // Match patterns like "6th Feb 2026" or "30th Jan 2026"
        const dateMatch = deadlineText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/)
        if (dateMatch) {
          const [, day, month, year] = dateMatch
          const monthMap: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          }
          const monthNum = monthMap[month]
          if (monthNum !== undefined) {
            closingDate = new Date(parseInt(year), monthNum, parseInt(day))
          }
        }
      }

      // Extract role type from URL
      let roleType = 'Graduate'
      if (href.includes('/internships/')) roleType = 'Internship'
      else if (href.includes('/industrial-placements/')) roleType = 'Industrial Placement'

      // Validate before adding
      if (!isValidJob(jobTitle, companyName, applicationUrl)) return

      const role: TrackerRoleData = {
        company_name: companyName,
        role_title: jobTitle,
        location: location,
        role_type: roleType,
        role_level: extractRoleLevel(jobTitle),
        work_mode: workMode,
        compensation_text: compensationText,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency,
        company_description: null,
        company_domain: null,
        industry: 'Technology',
        funding_stage: null,
        offers_equity: null,
        role_description: null,
        posting_date: new Date(),
        closing_date: closingDate,
      }

      const source: TrackerRoleSourceData = {
        source: 'Bright Network',
        source_role_id: jobId,
        source_url: BRIGHTNETWORK_BASE_URL,
        application_url: applicationUrl,
        raw_payload: null,
      }

      results.push({ role, source })
    } catch (error) {
      // Skip individual job parsing errors
    }
  })

  return results
}

/**
 * Fetch page with stealth Playwright and scroll to load more jobs
 */
async function fetchWithStealth(url: string, maxScrolls: number = 5): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ]
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  })

  const page = await context.newPage()

  try {
    // Navigate to the page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

    // Wait for potential Cloudflare/CAPTCHA challenge to resolve
    try {
      await page.waitForSelector('body', { timeout: 10000 })

      // Check if we're on a challenge page
      const content = await page.content()
      if (content.includes('Just a moment') || content.includes('Checking your browser') || content.includes('human verification')) {
        console.log(`[Bright Network] Detected challenge page, waiting...`)
        await page.waitForTimeout(10000)
      }
    } catch {
      // Continue anyway
    }

    // Wait for job cards to load
    try {
      await page.waitForSelector('.search-result-card', { timeout: 10000 })
    } catch {
      console.log(`[Bright Network] No job cards found initially`)
    }

    // Load more results by clicking "Load More" button or using HTMX pagination
    let previousCardCount = 0
    for (let i = 0; i < maxScrolls; i++) {
      // Get current card count
      const currentCardCount = await page.evaluate(() => {
        return document.querySelectorAll('.search-result-card').length
      })

      console.log(`[Bright Network] Iteration ${i + 1}/${maxScrolls}: ${currentCardCount} cards loaded`)

      // Stop if no new cards are loading
      if (i > 0 && currentCardCount === previousCardCount) {
        console.log(`[Bright Network] No new cards loaded, stopping`)
        break
      }
      previousCardCount = currentCardCount

      // First scroll to bottom to ensure button is visible
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      await page.waitForTimeout(1000)

      // Try to find and click a "Load More" or "Show More" button
      const loadMoreClicked = await page.evaluate(() => {
        // Common selectors for load more buttons
        const selectors = [
          'button:has-text("Load more")',
          'button:has-text("Show more")',
          'a:has-text("Load more")',
          '[data-testid="load-more"]',
          '.load-more',
          '.show-more',
          '[hx-get*="search"]', // HTMX triggers
          'button[hx-trigger]',
        ]

        for (const selector of selectors) {
          try {
            const btn = document.querySelector(selector) as HTMLElement
            if (btn && btn.offsetParent !== null) { // Check if visible
              btn.click()
              return true
            }
          } catch {
            // Try next selector
          }
        }

        // Also try clicking any visible button at the bottom of the results
        const buttons = document.querySelectorAll('.search-result-wrapper button, .search-result-wrapper a')
        for (const btn of buttons) {
          const text = (btn as HTMLElement).innerText?.toLowerCase() || ''
          if (text.includes('more') || text.includes('next') || text.includes('load')) {
            (btn as HTMLElement).click()
            return true
          }
        }

        return false
      })

      if (loadMoreClicked) {
        console.log(`[Bright Network] Clicked load more button`)
        await page.waitForTimeout(3000) // Wait for new content
      } else {
        // If no button found, try scrolling more
        await page.waitForTimeout(1000)
      }
    }

    const html = await page.content()
    return html
  } finally {
    await browser.close()
  }
}

export const brightNetworkScraper: Scraper = {
  name: 'Bright Network',
  url: BRIGHTNETWORK_BASE_URL,
  usePlaywright: true,

  async parse(_html: string) {
    const seenIds = new Set<string>()

    try {
      console.log(`[${this.name}] Fetching ${BASE_URL} with scroll loading...`)
      const html = await fetchWithStealth(BASE_URL, MAX_PAGES * 2) // Use MAX_PAGES for scroll count

      // Check if we got blocked
      if (html.includes('Just a moment') || html.includes('Checking your browser') || html.includes('Access denied')) {
        console.log(`[${this.name}] Blocked - challenge page detected`)
        return []
      }

      const $ = cheerio.load(html)
      const jobs = parseJobsFromPage($, seenIds)
      console.log(`[${this.name}] Total unique jobs: ${jobs.length}`)
      return jobs
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return []
    }
  }
}

// Standalone test
if (require.main === module) {
  ;(async () => {
    console.log('Testing Bright Network scraper with stealth...\n')
    console.log('Note: This site has aggressive bot protection.')
    console.log('If blocked, you may need to run with headless: false to debug.\n')

    const result = await brightNetworkScraper.parse('')

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.length}`)
    console.log('='.repeat(60))

    if (result.length === 0) {
      console.log('\nNo jobs found. Possible reasons:')
      console.log('1. Bot protection blocked the request')
      console.log('2. Page structure changed - selectors need updating')
      console.log('3. Network error')
      console.log('\nTry running with headless: false to see what happens.')
    }

    result.slice(0, 10).forEach((item, i) => {
      console.log(`\n[${i + 1}] ${item.role.company_name} - ${item.role.role_title}`)
      console.log(`    Location: ${item.role.location} | Mode: ${item.role.work_mode}`)
      console.log(`    Type: ${item.role.role_type} | Level: ${item.role.role_level}`)
      if (item.role.compensation_text) {
        console.log(`    Salary: ${item.role.compensation_text}`)
      }
      console.log(`    URL: ${item.source.application_url}`)
    })

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Summary: ${result.length} total roles`)
    console.log('='.repeat(60))
  })()
}
