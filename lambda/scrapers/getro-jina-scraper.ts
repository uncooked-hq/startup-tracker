/**
 * Generic Getro VC Board Scraper (Jina-based)
 *
 * Uses Jina Reader to scrape Getro-powered VC job boards (Antler, Accel,
 * Atomico, Earlybird, etc). Replaces the Puppeteer version — faster, simpler,
 * and lambda-friendly (no browser required).
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

async function fetchViaJina(url: string): Promise<string> {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 25000)
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain' },
    signal: controller.signal,
  })
  if (!res.ok) throw new Error(`Jina ${res.status}`)
  return res.text()
}

function extractMarkdownContent(raw: string): string {
  const start = raw.indexOf('Markdown Content:')
  return start > 0 ? raw.slice(start + 17) : raw
}

function cleanCompanySlug(slug: string): string {
  // Strip trailing "-2", "-3" etc and UUID suffixes
  return slug
    .replace(/-\d+(-[a-f0-9]{4,}.*)?$/i, '')
    .replace(/-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}.*$/i, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim()
}

function extractCompanyFromUrl(url: string): string {
  const match = url.match(/\/companies\/([^/]+)\//i)
  if (!match) return 'Unknown'
  return cleanCompanySlug(match[1])
}

function buildJob(
  role: string,
  company: string,
  url: string,
  fundingStage: string,
  sourceUrl: string,
): JobData | null {
  if (!role || !company || company.length < 2 || role.length < 3) return null
  if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(role) ||
      /\bisrael\b/i.test(company)) return null

  const { industry } = classifyIndustry(company, role, '')

  const roleLevel = (() => {
    const lower = role.toLowerCase()
    if (lower.match(/\b(senior|sr|lead|principal|staff|architect)\b/)) return 'Senior'
    if (lower.match(/\b(junior|jr|entry|intern|internship|graduate)\b/)) return 'Entry'
    return 'Mid'
  })()

  return {
    company_name: company,
    industry,
    location: 'Not specified',
    funding_stage: fundingStage,
    role_title: role,
    role_type: 'Full-time',
    role_level: roleLevel,
    work_mode: 'Onsite',
    compensation: 'Not specified',
    equity: null,
    posting_date: new Date(),
    closing_date: null,
    company_description: '',
    application_link: url,
    source_website: sourceUrl,
    is_active: true,
  }
}

function parseJobsFromMarkdown(
  markdown: string,
  fundingStage: string,
  sourceUrl: string,
  seenIds: Set<string>,
): JobData[] {
  const jobs: JobData[] = []

  // Strategy 1: Getro "Read more about ROLE at COMPANY" pattern (Antler, Earlybird style)
  const readMorePattern = /\[Read more about (.+?) at (.+?)\]\((https?:\/\/[^)]+\/jobs\/(\d+)[^)]*)\)/g
  let match
  while ((match = readMorePattern.exec(markdown)) !== null) {
    const role = match[1].trim()
    const company = match[2].trim()
    const url = match[3].replace(/#content$/, '')
    const jobId = match[4]
    if (seenIds.has(jobId)) continue
    seenIds.add(jobId)
    const job = buildJob(role, company, url, fundingStage, sourceUrl)
    if (job) jobs.push(job)
  }

  // Strategy 2: Direct job link pattern [Role](url/jobs/ID-slug) — used by Accel, Atomico, etc
  // Extract company from the URL path
  const directPattern = /\[([^\]]+?)\]\((https?:\/\/[^)]+\/companies\/([^/]+)\/jobs\/(\d+)[^)]*)\)/g
  while ((match = directPattern.exec(markdown)) !== null) {
    const role = match[1].trim()
    const url = match[2].replace(/#content$/, '')
    const companySlug = match[3]
    const jobId = match[4]

    if (seenIds.has(jobId)) continue
    seenIds.add(jobId)

    // Skip "Read more about" which already got processed
    if (/^read more about/i.test(role)) continue

    const company = cleanCompanySlug(companySlug)
    const job = buildJob(role, company, url, fundingStage, sourceUrl)
    if (job) jobs.push(job)
  }

  return jobs
}

export class GetroJinaScraper extends BaseScraper {
  name: string
  sourceUrl: string
  fundingStage: string

  constructor(name: string, sourceUrl: string, fundingStage: string) {
    super()
    this.name = name
    this.sourceUrl = sourceUrl
    this.fundingStage = fundingStage
  }

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      console.log(`[${this.name}] Fetching ${this.sourceUrl} via Jina...`)
      const raw = await fetchViaJina(this.sourceUrl)
      const markdown = extractMarkdownContent(raw)

      const seenIds = new Set<string>()
      const jobs = parseJobsFromMarkdown(markdown, this.fundingStage, this.sourceUrl, seenIds)

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
