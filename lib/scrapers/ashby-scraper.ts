import { BaseScraper } from './base-scraper'
import type { ScraperResult, JobData } from './types'

/**
 * Scraper for job boards using AshbyHQ (common for many VC portfolio job boards)
 * These typically have structure like: company.ashbyhq.com/jobs
 */
export class AshbyScraper extends BaseScraper {
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
      await this.page.waitForTimeout(3000)

      const jobs: JobData[] = []

      // Extract company name from URL (e.g., perplexity.ashbyhq.com -> Perplexity)
      const urlMatch = this.sourceUrl.match(/https?:\/\/([^.]+)\.ashbyhq\.com/)
      const companyFromUrl = urlMatch 
        ? urlMatch[1].split('.').pop()?.charAt(0).toUpperCase() + urlMatch[1].split('.').pop()?.slice(1)
        : null

      // AshbyHQ job boards typically use these selectors
      let jobElements: any[] = []

      // Strategy 1: Look for job cards/listings
      try {
        const elements = await this.page.$$eval(
          '[class*="Job"], [class*="job"], [data-testid*="job"], article, .job-listing, .job-card',
          (els) => {
            return els
              .filter(el => {
                const text = el.textContent || ''
                return text.length > 20
              })
              .slice(0, 50)
              .map((el) => {
                const linkEl = el.querySelector('a[href*="/jobs/"], a[href*="/job/"], a[href*="/apply"]') || el.closest('a')
                const titleEl = el.querySelector('h2, h3, h4, [class*="title"], [class*="Title"]') || linkEl
                const locationEl = el.querySelector('[class*="location"], [class*="Location"], [class*="remote"]')
                const departmentEl = el.querySelector('[class*="department"], [class*="team"]')

                return {
                  title: titleEl?.textContent?.trim() || '',
                  company: '', // Will be extracted from URL
                  link: linkEl?.getAttribute('href') || '',
                  location: locationEl?.textContent?.trim() || '',
                  department: departmentEl?.textContent?.trim() || '',
                  description: el.textContent?.trim() || '',
                }
              })
          }
        )
        
        if (elements.length > 0) {
          jobElements = elements
          console.log(`[${this.name}] Found ${elements.length} jobs`)
        }
      } catch (e) {
        // Continue
      }

      // Strategy 2: Look for job links directly
      if (jobElements.length === 0) {
        try {
          const links = await this.page.$$eval('a[href*="/jobs/"], a[href*="/job/"]', (links) => {
            return links
              .filter(link => {
                const text = link.textContent?.trim() || ''
                return text.length > 10 && !text.toLowerCase().includes('view all')
              })
              .slice(0, 50)
              .map((link) => {
                const text = link.textContent?.trim() || ''
                const href = link.getAttribute('href') || ''
                const parent = link.closest('div, li, article, tr')
                
                return {
                  title: text || parent?.querySelector('h2, h3')?.textContent?.trim() || '',
                  company: '',
                  link: href,
                  location: parent?.querySelector('[class*="location"]')?.textContent?.trim() || '',
                  department: '',
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

        // Construct full link
        let fullLink = job.link.startsWith('http') 
          ? job.link 
          : `${this.sourceUrl.replace(/\/$/, '')}${job.link.startsWith('/') ? '' : '/'}${job.link}`

        // Ensure link is valid
        if (!fullLink.includes('http')) {
          continue
        }

        // Use company from URL, or try to extract from title
        let companyName = companyFromUrl || ''
        if (!companyName) {
          companyName = BaseScraper.extractCompanyName(job.title, fullLink)
        }

        // Validate the job
        if (!BaseScraper.isValidJob(job.title, companyName, fullLink)) {
          continue
        }

        // Determine work mode from location
        const location = this.normalizeText(job.location) || 'Remote'
        const workMode = location.toLowerCase().includes('remote')
          ? 'Remote'
          : location.toLowerCase().includes('hybrid')
          ? 'Hybrid'
          : 'Onsite'

        const jobData: JobData = {
          company_name: companyName,
          industry: null,
          location: location,
          funding_stage: this.fundingStage,
          role_title: this.normalizeText(job.title),
          role_type: 'Full-time',
          role_level: this.extractRoleLevel(job.title, job.description),
          work_mode: workMode,
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

