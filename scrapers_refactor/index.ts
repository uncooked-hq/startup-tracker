/**
 * Export all scrapers
 */

import { ycScraper } from './scrapers/yc-scraper'
import { a16zScraperAPI } from './scrapers/a16z-scraper-api'

// Array of all active scrapers
export const scrapers = [
  ycScraper,
  a16zScraperAPI, // Using API instead of Playwright
]

// Re-export everything
export { ycScraper } from './scrapers/yc-scraper'
export { a16zScraperAPI } from './scrapers/a16z-scraper-api'
export { 
  runScraper, 
  runScraperSmart, 
  fetchHTML, 
  normalizeText, 
  extractRoleLevel, 
  isValidJob 
} from './utils/helpers'
export type { 
  Scraper, 
  ScraperOptions,
  PlaywrightOptions,
  TrackerRoleData, 
  TrackerRoleSourceData, 
  TrackerScraperResult 
} from './types'
