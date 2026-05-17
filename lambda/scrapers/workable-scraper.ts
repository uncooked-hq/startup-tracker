/**
 * Workable Job Board API Scraper
 *
 * Uses the public Workable jobs API:
 *   POST https://apply.workable.com/api/v3/accounts/{slug}/jobs
 *
 * Body is empty JSON ({}). Pagination via { token } if needed but most boards
 * fit in a single page.
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'
import type { CompanyMeta } from './greenhouse-scraper'
import { buildFundingDetails } from './greenhouse-scraper'

interface WorkableLocation {
  country?: string
  countryCode?: string
  city?: string
  region?: string
  hidden?: boolean
}

interface WorkableJob {
  id: number
  shortcode: string
  title: string
  remote?: boolean
  location?: WorkableLocation
  locations?: WorkableLocation[]
  state?: string
  isInternal?: boolean
  code?: string
  published?: string
  type?: string          // 'full' | 'part' | 'temporary' | 'internship' | 'contract'
  workplace?: string     // 'remote' | 'hybrid' | 'on-site'
  department?: string[]
  description?: string
}

interface WorkableResponse {
  total: number
  results: WorkableJob[]
  nextPage?: string | null
}

function formatLocation(loc?: WorkableLocation, locs?: WorkableLocation[]): string {
  const all = [loc, ...(locs || [])].filter(Boolean) as WorkableLocation[]
  const formatted = all.map(l => {
    const parts = [l.city, l.region, l.country].filter(Boolean)
    return parts.join(', ')
  }).filter(s => s.length > 0)
  const deduped = Array.from(new Set(formatted))
  return deduped.length > 0 ? deduped.join(' · ') : 'Not specified'
}

function mapType(raw?: string): string {
  switch ((raw || '').toLowerCase()) {
    case 'full': case 'full-time': case 'fulltime': return 'Full-time'
    case 'part': case 'part-time': case 'parttime': return 'Part-time'
    case 'internship': case 'intern': return 'Internship'
    case 'contract': case 'contractor': case 'temporary': return 'Contract'
    default: return 'Full-time'
  }
}

function mapWorkplace(workplace?: string, remote?: boolean, location?: string): string {
  if (workplace) {
    const w = workplace.toLowerCase()
    if (w.includes('remote')) return 'Remote'
    if (w.includes('hybrid')) return 'Hybrid'
    if (w.includes('on-site') || w.includes('onsite') || w.includes('office')) return 'Onsite'
  }
  if (remote === true) return 'Remote'
  const l = (location || '').toLowerCase()
  if (l.includes('remote')) return 'Remote'
  return 'Onsite'
}

function inferRoleLevel(title: string): string {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief|expert|architect)\b/.test(t)) return 'Senior'
  if (/\b(junior|jr\.?|entry|intern|internship|graduate|grad)\b/.test(t)) return 'Entry'
  return 'Mid'
}

export class WorkableScraper extends BaseScraper {
  name: string
  sourceUrl: string
  slug: string
  companyName: string
  tag: string | null
  meta?: CompanyMeta

  constructor(displayName: string, slug: string, tag: string | null = null, meta?: CompanyMeta) {
    super()
    this.name = `${displayName} (Workable)`
    this.companyName = displayName
    this.slug = slug
    this.tag = tag
    this.meta = meta
    this.sourceUrl = `https://apply.workable.com/${slug}`
  }

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const url = `https://apply.workable.com/api/v3/accounts/${this.slug}/jobs`
      console.log(`[${this.name}] Fetching ${url}...`)

      const jobs: JobData[] = []
      let token: string | undefined
      let pageCount = 0

      do {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 30000)
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(token ? { token } : {}),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: WorkableResponse = await res.json()

        for (const j of data.results || []) {
          if (j.state && j.state !== 'published') continue
          if (j.isInternal) continue

          const title = (j.title || '').trim()
          const link = `https://apply.workable.com/${this.slug}/j/${j.shortcode}/`
          if (!title) continue

          const location = formatLocation(j.location, j.locations)

          if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(location)) continue
          if (!BaseScraper.isValidJob(title, this.companyName, link)) continue

          const dept = (j.department || []).join(' / ')
          const { industry } = classifyIndustry(this.companyName, title, dept)
          const posted = j.published ? new Date(j.published) : new Date()

          jobs.push({
            company_name: this.companyName,
            industry,
            location,
            funding_stage: this.tag,
            funding_details: buildFundingDetails(this.tag, this.meta),
            role_title: title,
            role_type: mapType(j.type),
            role_level: inferRoleLevel(title),
            work_mode: mapWorkplace(j.workplace, j.remote, location),
            compensation: 'Not specified',
            equity: null,
            posting_date: posted,
            closing_date: null,
            company_description: '',
            role_description: null,
            application_link: link,
            source_website: this.sourceUrl,
            is_active: true,
          })
        }

        token = data.nextPage || undefined
        pageCount++
        if (pageCount > 20) break
      } while (token)

      console.log(`[${this.name}] ${jobs.length} jobs`)
      return { success: true, jobs, source: this.name }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return { success: false, jobs: [], error: msg, source: this.name }
    }
  }
}
