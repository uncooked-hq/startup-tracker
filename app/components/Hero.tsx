'use client';

import React, { useRef, useCallback } from 'react';
import Image from 'next/image';
import { ArrowDown } from 'lucide-react';

const POPULAR_SOURCES = [
  { name: 'Y Combinator', domain: 'ycombinator.com' },
  { name: 'Sequoia', domain: 'sequoiacap.com' },
  { name: 'Accel', domain: 'accel.com' },
  { name: 'Greylock', domain: 'greylock.com' },
  { name: 'Antler', domain: 'antler.co' },
  { name: 'Seedcamp', domain: 'seedcamp.com' },
  { name: 'Atomico', domain: 'atomico.com' },
  { name: 'Kleiner Perkins', domain: 'kpcb.com' },
  { name: 'Thrive Capital', domain: 'thrivecap.com' },
  { name: 'Georgian', domain: 'georgian.io' },
  { name: 'Entrepreneur First', domain: 'joinef.com' },
];

function SourceItem({ source, onHover }: { source: typeof POPULAR_SOURCES[number]; onHover: (hovering: boolean) => void }) {
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="flex-shrink-0 flex items-center gap-2.5 opacity-40 hover:opacity-100 hover:scale-110 transition-all duration-200 cursor-default"
    >
      <Image
        src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${source.domain}&size=128`}
        alt={source.name}
        width={24}
        height={24}
        className="w-6 h-6 rounded"
        unoptimized
      />
      <span className="text-sm font-medium text-neutral-400 whitespace-nowrap">
        {source.name}
      </span>
    </div>
  );
}

function SourceList({ onHover }: { onHover: (hovering: boolean) => void }) {
  return (
    <>
      {POPULAR_SOURCES.map((source) => (
        <SourceItem key={source.name} source={source} onHover={onHover} />
      ))}
    </>
  );
}

export const Hero: React.FC = () => {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const handleSourceHover = useCallback((hovering: boolean) => {
    marqueeRef.current?.classList.toggle('paused', hovering);
  }, []);

  return (
    <section className="relative flex flex-col items-center justify-center px-6 text-center pt-36 pb-20 overflow-hidden bg-dark-bg">

      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 blur-[140px] rounded-full pointer-events-none opacity-60 animate-pulse-slow" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/90 to-transparent" />

      {/* Pill */}
      <div className="relative mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
        <span className="px-4 py-2 text-xs font-semibold tracking-widest text-neutral-400 uppercase border border-white/5 rounded-full bg-[#0a0a0a] backdrop-blur-md">
          early access
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="relative max-w-4xl text-5xl font-medium tracking-tighter text-white md:text-6xl lg:text-7xl animate-fade-in-up opacity-0 leading-tight" style={{ animationDelay: '150ms' }}>
        a really cool
        <br />
        <span className="font-serif italic text-white font-normal relative inline-block">
          startup tracker
          <span className="absolute -bottom-2 left-0 w-full h-[20%] bg-brand/20 -rotate-1 blur-lg -z-10"></span>
        </span>
      </h1>

      {/* Subtext */}
      <p className="relative max-w-2xl mt-8 text-base text-neutral-400 md:text-lg leading-relaxed lowercase animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
        the <span className="font-bold text-neutral-300">uncooked startup tracker</span> collates job roles from the best startups in the UK and around the globe.
      </p>

      {/* CTA Button */}
      <button
        onClick={() => {
          const el = document.getElementById('job-tracker');
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 72;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }}
        className="relative mt-12 px-8 py-3 bg-brand text-white font-semibold rounded-full hover:bg-brand/90 transition-colors animate-fade-in-up opacity-0 flex items-center gap-2"
        style={{ animationDelay: '450ms' }}
      >
        view roles <ArrowDown size={16} />
      </button>

      {/* Source Carousel */}
      <div className="relative w-full max-w-3xl mt-14 animate-fade-in-up opacity-0" style={{ animationDelay: '600ms' }}>
        <p className="text-xs text-neutral-600 uppercase tracking-widest font-semibold mb-4">roles from top accelerators and funds</p>
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        <div className="overflow-hidden">
          <div ref={marqueeRef} className="flex w-max animate-marquee will-change-transform">
            <div className="flex items-center gap-10 pr-10">
              <SourceList onHover={handleSourceHover} />
            </div>
            <div className="flex items-center gap-10 pr-10">
              <SourceList onHover={handleSourceHover} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
