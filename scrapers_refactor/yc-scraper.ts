/**
 * Y Combinator Jobs Scraper
 */

import * as cheerio from 'cheerio'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from './types'
import { normalizeText, extractRoleLevel, isValidJob } from './utils'

export const ycScraper: Scraper = {
  name: 'Y Combinator',
  url: 'https://www.ycombinator.com/jobs',

  async parse(html: string) {
    const $ = cheerio.load(html)
    const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

    // Find all links to company job pages
    $('a[href*="/companies/"]').each((i, elem) => {
      const $link = $(elem)
      const href = $link.attr('href') || ''
      const text = $link.text().trim()

      // Skip if no text or too short
      if (!text || text.length < 10) return

      // Look for job-related keywords
      const hasJobKeyword = text.match(/engineer|developer|designer|manager|analyst|lead|senior|junior|director/i)
      if (!hasJobKeyword) return

      // Extract company from URL: /companies/company-name/jobs/...
      const companyMatch = href.match(/\/companies\/([^/]+)/)
      if (!companyMatch) return

      const companySlug = companyMatch[1]
      const companyName = companySlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      const fullUrl = href.startsWith('http') ? href : `https://www.ycombinator.com${href}`

      // Validate before adding
      if (!isValidJob(text, companyName, fullUrl)) return

      const role: TrackerRoleData = {
        company_name: normalizeText(companyName),
        role_title: normalizeText(text),
        location: 'Remote',
        funding_stage: 'YC',
        role_type: 'Full-time',
        role_level: extractRoleLevel(text),
        work_mode: 'Remote',
        compensation_text: 'Not specified',
        company_description: null,
        company_domain: null,
        industry: null,
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        offers_equity: null,
        role_description: null,
        posting_date: new Date(),
        closing_date: null,
      }

      const source: TrackerRoleSourceData = {
        source: ycScraper.url,
        source_role_id: fullUrl,
        source_url: ycScraper.url,
        application_url: fullUrl,
        raw_payload: null,
      }

      results.push({ role, source })
    })

    // Remove duplicates by application URL
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.source.application_url, r])).values()
    )

    return uniqueResults
  }
}

// Allow running standalone for testing
if (require.main === module) {
  const { runScraper } = require('./utils')
  
  runScraper(ycScraper).then((result: any) => {
    console.log(`\n${result.success ? '✅' : '❌'} ${result.source}`)
    console.log(`Roles: ${result.roles.length}`)
    if (result.error) console.log(`Error: ${result.error}`)
    
    result.roles.slice(0, 5).forEach((item: any, i: number) => {
      console.log(`\n${i + 1}. ${item.role.role_title}`)
      console.log(`   ${item.role.company_name} | ${item.role.location}`)
      console.log(`   ${item.source.application_url}`)
    })
  })
}
