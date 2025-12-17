import React from 'react';

const UNCOOKED_LOGO_SRC = "/logo-uncooked.png";

export const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 backdrop-blur-xl border-b border-white/5 bg-black/60 transition-all">
      <div className="flex items-center gap-3 group cursor-pointer">
        <span className="font-bold text-white tracking-tight hidden md:block text-xl">uncooked</span>
      </div>
      <button className="px-6 py-2 text-sm font-bold text-white bg-brand rounded-full hover:bg-brand-hover transition-all hover:scale-105 active:scale-95">
        sign up
      </button>
    </nav>
  );
};