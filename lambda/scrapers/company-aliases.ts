/**
 * Canonical company-name aliases — collapse different labels for the same
 * company into one listing.
 *
 * e.g. a VC portfolio board lists the legal entity ("Anysphere") while the
 * company's own ATS uses the product brand ("Cursor"); storing the brand means
 * the two sources merge into a single company instead of showing twice.
 *
 * Keyed by lower-cased source name → canonical display name.
 */
const ALIASES: Record<string, string> = {
  anysphere: 'Cursor',
}

export function canonicalCompanyName(name: string): string {
  if (!name) return name
  return ALIASES[name.trim().toLowerCase()] ?? name
}
