# Job Aggregation Dashboard

A web application that scrapes 30+ startup/VC job boards and displays active roles in a clean, filterable React UI.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn/UI
- **Database:** SQLite (local) / Supabase PostgreSQL (production)
- **ORM:** Prisma
- **Scraping:** Playwright (headless browser)
- **Table:** TanStack Table

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Playwright browsers installed

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install chromium
```

3. Set up the database:

The project is configured to use SQLite for local development by default. The `.env` file is already created with:

```
DATABASE_URL="file:./dev.db"
```

Generate Prisma Client and create the database:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates dev.db)
npm run db:push
```

**For Production/Supabase:** To use PostgreSQL, update `prisma/schema.prisma` to change the datasource provider from `sqlite` to `postgresql`, and update your `.env` file with your PostgreSQL connection string.

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Running Scrapers

To run the scrapers manually:

```bash
npm run scrape
```

This will execute all configured scrapers and save jobs to the database.

## Scraper Architecture

The scraping system uses a modular pattern:

- **Base Scraper** (`lib/scrapers/base-scraper.ts`): Abstract base class with common functionality
- **Individual Scrapers** (`lib/scrapers/*.ts`): One file per job board/VC firm
- **Runner** (`lib/scrapers/runner.ts`): Orchestrates all scrapers with error handling

### Current Implementations

- ✅ Y Combinator (`ycombinator.ts`)
- ✅ Work at a Startup (`workatastartup.ts`)

### Planned Implementations

The following scrapers are scaffolded but not yet implemented:

**Aggregators:**
- Wellfound
- Startup Jobs
- Work In Startups
- EU-Startups
- The Hub
- Welcome to the Jungle UK
- Built In
- Startupers
- European Startup Jobs

**VC Portfolios:**
- Antler
- a16z
- Index Ventures
- Seedcamp
- Accel
- Sequoia Capital
- Bessemer Venture Partners
- NEA
- Greylock
- Initialized Capital
- Atomico
- Balderton Capital
- Lightspeed Venture Partners
- Khosla Ventures
- Kleiner Perkins
- CapitalG
- GV (Google Ventures)
- Lerer Hippeau
- Earlybird

## Scheduling

To run scrapers automatically 4 times a day, you can:

1. **Use Vercel Cron** (if deploying to Vercel):
   - Create `vercel.json` with cron configuration
   - Set up API route that calls the scraper runner

2. **Use a Node.js cron script**:
   - Install `node-cron` package
   - Create a cron job that runs the scraper at specified times

## Project Structure

```
├── app/
│   ├── api/jobs/        # API route for fetching jobs
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Dashboard page
├── components/
│   └── ui/              # Shadcn/UI components
├── lib/
│   ├── prisma.ts        # Prisma client
│   ├── scrapers/        # Scraper implementations
│   │   ├── base-scraper.ts
│   │   ├── types.ts
│   │   ├── index.ts
│   │   ├── runner.ts
│   │   ├── ycombinator.ts
│   │   └── workatastartup.ts
│   └── utils.ts         # Utility functions
└── prisma/
    └── schema.prisma    # Database schema
```

## Features

- ✅ Modular scraper architecture
- ✅ Error handling (continues on failure)
- ✅ Duplicate detection via `upsert`
- ✅ Filterable dashboard (Work Mode, Role Level)
- ✅ Pagination
- ✅ Responsive design

## License

MIT

