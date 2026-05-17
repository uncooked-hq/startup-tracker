import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET — fetch all saved job IDs for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const jobIds = (data || []).map(d => d.job_id)

  // Verify which jobs still exist and are active
  if (jobIds.length > 0) {
    const { data: existing } = await supabase
      .from('tracker_roles')
      .select('id')
      .in('id', jobIds)
      .eq('is_active', true)

    const existingSet = new Set((existing || []).map(r => r.id))
    const validIds = jobIds.filter(id => existingSet.has(id))

    // Clean up orphaned saved_jobs entries
    const orphaned = jobIds.filter(id => !existingSet.has(id))
    if (orphaned.length > 0) {
      await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', userId)
        .in('job_id', orphaned)
    }

    return NextResponse.json({ savedJobIds: validIds })
  }

  return NextResponse.json({ savedJobIds: [] })
}

// POST — save or unsave a job
export async function POST(request: Request) {
  try {
    const { userId, jobId, action } = await request.json()

    if (!userId || !jobId || !action) {
      return NextResponse.json({ error: 'userId, jobId, and action required' }, { status: 400 })
    }

    if (action === 'save') {
      const { error } = await supabase
        .from('saved_jobs')
        .upsert({ user_id: userId, job_id: jobId }, { onConflict: 'user_id,job_id' })

      if (error) throw error
      return NextResponse.json({ success: true, saved: true })
    }

    if (action === 'unsave') {
      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', userId)
        .eq('job_id', jobId)

      if (error) throw error
      return NextResponse.json({ success: true, saved: false })
    }

    return NextResponse.json({ error: 'action must be "save" or "unsave"' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
