/**
 * Detect "parent-ATS leak" jobs on aggregator boards (mainly Getro VC boards).
 *
 * Problem: a portfolio company's careers feed sometimes points at a *parent
 * company's* enterprise ATS account. Getro then groups the parent's entire job
 * catalogue under the portfolio company's name. Example: Sentient Energy (a Koch
 * portfolio company) ends up labelled on jobs whose apply URL is
 * `koch.avature.net/...` — those are Koch Industries roles, not Sentient Energy.
 *
 * Signal: the ATS *tenant* (the account identifier in the apply URL) should
 * relate to the company name. `koch.avature.net` under "Sentient Energy" is a
 * clear mismatch; `stord.wd503.myworkdayjobs.com` under "Stord" is not.
 *
 * Only enterprise ATSes that big employers use are checked — Greenhouse / Lever /
 * Ashby are startup-native (tenant == company almost always) and excluded to
 * avoid false positives on their occasional non-tenant path segments.
 */

/** Lower-cased alphanumeric form of a name, for loose comparison. */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Pull the ATS tenant/account id out of an apply URL, or null if the host isn't
 * a recognised enterprise ATS. Subdomain-based for Workday/Avature/Taleo/iCIMS/
 * SuccessFactors; first path segment for SmartRecruiters.
 */
export function extractAtsTenant(url: string): string | null {
  let host: string
  let path: string
  try {
    const u = new URL(url)
    host = u.hostname.toLowerCase()
    path = u.pathname
  } catch {
    return null
  }
  const sub = host.split('.')

  // Subdomain-based enterprise ATSes: {tenant}.<ats-domain>
  if (host.endsWith('.avature.net')) return sub[0]
  if (host.includes('myworkdayjobs.com')) return sub[0] // tenant.wdN.myworkdayjobs.com
  if (host.endsWith('.taleo.net')) return sub[0]
  if (host.endsWith('.icims.com')) return sub[0].replace(/^careers-?/, '')
  if (host.endsWith('.successfactors.com') || host.endsWith('.successfactors.eu')) return sub[0]

  // Path-based: jobs.smartrecruiters.com/{tenant}/...
  if (host.includes('smartrecruiters.com')) {
    const seg = path.split('/').filter(Boolean)
    return seg[0] || null
  }

  return null
}

/** Loose match: tenant and company relate if either contains the other. */
function tenantRelatesToCompany(tenant: string, companySlug: string): boolean {
  const t = slugify(tenant)
  // Too short to judge confidently — treat as related so we never drop on noise.
  if (t.length < 3 || companySlug.length < 3) return true
  return (
    t === companySlug ||
    (t.length >= 4 && companySlug.includes(t)) ||
    (companySlug.length >= 4 && t.includes(companySlug))
  )
}

/**
 * True when an apply URL is an enterprise-ATS account whose tenant clearly
 * doesn't match the company it's attributed to — i.e. a parent-ATS leak that
 * should be dropped. Company-hosted URLs and matching-tenant ATSes return false.
 */
export function isAtsLeak(companyName: string, applyUrl: string): boolean {
  const tenant = extractAtsTenant(applyUrl)
  if (!tenant) return false
  return !tenantRelatesToCompany(tenant, slugify(companyName))
}
