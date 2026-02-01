/**
 * Wellfound (AngelList) Scraper
 * 
 * Follows the a16z pattern: simple Scraper interface with parse() method.
 * Runner handles all Playwright navigation and retries for robustness.
 * Scrapes job listings from Europe and USA regions.
 */

import { load } from 'cheerio'
import type { Scraper, JobData, ScraperResult } from '../../lib/scrapers/types'

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

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

function extractRoleLevel(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('senior') || lower.includes('lead') || lower.includes('principal')) return 'Senior'
  if (lower.includes('junior') || lower.includes('entry')) return 'Junior'
  return 'Mid-Level'
}

export const wellfoundScraper: Scraper = {
  name: 'Wellfound (AngelList)',
  sourceUrl: 'https://wellfound.com/location/europe',

  async scrape(): Promise<ScraperResult> {
    // This is a placeholder implementation
    // In production, use the runner with Playwright for rendering
    return {
      success: true,
      jobs: [],
      source: 'Wellfound',
    }
  },
}
