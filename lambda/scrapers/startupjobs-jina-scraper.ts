/**
 * Startup.jobs Scraper (Jina-based)
 *
 * Uses Jina Reader to bypass Cloudflare and scrape all category pages.
 * Replaces the Puppeteer-based scraper that could only get the main page.
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const STARTUPJOBS_URL = 'https://startup.jobs'

const CATEGORY_URLS = [
  'https://startup.jobs',
  'https://startup.jobs/developer-jobs',
  'https://startup.jobs/design-jobs',
  'https://startup.jobs/marketing-jobs',
  'https://startup.jobs/devops-jobs',
  'https://startup.jobs/remote-jobs',
  'https://startup.jobs/business-development-jobs',
]

async function fetchViaJina(url: string): Promise<string> {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 20000)
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain' },
    signal: controller.signal,
  })
  if (!res.ok) throw new Error(`Jina ${res.status}`)
  return res.text()
}

function parseJobsFromMarkdown(markdown: string, seenIds: Set<string>): JobData[] {
  const jobs: JobData[] = []

  // Each job block follows this pattern in the markdown:
  // [Job Title](https://startup.jobs/slug-ID)
  // [Company Name](https://startup.jobs/company/slug)·
  // [City](location-url), [State](location-url), [Country](location-url)
  //  Work Mode
  const jobPattern = /\[([^\]]+)\]\((https:\/\/startup\.jobs\/[\w-]+-(\d+))\)/g

  let match
  while ((match = jobPattern.exec(markdown)) !== null) {
    const title = match[1].trim()
    const url = match[2]
    const jobId = match[3]

    if (seenIds.has(jobId)) continue
    seenIds.add(jobId)

    if (title.length < 5 || title.length > 200) continue
    if (/^(post|browse|startup|sign|log|show|apply|bookmark|more)/i.test(title)) continue

    // Look at the text AFTER the job link for company + location
    const afterPos = match.index! + match[0].length
    const contextAfter = markdown.slice(afterPos, afterPos + 500)

    // Company name: [CompanyName](https://startup.jobs/company/slug)
    const companyMatch = contextAfter.match(/^\s*\n\s*\[([^\]]+)\]\(https:\/\/startup\.jobs\/company\//)
    let company = companyMatch ? companyMatch[1].trim() : ''

    // Location: [City](locations/...), [State](locations/...), [Country](locations/...)
    // Also: [Remote](startup.jobs/remote-jobs) or plain "Work from anywhere"
    const locationLinks: string[] = []
    const locSearchArea = contextAfter.slice(0, 300)
    const locPattern = /\[([^\]]+)\]\(https:\/\/startup\.jobs\/locations\/[^)]+\)/g
    let locMatch
    while ((locMatch = locPattern.exec(locSearchArea)) !== null) {
      locationLinks.push(locMatch[1].trim())
    }
    let location = locationLinks.length > 0 ? locationLinks.join(', ') : 'Not specified'

    // Check for Remote link (uses /remote-jobs not /locations/)
    if (location === 'Not specified' && /\[Remote\]\(https:\/\/startup\.jobs\/remote-jobs\)/.test(locSearchArea)) {
      location = 'Remote'
    }
    // Check for "Work from anywhere" text
    if (location === 'Not specified' && /work from anywhere/i.test(locSearchArea)) {
      location = 'Remote'
    }
    // Fallback: check for plain text location (e.g. "Channel Islands" not wrapped in a link)
    if (location === 'Not specified') {
      // After company line, location might be plain text before the date
      const plainLocMatch = locSearchArea.match(/·\s*\n\s*([A-Z][\w\s,]+?)\s*\n/m)
      if (plainLocMatch && plainLocMatch[1].length > 2 && plainLocMatch[1].length < 60) {
        location = plainLocMatch[1].trim()
      }
    }

    // Work mode
    let workMode = 'Onsite'
    if (/\bRemote\b/.test(locSearchArea) || location === 'Remote') workMode = 'Remote'
    else if (/\bHybrid\b/.test(locSearchArea)) workMode = 'Hybrid'

    // Skip if no valid company
    if (!company || company.length < 2) continue
    if (!BaseScraper.isValidJob(title, company, url)) continue

    const { industry } = classifyIndustry(company, title, '')

    // Filter Israel
    if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(location)) continue

    const roleLevel = (() => {
      const lower = title.toLowerCase()
      if (lower.match(/\b(senior|sr|lead|principal|staff|architect)\b/)) return 'Senior'
      if (lower.match(/\b(junior|jr|entry|intern|internship|graduate)\b/)) return 'Entry'
      return 'Mid'
    })()

    jobs.push({
      company_name: company,
      industry,
      location,
      funding_stage: 'Startup.jobs',
      role_title: title,
      role_type: 'Full-time',
      role_level: roleLevel,
      work_mode: workMode,
      compensation: 'Not specified',
      equity: null,
      posting_date: new Date(),
      closing_date: null,
      company_description: '',
      application_link: url,
      source_website: STARTUPJOBS_URL,
      is_active: true,
    })
  }

  return jobs
}

export class StartupJobsJinaScraper extends BaseScraper {
  name = 'Startup.jobs'
  sourceUrl = STARTUPJOBS_URL

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const allJobs: JobData[] = []
      const seenIds = new Set<string>()

      for (const url of CATEGORY_URLS) {
        try {
          console.log(`[${this.name}] Fetching ${url} via Jina...`)
          const markdown = await fetchViaJina(url)
          const jobs = parseJobsFromMarkdown(markdown, seenIds)
          console.log(`[${this.name}]   Found ${jobs.length} new jobs`)
          allJobs.push(...jobs)
        } catch (error) {
          console.error(`[${this.name}] Error on ${url}:`, (error as Error).message)
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
