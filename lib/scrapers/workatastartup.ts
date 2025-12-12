import { BaseScraper } from './base-scraper'
import type { ScraperResult, JobData } from './types'

export class WorkAtAStartupScraper extends BaseScraper {
  name = 'Work at a Startup'
  sourceUrl = 'https://www.workatastartup.com'

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    try {
      await this.page.goto(`${this.sourceUrl}/jobs`, { waitUntil: 'networkidle', timeout: 30000 })
      await this.page.waitForTimeout(3000)

      const jobs: JobData[] = []

      // Try multiple selector strategies
      let jobElements: any[] = []

      // Strategy 1: Standard selectors
      try {
        const elements = await this.page.$$eval(
          '.job-card, [class*="job"], article, .listing, [class*="Job"], [data-testid*="job"]',
          (els) => {
            return els.slice(0, 30).map((el) => {
              const titleEl = el.querySelector('h2, h3, .title, [class*="title"], a')
              const companyEl = el.querySelector('.company, [class*="company"], .company-name, [class*="Company"]')
              const linkEl = el.querySelector('a[href*="/jobs/"], a[href*="/companies/"], a[href*="/job/"], a')
              const locationEl = el.querySelector('.location, [class*="location"], .remote, [class*="Location"]')
              const descriptionEl = el.querySelector('.description, [class*="description"], p, .summary')
              const compensationEl = el.querySelector('.salary, [class*="salary"], [class*="compensation"]')

              return {
                title: titleEl?.textContent?.trim() || '',
                company: companyEl?.textContent?.trim() || '',
                link: linkEl?.getAttribute('href') || '',
                location: locationEl?.textContent?.trim() || 'Remote',
                description: descriptionEl?.textContent?.trim() || '',
                compensation: compensationEl?.textContent?.trim() || '',
              }
            })
          }
        )
        if (elements.length > 0) {
          jobElements = elements
          console.log(`[${this.name}] Found ${elements.length} jobs`)
        }
      } catch (e) {
        // Continue to next strategy
      }

      // Strategy 2: Find job links
      if (jobElements.length === 0) {
        try {
          const links = await this.page.$$eval('a[href*="/job"], a[href*="/company"]', (links) => {
            return links
              .filter(link => {
                const text = link.textContent?.trim() || ''
                return text.length > 10
              })
              .slice(0, 30)
              .map((link) => {
                const text = link.textContent?.trim() || ''
                const href = link.getAttribute('href') || ''
                const parent = link.closest('div, li, article')
                
                return {
                  title: text || parent?.querySelector('h2, h3')?.textContent?.trim() || '',
                  company: parent?.querySelector('[class*="company"]')?.textContent?.trim() || '',
                  link: href,
                  location: 'Remote',
                  compensation: '',
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
        if (!job.title || !job.company) continue

        const fullLink = job.link.startsWith('http')
          ? job.link
          : `${this.sourceUrl}${job.link}`

        const workMode = job.location.toLowerCase().includes('remote')
          ? 'Remote'
          : job.location.toLowerCase().includes('hybrid')
          ? 'Hybrid'
          : 'Onsite'

        const jobData: JobData = {
          company_name: this.normalizeText(job.company),
          industry: null,
          location: this.normalizeText(job.location) || 'Remote',
          funding_stage: null,
          role_title: this.normalizeText(job.title),
          role_type: 'Full-time',
          role_level: this.extractRoleLevel(job.title, job.description),
          work_mode: workMode,
          compensation: this.normalizeText(job.compensation) || 'Not specified',
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

      return {
        success: true,
        jobs,
        source: this.name,
      }
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

