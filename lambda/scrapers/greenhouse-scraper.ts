/**
 * Greenhouse Job Board API Scraper
 *
 * Uses the public Greenhouse Boards API:
 *   https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
 *
 * One instance per company. Generic — not AI-specific; the `tag` arg sets the
 * funding_stage label for UI grouping (e.g. 'AI Lab').
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import { extractSalaryFromBody } from './salary'
import type { ScraperResult, JobData } from './types'

interface GreenhouseJob {
  id: number
  title: string
  absolute_url: string
  location?: { name?: string }
  updated_at?: string
  first_published?: string
  company_name?: string
  content?: string
  departments?: Array<{ id: number; name: string }>
  offices?: Array<{ id: number; name: string; location?: string }>
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[]
  meta?: { total: number }
}

function inferWorkMode(location: string): string {
  const l = location.toLowerCase()
  if (l.includes('remote')) return 'Remote'
  if (l.includes('hybrid')) return 'Hybrid'
  return 'Onsite'
}

function inferRoleLevel(title: string): string {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief|expert|architect)\b/.test(t)) return 'Senior'
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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export interface CompanyMeta {
  foundedYear?: number
  lastFunding?: string            // e.g. "$30B Series G", "$122B"
  lastFundingDate?: string | null // ISO date "YYYY-MM-DD" when round closed
  fundingRound?: string | null    // structured round (Series G, Seed, …) for filtering
}

/**
 * Format a date as a human-friendly relative string: "2 months ago", "1 year ago", etc.
 * Exported so scrapers can use it uniformly.
 */
export function relativeTimeFrom(date: Date, now: Date = new Date()): string {
  const totalMonths =
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  if (totalMonths <= 0) return 'this month'
  if (totalMonths === 1) return '1 month ago'
  if (totalMonths < 12) return `${totalMonths} months ago`
  const years = Math.floor(totalMonths / 12)
  if (years === 1) return '1 year ago'
  return `${years} years ago`
}

export function buildFundingDetails(tag: string | null, meta?: CompanyMeta): string | null {
  // Format: "$30B Series G, 2 months ago · Founded 2021"
  // The " · " separator is the UI split point (→ multiple chips).
  // ", " keeps the relative time inside the funding chip.
  const parts: string[] = []
  if (meta?.lastFunding) {
    let fundingStr = meta.lastFunding
    if (meta.lastFundingDate) {
      const d = new Date(meta.lastFundingDate)
      if (!isNaN(d.getTime())) fundingStr = `${fundingStr}, ${relativeTimeFrom(d)}`
    }
    parts.push(fundingStr)
  }
  if (meta?.foundedYear) parts.push(`Founded ${meta.foundedYear}`)
  if (parts.length === 0) return tag // fall back to tag if no meta
  return parts.join(' · ')
}

export class GreenhouseScraper extends BaseScraper {
  name: string
  sourceUrl: string
  slug: string
  tag: string | null
  meta?: CompanyMeta

  constructor(displayName: string, slug: string, tag: string | null = null, meta?: CompanyMeta) {
    super()
    this.name = `${displayName} (Greenhouse)`
    this.slug = slug
    this.tag = tag
    this.meta = meta
    this.sourceUrl = `https://boards.greenhouse.io/${slug}`
  }

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${this.slug}/jobs?content=true`
      console.log(`[${this.name}] Fetching ${url}...`)

      const controller = new AbortController()
      setTimeout(() => controller.abort(), 30000)
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: GreenhouseResponse = await res.json()

      const company = (data.jobs[0]?.company_name) || this.name.replace(/\s*\(Greenhouse\)$/, '')
      const jobs: JobData[] = []

      for (const j of data.jobs) {
        const title = (j.title || '').trim()
        const link = j.absolute_url
        const location = j.location?.name?.trim() || 'Not specified'
        if (!title || !link) continue

        // Filter Israel
        if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(location)) continue

        if (!BaseScraper.isValidJob(title, company, link)) continue

        // Strip the full body once; description uses the truncated head, salary
        // scanner uses the full text (pay sections often sit near the bottom).
        const fullBody = j.content ? stripHtml(j.content) : ''
        const description = fullBody.slice(0, 800)
        const dept = j.departments?.[0]?.name || ''
        const { industry } = classifyIndustry(company, title, dept + ' ' + description)
        const salary = extractSalaryFromBody(fullBody)

        const postedStr = j.first_published || j.updated_at
        const posted = postedStr ? new Date(postedStr) : new Date()

        jobs.push({
          company_name: company,
          industry,
          location,
          funding_stage: this.tag,
          funding_details: buildFundingDetails(this.tag, this.meta),
          funding_round: this.meta?.fundingRound ?? null,
          role_title: title,
          role_type: inferRoleType(title),
          role_level: inferRoleLevel(title),
          work_mode: inferWorkMode(location),
          compensation: salary || 'Not specified',
          equity: null,
          posting_date: posted,
          closing_date: null,
          company_description: '',
          role_description: description || null,
          application_link: link,
          source_website: this.sourceUrl,
          is_active: true,
        })
      }

      console.log(`[${this.name}] ${jobs.length} jobs (of ${data.jobs.length})`)
      return { success: true, jobs, source: this.name }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return { success: false, jobs: [], error: msg, source: this.name }
    }
  }
}
