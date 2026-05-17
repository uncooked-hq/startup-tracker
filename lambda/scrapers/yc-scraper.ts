/**
 * Y Combinator Jobs Scraper
 *
 * Fetches from role-specific pages on ycombinator.com/jobs.
 * Uses plain fetch + cheerio — no browser needed.
 */

import * as cheerio from 'cheerio'
import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

function extractRoleLevel(title: string): string {
  const lower = title.toLowerCase()
  if (lower.match(/\b(senior|sr|lead|principal|staff|architect)\b/)) return 'Senior'
  if (lower.match(/\b(junior|jr|entry|intern|internship|graduate)\b/)) return 'Entry'
  return 'Mid'
}

const YC_ROLE_URLS = [
  'https://www.ycombinator.com/jobs/role/software-engineer',
  'https://www.ycombinator.com/jobs/role/design',
  'https://www.ycombinator.com/jobs/role/product',
  'https://www.ycombinator.com/jobs/role/operations',
  'https://www.ycombinator.com/jobs/role/sales',
  'https://www.ycombinator.com/jobs/role/marketing',
]

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.text()
}

function parseJobsFromHTML(
  $: cheerio.CheerioAPI,
  seenIds: Set<string>,
  normalizeText: (t: string) => string,
): JobData[] {
  const results: JobData[] = []

  $('a[href*="signup_job_id"]').each((_i, elem) => {
    const $applyButton = $(elem)
    const applyHref = $applyButton.attr('href') || ''

    const jobIdMatch = applyHref.match(/signup_job_id%3D(\d+)/)
    if (!jobIdMatch) return

    const jobId = jobIdMatch[1]
    if (seenIds.has(jobId)) return
    seenIds.add(jobId)

    const applicationUrl = `https://www.workatastartup.com/companies?signup_job_id=${jobId}`

    const $jobCard = $applyButton.parent().parent()

    // Company name + batch
    let companyText = ''
    $jobCard.find('a[href*="/companies/"]').each((_j, link) => {
      const text = $(link).text().trim()
      if (text && !companyText) companyText = text
    })
    if (!companyText) return

    const companyMatch = companyText.match(/^(.+?)\s*\(([WS]\d{2})\)/)
    if (!companyMatch) return

    const companyName = companyMatch[1].trim()
    const batch = companyMatch[2]

    // Company description
    let companyDescription = ''
    const descMatch = companyText.match(/\(([WS]\d{2})\)•(.+?)\(/)
    if (descMatch) companyDescription = normalizeText(descMatch[2])

    // Posting date
    let postingDate = new Date()
    const timeMatch = companyText.match(
      /\((?:about\s+)?(\d+)\s+(hour|day|week|month)s?\s+ago\)/i,
    )
    if (timeMatch) {
      const amount = parseInt(timeMatch[1], 10)
      const unit = timeMatch[2].toLowerCase()
      const now = new Date()
      const ms: Record<string, number> = {
        hour: 3600000,
        day: 86400000,
        week: 604800000,
        month: 2592000000,
      }
      postingDate = new Date(now.getTime() - amount * (ms[unit] || 86400000))
    }

    // Job title
    const jobTitleLink = $jobCard
      .find('a.text-linkColor, a[class*="text-sm font-semibold"]')
      .first()
    const jobTitle = jobTitleLink.text().trim()
    if (!jobTitle || jobTitle.length < 10) return

    // Details
    const detailsDiv = $jobCard.find('div.flex.flex-wrap').first()
    const detailsText = detailsDiv.text()

    // Location
    let location = 'Remote'
    const locationMatch = detailsText.match(
      /(Remote|San Francisco|New York|Boston|London|Seattle|Mountain View|Bangalore|India|US|UK|CA|England|GB|Atlanta)[^•]*/i,
    )
    if (locationMatch) {
      location = normalizeText(locationMatch[0].replace(/•/g, ''))
    }

    // Filter Israel
    const israelPattern =
      /\bisrael\b|tel\s*aviv|jerusalem|haifa|ramat\s*gan|herzliya/i
    if (israelPattern.test(location) || israelPattern.test(detailsText)) return

    // Salary
    let compensation = 'Not specified'
    const salaryMatch = detailsText.match(
      /([$£€₹])([\d.]+)([KM])\s*-\s*([$£€₹])?([\d.]+)([KM])/,
    )
    if (salaryMatch) {
      compensation = salaryMatch[0].trim()
    }

    // Work mode
    const workMode = location.toLowerCase().includes('remote')
      ? 'Remote'
      : 'Hybrid'

    if (!BaseScraper.isValidJob(jobTitle, companyName, applicationUrl)) return

    const { industry } = classifyIndustry(companyName, jobTitle, '')

    results.push({
      company_name: normalizeText(companyName),
      industry,
      location,
      funding_stage: `YC ${batch}`,
      role_title: normalizeText(jobTitle),
      role_type: 'Full-time',
      role_level: extractRoleLevel(jobTitle),
      work_mode: workMode,
      compensation,
      equity: null,
      posting_date: postingDate,
      closing_date: null,
      company_description: companyDescription,
      application_link: applicationUrl,
      source_website: 'https://www.ycombinator.com/jobs',
      is_active: true,
    })
  })

  return results
}

export class YCScraper extends BaseScraper {
  name = 'Y Combinator'
  sourceUrl = 'https://www.ycombinator.com/jobs'

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const allJobs: JobData[] = []
      const seenIds = new Set<string>()

      for (const url of YC_ROLE_URLS) {
        try {
          console.log(`[${this.name}] Fetching ${url}`)
          const html = await fetchHTML(url)
          const $ = cheerio.load(html)
          const jobs = parseJobsFromHTML($, seenIds, this.normalizeText)
          console.log(`[${this.name}]   Found ${jobs.length} jobs`)
          allJobs.push(...jobs)
        } catch (error) {
          console.error(`[${this.name}] Error fetching ${url}:`, error)
        }
      }

      console.log(`[${this.name}] Total unique jobs: ${allJobs.length}`)

      return { success: true, jobs: allJobs, source: this.name }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, jobs: [], error: msg, source: this.name }
    }
  }
}
