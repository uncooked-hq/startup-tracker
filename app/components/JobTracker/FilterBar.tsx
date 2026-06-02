'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FilterState } from '@/lib/types';
import { ChevronDown, X, SlidersHorizontal, Check } from 'lucide-react';
import { ALL_BACKERS } from '@/lib/backers';
import { HUB_LABELS, FUNDING_ROUNDS } from '@/lib/startup-hubs';

const BACKERS = ALL_BACKERS;
const ROLE_TYPES = ['Full-time', 'Internship', 'Contract', 'Part-time'];
const WORK_MODES = ['Remote', 'Hybrid', 'Onsite'];
const SENIORITY_LEVELS = ['Entry', 'Mid', 'Senior'];
const REGION_OPTIONS = [
  'UK & Ireland', 'Western Europe', 'Southern Europe', 'Nordics',
  'Eastern Europe', 'North America', 'Asia', 'Remote',
];

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  industries?: string[];
}

function StyledDropdown({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (val: string | null) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  // Drives the bottom chevron hint: only show when the list overflows AND user
  // hasn't reached the bottom. Without this the panel looks like the full
  // option set (the scrollbar is hidden by .no-scrollbar).
  const [showScrollHint, setShowScrollHint] = useState(false);
  const isActive = !!value;

  // Position the panel below the button
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, [open]);

  // Recompute scroll-hint visibility after panel mounts / options change
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setShowScrollHint(hasOverflow && !atBottom);
  }, [open, options]);

  const onPanelScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    setShowScrollHint(!atBottom && el.scrollHeight > el.clientHeight + 1);
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [open]);

  const panel = open ? createPortal(
    <div
      ref={panelRef}
      className="fixed min-w-[180px] rounded-xl bg-[#141414] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden"
      style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
    >
      <div
        ref={scrollRef}
        onScroll={onPanelScroll}
        className="max-h-[280px] overflow-y-auto py-1 no-scrollbar"
      >
        <button
          onClick={() => { onChange(null); setOpen(false); }}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
            !value ? 'text-brand' : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {allLabel || `All ${label}`}
          {!value && <Check size={12} className="text-brand" />}
        </button>

        <div className="h-px bg-white/5 mx-2 my-1" />

        {options.map(opt => (
          <button
            key={opt}
            onClick={() => { onChange(opt); setOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
              value === opt ? 'text-brand' : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {opt}
            {value === opt && <Check size={12} className="text-brand" />}
          </button>
        ))}
      </div>
      {showScrollHint && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-7 bg-gradient-to-t from-[#141414] via-[#141414]/90 to-transparent flex items-end justify-center pb-1">
          <ChevronDown size={12} className="text-neutral-400 animate-bounce" />
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap ${
          isActive
            ? 'bg-brand text-white border-brand'
            : 'bg-[#141414] text-white/80 border-white/10 hover:bg-[#1a1a1a] hover:border-white/20'
        }`}
      >
        {value || label}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''} ${isActive ? 'text-white' : 'text-neutral-500'}`} />
      </button>
      {panel}
    </div>
  );
}

/** Mobile filter sheet */
function MobileFilterSheet({
  filters,
  setFilters,
  industries,
  onClose,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  industries: string[];
  onClose: () => void;
}) {
  const clearAll = () => {
    setFilters(prev => ({ ...prev, types: [], modes: [], industry: null, accelerator: null, region: null, seniority: null, sponsorship: null, companyStage: null, startupHub: null }));
  };

  const hasActive = filters.industry || filters.accelerator || filters.types.length > 0 || filters.modes.length > 0 || filters.region || filters.seniority || filters.sponsorship || filters.companyStage || filters.startupHub;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full bg-[#111] border-t border-white/10 rounded-t-2xl p-4 pb-24 space-y-4 max-h-[65vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Filters</h3>
          <button onClick={onClose} className="p-1 text-neutral-400">
            <X size={20} />
          </button>
        </div>

        {/* Region */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Region</label>
          <div className="flex flex-wrap gap-1.5">
            {REGION_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setFilters(prev => ({ ...prev, region: prev.region === r ? null : r }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.region === r
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Level */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Level</label>
          <div className="flex flex-wrap gap-1.5">
            {SENIORITY_LEVELS.map(s => (
              <button
                key={s}
                onClick={() => setFilters(prev => ({ ...prev, seniority: prev.seniority === s ? null : s }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.seniority === s
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Job Type */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Job Type</label>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setFilters(prev => ({
                  ...prev,
                  types: prev.types.includes(t) ? [] : [t],
                }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.types.includes(t)
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Work Mode */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Work Mode</label>
          <div className="flex flex-wrap gap-1.5">
            {WORK_MODES.map(m => (
              <button
                key={m}
                onClick={() => setFilters(prev => ({
                  ...prev,
                  modes: prev.modes.includes(m) ? [] : [m],
                }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.modes.includes(m)
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Industry</label>
          <div className="flex flex-wrap gap-1.5">
            {industries.map(ind => (
              <button
                key={ind}
                onClick={() => setFilters(prev => ({ ...prev, industry: prev.industry === ind ? null : ind }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.industry === ind
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Accelerator / Fund */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Accelerator / Fund</label>
          <div className="flex flex-wrap gap-1.5">
            {BACKERS.map(a => (
              <button
                key={a}
                onClick={() => setFilters(prev => ({ ...prev, accelerator: prev.accelerator === a ? null : a }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.accelerator === a
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Company Stage */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Company Stage</label>
          <div className="flex flex-wrap gap-1.5">
            {FUNDING_ROUNDS.map(r => (
              <button
                key={r}
                onClick={() => setFilters(prev => ({ ...prev, companyStage: prev.companyStage === r ? null : r }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.companyStage === r
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Startup Hub */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Startup Hub</label>
          <div className="flex flex-wrap gap-1.5">
            {HUB_LABELS.map(h => (
              <button
                key={h}
                onClick={() => setFilters(prev => ({ ...prev, startupHub: prev.startupHub === h ? null : h }))}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                  filters.startupHub === h
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white/5 text-neutral-400 border-white/5'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Sponsorship */}
        <div>
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5 block">Visa Sponsorship</label>
          <button
            onClick={() => setFilters(prev => ({ ...prev, sponsorship: prev.sponsorship ? null : true }))}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
              filters.sponsorship
                ? 'bg-brand text-white border-brand'
                : 'bg-white/5 text-neutral-400 border-white/5'
            }`}
          >
            Sponsors Visa
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-3 pb-1">
          {hasActive && (
            <button
              onClick={clearAll}
              className="flex-1 py-3 text-sm font-bold text-neutral-400 border border-white/10 rounded-xl"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-white bg-brand rounded-xl"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Standalone mobile filter button (for use in the bottom search bar)
 */
export function MobileFilterButton({
  filters,
  setFilters,
  industries = [],
}: FilterBarProps) {
  const [showMobileSheet, setShowMobileSheet] = useState(false);

  const hasActiveFilters = filters.industry || filters.accelerator || filters.types.length > 0 || filters.modes.length > 0 || filters.region || filters.seniority || filters.sponsorship || filters.companyStage || filters.startupHub;
  const activeCount = [filters.industry, filters.accelerator, filters.region, filters.seniority, filters.sponsorship, filters.types[0], filters.modes[0], filters.companyStage, filters.startupHub].filter(Boolean).length;

  return (
    <>
      <button
        onClick={() => setShowMobileSheet(true)}
        className={`flex-shrink-0 flex items-center gap-1.5 h-12 px-3 text-xs font-bold rounded-xl border transition-all ${
          hasActiveFilters
            ? 'bg-brand text-white border-brand'
            : 'bg-[#141414] text-white/80 border-white/10'
        }`}
      >
        <SlidersHorizontal size={14} />
        {activeCount > 0 ? activeCount : ''}
      </button>
      {showMobileSheet && (
        <MobileFilterSheet
          filters={filters}
          setFilters={setFilters}
          industries={industries}
          onClose={() => setShowMobileSheet(false)}
        />
      )}
    </>
  );
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, industries = [] }) => {
  const hasActiveFilters = filters.industry || filters.accelerator || filters.types.length > 0 || filters.modes.length > 0 || filters.region || filters.seniority || filters.sponsorship || filters.companyStage || filters.startupHub;

  const clearFilters = () => {
    setFilters(prev => ({ ...prev, types: [], modes: [], industry: null, accelerator: null, region: null, seniority: null, sponsorship: null, companyStage: null, startupHub: null }));
  };

  return (
    <>
      {/* Tablet + Desktop only: themed dropdowns. Mobile uses MobileFilterButton in bottom bar */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar w-full">
        <StyledDropdown
          label="Industry"
          value={filters.industry}
          options={industries}
          onChange={(val) => setFilters(prev => ({ ...prev, industry: val }))}
          allLabel="All Industries"
        />
        <StyledDropdown
          label="Region"
          value={filters.region}
          options={REGION_OPTIONS}
          onChange={(val) => setFilters(prev => ({ ...prev, region: val }))}
          allLabel="All Regions"
        />
        <StyledDropdown
          label="Level"
          value={filters.seniority}
          options={SENIORITY_LEVELS}
          onChange={(val) => setFilters(prev => ({ ...prev, seniority: val }))}
          allLabel="All Levels"
        />
        <StyledDropdown
          label="Job Type"
          value={filters.types.length === 1 ? filters.types[0] : null}
          options={ROLE_TYPES}
          onChange={(val) => setFilters(prev => ({ ...prev, types: val ? [val] : [] }))}
          allLabel="All Job Types"
        />
        <StyledDropdown
          label="Work Mode"
          value={filters.modes.length === 1 ? filters.modes[0] : null}
          options={WORK_MODES}
          onChange={(val) => setFilters(prev => ({ ...prev, modes: val ? [val] : [] }))}
          allLabel="All Work Modes"
        />
        <StyledDropdown
          label="Accelerator / Fund"
          value={filters.accelerator}
          options={BACKERS}
          onChange={(val) => setFilters(prev => ({ ...prev, accelerator: val }))}
          allLabel="All Accelerators & Funds"
        />
        <StyledDropdown
          label="Company Stage"
          value={filters.companyStage}
          options={FUNDING_ROUNDS}
          onChange={(val) => setFilters(prev => ({ ...prev, companyStage: val }))}
          allLabel="All Stages"
        />
        <StyledDropdown
          label="Startup Hub"
          value={filters.startupHub}
          options={HUB_LABELS}
          onChange={(val) => setFilters(prev => ({ ...prev, startupHub: val }))}
          allLabel="All Hubs"
        />
        <button
          onClick={() => setFilters(prev => ({ ...prev, sponsorship: prev.sponsorship ? null : true }))}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap ${
            filters.sponsorship
              ? 'bg-brand text-white border-brand'
              : 'bg-[#141414] text-white/80 border-white/10 hover:bg-[#1a1a1a] hover:border-white/20'
          }`}
        >
          Sponsors Visa
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex-shrink-0 p-1.5 text-neutral-500 hover:text-white transition-colors"
            title="Clear filters"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </>
  );
};
