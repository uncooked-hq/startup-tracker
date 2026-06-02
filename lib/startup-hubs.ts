/**
 * Curated list of startup hubs for the Startup Hub filter.
 *
 * `patterns` are case-insensitive substrings matched against role.location.
 * Compound hubs (Silicon Valley, Boston, Denver/Boulder) include multiple
 * underlying city names so a single user click covers the whole metro.
 */

export type HubRegion = 'Europe' | 'USA'

export interface StartupHub {
  label: string         // display name in the dropdown
  region: HubRegion
  patterns: string[]    // ilike fragments OR'd against location
}

export const STARTUP_HUBS: StartupHub[] = [
  // 🇪🇺 Europe
  { label: 'London',      region: 'Europe', patterns: ['London'] },
  { label: 'Paris',       region: 'Europe', patterns: ['Paris'] },
  { label: 'Berlin',      region: 'Europe', patterns: ['Berlin'] },
  { label: 'Stockholm',   region: 'Europe', patterns: ['Stockholm'] },
  { label: 'Amsterdam',   region: 'Europe', patterns: ['Amsterdam'] },
  { label: 'Munich',      region: 'Europe', patterns: ['Munich', 'München'] },
  { label: 'Zurich',      region: 'Europe', patterns: ['Zurich', 'Zürich'] },
  // UK Cambridge — kept distinct from Boston (which folds in US Cambridge, MA).
  // Best-effort match: location text usually carries the country suffix.
  { label: 'Cambridge, UK', region: 'Europe', patterns: ['Cambridge, UK', 'Cambridge, United Kingdom'] },
  { label: 'Oxford',      region: 'Europe', patterns: ['Oxford'] },
  { label: 'Edinburgh',   region: 'Europe', patterns: ['Edinburgh'] },
  { label: 'Manchester',  region: 'Europe', patterns: ['Manchester'] },
  { label: 'Dublin',      region: 'Europe', patterns: ['Dublin'] },
  { label: 'Helsinki',    region: 'Europe', patterns: ['Helsinki'] },
  { label: 'Copenhagen',  region: 'Europe', patterns: ['Copenhagen', 'København'] },
  { label: 'Lisbon',      region: 'Europe', patterns: ['Lisbon', 'Lisboa'] },
  { label: 'Barcelona',   region: 'Europe', patterns: ['Barcelona'] },
  { label: 'Madrid',      region: 'Europe', patterns: ['Madrid'] },
  { label: 'Milan',       region: 'Europe', patterns: ['Milan', 'Milano'] },
  { label: 'Tallinn',     region: 'Europe', patterns: ['Tallinn'] },
  { label: 'Vilnius',     region: 'Europe', patterns: ['Vilnius'] },
  { label: 'Warsaw',      region: 'Europe', patterns: ['Warsaw', 'Warszawa'] },
  { label: 'Vienna',      region: 'Europe', patterns: ['Vienna', 'Wien'] },
  { label: 'Hamburg',     region: 'Europe', patterns: ['Hamburg'] },
  { label: 'Bristol',     region: 'Europe', patterns: ['Bristol'] },
  { label: 'Lausanne',    region: 'Europe', patterns: ['Lausanne'] },

  // 🇺🇸 United States
  { label: 'San Francisco',   region: 'USA', patterns: ['San Francisco'] },
  // Silicon Valley folds in Palo Alto + Mountain View; "Silicon Valley" itself is sometimes used directly.
  { label: 'Silicon Valley',  region: 'USA', patterns: ['Silicon Valley', 'Palo Alto', 'Mountain View'] },
  { label: 'New York City',   region: 'USA', patterns: ['New York', 'NYC'] },
  // Boston metro includes US Cambridge (Cambridge, MA — kept distinct from UK Cambridge above).
  { label: 'Boston',          region: 'USA', patterns: ['Boston', 'Cambridge, MA', 'Cambridge, Massachusetts'] },
  { label: 'Los Angeles',     region: 'USA', patterns: ['Los Angeles'] },
  { label: 'Seattle',         region: 'USA', patterns: ['Seattle'] },
  { label: 'Austin',          region: 'USA', patterns: ['Austin'] },
  { label: 'Miami',           region: 'USA', patterns: ['Miami'] },
  { label: 'Denver/Boulder',  region: 'USA', patterns: ['Denver', 'Boulder'] },
  { label: 'Atlanta',         region: 'USA', patterns: ['Atlanta'] },
  { label: 'Washington DC',   region: 'USA', patterns: ['Washington, D.C.', 'Washington, DC', 'Washington DC'] },
  { label: 'San Diego',       region: 'USA', patterns: ['San Diego'] },
  { label: 'Chicago',         region: 'USA', patterns: ['Chicago'] },
  { label: 'Raleigh-Durham',  region: 'USA', patterns: ['Raleigh', 'Durham'] },
  { label: 'Nashville',       region: 'USA', patterns: ['Nashville'] },
  { label: 'Phoenix',         region: 'USA', patterns: ['Phoenix'] },
  { label: 'Houston',         region: 'USA', patterns: ['Houston'] },
  { label: 'Dallas',          region: 'USA', patterns: ['Dallas'] },
  { label: 'Portland',        region: 'USA', patterns: ['Portland, OR', 'Portland, Oregon'] },
  { label: 'Minneapolis',     region: 'USA', patterns: ['Minneapolis'] },
  { label: 'Philadelphia',    region: 'USA', patterns: ['Philadelphia'] },
  { label: 'Pittsburgh',      region: 'USA', patterns: ['Pittsburgh'] },
  { label: 'Salt Lake City',  region: 'USA', patterns: ['Salt Lake City'] },
  { label: 'Detroit',         region: 'USA', patterns: ['Detroit'] },
  { label: 'Columbus',        region: 'USA', patterns: ['Columbus, OH', 'Columbus, Ohio'] },
]

export const HUB_LABELS: string[] = STARTUP_HUBS.map(h => h.label)

export function findHub(label: string): StartupHub | undefined {
  return STARTUP_HUBS.find(h => h.label === label)
}

// Funding round options for the Company Stage filter dropdown.
export const FUNDING_ROUNDS: string[] = [
  'Pre-Seed', 'Seed',
  'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Series F', 'Series G',
  'IPO',
]
