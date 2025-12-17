# Next.js Project Structure

## ✅ Properly Configured Next.js App Router Setup

### Project Structure

```
startup-tracker/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── jobs/route.ts
│   │   ├── scrape/route.ts
│   │   └── test-db/route.ts
│   ├── components/               # App-specific components
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── Navbar.tsx
│   │   └── JobTracker/
│   │       ├── FilterBar.tsx
│   │       ├── JobCard.tsx
│   │       ├── JobModal.tsx
│   │       ├── JobTable.tsx
│   │       └── JobTracker.tsx
│   ├── layout.tsx                # Root layout (required)
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # Shared UI components
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── table.tsx
│       └── select.tsx
├── lib/                          # Shared utilities
│   ├── data/
│   │   └── mockJobs.ts
│   ├── scrapers/
│   │   └── ... (scraper files)
│   ├── types.ts                  # TypeScript types
│   ├── utils.ts                  # Utility functions
│   └── prisma.ts                 # Database client
├── public/                       # Static assets
│   └── logo-uncooked.png
├── prisma/
│   └── schema.prisma
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json
```

## Key Configuration Files

### 1. `app/layout.tsx` (Root Layout)
- Required for Next.js App Router
- Wraps all pages with `<html>` and `<body>` tags
- Imports global CSS

### 2. `app/page.tsx` (Home Page)
- Main landing page component
- Uses `'use client'` directive for client-side interactivity
- Replaces the old `App.tsx` pattern

### 3. `app/globals.css`
- Tailwind directives
- CSS variables for theming (dark mode by default)
- Custom utilities (animations, shadows, scrollbar hiding)
- Brand colors configured

### 4. `tailwind.config.ts`
- Content paths configured for app/ and components/
- Custom brand colors:
  - `brand`: #FF6B35 (orange)
  - `brand-hover`: #FF5722
  - `dark-bg`: #000000
  - `dark-input`: #0A0A0A
- Dark mode theme as default

### 5. `tsconfig.json`
- Path alias `@/*` points to root directory
- Enables Next.js plugin
- Proper module resolution

## Import Conventions

All imports use the `@/` path alias:

```typescript
// Components
import { Button } from '@/components/ui/button'
import { Navbar } from './components/Navbar'  // relative for app/ components

// Types
import { Job, FilterState } from '@/lib/types'

// Data
import { mockJobs } from '@/lib/data/mockJobs'

// Utils
import { cn } from '@/lib/utils'
```

## Running the Project

```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm run start

# Database commands
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:seed       # Seed database

# Scraping
npm run scrape        # Run all scrapers
```

## What Changed

### ✅ Removed
- `app/App.tsx` (not needed in App Router)
- `app/vite.config.ts` (using Next.js)
- `app/index.html` (Next.js handles this)
- `app/index.tsx` (entry point not needed)
- `app/package.json` (using root package.json)
- `app/tsconfig.json` (using root tsconfig.json)
- `app/data/` (moved to lib/data/)

### ✅ Added
- `app/page.tsx` (main landing page)
- `app/layout.tsx` (root layout)
- `components/ui/` (shadcn components at root)
- Custom Tailwind utilities and animations

### ✅ Moved
- `app/lib/` → `lib/` (shared utilities)
- `app/public/` → `public/` (static assets)
- `app/data/` → `lib/data/` (mock data)

### ✅ Updated
- All imports to use `@/` path aliases
- Component imports to reference correct locations
- Tailwind config with brand colors
- Global CSS with dark theme and custom utilities

## Next Steps

1. Run `npm install` to ensure all dependencies are installed
2. Run `npm run dev` to start the development server
3. Visit `http://localhost:3000` to see your app
4. The app should now work with proper Next.js conventions!

## Notes

- Everything follows Next.js App Router best practices
- Components are organized by scope (app-specific vs shared)
- All paths use the `@/` alias for clean imports
- Dark theme is configured as default
- Custom animations and utilities are available

