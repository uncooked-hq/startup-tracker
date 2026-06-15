'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';

/**
 * Manual overrides for companies where the auto-guessed domain is wrong.
 * Keys are lower-cased company names; values are the real domain.
 * Add new entries as you find more bad logos.
 */
const DOMAIN_OVERRIDES: Record<string, string> = {
  'cartesia': 'cartesia.ai',
  'black forest labs': 'bfl.ai',
  'mistral': 'mistral.ai',
  'mistral ai': 'mistral.ai',
  'anthropic': 'anthropic.com',
  'openai': 'openai.com',
  'xai': 'x.ai',
  'cohere': 'cohere.com',
  'hugging face': 'huggingface.co',
  'deepmind': 'deepmind.google',
  'google deepmind': 'deepmind.google',
  'perplexity': 'perplexity.ai',
  'inflection': 'inflection.ai',
  'character': 'character.ai',
  'character.ai': 'character.ai',
  'replicate': 'replicate.com',
  'runway': 'runwayml.com',
  'stability': 'stability.ai',
  'stability ai': 'stability.ai',
  // Mainstream companies whose guessed domain is owned by someone else:
  // figma.ai is unrelated; handshake.com is Shopify's wholesale brand.
  'figma': 'figma.com',
  'handshake': 'joinhandshake.com',
};

// Order of TLDs to try when we can't derive a real domain and there's no
// override. .com first because the tracker is mostly mainstream startups —
// guessing .ai first was matching unrelated .ai domains (e.g. figma.ai).
const TLD_CASCADE = ['com', 'ai', 'io', 'co'];

// Subdomain labels that prefix a company's own careers/ATS host but aren't part
// of the brand. Stripped so we can compare the brand root to the company name.
const GENERIC_SUBDOMAINS = new Set([
  'www', 'jobs', 'job', 'careers', 'career', 'apply', 'boards', 'board',
  'job-boards', 'talent', 'hire', 'hiring', 'work', 'app', 'my', 'en',
]);

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 35%)`;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Reduce a URL to its brand domain (e.g. "careers.figma.com/jobs" → "figma.com")
 * and return that domain plus its brand root label ("figma"). Strips generic
 * subdomain prefixes so an ATS/careers host still exposes the real brand label.
 * Returns null for unparseable input.
 */
function brandDomainFromUrl(url: string): { domain: string; root: string } | null {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  const labels = host.split('.').filter(Boolean)
  // Drop leading generic labels (www, jobs, careers, …) until we hit the brand.
  while (labels.length > 2 && GENERIC_SUBDOMAINS.has(labels[0])) labels.shift()
  if (labels.length < 2) return null
  return { domain: labels.join('.'), root: labels[0] }
}

/**
 * Trust a URL-derived domain only when its brand root matches the company name.
 * This lets a company's own apply link ("notion.so") win, while rejecting
 * aggregator/ATS hosts (a job on "jobs.accel.com" whose company is "Acme" — root
 * "accel" ≠ "acme" — falls through instead of showing the VC's logo).
 */
function domainFromSources(
  companySlug: string,
  sources: { application_url?: string | null; source_url?: string | null }[] | undefined,
): string | null {
  if (!sources || companySlug.length < 2) return null
  for (const s of sources) {
    for (const url of [s.application_url, s.source_url]) {
      if (!url) continue
      const brand = brandDomainFromUrl(url)
      if (!brand) continue
      const { domain, root } = brand
      const matches =
        root === companySlug ||
        (root.length >= 4 && companySlug.includes(root)) ||
        (companySlug.length >= 4 && root.includes(companySlug))
      if (matches) return domain
    }
  }
  return null
}

function buildCandidateDomains(
  name: string,
  explicitDomain: string | null | undefined,
  sources?: { application_url?: string | null; source_url?: string | null }[],
): string[] {
  if (explicitDomain) return [explicitDomain]
  const key = name.trim().toLowerCase()
  if (DOMAIN_OVERRIDES[key]) return [DOMAIN_OVERRIDES[key]]
  const slug = key.replace(/[^a-z0-9]/g, '')
  // Prefer a real domain pulled from the company's own apply/source URL.
  const derived = domainFromSources(slug, sources)
  if (derived) return [derived]
  return TLD_CASCADE.map(tld => `${slug}.${tld}`)
}

function faviconUrl(domain: string): string {
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`
}

export default function CompanyLogo({
  name,
  industry,
  domain,
  sources,
}: {
  name: string;
  industry?: string | null;
  domain?: string | null;
  sources?: { application_url?: string | null; source_url?: string | null }[];
}) {
  const candidates = useMemo(
    () => buildCandidateDomains(name, domain, sources),
    [name, domain, sources],
  );
  // Index into the candidate list — bumps forward when a try fails.
  const [tryIdx, setTryIdx] = useState(0);
  const bgColor = getColorFromName(name);

  // Past the end → give up and show initials.
  if (tryIdx >= candidates.length) {
    return (
      <span
        className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-sm font-bold text-white/90 select-none"
        style={{ backgroundColor: bgColor }}
        aria-label={`${name} logo`}
      >
        {getInitials(name)}
      </span>
    );
  }

  return (
    <Image
      key={candidates[tryIdx]} // force a re-fetch when we advance to the next TLD
      src={faviconUrl(candidates[tryIdx])}
      alt={`${name} logo`}
      width={40}
      height={40}
      // Soft white radial glow behind the logo (not a hard white chip): a bright
      // centre keeps dark/black logos legible on the dark UI, fading to transparent
      // at the edges so there's no stark square.
      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain p-1"
      style={{
        background:
          'radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0.4) 58%, rgba(255,255,255,0) 80%)',
      }}
      unoptimized
      onError={() => setTryIdx(i => i + 1)}
      onLoad={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        // Google's faviconV2 returns a 16×16 grey globe when no favicon is found.
        // Treat as miss and try the next candidate.
        if (img.naturalWidth <= 16 || img.naturalHeight <= 16) {
          setTryIdx(i => i + 1);
        }
      }}
    />
  );
}
