/**
 * Companies excluded from the tracker — primarily PMCs and major defense
 * primes. Match is case-insensitive substring on company_name, so adding
 * "Lockheed" also blocks "Lockheed Martin", "Lockheed Aeronautics", etc.
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
