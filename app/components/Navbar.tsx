'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LoginModal } from './LoginModal';
import Image from 'next/image';
import { LogOut, ExternalLink, Menu, X } from 'lucide-react';
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const color = getPageColor(pathname);

  // Close the mobile sheet whenever route changes
  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3 sm:px-6 sm:py-5 md:px-12 backdrop-blur-xl border-b border-white/5 bg-black/60 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-white tracking-tight text-lg sm:text-xl">
              <Image
                src="/uncooked-logo-white.png"
                alt="Uncooked"
                width={28}
                height={28}
                priority
                className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
              />
              uncooked
            </Link>
            {/* Desktop tabs */}
            <div className="hidden sm:flex items-center gap-1">
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

          <div className="flex items-center gap-2 sm:gap-3">
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
                className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white rounded-full transition-all hover:scale-105 active:scale-95"
              >
                sign in
              </button>
            )}
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="sm:hidden p-2 -mr-1 text-neutral-300 hover:text-white transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down panel */}
        {mobileOpen && (
          <div className="sm:hidden mt-3 -mx-4 px-4 pt-3 pb-2 border-t border-white/5 flex flex-col gap-1 animate-fade-in-up">
            {TABS.map((tab) => {
              const isActive = !tab.external && pathname === tab.href;
              if (tab.external) {
                return (
                  <a
                    key={tab.href}
                    href={tab.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {tab.label}
                    <ExternalLink size={12} />
                  </a>
                );
              }
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-2.5 text-sm font-bold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            {pathname === '/' && (
              <Link
                href="/hiring"
                onClick={() => setMobileOpen(false)}
                className="mt-1 px-3 py-2.5 text-sm font-bold text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-colors"
              >
                i&apos;m a recruiter
              </Link>
            )}
          </div>
        )}
      </nav>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
};
