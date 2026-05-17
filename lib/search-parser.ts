/**
 * Natural language search parser.
 * Extracts structured filters from queries like:
 *   "remote software jobs in germany"
 *   "fintech internships in london"
 *   "senior engineer at stripe"
 *   "entry level design roles"
 */

export interface ParsedSearch {
  // Remaining text to fuzzy-match against role_title / company_name
  textQuery: string
  // Extracted structured filters
  locations: string[]
  workModes: string[]    // Remote, Hybrid, Onsite
  roleTypes: string[]    // Full-time, Internship, Contract, Part-time
  roleLevels: string[]   // Senior, Mid, Entry
  industries: string[]
  companies: string[]    // extracted from "at <company>"
  salary?: ParsedSalary  // extracted salary criteria
}

export interface ParsedSalary {
  min?: number           // numeric floor in base units (e.g. 100000)
  max?: number           // numeric ceiling
  currency?: string      // USD, GBP, EUR if detected
  rawTokens: string[]    // substrings used (for text-fallback matching like "100k")
}

// ---- Dictionaries ----

const WORK_MODES: Record<string, string> = {
  'remote': 'Remote',
  'hybrid': 'Hybrid',
  'onsite': 'Onsite',
  'on-site': 'Onsite',
  'on site': 'Onsite',
  'in-office': 'Onsite',
  'office': 'Onsite',
  'wfh': 'Remote',
  'work from home': 'Remote',
}

const ROLE_TYPES: Record<string, string> = {
  'internship': 'Internship',
  'internships': 'Internship',
  'intern': 'Internship',
  'interns': 'Internship',
  'full-time': 'Full-time',
  'full time': 'Full-time',
  'fulltime': 'Full-time',
  'part-time': 'Part-time',
  'part time': 'Part-time',
  'parttime': 'Part-time',
  'contract': 'Contract',
  'contractor': 'Contract',
  'freelance': 'Freelance',
}

const ROLE_LEVELS: Record<string, string> = {
  'senior': 'Senior',
  'sr': 'Senior',
  'lead': 'Senior',
  'principal': 'Senior',
  'staff': 'Senior',
  'junior': 'Entry',
  'jr': 'Entry',
  'entry level': 'Entry',
  'entry-level': 'Entry',
  'graduate': 'Entry',
  'grad': 'Entry',
  'mid': 'Mid',
  'mid-level': 'Mid',
  'mid level': 'Mid',
}

const INDUSTRIES: Record<string, string> = {
  'fintech': 'Fintech',
  'fin-tech': 'Fintech',
  'finance': 'Fintech',
  'healthtech': 'HealthTech',
  'health tech': 'HealthTech',
  'healthcare': 'HealthTech',
  'ai': 'AI/ML',
  'ai/ml': 'AI/ML',
  'machine learning': 'AI/ML',
  'artificial intelligence': 'AI/ML',
  'saas': 'SaaS',
  'devtools': 'DevTools',
  'developer tools': 'DevTools',
  'cybersecurity': 'Cybersecurity',
  'security': 'Cybersecurity',
  'e-commerce': 'E-commerce',
  'ecommerce': 'E-commerce',
  'logistics': 'Logistics',
  'energy': 'Energy',
  'cleantech': 'Energy',
  'climate': 'Energy',
  'blockchain': 'Blockchain',
  'crypto': 'Blockchain',
  'web3': 'Blockchain',
  'gaming': 'Gaming',
  'robotics': 'Robotics',
  'space': 'Space',
  'aerospace': 'Space',
  'defence': 'Defence',
  'defense': 'Defence',
  'data': 'Data',
  'analytics': 'Data',
  'cloud': 'Cloud',
  'edtech': 'Education',
  'education': 'Education',
  'hr': 'HR',
  'hrtech': 'HR',
  'marketing': 'Marketing',
  'adtech': 'Marketing',
  'design': 'Design',
  'travel': 'Travel',
  'real estate': 'Real Estate',
  'proptech': 'Real Estate',
}

// Countries and major cities
const LOCATIONS: Record<string, string> = {
  // Countries
  'uk': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'england': 'United Kingdom',
  'britain': 'United Kingdom',
  'germany': 'Germany',
  'deutschland': 'Germany',
  'france': 'France',
  'spain': 'Spain',
  'netherlands': 'Netherlands',
  'holland': 'Netherlands',
  'ireland': 'Ireland',
  'sweden': 'Sweden',
  'norway': 'Norway',
  'denmark': 'Denmark',
  'finland': 'Finland',
  'poland': 'Poland',
  'italy': 'Italy',
  'portugal': 'Portugal',
  'switzerland': 'Switzerland',
  'austria': 'Austria',
  'belgium': 'Belgium',
  'czech republic': 'Czech Republic',
  'czechia': 'Czech Republic',
  'romania': 'Romania',
  'estonia': 'Estonia',
  'us': 'United States',
  'usa': 'United States',
  'united states': 'United States',
  'america': 'United States',
  'canada': 'Canada',
  'india': 'India',
  // Major cities
  'london': 'London',
  'berlin': 'Berlin',
  'paris': 'Paris',
  'amsterdam': 'Amsterdam',
  'dublin': 'Dublin',
  'stockholm': 'Stockholm',
  'copenhagen': 'Copenhagen',
  'munich': 'Munich',
  'barcelona': 'Barcelona',
  'madrid': 'Madrid',
  'lisbon': 'Lisbon',
  'zurich': 'Zurich',
  'vienna': 'Vienna',
  'warsaw': 'Warsaw',
  'prague': 'Prague',
  'milan': 'Milan',
  'rome': 'Rome',
  'brussels': 'Brussels',
  'helsinki': 'Helsinki',
  'oslo': 'Oslo',
  'new york': 'New York',
  'san francisco': 'San Francisco',
  'sf': 'San Francisco',
  'nyc': 'New York',
  'la': 'Los Angeles',
  'los angeles': 'Los Angeles',
  'seattle': 'Seattle',
  'austin': 'Austin',
  'boston': 'Boston',
  'chicago': 'Chicago',
  'toronto': 'Toronto',
  'bangalore': 'Bangalore',
}

// Filler words to strip
const FILLER = new Set([
  'jobs', 'job', 'roles', 'role', 'positions', 'position',
  'opportunities', 'opportunity', 'openings', 'opening',
  'give', 'me', 'show', 'find', 'get', 'list', 'search',
  'looking', 'for', 'i', 'want', 'need', 'the', 'a', 'an',
  'some', 'any', 'all', 'please', 'can', 'you',
  'with', 'that', 'are', 'is', 'based',
])

// Prepositions that signal what follows (location, company)
const LOCATION_PREPS = new Set(['in', 'near', 'around', 'from', 'based in'])
const COMPANY_PREPS = new Set(['at', 'from'])

// ---- Salary parsing ----

const CURRENCY_MAP: Record<string, string> = {
  '$': 'USD', 'usd': 'USD', 'dollar': 'USD', 'dollars': 'USD',
  '£': 'GBP', 'gbp': 'GBP', 'pound': 'GBP', 'pounds': 'GBP',
  '€': 'EUR', 'eur': 'EUR', 'euro': 'EUR', 'euros': 'EUR',
}

// Parse a numeric amount with optional k/m suffix. "100" -> 100, "100k" -> 100000, "1.5m" -> 1500000
function parseAmount(raw: string): number | null {
  const clean = raw.replace(/[,\s$£€]/g, '').toLowerCase()
  const m = clean.match(/^(\d+(?:\.\d+)?)(k|m)?$/)
  if (!m) return null
  let n = parseFloat(m[1])
  if (m[2] === 'k') n *= 1_000
  else if (m[2] === 'm') n *= 1_000_000
  // If no suffix and number is small, assume k (e.g. "100" in a salary context = $100k)
  else if (n < 1000) n *= 1_000
  return Math.round(n)
}

function detectCurrency(text: string): string | undefined {
  if (/£/.test(text) || /\bgbp\b|\bpound(s)?\b/i.test(text)) return 'GBP'
  if (/€/.test(text) || /\beur(o|os)?\b/i.test(text)) return 'EUR'
  if (/\$/.test(text) || /\busd\b|\bdollar(s)?\b/i.test(text)) return 'USD'
  return undefined
}

/**
 * Extract salary criteria from the query text.
 * Supports: "$100k", "100k+", "over 100k", "80-120k", "$80k-$120k", "£80,000",
 *          "between 80 and 120k", "under 150k", "at least 100k".
 * Returns the salary info + the text with salary expressions stripped.
 */
function extractSalary(text: string): { salary?: ParsedSalary; rest: string } {
  const tokens: string[] = []
  let min: number | undefined
  let max: number | undefined
  const currency = detectCurrency(text)
  let rest = text

  // Order matters: match ranges first, then bounded (over/under), then bare numbers

  // Range: "80-120k", "$80k-$120k", "80k to 120k", "between 80 and 120k"
  const rangePatterns = [
    /(?:between\s+)?[£€$]?\s*(\d+(?:[,.]\d+)?)\s*(?:k|m)?\s*(?:-|to|and)\s*[£€$]?\s*(\d+(?:[,.]\d+)?)\s*(k|m)?/i,
  ]
  for (const p of rangePatterns) {
    const m = rest.match(p)
    if (m) {
      const suffix = m[3] || ''
      const a = parseAmount(m[1] + suffix)
      const b = parseAmount(m[2] + suffix)
      if (a !== null && b !== null && a < b && a >= 10_000 && b <= 10_000_000) {
        min = a
        max = b
        tokens.push(m[0].trim())
        rest = rest.replace(m[0], ' ')
        break
      }
    }
  }

  // Lower bound: "over 100k", "above 100k", "at least 100k", "more than 100k", "100k+", "100k plus"
  if (min === undefined) {
    const lowerPatterns = [
      /(?:over|above|at\s+least|more\s+than|minimum|min\.?|starting\s+at)\s+[£€$]?\s*(\d+(?:[,.]\d+)?)\s*(k|m)?/i,
      /[£€$]?\s*(\d+(?:[,.]\d+)?)\s*(k|m)?\s*(?:\+|plus|or\s+more|and\s+up)/i,
    ]
    for (const p of lowerPatterns) {
      const m = rest.match(p)
      if (m) {
        const amt = parseAmount(m[1] + (m[2] || ''))
        if (amt !== null && amt >= 10_000 && amt <= 10_000_000) {
          min = amt
          tokens.push(m[0].trim())
          rest = rest.replace(m[0], ' ')
          break
        }
      }
    }
  }

  // Upper bound: "under 100k", "below 100k", "less than 100k", "up to 100k", "max 100k"
  if (max === undefined) {
    const upperPatterns = [
      /(?:under|below|less\s+than|up\s+to|maximum|max\.?|at\s+most)\s+[£€$]?\s*(\d+(?:[,.]\d+)?)\s*(k|m)?/i,
    ]
    for (const p of upperPatterns) {
      const m = rest.match(p)
      if (m) {
        const amt = parseAmount(m[1] + (m[2] || ''))
        if (amt !== null && amt >= 10_000 && amt <= 10_000_000) {
          max = amt
          tokens.push(m[0].trim())
          rest = rest.replace(m[0], ' ')
          break
        }
      }
    }
  }

  // Bare salary with currency symbol: "$100k", "£80,000", "€100k"
  if (min === undefined && max === undefined) {
    const bare = rest.match(/([£€$])\s*(\d+(?:[,.]\d+)?)\s*(k|m)?/i)
    if (bare) {
      const amt = parseAmount(bare[2] + (bare[3] || ''))
      if (amt !== null && amt >= 10_000 && amt <= 10_000_000) {
        min = amt
        tokens.push(bare[0].trim())
        rest = rest.replace(bare[0], ' ')
      }
    }
  }

  // Bare "Nk" anywhere (e.g. "100k jobs in london") — interpret as minimum
  if (min === undefined && max === undefined) {
    const bareK = rest.match(/\b(\d+(?:\.\d+)?)\s*k\b/i)
    if (bareK) {
      const amt = parseAmount(bareK[1] + 'k')
      if (amt !== null && amt >= 10_000 && amt <= 10_000_000) {
        min = amt
        tokens.push(bareK[0].trim())
        rest = rest.replace(bareK[0], ' ')
      }
    }
  }

  // Strip remaining currency words/symbols if we matched a salary
  if (tokens.length > 0) {
    rest = rest.replace(/[£€$]/g, ' ')
      .replace(/\b(usd|gbp|eur|euros?|pounds?|dollars?)\b/gi, ' ')
      .replace(/\b(per\s+year|annually|a\s+year|yearly|pa|p\.a\.)\b/gi, ' ')
      .replace(/\bsalary\b/gi, ' ')
    rest = rest.replace(/\s+/g, ' ').trim()
  }

  if (min === undefined && max === undefined) {
    return { rest }
  }

  return {
    rest,
    salary: { min, max, currency, rawTokens: tokens },
  }
}

export function parseSearch(raw: string): ParsedSearch {
  const result: ParsedSearch = {
    textQuery: '',
    locations: [],
    workModes: [],
    roleTypes: [],
    roleLevels: [],
    industries: [],
    companies: [],
  }

  if (!raw || !raw.trim()) return result

  let text = raw.toLowerCase().trim()

  // --- Pass 0: Extract salary expressions first (before location/industry matching) ---
  const salaryResult = extractSalary(text)
  if (salaryResult.salary) {
    result.salary = salaryResult.salary
    text = salaryResult.rest
  }

  // --- Pass 1: Extract "at <company>" patterns ---
  const atMatch = text.match(/\bat\s+([a-z][\w\s]*?)(?:\s+(?:in|near|for|with)\b|$)/i)
  if (atMatch) {
    const possibleCompany = atMatch[1].trim()
    // Only treat as company if it's not a known location/industry/etc
    if (!LOCATIONS[possibleCompany] && !INDUSTRIES[possibleCompany] && !WORK_MODES[possibleCompany]) {
      result.companies.push(possibleCompany)
      text = text.replace(atMatch[0], ' ').trim()
    }
  }

  // Job-related words that, when following an industry keyword, mean the user is
  // searching for a job title (e.g. "data scientist") not filtering by industry
  const JOB_TITLE_WORDS = new Set([
    'engineer', 'developer', 'scientist', 'analyst', 'manager', 'designer',
    'architect', 'lead', 'director', 'coordinator', 'specialist', 'consultant',
    'advisor', 'researcher', 'associate', 'officer', 'rep', 'representative',
    'ops', 'operations', 'platform', 'infrastructure', 'product',
    'science', 'engineering', 'development', 'support', 'success',
  ])

  // --- Pass 2: Extract multi-word matches first (longest match wins) ---
  // Sort dictionary keys by length descending so "entry level" matches before "entry"
  type ArrayKeys = 'locations' | 'industries' | 'workModes' | 'roleTypes' | 'roleLevels'
  const allDicts: Array<{ dict: Record<string, string>; target: ArrayKeys }> = [
    { dict: LOCATIONS, target: 'locations' },
    { dict: INDUSTRIES, target: 'industries' },
    { dict: WORK_MODES, target: 'workModes' },
    { dict: ROLE_TYPES, target: 'roleTypes' },
    { dict: ROLE_LEVELS, target: 'roleLevels' },
  ]

  for (const { dict, target } of allDicts) {
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length)
    for (const key of keys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'i')
      const match = text.match(regex)
      if (match) {
        // For industry keywords, check if followed by a job-title word
        // e.g. "data scientist" → keep as text, "data jobs in london" → extract "data"
        if (target === 'industries') {
          const afterMatch = text.slice((match.index || 0) + match[0].length).trim()
          const nextWord = afterMatch.split(/\s+/)[0]?.toLowerCase()
          if (nextWord && JOB_TITLE_WORDS.has(nextWord)) {
            continue // Skip — this is part of a job title
          }
        }

        const arr = result[target] as string[]
        const val = dict[key]
        if (!arr.includes(val)) {
          arr.push(val)
        }
        text = text.replace(regex, ' ').trim()
      }
    }
  }

  // --- Pass 3: Strip location prepositions and filler words ---
  const words = text.split(/\s+/).filter(w => {
    if (FILLER.has(w)) return false
    if (LOCATION_PREPS.has(w)) return false
    if (COMPANY_PREPS.has(w)) return false
    return true
  })

  result.textQuery = words.join(' ').replace(/\s+/g, ' ').trim()

  return result
}
