import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Lightweight count endpoint for the landing-page hero. Uses head:true so
// Supabase returns just the count and no row data.
export async function GET() {
  const { count, error } = await supabase
    .from('tracker_roles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
