/**
 * Enriches scraped jobs with full role descriptions via Jina Reader.
 *
 * - Skips jobs whose application_link already has a description in the DB
 * - Limits Jina concurrency to avoid rate-limiting (free tier ~3 parallel)
 * - Mutates JobData in place by setting role_description
 */

import { getSupabase } from './supabase'
import type { JobData } from './types'

const JINA_CONCURRENCY = 3
const JINA_TIMEOUT_MS = 25000

function createSemaphore(max: number) {
  let active = 0
  const queue: Array<() => void> = []
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>(r => queue.push(r))
    active++
    try { return await fn() }
    finally {
      active--
      const next = queue.shift()
      if (next) next()
    }
  }
}

const jinaSem = createSemaphore(JINA_CONCURRENCY)

export async function fetchDescription(url: string): Promise<string | null> {
  return jinaSem(async () => {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), JINA_TIMEOUT_MS)
      const res = await fetch(`https://r.jina.ai/${url}`, {
        headers: { Accept: 'text/plain' },
        signal: controller.signal,
      })
      if (!res.ok) return null
      const text = await res.text()

      const contentStart = text.indexOf('Markdown Content:')
      const content = contentStart > 0 ? text.slice(contentStart + 17) : text

      const cleaned = content
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
        .replace(/#{1,6}\s*/g, '')
        .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      if (cleaned.length < 200 ||
          cleaned.includes("can't find that page") ||
          cleaned.includes('404 error') ||
          cleaned.includes("couldn't find anything")) {
        return null
      }

      return cleaned.slice(0, 5000)
    } catch {
      return null
    }
  })
}

/**
 * Detect job postings that have been closed/filled/expired on the source side
 * even though the URL still resolves. These jobs should be dropped from the
 * upsert path so the stale-deactivation logic can take them out of the tracker.
 */
const EXPIRED_PATTERNS: RegExp[] = [
  // Banner / sentence forms
  /\bthis\s+(job|position|role|opportunity|opening|posting)\s+(has\s+)?(expired|closed|ended|been\s+filled|been\s+removed|is\s+(no\s+longer|not)\s+(available|accepting)|no\s+longer\s+exists)/i,
  /\b(no\s+longer|not)\s+accepting\s+applications\b/i,
  /\bapplication(s)?\s+(are\s+)?(now\s+)?closed\b/i,
  /\bapplication\s+deadline\s+(has\s+)?passed\b/i,
  /\b(position|role|job|opening)\s+(has\s+been\s+)?filled\b/i,
  /\bwe\s+are\s+no\s+longer\s+hiring\b/i,
  /\bjob\s+posting\s+(has\s+)?expired\b/i,
  /\bthis\s+opportunity\s+is\s+no\s+longer\s+available\b/i,
  /\b(job|position|listing)\s+not\s+found\b/i,
  /\bposting\s+(has\s+)?been\s+(removed|closed|taken\s+down)\b/i,
  /\bthis\s+page\s+no\s+longer\s+exists\b/i,

  // Button-label forms (short standalone phrases)
  /\b(applications?\s+closed|position\s+closed|role\s+closed|job\s+closed)\b/i,
  /\bthis\s+(position|role|job)\s+is\s+no\s+longer\s+accepting\b/i,
  /\bclosed\s+to\s+(new\s+)?applications\b/i,
]

export function isExpiredPage(desc: string): boolean {
  // Scan the whole description (capped at 5KB upstream) — expired notices may
  // appear anywhere, including as buttons near the bottom of the page.
  return EXPIRED_PATTERNS.some(p => p.test(desc))
}

/**
 * Pull confirmed backer names out of a job description.
 *
 * Looks for intro phrases like "funded by", "backed by", "investors include",
 * "led by", "raised from" — then walks the following clause as a name list.
 * Best-effort: filters to capitalized tokens to drop boilerplate ("our team",
 * "this round"), caps at 8 names, truncates at sentence boundaries.
 *
 * Returns an empty array on no match — the caller treats that as "unknown".
 */
const BACKER_INTRO = /\b(?:funded\s+by|backed\s+by|investors?\s+include|led\s+by|raised\s+from)\s+/i

export function extractBackers(desc: string): string[] {
  const m = desc.match(BACKER_INTRO)
  if (!m || m.index === undefined) return []

  // Walk up to 200 chars after the intro; truncate at next sentence break.
  const tail = desc.slice(m.index + m[0].length, m.index + m[0].length + 200)
  const window = tail.split(/[.!?\n;:]/)[0]

  const candidates = window.split(/\s*(?:,|&|\sand\s)\s*/i)

  const cleaned = candidates
    .map(s => s.trim().replace(/^[.,;!?()]+|[.,;!?()]+$/g, ''))
    .filter(s => s.length >= 2 && s.length <= 50)
    .filter(s => /^[A-Z]/.test(s))             // proper-noun start
    .filter(s => /[A-Z][a-z]/.test(s))          // not an all-caps acronym blurb
    .filter(s => !/^(This|The|That|These|Those|Our|We|They|It|Us|Your|Some|Other|Several|Many)\b/.test(s))
    .slice(0, 8)

  // De-dupe while preserving order
  return Array.from(new Set(cleaned))
}

/**
 * Extract sponsorship and funding info from a job description.
 */
function extractMetadata(desc: string): { sponsorship: boolean | null; funding: string | null } {
  const lower = desc.toLowerCase()

  // Sponsorship detection
  let sponsorship: boolean | null = null
  const sponsorshipPositive = /\b(visa\s+sponsor|sponsor\s+visa|sponsorship\s+(?:available|provided|offered|possible)|we\s+(?:sponsor|offer\s+sponsorship|provide\s+sponsorship)|will\s+sponsor|immigration\s+sponsor|work\s+(?:permit|authorization)\s+(?:sponsor|assist|support))/i
  const sponsorshipNegative = /\b(no\s+(?:visa\s+)?sponsor|not\s+(?:able\s+to\s+)?sponsor|cannot\s+sponsor|unable\s+to\s+sponsor|won't\s+sponsor|will\s+not\s+sponsor|must\s+(?:already\s+)?(?:have|be)\s+(?:the\s+right|authorization|authorized|eligible)|without\s+(?:requiring\s+)?sponsor)/i

  if (sponsorshipNegative.test(desc)) {
    sponsorship = false
  } else if (sponsorshipPositive.test(desc)) {
    sponsorship = true
  }

  // Funding detection — look for Series A/B/C/D, Seed, Pre-seed, raised $X
  let funding: string | null = null
  const fundingPatterns = [
    /\b(series\s+[a-f])\b/i,
    /\b(pre-?seed|seed\s+(?:round|stage|funded))\b/i,
    /\b(raised\s+\$[\d,.]+\s*[mb](?:illion)?)/i,
    /\b(\$[\d,.]+\s*[mb](?:illion)?\s+(?:in\s+)?(?:funding|raised|series))/i,
    /\b(funded\s+by\s+[A-Z][\w\s,&]+)/i,
  ]
  for (const pattern of fundingPatterns) {
    const match = desc.match(pattern)
    if (match) {
      funding = match[1].trim()
      // Capitalize nicely
      if (/series/i.test(funding)) {
        funding = funding.replace(/series\s+([a-f])/i, (_, l) => `Series ${l.toUpperCase()}`)
      }
      break
    }
  }

  return { sponsorship, funding }
}

/**
 * Enriches a batch of jobs with role descriptions, skipping any that already
 * have one cached in tracker_role_sources.
 */
export async function enrichDescriptions(jobs: JobData[]): Promise<{ fetched: number; skipped: number; failed: number; expired: number }> {
  if (jobs.length === 0) return { fetched: 0, skipped: 0, failed: 0, expired: 0 }

  const supabase = getSupabase()

  // Bulk-check which application_links already have descriptions on their tracker_roles
  const links = jobs.map(j => j.application_link)
  const { data: existing } = await supabase
    .from('tracker_role_sources')
    .select('application_url, tracker_roles!inner(role_description)')
    .in('application_url', links)

  const haveDesc = new Set<string>()
  for (const row of existing || []) {
    const desc = (row as any).tracker_roles?.role_description
    if (desc && desc.length > 100) haveDesc.add((row as any).application_url)
  }

  let fetched = 0
  let failed = 0
  let skipped = 0
  let expired = 0

  await Promise.all(jobs.map(async job => {
    if (haveDesc.has(job.application_link)) {
      skipped++
      return
    }
    const desc = await fetchDescription(job.application_link)
    if (desc) {
      // Source page says the job is closed/filled/expired even though the URL
      // still resolves. Mark inactive so the caller can skip the upsert.
      if (isExpiredPage(desc)) {
        job.is_active = false
        expired++
        return
      }
      job.role_description = desc
      // Extract sponsorship and funding info from description
      const { sponsorship, funding } = extractMetadata(desc)
      if (sponsorship != null) job.offers_sponsorship = sponsorship
      // Don't overwrite funding_details if the scraper already set a richer value
      // (e.g. "$30B Series G · Founded 2021" from AI labs or TopStartups)
      if (funding && !job.funding_details) job.funding_details = funding
      // Merge any "funded by X" backers from the description with whatever the
      // scraper already declared (e.g. VC portfolio scrapers set the fund itself).
      const extracted = extractBackers(desc)
      if (extracted.length > 0) {
        job.backers = Array.from(new Set([...(job.backers ?? []), ...extracted]))
      }
      fetched++
    } else {
      failed++
    }
  }))

  return { fetched, skipped, failed, expired }
}
