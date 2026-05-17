'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { getPageColor } from '@/lib/page-theme';

interface LoginModalProps {
  onClose: () => void;
}

const SIGNUP_URL = 'https://tally.so/r/7RRlp9';

export function LoginModal({ onClose }: LoginModalProps) {
  const { login } = useAuth();
  const pathname = usePathname();
  const color = getPageColor(pathname);
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, contact }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      login(data.user);
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-0 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">sign in</h2>
            <p className="text-sm text-neutral-500 mt-1">save jobs you&apos;re interested in</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = color.base + '80' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '' }}
              placeholder="as registered"
              required
              className="w-full px-4 py-3 bg-[#141414] text-white rounded-xl border border-white/10 focus:outline-none text-sm placeholder:text-neutral-600 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">
              Email or Phone
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = color.base + '80' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '' }}
              placeholder="email@example.com or +44..."
              required
              className="w-full px-4 py-3 bg-[#141414] text-white rounded-xl border border-white/10 focus:outline-none text-sm placeholder:text-neutral-600 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !fullName || !contact}
            style={{ backgroundColor: color.base }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = color.hover }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = color.base }}
            className="w-full py-3 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="px-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-xs text-neutral-600">not a member?</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Sign up link */}
        <div className="p-5 pt-3">
          <a
            href={SIGNUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 border border-white/10 text-white/80 font-bold rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            Join the Community <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
