/**
 * Vibe Check Pipeline
 *
 * For each job without a vibe_check:
 * 1. Scrape description (fetch first, Puppeteer fallback)
 * 2. Generate vibe_check + skills via Groq
 * 3. Store everything in Supabase
 *
 * Run: npx tsx vibe-check.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

for (const line of readFileSync(resolve(__dirname, '.env'), 'utf-8').replace(/\r/g, '').split('\n')) {
  const m = line.match(/^([^#=]+)=(.+)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const GROQ_KEY = process.env.GROQ_API_KEY!
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'
const GROQ_CONCURRENCY = 8

const PROMPT = `You are a chill career advisor writing for a startup job board aimed at students and young professionals. Given a job description, produce a JSON object with two fields:

1. "vibe_check": A 2-3 sentence summary in a relaxed, casual tone. First sentence: what the company actually does (keep it simple). Second sentence: what they're looking for in this role. Third sentence (optional): anything noteworthy (culture, perks, vibe).

2. "skills": An array of 4-8 key skills/requirements extracted from the description. Keep them short (2-4 words each).

Only output valid JSON, nothing else.

Company: COMPANY_NAME
Role: ROLE_TITLE
Description: JOB_DESCRIPTION`

// --- Semaphore for Groq concurrency limiting ---

function createSemaphore(max: number) {
  let active = 0
  const queue: Array<() => void> = []
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>(r => queue.push(r))
    active++
    try { return await fn() }
    finally {
      active--
      const next = queue.shift()
      if (next) next()
    }
  }
}

const groqSem = createSemaphore(4) // Free tier: ~30 RPM, ~6000 TPM

// --- Groq summarization ---

async function generateVibeCheck(
  company: string,
  role: string,
  description: string,
): Promise<{ vibe_check: string; skills: string[] } | null> {
  const prompt = PROMPT
    .replace('COMPANY_NAME', company)
    .replace('ROLE_TITLE', role)
    .replace('JOB_DESCRIPTION', description.slice(0, 1500))

  return groqSem(async () => {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    if (res.status === 429) {
      // Honor retry-after if present, else wait 20s
      const retryAfter = parseFloat(res.headers.get('retry-after') || '20')
      await new Promise(r => setTimeout(r, Math.min(retryAfter * 1000, 30000)))
      return null
    }
    if (!res.ok) return null

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    return {
      vibe_check: parsed.vibe_check || '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    }
  } catch {
    return null
  }
  })
}

// --- Main ---

async function run() {
  // Pure Groq pass — relies on role_description being populated by the scrapers.
  const { data: jobs, error } = await supabase
    .from('tracker_roles')
    .select('id, company_name, role_title, role_description')
    .eq('is_active', true)
    .is('vibe_check', null)
    .not('role_description', 'is', null)
    .order('last_seen_at', { ascending: false })
    .limit(1000)

  if (error) { console.error('Error:', error.message); return }

  const toProcess = jobs || []
  console.log(`${toProcess.length} jobs to process\n`)

  let vibeGenerated = 0
  let failed = 0
  let done = 0

  const processJob = async (job: any) => {
    const desc = job.role_description
    if (!desc) { failed++; done++; return }

    let result = await generateVibeCheck(job.company_name, job.role_title, desc)
    if (!result) result = await generateVibeCheck(job.company_name, job.role_title, desc)

    if (result) {
      await supabase.from('tracker_roles')
        .update({ vibe_check: result.vibe_check, skills: result.skills })
        .eq('id', job.id)
      vibeGenerated++
      done++
      console.log(`[${done}/${toProcess.length}] ${job.company_name} ✓`)
    } else {
      failed++
      done++
      console.log(`[${done}/${toProcess.length}] ${job.company_name} — groq failed`)
    }
  }

  let cursor = 0
  const workers = Array.from({ length: GROQ_CONCURRENCY }, async () => {
    while (cursor < toProcess.length) {
      const idx = cursor++
      try { await processJob(toProcess[idx]) }
      catch { failed++; done++ }
    }
  })
  await Promise.all(workers)

  console.log(`\n=== Summary ===`)
  console.log(`Processed: ${toProcess.length}`)
  console.log(`Vibe checks generated: ${vibeGenerated}`)
  console.log(`Failed: ${failed}`)
}

run()
