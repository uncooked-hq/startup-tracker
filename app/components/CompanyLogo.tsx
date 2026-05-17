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
};

// Order of TLDs to try when no override + no DB-supplied domain.
// .ai first because most "wrong logo" cases were AI-flavored startups on .ai domains.
const TLD_CASCADE = ['ai', 'com', 'io', 'co'];

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

function buildCandidateDomains(name: string, explicitDomain: string | null | undefined): string[] {
  if (explicitDomain) return [explicitDomain]
  const key = name.trim().toLowerCase()
  if (DOMAIN_OVERRIDES[key]) return [DOMAIN_OVERRIDES[key]]
  const slug = key.replace(/[^a-z0-9]/g, '')
  return TLD_CASCADE.map(tld => `${slug}.${tld}`)
}

function faviconUrl(domain: string): string {
  return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`
}

export default function CompanyLogo({
  name,
  industry,
  domain,
}: {
  name: string;
  industry?: string | null;
  domain?: string | null;
}) {
  const candidates = useMemo(() => buildCandidateDomains(name, domain), [name, domain]);
  // Index into the candidate list — bumps forward when a try fails.
  const [tryIdx, setTryIdx] = useState(0);
  const bgColor = getColorFromName(name);

  // Past the end → give up and show initials.
  if (tryIdx >= candidates.length) {
    return (
      <span
        className="flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold text-white/90 select-none"
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
      className="w-10 h-10 rounded-lg object-contain"
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
