import type { Scraper } from './types'
import { YCSimpleScraper } from './yc-simple'
import { WorkAtAStartupScraper } from './workatastartup'
import { WellfoundScraper } from './wellfound'
import { StartupJobsScraper } from './startup-jobs'
import { GenericVCScraper } from './generic-vc-scraper'

export const scrapers: Scraper[] = [
  // Aggregators
  new YCSimpleScraper(),
  new WorkAtAStartupScraper(),
  new WellfoundScraper(),
  new StartupJobsScraper(),
  new GenericVCScraper('Work In Startups', 'https://workinstartups.com', null),
  new GenericVCScraper('EU-Startups', 'https://www.eu-startups.com/startup-jobs', null),
  new GenericVCScraper('The Hub', 'https://thehub.io', null),
  new GenericVCScraper('Welcome to the Jungle UK', 'https://uk.welcometothejungle.com', null),
  new GenericVCScraper('Built In', 'https://builtin.com', null),
  new GenericVCScraper('Startupers', 'https://www.startupers.com', null),
  new GenericVCScraper('European Startup Jobs', 'https://defiant.vc/european-startup-jobs', null),
  
  // VC Portfolio Job Boards
  new GenericVCScraper('Antler', 'https://careers.antler.co/jobs', 'Antler'),
  new GenericVCScraper('a16z', 'https://portfoliojobs.a16z.com', 'a16z'),
  new GenericVCScraper('Index Ventures', 'https://www.indexventures.com/startup-jobs', 'Index Ventures'),
  new GenericVCScraper('Seedcamp', 'https://talent.seedcamp.com/jobs', 'Seedcamp'),
  new GenericVCScraper('Accel', 'https://jobs.accel.com/', 'Accel'),
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
  new GenericVCScraper('Earlybird', 'https://jobs.earlybird.com/', 'Earlybird'),
]

