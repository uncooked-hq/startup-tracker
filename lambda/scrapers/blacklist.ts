/**
 * Companies excluded from the tracker — primarily PMCs and major defense
 * primes. Match is case-insensitive substring on company_name.
 *
 * Mirrors lib/company-blacklist.ts (Next.js side). Kept in sync manually
 * because lambda has its own tsconfig rootDir and can't import from ../../lib.
 */
export const COMPANY_BLACKLIST = [
  // US primes
  'lockheed',
  'raytheon',
  'northrop grumman',
  'general dynamics',
  'l3harris',
  'boeing defense',
  // UK / EU primes
  'bae systems',
  'leonardo s.p.a',
  'leonardo drs',
  'thales',
  'rheinmetall',
  'saab',
] as const

export function isBlacklistedCompany(companyName: string | null | undefined): boolean {
  if (!companyName) return false
  const name = companyName.toLowerCase()
  return COMPANY_BLACKLIST.some(p => name.includes(p))
}
