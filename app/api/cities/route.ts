import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { STARTUP_HUBS } from '@/lib/startup-hubs'

// Counts change only when the scraper runs — cache for 5 minutes.
export const revalidate = 300

/**
 * Per-city active-job counts for the tracker's City View directory.
 *
 * Each city's count must equal the total the drill-in shows
 * (`/api/jobs?startup_hub=<city>` → `pagination.total`). That total is the SQL
 * count over `is_active = true` + the hub's `location ILIKE` patterns — it does
 * NOT subtract the post-query orphan/blacklist shrinkage (see the comment at
 * app/api/jobs/route.ts:372). So we count the same way: active roles whose
 * location matches the hub patterns, using the IDENTICAL sanitisation the jobs
 * route applies (strip [%_\\(),.], case-insensitive substring).
 *
 * A location can match several hubs (e.g. "Cambridge, MA" → Boston); it's
 * counted under each, because each hub's drill-in ORs only its own patterns.
 * Single light query (location only, paginated) — no joins, so no statement
 * timeout.
 */
const HUB_MATCHERS = STARTUP_HUBS.map(h => ({
  label: h.label,
  region: h.region,
  patterns: h.patterns.map(p => p.replace(/[%_\\(),.]/g, '').toLowerCase()).filter(Boolean),
}))

export async function GET() {
  try {
    const counts = new Map<string, number>()
    const PAGE = 1000

    for (let from = 0, iter = 0; iter < 30; from += PAGE, iter++) {
      const { data, error } = await supabase
        .from('tracker_roles')
        .select('location')
        .eq('is_active', true)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!data || data.length === 0) break

      for (const role of data as { location: string | null }[]) {
        const loc = (role.location || '').toLowerCase()
        if (!loc) continue
        for (const hub of HUB_MATCHERS) {
          if (hub.patterns.some(p => loc.includes(p))) {
            counts.set(hub.label, (counts.get(hub.label) || 0) + 1)
          }
        }
      }

      if (data.length < PAGE) break
    }

    // Preserve STARTUP_HUBS order (Europe then USA, curated); only count > 0.
    const cities = HUB_MATCHERS
      .filter(h => (counts.get(h.label) || 0) > 0)
      .map(h => ({ label: h.label, region: h.region, count: counts.get(h.label)! }))

    return NextResponse.json({ cities })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
