/**
 * Ashby Job Board API Scraper
 *
 * Uses the public Ashby posting API:
 *   https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
 *
 * One instance per company. Generic — the `tag` arg sets funding_stage.
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'
import type { CompanyMeta } from './greenhouse-scraper'
import { buildFundingDetails } from './greenhouse-scraper'

interface AshbyAddress {
  postalAddress?: {
    addressCountry?: string
    addressLocality?: string
    addressRegion?: string
  }
}

interface AshbyCompensation {
  compensationTierSummary?: string  // e.g. "$150K – $250K"
  summaryComponents?: Array<{
    compensationType?: string
    interval?: string
    currencyCode?: string
    minValue?: number
    maxValue?: number
  }>
}

interface AshbyJob {
  id: string
  title: string
  department?: string | null
  team?: string | null
  employmentType?: string
  location?: string
  secondaryLocations?: Array<{ location: string }>
  publishedAt?: string
  isListed?: boolean
  isRemote?: boolean | null
  workplaceType?: string | null  // 'Remote' | 'Hybrid' | 'Onsite' | null
  address?: AshbyAddress
  jobUrl?: string
  applyUrl?: string
  descriptionHtml?: string
  compensation?: AshbyCompensation
}

interface AshbyResponse {
  jobs: AshbyJob[]
  apiVersion?: string
}

function mapEmploymentType(raw?: string): string {
  switch ((raw || '').toLowerCase()) {
    case 'fulltime': case 'full-time': case 'full_time': return 'Full-time'
    case 'parttime': case 'part-time': case 'part_time': return 'Part-time'
    case 'intern': case 'internship': return 'Internship'
    case 'contract': case 'contractor': return 'Contract'
    case 'temporary': return 'Contract'
    default: return 'Full-time'
  }
}

function mapWorkplaceType(workplaceType: string | null | undefined, isRemote: boolean | null | undefined, location: string): string {
  if (workplaceType) {
    const w = workplaceType.toLowerCase()
    if (w.includes('remote')) return 'Remote'
    if (w.includes('hybrid')) return 'Hybrid'
    if (w.includes('onsite') || w.includes('office')) return 'Onsite'
  }
  if (isRemote === true) return 'Remote'
  if (isRemote === false) return 'Onsite'
  const l = (location || '').toLowerCase()
  if (l.includes('remote')) return 'Remote'
  if (l.includes('hybrid')) return 'Hybrid'
  return 'Onsite'
}

function inferRoleLevel(title: string): string {
  const t = title.toLowerCase()
  if (/\b(senior|sr\.?|lead|principal|staff|head of|director|vp|chief|expert|architect)\b/.test(t)) return 'Senior'
  if (/\b(junior|jr\.?|entry|intern|internship|graduate|grad|early career)\b/.test(t)) return 'Entry'
  return 'Mid'
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

function formatCompensation(comp?: AshbyCompensation): string {
  if (!comp) return 'Not specified'
  if (comp.compensationTierSummary) return comp.compensationTierSummary
  const first = comp.summaryComponents?.[0]
  if (!first || (!first.minValue && !first.maxValue)) return 'Not specified'
  const c = first.currencyCode || 'USD'
  const interval = first.interval ? ` / ${first.interval.toLowerCase()}` : ''
  if (first.minValue && first.maxValue) {
    return `${c} ${Math.round(first.minValue / 1000)}K–${Math.round(first.maxValue / 1000)}K${interval}`
  }
  return `${c} ${Math.round((first.minValue || first.maxValue || 0) / 1000)}K${interval}`
}

export class AshbyScraper extends BaseScraper {
  name: string
  sourceUrl: string
  slug: string
  companyName: string
  tag: string | null
  meta?: CompanyMeta

  constructor(displayName: string, slug: string, tag: string | null = null, meta?: CompanyMeta) {
    super()
    this.name = `${displayName} (Ashby)`
    this.companyName = displayName
    this.slug = slug
    this.tag = tag
    this.meta = meta
    this.sourceUrl = `https://jobs.ashbyhq.com/${slug}`
  }

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const url = `https://api.ashbyhq.com/posting-api/job-board/${this.slug}?includeCompensation=true`
      console.log(`[${this.name}] Fetching ${url}...`)

      const controller = new AbortController()
      setTimeout(() => controller.abort(), 30000)
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AshbyResponse = await res.json()

      const jobs: JobData[] = []

      for (const j of data.jobs) {
        if (j.isListed === false) continue

        const title = (j.title || '').trim()
        const link = j.jobUrl || j.applyUrl || ''
        if (!title || !link) continue

        // Combine primary + secondary locations
        const locations = [j.location, ...(j.secondaryLocations?.map(s => s.location) || [])]
          .filter(Boolean)
          .map(l => (l as string).trim())
        const location = locations.length > 0 ? locations.join(' · ') : 'Not specified'

        // Filter Israel
        if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(location)) continue

        if (!BaseScraper.isValidJob(title, this.companyName, link)) continue

        const description = j.descriptionHtml ? stripHtml(j.descriptionHtml).slice(0, 800) : ''
        const dept = [j.department, j.team].filter(Boolean).join(' / ')
        const { industry } = classifyIndustry(this.companyName, title, dept + ' ' + description)

        const posted = j.publishedAt ? new Date(j.publishedAt) : new Date()

        jobs.push({
          company_name: this.companyName,
          industry,
          location,
          funding_stage: this.tag,
          funding_details: buildFundingDetails(this.tag, this.meta),
          role_title: title,
          role_type: mapEmploymentType(j.employmentType),
          role_level: inferRoleLevel(title),
          work_mode: mapWorkplaceType(j.workplaceType, j.isRemote, location),
          compensation: formatCompensation(j.compensation),
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
