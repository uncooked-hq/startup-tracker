/**
 * TopStartups.io Scraper (Cheerio)
 *
 * Scrapes https://topstartups.io/jobs/ — server-rendered Django-ish site with
 * `.infinite-item` job cards and `?page=N` pagination. No browser needed.
 */

import * as cheerio from 'cheerio'
import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import { relativeTimeFrom } from './greenhouse-scraper'
import type { ScraperResult, JobData } from './types'

const BASE_URL = 'https://topstartups.io'
const JOBS_URL = `${BASE_URL}/jobs/`

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 20000)
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: controller.signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
  return res.text()
}

function parsePostedDate(text: string): Date {
  const t = text.toLowerCase()
  const now = Date.now()
  const m = t.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/)
  if (!m) return new Date()
  const n = parseInt(m[1], 10)
  const unit = m[2]
  const ms = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000, month: 2_592_000_000, year: 31_536_000_000 }[unit] || 0
  return new Date(now - n * ms)
}

function inferWorkMode(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('remote')) return 'Remote'
  if (l.includes('hybrid')) return 'Hybrid'
  return 'Onsite'
}

function inferRoleLevel(title: string): string {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief)\b/.test(t)) return 'Senior'
  if (/\b(junior|jr\.?|entry|intern|internship|graduate|grad)\b/.test(t)) return 'Entry'
  return 'Mid'
}

function inferRoleType(title: string): string {
  const t = title.toLowerCase()
  if (/\b(intern|internship)\b/.test(t)) return 'Internship'
  if (/\b(contract|contractor)\b/.test(t)) return 'Contract'
  if (/\bpart[-\s]?time\b/.test(t)) return 'Part-time'
  return 'Full-time'
}

function parseJobCards(html: string, seenLinks: Set<string>): JobData[] {
  const $ = cheerio.load(html)
  const jobs: JobData[] = []

  $('.infinite-item').each((_, el) => {
    const card = $(el)

    // Title: strip trailing "New" / "tags.new" badges that topstartups injects
    let title = card.find('h5[id="job-title"]').first().text().trim()
    title = title.replace(/\s*(tags\.new|New)\s*$/i, '').trim()
    if (!title) return

    // Company name: the first #startup-website-link contains an <h7> with company name
    const company = card.find('[id="startup-website-link"] h7').first().text().trim()
    if (!company) return

    // Application link: either the <a> wrapping the job title, or the Apply button
    let applicationLink = card.find('a[id="apply-button"]').first().attr('href')
      || card.find('a:has(h5[id="job-title"])').first().attr('href')
      || ''
    applicationLink = (applicationLink || '').trim()
    if (!applicationLink) return

    // Dedup on URL (page boundaries can double-serve)
    if (seenLinks.has(applicationLink)) return
    seenLinks.add(applicationLink)

    // Location: h7 with map-marker-alt icon. Some cards have literal "Location" text — skip those.
    let location = 'Not specified'
    card.find('h7').each((__, h) => {
      const hEl = $(h)
      if (hEl.find('i.fa-map-marker-alt').length > 0) {
        const txt = hEl.text().trim()
        if (txt && txt.toLowerCase() !== 'location') location = txt
      }
    })

    // Posted date — match any h7 containing "Posted:" since icon classes vary (far/fas)
    let postingDate = new Date()
    card.find('h7').each((__, h) => {
      const txt = $(h).text()
      if (/posted\s*:/i.test(txt)) {
        postingDate = parsePostedDate(txt)
      }
    })

    // Industry tags and description snippet (in collapsed details)
    const industryTags = card.find('[id="industry-tags"]').map((__, t) => $(t).text().trim()).get()
    const companyDescription = card.find('[id="card-header"]').first().parent().text().trim().slice(0, 500)

    // Funding tags: investor names mixed with round descriptors like "$81M Series B in 2025"
    const fundingTags = card.find('[id="funding-tags"]').map((__, t) => $(t).text().trim()).get()

    // The round tag is the one with a round keyword; may contain an amount prefix ($XM/$XB)
    const roundTag = fundingTags.find(t => /\b(pre-?seed|seed|series\s+[a-z]|ipo|post-ipo|growth)\b/i.test(t)) || ''

    // Split the round tag into the "$XM Series X" part and the "in YYYY" part so we can
    // replace the year with a relative time ("8 months ago").
    const yearMatch = roundTag.match(/\bin\s+(\d{4})\b/i)
    const roundWithoutYear = roundTag.replace(/\s*\bin\s+\d{4}\b\s*/i, '').trim()
    let roundFormatted = roundWithoutYear || roundTag
    if (yearMatch) {
      // We only know the year, so approximate to mid-year for a reasonable relative time.
      const approxDate = new Date(parseInt(yearMatch[1], 10), 5, 15) // June 15 of that year
      roundFormatted = `${roundWithoutYear}, ${relativeTimeFrom(approxDate)}`.trim()
    }

    // Founding year: lives in company-size-tags as "Founded: YYYY"
    const sizeTags = card.find('[id="company-size-tags"]').map((__, t) => $(t).text().trim()).get()
    const foundedTag = sizeTags.find(t => /founded/i.test(t)) || ''
    const foundedMatch = foundedTag.match(/founded\s*:?\s*(\d{4})/i)
    const foundedYear = foundedMatch ? parseInt(foundedMatch[1], 10) : null

    // Build human-readable funding_details: "AMOUNT ROUND · N months ago · Founded YYYY"
    const fundingDetailsParts: string[] = []
    if (roundFormatted) fundingDetailsParts.push(roundFormatted)
    else if (fundingTags.length > 0) fundingDetailsParts.push(fundingTags.join(', '))
    if (foundedYear) fundingDetailsParts.push(`Founded ${foundedYear}`)
    const fundingDetails = fundingDetailsParts.length > 0 ? fundingDetailsParts.join(' · ') : null

    if (!BaseScraper.isValidJob(title, company, applicationLink)) return

    // Filter Israel
    if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(location)) return

    const { industry } = classifyIndustry(company, title, companyDescription + ' ' + industryTags.join(' '))

    jobs.push({
      company_name: company,
      industry,
      location,
      // funding_stage holds the platform tag (used for UI grouping / filters).
      // Actual round info lives in funding_details.
      funding_stage: 'TopStartups',
      funding_details: fundingDetails,
      role_title: title,
      role_type: inferRoleType(title),
      role_level: inferRoleLevel(title),
      work_mode: inferWorkMode(location),
      compensation: 'Not specified',
      equity: null,
      posting_date: postingDate,
      closing_date: null,
      company_description: companyDescription,
      application_link: applicationLink,
      source_website: BASE_URL,
      is_active: true,
    })
  })

  return jobs
}

export class TopStartupsScraper extends BaseScraper {
  name = 'TopStartups.io'
  sourceUrl = BASE_URL
  maxPages: number

  constructor(maxPages = 10) {
    super()
    this.maxPages = maxPages
  }

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const allJobs: JobData[] = []
      const seenLinks = new Set<string>()

      for (let page = 1; page <= this.maxPages; page++) {
        const url = page === 1 ? JOBS_URL : `${JOBS_URL}?page=${page}`
        try {
          console.log(`[${this.name}] Fetching page ${page}...`)
          const html = await fetchHtml(url)
          const before = allJobs.length
          const jobs = parseJobCards(html, seenLinks)
          allJobs.push(...jobs)
          console.log(`[${this.name}]   Page ${page}: +${jobs.length} jobs (total ${allJobs.length})`)

          // Stop if page yielded zero new jobs (likely past the end)
          if (jobs.length === 0 && allJobs.length > before) break
          if (jobs.length === 0) break
        } catch (err) {
          console.error(`[${this.name}] Error on page ${page}:`, (err as Error).message)
          break
        }
      }

      console.log(`[${this.name}] Total: ${allJobs.length} jobs`)
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
}
