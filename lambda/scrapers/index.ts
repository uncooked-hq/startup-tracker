import type { Scraper } from './types'
import { GenericVCScraper } from './generic-vc-scraper'
// Shelved (kept in repo, not run): WelcomeToTheJungle, HardwareFYI.
// import { WelcomeToTheJungleScraper } from './welcometothejungle-scraper'
// import { HardwareFYIScraper } from './hardwarefyi-scraper'
import { SeedcampScraper } from './seedcamp-scraper'
import { YCScraper } from './yc-scraper'
import { WorkAtAStartupJinaScraper } from './workatastartup-jina-scraper'
import { StartupJobsJinaScraper } from './startupjobs-jina-scraper'
import { TopStartupsScraper } from './topstartups-scraper'
import { BuiltInScraper } from './builtin-scraper'
import { buildAllAILabScrapers } from './ai-labs'

export const scrapers: Scraper[] = [
  // Dedicated scrapers (no browser needed)
  // new WelcomeToTheJungleScraper(), // shelved
  new SeedcampScraper(),
  new YCScraper(),

  // Jina-based scrapers (bypass Cloudflare / render SPAs without browser)
  new WorkAtAStartupJinaScraper(),
  new StartupJobsJinaScraper(),

  // Cheerio-based scrapers (plain HTML)
  new TopStartupsScraper(),
  new BuiltInScraper(),
  // new HardwareFYIScraper(), // shelved

  // AI Labs (ATS APIs: Greenhouse / Ashby / Workable)
  ...buildAllAILabScrapers(),

  // VC Portfolio Job Boards (Puppeteer-based — crawls company subpages for full coverage)
  new GenericVCScraper('Antler', 'https://careers.antler.co/jobs', 'Antler'),
  new GenericVCScraper('Accel', 'https://jobs.accel.com/jobs', 'Accel'),
  new GenericVCScraper('Sequoia Capital', 'https://www.sequoiacap.com/jobs', 'Sequoia'),
  new GenericVCScraper('Bessemer', 'https://jobs.bvp.com/jobs', 'Bessemer'),
  new GenericVCScraper('NEA', 'https://careers.nea.com/jobs', 'NEA'),
  new GenericVCScraper('Greylock', 'https://jobs.greylock.com/jobs', 'Greylock'),
  new GenericVCScraper('Initialized Capital', 'https://jobs.initialized.com/jobs', 'Initialized'),
  new GenericVCScraper('Atomico', 'https://careers.atomico.com/jobs', 'Atomico'),
  new GenericVCScraper('Balderton', 'https://careers.balderton.com/', 'Balderton'),
  new GenericVCScraper('Lightspeed', 'https://jobs.lsvp.com/jobs', 'Lightspeed'),
  new GenericVCScraper('Khosla Ventures', 'https://jobs.khoslaventures.com/jobs', 'Khosla'),
  new GenericVCScraper('Kleiner Perkins', 'https://jobs.kleinerperkins.com/jobs', 'Kleiner Perkins'),
  new GenericVCScraper('CapitalG', 'https://careers.capitalg.com/jobs', 'CapitalG'),
  new GenericVCScraper('GV', 'https://jobs.gv.com/jobs', 'GV'),
  new GenericVCScraper('Lerer Hippeau', 'https://jobs.lererhippeau.com/jobs', 'Lerer Hippeau'),
  new GenericVCScraper('Earlybird', 'https://jobs.earlybird.com/jobs', 'Earlybird'),
]

export function getScraperByName(name: string): Scraper | undefined {
  return scrapers.find(s => s.name.toLowerCase() === name.toLowerCase())
}
