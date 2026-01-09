/**
 * Hardware FYI Job Board Scraper
 *
 * Scrapes https://jobs.hardwarefyi.com/
 * Built on Webflow with Finsweet CMS Load for dynamic content.
 * Requires Playwright to render JavaScript-loaded jobs.
 *
 * Focus: Hardware engineering jobs (Mechanical, Electrical, Firmware, etc.)
 */

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

// Add stealth plugin
chromium.use(StealthPlugin())

const HARDWAREFYI_URL = 'https://jobs.hardwarefyi.com/'

interface HardwareFyiJob {
  title: string
  company: string
  location: string
  experienceLevel: string
  department: string
  industry: string
  salary: string | null
  url: string
  logoUrl: string | null
  isFeatured: boolean
}

/**
 * Fetch jobs using Playwright
 */
async function fetchHardwareFyiJobs(): Promise<HardwareFyiJob[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  })

  const page = await context.newPage()

  try {
    console.log(`[Hardware FYI] Loading ${HARDWAREFYI_URL}...`)
    await page.goto(HARDWAREFYI_URL, { waitUntil: 'networkidle', timeout: 60000 })

    // Wait for Finsweet CMS Load to populate jobs
    // Look for job items to appear
    await page.waitForSelector('.job-item, .featured-job-item, [class*="job"]', { timeout: 15000 }).catch(() => {
      console.log('[Hardware FYI] Job selector not found, waiting longer...')
    })

    // Additional wait for all jobs to load (Finsweet loads all items)
    await page.waitForTimeout(3000)

    // Debug: log page structure
    const debugInfo = await page.evaluate(() => {
      // Get all links on the page
      const allLinks = Array.from(document.querySelectorAll('a[href]')).map(l => l.getAttribute('href') || '')
      const externalLinks = allLinks.filter(h => h.startsWith('http') && !h.includes('hardwarefyi'))

      // Check featured-job-item elements
      const featuredItems = document.querySelectorAll('.featured-job-item')
      const jobPosts = document.querySelectorAll('.job-board-post')
      const dynItems = document.querySelectorAll('.w-dyn-item')

      // Get content from first featured item
      const firstFeatured = featuredItems[0]
      let featuredContent = null
      if (firstFeatured) {
        featuredContent = {
          html: firstFeatured.innerHTML.slice(0, 500),
          links: Array.from(firstFeatured.querySelectorAll('a')).map(a => a.href),
          text: firstFeatured.textContent?.slice(0, 200)
        }
      }

      return {
        featuredCount: featuredItems.length,
        jobPostCount: jobPosts.length,
        dynItemCount: dynItems.length,
        externalLinks: externalLinks.slice(0, 10),
        featuredContent
      }
    })
    console.log(`[Hardware FYI] Debug - Featured items: ${debugInfo.featuredCount}, Job posts: ${debugInfo.jobPostCount}, Dyn items: ${debugInfo.dynItemCount}`)
    console.log(`[Hardware FYI] Debug - External links: ${debugInfo.externalLinks.slice(0, 5).join(', ')}`)
    if (debugInfo.featuredContent) {
      console.log(`[Hardware FYI] Debug - First featured links: ${debugInfo.featuredContent.links.join(', ')}`)
      console.log(`[Hardware FYI] Debug - First featured text: ${debugInfo.featuredContent.text}`)
    }

    // Extract jobs from the DOM
    const jobs = await page.evaluate(() => {
      const results: HardwareFyiJob[] = []
      const seenUrls = new Set<string>()

      // Find all job items - use w-dyn-item which contains the jobs
      const jobElements = document.querySelectorAll('.w-dyn-item')

      jobElements.forEach((el) => {
        try {
          // Find the job link - URL pattern is /job/ not /jobs/
          const linkEl = el.querySelector('a[href*="/job/"]') as HTMLAnchorElement
          if (!linkEl) return

          const url = linkEl.href
          if (seenUrls.has(url)) return
          seenUrls.add(url)

          // Get all text content and try to parse it
          const fullText = el.textContent || ''

          // Extract job title - usually the first significant text or in a heading
          const titleEl = el.querySelector('h3, h4, h5, [class*="heading"], [class*="title"]')
          let title = titleEl?.textContent?.trim() || ''

          // If no title found, try to get it from link text
          if (!title) {
            title = linkEl.textContent?.trim() || ''
          }

          // Extract company name - look for company-related elements
          const companyEl = el.querySelector('[class*="company"], [class*="org"]')
          let company = companyEl?.textContent?.trim() || ''

          // Extract location - usually after "Location" label
          const locationMatch = fullText.match(/Location\s*([A-Za-z\s,]+?)(?:Level|Industry|Department|$)/i)
          let location = locationMatch ? locationMatch[1].trim() : ''

          // Alternative: look for location element
          if (!location) {
            const locationEl = el.querySelector('[class*="location"]')
            location = locationEl?.textContent?.trim() || ''
          }

          // Extract experience level - usually after "Level" label
          const levelMatch = fullText.match(/Level\s*([A-Za-z\-\s]+?)(?:Industry|Department|Location|$)/i)
          let experienceLevel = levelMatch ? levelMatch[1].trim() : ''

          // Extract industry - usually after "Industry" label
          const industryMatch = fullText.match(/Industry\s*([A-Za-z\s&,]+?)(?:Level|Department|Location|$)/i)
          let industry = industryMatch ? industryMatch[1].trim() : ''

          // Extract department if present
          const deptMatch = fullText.match(/Department\s*([A-Za-z\s&,]+?)(?:Level|Industry|Location|$)/i)
          let department = deptMatch ? deptMatch[1].trim() : ''

          // Extract salary if present
          const salaryMatch = fullText.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\/(?:year|yr|hr|hour))?/i)
          const salary = salaryMatch ? salaryMatch[0] : null

          // Get company logo
          const logoEl = el.querySelector('img') as HTMLImageElement
          const logoUrl = logoEl?.src || null

          // Check if featured
          const isFeatured = el.closest('.featured-job-item') !== null ||
                            el.closest('[class*="featured"]') !== null

          if (title && title.length > 3) {
            results.push({
              title,
              company: company || 'Unknown',
              location: location || 'Unknown',
              experienceLevel,
              department,
              industry,
              salary,
              url,
              logoUrl,
              isFeatured
            })
          }
        } catch {
          // Skip errors for individual items
        }
      })

      return results
    })

    console.log(`[Hardware FYI] Extracted ${jobs.length} jobs from page`)
    return jobs

  } finally {
    await browser.close()
  }
}

/**
 * Map experience level to our role level
 */
function mapExperienceLevel(level: string): 'Entry' | 'Mid' | 'Senior' | null {
  const levelLower = level.toLowerCase()

  if (levelLower.includes('intern') || levelLower.includes('entry')) {
    return 'Entry'
  }
  if (levelLower.includes('mid') || levelLower.includes('intermediate')) {
    return 'Mid'
  }
  if (levelLower.includes('senior') || levelLower.includes('lead') ||
      levelLower.includes('vp') || levelLower.includes('executive') ||
      levelLower.includes('director') || levelLower.includes('principal')) {
    return 'Senior'
  }

  return null
}

/**
 * Map experience level to role type
 */
function mapRoleType(level: string): string {
  const levelLower = level.toLowerCase()

  if (levelLower.includes('intern')) {
    return 'Internship'
  }
  if (levelLower.includes('contract') || levelLower.includes('freelance')) {
    return 'Contract'
  }

  return 'Full-time'
}

/**
 * Parse salary text to extract min/max values
 */
function parseSalary(salaryText: string | null): {
  min: number | null
  max: number | null
  currency: string | null
  text: string | null
} {
  if (!salaryText) {
    return { min: null, max: null, currency: null, text: null }
  }

  // Match patterns like "$120,000 - $180,000" or "$150k - $200k"
  const rangeMatch = salaryText.match(/\$?([\d,]+)k?\s*[-–to]+\s*\$?([\d,]+)k?/i)
  if (rangeMatch) {
    let min = parseInt(rangeMatch[1].replace(/,/g, ''), 10)
    let max = parseInt(rangeMatch[2].replace(/,/g, ''), 10)

    // Handle 'k' notation
    if (min < 1000) min *= 1000
    if (max < 1000) max *= 1000

    return {
      min,
      max,
      currency: 'USD',
      text: salaryText
    }
  }

  // Single value like "$150,000" or "$150k"
  const singleMatch = salaryText.match(/\$?([\d,]+)k?/i)
  if (singleMatch) {
    let value = parseInt(singleMatch[1].replace(/,/g, ''), 10)
    if (value < 1000) value *= 1000

    return {
      min: value,
      max: value,
      currency: 'USD',
      text: salaryText
    }
  }

  return { min: null, max: null, currency: null, text: salaryText }
}

/**
 * Parse a job into our format
 */
function parseJob(job: HardwareFyiJob): { role: TrackerRoleData; source: TrackerRoleSourceData } | null {
  try {
    const jobTitle = normalizeText(job.title)
    const companyName = normalizeText(job.company)
    const applicationUrl = job.url

    if (!isValidJob(jobTitle, companyName, applicationUrl)) {
      return null
    }

    // Parse salary
    const salary = parseSalary(job.salary)

    // Determine role level
    let roleLevel = mapExperienceLevel(job.experienceLevel)
    if (!roleLevel) {
      roleLevel = extractRoleLevel(jobTitle)
    }

    // Determine work mode from location
    let workMode: 'Remote' | 'Hybrid' | 'Onsite' = 'Onsite'
    const locationLower = job.location.toLowerCase()
    if (locationLower.includes('remote')) {
      workMode = 'Remote'
    } else if (locationLower.includes('hybrid')) {
      workMode = 'Hybrid'
    }

    const role: TrackerRoleData = {
      company_name: companyName,
      role_title: jobTitle,
      company_description: null,
      company_domain: null,
      industry: job.industry || 'Hardware',
      funding_stage: null,
      role_type: mapRoleType(job.experienceLevel),
      role_level: roleLevel,
      work_mode: workMode,
      location: job.location || 'Unknown',
      compensation_text: salary.text,
      salary_min: salary.min,
      salary_max: salary.max,
      salary_currency: salary.currency,
      offers_equity: null,
      role_description: null,
      posting_date: new Date(),
      closing_date: null,
    }

    const source: TrackerRoleSourceData = {
      source: 'Hardware FYI',
      source_role_id: job.url.split('/').pop() || String(Date.now()),
      source_url: HARDWAREFYI_URL,
      application_url: applicationUrl,
      raw_payload: {
        department: job.department,
        experienceLevel: job.experienceLevel,
        industry: job.industry,
        isFeatured: job.isFeatured,
        logoUrl: job.logoUrl,
      }
    }

    return { role, source }
  } catch {
    return null
  }
}

export const hardwareFyiScraper: Scraper = {
  name: 'Hardware FYI',
  url: HARDWAREFYI_URL,
  usePlaywright: true,

  async parse(_html: string) {
    try {
      console.log(`[${this.name}] Fetching jobs...`)

      const jobs = await fetchHardwareFyiJobs()
      console.log(`[${this.name}] Found ${jobs.length} jobs`)

      const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

      for (const job of jobs) {
        const parsed = parseJob(job)
        if (parsed) {
          results.push(parsed)
        }
      }

      console.log(`[${this.name}] Total valid jobs: ${results.length}`)
      return results
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return []
    }
  }
}

// Standalone test
if (require.main === module) {
  ;(async () => {
    console.log('Testing Hardware FYI scraper...\n')

    const result = await hardwareFyiScraper.parse('')

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.length}`)
    console.log('='.repeat(60))

    // Show first 10 jobs
    result.slice(0, 10).forEach((item, i) => {
      console.log(`\n[${i + 1}] ${item.role.company_name} - ${item.role.role_title}`)
      console.log(`    Location: ${item.role.location} | Mode: ${item.role.work_mode}`)
      console.log(`    Industry: ${item.role.industry} | Level: ${item.role.role_level}`)
      if (item.role.compensation_text) {
        console.log(`    Salary: ${item.role.compensation_text}`)
      }
      console.log(`    URL: ${item.source.application_url}`)
    })

    // Summary by industry
    const byIndustry = result.reduce((acc, { role }) => {
      const industry = role.industry || 'Unknown'
      acc[industry] = (acc[industry] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Summary by level
    const byLevel = result.reduce((acc, { role }) => {
      const level = role.role_level || 'Unknown'
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`\n${'='.repeat(60)}`)
    console.log('By Industry:')
    Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([industry, count]) => {
      console.log(`  ${industry}: ${count}`)
    })
    console.log('\nBy Level:')
    Object.entries(byLevel).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}`)
    })
    console.log('='.repeat(60))
  })()
}
