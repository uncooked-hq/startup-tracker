'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Generate a consistent color from a company name.
 */
function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 35%)`;
}

/**
 * Get 1-2 letter initials from a company name.
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function guessDomain(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .concat('.com');
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
  const [showImg, setShowImg] = useState(true);
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  const logoDomain = domain || guessDomain(name);
  const logoUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${logoDomain}&size=128`;

  if (!showImg) {
    return (
      <span
        className="flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold text-white/90 select-none"
        style={{ backgroundColor: bgColor }}
        aria-label={`${name} logo`}
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={`${name} logo`}
      width={40}
      height={40}
      className="w-10 h-10 rounded-lg object-contain"
      unoptimized
      onError={() => setShowImg(false)}
      onLoad={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (img.naturalWidth <= 16 || img.naturalHeight <= 16) {
          setShowImg(false);
        }
      }}
    />
  );
}
