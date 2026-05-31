/**
 * Known accelerators and VC funds that scrape into `funding_stage`.
 * Shared by the tracker FilterBar dropdown and the JobModal "backed by" tag.
 *
 * Keep in sync with the GenericVCScraper entries in lambda/scrapers/index.ts.
 */

export const ACCELERATORS = ['Antler', 'Earlybird', 'Seedcamp', 'YC'] as const

export const FUNDS = [
  'Accel',
  'Atomico',
  'Balderton',
  'Bessemer',
  'CapitalG',
  'GV',
  'Greylock',
  'Initialized',
  'Khosla',
  'Kleiner Perkins',
  'Lerer Hippeau',
  'Lightspeed',
  'NEA',
  'Sequoia',
] as const

export const ALL_BACKERS: readonly string[] = [...ACCELERATORS, ...FUNDS]
  .slice()
  .sort()

/**
 * True when `funding_stage` looks like a backer name rather than a funding
 * stage / round descriptor (e.g. "Series A", "$30B Series G · Founded 2021").
 * Matches both bare names and prefix forms ("Sequoia" / "Sequoia Capital").
 */
export function isKnownBacker(value: string | null | undefined): boolean {
  if (!value) return false
  const v = value.trim()
  return ALL_BACKERS.some(b => v === b || v.startsWith(b + ' '))
}
