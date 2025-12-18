/**
 * Export all scrapers
 */

import { ycScraper } from './yc-scraper'
import { a16zScraper } from './a16z-scraper'

// Array of all active scrapers
export const scrapers = [
  ycScraper,
  a16zScraper,
]

// Re-export everything
export { ycScraper } from './yc-scraper'
export { a16zScraper } from './a16z-scraper'
export { 
  runScraper, 
  runScraperSmart, 
  fetchHTML, 
  normalizeText, 
  extractRoleLevel, 
  isValidJob 
} from './utils'
export type { 
  Scraper, 
  ScraperOptions,
  PlaywrightOptions,
  TrackerRoleData, 
  TrackerRoleSourceData, 
  TrackerScraperResult 
} from './types'
