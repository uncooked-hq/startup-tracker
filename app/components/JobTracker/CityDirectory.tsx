'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Loader2, ChevronRight } from 'lucide-react';
import type { HubRegion } from '@/lib/startup-hubs';

interface CityCount {
  label: string;
  region: HubRegion;
  count: number;
}

const REGION_ORDER: { key: HubRegion; title: string }[] = [
  { key: 'Europe', title: 'Europe' },
  { key: 'USA', title: 'United States' },
];

const CityCard: React.FC<{ label: string; count: number; onClick: () => void }> = ({ label, count, onClick }) => (
  <button
    onClick={onClick}
    className="group relative flex items-center gap-4 p-4 md:p-6 text-left transition-all duration-500 border rounded-2xl md:rounded-[2rem] bg-[#0A0A0A] border-white/5 hover:border-brand/20 hover:bg-[#101010] hover:-translate-y-1 cursor-pointer"
  >
    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-[#141414] rounded-xl md:rounded-2xl border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 ease-out shadow-inner">
      <MapPin size={20} className="text-neutral-400 group-hover:text-brand transition-colors" />
    </div>
    <div className="flex flex-col min-w-0">
      <h3 className="text-base md:text-xl font-bold text-white group-hover:text-brand transition-colors tracking-tight truncate">{label}</h3>
      <p className="text-xs md:text-sm text-neutral-500 font-medium">{count.toLocaleString()} active {count === 1 ? 'role' : 'roles'}</p>
    </div>
    <ChevronRight size={18} className="ml-auto flex-shrink-0 text-neutral-700 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
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
                <CityCard key={c.label} label={c.label} count={c.count} onClick={() => onSelectCity(c.label)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
