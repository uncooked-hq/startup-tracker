/**
 * Export all scrapers
 */

import { ycScraper } from './scrapers/yc-scraper'
import { a16zScraperAPI } from './scrapers/a16z-scraper-api'
import { startupJobsScraper } from './scrapers/startupjobs-scraper'
import { workAtAStartupScraper } from './scrapers/workatastartup-scraper'
import { brightNetworkScraper } from './scrapers/brightnetwork-scraper'
import { welcomeToTheJungleScraper } from './scrapers/welcometothejungle-scraper'
import { seedcampScraper } from './scrapers/seedcamp-scraper'
import { hardwareFyiScraper } from './scrapers/hardwarefyi-scraper'

// Array of all active scrapers
export const scrapers = [
  ycScraper,
  a16zScraperAPI,
  startupJobsScraper,
  workAtAStartupScraper,
  brightNetworkScraper,
  welcomeToTheJungleScraper,
  seedcampScraper,
  hardwareFyiScraper,
]

// Re-export everything
export { ycScraper } from './scrapers/yc-scraper'
export { a16zScraperAPI } from './scrapers/a16z-scraper-api'
export { startupJobsScraper } from './scrapers/startupjobs-scraper'
export { workAtAStartupScraper } from './scrapers/workatastartup-scraper'
export { brightNetworkScraper } from './scrapers/brightnetwork-scraper'
export { welcomeToTheJungleScraper } from './scrapers/welcometothejungle-scraper'
export { seedcampScraper } from './scrapers/seedcamp-scraper'
export { hardwareFyiScraper } from './scrapers/hardwarefyi-scraper'
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
