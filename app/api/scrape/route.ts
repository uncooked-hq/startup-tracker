import { NextResponse } from 'next/server'
import { runScrapers } from '@/lib/scrapers/runner'

export async function POST(request: Request) {
  try {
    // Run scrapers in background
    runScrapers().catch(console.error)
    
    return NextResponse.json({ 
      message: 'Scraper run initiated',
      status: 'started'
    })
  } catch (error) {
    console.error('Error initiating scraper run:', error)
    return NextResponse.json(
      { error: 'Failed to initiate scraper run' },
      { status: 500 }
    )
  }
}

