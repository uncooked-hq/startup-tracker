'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LoginModal } from './LoginModal';
import { LogOut, ExternalLink } from 'lucide-react';
import { getPageColor } from '@/lib/page-theme';

const TABS = [
  { label: 'jobs', href: '/' },
  { label: 'tracker', href: '/tracker' },
  { label: 'events', href: '/events' },
  { label: 'labs', href: 'https://uncookedlabs.com', external: true },
];

export const Navbar: React.FC = () => {
  const { isLoggedIn, user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const pathname = usePathname();
  const color = getPageColor(pathname);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 md:px-12 backdrop-blur-xl border-b border-white/5 bg-black/60 transition-all">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/" className="font-bold text-white tracking-tight text-xl">
            uncooked
          </Link>
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const isActive = !tab.external && pathname === tab.href;
              if (tab.external) {
                return (
                  <a
                    key={tab.href}
                    href={tab.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-bold text-neutral-500 hover:text-white transition-colors rounded-full"
                  >
                    {tab.label}
                    <ExternalLink size={11} />
                  </a>
                );
              }
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pathname === '/' && (
            <Link
              href="/hiring"
              className="hidden sm:block px-4 py-2 text-xs sm:text-sm font-bold text-neutral-400 hover:text-white border border-white/10 rounded-full transition-all hover:border-white/30"
            >
              i&apos;m a recruiter
            </Link>
          )}
          {isLoggedIn ? (
            <>
              <span className="text-sm text-neutral-400 hidden sm:block">{user?.fullName}</span>
              <button
                onClick={logout}
                className="p-2 text-neutral-500 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              id="tour-signin"
              onClick={() => setShowLogin(true)}
              style={{ backgroundColor: color.base }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = color.hover }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = color.base }}
              className="px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-white rounded-full transition-all hover:scale-105 active:scale-95"
            >
              sign in
            </button>
          )}
        </div>
      </nav>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
};
