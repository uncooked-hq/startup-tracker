import { BaseScraper } from './base-scraper'
import type { ScraperResult, JobData } from './types'

/**
 * Generic scraper for VC portfolio job boards
 * Most VC job boards use similar structures (Greenhouse, Lever, etc.)
 */
export class GenericVCScraper extends BaseScraper {
  name: string
  sourceUrl: string
  fundingStage: string

  constructor(name: string, sourceUrl: string, fundingStage: string) {
    super()
    this.name = name
    this.sourceUrl = sourceUrl
    this.fundingStage = fundingStage
  }

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) throw new Error('Page not initialized')

    try {
      await this.page.goto(this.sourceUrl, { waitUntil: 'networkidle', timeout: 30000 })
      await this.page.waitForTimeout(4000)

      const jobs: JobData[] = []
      let jobElements: any[] = []

      // Strategy 1: Look for common job board patterns (Greenhouse, Lever, etc.)
      const selectors = [
        '[class*="job"], [class*="Job"]',
        '[data-job-id]',
        'a[href*="/jobs/"], a[href*="/job/"]',
        'tr[class*="job"]',
        'li[class*="job"]',
        'article',
      ]

      for (const selector of selectors) {
        try {
          const count = await this.page.locator(selector).count()
          if (count > 0) {
            const elements = await this.page.$$eval(selector, (els) => {
              return els
                .filter(el => {
                  const text = el.textContent || ''
                  return text.length > 20
                })
                .slice(0, 50)
                .map((el) => {
                  const linkEl = el.querySelector('a[href*="/job"], a[href*="/jobs"]') || el.closest('a')
                  const titleEl = el.querySelector('h2, h3, h4, [class*="title"]') || linkEl
                  const companyEl = el.querySelector('[class*="company"], [class*="name"]')
                  const locationEl = el.querySelector('[class*="location"], [class*="remote"]')

                  return {
                    title: titleEl?.textContent?.trim() || '',
                    company: companyEl?.textContent?.trim() || '',
                    link: linkEl?.getAttribute('href') || '',
                    location: locationEl?.textContent?.trim() || 'Remote',
                    description: el.textContent?.trim() || '',
                  }
                })
            })
            
            if (elements.length > 0) {
              jobElements = elements
              console.log(`[${this.name}] Found ${elements.length} jobs with selector: ${selector}`)
              break
            }
          }
        } catch (e) {
          continue
        }
      }

      // Strategy 2: Find all job links
      if (jobElements.length === 0) {
        try {
          const links = await this.page.$$eval('a[href*="/job"], a[href*="/jobs"], a[href*="/career"]', (links) => {
            return links
              .filter(link => {
                const text = link.textContent?.trim() || ''
                return text.length > 10 && !text.toLowerCase().includes('login')
              })
              .slice(0, 50)
              .map((link) => {
                const text = link.textContent?.trim() || ''
                const href = link.getAttribute('href') || ''
                return {
                  title: text,
                  company: '',
                  link: href,
                  location: 'Remote',
                  description: '',
                }
              })
          })
          if (links.length > 0) {
            jobElements = links
            console.log(`[${this.name}] Found ${links.length} jobs via links`)
          }
        } catch (e) {
          // Continue
        }
      }

      for (const job of jobElements) {
        if (!job.title || job.title.length < 5) continue

        const fullLink = job.link.startsWith('http') ? job.link : `${this.sourceUrl}${job.link}`

        const jobData: JobData = {
          company_name: this.normalizeText(job.company) || 'Unknown',
          industry: null,
          location: this.normalizeText(job.location) || 'Remote',
          funding_stage: this.fundingStage,
          role_title: this.normalizeText(job.title),
          role_type: 'Full-time',
          role_level: this.extractRoleLevel(job.title, job.description),
          work_mode: job.location.toLowerCase().includes('remote') ? 'Remote' : 'Hybrid',
          compensation: 'Not specified',
          equity: null,
          posting_date: new Date(),
          closing_date: null,
          company_description: this.normalizeText(job.description),
          application_link: fullLink,
          source_website: this.sourceUrl,
          is_active: true,
        }

        jobs.push(jobData)
      }

      return { success: true, jobs, source: this.name }
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

