'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const HiringNavbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 md:px-12 backdrop-blur-xl border-b border-white/5 bg-black/60">
      <Link href="/hiring" className="flex items-center gap-2 font-bold text-white tracking-tight text-xl">
        <Image
          src="/uncooked-logo-white.png"
          alt="Uncooked"
          width={28}
          height={28}
          priority
          className="w-7 h-7 object-contain"
        />
        uncooked <span className="text-brand font-serif italic font-normal">for hiring</span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="hidden sm:block px-4 py-2 text-xs sm:text-sm font-bold text-neutral-400 hover:text-white border border-white/10 rounded-full transition-all hover:border-white/30"
        >
          i&apos;m a candidate
        </Link>
        <a
          href="https://calendly.com/sparqapp/uncooked-intro"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white bg-brand rounded-full hover:bg-brand-hover transition-all hover:scale-105 active:scale-95"
        >
          book a call
        </a>
      </div>
    </nav>
  );
};
