import { NextResponse } from 'next/server'
import { supabase, TrackerRoleWithSources } from '@/lib/supabase'
import { Job } from '@/lib/types'
import { parseSearch } from '@/lib/search-parser'
import { isBlacklistedCompany } from '@/lib/company-blacklist'
import { findHub } from '@/lib/startup-hubs'

const REGION_MAP: Record<string, string[]> = {
  'UK & Ireland': ['United Kingdom', 'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Ireland', 'Dublin'],
  'Western Europe': ['France', 'Germany', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Paris', 'Berlin', 'Amsterdam', 'Munich', 'Zurich', 'Vienna', 'Brussels'],
  'Southern Europe': ['Spain', 'Portugal', 'Italy', 'Barcelona', 'Madrid', 'Lisbon', 'Milan', 'Rome'],
  'Nordics': ['Sweden', 'Norway', 'Denmark', 'Finland', 'Stockholm', 'Oslo', 'Copenhagen', 'Helsinki'],
  'Eastern Europe': ['Poland', 'Czech Republic', 'Romania', 'Estonia', 'Lithuania', 'Latvia', 'Warsaw', 'Prague'],
  'North America': ['United States', 'Canada', 'New York', 'San Francisco', 'Los Angeles', 'Seattle', 'Austin', 'Boston', 'Chicago', 'Toronto'],
  'Asia': ['India', 'Bangalore', 'Singapore', 'Japan', 'Tokyo'],
  'Remote': ['Remote'],
}

// Map a TrackerRole (+ its sources) row to the client-facing Job shape.
function mapRoleToJob(role: TrackerRoleWithSources): Job {
  return {
    id: role.id,
    company: role.company_name,
    companyDomain: role.company_domain,
    industry: role.industry,
    fundingStage: role.funding_stage,
    role: role.role_title,
    roleLevel: role.role_level,
    type: role.role_type,
    workMode: role.work_mode,
    location: role.location,
    salary: role.compensation_text,
    salaryMin: role.salary_min,
    salaryMax: role.salary_max,
    salaryCurrency: role.salary_currency,
    offersEquity: role.offers_equity,
    description: role.company_description,
    roleDescription: role.role_description,
    offersSponsorship: (role as any).offers_sponsorship ?? null,
    fundingDetails: (role as any).funding_details ?? null,
    fundingRound: (role as any).funding_round ?? null,
    backers: (role as any).backers ?? null,
    postedAt: role.posting_date ? new Date(role.posting_date) : null,
    closingDate: role.closing_date ? new Date(role.closing_date) : null,
    vibeCheck: (role as any).vibe_check || null,
    skills: (role as any).skills || null,
    isActive: role.is_active,
    firstSeenAt: new Date(role.first_seen_at),
    lastSeenAt: new Date(role.last_seen_at),
    sources: (role.tracker_role_sources || [])
      .sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime())
      .map(source => ({
        id: source.id,
        source: source.source,
        source_role_id: source.source_role_id,
        source_url: source.source_url,
        application_url: source.application_url,
        last_seen_at: new Date(source.last_seen_at),
        created_at: new Date(source.created_at),
      })),
    logo: undefined as string | undefined,
    requirements: [] as string[],
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workMode = searchParams.get('work_mode')  // single value or comma-separated
    const roleType = searchParams.get('role_type')  // single value or comma-separated
    const roleLevel = searchParams.get('role_level')
    const industry = searchParams.get('industry')
    const accelerator = searchParams.get('accelerator')
    const region = searchParams.get('region')
    const search = searchParams.get('search')
    const sponsorship = searchParams.get('sponsorship')
    const companyStage = searchParams.get('company_stage')
    const startupHub = searchParams.get('startup_hub')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Deep-link / share: fetch a single job by id (it may not be on page 1).
    const idParam = searchParams.get('id')
    if (idParam) {
      const { data, error: idErr } = await supabase
        .from('tracker_roles')
        .select(`*, tracker_role_sources (*)`)
        .eq('id', idParam)
        .limit(1)
      if (idErr) throw idErr
      const single = (data as TrackerRoleWithSources[] || [])
        .filter(role => (role.tracker_role_sources?.length ?? 0) > 0)
        .filter(role => !isBlacklistedCompany(role.company_name))
        .map(mapRoleToJob)
      return NextResponse.json({
        jobs: single,
        pagination: { page: 1, limit: 1, total: single.length, totalPages: 1 },
        hasMore: false,
      })
    }

    // Count mode picks per workload:
    //   - 'exact' is a full filtered scan. Only used for filter-only browsing on
    //     page 1 so the user sees a real total in the header.
    //   - 'estimated' uses Postgres planner stats — instant but approximate.
    //     Good enough for search + deep-paginated views where exactness doesn't matter.
    //   - 'planned' fallback for non-search page>1.
    const isSearching = !!(search && search.trim())
    const countMode: 'exact' | 'planned' | 'estimated' = isSearching
      ? 'estimated'
      : (page === 1 ? 'exact' : 'planned')

    // Build the query
    let query = supabase
      .from('tracker_roles')
      .select(`
        *,
        tracker_role_sources (*)
      `, { count: countMode })
      .eq('is_active', true)
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters (support comma-separated for multi-select)
    if (workMode && workMode !== 'all') {
      const modes = workMode.split(',').filter(Boolean)
      if (modes.length === 1) query = query.eq('work_mode', modes[0])
      else if (modes.length > 1) query = query.in('work_mode', modes)
    }

    if (roleLevel && roleLevel !== 'all') {
      // For Entry, also match titles containing intern/junior/graduate/entry
      // For Senior, also match titles containing senior/lead/principal/staff
      if (roleLevel === 'Entry') {
        query = query.or(
          `role_level.eq.Entry,role_title.ilike.%intern%,role_title.ilike.%junior%,role_title.ilike.%graduate%,role_title.ilike.%entry level%,role_title.ilike.%entry-level%`
        )
      } else if (roleLevel === 'Senior') {
        query = query.or(
          `role_level.eq.Senior,role_title.ilike.%senior%,role_title.ilike.% lead %,role_title.ilike.%lead,%,role_title.ilike.%principal%,role_title.ilike.%staff %`
        )
      } else {
        query = query.eq('role_level', roleLevel)
      }
    }

    if (roleType && roleType !== 'all') {
      const types = roleType.split(',').filter(Boolean)

      // For Internship, also match titles containing "intern"
      // For other types, match by role_type field
      const exactTypes = types.filter(t => t.toLowerCase() !== 'internship')
      const hasInternship = types.some(t => t.toLowerCase() === 'internship')

      if (hasInternship && exactTypes.length > 0) {
        // Both internship + other types: OR together
        const exactFilter = exactTypes.length === 1
          ? `role_type.eq.${exactTypes[0]}`
          : `role_type.in.(${exactTypes.join(',')})`
        query = query.or(`role_title.ilike.%intern%,${exactFilter}`)
      } else if (hasInternship) {
        // Only internship selected
        query = query.ilike('role_title', '%intern%')
      } else if (exactTypes.length === 1) {
        query = query.eq('role_type', exactTypes[0])
      } else if (exactTypes.length > 1) {
        query = query.in('role_type', exactTypes)
      }
    }

    if (industry && industry !== 'all') {
      query = query.eq('industry', industry)
    }

    if (accelerator && accelerator !== 'all') {
      query = query.ilike('funding_stage', `${accelerator}%`)
    }

    if (sponsorship === 'true') {
      query = query.eq('offers_sponsorship', true)
    }

    if (companyStage && companyStage !== 'all') {
      query = query.eq('funding_round', companyStage)
    }

    if (startupHub && startupHub !== 'all') {
      const hub = findHub(startupHub)
      if (hub) {
        const orClause = hub.patterns
          .map(p => `location.ilike.%${p.replace(/[%_\\(),.]/g, '')}%`)
          .join(',')
        query = query.or(orClause)
      }
    }

    if (region && region !== 'all' && REGION_MAP[region]) {
      const locations = REGION_MAP[region]
      if (region === 'Remote') {
        query = query.ilike('work_mode', 'Remote')
      } else {
        const locFilters = locations.map(l => `location.ilike.%${l}%`).join(',')
        query = query.or(locFilters)
      }
    }

    // Sanitize a string for use in Supabase ilike/or filter expressions
    const sanitize = (s: string) => s.replace(/[%_\\(),.]/g, '')

    // Natural language search
    if (search && search.trim()) {
      const raw = search.trim()
      const parsed = parseSearch(raw)

      // Apply structured filters ONLY if the parser is confident (matched a known dictionary value)
      // Otherwise fall through to broad text search
      if (parsed.workModes.length > 0 && !workMode) {
        query = query.in('work_mode', parsed.workModes)
      }
      if (parsed.roleLevels.length > 0 && !roleLevel) {
        query = query.in('role_level', parsed.roleLevels)
      }
      if (parsed.industries.length > 0 && !industry) {
        query = query.in('industry', parsed.industries)
      }
      if (parsed.roleTypes.length > 0 && !roleType) {
        const hasInternship = parsed.roleTypes.includes('Internship')
        const others = parsed.roleTypes.filter(t => t !== 'Internship')
        if (hasInternship && others.length > 0) {
          const otherFilter = others.length === 1
            ? `role_type.eq.${others[0]}`
            : `role_type.in.(${others.join(',')})`
          query = query.or(`role_title.ilike.%intern%,${otherFilter}`)
        } else if (hasInternship) {
          query = query.ilike('role_title', '%intern%')
        } else {
          query = query.in('role_type', others)
        }
      }

      // Salary criteria: apply as a strict filter when present.
      // A job matches if its structured salary range overlaps the user's criteria,
      // OR its compensation_text contains the salary token (for jobs without parsed salary).
      if (parsed.salary) {
        const { min, max, rawTokens } = parsed.salary
        const salaryOr: string[] = []

        // Structured salary matches
        if (min !== undefined && max !== undefined) {
          // Range overlap: job.max >= user.min AND job.min <= user.max
          salaryOr.push(`and(salary_max.gte.${min},salary_min.lte.${max})`)
        } else if (min !== undefined) {
          // Lower bound: job.max (or job.min when max is null) >= user.min
          salaryOr.push(`salary_max.gte.${min}`)
          salaryOr.push(`salary_min.gte.${min}`)
        } else if (max !== undefined) {
          // Upper bound: job.min <= user.max
          salaryOr.push(`salary_min.lte.${max}`)
          salaryOr.push(`salary_max.lte.${max}`)
        }

        // Text fallback for jobs with unparsed salary
        for (const tok of rawTokens) {
          const clean = sanitize(tok)
          if (clean.length >= 2) {
            salaryOr.push(`compensation_text.ilike.%${clean}%`)
          }
        }

        if (salaryOr.length > 0) {
          query = query.or(salaryOr.join(','))
        }
      }

      // Locations parsed from the query become a structured location filter
      // (much cheaper than broad ilike across 5 fields).
      if (parsed.locations.length > 0) {
        const locOr = parsed.locations
          .map(l => `location.ilike.%${sanitize(l)}%`)
          .join(',')
        if (locOr) query = query.or(locOr)
      }

      // Build the broad search filter — kept narrow to stay fast.
      // Cap at 3 terms × 3 columns = 9 OR conditions max.
      // We deliberately don't broad-search industry/funding_stage anymore — those
      // have dedicated filters and pulling them into a wildcard ilike both slowed
      // queries and produced noisy false-positive matches.
      const searchTerms: string[] = []
      const seen = new Set<string>()
      const pushTerm = (t: string | undefined | null) => {
        if (!t) return
        const clean = sanitize(t)
        if (clean.length < 2 || seen.has(clean)) return
        seen.add(clean)
        searchTerms.push(clean)
      }

      // Prefer the extracted text + companies over the raw query — they're tighter.
      // Raw is only added as a last resort (covers partial-typing cases like "londo").
      if (parsed.textQuery) pushTerm(parsed.textQuery)
      parsed.companies.forEach(pushTerm)
      // Locations are already applied above; don't double-search them.
      // Only fall back to the raw query when nothing else carried signal AND no salary
      // was parsed (raw with "$100k engineer" would be a junk ilike).
      if (searchTerms.length === 0 && !parsed.salary) pushTerm(raw)

      const capped = searchTerms.slice(0, 3)

      const orConditions: string[] = []
      for (const term of capped) {
        orConditions.push(`role_title.ilike.%${term}%`)
        orConditions.push(`company_name.ilike.%${term}%`)
        orConditions.push(`location.ilike.%${term}%`)
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','))
      }
    }

    let { data: trackerRoles, error, count } = await query

    if (error) {
      throw error
    }

    let total = count || 0
    // Raw page size BEFORE post-filtering (orphans / blacklist). This is the
    // authoritative "is there a next page?" signal — post-filter length can
    // shrink and would falsely tell the client "no more results".
    let rawBatchSize = trackerRoles?.length ?? 0

    // Fuzzy fallback: if a search query returned nothing, try trigram similarity
    if (search && search.trim() && total === 0) {
      const { data: fuzzyIds } = await supabase
        .rpc('search_jobs_fuzzy', { search_query: search.trim() })

      if (fuzzyIds && fuzzyIds.length > 0) {
        const ids = fuzzyIds.map((r: { id: string }) => r.id).slice(0, 200)

        let fuzzyQuery = supabase
          .from('tracker_roles')
          .select(`*, tracker_role_sources (*)`, { count: 'exact' })
          .in('id', ids)
          .eq('is_active', true)
          .order('last_seen_at', { ascending: false })
          .range(offset, offset + limit - 1)

        const fuzzyResult = await fuzzyQuery
        if (!fuzzyResult.error) {
          trackerRoles = fuzzyResult.data
          total = fuzzyResult.count || 0
          rawBatchSize = fuzzyResult.data?.length ?? 0
        }
      }
    }

    // Transform TrackerRole data to Job interface.
    // Filter out:
    //  - orphaned roles with no source children (no application_url → broken modal)
    //  - blacklisted companies (PMCs / defense primes) that survived past upserts
    const jobs: Job[] = (trackerRoles as TrackerRoleWithSources[] || [])
      .filter(role => (role.tracker_role_sources?.length ?? 0) > 0)
      .filter(role => !isBlacklistedCompany(role.company_name))
      .map(mapRoleToJob)

    return NextResponse.json({
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      // Authoritative next-page signal. Based on the RAW Supabase fetch size,
      // not the post-filter jobs.length — orphan/blacklist filtering can shrink
      // the returned page and would otherwise tell the client "no more results"
      // when there are still many pages left.
      hasMore: rawBatchSize >= limit,
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    // Log full error details
    console.error('Full error:', {
      message: errorMessage,
      stack: errorStack,
      supabaseUrl: process.env.SUPABASE_URL ? 'Set' : 'Not set',
    })

    return NextResponse.json(
      {
        error: 'Failed to fetch jobs',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    )
  }
}
