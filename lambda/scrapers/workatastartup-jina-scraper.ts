/**
 * Work at a Startup Scraper (Jina-based)
 *
 * Uses Jina Reader to bypass SPA rendering and scrape YC job listings.
 * Replaces the Puppeteer version that returned 0 jobs.
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const WAAS_URL = 'https://www.workatastartup.com'

const CATEGORY_URLS = [
  'https://www.workatastartup.com/jobs?role=eng',
  'https://www.workatastartup.com/jobs?role=design',
  'https://www.workatastartup.com/jobs?role=product',
  'https://www.workatastartup.com/jobs?role=sales',
  'https://www.workatastartup.com/jobs?role=marketing',
  'https://www.workatastartup.com/jobs?role=ops',
]

async function fetchViaJina(url: string): Promise<string> {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 20000)
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: 'text/plain' },
    signal: controller.signal,
  })
  if (!res.ok) throw new Error(`Jina ${res.status}`)
  return res.text()
}

const ROLE_FROM_CATEGORY: Record<string, string> = {
  eng: 'Engineer',
  design: 'Designer',
  product: 'Product Manager',
  sales: 'Sales',
  marketing: 'Marketing',
  ops: 'Operations',
}

function parseJobsFromMarkdown(markdown: string, seenKeys: Set<string>, categoryRole: string): JobData[] {
  const jobs: JobData[] = []

  // Strategy: find each job meta line (starts with fulltime/parttime/contract/intern)
  // then look backward for the most recent company name + URL.
  //
  // First extract all company links with their positions
  const companyLinks: Array<{ name: string; url: string; pos: number }> = []
  const linkPattern = /\[!\[Image \d+: ([^\]]+)\]\([^)]+\)\]\((https:\/\/www\.workatastartup\.com\/companies\/[^)]+)\)/g
  let linkMatch
  while ((linkMatch = linkPattern.exec(markdown)) !== null) {
    companyLinks.push({
      name: linkMatch[1].trim(),
      url: linkMatch[2],
      pos: linkMatch.index,
    })
  }

  // Now find each meta line and match to the closest preceding company link
  const metaPattern = /^(fulltime|parttime|contract|internship|intern)\s+([^\n]+)/gm
  let metaMatch
  const blockMatches: Array<{ company: string; companyUrl: string; meta: string }> = []
  while ((metaMatch = metaPattern.exec(markdown)) !== null) {
    const metaLine = metaMatch[0]
    const metaPos = metaMatch.index

    // Find the closest company link before this position
    let closestLink = null
    for (const link of companyLinks) {
      if (link.pos < metaPos) {
        if (!closestLink || link.pos > closestLink.pos) {
          closestLink = link
        }
      }
    }
    if (!closestLink) continue

    // Make sure there isn't another meta line between the link and this one
    // (to avoid pairing the wrong link)
    const between = markdown.slice(closestLink.pos, metaPos)
    if ((between.match(/^(fulltime|parttime|contract|internship|intern)\s/gm) || []).length > 0) continue

    blockMatches.push({
      company: closestLink.name,
      companyUrl: closestLink.url,
      meta: metaLine,
    })
  }


  // Known YC role categories — ordered longest-first
  const ROLE_CATEGORIES = [
    // Engineering
    'Engineering manager',
    'Machine learning', 'Machine Learning',
    'Data engineer', 'Data scientist', 'Data science', 'Data analyst', 'Data',
    'Site reliability', 'SRE',
    'DevOps engineer', 'DevOps',
    'Full stack', 'Full-stack', 'Full-Stack',
    'Backend', 'Frontend', 'Front end', 'Front-end',
    'iOS', 'Android', 'Mobile',
    'Infrastructure', 'Platform',
    'QA engineer', 'Security', 'QA', 'Electrical engineer', 'Electrical', 'Mechanical engineer', 'Mechanical', 'Embedded engineer', 'Embedded',
    'Hardware', 'Firmware', 'Robotics', 'Optics', 'Quantum',
    'AI/ML', 'ML', 'AI',
    // Product & design
    'Product manager', 'Product designer', 'Product design',
    'UX designer', 'UI designer', 'UX design', 'UI design', 'UI / UX', 'UI/UX',
    'Web design', 'Graphic design',
    'Designer', 'Design',
    'Animation', 'Illustration',
    // Business
    'Business development', 'BD',
    'Growth', 'Sales', 'Marketing', 'Operations', 'Recruiter', 'Recruiting',
    'Customer success', 'Customer support', 'Support',
    'Finance', 'Accounting', 'Legal', 'HR',
    'Founder', 'Chief of staff', 'General',
    // Generic fallback
    'Engineer', 'Developer',
  ]

  for (const block of blockMatches) {
    const company = block.company
    const companyUrl = block.companyUrl
    const meta = block.meta.trim()

    // Parse role type (fulltime/parttime/contract/internship)
    let roleType = 'Full-time'
    let rest = meta
    const typeMatch = meta.match(/^(fulltime|parttime|contract|internship|intern)\s*/i)
    if (typeMatch) {
      const t = typeMatch[1].toLowerCase()
      if (t === 'fulltime') roleType = 'Full-time'
      else if (t === 'parttime') roleType = 'Part-time'
      else if (t === 'contract') roleType = 'Contract'
      else if (t === 'internship' || t === 'intern') roleType = 'Internship'
      rest = meta.slice(typeMatch[0].length)
    }

    // Find the role category at the end of the meta line
    // Sort by length descending so "Engineering manager" matches before "Engineer"
    const sortedRoles = [...ROLE_CATEGORIES].sort((a, b) => b.length - a.length)
    let role = ''
    let location = rest.trim()
    const locLower = location.toLowerCase()

    for (const r of sortedRoles) {
      const rLower = r.toLowerCase()
      if (locLower.endsWith(rLower)) {
        role = r
        location = location.slice(0, location.length - r.length).trim()
        break
      }
    }

    if (!role) role = categoryRole
    if (!location) location = 'Not specified'

    // Detect work mode from RAW location (before we clean it)
    let workMode = 'Onsite'
    if (/remote/i.test(location)) workMode = 'Remote'
    else if (/hybrid/i.test(location)) workMode = 'Hybrid'

    // Clean up location — take first before " / " or "; " or "(" for multi-location listings
    location = location.split(' / ')[0].split(';')[0].split(' (')[0].trim()

    // If the "location" is just a country code (2 letters) it's leftover junk
    if (/^[A-Z]{2}$/.test(location) || /^[A-Z]{2}\s/.test(location)) {
      location = 'Not specified'
    }

    // Dedupe by company + role + location (since same company can have multiple roles in same location)
    const dedupeKey = `${company}|${role}|${location}`
    if (seenKeys.has(dedupeKey)) continue
    seenKeys.add(dedupeKey)

    const applicationUrl = companyUrl

    // Filter Israel
    if (/\bisrael\b|tel\s*aviv|jerusalem|haifa/i.test(location)) continue

    // Skip strict isValidJob check since YC role categories are short (e.g. "Backend")
    if (!company || company.length < 2 || !role || !applicationUrl) continue
    if (!applicationUrl.startsWith('http')) continue

    const { industry } = classifyIndustry(company, role, '')

    const roleLevel = (() => {
      const lower = role.toLowerCase()
      if (lower.match(/\b(senior|sr|lead|principal|staff)\b/)) return 'Senior'
      if (lower.match(/\b(junior|jr|entry|intern|graduate)\b/)) return 'Entry'
      return 'Mid'
    })()

    jobs.push({
      company_name: company,
      industry,
      location,
      funding_stage: 'YC',
      role_title: role,
      role_type: roleType,
      role_level: roleLevel,
      work_mode: workMode,
      compensation: 'Not specified',
      equity: null,
      posting_date: new Date(),
      closing_date: null,
      company_description: '',
      application_link: applicationUrl,
      source_website: WAAS_URL,
      is_active: true,
    })
  }

  return jobs
}

export class WorkAtAStartupJinaScraper extends BaseScraper {
  name = 'Work at a Startup'
  sourceUrl = WAAS_URL

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const allJobs: JobData[] = []
      const seenUrls = new Set<string>()

      for (const url of CATEGORY_URLS) {
        try {
          console.log(`[${this.name}] Fetching ${url} via Jina...`)
          const markdown = await fetchViaJina(url)
          // Extract the category from the URL (?role=X)
          const categoryMatch = url.match(/role=(\w+)/)
          const category = categoryMatch?.[1] || 'eng'
          const categoryRole = ROLE_FROM_CATEGORY[category] || 'Engineer'
          const jobs = parseJobsFromMarkdown(markdown, seenUrls, categoryRole)
          console.log(`[${this.name}]   Found ${jobs.length} new jobs`)
          allJobs.push(...jobs)
        } catch (error) {
          console.error(`[${this.name}] Error on ${url}:`, (error as Error).message)
        }
      }

      console.log(`[${this.name}] Total: ${allJobs.length} jobs`)
      return { success: true, jobs: allJobs, source: this.name }
    } catch (error) {
      return {
        success: false,
        jobs: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.name,
      }
    }
  }
}
