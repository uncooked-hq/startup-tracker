import { BaseScraper } from './base-scraper'
import type { ScraperResult, JobData } from './types'

export class WellfoundScraper extends BaseScraper {
  name = 'Wellfound (AngelList)'
  sourceUrl = 'https://wellfound.com'

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    try {
      // Wellfound job listings page
      await this.page.goto(`${this.sourceUrl}/role/l/software-engineer`, { waitUntil: 'networkidle', timeout: 30000 })
      await this.page.waitForTimeout(3000)

      const jobs: JobData[] = []

      // Wellfound uses specific class names - try multiple strategies
      let jobElements: any[] = []

      // Strategy 1: Look for job cards
      try {
        const cards = await this.page.$$eval(
          '[class*="JobCard"], [class*="job-card"], [data-testid*="job"], article',
          (elements) => {
            return elements.slice(0, 30).map((el) => {
              const titleEl = el.querySelector('h2, h3, [class*="title"], a')
              const companyEl = el.querySelector('[class*="company"], [class*="Company"], [class*="name"]')
              const linkEl = el.querySelector('a[href*="/role/"], a[href*="/job/"]')
              const locationEl = el.querySelector('[class*="location"], [class*="Location"], [class*="remote"]')
              const salaryEl = el.querySelector('[class*="salary"], [class*="Salary"], [class*="compensation"]')

              return {
                title: titleEl?.textContent?.trim() || '',
                company: companyEl?.textContent?.trim() || '',
                link: linkEl?.getAttribute('href') || '',
                location: locationEl?.textContent?.trim() || 'Remote',
                compensation: salaryEl?.textContent?.trim() || '',
                description: el.textContent?.trim() || '',
              }
            })
          }
        )
        if (cards.length > 0) {
          jobElements = cards
          console.log(`[${this.name}] Found ${cards.length} jobs via cards`)
        }
      } catch (e) {
        // Continue
      }

      // Strategy 2: Look for links to job postings
      if (jobElements.length === 0) {
        try {
          const links = await this.page.$$eval('a[href*="/role/"], a[href*="/job/"]', (links) => {
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
        if (!job.title || job.title.length < 5) continue

        const fullLink = job.link.startsWith('http')
          ? job.link
          : `${this.sourceUrl}${job.link}`

        // Extract proper company name
        let companyName = this.normalizeText(job.company)
        if (!companyName || companyName.toLowerCase() === 'unknown' || companyName.length < 2) {
          companyName = this.extractCompanyName(job.title, fullLink)
        }

        // Validate the job before adding
        if (!this.isValidJob(job.title, companyName, fullLink)) {
          continue
        }

        const workMode = job.location.toLowerCase().includes('remote')
          ? 'Remote'
          : job.location.toLowerCase().includes('hybrid')
          ? 'Hybrid'
          : 'Onsite'

        const jobData: JobData = {
          company_name: companyName,
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

