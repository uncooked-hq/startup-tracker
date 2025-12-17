import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Job, JobSource } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workMode = searchParams.get('work_mode')
    const roleLevel = searchParams.get('role_level')
    const industry = searchParams.get('industry')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {
      is_active: true,
    }

    if (workMode && workMode !== 'all') {
      where.work_mode = workMode
    }

    if (roleLevel && roleLevel !== 'all') {
      where.role_level = roleLevel
    }

    if (industry && industry !== 'all') {
      where.industry = industry
    }

    // Add search filter
    if (search && search.trim()) {
      where.OR = [
        { company_name: { contains: search, mode: 'insensitive' } },
        { role_title: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [trackerRoles, total] = await Promise.all([
      prisma.trackerRole.findMany({
        where,
        include: {
          sources: {
            orderBy: {
              last_seen_at: 'desc',
            },
          },
        },
        orderBy: {
          last_seen_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.trackerRole.count({ where }),
    ])

    // Transform TrackerRole data to Job interface
    const jobs: Job[] = trackerRoles.map(role => ({
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
      
      // Dates
      postedAt: role.posting_date,
      closingDate: role.closing_date,
      
      // Status
      isActive: role.is_active,
      firstSeenAt: role.first_seen_at,
      lastSeenAt: role.last_seen_at,
      
      // Sources
      sources: role.sources.map(source => ({
        id: source.id,
        source: source.source,
        source_role_id: source.source_role_id,
        source_url: source.source_url,
        application_url: source.application_url,
        last_seen_at: source.last_seen_at,
        created_at: source.created_at,
      })),
      
      // Legacy fields for backward compatibility
      logo: undefined,
      requirements: [],
    }))

    return NextResponse.json({
      jobs: jobs || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
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
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
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

