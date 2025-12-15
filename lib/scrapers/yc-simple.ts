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
          link.href === '/' ||
          link.href.includes('/companies') && !link.href.match(/\/companies\/[^/]+$/)
        ) {
          continue
        }

        const fullLink = link.href.startsWith('http')
          ? link.href
          : `https://www.ycombinator.com${link.href}`

        // Try to extract company and role from text
        // YC format is usually: "Company Name - Job Title" or "Company Name: Job Title"
        const parts = link.text.split(/[-:]/).filter(p => p.trim())
        let company = ''
        let role = ''

        if (parts.length >= 2) {
          // First part is usually company, second is role
          company = parts[0].trim()
          role = parts.slice(1).join(' ').trim()
        } else if (parts.length === 1) {
          // Try to parse "Title at Company" format
          const atMatch = link.text.match(/^(.+?)\s+at\s+(.+)$/i)
          if (atMatch) {
            role = atMatch[1].trim()
            company = atMatch[2].trim()
          } else {
            // Single part - might be just role, try to get company from URL
            role = parts[0].trim()
            // If URL has /companies/company-name, extract it
            const companyMatch = fullLink.match(/\/companies\/([^/]+)/)
            if (companyMatch) {
              company = companyMatch[1]
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }
          }
        }

        // If still no company, try extraction methods
        if (!company || company.toLowerCase() === 'y combinator' || company.length < 2) {
          company = this.extractCompanyName(link.text, fullLink)
          // Don't use "Y Combinator" as company name
          if (company.toLowerCase() === 'y combinator' || company.toLowerCase() === 'ycombinator') {
            // Try to get from URL path
            const urlCompanyMatch = fullLink.match(/\/companies\/([^/]+)/)
            if (urlCompanyMatch) {
              company = urlCompanyMatch[1]
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            } else {
              // Last resort: try to extract from link text differently
              const textParts = link.text.split(/\s+/)
              if (textParts.length > 2) {
                // Assume first word or two might be company if it doesn't have job keywords
                const jobKeywords = ['engineer', 'developer', 'manager', 'designer', 'analyst']
                for (let i = 1; i <= 3 && i < textParts.length; i++) {
                  const possibleCompany = textParts.slice(0, i).join(' ')
                  if (!jobKeywords.some(k => possibleCompany.toLowerCase().includes(k))) {
                    company = possibleCompany
                    role = textParts.slice(i).join(' ')
                    break
                  }
                }
              }
            }
          }
        }

        // Ensure we have a role
        if (!role || role === company) {
          role = link.text.replace(company, '').replace(/^[-:\s]+/, '').trim() || link.text
        }

        // Validate the job before adding
        if (this.isValidJob(role, company, fullLink) && company.toLowerCase() !== 'y combinator') {
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

