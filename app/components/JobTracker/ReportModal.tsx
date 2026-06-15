'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Loader2, Flag, Check } from 'lucide-react';
import { getPageColor } from '@/lib/page-theme';
import { useAuth } from '../AuthProvider';
import type { Job } from '@/lib/types';

interface ReportModalProps {
  job: Job;
  onClose: () => void;
}

// Neutral, company-agnostic reason buckets. Specifics go in the explanation.
const REASONS: { value: 'expired' | 'compliance'; label: string; hint: string }[] = [
  { value: 'expired', label: 'Expired listing', hint: 'the role is closed, filled, or no longer accepting applicants' },
  { value: 'compliance', label: 'Compliance concern', hint: 'a policy or compliance issue with this listing' },
];

export function ReportModal({ job, onClose }: ReportModalProps) {
  const pathname = usePathname();
  const color = getPageColor(pathname);
  const { user } = useAuth();

  const [reason, setReason] = useState<'expired' | 'compliance' | null>(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !explanation.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          reason,
          explanation: explanation.trim(),
          company: job.company,
          role: job.role,
          reporterContact: user?.email || user?.phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit report.');
        return;
      }
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // z-[110]: above the job modal (z-[100]), below the login modal (z-[120]).
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-0 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-neutral-400" />
            <div>
              <h2 className="text-xl font-bold text-white">report listing</h2>
              <p className="text-sm text-neutral-500 mt-0.5 truncate max-w-[18rem]">{job.role} · {job.company}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="p-5 pt-6 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Check size={18} className="text-green-400" />
            </div>
            <p className="text-white font-medium">thanks — we&apos;ll review this</p>
            <p className="text-sm text-neutral-500">reports are checked by our team before any action is taken.</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 text-sm font-bold text-white/80 border border-white/10 rounded-full hover:bg-white/5 transition-colors"
            >
              close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Reason */}
            <div>
              <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-2 block">Reason</label>
              <div className="space-y-2">
                {REASONS.map((r) => {
                  const active = reason === r.value;
                  return (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setReason(r.value)}
                      style={active ? { borderColor: color.base } : undefined}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        active ? 'bg-white/[0.06]' : 'bg-[#141414] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${active ? '' : 'border-white/30'}`}
                          style={active ? { borderColor: color.base } : undefined}
                        >
                          {active && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.base }} />}
                        </span>
                        <span className="text-sm font-medium text-white">{r.label}</span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 ml-6">{r.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanation (required) */}
            <div>
              <label className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">
                Explanation <span className="text-neutral-600 normal-case font-normal">(required)</span>
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                onFocus={(e) => { e.currentTarget.style.borderColor = color.base + '80'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = ''; }}
                placeholder="tell us a bit more so we can review this…"
                rows={4}
                maxLength={1000}
                required
                className="w-full px-4 py-3 bg-[#141414] text-white rounded-xl border border-white/10 focus:outline-none text-sm placeholder:text-neutral-600 transition-colors resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <p className="text-xs text-neutral-600 leading-relaxed">
              Reports are reviewed by our team before any action is taken. Listings aren&apos;t removed automatically.
            </p>

            <button
              type="submit"
              disabled={loading || !reason || !explanation.trim()}
              style={{ backgroundColor: color.base }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = color.hover; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = color.base; }}
              className="w-full py-3 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Submit report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
