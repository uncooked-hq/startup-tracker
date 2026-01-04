/**
 * Y Combinator Jobs Scraper
 * Scrapes multiple role pages from https://www.ycombinator.com/jobs
 *
 * Fetches from role-specific pages to get more jobs (main page only shows 20)
 */

import * as cheerio from 'cheerio'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob, fetchHTML } from '../utils/helpers'

// Role pages to scrape (each has ~20-40 jobs)
const YC_ROLE_URLS = [
  'https://www.ycombinator.com/jobs/role/software-engineer',
  'https://www.ycombinator.com/jobs/role/design',
  'https://www.ycombinator.com/jobs/role/product',
  'https://www.ycombinator.com/jobs/role/operations',
  'https://www.ycombinator.com/jobs/role/sales',
  'https://www.ycombinator.com/jobs/role/marketing',
]

/**
 * Parse jobs from a single HTML page
 */
function parseJobsFromHTML($: cheerio.CheerioAPI): Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> {
  const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

  $('a[href*="signup_job_id"]').each((_i, elem) => {
    const $applyButton = $(elem)
    const applyHref = $applyButton.attr('href') || ''

    const jobIdMatch = applyHref.match(/signup_job_id%3D(\d+)/)
    if (!jobIdMatch) return

    const jobId = jobIdMatch[1]
    const applicationUrl = `https://www.workatastartup.com/companies?signup_job_id=${jobId}`

    const $jobCard = $applyButton.parent().parent()

    let companyText = ''
    $jobCard.find('a[href*="/companies/"]').each((_j, link) => {
      const text = $(link).text().trim()
      if (text && !companyText) {
        companyText = text
      }
    })

    if (!companyText) return

    const companyMatch = companyText.match(/^(.+?)\s*\(([WS]\d{2})\)/)
    if (!companyMatch) return

    const companyName = companyMatch[1].trim()
    const batch = companyMatch[2]

    let companyDescription = ''
    const descMatch = companyText.match(/\(([WS]\d{2})\)•(.+?)\(/)
    if (descMatch) {
      companyDescription = normalizeText(descMatch[2])
    }

    let postingDate = new Date()
    const timeMatch = companyText.match(/\((?:about\s+)?(\d+)\s+(hour|day|week|month)s?\s+ago\)/i)
    if (timeMatch) {
      const [, amount, unit] = timeMatch
      const now = new Date()
      const numAmount = parseInt(amount, 10)

      switch (unit.toLowerCase()) {
        case 'hour':
          postingDate = new Date(now.getTime() - numAmount * 60 * 60 * 1000)
          break
        case 'day':
          postingDate = new Date(now.getTime() - numAmount * 24 * 60 * 60 * 1000)
          break
        case 'week':
          postingDate = new Date(now.getTime() - numAmount * 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          postingDate = new Date(now.getTime() - numAmount * 30 * 24 * 60 * 60 * 1000)
          break
      }
    }

    const jobTitleLink = $jobCard.find('a.text-linkColor, a[class*="text-sm font-semibold"]').first()
    const jobTitle = jobTitleLink.text().trim()

    if (!jobTitle || jobTitle.length < 10) return

    const detailsDiv = $jobCard.find('div.flex.flex-wrap').first()
    const detailsText = detailsDiv.text()

    let location = 'Remote'
    const locationMatch = detailsText.match(/(Remote|San Francisco|New York|Boston|London|Seattle|Mountain View|Bangalore|India|US|UK|CA|England|GB|Atlanta)[^•]*/i)
    if (locationMatch) {
      location = normalizeText(locationMatch[0].replace(/•/g, ''))
    }

    let salaryMin: number | null = null
    let salaryMax: number | null = null
    let salaryCurrency: string | null = null
    let compensationText = 'Not specified'

    const salaryMatch = detailsText.match(/([$£€₹])?([\d.]+)([KM])\s*-\s*([$£€₹])?([\d.]+)([KM])\s*([A-Z]{3})?/)
    if (salaryMatch) {
      const [full, currency1, min, minUnit, _currency2, max, maxUnit, explicitCurrency] = salaryMatch
      compensationText = full.trim()

      const currencySymbol = currency1
      if (explicitCurrency) {
        salaryCurrency = explicitCurrency
      } else if (currencySymbol === '$') {
        salaryCurrency = 'USD'
      } else if (currencySymbol === '£') {
        salaryCurrency = 'GBP'
      } else if (currencySymbol === '€') {
        salaryCurrency = 'EUR'
      } else if (currencySymbol === '₹') {
        salaryCurrency = 'INR'
      }

      const minMultiplier = minUnit === 'K' ? 1000 : 1000000
      const maxMultiplier = maxUnit === 'K' ? 1000 : 1000000
      salaryMin = parseFloat(min) * minMultiplier
      salaryMax = parseFloat(max) * maxMultiplier
    }

    if (!isValidJob(jobTitle, companyName, applicationUrl)) return

    const role: TrackerRoleData = {
      company_name: normalizeText(companyName),
      role_title: normalizeText(jobTitle),
      location: location,
      funding_stage: `YC ${batch}`,
      role_type: 'Full-time',
      role_level: extractRoleLevel(jobTitle),
      work_mode: location.toLowerCase().includes('remote') ? 'Remote' : 'Hybrid',
      compensation_text: compensationText,
      company_description: companyDescription || null,
      company_domain: null,
      industry: null,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: salaryCurrency,
      offers_equity: null,
      role_description: null,
      posting_date: postingDate,
      closing_date: null,
    }

    const source: TrackerRoleSourceData = {
      source: 'Y Combinator',
      source_role_id: jobId,
      source_url: 'https://www.ycombinator.com/jobs',
      application_url: applicationUrl,
      raw_payload: null,
    }

    results.push({ role, source })
  })

  return results
}

export const ycScraper: Scraper = {
  name: 'Y Combinator',
  url: 'https://www.ycombinator.com/jobs',

  async parse(_html: string) {
    // Fetch multiple role pages to get more jobs
    const allResults: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

    for (const url of YC_ROLE_URLS) {
      try {
        console.log(`[Y Combinator] Fetching ${url}`)
        const html = await fetchHTML(url)
        const $ = cheerio.load(html)
        const jobs = parseJobsFromHTML($)
        console.log(`[Y Combinator]   Found ${jobs.length} jobs`)
        allResults.push(...jobs)
      } catch (error) {
        console.error(`[Y Combinator] Error fetching ${url}:`, error)
      }
    }

    // Remove duplicates by job ID
    const uniqueResults = Array.from(
      new Map(allResults.map(r => [r.source.source_role_id, r])).values()
    )

    console.log(`[Y Combinator] Total unique jobs: ${uniqueResults.length}`)
    return uniqueResults
  }
}

// Standalone test
if (require.main === module) {
  const { runScraper } = require('../utils/helpers')

  runScraper(ycScraper).then((result: any) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`${result.success ? '✅' : '❌'} ${result.source}`)
    console.log(`${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.roles.length}`)
    if (result.error) console.log(`Error: ${result.error}`)
    console.log(`${'='.repeat(60)}\n`)

    result.roles.slice(0, 5).forEach((item: any, i: number) => {
      console.log(`\n--- Role ${i + 1} ---`)
      console.log(`Company: ${item.role.company_name}`)
      console.log(`Title: ${item.role.role_title}`)
      console.log(`Level: ${item.role.role_level}`)
      console.log(`Location: ${item.role.location}`)
      console.log(`Salary: ${item.role.compensation_text}`)
      console.log(`Funding: ${item.role.funding_stage}`)
    })

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Summary: ${result.roles.length} total roles extracted`)
    console.log(`${'='.repeat(60)}\n`)
  })
}
