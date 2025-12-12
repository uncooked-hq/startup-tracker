import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'

export async function GET() {
  try {
    // Test database connection
    const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db'
    const cwd = process.cwd()
    
    const testInfo = {
      databaseUrl: dbUrl,
      cwd: cwd,
      dbPath: dbUrl.startsWith('file:') ? dbUrl.replace('file:', '') : 'N/A',
      absolutePath: dbUrl.startsWith('file:./') 
        ? path.join(cwd, dbUrl.replace('file:', ''))
        : dbUrl,
    }

    // Try to connect
    await prisma.$connect()
    
    // Try a simple query
    const count = await prisma.job.count()
    
    return NextResponse.json({
      success: true,
      connection: 'OK',
      jobCount: count,
      testInfo,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack,
      databaseUrl: process.env.DATABASE_URL,
      cwd: process.cwd(),
    }, { status: 500 })
  }
}

