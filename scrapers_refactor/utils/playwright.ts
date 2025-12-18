/**
 * Playwright utility functions for browser automation
 */

import { chromium, Browser, Page } from 'playwright'
import type { Scraper, TrackerScraperResult } from '../types'

/**
 * Run a scraper that requires Playwright (headless browser)
 */
export async function runPlaywrightScraper(
  scraper: Scraper
): Promise<TrackerScraperResult> {
  let browser: Browser | null = null
  
  try {
    console.log(`[${scraper.name}] Launching headless browser...`)
    
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    
    // Build URL with filters if it's a function
    const url = typeof scraper.url === 'function' 
      ? scraper.url(scraper.options) 
      : scraper.url
    
    console.log(`[${scraper.name}] Navigating to ${url}`)
    
    // Navigate and wait for network to be idle
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    })
    
    // Wait for specific selector if provided
    if (scraper.playwrightOptions?.waitForSelector) {
      console.log(`[${scraper.name}] Waiting for selector: ${scraper.playwrightOptions.waitForSelector}`)
      await page.waitForSelector(
        scraper.playwrightOptions.waitForSelector,
        { 
          timeout: scraper.playwrightOptions.timeout || 30000,
          state: 'visible'
        }
      )
    }
    
    // Small delay to ensure JS has fully rendered
    await page.waitForTimeout(2000)
    
    // Handle infinite scroll if enabled
    if (scraper.playwrightOptions?.scrollToLoad) {
      console.log(`[${scraper.name}] Scrolling to load all content...`)
      
      const maxScrolls = scraper.playwrightOptions.maxScrolls || 10
      const selector = scraper.playwrightOptions.waitForSelector || 'body'
      
      let previousCount = 0
      let scrollAttempts = 0
      let noChangeCount = 0
      
      while (scrollAttempts < maxScrolls) {
        // Count current items
        const currentCount = await page.locator(selector).count()
        
        // Scroll to bottom
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight)
        })
        
        // Wait for potential lazy load
        await page.waitForTimeout(2000)
        
        // Check if new content loaded
        if (currentCount === previousCount) {
          noChangeCount++
          if (noChangeCount >= 2) {
            console.log(`[${scraper.name}] No new content after 2 attempts, stopping scroll`)
            break
          }
        } else {
          noChangeCount = 0
          console.log(`[${scraper.name}] Loaded ${currentCount} items (was ${previousCount})`)
        }
        
        previousCount = currentCount
        scrollAttempts++
      }
      
      console.log(`[${scraper.name}] Finished scrolling after ${scrollAttempts} attempts`)
    }
    
    console.log(`[${scraper.name}] Extracting rendered HTML...`)
    
    // Get the fully rendered HTML
    const html = await page.content()
    
    // Close browser before parsing (free up resources)
    await browser.close()
    browser = null
    
    console.log(`[${scraper.name}] Parsing HTML...`)
    
    // Parse using the scraper's parse function
    const roles = await scraper.parse(html)
    
    console.log(`[${scraper.name}] ✓ Extracted ${roles.length} roles`)
    
    return {
      success: true,
      roles,
      source: scraper.name,
    }
  } catch (error) {
    console.error(`[${scraper.name}] ✗ Error:`, error)
    return {
      success: false,
      roles: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      source: scraper.name,
    }
  } finally {
    // Ensure browser is closed even if there's an error
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.error(`[${scraper.name}] Error closing browser:`, e)
      }
    }
  }
}

