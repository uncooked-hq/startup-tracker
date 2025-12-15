import { chromium, Browser, Page } from 'playwright'
import type { Scraper, ScraperResult, JobData } from './types'

export abstract class BaseScraper implements Scraper {
  abstract name: string
  abstract sourceUrl: string

  protected browser: Browser | null = null
  protected page: Page | null = null

  async initializeBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    })
    this.page = await this.browser.newPage()
    await this.page.setViewportSize({ width: 1920, height: 1080 })
  }

  async closeBrowser(): Promise<void> {
    if (this.page) {
      await this.page.close()
    }
    if (this.browser) {
      await this.browser.close()
    }
  }

  abstract scrapeInternal(): Promise<ScraperResult>

  async scrape(): Promise<ScraperResult> {
    try {
      await this.initializeBrowser()
      const result = await this.scrapeInternal()
      return result
    } catch (error) {
      return {
        success: false,
        jobs: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.name,
      }
    } finally {
      await this.closeBrowser()
    }
  }

  protected normalizeText(text: string | null | undefined): string {
    if (!text) return ''
    return text.trim().replace(/\s+/g, ' ')
  }

  protected extractCompensation(text: string): string {
    // Extract salary ranges, equity, etc.
    const match = text.match(/\$[\d,]+(?:-\$[\d,]+)?(?:\s*(?:USD|GBP|EUR))?/i)
    return match ? match[0] : text
  }

  protected extractRoleLevel(title: string, description: string): string {
    const combined = `${title} ${description}`.toLowerCase()
    if (combined.match(/\b(senior|sr|lead|principal|staff|architect)\b/)) {
      return 'Senior'
    }
    if (combined.match(/\b(mid|middle|intermediate)\b/)) {
      return 'Mid'
    }
    if (combined.match(/\b(junior|jr|entry|intern|internship|graduate)\b/)) {
      return 'Entry'
    }
    return 'Mid' // Default
  }

  /**
   * Validate if a job entry looks legitimate
   */
  public static isValidJob(title: string, company: string, link: string): boolean {
    // Filter out invalid titles
    const invalidTitlePatterns = [
      /^(all|show|view|see|browse|search|filter|sort|jobs?|careers?|companies?|startups?)$/i,
      /^(engineering|product|design|sales|marketing|operations|data|customer support|freelance)\s+jobs?$/i,
      /^(freelance|contract|part.?time|full.?time)\s+(developer|designer|engineer|jobs?)$/i,
      /^\d+\s+companies?/i,
      /^\d+\s+jobs?/i,
      /^\d+[,.]?\d*\s+opportunities?/i, // "6,666 opportunities"
      /^(interview|guide|directory|founder|startup)\s+(guide|directory|founder|startup)$/i,
      /make a dent/i,
      /define the future/i,
      /it's time to build/i,
      /build the future/i,
      /show me jobs/i,
      /within the role of/i,
      /matching jobs at/i,
      /^\s*[•◦]\s*/i, // Bullet points
      /^[•◦]\s*/i,
      /create profile/i,
      /sign (up|in)/i,
      /^account\./i, // account.ycombinator, account.whatever
      /^jobs?\./i, // jobs.ashbyhq, jobs.whatever
      /^\w+\.(ycombinator|ashbyhq|jobs|careers)/i, // domain patterns that aren't companies
      /\s*›\s*$/i, // Ends with ›
      /\s*→\s*$/i, // Ends with →
      /^[^a-z]*$/i, // Only special characters
      /portfolio job opportunities/i,
      /privacy notice/i,
      /your career/i,
      /^full\s*$/i, // Just "Full" (truncated)
      /^full\s*$/i, // Just "Full" (truncated)
      /^[a-z]+\s*$/i, // Single word that's not a proper job title
      /\.\s*privacy/i, // Contains ". Privacy"
      /opportunities?\./i, // Ends with "opportunities."
    ]

    const titleLower = title.toLowerCase().trim()
    
    // Check against invalid patterns
    for (const pattern of invalidTitlePatterns) {
      if (pattern.test(titleLower)) {
        return false
      }
    }

    // Title must be meaningful (at least 10 chars for proper job titles)
    if (title.length < 10 || /^[\d\s\.,\-]+$/.test(title)) {
      return false
    }

    // Title should have at least 2 words (single word titles are likely invalid)
    const words = title.split(/\s+/).filter(w => w.length > 0)
    if (words.length < 2) {
      return false
    }

    // Check for truncated titles (common patterns)
    if (
      title.toLowerCase() === 'full' ||
      title.toLowerCase() === 'senior' ||
      title.toLowerCase() === 'junior' ||
      title.toLowerCase() === 'lead' ||
      title.toLowerCase() === 'staff' ||
      words.length === 1 && words[0].length < 8
    ) {
      return false
    }

    // Company should not be "Unknown" or empty
    if (!company || company.toLowerCase() === 'unknown' || company.trim().length < 2) {
      return false
    }

    // Filter out invalid company names
    const invalidCompanyPatterns = [
      /^(workinstartups|work in startups|account\.|jobs?\.|careers?\.)/i,
      /^(ycombinator|y combinator|yc)$/i, // Unless it's actually YC hiring
      /^(all|show|view|see|browse|search|filter|sort)$/i,
      /^\d+$/i, // Just numbers
      /^[^a-z]+$/i, // Only special characters
    ]

    const companyLower = company.toLowerCase().trim()
    for (const pattern of invalidCompanyPatterns) {
      if (pattern.test(companyLower)) {
        return false
      }
    }

    // Link must be a valid URL
    if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) {
      return false
    }

    // Ensure link is not a fragment or invalid
    try {
      const url = new URL(link)
      if (!url.hostname || url.hostname.length < 3) {
        return false
      }
    } catch (e) {
      return false
    }

    // Filter out common non-job URLs (but allow job-specific paths)
    const invalidLinkPatterns = [
      /\/careers?$/i, // /careers or /career (but allow /careers/123)
      /\/jobs?$/i,    // /jobs or /job (but allow /jobs/123)
      /\/about/i,
      /\/blog/i,
      /\/contact/i,
      /\/login/i,
      /\/signup/i,
      /\/directory/i,
      /\/guide/i,
      /#$/,
      /^#/,
      /mailto:/i,
      /javascript:/i,
    ]

    // Check if link matches invalid patterns
    for (const pattern of invalidLinkPatterns) {
      if (pattern.test(link)) {
        // Allow if it's a job-specific path (has ID or slug after)
        const hasJobId = link.match(/\/jobs?\/[^/]+|\/careers?\/[^/]+/i)
        if (!hasJobId) {
          return false
        }
      }
    }

    // Title should contain job-related keywords or be a role
    const jobKeywords = [
      'engineer', 'developer', 'designer', 'manager', 'analyst', 'specialist',
      'scientist', 'architect', 'lead', 'director', 'coordinator', 'assistant',
      'executive', 'officer', 'consultant', 'advisor', 'researcher', 'intern',
      'fellow', 'associate', 'representative', 'agent', 'technician', 'operator'
    ]

    const hasJobKeyword = jobKeywords.some(keyword => titleLower.includes(keyword))
    
    // If no job keyword, check if it's a reasonable job title length and format
    if (!hasJobKeyword) {
      // Must have at least 3 words and be substantial
      const wordCount = title.split(/\s+/).filter(w => w.length > 0).length
      if (wordCount < 3 || title.length < 15) {
        return false
      }
      
      // Check for common non-job patterns
      const nonJobPatterns = [
        /portfolio/i,
        /privacy/i,
        /opportunities?/i,
        /your career/i,
        /build the future/i,
        /from here/i,
      ]
      
      if (nonJobPatterns.some(pattern => pattern.test(titleLower))) {
        return false
      }
    }

    return true
  }

  /**
   * Extract company name from text, trying multiple strategies
   */
  public static extractCompanyName(text: string, link: string = ''): string {
    if (!text) return ''

    // Try to extract from common patterns
    // Pattern: "Company Name - Job Title" or "Company Name: Job Title"
    const patterns = [
      /^([^\-:]+?)\s*[-:]\s*(.+)$/, // "Company - Title"
      /^(.+?)\s+at\s+(.+)$/i, // "Title at Company"
      /^(.+?)\s+-\s+(.+)$/, // "Company - Title"
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        // Try both sides to see which is more likely the company
        const part1 = match[1].trim()
        const part2 = match[2].trim()
        
        // Company names are usually shorter and don't contain job keywords
        const jobKeywords = ['engineer', 'developer', 'manager', 'designer', 'analyst']
        const part1HasJobWord = jobKeywords.some(k => part1.toLowerCase().includes(k))
        const part2HasJobWord = jobKeywords.some(k => part2.toLowerCase().includes(k))
        
        if (part1HasJobWord && !part2HasJobWord) {
          return part2
        } else if (!part1HasJobWord && part2HasJobWord) {
          return part1
        } else if (part1.length < part2.length && part1.length > 2) {
          return part1
        }
      }
    }

    // Try to extract from URL - but avoid generic domains
    if (link) {
      const urlMatch = link.match(/https?:\/\/(?:www\.)?([^/]+)/)
      if (urlMatch) {
        const domain = urlMatch[1]
        
        // Skip generic job board domains
        const genericDomains = [
          'ycombinator.com', 'workinstartups.com', 'workatastartup.com',
          'wellfound.com', 'startup.jobs', 'ashbyhq.com', 'jobs.', 'careers.',
          'account.', 'talent.', 'portfoliojobs.'
        ]
        
        const isGenericDomain = genericDomains.some(gd => domain.includes(gd))
        
        if (!isGenericDomain) {
          // Try to extract company from subdomain (e.g., perplexity.ashbyhq.com)
          const subdomainMatch = domain.match(/^([^.]+)\.(ashbyhq|jobs|careers|talent)/)
          if (subdomainMatch && subdomainMatch[1]) {
            const company = subdomainMatch[1]
            if (company.length > 2 && company.length < 30) {
              return company.charAt(0).toUpperCase() + company.slice(1)
            }
          }
          
          // Try path-based extraction (e.g., /companies/perplexity)
          const pathMatch = link.match(/\/(?:companies?|company)\/([^/]+)/i)
          if (pathMatch && pathMatch[1]) {
            const company = pathMatch[1]
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            if (company.length > 2 && company.length < 50) {
              return company
            }
          }
          
          // Last resort: use domain name (but clean it)
          const cleanDomain = domain
            .replace(/\.(com|io|co|ai|dev|net|org|co\.uk)$/, '')
            .replace(/^(www|jobs|careers|talent|portfolio)\./, '')
          
          if (cleanDomain.length > 2 && cleanDomain.length < 30 && !cleanDomain.includes('.')) {
            return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1)
          }
        }
      }
    }

    return text.trim()
  }

  // Instance methods that call static methods
  protected isValidJob(title: string, company: string, link: string): boolean {
    return BaseScraper.isValidJob(title, company, link)
  }

  protected extractCompanyName(text: string, link: string = ''): string {
    return BaseScraper.extractCompanyName(text, link)
  }
}

