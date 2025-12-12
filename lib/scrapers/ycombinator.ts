import { BaseScraper } from './base-scraper'
import type { ScraperResult, JobData } from './types'

export class YCScraper extends BaseScraper {
  name = 'Y Combinator'
  sourceUrl = 'https://www.ycombinator.com/jobs'

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    try {
      await this.page.goto(this.sourceUrl, { waitUntil: 'networkidle', timeout: 30000 })
      
      // Wait for dynamic content
      await this.page.waitForTimeout(3000)

      const jobs: JobData[] = []

      // YC jobs page uses a table structure - try to find table rows or list items
      let jobElements: any[] = []
      
      // Strategy 1: Look for table rows (YC often uses tables)
      try {
        const tableRows = await this.page.$$eval('tbody tr, table tr', (rows) => {
          return rows
            .filter(row => {
              const text = row.textContent || ''
              // Filter out header rows and empty rows
              return text.length > 20 && !text.toLowerCase().includes('company') && !text.toLowerCase().includes('role')
            })
            .slice(0, 50)
            .map((row) => {
              const cells = row.querySelectorAll('td, th')
              const links = row.querySelectorAll('a')
              const firstLink = links[0]
              
              return {
                title: cells[1]?.textContent?.trim() || firstLink?.textContent?.trim() || '',
                company: cells[0]?.textContent?.trim() || '',
                link: firstLink?.getAttribute('href') || '',
                location: cells[2]?.textContent?.trim() || 'Remote',
                description: row.textContent?.trim() || '',
              }
            })
        })
        if (tableRows.length > 0) {
          jobElements = tableRows
          console.log(`[${this.name}] Found ${tableRows.length} jobs in table format`)
        }
      } catch (e) {
        // Continue to next strategy
      }

      // Strategy 2: Look for list items or divs with job info
      if (jobElements.length === 0) {
        try {
          const listItems = await this.page.$$eval('li, article, div[class*="card"], div[class*="item"]', (items) => {
            return items
              .filter(item => {
                const text = item.textContent || ''
                const hasLink = item.querySelector('a[href*="/job"], a[href*="/company"]')
                return hasLink && text.length > 30
              })
              .slice(0, 50)
              .map((item) => {
                const linkEl = item.querySelector('a[href*="/job"], a[href*="/company"], a')
                const titleEl = item.querySelector('h1, h2, h3, h4, [class*="title"]') || linkEl
                
                return {
                  title: titleEl?.textContent?.trim() || '',
                  company: item.querySelector('[class*="company"], [class*="name"]')?.textContent?.trim() || '',
                  link: linkEl?.getAttribute('href') || '',
                  location: item.querySelector('[class*="location"], [class*="remote"]')?.textContent?.trim() || 'Remote',
                  description: item.textContent?.trim() || '',
                }
              })
          })
          if (listItems.length > 0) {
            jobElements = listItems
            console.log(`[${this.name}] Found ${listItems.length} jobs in list format`)
          }
        } catch (e) {
          // Continue to next strategy
        }
      }

      // Strategy 3: Find all job/company links
      if (jobElements.length === 0) {
        try {
          const allLinks = await this.page.$$eval('a[href*="/job"], a[href*="/company"], a[href*="/companies"]', (links) => {
            return links
              .filter(link => {
                const text = link.textContent?.trim() || ''
                const href = link.getAttribute('href') || ''
                return text.length > 5 && (href.includes('/job') || href.includes('/company'))
              })
              .slice(0, 30)
              .map((link) => {
                const text = link.textContent?.trim() || ''
                const href = link.getAttribute('href') || ''
                // Try to extract company and role from text
                const parts = text.split(' - ').filter(p => p.trim())
                
                return {
                  title: parts[1] || parts[0] || text,
                  company: parts[0] || text.split(' ')[0] || '',
                  link: href,
                  location: 'Remote',
                  description: '',
                }
              })
          })
          if (allLinks.length > 0) {
            jobElements = allLinks
            console.log(`[${this.name}] Found ${allLinks.length} jobs via link extraction`)
          }
        } catch (e) {
          console.log(`[${this.name}] Could not extract jobs: ${e}`)
        }
      }

      for (const job of jobElements) {
        if (!job.title || !job.company) continue

        const fullLink = job.link.startsWith('http')
          ? job.link
          : `https://www.ycombinator.com${job.link}`

        const jobData: JobData = {
          company_name: this.normalizeText(job.company),
          industry: null,
          location: this.normalizeText(job.location) || 'Remote',
          funding_stage: 'YC',
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

