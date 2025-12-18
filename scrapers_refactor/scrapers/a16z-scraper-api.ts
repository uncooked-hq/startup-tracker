/**
 * a16z Jobs API Scraper
 * 
 * Uses the a16z jobs API instead of Playwright for better performance and reliability.
 * API endpoint: https://jobs.a16z.com/api-boards/search-jobs
 * 
 * TODO:
 * - [ ] Add pagination to fetch all jobs (>100)
 * - [ ] Add job type filtering (Software Engineer, etc.)
 * - [ ] Add posted date filtering (P7D, P30D, etc.)
 * - [ ] Add location filtering
 * - [ ] Extract job description from individual job pages
 */

import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

interface A16zAPIJob {
  applyUrl: string
  companyName: string
  companyDomain: string
  companyStaffCount: number
  title: string
  timeStamp: string // ISO date
  jobId: string
  locations?: string[]
  normalizedLocations?: Array<{ label: string }>
  salary?: {
    minValue?: number
    maxValue?: number
    currency?: { value: string }
    period?: { value: string }
  }
  remote?: boolean
  hybrid?: boolean
  jobSeniorities?: Array<{ value: string }>
  jobTypes?: Array<{ label: string }>
  departments?: string[]
  skills?: Array<{ label: string }>
}

interface A16zAPIResponse {
  jobs: A16zAPIJob[]
  total: number
  meta: {
    size: number
    sequence?: string // Pagination cursor
  }
}

async function fetchA16zJobs(pageSize = 100): Promise<A16zAPIJob[]> {
  const url = 'https://jobs.a16z.com/api-boards/search-jobs'
  
  const payload = {
    meta: { size: pageSize },
    board: { id: 'andreessen-horowitz', isParent: true },
    query: { promoteFeatured: true }
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify(payload)
  })
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }
  
  const data: A16zAPIResponse = await response.json()
  return data.jobs || []
}

export const a16zScraperAPI: Scraper = {
  name: 'Andreessen Horowitz (API)',
  url: 'https://jobs.a16z.com/api-boards/search-jobs',

  async parse(_html: string) {
    // Ignore HTML parameter, fetch directly from API
    const jobs = await fetchA16zJobs(500) // Fetch up to 500 jobs
    const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

    console.log(`[a16z API] Processing ${jobs.length} jobs...`)

    for (const job of jobs) {
      try {
        // Extract company size range
        let companySizeMin: number | null = null
        let companySizeMax: number | null = null
        if (job.companyStaffCount) {
          // Use exact count as both min and max for now
          companySizeMin = job.companyStaffCount
          companySizeMax = job.companyStaffCount
        }

        // Extract location
        const location = job.normalizedLocations?.[0]?.label || 
                        job.locations?.[0] || 
                        null

        // Determine work mode
        let workMode: 'remote' | 'hybrid' | 'onsite' | null = null
        if (job.remote) workMode = 'remote'
        else if (job.hybrid) workMode = 'hybrid'
        else if (location) workMode = 'onsite'

        // Extract salary
        let salaryMin: number | null = null
        let salaryMax: number | null = null
        let salaryCurrency: string | null = null
        let compensationText: string | null = null

        if (job.salary) {
          salaryMin = job.salary.minValue || null
          salaryMax = job.salary.maxValue || null
          salaryCurrency = job.salary.currency?.value || 'USD'
          
          if (salaryMin && salaryMax) {
            const period = job.salary.period?.value === 'year' ? '/year' : ''
            compensationText = `${salaryCurrency} ${salaryMin.toLocaleString()} - ${salaryMax.toLocaleString()}${period}`
          }
        }

        // Extract seniority/role level
        const seniorityValue = job.jobSeniorities?.[0]?.value
        let roleLevel: 'Entry' | 'Mid' | 'Senior' | null = null
        
        if (seniorityValue?.includes('entry') || seniorityValue?.includes('junior')) {
          roleLevel = 'Entry'
        } else if (seniorityValue?.includes('senior') || seniorityValue?.includes('expert') || seniorityValue?.includes('lead')) {
          roleLevel = 'Senior'
        } else if (seniorityValue?.includes('mid')) {
          roleLevel = 'Mid'
        } else {
          // Fallback to extracting from title
          roleLevel = extractRoleLevel(job.title)
        }

        // Parse posting date
        const postingDate = job.timeStamp ? new Date(job.timeStamp) : new Date()

        // Build role data
        const role: TrackerRoleData = {
          company_name: normalizeText(job.companyName),
          role_title: normalizeText(job.title),
          company_description: null, // Not available in API
          company_size_min: companySizeMin,
          company_size_max: companySizeMax,
          role_level: roleLevel,
          location: location ? normalizeText(location) : null,
          work_mode: workMode,
          compensation_text: compensationText,
          salary_min: salaryMin,
          salary_max: salaryMax,
          salary_currency: salaryCurrency,
          posting_date: postingDate,
        }

        const source: TrackerRoleSourceData = {
          source: 'a16z',
          source_role_id: job.jobId,
          source_url: job.applyUrl,
          source_data: {
            company_domain: job.companyDomain,
            job_types: job.jobTypes?.map(t => t.label) || [],
            departments: job.departments || [],
            skills: job.skills?.map(s => s.label) || [],
            remote: job.remote,
            hybrid: job.hybrid,
          }
        }

        // Validate before adding
        if (isValidJob(role.role_title || '', role.company_name || '', source.source_url || '')) {
          results.push({ role, source })
        }
      } catch (error) {
        console.error(`[a16z API] Error processing job ${job.jobId}:`, error)
      }
    }

    return results
  },
}

// Standalone test
if (require.main === module) {
  (async () => {
    console.log('Testing a16z API scraper...\n')
    
    const result = await a16zScraperAPI.parse('')
    
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.length}`)
    console.log('='.repeat(60))
    
    // Show first 3 jobs
    result.slice(0, 3).forEach(({ role, source }, i) => {
      console.log(`\n--- Job ${i + 1} ---`)
      console.log(`Company: ${role.company_name}`)
      console.log(`Title: ${role.role_title}`)
      console.log(`Level: ${role.role_level}`)
      console.log(`Location: ${role.location || 'N/A'}`)
      console.log(`Work Mode: ${role.work_mode || 'N/A'}`)
      console.log(`Compensation: ${role.compensation_text || 'N/A'}`)
      console.log(`Posted: ${role.posting_date?.toLocaleDateString() || 'N/A'}`)
      console.log(`Company Size: ${role.company_size_min || 'N/A'}`)
      console.log(`Source: ${source.source_url}`)
    })
  })().catch(console.error)
}

