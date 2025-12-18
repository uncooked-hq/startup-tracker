/**
 * Y Combinator Jobs Scraper
 * Scrapes https://www.ycombinator.com/jobs
 * 
 * TODO: Potential Improvements
 * - [ ] Extract `industry` from department/category (Engineering, Sales, Design, Marketing, Operations)
 * - [ ] Extract role specialization (Frontend, Backend, Full stack, ML, Data Science) and add to raw_payload
 * - [ ] Store raw_payload with: detail_items, posting_time_text, direct_job_url, company_logo_url
 * - [ ] Extract company_domain (could derive from company slug or scrape individual page)
 * - [ ] Scrape individual job pages for full role_description
 * - [ ] Check for equity mentions (offers_equity field)
 * - [ ] Extract experience level from "X years" mentions
 * KEEPING IT BASIC JUST A TRACKER ABOVE TO SEE POTENTIAL IMPROVEMENTS THAT ARE OUT OF SCOPE!!
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

    console.log(`[${this.name}] Parsing HTML...`)

    // Strategy: Find all Apply buttons with signup_job_id, then extract job info nearby
    $('a[href*="signup_job_id"]').each((i, elem) => {
      const $applyButton = $(elem)
      const applyHref = $applyButton.attr('href') || ''
      
      // Extract signup_job_id from the URL (%3D is URL-encoded '=')
      const jobIdMatch = applyHref.match(/signup_job_id%3D(\d+)/)
      if (!jobIdMatch) return
      
      const jobId = jobIdMatch[1]
      const applicationUrl = `https://www.workatastartup.com/companies?signup_job_id=${jobId}`
      
      // Find the job card container (go up 2 levels from Apply button)
      const $jobCard = $applyButton.parent().parent()
      
      // Extract company info - find the company link that has text
      let companyText = ''
      let companyHref = ''
      $jobCard.find('a[href*="/companies/"]').each((_j, link) => {
        const text = $(link).text().trim()
        if (text && !companyText) {
          companyText = text
          companyHref = $(link).attr('href') || ''
        }
      })
      
      if (!companyText) return
      
      // Extract company name and batch from "Company Name (W22)•Description(time ago)"
      // Format can be: "Coast (S21)•Demo Platform for API-First Companies(10 days ago)"
      const companyMatch = companyText.match(/^(.+?)\s*\(([WS]\d{2})\)/)
      if (!companyMatch) return
      
      const companyName = companyMatch[1].trim()
      const batch = companyMatch[2]
      
      // Extract company description from the text after bullet
      let companyDescription = ''
      const descMatch = companyText.match(/\(([WS]\d{2})\)•(.+?)\(/)
      if (descMatch) {
        companyDescription = normalizeText(descMatch[2])
      }
      
      // Parse posting date from "(X days ago)" or "(about X hours ago)"
      let postingDate = new Date() // fallback
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
      
      // Extract job title
      const jobTitleLink = $jobCard.find('a.text-linkColor, a[class*="text-sm font-semibold"]').first()
      const jobTitle = jobTitleLink.text().trim()
      
      if (!jobTitle || jobTitle.length < 10) return
      
      // Extract location and other details
      const detailsDiv = $jobCard.find('div.flex.flex-wrap').first()
      const detailsText = detailsDiv.text()
      
      // Parse location (usually last item)
      let location = 'Remote'
      const locationMatch = detailsText.match(/(Remote|San Francisco|New York|Boston|London|Seattle|Mountain View|Bangalore|India|US|UK|CA|England|GB|Atlanta)[^•]*/i)
      if (locationMatch) {
        location = normalizeText(locationMatch[0].replace(/•/g, ''))
      }
      
      // Parse salary information
      // Formats: "$120K - $175K", "£40K - £80K GBP", "₹700K - ₹1M INR"
      let salaryMin: number | null = null
      let salaryMax: number | null = null
      let salaryCurrency: string | null = null
      let compensationText = 'Not specified'
      
      const salaryMatch = detailsText.match(/([$£€₹])?([\d.]+)([KM])\s*-\s*([$£€₹])?([\d.]+)([KM])\s*([A-Z]{3})?/)
      if (salaryMatch) {
        const [full, currency1, min, minUnit, currency2, max, maxUnit, explicitCurrency] = salaryMatch
        compensationText = full.trim()
        
        // Determine currency
        const currencySymbol = currency1 || currency2
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
        
        // Parse amounts (K = 1000, M = 1000000)
        const minMultiplier = minUnit === 'K' ? 1000 : 1000000
        const maxMultiplier = maxUnit === 'K' ? 1000 : 1000000
        salaryMin = parseFloat(min) * minMultiplier
        salaryMax = parseFloat(max) * maxMultiplier
      }
      
      // Validate before adding
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
        source: ycScraper.url,
        source_role_id: jobId,
        source_url: ycScraper.url,
        application_url: applicationUrl,
        raw_payload: null,
      }

      results.push({ role, source })
    })

    // Remove duplicates by job ID
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.source.source_role_id, r])).values()
    )

    return uniqueResults
  }
}

// Allow running standalone for testing
if (require.main === module) {
  const { runScraper } = require('./utils')
  
  runScraper(ycScraper).then((result: any) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`${result.success ? '✅' : '❌'} ${result.source}`)
    console.log(`${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.roles.length}`)
    if (result.error) console.log(`Error: ${result.error}`)
    console.log(`${'='.repeat(60)}\n`)
    
    // Log ALL roles with full details
    result.roles.forEach((item: any, i: number) => {
      console.log(`\n--- Role ${i + 1} ---`)
      console.log(`Company: ${item.role.company_name}`)
      console.log(`Description: ${item.role.company_description || '(none)'}`)
      console.log(`Title: ${item.role.role_title}`)
      console.log(`Level: ${item.role.role_level}`)
      console.log(`Location: ${item.role.location}`)
      console.log(`Work Mode: ${item.role.work_mode}`)
      console.log(`Type: ${item.role.role_type}`)
      console.log(`Salary: ${item.role.compensation_text}`)
      if (item.role.salary_min) {
        console.log(`  Min: ${item.role.salary_min} ${item.role.salary_currency}`)
        console.log(`  Max: ${item.role.salary_max} ${item.role.salary_currency}`)
      }
      console.log(`Funding: ${item.role.funding_stage}`)
      console.log(`Posted: ${item.role.posting_date.toISOString().split('T')[0]} (${item.role.posting_date.toLocaleString()})`)
      console.log(`Job ID: ${item.source.source_role_id}`)
      console.log(`Application URL: ${item.source.application_url}`)
      console.log(`Source: ${item.source.source}`)
    })
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Summary: ${result.roles.length} total roles extracted`)
    console.log(`${'='.repeat(60)}\n`)
  })
}
