# Supabase Integration - Frontend Connection

## Overview
The frontend has been successfully connected to the Supabase database, reading from both `job_tracker.tracker_role_sources` and `job_tracker.tracker_roles` tables.

## Changes Made

### 1. Updated Type Definitions (`lib/types.ts`)
- **New `JobSource` interface**: Represents a job listing from a specific platform
- **Updated `Job` interface**: Now matches the `TrackerRole` schema with:
  - Company information (name, domain, industry, funding stage)
  - Role details (title, level, type, work mode, location)
  - Compensation (text, min/max salary, currency, equity)
  - Content (company description, role description)
  - Dates (posted, closing, first/last seen)
  - Status tracking (is_active, timestamps)
  - **Sources array**: Multiple platforms where the job is listed

### 2. Updated API Route (`app/api/jobs/route.ts`)
- Now queries `TrackerRole` table with `include: { sources: true }`
- Supports filtering by:
  - `work_mode`: Filter by work mode (Remote, Hybrid, Onsite)
  - `role_level`: Filter by seniority level
  - `industry`: Filter by industry
  - `search`: Full-text search across company name, role title, and industry
- Returns paginated results with job sources
- Transforms database schema to frontend `Job` interface

### 3. Updated JobTracker Component (`app/components/JobTracker/JobTracker.tsx`)
- **Removed mock data dependency**: Now fetches real data from API
- **Added API state management**:
  - Loading state with spinner
  - Error handling with retry option
  - Pagination support
- **Server-side filtering**: Search and industry filters hit the API
- **Client-side filtering**: Type and mode filters for better UX
- **Debounced search**: Prevents excessive API calls

### 4. Updated JobCard Component (`app/components/JobTracker/JobCard.tsx`)
- Added `formatTimeAgo()` helper for relative timestamps
- Added `getCompanyInitial()` helper for fallback logos
- Handles optional fields gracefully (location, type, workMode)
- Uses `lastSeenAt` as fallback for `postedAt`

### 5. Updated JobTable Component (`app/components/JobTracker/JobTable.tsx`)
- Added company initial fallback for missing logos
- Displays "—" for missing optional fields
- Maintains sorting functionality

### 6. Updated JobModal Component (`app/components/JobTracker/JobModal.tsx`)
- **Enhanced information display**:
  - Shows role level, funding stage, equity availability
  - Separate sections for company and role descriptions
  - Formatted salary ranges (min-max with currency)
- **Sources section**: 
  - Lists all platforms where job is available
  - Shows last seen date for each source
  - Direct links to application pages
- **Smart apply button**: Links to primary source application URL

## Database Schema Used

### TrackerRole (tracker_roles)
```prisma
model TrackerRole {
  id                   String   @id @default(uuid())
  company_name         String
  company_domain       String?
  industry             String?
  funding_stage        String?
  role_title           String
  role_level           String?
  role_type            String?
  work_mode            String?
  location             String?
  compensation_text    String?
  salary_min           Int?
  salary_max           Int?
  salary_currency      String?
  offers_equity        Boolean?
  company_description  String?
  role_description     String?
  posting_date         DateTime?
  closing_date         DateTime?
  is_active            Boolean   @default(true)
  first_seen_at        DateTime  @default(now())
  last_seen_at         DateTime  @default(now())
  sources              TrackerRoleSource[]
}
```

### TrackerRoleSource (tracker_role_sources)
```prisma
model TrackerRoleSource {
  id                String   @id @default(uuid())
  tracker_role_id   String
  tracker_role      TrackerRole @relation(...)
  source            String
  source_role_id    String
  source_url        String
  application_url   String
  last_seen_at      DateTime
  last_scraped_at   DateTime
  scrape_status     String
  raw_payload       Json?
}
```

## API Endpoints

### GET /api/jobs
**Query Parameters:**
- `page` (default: 1): Page number for pagination
- `limit` (default: 50): Number of results per page
- `work_mode`: Filter by work mode (Remote, Hybrid, Onsite, or 'all')
- `role_level`: Filter by seniority level (or 'all')
- `industry`: Filter by industry (or 'all')
- `search`: Search term for company name, role title, or industry

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "company": "Company Name",
      "role": "Role Title",
      "location": "Location",
      "type": "Full-time",
      "workMode": "Remote",
      "salary": "$100k - $150k",
      "industry": "Tech",
      "sources": [
        {
          "id": "uuid",
          "source": "YCombinator",
          "application_url": "https://...",
          "last_seen_at": "2024-01-01T00:00:00Z"
        }
      ],
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Features

### Multi-Source Job Aggregation
- Jobs can appear on multiple platforms (YC, Wellfound, etc.)
- Each source is tracked separately with its own application URL
- Users can see all platforms where a job is listed
- Deduplication handled at the database level via `TrackerRole`

### Smart Filtering
- **Server-side**: Search and industry (reduces data transfer)
- **Client-side**: Type and mode (instant feedback)
- Filters work together for precise job discovery

### Loading States
- Spinner with branded animation during data fetch
- Error handling with retry functionality
- Empty state with clear call-to-action

### Responsive Design
- Grid and table view modes
- Mobile-friendly modal dialogs
- Smooth animations and transitions

## Next Steps

1. **Add pagination controls**: UI for navigating between pages
2. **Implement debounced search**: Reduce API calls during typing
3. **Add saved jobs**: Allow users to bookmark opportunities
4. **Application tracking**: Track which jobs users have applied to
5. **Email alerts**: Notify users of new jobs matching their criteria
6. **Advanced filters**: Salary range, equity, funding stage, etc.

## Testing

To test the integration:
1. Ensure Supabase database is populated with job data
2. Start the development server: `npm run dev`
3. Navigate to the job tracker section
4. Try different filters and search terms
5. Click on jobs to view details and sources
6. Verify all data displays correctly

## Environment Variables Required

```env
DATABASE_URL="postgresql://..."
```

The connection string should point to your Supabase PostgreSQL database with the `job_tracker` schema.

