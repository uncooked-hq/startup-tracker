'use client';

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from './AuthProvider';

const STORAGE_KEY = 'uncooked_tour_seen';

interface Step {
  /** ID of the element to highlight. If null, shows centered welcome card */
  targetId: string | null;
  /** Where to place the popover relative to target */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    targetId: null,
    title: 'welcome to uncooked',
    body: 'a curated startup job tracker pulling roles from 20+ top accelerators and VCs. let me show you around.',
  },
  {
    targetId: 'tour-search',
    placement: 'bottom',
    title: 'natural language search',
    body: 'try "remote engineer in london" or "fintech internships". the search understands locations, levels, industries, and companies.',
  },
  {
    targetId: 'tour-filters',
    placement: 'bottom',
    title: 'filters',
    body: 'narrow down by region, accelerator, level, job type, work mode, or industry. all filters can stack.',
  },
  {
    targetId: 'tour-bookmark',
    placement: 'left',
    title: 'bookmark jobs',
    body: 'sign in to save jobs you want to come back to later. click any bookmark icon to save a role.',
  },
];

const POPOVER_WIDTH = 320;
const POPOVER_OFFSET = 16;
const PADDING = 8;

interface Position {
  top: number;
  left: number;
  spotlight: { top: number; left: number; width: number; height: number } | null;
}

function calculatePosition(targetId: string | null, placement: Step['placement']): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!targetId) {
    // Centered, no spotlight
    return {
      top: vh / 2 - 150,
      left: vw / 2 - POPOVER_WIDTH / 2,
      spotlight: null,
    };
  }

  const el = document.getElementById(targetId);
  if (!el) {
    return { top: vh / 2 - 150, left: vw / 2 - POPOVER_WIDTH / 2, spotlight: null };
  }

  const rect = el.getBoundingClientRect();
  const spotlight = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = rect.bottom + POPOVER_OFFSET;
      left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
      break;
    case 'top':
      top = rect.top - POPOVER_OFFSET - 200; // approximate popover height
      left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - 100;
      left = rect.left - POPOVER_WIDTH - POPOVER_OFFSET;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - 100;
      left = rect.right + POPOVER_OFFSET;
      break;
  }

  // Clamp to viewport
  left = Math.max(16, Math.min(left, vw - POPOVER_WIDTH - 16));
  top = Math.max(16, Math.min(top, vh - 220));

  return { top, left, spotlight };
}

// Global replay trigger — called by the help button
let replayTourFn: (() => void) | null = null;

export function replayTour() {
  replayTourFn?.();
}

export function OnboardingTour() {
  const { isLoggedIn } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState<Position>({ top: 0, left: 0, spotlight: null });

  // Register replay function
  useEffect(() => {
    replayTourFn = () => {
      setStep(0);
      setShow(true);
    };
    return () => { replayTourFn = null; };
  }, []);

  // Show tour after sign-in (once per browser)
  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        setTimeout(() => setShow(true), 800);
      }
    } catch {}
  }, [isLoggedIn]);

  // Recalculate position when step changes or window resizes
  useLayoutEffect(() => {
    if (!show) return;

    const current = STEPS[step];

    // Scroll target into view first
    if (current.targetId) {
      const el = document.getElementById(current.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!inView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Wait for scroll to finish before measuring
          setTimeout(() => {
            setPos(calculatePosition(current.targetId, current.placement));
          }, 400);
          return;
        }
      }
    }

    setPos(calculatePosition(current.targetId, current.placement));

    const handleResize = () => {
      setPos(calculatePosition(current.targetId, current.placement));
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [show, step]);

  const close = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setShow(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Overlay with optional spotlight cutout */}
      {pos.spotlight ? (
        <div
          className="absolute inset-0 pointer-events-auto"
          onClick={close}
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            clipPath: `polygon(
              0 0,
              100% 0,
              100% 100%,
              0 100%,
              0 ${pos.spotlight.top}px,
              ${pos.spotlight.left}px ${pos.spotlight.top}px,
              ${pos.spotlight.left}px ${pos.spotlight.top + pos.spotlight.height}px,
              ${pos.spotlight.left + pos.spotlight.width}px ${pos.spotlight.top + pos.spotlight.height}px,
              ${pos.spotlight.left + pos.spotlight.width}px ${pos.spotlight.top}px,
              0 ${pos.spotlight.top}px
            )`,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
          onClick={close}
        />
      )}

      {/* Spotlight border highlight */}
      {pos.spotlight && (
        <div
          className="absolute pointer-events-none rounded-2xl ring-2 ring-brand transition-all duration-300"
          style={{
            top: pos.spotlight.top,
            left: pos.spotlight.left,
            width: pos.spotlight.width,
            height: pos.spotlight.height,
            boxShadow: '0 0 0 4px rgba(255, 107, 53, 0.2)',
          }}
        />
      )}

      {/* Popover */}
      <div
        className="absolute bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl pointer-events-auto transition-all duration-300"
        style={{
          top: pos.top,
          left: pos.left,
          width: POPOVER_WIDTH,
        }}
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-5 pt-6">
          {isFirst && (
            <div className="w-10 h-10 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center mb-3">
              <Sparkles size={18} className="text-brand" />
            </div>
          )}
          <h3 className="text-lg font-bold text-white tracking-tight mb-2">{current.title}</h3>
          <p className="text-sm text-neutral-400 leading-relaxed">{current.body}</p>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step ? 'w-6 bg-brand' : 'w-1.5 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-5 pb-4 flex items-center justify-between gap-3">
          {!isFirst ? (
            <button
              onClick={prev}
              className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={12} /> back
            </button>
          ) : (
            <button
              onClick={close}
              className="px-3 py-2 text-xs font-medium text-neutral-500 hover:text-white transition-colors"
            >
              skip
            </button>
          )}

          <button
            onClick={next}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand rounded-full hover:bg-brand/90 transition-colors"
          >
            {isLast ? 'got it' : 'next'}
            {!isLast && <ArrowRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
