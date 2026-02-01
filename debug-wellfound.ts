#!/usr/bin/env npx tsx
/**
 * Debug script: Visit Wellfound and save the rendered HTML for inspection
 */

import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

async function debugWellfound() {
  console.log('[Debug] Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  console.log('[Debug] Navigating to Wellfound...')
  try {
    await page.goto('https://wellfound.com/location/europe', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
  } catch (e) {
    console.warn('[Debug] Navigation timeout, continuing anyway...')
  }

  // Wait for JS to render
  console.log('[Debug] Waiting for JS to render...')
  await page.waitForTimeout(3000)

  // Scroll to load more content
  console.log('[Debug] Scrolling to load content...')
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1500)
  }

  // Get the HTML
  const html = await page.content()
  writeFileSync('./wellfound-debug.html', html)
  console.log('[Debug] Saved HTML to ./wellfound-debug.html')

  // Log all hrefs containing "jobs"
  const jobLinks = await page.locator('a[href*="jobs"]').all()
  console.log(`[Debug] Found ${jobLinks.length} links containing 'jobs'`)

  for (let i = 0; i < Math.min(5, jobLinks.length); i++) {
    const href = await jobLinks[i].getAttribute('href')
    const text = await jobLinks[i].textContent()
    console.log(`  [${i}] href="${href}" text="${text?.substring(0, 50)}"`)
  }

  // Log all divs with class containing "job" or "card"
  const jobDivs = await page.locator('div[class*="job"], div[class*="card"]').all()
  console.log(`[Debug] Found ${jobDivs.length} divs with job/card in class`)

  await browser.close()
  console.log('[Debug] Done. Open ./wellfound-debug.html in a browser to inspect.')
}

debugWellfound().catch(console.error)
