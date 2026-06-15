'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import type { HubRegion } from '@/lib/startup-hubs';
import { cityImage } from '@/lib/city-images';

interface CityCount {
  label: string;
  region: HubRegion;
  count: number;
}

const REGION_ORDER: { key: HubRegion; title: string }[] = [
  { key: 'Europe', title: 'Europe' },
  { key: 'USA', title: 'United States' },
];

const CityCard: React.FC<{ label: string; count: number; image?: string; onClick: () => void }> = ({ label, count, image, onClick }) => (
  <button
    onClick={onClick}
    className="group relative flex flex-col justify-end overflow-hidden min-h-[128px] md:min-h-[152px] p-4 md:p-5 text-left transition-all duration-500 border rounded-2xl md:rounded-[2rem] bg-[#0A0A0A] border-white/5 hover:border-brand/30 hover:-translate-y-1 cursor-pointer"
  >
    {image && (
      // Landmark backdrop — plain <img> (Wikimedia CDN, not in next/image allowlist).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
    )}
    {/* Dark scrim — keeps the label readable over any photo (and over the
        plain dark card when an image is missing). */}
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
    <div className="relative flex items-end justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate drop-shadow-md group-hover:text-brand transition-colors">{label}</h3>
        <p className="text-xs md:text-sm text-neutral-200 font-medium drop-shadow">{count.toLocaleString()} active {count === 1 ? 'role' : 'roles'}</p>
      </div>
      <ChevronRight size={20} className="flex-shrink-0 text-white/70 group-hover:text-brand group-hover:translate-x-0.5 transition-all drop-shadow" />
    </div>
  </button>
);

export const CityDirectory: React.FC<{ onSelectCity: (label: string) => void }> = ({ onSelectCity }) => {
  const [cities, setCities] = useState<CityCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/cities')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) { setError(data.error); return; }
        setCities(data.cities || []);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="col-span-full py-32 text-center text-neutral-500 border border-white/5 rounded-[2.5rem] bg-[#0A0A0A]">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-brand" />
        <p className="text-xl font-medium">loading cities...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full py-32 text-center text-red-500 border border-red-500/20 rounded-[2.5rem] bg-[#0A0A0A]">
        <p className="text-xl font-medium mb-2">couldn&apos;t load cities</p>
        <p className="text-sm opacity-60">{error}</p>
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div className="col-span-full py-32 text-center text-neutral-500 border border-white/5 rounded-[2.5rem] bg-[#0A0A0A]">
        <p className="text-xl font-medium">no cities with active roles yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-fade-in-up">
      {REGION_ORDER.map(({ key, title }) => {
        const group = cities.filter(c => c.region === key);
        if (group.length === 0) return null;
        return (
          <div key={key} className="flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-widest uppercase text-neutral-500 px-1">{title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {group.map(c => (
                <CityCard key={c.label} label={c.label} count={c.count} image={cityImage(c.label)} onClick={() => onSelectCity(c.label)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
