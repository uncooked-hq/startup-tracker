/**
 * Andreessen Horowitz (a16z) Jobs Scraper
 * Scrapes https://jobs.a16z.com/jobs
 * 
 * NOTE: This scraper requires Playwright (headless browser) because
 * the a16z jobs site is client-side rendered.
 * 
 * Configurable Options:
 * - jobTypes: Filter by job types (e.g., ['Software Engineer', 'Designer'])
 * - postedSince: Time range (e.g., 'P1D', 'P7D', 'P30D')
 * - locations: Filter by locations
 * - seniority: Filter by seniority level
 */

import * as cheerio from 'cheerio'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData, ScraperOptions } from './types'
import { normalizeText, extractRoleLevel, isValidJob } from './utils'

/**
 * Build a16z URL with filters
 */
function buildA16zUrl(options?: ScraperOptions): string {
  const base = 'https://jobs.a16z.com/jobs'
  const params = new URLSearchParams()
  
  // Default to Software Engineer jobs from last 30 days if no options provided
  const jobTypes = options?.jobTypes || ['Software Engineer']
  const postedSince = options?.postedSince || 'P30D'
  
  if (jobTypes.length > 0) {
    params.append('jobTypes', jobTypes.join('+'))
  }
  
  if (postedSince) {
    params.append('postedSince', postedSince)
  }
  
  if (options?.locations && options.locations.length > 0) {
    params.append('locations', options.locations.join('+'))
  }
  
  if (options?.seniority && options.seniority.length > 0) {
    params.append('seniority', options.seniority.join('+'))
  }
  
  return `${base}?${params.toString()}`
}

/**
 * Parse salary from text like "USD 265,000 - 340,000 / year"
 */
function parseSalary(text: string): {
  min: number | null
  max: number | null
  currency: string | null
  text: string
} {
  // Pattern: "USD 265,000 - 340,000 / year"
  const match = text.match(/(USD|GBP|EUR|INR)\s*([\d,]+)\s*-\s*([\d,]+)\s*\/\s*year/i)
  
  if (match) {
    const currency = match[1]
    const min = parseInt(match[2].replace(/,/g, ''), 10)
    const max = parseInt(match[3].replace(/,/g, ''), 10)
    
    return {
      min,
      max,
      currency,
      text: match[0]
    }
  }
  
  return { min: null, max: null, currency: null, text: 'Not specified' }
}

/**
 * Extract posting date from text like "Posted less than 1 day ago" or "Posted 2 days ago"
 */
function parsePostingDate(text: string): Date {
  const match = text.match(/Posted\s+(?:less than\s+)?(\d+)\s+(day|hour|week)s?\s+ago/i)
  
  if (match) {
    const amount = parseInt(match[1], 10)
    const unit = match[2].toLowerCase()
    const now = new Date()
    
    switch (unit) {
      case 'hour':
        return new Date(now.getTime() - amount * 60 * 60 * 1000)
      case 'day':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000)
      case 'week':
        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000)
    }
  }
  
  return new Date() // fallback to current date
}

export const a16zScraper: Scraper = {
  name: 'Andreessen Horowitz',
  url: buildA16zUrl,
  usePlaywright: true,
  playwrightOptions: {
    waitForSelector: '.job-list-job-details',
    timeout: 30000,
    scrollToLoad: true,
    maxScrolls: 50, // Will stop early if no new content loads
  },
  options: {
    jobTypes: ['Software Engineer'],
    postedSince: 'P7D', // Last 7 days
  },

  async parse(html: string) {
    const $ = cheerio.load(html)
    const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

    console.log(`[${this.name}] Parsing HTML...`)

    // Find all job containers
    const $jobContainers = $('.job-list-job-details')
    
    console.log(`[${this.name}] Found ${$jobContainers.length} job containers`)

    $jobContainers.each((i, container) => {
      const $container = $(container)
      
      try {
        // Extract basic info
        const companyName = normalizeText($container.find('.job-list-job-company-link').text())
        const $titleLink = $container.find('.job-list-job-title a')
        const roleTitle = normalizeText($titleLink.text())
        const applicationUrl = $titleLink.attr('href') || ''
        
        if (!companyName || !roleTitle || !applicationUrl) {
          return // Skip if missing critical data
        }
        
        // Get full text content for parsing
        const fullText = $container.text().trim()
        
        // Parse salary
        const salary = parseSalary(fullText)
        
        // Extract location - look for patterns like "Foster City, California, USA"
        const locationMatch = fullText.match(/(?:Hybrid|Remote|Onsite)?\s*([A-Z][a-zA-Z\s,]+(?:USA|US|UK|GB|CA|India|Remote))/
)
        const location = locationMatch ? normalizeText(locationMatch[1]) : 'Remote'
        
        // Extract work mode
        let workMode = 'Onsite'
        if (fullText.includes('Hybrid')) workMode = 'Hybrid'
        if (fullText.includes('Remote')) workMode = 'Remote'
        
        // Extract posting date
        const postingDate = parsePostingDate(fullText)
        
        // Extract company stage/size - look for patterns like "100–1000 employees"
        const sizeMatch = fullText.match(/(Seed|Series [A-Z]|\d+–\d+\s+employees|[<>]\d+\s+employees)/i)
        const fundingStage = sizeMatch ? normalizeText(sizeMatch[1]) : null
        
        // Extract category
        const categoryMatch = fullText.match(/Posted.*ago([A-Za-z\s&]+)(?:\d+–\d+|Seed|Series)/i)
        const industry = categoryMatch ? normalizeText(categoryMatch[1]) : null
        
        // Validate
        if (!isValidJob(roleTitle, companyName, applicationUrl)) {
          return
        }
        
        // Build TrackerRoleData
        const role: TrackerRoleData = {
          company_name: companyName,
          company_domain: null,
          industry: industry,
          funding_stage: fundingStage,
          role_title: roleTitle,
          role_level: extractRoleLevel(roleTitle),
          role_type: 'Full-time',
          work_mode: workMode,
          location: location,
          compensation_text: salary.text,
          salary_min: salary.min,
          salary_max: salary.max,
          salary_currency: salary.currency,
          offers_equity: null,
          company_description: null,
          role_description: null,
          posting_date: postingDate,
          closing_date: null,
        }
        
        // Build TrackerRoleSourceData
        const source: TrackerRoleSourceData = {
          source: typeof this.url === 'function' ? this.url(this.options) : this.url,
          source_role_id: applicationUrl,
          source_url: typeof this.url === 'function' ? this.url(this.options) : this.url,
          application_url: applicationUrl,
          raw_payload: null,
        }
        
        results.push({ role, source })
      } catch (error) {
        console.error(`[${this.name}] Error parsing job ${i}:`, error)
      }
    })

    return results
  },
}

// Standalone test
if (require.main === module) {
  (async () => {
    const { runPlaywrightScraper } = await import('./playwright-utils')
    
    const result = await runPlaywrightScraper(a16zScraper)
    
    if (result.success) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`✅ ${result.source}`)
      console.log('='.repeat(60))
      console.log(`Total Roles: ${result.roles.length}`)
      console.log('='.repeat(60) + '\n')
      
      result.roles.slice(0, 5).forEach((item, i) => {
        console.log(`--- Role ${i + 1} ---`)
        console.log(`Company: ${item.role.company_name}`)
        console.log(`Title: ${item.role.role_title}`)
        console.log(`Level: ${item.role.role_level}`)
        console.log(`Location: ${item.role.location}`)
        console.log(`Work Mode: ${item.role.work_mode}`)
        console.log(`Salary: ${item.role.compensation_text}`)
        if (item.role.salary_min) {
          console.log(`  Range: ${item.role.salary_min} - ${item.role.salary_max} ${item.role.salary_currency}`)
        }
        console.log(`Industry: ${item.role.industry || '(not specified)'}`)
        console.log(`Funding: ${item.role.funding_stage || '(not specified)'}`)
        console.log(`Posted: ${item.role.posting_date?.toISOString().split('T')[0]}`)
        console.log(`Application URL: ${item.source.application_url}`)
        console.log()
      })
      
      console.log('='.repeat(60))
      console.log(`Summary: ${result.roles.length} total roles extracted`)
      console.log('='.repeat(60) + '\n')
    } else {
      console.error(`Failed: ${result.error}`)
    }
  })()
}

