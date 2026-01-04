/**
 * Export all scrapers
 */

import { ycScraper } from './scrapers/yc-scraper'
import { a16zScraperAPI } from './scrapers/a16z-scraper-api'
import { startupJobsScraper } from './scrapers/startupjobs-scraper'
import { workAtAStartupScraper } from './scrapers/workatastartup-scraper'

// Array of all active scrapers
export const scrapers = [
  ycScraper,
  a16zScraperAPI,
  startupJobsScraper,
  workAtAStartupScraper,
]

// Re-export everything
export { ycScraper } from './scrapers/yc-scraper'
export { a16zScraperAPI } from './scrapers/a16z-scraper-api'
export { startupJobsScraper } from './scrapers/startupjobs-scraper'
export { workAtAStartupScraper } from './scrapers/workatastartup-scraper'
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
