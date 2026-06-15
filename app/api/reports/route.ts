import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Neutral, company-agnostic reason buckets. Specifics live in the free-text
// explanation — the UI never labels a company.
const VALID_REASONS = new Set(['expired', 'compliance'])
const MAX_EXPLANATION = 1000

/**
 * POST /api/reports — submit a user report about a listing.
 *
 * Reports are stored as `pending` and reviewed before any action is taken; this
 * route NEVER touches tracker_roles, so submitting a report cannot deactivate a
 * listing. A listing is only deactivated when a report is approved via the
 * moderation CLI (lambda/moderate-reports.ts).
 */
export async function POST(request: Request) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const { jobId, reason, explanation, company, role, reporterContact } = body

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }
    if (typeof reason !== 'string' || !VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: 'reason must be "expired" or "compliance"' }, { status: 400 })
    }
    const text = typeof explanation === 'string' ? explanation.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'a short explanation is required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    // Provide id + timestamps explicitly so the insert works regardless of
    // whether the table has DB-level defaults (Prisma @default(uuid()/now()) are
    // applied client-side, not via Supabase's REST insert).
    const { error } = await supabase.from('tracker_reports').insert({
      id: crypto.randomUUID(),
      tracker_role_id: jobId,
      company_name: typeof company === 'string' ? company.slice(0, 200) : null,
      role_title: typeof role === 'string' ? role.slice(0, 200) : null,
      reason,
      explanation: text.slice(0, MAX_EXPLANATION),
      reporter_contact: typeof reporterContact === 'string' ? reporterContact.slice(0, 200) : null,
      status: 'pending',
      created_at: now,
      updated_at: now,
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
