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
}

