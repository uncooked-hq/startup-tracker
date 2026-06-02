/**
 * AI Labs registry.
 *
 * Each entry defines which ATS the lab uses + its static company metadata
 * (founding year, last funding round). ATS APIs don't expose these fields
 * so they're hardcoded; update as new rounds close.
 *
 * Last verified: 2026-04-19
 */

import type { Scraper } from './types'
import { GreenhouseScraper } from './greenhouse-scraper'
import { AshbyScraper } from './ashby-scraper'
import { WorkableScraper } from './workable-scraper'

type AILabEntry = {
  type: 'greenhouse' | 'ashby' | 'workable'
  display: string
  slug: string
  foundedYear: number
  lastFunding: string
  // ISO date (YYYY-MM-DD) of when the last round closed. Used to compute
  // relative time like "2 months ago". Null for companies without a recent round
  // (e.g. acquired subsidiaries).
  lastFundingDate: string | null
}

export const AI_LABS: AILabEntry[] = [
  { type: 'greenhouse', display: 'Anthropic',       slug: 'anthropic',   foundedYear: 2021, lastFunding: '$30B Series G',      lastFundingDate: '2026-02-12' }, // @ $380B valuation
  { type: 'greenhouse', display: 'Google DeepMind', slug: 'deepmind',    foundedYear: 2010, lastFunding: 'Google subsidiary',  lastFundingDate: null },        // acquired 2014
  { type: 'greenhouse', display: 'xAI',             slug: 'xai',         foundedYear: 2023, lastFunding: '$20B Series E',      lastFundingDate: '2026-01-06' }, // @ $230B valuation
  { type: 'ashby',      display: 'OpenAI',          slug: 'openai',      foundedYear: 2015, lastFunding: '$122B',              lastFundingDate: '2026-03-31' }, // @ $852B valuation
  { type: 'ashby',      display: 'Cohere',          slug: 'cohere',      foundedYear: 2019, lastFunding: '$500M',              lastFundingDate: '2025-08-14' }, // @ $6.8B valuation
  { type: 'workable',   display: 'Hugging Face',    slug: 'huggingface', foundedYear: 2016, lastFunding: '$235M Series D',     lastFundingDate: '2023-08-24' }, // @ $4.5B valuation
]

// Extract the round name from a lastFunding string ("$30B Series G" → "Series G",
// "$122B" → null, "Google subsidiary" → null, "Pre-seed" → "Pre-Seed").
function extractRoundFromFunding(lastFunding: string): string | null {
  const m = lastFunding.match(/\b(pre-?seed|seed|series\s+([a-h])|ipo)\b/i)
  if (!m) return null
  const raw = m[1].toLowerCase()
  if (raw.startsWith('series')) return `Series ${m[2].toUpperCase()}`
  if (raw === 'pre-seed' || raw === 'preseed') return 'Pre-Seed'
  if (raw === 'seed') return 'Seed'
  if (raw === 'ipo') return 'IPO'
  return null
}

export function buildAILabScraper(entry: AILabEntry): Scraper {
  const meta = {
    foundedYear: entry.foundedYear,
    lastFunding: entry.lastFunding,
    lastFundingDate: entry.lastFundingDate,
    fundingRound: extractRoundFromFunding(entry.lastFunding),
  }
  const tag = 'AI Lab'
  if (entry.type === 'greenhouse') return new GreenhouseScraper(entry.display, entry.slug, tag, meta)
  if (entry.type === 'ashby') return new AshbyScraper(entry.display, entry.slug, tag, meta)
  return new WorkableScraper(entry.display, entry.slug, tag, meta)
}

export function buildAllAILabScrapers(): Scraper[] {
  return AI_LABS.map(buildAILabScraper)
}
