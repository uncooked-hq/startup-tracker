import { chromium } from 'playwright'

async function debugPage(url: string) {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(3000)
    
    // Get page title
    const title = await page.title()
    console.log(`\nPage Title: ${title}`)
    
    // Try to find common job listing patterns
    const selectors = [
      'article',
      '[class*="job"]',
      '[class*="Job"]',
      '[class*="listing"]',
      '[class*="Listing"]',
      '[data-testid*="job"]',
      '.job-card',
      '.job-item',
      'tr',
      'li',
    ]
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        console.log(`\nFound ${count} elements matching "${selector}"`)
        
        // Get first element's HTML structure
        if (count > 0) {
          const firstEl = await page.locator(selector).first()
          const html = await firstEl.innerHTML()
          console.log(`\nFirst element HTML (first 500 chars):`)
          console.log(html.substring(0, 500))
        }
      }
    }
    
    // Get all links
    const links = await page.locator('a').all()
    const jobLinks = links.filter(async (link) => {
      const href = await link.getAttribute('href')
      return href && (href.includes('/job') || href.includes('/company'))
    })
    console.log(`\nFound ${jobLinks.length} potential job/company links`)
    
    // Keep browser open for inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...')
    await page.waitForTimeout(30000)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await browser.close()
  }
}

const url = process.argv[2] || 'https://www.ycombinator.com/jobs'
debugPage(url)

