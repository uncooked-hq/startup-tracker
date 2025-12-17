import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { mockJobs } from '@/lib/data/mockJobs';
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

  const filteredAndSortedJobs = useMemo(() => {
    // 1. Filter
    let result = mockJobs.filter(job => {
      // Search match
      const searchMatch = 
        job.role.toLowerCase().includes(filters.search.toLowerCase()) ||
        job.company.toLowerCase().includes(filters.search.toLowerCase()) ||
        job.industry.toLowerCase().includes(filters.search.toLowerCase());
      
      if (!searchMatch) return false;

      // Industry match
      if (filters.industry && job.industry !== filters.industry) {
        return false;
      }

      // Type match (OR logic for array)
      if (filters.types.length > 0 && !filters.types.includes(job.type)) {
        return false;
      }

      // Mode match
      if (filters.modes.length > 0 && !filters.modes.includes(job.workMode)) {
        return false;
      }

      return true;
    });

    // 2. Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Basic comparison (works for strings like company, role, etc.)
        // Note: For strings like salaries or dates ('2h ago'), this is a simple lexicographical sort.
        // For a production app, we would parse these values.
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
  }, [filters, sortConfig]);

  const handleSort = (key: keyof Job) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 pb-24 relative z-10" id="job-tracker">
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
                  {filteredAndSortedJobs.length} active jobs
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
        {filteredAndSortedJobs.length > 0 ? (
          viewMode === 'grid' ? (
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
          )
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