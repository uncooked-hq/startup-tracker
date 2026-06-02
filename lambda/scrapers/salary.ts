/**
 * Best-effort salary extraction from free-form job description text.
 *
 * Used by scrapers that don't get structured comp from their source API
 * (Greenhouse + Workable). Ashby has its own compensationTierSummary field
 * and doesn't need this.
 *
 * Two passes:
 *   1. Labeled range — "salary: $200K - $250K", "compensation range: $X-$Y"
 *   2. Bare currency range — "$200,000 - $250,000" anywhere in the body
 *
 * Labeled single values (no range) deliberately aren't extracted — too many
 * false positives with bonuses, equity numbers, funding amounts, etc.
 */

const RANGE_FRAGMENT = String.raw`[£€$]\s*[\d,.]+\s*[kKmM]?\s*-\s*[£€$]?\s*[\d,.]+\s*[kKmM]?(?:\s*(?:USD|GBP|EUR))?(?:\s*(?:per\s+year|annually|annual|\/yr|p\.a\.))?`

const LABELED_RANGE = new RegExp(
  String.raw`(?:base\s+(?:annual\s+)?salary|annual\s+(?:base\s+)?salary|salary(?:\s+range)?|compensation(?:\s+range)?|pay\s+range|comp\s+range|target\s+(?:base\s+)?(?:salary|comp))\s*(?:is|of)?[:\s]+(` + RANGE_FRAGMENT + ')',
  'i'
)

const BARE_RANGE = new RegExp('(' + RANGE_FRAGMENT + ')', 'i')

/**
 * Normalize a captured range for display: collapse whitespace, normalize dashes.
 * Returns null if the result is suspiciously short or doesn't actually contain a number.
 */
function cleanRange(raw: string): string | null {
  const cleaned = raw
    .replace(/[–—−]/g, '-') // en-dash, em-dash, minus → hyphen
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .trim()
  if (cleaned.length < 5 || !/\d/.test(cleaned)) return null
  return cleaned
}

export function extractSalaryFromBody(text: string | null | undefined): string | null {
  if (!text) return null
  // Normalize whitespace + dashes once up-front; both regexes use [\s] elsewhere.
  const normalized = text.replace(/[–—−]/g, '-').replace(/\s+/g, ' ')

  // Labeled range first — high confidence the captured number is actually pay.
  const labeled = normalized.match(LABELED_RANGE)
  if (labeled) return cleanRange(labeled[1])

  // Fallback: any "$X - $Y" pattern. Less precise but most job pages put pay
  // ranges in a section near the bottom; if there's a currency range at all
  // it's almost always compensation in this corpus.
  const bare = normalized.match(BARE_RANGE)
  if (bare) return cleanRange(bare[1])

  return null
}
