import React from 'react';
import { ArrowRight } from 'lucide-react';

export const Hero: React.FC<{ scrollToTracker: () => void }> = ({ scrollToTracker }) => {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 text-center pt-32 pb-16 overflow-hidden bg-dark-bg">
      
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/10 blur-[140px] rounded-full pointer-events-none opacity-60 animate-pulse-slow" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black via-black/90 to-transparent z-10" />

      {/* Pill */}
      <div className="relative z-20 mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
        <span className="px-4 py-2 text-xs font-semibold tracking-widest text-neutral-400 uppercase border border-white/5 rounded-full bg-[#0a0a0a] backdrop-blur-md">
          early access
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="relative z-20 max-w-4xl text-5xl font-medium tracking-tighter text-white md:text-6xl lg:text-7xl animate-fade-in-up opacity-0 leading-tight" style={{ animationDelay: '150ms' }}>
        uncooked{' '}
        <span className="font-serif italic text-white font-normal relative inline-block">
          startup tracker
          <span className="absolute -bottom-2 left-0 w-full h-[20%] bg-brand/20 -rotate-1 blur-lg -z-10"></span>
        </span>
      </h1>

      {/* Subtext */}
      <p className="relative z-20 max-w-2xl mt-6 text-base text-neutral-400 md:text-lg leading-relaxed lowercase animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
        hottest roles from startups in the uk and around the globe.
      </p>
    </section>
  );
};