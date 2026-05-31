import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, ArrowUp, HelpCircle, RotateCcw } from 'lucide-react';
import { Job, FilterState } from '@/lib/types';
import { FilterBar, MobileFilterButton } from './FilterBar';
import { JobModal } from './JobModal';
import { JobTable } from './JobTable';
import { useAuth } from '../AuthProvider';
import { LoginModal } from '../LoginModal';
import { useSavedJobs } from '../../hooks/useSavedJobs';
import { replayTour } from '../OnboardingTour';
import { Bookmark } from 'lucide-react';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export const JobTracker: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isSaved, toggleSave, count: savedCount } = useSavedJobs();
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    types: [],
    modes: [],
    industry: null,
    accelerator: null,
    region: null,
    seniority: null,
    sponsorship: null,
  });

  // 200ms feels snappier than the old 300ms — safe to lower now that
  // AbortController cancels every superseded request, so faster firing doesn't
  // mean more wasted backend work.
  const debouncedSearch = useDebounce(filters.search, 200);

  // Stable string versions of array filters for use in dependency arrays
  const modesKey = filters.modes.slice().sort().join(',');
  const typesKey = filters.types.slice().sort().join(',');
  const acceleratorKey = filters.accelerator || '';
  const regionKey = filters.region || '';
  const seniorityKey = filters.seniority || '';
  const sponsorshipKey = filters.sponsorship ? 'true' : '';

  const hasActiveFilters = !!(
    filters.search ||
    filters.industry ||
    filters.accelerator ||
    filters.types.length ||
    filters.modes.length ||
    filters.region ||
    filters.seniority ||
    filters.sponsorship
  );

  const resetAll = () => setFilters({
    search: '', types: [], modes: [],
    industry: null, accelerator: null, region: null, seniority: null, sponsorship: null,
  });

  const [sortConfig, setSortConfig] = useState<{ key: keyof Job; direction: 'asc' | 'desc' } | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // API state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);       // full-page spinner (initial load only)
  const [searching, setSearching] = useState(false);   // subtle indicator for filter/search changes
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [hasMore, setHasMore] = useState(true);

  const [isCompact, setIsCompact] = useState(false);
  const headerSentinelRef = useRef<HTMLDivElement>(null);

  // Use Intersection Observer to detect when the title area has scrolled out of view.
  // This avoids the jitter caused by scroll-position-based toggling.
  useEffect(() => {
    const sentinel = headerSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsCompact(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-80px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const scrollToTracker = () => {
    const el = document.getElementById('job-tracker');
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);
  // Tracks consecutive failed load-more requests; used to halt the infinite
  // retry loop when the API keeps 500ing (e.g. Supabase timeout on deep offsets).
  const loadMoreFailuresRef = useRef(0);
  // Cancels any in-flight /api/jobs request when a new one starts. Without this,
  // a slow search response can land AFTER a faster newer one and clobber state.
  const abortRef = useRef<AbortController | null>(null);
  // Authoritative current page, read by the infinite-scroll observer. Avoids
  // stale-closure bugs where setPagination hadn't propagated yet.
  const pageRef = useRef(1);

  // Fetch jobs from API
  const fetchJobs = useCallback(async (page: number, append: boolean = false) => {
    // Cancel any in-flight request — stale responses can't clobber newer state
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (append) {
        setLoadingMore(true);
      } else if (jobs.length === 0) {
        setLoading(true);  // full spinner only when no data yet
      } else {
        setSearching(true); // subtle indicator when we already have data
      }
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add all filters to query params
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (filters.industry) {
        params.append('industry', filters.industry);
      }
      if (filters.modes.length > 0) {
        params.append('work_mode', filters.modes.join(','));
      }
      if (filters.types.length > 0) {
        params.append('role_type', filters.types.join(','));
      }
      if (filters.accelerator) {
        params.append('accelerator', filters.accelerator);
      }
      if (filters.region) {
        params.append('region', filters.region);
      }
      if (filters.seniority) {
        params.append('role_level', filters.seniority);
      }
      if (filters.sponsorship) {
        params.append('sponsorship', 'true');
      }

      const response = await fetch(`/api/jobs?${params.toString()}`, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs (HTTP ${response.status})`);
      }

      const data = await response.json();

      // If a newer request started while we were awaiting, drop this response.
      if (controller.signal.aborted) return;

      if (append) {
        setJobs(prev => [...prev, ...(data.jobs || [])]);
      } else {
        setJobs(data.jobs || []);
      }

      setPagination(data.pagination);
      pageRef.current = page;
      // Trust the server's hasMore — it knows the raw fetch size before any
      // post-filter shrinkage (orphans / blacklist), which is what actually
      // determines whether there are more pages to load. Fallback to batch
      // size for older API responses that didn't ship the flag.
      const serverHasMore = (data as { hasMore?: boolean }).hasMore;
      if (typeof serverHasMore === 'boolean') {
        setHasMore(serverHasMore);
      } else {
        const batchSize = (data.jobs || []).length;
        setHasMore(batchSize >= pagination.limit);
      }
      // Reset failure tracker on success
      loadMoreFailuresRef.current = 0;
    } catch (err) {
      // Aborted by a newer request — silently drop, the newer one owns state
      if ((err as { name?: string })?.name === 'AbortError') return;
      console.error('Error fetching jobs:', err);
      if (append) {
        // Failed during infinite-scroll append. Stop the observer from hammering
        // the API forever if the same request keeps failing.
        loadMoreFailuresRef.current += 1;
        if (loadMoreFailuresRef.current >= 2) {
          // Two consecutive failures — halt pagination until user takes action.
          setHasMore(false);
          setError(err instanceof Error ? err.message : 'Failed to load more jobs');
        }
      } else if (jobs.length === 0) {
        // Only show full-screen error on initial load when there's nothing to show
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      }
    } finally {
      // Only flip loading flags if this is still the current request — a newer
      // request will manage its own flags.
      if (!controller.signal.aborted) {
        setLoading(false);
        setSearching(false);
        setLoadingMore(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.limit, debouncedSearch, filters.industry, modesKey, typesKey, acceleratorKey, regionKey, seniorityKey, sponsorshipKey]);

  // Initial load and filter changes
  useEffect(() => {
    pageRef.current = 1;
    setPagination(prev => ({ ...prev, page: 1 }));
    setHasMore(true);
    fetchJobs(1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.industry, modesKey, typesKey, acceleratorKey, regionKey, seniorityKey, sponsorshipKey]);

  // When user logs in, reset and refetch so infinite scroll can kick in
  useEffect(() => {
    if (isLoggedIn) {
      pageRef.current = 1;
      setPagination(prev => ({ ...prev, page: 1 }));
      setHasMore(true);
      fetchJobs(1, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Block while ANY fetch is in flight — including search/filter refetches
        // (`searching`), otherwise the observer can fire mid-search and append
        // the wrong page to results.
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !searching) {
          const nextPage = pageRef.current + 1;
          pageRef.current = nextPage;
          setPagination(prev => ({ ...prev, page: nextPage }));
          fetchJobs(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, searching, fetchJobs]);

  // Fetch all distinct industries once on mount
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/filters')
      .then(res => res.json())
      .then(data => setAvailableIndustries(data.industries || []))
      .catch(() => {});
  }, []);

  const filteredAndSortedJobs = useMemo(() => {
    let result = showSavedOnly ? jobs.filter(j => isSaved(j.id)) : [...jobs];

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Handle Date objects
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortConfig.direction === 'asc' 
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }

        // Basic comparison for strings and numbers
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [jobs, sortConfig, showSavedOnly, isSaved]);

  const handleSort = (key: keyof Job) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-28 md:pb-24 relative" id="job-tracker">
      {/* Invisible sentinel — when this scrolls out of view, the header compacts */}
      <div ref={headerSentinelRef} className="h-0" />

      {/* Controls Container - Sticky (desktop+tablet only; mobile uses bottom bar) */}
      <div className="hidden sm:block sticky top-[72px] z-40 pb-2 sm:pb-4 pt-2 sm:pt-4 -mt-2 sm:-mt-4 bg-black">
        <div className={`flex flex-col gap-2 sm:gap-4 md:gap-6 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] bg-[#0A0A0A] border border-white/5 shadow-2xl shadow-black/50 transition-all duration-300 overflow-hidden ${isCompact ? 'p-2 sm:p-3 md:p-6' : 'p-3 sm:p-4 md:p-8'}`}>
           <div className={`flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4 transition-all duration-300 overflow-hidden ${isCompact ? 'max-h-0 opacity-0 mb-0 pointer-events-none' : 'max-h-40 opacity-100 sm:mb-2'}`}>
             <div className="hidden md:block">
               <h2 className="text-2xl text-white font-bold mb-1 tracking-tight">fresh roles</h2>
               <p className="text-neutral-500 text-sm font-medium lowercase">updated daily. no stale listings allowed.</p>
             </div>
             <div className="md:hidden flex items-center justify-between">
               <h2 className="text-base text-white font-bold tracking-tight">fresh roles</h2>
               <div className="text-neutral-600 text-[10px] font-medium border border-white/5 px-2 py-0.5 rounded-full bg-white/5">
                 {pagination.total} jobs
               </div>
             </div>

             <div className="hidden md:flex items-center gap-3">
                <div className="text-neutral-600 text-xs font-medium tracking-wide uppercase border border-white/5 px-3 py-1.5 rounded-full bg-white/5">
                  {filteredAndSortedJobs.length} of {pagination.total} jobs
                </div>

                <div className="h-6 w-px bg-white/10 mx-1"></div>
                {isLoggedIn ? (
                  <button
                    onClick={() => setShowSavedOnly(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                      showSavedOnly
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white/5 text-neutral-500 border-white/5 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <Bookmark size={12} className={showSavedOnly ? 'fill-white' : ''} />
                    Saved{savedCount > 0 ? ` (${savedCount})` : ''}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all bg-white/5 text-neutral-500 border-white/5 hover:text-white hover:border-white/20"
                  >
                    <Bookmark size={12} />
                    Sign in to save
                  </button>
                )}

                <div className="h-6 w-px bg-white/10 mx-1"></div>

                <button
                  onClick={replayTour}
                  className="p-2 text-neutral-600 hover:text-white transition-colors"
                  title="Show guide"
                >
                  <HelpCircle size={18} />
                </button>
             </div>
          </div>

          {/* Search — hidden on mobile (moved to bottom bar), visible on desktop */}
          <div id="tour-search" className="relative w-full group hidden md:block">
            <div className="absolute inset-0 bg-brand/20 blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500 rounded-2xl" />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center justify-center">
              {searching ? (
                <Loader2 className="text-brand animate-spin" size={20} />
              ) : (
                <Search className="text-neutral-500 group-focus-within:text-white transition-colors" size={20} />
              )}
            </span>
            <input
              type="text"
              placeholder='try "remote engineer in london" or "fintech internships"...'
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="relative w-full h-14 pl-14 pr-28 bg-dark-input text-white rounded-2xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder:text-neutral-600 font-medium"
            />
            {hasActiveFilters && (
              <button
                onClick={resetAll}
                title="Reset search and filters"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full transition-all"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>

          {/* Filters — desktop only. Mobile uses MobileFilterButton in bottom bar */}
          <div id="tour-filters" className="hidden sm:block">
            <FilterBar filters={filters} setFilters={setFilters} industries={availableIndustries} />
          </div>
        </div>
      </div>

      <div id="job-results" className="flex flex-col gap-10 mt-6">

        {/* Content View */}
        {loading ? (
          <div className="col-span-full py-32 text-center text-neutral-500 border border-white/5 rounded-[2.5rem] bg-[#0A0A0A]">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-brand" />
            <p className="text-xl font-medium mb-2">loading fresh roles...</p>
            <p className="text-sm opacity-60">hang tight, we&apos;re fetching the latest opportunities</p>
          </div>
        ) : error ? (
          <div className="col-span-full py-32 text-center text-red-500 border border-red-500/20 rounded-[2.5rem] bg-[#0A0A0A]">
            <p className="text-xl font-medium mb-2">oops, something went wrong</p>
            <p className="text-sm mb-6 opacity-60">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors"
            >
              try again
            </button>
          </div>
        ) : filteredAndSortedJobs.length > 0 ? (
          <>
            <div className="animate-fade-in-up">
              <JobTable
                jobs={filteredAndSortedJobs}
                onJobClick={setSelectedJob}
                sortConfig={sortConfig}
                onSort={handleSort}
                isSaved={isLoggedIn ? isSaved : undefined}
                onToggleSave={isLoggedIn ? toggleSave : undefined}
              />
            </div>
            
            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-3 text-neutral-500">
                  <Loader2 className="w-5 h-5 animate-spin text-brand" />
                  <span className="text-sm font-medium">loading more roles...</span>
                </div>
              )}
              {!hasMore && pagination.total > pagination.limit && (
                <div className="text-neutral-600 text-sm font-medium">
                  you&apos;ve reached the end. {pagination.total} jobs loaded.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="col-span-full py-32 text-center text-neutral-500 border border-white/5 rounded-[2.5rem] bg-[#0A0A0A]">
            <p className="text-xl font-medium mb-2">no roles found matching your vibe.</p>
            <p className="text-sm mb-6 opacity-60">try adjusting your search filters</p>
            <button 
              onClick={resetAll}
              className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors"
            >
              clear all filters
            </button>
          </div>
        )}
      </div>

      <JobModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        saved={isLoggedIn && selectedJob ? isSaved(selectedJob.id) : false}
        onToggleSave={isLoggedIn && selectedJob ? () => toggleSave(selectedJob.id) : undefined}
      />
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {/* Mobile fixed bottom search bar + filter button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/90 backdrop-blur-lg border-t border-white/10 px-4 py-3 safe-area-pb">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 h-12">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
              {searching ? (
                <Loader2 className="text-brand animate-spin" size={18} />
              ) : (
                <Search className="text-neutral-500" size={18} />
              )}
            </span>
            <input
              type="text"
              placeholder="e.g. remote engineer in london..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className={`w-full h-12 pl-11 ${hasActiveFilters ? 'pr-11' : 'pr-4'} bg-[#141414] text-white rounded-xl border border-white/10 focus:outline-none focus:border-brand/50 transition-all placeholder:text-neutral-600 font-medium text-sm`}
            />
            {hasActiveFilters && (
              <button
                onClick={resetAll}
                aria-label="Reset search and filters"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
          <MobileFilterButton filters={filters} setFilters={setFilters} industries={availableIndustries} />
        </div>
      </div>

      {/* Scroll to top arrow — desktop only */}
      {isCompact && (
        <button
          onClick={scrollToTracker}
          className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 p-3 bg-brand text-white rounded-full shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all hover:scale-110 animate-fade-in-up"
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};