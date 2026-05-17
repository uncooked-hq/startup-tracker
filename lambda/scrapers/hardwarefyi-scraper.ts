/**
 * jobs.hardwarefyi.com Scraper (Cheerio)
 *
 * Scrapes the Webflow-built hardware jobs board. All jobs rendered server-side
 * on one page (no pagination). No browser needed.
 */

import * as cheerio from 'cheerio'
import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const BASE_URL = 'https://jobs.hardwarefyi.com'

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

function normalizeLevel(raw: string): string {
  const t = raw.toLowerCase()
  if (/\b(senior|lead|principal|staff|director|head|vp|chief|expert)\b/.test(t) || t.includes('senior-level')) return 'Senior'
  if (/\b(junior|entry|intern|internship|graduate|grad)\b/.test(t) || t.includes('entry-level')) return 'Entry'
  if (/\b(mid|intermediate)\b/.test(t) || t.includes('mid-level')) return 'Mid'
  return 'Mid'
}

function inferWorkMode(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('remote')) return 'Remote'
  if (l.includes('hybrid')) return 'Hybrid'
  return 'Onsite'
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

  $('a.card.job').each((_, el) => {
    const card = $(el)

    const title = card.find('.card-job-title-wrapper .title, h3.title').first().text().trim()
    const company = card.find('.card-link').first().text().trim()
    const href = card.attr('href') || ''
    if (!title || !company || !href) return

    const applicationLink = href.startsWith('http') ? href : `${BASE_URL}${href}`
    if (seenLinks.has(applicationLink)) return
    seenLinks.add(applicationLink)

    // Metadata wrappers: each has a label (in .card-job-category-title-wrapper div.text-block-N)
    // and a value (sibling .card-job-category-text).
    let location = ''
    let levelRaw = ''
    let industryRaw = ''
    let salaryRaw = ''

    card.find('.card-job-category-wrapper').each((__, w) => {
      const wrap = $(w)
      const label = wrap.find('.card-job-category-title-wrapper').first().text().trim().toLowerCase()
      const value = wrap.find('.card-job-category-text').first().text().trim()
      if (!value) return

      if (label.includes('location')) location = value
      else if (label.includes('level')) levelRaw = value
      else if (label.includes('industry')) industryRaw = value
      else if (label.includes('salary') || label.includes('compensation')) salaryRaw = value
    })

    if (!BaseScraper.isValidJob(title, company, applicationLink)) return
    if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(location)) return

    const classified = classifyIndustry(company, title, industryRaw)
    const industry = industryRaw || classified.industry

    jobs.push({
      company_name: company,
      industry,
      location: location || 'Not specified',
      funding_stage: 'HardwareFYI',
      role_title: title,
      role_type: inferRoleType(title),
      role_level: levelRaw ? normalizeLevel(levelRaw) : normalizeLevel(title),
      work_mode: inferWorkMode(location),
      compensation: salaryRaw || 'Not specified',
      equity: null,
      posting_date: new Date(),
      closing_date: null,
      company_description: '',
      application_link: applicationLink,
      source_website: BASE_URL,
      is_active: true,
    })
  })

  return jobs
}

export class HardwareFYIScraper extends BaseScraper {
  name = 'HardwareFYI'
  sourceUrl = BASE_URL

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      console.log(`[${this.name}] Fetching ${BASE_URL}...`)
      const html = await fetchHtml(BASE_URL)
      const jobs = parseJobCards(html, new Set<string>())
      console.log(`[${this.name}] Total: ${jobs.length} jobs`)
      return { success: true, jobs, source: this.name }
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
