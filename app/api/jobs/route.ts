import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workMode = searchParams.get('work_mode')
    const roleLevel = searchParams.get('role_level')
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

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: {
          posting_date: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ])

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

