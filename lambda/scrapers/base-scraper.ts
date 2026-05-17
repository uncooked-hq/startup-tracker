import type { Browser, Page } from 'puppeteer-core'
import type { Scraper, ScraperResult, JobData } from './types'

// Detect if running in Lambda
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME

export abstract class BaseScraper implements Scraper {
  abstract name: string
  abstract sourceUrl: string

  protected browser: Browser | null = null
  protected page: Page | null = null

  async initializeBrowser(): Promise<void> {
    if (isLambda) {
      // Lambda environment - use @sparticuz/chromium
      const chromium = await import('@sparticuz/chromium')
      const puppeteer = await import('puppeteer-core')

      this.browser = await puppeteer.default.launch({
        args: chromium.default.args,
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.default.executablePath(),
        headless: chromium.default.headless,
      })
    } else {
      // Local environment - use full puppeteer with bundled Chromium
      const puppeteer = await import('puppeteer')

      this.browser = await puppeteer.default.launch({
        headless: true,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    }

    this.page = await this.browser.newPage()

    // Set a realistic user agent
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
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
    return 'Mid'
  }

  public static isValidJob(title: string, company: string, link: string): boolean {
    const invalidTitlePatterns = [
      /^(all|show|view|see|browse|search|filter|sort|jobs?|careers?|companies?|startups?)$/i,
      /^(engineering|product|design|sales|marketing|operations|data|customer support|freelance)\s+jobs?$/i,
      /^(freelance|contract|part.?time|full.?time)\s+(developer|designer|engineer|jobs?)$/i,
      /^\d+\s+companies?/i,
      /^\d+\s+jobs?/i,
      /^\d+[,.]?\d*\s+opportunities?/i,
      /^(interview|guide|directory|founder|startup)\s+(guide|directory|founder|startup)$/i,
      /make a dent/i,
      /define the future/i,
      /it's time to build/i,
      /build the future/i,
      /show me jobs/i,
      /within the role of/i,
      /matching jobs at/i,
      /^\s*[•◦]\s*/i,
      /^[•◦]\s*/i,
      /create profile/i,
      /sign (up|in)/i,
      /^account\./i,
      /^jobs?\./i,
      /^\w+\.(ycombinator|ashbyhq|jobs|careers)/i,
      /\s*›\s*$/i,
      /\s*→\s*$/i,
      /^[^a-z]*$/i,
      /portfolio job opportunities/i,
      /privacy notice/i,
      /your career/i,
      /^full\s*$/i,
      /^[a-z]+\s*$/i,
      /\.\s*privacy/i,
      /opportunities?\./i,
      /skip to main content/i,
      /report a map error/i,
      /winning in the/i,
      /cookie/i,
      /accept all/i,
      /^(remote|hybrid|onsite)\s+\w+\s+jobs?$/i,
      /jobs?\s+in\s+/i,
      /^\w+\s+jobs?\s*$/i,
      /^(remote|see all)\s+.*\s+jobs?\s*$/i,
      /tech jobs/i,
    ]

    const titleLower = title.toLowerCase().trim()

    for (const pattern of invalidTitlePatterns) {
      if (pattern.test(titleLower)) {
        return false
      }
    }

    if (title.length < 10 || /^[\d\s\.,\-]+$/.test(title)) {
      return false
    }

    const words = title.split(/\s+/).filter(w => w.length > 0)
    if (words.length < 2) {
      return false
    }

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

    if (!company || company.toLowerCase() === 'unknown' || company.trim().length < 2) {
      return false
    }

    const invalidCompanyPatterns = [
      /^(workinstartups|work in startups|account\.|jobs?\.|careers?\.)/i,
      /^(ycombinator|y combinator|yc)$/i,
      /^(all|show|view|see|browse|search|filter|sort)$/i,
      /^\d+$/i,
      /^[^a-z]+$/i,
    ]

    const companyLower = company.toLowerCase().trim()
    for (const pattern of invalidCompanyPatterns) {
      if (pattern.test(companyLower)) {
        return false
      }
    }

    if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) {
      return false
    }

    try {
      const url = new URL(link)
      if (!url.hostname || url.hostname.length < 3) {
        return false
      }
    } catch (e) {
      return false
    }

    const invalidLinkPatterns = [
      /\/careers?$/i,
      /\/jobs?$/i,
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

    for (const pattern of invalidLinkPatterns) {
      if (pattern.test(link)) {
        const hasJobId = link.match(/\/jobs?\/[^/]+|\/careers?\/[^/]+/i)
        if (!hasJobId) {
          return false
        }
      }
    }

    const jobKeywords = [
      'engineer', 'developer', 'designer', 'manager', 'analyst', 'specialist',
      'scientist', 'architect', 'lead', 'director', 'coordinator', 'assistant',
      'executive', 'officer', 'consultant', 'advisor', 'researcher', 'intern',
      'fellow', 'associate', 'representative', 'agent', 'technician', 'operator'
    ]

    const hasJobKeyword = jobKeywords.some(keyword => titleLower.includes(keyword))

    if (!hasJobKeyword) {
      const wordCount = title.split(/\s+/).filter(w => w.length > 0).length
      if (wordCount < 3 || title.length < 15) {
        return false
      }

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

  public static extractCompanyName(text: string, link: string = ''): string {
    if (!text) return ''

    // Strip parentheticals before splitting — titles like "Software Engineer (Real-time Graphics)"
    // otherwise get split on the hyphen inside the parens, producing garbage like "time Graphics)".
    const stripped = text.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()

    const patterns = [
      /^([^\-:]+?)\s*[-:]\s*(.+)$/,
      /^(.+?)\s+at\s+(.+)$/i,
      /^(.+?)\s+-\s+(.+)$/,
    ]

    for (const pattern of patterns) {
      const match = stripped.match(pattern)
      if (match) {
        const part1 = match[1].trim()
        const part2 = match[2].trim()

        // Skip candidates that are obvious junk (end in stray punctuation, too short, etc.)
        const looksLikeJunk = (s: string) =>
          /[)}\]]$/.test(s) || s.length < 2 || /^(for|and|the|a|an)\s/i.test(s)

        const jobKeywords = ['engineer', 'developer', 'manager', 'designer', 'analyst']
        const part1HasJobWord = jobKeywords.some(k => part1.toLowerCase().includes(k))
        const part2HasJobWord = jobKeywords.some(k => part2.toLowerCase().includes(k))

        if (part1HasJobWord && !part2HasJobWord && !looksLikeJunk(part2)) {
          return part2
        } else if (!part1HasJobWord && part2HasJobWord && !looksLikeJunk(part1)) {
          return part1
        } else if (part1.length < part2.length && part1.length > 2 && !looksLikeJunk(part1)) {
          return part1
        }
      }
    }

    if (link) {
      const urlMatch = link.match(/https?:\/\/(?:www\.)?([^/]+)/)
      if (urlMatch) {
        const domain = urlMatch[1]

        const genericDomains = [
          'ycombinator.com', 'workinstartups.com', 'workatastartup.com',
          'wellfound.com', 'startup.jobs', 'ashbyhq.com', 'jobs.', 'careers.',
          'account.', 'talent.', 'portfoliojobs.'
        ]

        const isGenericDomain = genericDomains.some(gd => domain.includes(gd))

        if (!isGenericDomain) {
          const subdomainMatch = domain.match(/^([^.]+)\.(ashbyhq|jobs|careers|talent)/)
          if (subdomainMatch && subdomainMatch[1]) {
            const company = subdomainMatch[1]
            if (company.length > 2 && company.length < 30) {
              return company.charAt(0).toUpperCase() + company.slice(1)
            }
          }

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

  protected isValidJob(title: string, company: string, link: string): boolean {
    return BaseScraper.isValidJob(title, company, link)
  }

  protected extractCompanyName(text: string, link: string = ''): string {
    return BaseScraper.extractCompanyName(text, link)
  }

  // Helper for waiting (Puppeteer doesn't have waitForTimeout on page)
  protected async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
