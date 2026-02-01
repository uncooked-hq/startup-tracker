/**
 * Wellfound (AngelList) Scraper
 * 
 * Follows the a16z pattern: simple Scraper interface with parse() method.
 * Runner handles all Playwright navigation and retries for robustness.
 * Scrapes job listings from Europe and USA regions.
 */

import { load } from 'cheerio'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

function parseRelativeDate(text: string): Date {
  if (!text) return new Date()
  const lower = text.toLowerCase().trim()
  const now = new Date()

  if (lower.includes('yesterday')) {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  // formats like "2 weeks ago", "3 days ago", "5h ago"
  const m = lower.match(/(\d+)\s*(min|hour|hr|day|week|month|year)s?/) || lower.match(/(\d+)\s*(m|h|d|w|mo|y)\b/)
  if (m) {
    const amount = parseInt(m[1], 10)
    const unit = m[2]
    switch (unit[0]) {
      case 'm': // minutes or months (ambiguous) - treat as minutes when short form
        if (unit === 'mo') {
          return new Date(now.getTime() - amount * 30 * 24 * 60 * 60 * 1000)
        }
        return new Date(now.getTime() - amount * 60 * 1000)
      case 'h':
        return new Date(now.getTime() - amount * 60 * 60 * 1000)
      case 'd':
        return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000)
      case 'w':
        return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000)
      case 'y':
        return new Date(now.getTime() - amount * 365 * 24 * 60 * 60 * 1000)
    }
  }

  // fallback
  return new Date()
}

function parseSalary(s: string): { min: number | null; max: number | null; text: string | null; currency: string | null } {
  if (!s) return { min: null, max: null, text: null, currency: null }
  const text = s.replace(/–/g, '-').trim()
  // examples: "$80k - $120k", "€40k – €60k", "£60k"
  const m = text.match(/([£$€₹])?\s*([\d,.]+)\s*(k|m)?\s*(?:-|to)\s*([£$€₹])?\s*([\d,.]+)\s*(k|m)?/i)
  if (m) {
    const [, cur1, minStr, minUnit, cur2, maxStr, maxUnit] = m
    const currency = (cur1 || cur2) ? (cur1 || cur2) : null
    const parseAmount = (numStr: string, unit: string | undefined) => {
      let n = parseFloat(numStr.replace(/,/g, ''))
      if (!unit) return Math.round(n)
      if (unit.toLowerCase() === 'k') return Math.round(n * 1000)
      if (unit.toLowerCase() === 'm') return Math.round(n * 1000000)
      return Math.round(n)
    }
    const min = parseAmount(minStr, minUnit)
    const max = parseAmount(maxStr, maxUnit)
    let currencyCode: string | null = null
    if (currency === '$') currencyCode = 'USD'
    else if (currency === '£') currencyCode = 'GBP'
    else if (currency === '€') currencyCode = 'EUR'
    else if (currency === '₹') currencyCode = 'INR'
    return { min, max, text, currency: currencyCode }
  }

  // single value like "$80k"
  const m2 = text.match(/([£$€₹])?\s*([\d,.]+)\s*(k|m)?/i)
  if (m2) {
    const [, cur, val, unit] = m2
    const parseSingle = (numStr: string, unitStr: string | undefined) => {
      let n = parseFloat(numStr.replace(/,/g, ''))
      if (!unitStr) return Math.round(n)
      if (unitStr.toLowerCase() === 'k') return Math.round(n * 1000)
      if (unitStr.toLowerCase() === 'm') return Math.round(n * 1000000)
      return Math.round(n)
    }
    const amt = parseSingle(val, unit)
    let currencyCode: string | null = null
    if (cur === '$') currencyCode = 'USD'
    else if (cur === '£') currencyCode = 'GBP'
    else if (cur === '€') currencyCode = 'EUR'
    else if (cur === '₹') currencyCode = 'INR'
    return { min: amt, max: amt, text, currency: currencyCode }
  }

  return { min: null, max: null, text, currency: null }
}

export const wellfoundScraper: Scraper = {
  name: 'Wellfound (AngelList)',
  url: 'https://wellfound.com/location/europe',
  usePlaywright: true, // Use Playwright to handle JS rendering + infinite scroll

  async parse(html: string) {
    // Parse the rendered HTML using Cheerio
    const $ = load(html)
    const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

    // Extract job cards from the page
    // Wellfound job listings are typically in clickable job card divs or links
    const jobCards = $('a[href*="/jobs/"], [data-testid*="job"], [class*="job-card"]')
    
    console.log(`[Wellfound] Found ${jobCards.length} potential job elements in rendered HTML`)

    jobCards.each((index, element) => {
      try {
        const $el = $(element)
        
        // Extract job link
        let jobLink = $el.attr('href') || $el.find('a').attr('href') || ''
        if (jobLink && !jobLink.startsWith('http')) {
          jobLink = `https://wellfound.com${jobLink}`
        }
        if (!jobLink || !jobLink.includes('/jobs/')) return // Skip non-job links

        // Extract job title (primary text content in the card)
        let jobTitle = normalizeText($el.text()?.split('\n')[0] || '')
        if (!jobTitle) {
          jobTitle = normalizeText($el.find('h2, h3, [class*="title"]').text() || '')
        }
        if (!jobTitle) return

        // Extract company name 
        let companyName = normalizeText($el.find('[class*="company"]').text() || '')
        if (!companyName) {
          // Try to find it from sibling elements or parent container
          const parent = $el.parent()
          companyName = normalizeText(parent.find('[class*="company"]').text() || '')
        }
        if (!companyName) {
          companyName = 'Unknown'
        }

        // Extract location
        const locationText = normalizeText($el.find('[class*="location"], [data-testid*="location"]').text() || '')
        const location = locationText || null

        // Determine work mode from location text
        const workMode = (locationText || '').toLowerCase().includes('remote') ? 'remote' : 'hybrid'

        // Extract compensation (salary + equity)
        const compensationText = normalizeText($el.find('[class*="compensation"], [class*="salary"]').text() || '')
        const salaryParsed = parseSalary(compensationText || '')

        // Extract posting date (usually shows relative date)
        const dateText = normalizeText($el.find('time, [class*="posted"]').text() || '')
        const postingDate = parseRelativeDate(dateText)

        // Extract equity info if present
        const equityText = normalizeText($el.find('[class*="equity"]').text() || '')
        const offersEquity = !!equityText

        // Build role data
        const role: TrackerRoleData = {
          company_name: companyName,
          role_title: jobTitle,
          company_description: null,
          company_domain: null,
          industry: null,
          funding_stage: null,
          location,
          role_level: extractRoleLevel(jobTitle),
          role_type: 'Full-time',
          work_mode,
          compensation_text: compensationText || null,
          salary_min: salaryParsed.min,
          salary_max: salaryParsed.max,
          salary_currency: salaryParsed.currency,
          offers_equity: offersEquity,
          role_description: null,
          posting_date,
          closing_date: null,
        }

        // Extract source ID from job link
        const idMatch = jobLink.match(/jobs\/(\d+)/)
        const sourceId = idMatch ? idMatch[1] : jobLink

        const source: TrackerRoleSourceData = {
          source: 'Wellfound',
          source_role_id: String(sourceId),
          source_url: 'https://wellfound.com/location/europe',
          application_url: jobLink,
          raw_payload: { locationText, equityText, compensationText },
        }

        // Validate and add to results
        if (isValidJob(role.role_title, role.company_name, source.application_url)) {
          results.push({ role, source })
        }
      } catch (err) {
        // Skip malformed cards
      }
    })

    console.log(`[Wellfound] ✓ Extracted ${results.length} valid job listings`)
    return results
  },
}
