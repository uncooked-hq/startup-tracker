# Scraper Improvements

## Issues Fixed

### 1. Invalid Job Entries Filtered Out
The scrapers now filter out:
- Category headers: "Freelance Developer Jobs", "Data and Product Jobs", "Engineering jobs"
- Navigation links: "Create Profile ›", "Account.ycombinator"
- Generic placeholders: "Workinstartups" as company name
- Invalid patterns ending with › or →

### 2. Company Name Extraction Improved
- Extracts from URL paths: `/companies/perplexity` → "Perplexity"
- Extracts from subdomains: `perplexity.ashbyhq.com` → "Perplexity"
- Filters out generic domains: "ycombinator", "workinstartups", "account."
- Prevents using source site names as company names

### 3. Link Validation Enhanced
- Validates URLs are properly formatted
- Filters out fragments, mailto, javascript links
- Ensures links have valid hostnames
- Constructs relative links correctly

### 4. Scrape Button Added
- Manual trigger button in dashboard
- Shows scraping status
- Auto-refreshes after completion

## How to Use

1. **Clean existing invalid jobs:**
   ```bash
   npm run db:cleanup
   ```

2. **Run scrapers:**
   ```bash
   npm run scrape
   ```
   Or use the "Run Scrapers" button in the UI

3. **Results:**
   - Only legitimate job postings with proper company names
   - Valid application links
   - Proper role titles (not categories)

## Validation Rules

Jobs are only saved if they have:
- ✅ Valid job title (not a category header)
- ✅ Real company name (not generic site name)
- ✅ Valid application URL
- ✅ Job-related keywords in title
- ✅ Proper formatting (no navigation symbols)

