/**
 * Export all scrapers
 */

import { ycScraper } from './yc-scraper'

// Array of all active scrapers
export const scrapers = [
  ycScraper,
]

// Re-export everything
export { ycScraper } from './yc-scraper'
export { runScraper, fetchHTML, normalizeText, extractRoleLevel, isValidJob } from './utils'
export type { Scraper, TrackerRoleData, TrackerRoleSourceData, TrackerScraperResult } from './types'
