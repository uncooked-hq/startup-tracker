/**
 * Built In Scraper (Cheerio)
 *
 * Scrapes https://builtin.com/jobs — server-rendered site with `[data-id="job-card"]`
 * cards and `?page=N` pagination. No browser needed.
 */

import * as cheerio from 'cheerio'
import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const BASE_URL = 'https://builtin.com'
const JOBS_URL = `${BASE_URL}/jobs`

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

function parseRelativeDate(text: string): Date {
  const t = text.toLowerCase().trim()
  const now = Date.now()
  if (/a\s+minute\s+ago|just\s+now|moments?\s+ago/.test(t)) return new Date(now - 60_000)
  if (/an?\s+hour\s+ago/.test(t)) return new Date(now - 3_600_000)
  if (/a\s+day\s+ago|yesterday/.test(t)) return new Date(now - 86_400_000)
  const m = t.match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s*ago/)
  if (!m) return new Date()
  const n = parseInt(m[1], 10)
  const unit = m[2]
  const ms = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000, month: 2_592_000_000, year: 31_536_000_000 }[unit] || 0
  return new Date(now - n * ms)
}

function normalizeWorkMode(raw: string): string {
  const t = raw.toLowerCase()
  if (t.includes('remote')) return 'Remote'
  if (t.includes('hybrid')) return 'Hybrid'
  if (t.includes('in office') || t.includes('in-office') || t.includes('onsite') || t.includes('on-site')) return 'Onsite'
  return 'Onsite'
}

function normalizeLevel(raw: string): string {
  const t = raw.toLowerCase()
  if (/\b(senior|lead|principal|staff|director|vp|head|chief|expert)\b/.test(t)) return 'Senior'
  if (/\b(junior|entry|intern|internship|graduate|grad)\b/.test(t)) return 'Entry'
  if (/\b(mid|intermediate)\b/.test(t)) return 'Mid'
  return 'Mid'
}

function parseSalary(raw: string): { text: string } {
  // Examples: "200K-255K Annually", "$120K Annually", "$45/hr-$55/hr"
  return { text: raw.trim() }
}

function parseJobCards(html: string, seenLinks: Set<string>): JobData[] {
  const $ = cheerio.load(html)
  const jobs: JobData[] = []

  $('[data-id="job-card"]').each((_, el) => {
    const card = $(el)

    // Title + application link
    const titleLink = card.find('a[data-id="job-card-title"]').first()
    const title = titleLink.text().trim()
    const href = titleLink.attr('href') || ''
    if (!title || !href) return
    const applicationLink = href.startsWith('http') ? href : `${BASE_URL}${href}`

    if (seenLinks.has(applicationLink)) return
    seenLinks.add(applicationLink)

    // Company
    const companyLink = card.find('a[data-id="company-title"]').first()
    let company = companyLink.find('span').first().text().trim()
    if (!company) company = companyLink.text().trim()
    if (!company) return

    // Metadata — iterate each icon-labeled field
    let workModeRaw = ''
    let locationRaw = ''
    let salaryRaw = ''
    let levelRaw = ''
    let postedRaw = ''

    // Time posted: the "clock" icon is sibling to a badge with time text
    card.find('i.fa-clock').each((__, i) => {
      const parent = $(i).parent()
      const txt = parent.text().trim()
      if (txt && txt.length < 50) postedRaw = txt
    })

    // Each metadata field: icon wrapper + sibling span.text-gray-04. Structure:
    //   <div class="d-flex align-items-start gap-sm">
    //     <div class="d-flex ..."><i class="...fa-X..."></i></div>
    //     <span class="font-barlow text-gray-04">Value</span>
    //   </div>
    card.find('i').each((__, iconEl) => {
      const icon = $(iconEl)
      const cls = icon.attr('class') || ''
      // Walk up: icon → inner wrapper div → outer wrapper div (contains both icon and span)
      const outer = icon.parent().parent()
      const valSpan = outer.find('span.text-gray-04, span.text-gray-04 span').first()
      if (valSpan.length === 0) return
      const val = valSpan.text().trim()
      if (!val) return

      if (cls.includes('fa-house-building')) workModeRaw = val
      else if (cls.includes('fa-location-dot')) {
        // Prefer the tooltip content if it's "2 Locations" etc
        const tooltipHolder = outer.find('[data-bs-title]').first()
        const tooltip = tooltipHolder.attr('data-bs-title') || ''
        if (/^\d+\s+location/i.test(val) && tooltip) {
          // Tooltip is HTML like "<div>City1</div><div>City2</div>" — inject separators
          const withSeps = tooltip.replace(/<\/div>\s*<div[^>]*>/gi, ' · ')
          const text = cheerio.load(`<div>${withSeps}</div>`).root().text().trim()
          const parts = text.split(/\s*·\s*/).map(s => s.trim()).filter(Boolean)
          // Truncate if huge (50+ locations is noise)
          if (parts.length > 5) {
            locationRaw = parts.slice(0, 3).join(' · ') + ` +${parts.length - 3} more`
          } else {
            locationRaw = parts.join(' · ')
          }
        } else {
          locationRaw = val
        }
      }
      else if (cls.includes('fa-sack-dollar') || cls.includes('fa-dollar')) salaryRaw = val
      else if (cls.includes('fa-trophy')) levelRaw = val
    })

    // Role type: infer from title
    const roleType = (() => {
      const t = title.toLowerCase()
      if (/\b(intern|internship)\b/.test(t)) return 'Internship'
      if (/\b(contract|contractor)\b/.test(t)) return 'Contract'
      if (/\bpart[-\s]?time\b/.test(t)) return 'Part-time'
      return 'Full-time'
    })()

    // Description: pull from the collapse panel
    const cardId = card.attr('id') || ''
    const idMatch = cardId.match(/job-card-(\d+)/)
    let description = ''
    if (idMatch) {
      description = $(`#drop-data-${idMatch[1]}`).text().trim().replace(/\s+/g, ' ').slice(0, 500)
    }

    if (!BaseScraper.isValidJob(title, company, applicationLink)) return

    // Filter Israel
    if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(locationRaw)) return

    const { industry } = classifyIndustry(company, title, description)
    const posted = postedRaw ? parseRelativeDate(postedRaw) : new Date()

    jobs.push({
      company_name: company,
      industry,
      location: locationRaw || 'Not specified',
      funding_stage: 'Built In',
      role_title: title,
      role_type: roleType,
      role_level: levelRaw ? normalizeLevel(levelRaw) : normalizeLevel(title),
      work_mode: workModeRaw ? normalizeWorkMode(workModeRaw) : 'Onsite',
      compensation: salaryRaw ? parseSalary(salaryRaw).text : 'Not specified',
      equity: null,
      posting_date: posted,
      closing_date: null,
      company_description: description,
      application_link: applicationLink,
      source_website: BASE_URL,
      is_active: true,
    })
  })

  return jobs
}

export class BuiltInScraper extends BaseScraper {
  name = 'Built In'
  sourceUrl = BASE_URL
  maxPages: number

  constructor(maxPages = 20) {
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
          const jobs = parseJobCards(html, seenLinks)
          allJobs.push(...jobs)
          console.log(`[${this.name}]   Page ${page}: +${jobs.length} jobs (total ${allJobs.length})`)
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
