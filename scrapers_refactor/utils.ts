/**
 * Utility functions
 */

import type { Scraper, TrackerScraperResult } from './types'

/**
 * Fetch HTML from a URL
 */
export async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.text()
}

/**
 * Run a scraper (fetch + parse)
 * This is for traditional HTTP + Cheerio scrapers only.
 * Use runScraperSmart() to automatically handle both types.
 */
export async function runScraper(scraper: Scraper): Promise<TrackerScraperResult> {
  try {
    const url = typeof scraper.url === 'function' ? scraper.url(scraper.options) : scraper.url
    console.log(`[${scraper.name}] Fetching ${url}`)
    
    const html = await fetchHTML(url)
    const roles = await scraper.parse(html)
    
    console.log(`[${scraper.name}] ✓ Extracted ${roles.length} roles`)
    
    return {
      success: true,
      roles,
      source: scraper.name,
    }
  } catch (error) {
    console.error(`[${scraper.name}] ✗ Error:`, error)
    return {
      success: false,
      roles: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      source: scraper.name,
    }
  }
}

/**
 * Smart runner that automatically detects if scraper needs Playwright
 */
export async function runScraperSmart(scraper: Scraper): Promise<TrackerScraperResult> {
  if (scraper.usePlaywright) {
    // Dynamically import Playwright utilities (only when needed)
    const { runPlaywrightScraper } = await import('./playwright-utils')
    return runPlaywrightScraper(scraper)
  } else {
    return runScraper(scraper)
  }
}

/**
 * Normalize text (trim + collapse whitespace)
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Extract role level from title
 */
export function extractRoleLevel(title: string): string {
  const lower = title.toLowerCase()
  if (lower.match(/\b(senior|sr|lead|principal|staff)\b/)) return 'Senior'
  if (lower.match(/\b(junior|jr|entry|intern)\b/)) return 'Entry'
  return 'Mid'
}

/**
 * Validate job data
 */
export function isValidJob(title: string, company: string, link: string): boolean {
  if (!title || !company || !link) return false
  if (title.length < 10 || title.length > 200) return false
  if (!link.startsWith('http')) return false
  if (company.length < 2) return false
  return true
}

