import { BaseScraper } from './base-scraper'
import type { ScraperResult, JobData } from './types'
import { classifyIndustry } from './classify'

export class GenericVCScraper extends BaseScraper {
  name: string
  sourceUrl: string
  fundingStage: string | null

  constructor(name: string, sourceUrl: string, fundingStage: string | null) {
    super()
    this.name = name
    this.sourceUrl = sourceUrl
    this.fundingStage = fundingStage
  }

  async scrapeInternal(): Promise<ScraperResult> {
    if (!this.page) {
      throw new Error('Page not initialized')
    }

    try {
      const allJobs = await this.scrapePage(this.sourceUrl)
      console.log(`[${this.name}] Main page: ${allJobs.length} jobs`)

      // Second pass: find company pages on Getro boards and scrape those too
      const companyUrls = await this.extractCompanyPageUrls()
      if (companyUrls.length > 0) {
        console.log(`[${this.name}] Found ${companyUrls.length} company pages to crawl`)
        const seenLinks = new Set(allJobs.map(j => j.application_link))

        for (const url of companyUrls.slice(0, 20)) { // Cap at 20 company pages
          try {
            const pageJobs = await this.scrapePage(url)
            const newJobs = pageJobs.filter(j => !seenLinks.has(j.application_link))
            newJobs.forEach(j => seenLinks.add(j.application_link))
            allJobs.push(...newJobs)
            if (newJobs.length > 0) {
              console.log(`[${this.name}]   ${url.split('/').pop()}: +${newJobs.length} jobs`)
            }
          } catch (e) {
            // Skip failed company pages
          }
        }
      }

      // Deduplicate by application_link
      const uniqueJobs = allJobs.filter(
        (job, index, self) =>
          index === self.findIndex(j => j.application_link === job.application_link)
      )

      console.log(`[${this.name}] Returning ${uniqueJobs.length} valid unique jobs`)

      return {
        success: true,
        jobs: uniqueJobs,
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

  /**
   * Extract company page URLs from the current page (Getro pattern: /companies/slug)
   */
  private async extractCompanyPageUrls(): Promise<string[]> {
    if (!this.page) return []

    try {
      const baseUrl = new URL(this.sourceUrl)
      const links = await this.page.$$eval('a[href*="/companies/"]', (anchors) => {
        return anchors
          .map(a => a.getAttribute('href') || '')
          .filter(href => href.match(/\/companies\/[^/]+$/))
      })

      // Deduplicate and resolve to full URLs
      const seen = new Set<string>()
      const urls: string[] = []
      for (const link of links) {
        const full = link.startsWith('http') ? link : `${baseUrl.origin}${link}`
        if (!seen.has(full)) {
          seen.add(full)
          urls.push(full)
        }
      }
      return urls
    } catch {
      return []
    }
  }

  /**
   * Scrape a single page for job listings.
   */
  private async scrapePage(url: string): Promise<JobData[]> {
    if (!this.page) return []

    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    // Wait for dynamic content to load without requiring full network idle
    await this.wait(3000)
    await this.wait(3000)

    const jobs: JobData[] = []

    const selectors = [
        'a[href*="/job"]',
        'a[href*="/jobs/"]',
        'a[href*="/position"]',
        'a[href*="/career"]',
        'a[href*="lever.co"]',
        'a[href*="greenhouse.io"]',
        'a[href*="ashbyhq.com"]',
        '[class*="job"] a',
        '[class*="position"] a',
        '[class*="role"] a',
        '[class*="opening"] a',
        '[data-job] a',
        'tr a',
        'li a[href*="job"]',
      ]

      let jobElements: any[] = []

      for (const selector of selectors) {
        try {
          const elements = await this.page.$$eval(selector, (links) => {
            return links
              .map(link => {
                const href = link.getAttribute('href') || ''
                const text = link.textContent?.trim() || ''
                const parent = link.closest('tr, li, div, article')
                const parentText = parent?.textContent?.trim() || ''

                // Walk up further to find the full job row (Getro wraps job-info in a larger container)
                const jobRow = parent?.parentElement?.closest('div[class]') || parent

                // Try to find company from parent — Getro uses itemprop="name" meta tags
                const companyMeta = jobRow?.querySelector('meta[itemprop="name"]')
                const companyEl = jobRow?.querySelector('[class*="company"], [class*="name"], [data-testid="link"], td:first-child')
                const company = companyMeta?.getAttribute('content') || companyEl?.textContent?.trim() || ''

                // Try to find location - multiple strategies
                // Strategy 1: Getro microdata (itemprop="addressLocality" + "addressCountry")
                const addressMeta = jobRow?.querySelector('meta[itemprop="addressLocality"]')
                const countryMeta = jobRow?.querySelector('meta[itemprop="addressCountry"]')
                const city = addressMeta?.getAttribute('content') || ''
                const country = countryMeta?.getAttribute('content') || ''
                let location = city && country ? `${city}, ${country}` : city || country || ''

                // Strategy 2: Class-based location elements
                if (!location) {
                  const locationEl = jobRow?.querySelector('[class*="location"], [class*="city"]')
                  location = locationEl?.textContent?.trim() || ''
                }

                // Strategy 3: Gather span texts for additional metadata
                const spans = Array.from(jobRow?.querySelectorAll('span, p') || [])
                const spanTexts = spans
                  .map(s => s.textContent?.trim() || '')
                  .filter(t => t.length > 2 && t.length < 100)

                // Strategy 4: Find location from spans (pattern: "City, Country" or single location text near map icon)
                if (!location) {
                  for (const st of spanTexts) {
                    // Match "City, Country/State" or single country/city names
                    if (st.match(/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*(?:,\s*[A-Z].*)?$/) &&
                        !st.match(/series|seed|today|yesterday|software|internet|telecom|finance|health|read\s*more/i) &&
                        st.length < 60 && st.length > 2) {
                      location = st
                      break
                    }
                  }
                }

                // Getro tags (industry, funding stage)
                const tags = Array.from(jobRow?.querySelectorAll('[data-testid="tag"]') || [])
                  .map(t => t.textContent?.trim() || '')
                  .filter(t => t.length > 0)

                // Try to find salary from spans — only match actual currency amounts
                let salary = ''
                for (const st of spanTexts) {
                  if (st.match(/[\$£€]\s*[\d,]+|[\d,]+\s*(?:USD|GBP|EUR)/i) && !st.match(/confirm|details|posting/i)) {
                    salary = st
                    break
                  }
                }

                return {
                  title: text,
                  company,
                  link: href,
                  location,
                  parentText,
                  salary,
                  spanTexts,
                  tags,
                }
              })
              .filter(item => {
                const text = item.title.toLowerCase()
                // Filter out obvious non-jobs
                return (
                  item.link &&
                  item.title.length > 5 &&
                  item.title.length < 200 &&
                  !text.includes('sign up') &&
                  !text.includes('sign in') &&
                  !text.includes('privacy') &&
                  !text.includes('terms of') &&
                  !text.includes('disclaimer') &&
                  !text.includes('slavery act') &&
                  !text.includes('scaling through') &&
                  !text.includes('cookie')
                )
              })
              .slice(0, 100)
          })

          if (elements.length > jobElements.length) {
            jobElements = elements
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      console.log(`[${this.name}] Found ${jobElements.length} potential jobs`)

      for (const job of jobElements) {
        let fullLink = job.link
        if (!fullLink.startsWith('http')) {
          try {
            const baseUrl = new URL(this.sourceUrl)
            fullLink = fullLink.startsWith('/')
              ? `${baseUrl.origin}${fullLink}`
              : `${baseUrl.origin}/${fullLink}`
          } catch (e) {
            continue
          }
        }

        // Skip LinkedIn URLs - not useful for a startup tracker
        if (fullLink.includes('linkedin.com')) {
          continue
        }

        // Skip category/search pages (e.g. Built In "Software Engineer Jobs in San Diego")
        if (fullLink.match(/\/jobs\/[^/]+\/[^/]+$/) && !fullLink.match(/\/jobs\/\d+/) && !fullLink.includes('/companies/')) {
          continue
        }

        // Clean up title - remove "Read more about ... at Company" pattern
        let title = job.title
        const readMoreMatch = title.match(/^Read\s*more\s*about\s+(.+?)\s+at\s+(.+)$/i)
        if (readMoreMatch) {
          title = readMoreMatch[1].trim()
          // Also extract company from this pattern if we don't have one
          if (!job.company || job.company.length < 2) {
            job.company = readMoreMatch[2].trim()
          }
        }

        // Extract company name — prefer URL-based extraction for Getro boards
        let company = ''

        // Strategy 1: From URL path (most reliable for Getro: /companies/zipline/jobs/...)
        const pathMatch = fullLink.match(/\/companies?\/([^/]+)/i)
        if (pathMatch && pathMatch[1]) {
          // Strip trailing numeric/UUID suffixes (e.g. "rentomojo-2", "ben-2", "neon-2-fafc7050-..." → "rentomojo", "ben", "neon")
          const slug = pathMatch[1]
            .replace(/-\d+(-[a-f0-9]{4,}.*)?$/i, '') // strip "-2" or "-2-uuid"
            .replace(/-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}.*$/i, '') // strip raw UUIDs

          company = slug
            .split('-')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }

        // Strategy 2: From the page-extracted company field
        if (!company || company.length < 2) {
          company = job.company
        }

        // Strategy 3: From title text patterns
        if (!company || company.length < 2) {
          company = this.extractCompanyName(title, fullLink)
        }

        // Reject obviously wrong company names (nav text, page sections, locations, etc.)
        const badCompanyPatterns = /^(all jobs?|careers?|jobs?|remote|hybrid|onsite|saas|us|uk|latam|canada|emea|apac|europe|united states|fedramp|senior|junior|staff|lead|principal|intern|gwyn|summer)\s*(\(.*\))?$/i
        if (badCompanyPatterns.test(company.trim())) {
          company = ''
        }

        // Reject if company name looks like a location qualifier or a parenthetical fragment
        if (company && /\(remote\)|\(hybrid\)|\(onsite\)/i.test(company)) {
          company = ''
        }
        // Reject company names that are just parenthetical fragments like "(AI Platform)"
        if (company && /^\(.*\)$/.test(company.trim())) {
          company = ''
        }

        // Reject titles/companies that are Getro navigation: "All jobs", "X matching jobs", "at Company"
        if (/^\d+\s+matching\s+jobs?/i.test(title) || /^all\s+jobs?\b/i.test(title)) {
          continue
        }
        if (/^at\s+/i.test(title)) {
          continue
        }

        // Clean up title - remove company name if it appears at the start
        if (company && title.toLowerCase().startsWith(company.toLowerCase())) {
          title = title.slice(company.length).replace(/^[\s\-:]+/, '').trim()
        }

        // Extract location from title if embedded (Getro pattern: "Role - City | City" or "Role - City, Country")
        let location = this.normalizeText(job.location)
        if (!location || location.length < 2) {
          // Try extracting from title: "Product - Bristol | London" → location = "Bristol | London"
          const titleLocMatch = title.match(/\s+[-–]\s+([A-Z][a-z]+(?:\s*[|\/,]\s*[A-Z][a-z]+)*)$/)
          if (titleLocMatch) {
            location = titleLocMatch[1].replace(/\|/g, '/').trim()
            title = title.slice(0, title.length - titleLocMatch[0].length).trim()
          }
        }

        // Strip trailing location from title (e.g. "Engineer, Remote" or "Manager, San Francisco, CA")
        title = title
          .replace(/,\s*(Remote|Hybrid|Onsite|On-site)\s*$/i, '')
          .replace(/,\s*[A-Z][a-z]+(?:,\s*[A-Z]{2})?\s*$/i, '')
          .trim()

        // If still no location, try parent text patterns
        if (!location || location.length < 2) {
          const locMatch = job.parentText.match(/(?:📍|Location:?\s*)([\w\s,]+)/i)
          if (locMatch) {
            location = locMatch[1].trim()
          } else {
            location = 'Not specified'
          }
        }
        if (location.length > 80 || (location.match(/,/g) || []).length > 3) {
          location = 'Multiple Locations'
        }

        // Filter out Israel-based jobs
        const israelPattern = /\bisrael\b|tel\s*aviv|jerusalem|haifa|ramat\s*gan|herzliya|beer\s*sheva|petah\s*tikva|rishon|netanya|rehovot|bnei\s*brak/i
        if (israelPattern.test(location) || israelPattern.test(job.parentText)) {
          continue
        }

        // Skip category/section page titles (e.g. "Fintech", "Crypto", "Healthcare")
        const categoryPatterns = /^(fintech|crypto|blockchain|healthcare|saas|devtools|ai\/ml|e-commerce|logistics|energy|defence|data|robotics|gaming|space|hr|cloud|marketing|design|real estate|travel|cybersecurity|consumer|enterprise|infrastructure|b2b|b2c|marketplace|edtech|biotech|cleantech|proptech|insurtech|legaltech|agtech|foodtech|medtech|adtech|regtech|govtech|wealthtech|paytech|neobank)$/i
        if (categoryPatterns.test(title.trim())) {
          continue
        }

        // Skip if not a valid job
        if (!this.isValidJob(title, company, fullLink)) {
          continue
        }

        // Classify industry
        const { industry } = classifyIndustry(company, title, job.parentText)

        // Determine work mode from location text
        const locLower = location.toLowerCase()
        let workMode = 'Onsite'
        if (locLower.includes('remote')) workMode = 'Remote'
        else if (locLower.includes('hybrid')) workMode = 'Hybrid'

        // Try to extract salary - check span-extracted salary first, then parent text
        let compensation = 'Not specified'
        if (job.salary) {
          compensation = job.salary
        } else {
          const salaryMatch = job.parentText.match(/(?:\$|£|€|USD|GBP|EUR)\s*[\d,]+(?:\s*[-–]\s*(?:\$|£|€|USD|GBP|EUR)?\s*[\d,]+)?(?:\s*(?:k|K|per year|\/yr|p\.a\.|annually))?/i)
          if (salaryMatch) compensation = salaryMatch[0].trim()
        }

        const jobData: JobData = {
          company_name: this.normalizeText(company),
          industry,
          location,
          funding_stage: this.fundingStage,
          // Don't infer backers from the source board — many VC portfolio
          // job boards list non-portfolio companies (partners, "of interest",
          // paid placements, etc). Real backers only come from the description
          // enricher's "funded by X" extraction.
          role_title: this.normalizeText(title),
          role_type: 'Full-time',
          role_level: this.extractRoleLevel(title, job.parentText),
          work_mode: workMode,
          compensation,
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

      return jobs
  }
}
