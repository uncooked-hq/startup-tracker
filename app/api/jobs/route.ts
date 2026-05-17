import { NextResponse } from 'next/server'
import { supabase, TrackerRoleWithSources } from '@/lib/supabase'
import { Job } from '@/lib/types'
import { parseSearch } from '@/lib/search-parser'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Count mode: 'exact' is expensive (full scan with filters) — only use it on
    // page 1 so the client learns the total once, then rely on "got fewer than
    // limit" to detect the end during infinite scroll.
    const countMode = page === 1 ? 'exact' : 'planned'

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

      // Build the broad search filter — searches every relevant text field
      // Uses the FULL raw query (so partial words like "londo" work) AND extracted parts
      const searchTerms = new Set<string>()
      // Only include the full raw query if we didn't pull out salary (otherwise "$100k engineer"
      // would try to ilike '$100k engineer' across text fields)
      if (!parsed.salary) {
        searchTerms.add(sanitize(raw))
      }

      // Also add extracted locations, companies, and text query as separate searches
      parsed.locations.forEach(l => searchTerms.add(sanitize(l)))
      parsed.companies.forEach(c => searchTerms.add(sanitize(c)))
      if (parsed.textQuery) {
        searchTerms.add(sanitize(parsed.textQuery))
      }

      // Build a single OR across all search terms × all text fields
      // This makes "londo" find London jobs, and matches across role/company/location/industry/source
      const orConditions: string[] = []
      for (const term of searchTerms) {
        if (!term || term.length < 2) continue
        orConditions.push(`role_title.ilike.%${term}%`)
        orConditions.push(`company_name.ilike.%${term}%`)
        orConditions.push(`location.ilike.%${term}%`)
        orConditions.push(`industry.ilike.%${term}%`)
        orConditions.push(`funding_stage.ilike.%${term}%`)
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
        }
      }
    }

    // Transform TrackerRole data to Job interface
    const jobs: Job[] = (trackerRoles as TrackerRoleWithSources[] || []).map(role => ({
      id: role.id,
      // Company info
      company: role.company_name,
      companyDomain: role.company_domain,
      industry: role.industry,
      fundingStage: role.funding_stage,

      // Role info
      role: role.role_title,
      roleLevel: role.role_level,
      type: role.role_type,
      workMode: role.work_mode,
      location: role.location,

      // Compensation
      salary: role.compensation_text,
      salaryMin: role.salary_min,
      salaryMax: role.salary_max,
      salaryCurrency: role.salary_currency,
      offersEquity: role.offers_equity,

      // Content
      description: role.company_description,
      roleDescription: role.role_description,

      // Sponsorship & funding
      offersSponsorship: (role as any).offers_sponsorship ?? null,
      fundingDetails: (role as any).funding_details ?? null,

      // Dates
      postedAt: role.posting_date ? new Date(role.posting_date) : null,
      closingDate: role.closing_date ? new Date(role.closing_date) : null,

      // Vibe check
      vibeCheck: (role as any).vibe_check || null,
      skills: (role as any).skills || null,

      // Status
      isActive: role.is_active,
      firstSeenAt: new Date(role.first_seen_at),
      lastSeenAt: new Date(role.last_seen_at),

      // Sources - sort by last_seen_at descending
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

      // Legacy fields for backward compatibility
      logo: undefined as string | undefined,
      requirements: [] as string[],
    }))

    return NextResponse.json({
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    // Log full error details
    console.error('Full error:', {
      message: errorMessage,
      stack: errorStack,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
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
