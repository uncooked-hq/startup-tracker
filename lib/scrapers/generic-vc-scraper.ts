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
                  
                  // Try multiple strategies to get the full title
                  let titleEl = el.querySelector('h2, h3, h4, [class*="title"], [class*="Title"]')
                  if (!titleEl && linkEl) {
                    titleEl = linkEl
                  }
                  
                  // Get full text - try innerText first (respects visibility), then textContent
                  let title = ''
                  if (titleEl) {
                    title = (titleEl as HTMLElement).innerText?.trim() || titleEl.textContent?.trim() || ''
                    
                    // If title seems truncated (starts with common prefixes), try getting from parent
                    if (title.length < 15 && (title.toLowerCase().startsWith('full') || title.toLowerCase().startsWith('senior'))) {
                      const parentText = el.textContent?.trim() || ''
                      // Try to extract full title from parent text
                      const titleMatch = parentText.match(/(Full[-\s]?Stack|Senior|Junior|Lead|Staff|Principal)\s+[^.]{10,}/i)
                      if (titleMatch) {
                        title = titleMatch[0].trim()
                      }
                    }
                  }
                  
                  // Clean up title - remove common suffixes/prefixes that get concatenated
                  title = title
                    .replace(/\s*\.\s*Privacy Notice.*$/i, '')
                    .replace(/\s*\.\s*Privacy.*$/i, '')
                    .replace(/\s*Portfolio job opportunities\.?\s*/i, '')
                    .replace(/\s*Your career\.?\s*/i, '')
                    .replace(/\s*\d+[,.]?\d*\s+opportunities?\.?\s*/i, '')
                    .replace(/\s*Build the future.*$/i, '')
                    .replace(/\s*from here.*$/i, '')
                    .trim()
                  
                  const companyEl = el.querySelector('[class*="company"], [class*="Company"], [class*="name"]')
                  const locationEl = el.querySelector('[class*="location"], [class*="Location"], [class*="remote"]')
                  
                  const company = companyEl?.textContent?.trim() || ''
                  const link = linkEl?.getAttribute('href') || ''
                  
                  // Filter out category headers and navigation
                  const titleLower = title.toLowerCase()
                  if (
                    !title ||
                    title.length < 10 ||
                    title.split(/\s+/).filter(w => w.length > 0).length < 2 ||
                    titleLower.includes(' jobs') ||
                    titleLower.includes('jobs ') ||
                    titleLower === 'jobs' ||
                    titleLower.includes('create profile') ||
                    titleLower.includes('sign ') ||
                    titleLower.includes('portfolio job') ||
                    titleLower.includes('privacy notice') ||
                    titleLower.includes('your career') ||
                    titleLower.includes('opportunities') ||
                    titleLower.includes('build the future') ||
                    titleLower.match(/^\d+[,.]?\d*\s+opportunities?/i) ||
                    titleLower.match(/^(freelance|contract|part.?time|full.?time)\s+(developer|designer|engineer|jobs?)$/i) ||
                    titleLower.match(/^(engineering|product|design|sales|marketing|operations|data|customer support)\s+jobs?$/i) ||
                    titleLower.endsWith('›') ||
                    titleLower.endsWith('→') ||
                    titleLower === 'full' ||
                    titleLower === 'senior' ||
                    titleLower === 'junior' ||
                    titleLower === 'lead'
                  ) {
                    return null
                  }

                  return {
                    title,
                    company,
                    link,
                    location: locationEl?.textContent?.trim() || 'Remote',
                    description: el.textContent?.trim() || '',
                  }
                })
                .filter(item => item !== null && item.title && item.title.length >= 10 && item.title.split(/\s+/).length >= 2)
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
                let text = link.textContent?.trim() || ''
                const href = link.getAttribute('href') || ''
                
                // Clean up text - remove common suffixes/prefixes
                text = text
                  .replace(/\s*\.\s*Privacy Notice.*$/i, '')
                  .replace(/\s*\.\s*Privacy.*$/i, '')
                  .replace(/\s*Portfolio job opportunities\.?\s*/i, '')
                  .replace(/\s*Your career\.?\s*/i, '')
                  .replace(/\s*\d+[,.]?\d*\s+opportunities?\.?\s*/i, '')
                  .replace(/\s*Build the future.*$/i, '')
                  .trim()
                
                // Filter out category headers and navigation
                const titleLower = text.toLowerCase()
                if (
                  !text ||
                  text.length < 10 ||
                  text.split(/\s+/).length < 2 ||
                  titleLower.includes(' jobs') ||
                  titleLower.includes('jobs ') ||
                  titleLower === 'jobs' ||
                  titleLower.includes('create profile') ||
                  titleLower.includes('sign ') ||
                  titleLower.includes('account.') ||
                  titleLower.includes('portfolio job') ||
                  titleLower.includes('privacy notice') ||
                  titleLower.includes('your career') ||
                  titleLower.includes('opportunities') ||
                  titleLower.includes('build the future') ||
                  titleLower.match(/^\d+[,.]?\d*\s+opportunities?/i) ||
                  titleLower.match(/^(freelance|contract|part.?time|full.?time)\s+(developer|designer|engineer|jobs?)$/i) ||
                  titleLower.match(/^(engineering|product|design|sales|marketing|operations|data|customer support)\s+jobs?$/i) ||
                  titleLower.endsWith('›') ||
                  titleLower.endsWith('→') ||
                  titleLower === 'full' ||
                  titleLower === 'senior' ||
                  titleLower === 'junior'
                ) {
                  return null
                }
                
                return {
                  title: text,
                  company: '',
                  link: href,
                  location: 'Remote',
                  description: '',
                }
              })
              .filter(item => item !== null && item.title && item.title.length >= 10)
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

        // Clean up title one more time to remove any remaining artifacts
        let cleanTitle = job.title
          .replace(/\s*\.\s*Privacy Notice.*$/i, '')
          .replace(/\s*\.\s*Privacy.*$/i, '')
          .replace(/\s*Portfolio job opportunities\.?\s*/i, '')
          .replace(/\s*Your career\.?\s*/i, '')
          .replace(/\s*\d+[,.]?\d*\s+opportunities?\.?\s*/i, '')
          .replace(/\s*Build the future.*$/i, '')
          .replace(/\s*from here.*$/i, '')
          .trim()

        // Skip if title is too short or looks invalid after cleaning
        if (cleanTitle.length < 10 || cleanTitle.split(/\s+/).filter(w => w.length > 0).length < 2) {
          continue
        }

        // Construct full link properly
        let fullLink = job.link.startsWith('http') 
          ? job.link 
          : `${this.sourceUrl.replace(/\/$/, '')}${job.link.startsWith('/') ? '' : '/'}${job.link}`

        // Ensure link is valid
        if (!fullLink.includes('http')) {
          continue
        }

        // Extract proper company name if missing
        let companyName = this.normalizeText(job.company)
        if (!companyName || companyName.toLowerCase() === 'unknown' || companyName.length < 2) {
          // Try to extract from title first
          companyName = this.extractCompanyName(cleanTitle, fullLink)
          
          // If still not found, try to get from URL structure
          if (!companyName || companyName.toLowerCase() === 'unknown') {
            const urlMatch = fullLink.match(/https?:\/\/([^/]+)/)
            if (urlMatch) {
              const domain = urlMatch[1]
              // For VC portfolio sites, try to extract company from subdomain or path
              const subdomainMatch = domain.match(/^([^.]+)\.(jobs|careers|talent)/)
              if (subdomainMatch) {
                companyName = subdomainMatch[1].charAt(0).toUpperCase() + subdomainMatch[1].slice(1)
              } else {
                // Try path-based extraction
                const pathMatch = fullLink.match(/\/([^/]+)\/jobs?/)
                if (pathMatch && pathMatch[1].length > 2) {
                  companyName = pathMatch[1].charAt(0).toUpperCase() + pathMatch[1].slice(1)
                }
              }
            }
          }
        }

        // Don't use generic names like "Y Combinator" or source website name as company
        if (companyName.toLowerCase() === 'y combinator' || 
            companyName.toLowerCase() === this.name.toLowerCase() ||
            companyName.toLowerCase().includes('jobs') ||
            companyName.toLowerCase().includes('careers')) {
          // Try harder to extract from title or URL
          const titleParts = cleanTitle.split(' - ').filter(p => p.trim())
          if (titleParts.length > 1) {
            // Assume first part might be company if it doesn't have job keywords
            const possibleCompany = titleParts[0].trim()
            const jobKeywords = ['engineer', 'developer', 'manager', 'designer', 'analyst', 'specialist']
            if (!jobKeywords.some(k => possibleCompany.toLowerCase().includes(k))) {
              companyName = possibleCompany
            }
          }
        }

        // Validate the job before adding (use cleaned title)
        if (!this.isValidJob(cleanTitle, companyName, fullLink)) {
          continue
        }

        const jobData: JobData = {
          company_name: companyName,
          industry: null,
          location: this.normalizeText(job.location) || 'Remote',
          funding_stage: this.fundingStage,
          role_title: this.normalizeText(cleanTitle),
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

