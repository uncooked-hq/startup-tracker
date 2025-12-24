import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, LayoutGrid, List, Loader2 } from 'lucide-react';
import { Job, FilterState } from '@/lib/types';
import { JobCard } from './JobCard';
import { FilterBar } from './FilterBar';
import { JobModal } from './JobModal';
import { JobTable } from './JobTable';

export const JobTracker: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    types: [],
    modes: [],
    industry: null
  });

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Job; direction: 'asc' | 'desc' } | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // API state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [hasMore, setHasMore] = useState(true);

  // Intersection Observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch jobs from API
  const fetchJobs = useCallback(async (page: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters to query params
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.industry) {
        params.append('industry', filters.industry);
      }

      const response = await fetch(`/api/jobs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      
      if (append) {
        setJobs(prev => [...prev, ...(data.jobs || [])]);
      } else {
        setJobs(data.jobs || []);
      }
      
      setPagination(data.pagination);
      setHasMore(data.pagination.page < data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pagination.limit, filters.search, filters.industry]);

  // Initial load and filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setHasMore(true);
    fetchJobs(1, false);
  }, [filters.search, filters.industry, fetchJobs]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = pagination.page + 1;
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
  }, [hasMore, loading, loadingMore, pagination.page, fetchJobs]);

  const filteredAndSortedJobs = useMemo(() => {
    // 1. Client-side filter (for types and modes, since search and industry are handled server-side)
    let result = jobs.filter(job => {
      // Type match (OR logic for array)
      if (filters.types.length > 0 && job.type && !filters.types.includes(job.type)) {
        return false;
      }

      // Mode match
      if (filters.modes.length > 0 && job.workMode && !filters.modes.includes(job.workMode)) {
        return false;
      }

      return true;
    });

    // 2. Sort
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
  }, [jobs, filters.types, filters.modes, sortConfig]);

  const handleSort = (key: keyof Job) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pb-24 relative" id="job-tracker">
      <div className="flex flex-col gap-10">
        
        {/* Controls Container */}
        <div className="flex flex-col gap-6 p-8 rounded-[2.5rem] bg-[#0A0A0A] border border-white/5 shadow-2xl shadow-black/50">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
             <div>
               <h2 className="text-2xl text-white font-bold mb-1 tracking-tight">fresh roles</h2>
               <p className="text-neutral-500 text-sm font-medium lowercase">updated daily. no stale listings allowed.</p>
             </div>
             
             <div className="flex items-center gap-3">
                <div className="text-neutral-600 text-xs font-medium tracking-wide uppercase border border-white/5 px-3 py-1.5 rounded-full bg-white/5">
                  {filteredAndSortedJobs.length} of {pagination.total} jobs
                </div>
                
                <div className="h-6 w-px bg-white/10 mx-1 hidden md:block"></div>
                
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-full border border-white/5">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                    title="Card View"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-full transition-all ${viewMode === 'table' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                    title="Table View"
                  >
                    <List size={16} />
                  </button>
                </div>
             </div>
          </div>

          {/* Search */}
          <div className="relative w-full group">
            <div className="absolute inset-0 bg-brand/20 blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500 rounded-2xl" />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" size={20} />
            <input 
              type="text"
              placeholder="search role, company, or vibe..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="relative w-full h-14 pl-14 pr-6 bg-dark-input text-white rounded-2xl border border-white/10 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all placeholder:text-neutral-600 font-medium"
            />
          </div>

          {/* Filters */}
          <FilterBar filters={filters} setFilters={setFilters} />
        </div>

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
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                {filteredAndSortedJobs.map(job => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onClick={setSelectedJob} 
                  />
                ))}
              </div>
            ) : (
              <div className="animate-fade-in-up">
                <JobTable 
                  jobs={filteredAndSortedJobs} 
                  onJobClick={setSelectedJob}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              </div>
            )}
            
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
              onClick={() => setFilters({ search: '', types: [], modes: [], industry: null })}
              className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors"
            >
              clear all filters
            </button>
          </div>
        )}
      </div>

      <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
};