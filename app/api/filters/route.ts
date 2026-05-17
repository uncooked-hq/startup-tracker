import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('tracker_roles')
    .select('industry')
    .eq('is_active', true)
    .not('industry', 'is', null)
    .neq('industry', '')

  if (error) {
    return NextResponse.json({ industries: [] })
  }

  const industries = Array.from(
    new Set((data || []).map(r => r.industry as string))
  ).sort()

  return NextResponse.json({ industries })
}
