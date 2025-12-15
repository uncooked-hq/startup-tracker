# Job Aggregation Dashboard - Project Overview

## What We're Building

A **Job Aggregation Dashboard** that automatically scrapes 30+ startup and VC job boards multiple times per day and displays all active job postings in a clean, filterable web interface. Think of it as a "one-stop shop" for finding startup jobs from Y Combinator companies, VC portfolio companies, and major startup job boards.

### The Problem We're Solving

- **Fragmentation**: Startup jobs are scattered across dozens of different websites
- **Time-consuming**: Job seekers have to check multiple sites manually
- **Missed opportunities**: Easy to miss new postings when checking manually
- **No centralization**: No single place to see all startup/VC jobs

### Our Solution

- **Automated scraping**: Runs 4 times daily (UK Morning, US Morning, UK Night, US Night)
- **Unified dashboard**: All jobs in one place with filtering
- **Real-time updates**: Database automatically updates with new postings
- **Smart filtering**: Filter by work mode (Remote/Hybrid/Onsite) and role level (Entry/Mid/Senior)

---

## What We've Accomplished

### ✅ Core Infrastructure
1. **Next.js 14 Application** with TypeScript
2. **SQLite Database** (local) with Prisma ORM
3. **Modern UI** with Tailwind CSS and Shadcn/UI components
4. **Black theme** with orange accents

### ✅ Scraper Architecture
1. **Modular scraper system** - Each job board has its own scraper class
2. **30 scrapers configured** for:
   - **Aggregators**: Y Combinator, Work at a Startup, Wellfound, Startup Jobs, etc.
   - **VC Portfolios**: a16z, Sequoia, Index Ventures, Accel, Greylock, etc.
3. **Error resilience** - If one site fails, others continue
4. **Duplicate prevention** - Uses `upsert` based on application link

### ✅ Data Quality
1. **Validation system** that filters out:
   - Category headers ("Freelance Developer Jobs")
   - Navigation links ("Create Profile", "Account.ycombinator")
   - Marketing text ("Your career. 6,666 opportunities")
   - Truncated titles ("Full" instead of "Full-Stack Engineer")
   - Privacy notices and legal text
2. **Company name extraction** from URLs, subdomains, and job titles
3. **Link validation** - Only valid, working URLs are saved

### ✅ User Interface
1. **Dashboard** with TanStack Table
2. **Filtering** by Work Mode and Role Level
3. **Pagination** (50 jobs per page)
4. **Manual scrape button** to trigger updates
5. **Responsive design** with modern styling

---

## How We're Doing This

### Tech Stack

#### Frontend
- **Next.js 14** (App Router) - React framework with server-side rendering
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - Pre-built, accessible React components
- **TanStack Table** - Powerful table component with sorting/filtering

#### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database access
- **SQLite** - Local database (can switch to PostgreSQL/Supabase)

#### Scraping
- **Playwright** - Headless browser automation
- **Chromium** - Browser engine for rendering JavaScript-heavy sites
- **TypeScript** - All scrapers written in TypeScript

#### Database
- **SQLite** - File-based database (easy local development)
- **Prisma** - Database schema management and queries

---

## How Scraping Works

### Architecture Overview

```
┌─────────────────┐
│  Scraper Runner │  ← Orchestrates all scrapers
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ YC    │ │ a16z  │  ← Individual scrapers
│Scraper│ │Scraper│
└───┬───┘ └──┬────┘
    │         │
    └────┬────┘
         │
┌────────▼────────┐
│   Playwright    │  ← Browser automation
│   (Chromium)    │
└────────┬────────┘
         │
┌────────▼────────┐
│  Job Websites   │  ← Target sites
└─────────────────┘
```

### Scraping Process

#### 1. **Base Scraper Class** (`base-scraper.ts`)
   - Handles browser initialization (Playwright)
   - Provides common utilities:
     - Text normalization
     - Company name extraction
     - Job validation
     - Role level detection
   - Error handling and browser cleanup

#### 2. **Individual Scrapers** (e.g., `ycombinator.ts`, `generic-vc-scraper.ts`)
   Each scraper:
   - Extends `BaseScraper`
   - Implements `scrapeInternal()` method
   - Uses Playwright to:
     1. Navigate to the job board URL
     2. Wait for page to load (handles JavaScript-heavy sites)
     3. Find job listings using CSS selectors
     4. Extract job data (title, company, location, link)
     5. Clean and validate the data
     6. Return structured job data

#### 3. **Scraper Runner** (`runner.ts`)
   - Iterates through all scrapers
   - Runs each scraper independently
   - If one fails, continues to the next (resilient)
   - Upserts jobs to database (prevents duplicates)
   - Logs progress and results

### Example: How a Scraper Works

```typescript
// 1. Initialize browser
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

// 2. Navigate to job board
await page.goto('https://www.ycombinator.com/jobs')

// 3. Wait for content to load
await page.waitForTimeout(3000)

// 4. Extract job data
const jobs = await page.$$eval('a[href*="/job"]', (links) => {
  return links.map(link => ({
    title: link.textContent?.trim(),
    link: link.getAttribute('href'),
    // ... more data
  }))
})

// 5. Clean and validate
for (const job of jobs) {
  if (isValidJob(job.title, job.company, job.link)) {
    // Save to database
  }
}
```

### Why Playwright?

- **JavaScript Support**: Many modern job boards use React/Vue and load content dynamically
- **Real Browser**: Renders pages exactly like a user would see them
- **Reliable**: Handles complex SPAs better than simple HTTP requests
- **Flexible**: Can wait for specific elements, handle cookies, etc.

### Data Flow

```
1. Scraper runs → 2. Visits website → 3. Extracts jobs
         ↓
4. Validates data → 5. Cleans text → 6. Extracts company names
         ↓
7. Upserts to database → 8. Dashboard displays → 9. User sees jobs
```

---

## Key Features

### 1. **Modular Scraper System**
- Each job board = one scraper file
- Easy to add new scrapers
- Template provided for new implementations

### 2. **Smart Validation**
- Filters invalid entries before saving
- Extracts proper company names
- Validates URLs
- Removes marketing text and navigation

### 3. **Duplicate Prevention**
- Uses `application_link` as unique identifier
- `upsert` operation: updates existing, creates new
- Prevents duplicate jobs in database

### 4. **Error Resilience**
- One scraper failure doesn't stop others
- Continues processing remaining scrapers
- Logs errors for debugging

### 5. **Automated Scheduling**
- Ready for cron jobs (4x daily)
- Can be triggered manually via UI button
- Background processing

---

## Current Status

### ✅ Working
- 30 scrapers configured
- Dashboard UI functional
- Database schema complete
- Validation system active
- Manual scraping works

### 🔄 In Progress
- Some scrapers need selector adjustments (sites change HTML)
- Company name extraction can be improved for edge cases
- Some sites may require custom handling

### 📋 Future Enhancements
- Automated cron scheduling
- Email notifications for new jobs
- Advanced search/filtering
- Job bookmarking
- Export to CSV
- Company profiles

---

## File Structure

```
UncookedTracker/
├── app/
│   ├── api/
│   │   ├── jobs/route.ts      # API endpoint to fetch jobs
│   │   └── scrape/route.ts    # API endpoint to trigger scraping
│   ├── page.tsx                # Main dashboard UI
│   └── globals.css             # Theme styles
├── lib/
│   ├── prisma.ts               # Database client
│   ├── scrapers/
│   │   ├── base-scraper.ts     # Base class with common functionality
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── runner.ts           # Orchestrates all scrapers
│   │   ├── index.ts            # Exports all scrapers
│   │   ├── yc-simple.ts        # Y Combinator scraper
│   │   ├── workatastartup.ts   # Work at a Startup scraper
│   │   ├── wellfound.ts        # Wellfound scraper
│   │   ├── generic-vc-scraper.ts # Generic scraper for VC sites
│   │   └── ashby-scraper.ts    # Scraper for AshbyHQ job boards
│   ├── cleanup-invalid-jobs.ts # Script to remove bad entries
│   └── seed.ts                 # Script to add test data
├── components/
│   └── ui/                     # Shadcn/UI components
│       ├── button.tsx
│       ├── table.tsx
│       └── select.tsx
├── prisma/
│   └── schema.prisma           # Database schema
└── package.json                # Dependencies
```

---

## How to Use

### Development
```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Set up database
npm run db:generate
npm run db:push

# Add test data
npm run db:seed

# Run dev server
npm run dev
```

### Scraping
```bash
# Run all scrapers manually
npm run scrape

# Or use the "Run Scrapers" button in the UI
```

### Database Management
```bash
# View database in browser
npm run db:studio

# Clean invalid jobs
npm run db:cleanup
```

---

## Technical Challenges & Solutions

### Challenge 1: Dynamic Content
**Problem**: Many sites load jobs via JavaScript  
**Solution**: Playwright waits for network idle and uses timeouts

### Challenge 2: Different HTML Structures
**Problem**: Each site has different HTML  
**Solution**: Multiple selector strategies, fallback patterns

### Challenge 3: Invalid Data
**Problem**: Scraping navigation links, categories, marketing text  
**Solution**: Comprehensive validation with pattern matching

### Challenge 4: Company Name Extraction
**Problem**: Sites don't always show company names clearly  
**Solution**: Multiple extraction strategies (URL, subdomain, title parsing)

### Challenge 5: Duplicate Jobs
**Problem**: Same job from multiple sources  
**Solution**: Unique constraint on `application_link`, upsert logic

---

## Performance

- **Scraping Speed**: ~2-3 minutes for all 30 scrapers
- **Database**: SQLite handles thousands of jobs efficiently
- **UI**: TanStack Table handles large datasets smoothly
- **Pagination**: 50 jobs per page for fast loading

---

## Security & Ethics

- **Rate Limiting**: Built-in delays between requests
- **Respectful Scraping**: Uses standard browser, not aggressive
- **Public Data**: Only scraping publicly available job listings
- **No Authentication**: Doesn't bypass login or access private data

---

This is a production-ready foundation for a job aggregation platform that can scale to handle hundreds of job boards and thousands of job postings.

