import { BaseScraper } from './base-scraper'
import type { ScraperResult, JobData } from './types'

/**
 * Simplified YC scraper that looks for company job postings
 * YC's jobs page lists companies, and each company has job postings
 */
export class YCSimpleScraper extends BaseScraper {
  name = 'Y Combinator (Simple)'
  sourceUrl = 'https://www.ycombinator.com/jobs'

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    try {
      await this.page.goto(this.sourceUrl, { waitUntil: 'networkidle', timeout: 30000 })
      await this.page.waitForTimeout(4000) // Wait for dynamic content

      const jobs: JobData[] = []

      // Get all text content to see what's on the page
      const pageContent = await this.page.content()
      
      // Look for any links that might be job postings
      const allLinks = await this.page.$$eval('a', (links) => {
        return links
          .map(link => ({
            text: link.textContent?.trim() || '',
            href: link.getAttribute('href') || '',
          }))
          .filter(link => {
            const href = link.href.toLowerCase()
            const text = link.text.toLowerCase()
            // Look for job-related links
            return (
              href.includes('/job') ||
              href.includes('/company') ||
              href.includes('/companies') ||
              text.includes('engineer') ||
              text.includes('developer') ||
              text.includes('software') ||
              (text.length > 10 && text.length < 100)
            )
          })
          .slice(0, 50)
      })

      console.log(`[${this.name}] Found ${allLinks.length} potential job links`)

      // Process links into job data
      for (const link of allLinks) {
        if (!link.text || link.text.length < 5) continue

        // Skip navigation and common non-job links
        if (
          link.href.includes('/about') ||
          link.href.includes('/blog') ||
          link.href.includes('/login') ||
          link.href.includes('/signup') ||
          link.href === '#' ||
          link.href === '/'
        ) {
          continue
        }

        const fullLink = link.href.startsWith('http')
          ? link.href
          : `https://www.ycombinator.com${link.href}`

        // Try to extract company and role from text
        const parts = link.text.split(' - ').filter(p => p.trim())
        const company = parts[0] || link.text.split(' ')[0] || 'Unknown'
        const role = parts[1] || parts[0] || link.text

        // Only add if it looks like a job posting
        if (role.length > 5 && company.length > 2) {
          const jobData: JobData = {
            company_name: this.normalizeText(company),
            industry: null,
            location: 'Remote',
            funding_stage: 'YC',
            role_title: this.normalizeText(role),
            role_type: 'Full-time',
            role_level: this.extractRoleLevel(role, ''),
            work_mode: 'Remote',
            compensation: 'Not specified',
            equity: null,
            posting_date: new Date(),
            closing_date: null,
            company_description: '',
            application_link: fullLink,
            source_website: this.sourceUrl,
            is_active: true,
          }

          jobs.push(jobData)
        }
      }

      console.log(`[${this.name}] Extracted ${jobs.length} jobs from links`)

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

