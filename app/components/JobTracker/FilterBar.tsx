import React, { useMemo } from 'react';
import { FilterState } from '@/lib/types';
import { ChevronDown, X } from 'lucide-react';
import { mockJobs } from '@/lib/data/mockJobs';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {
  const industries = useMemo(() => Array.from(new Set(mockJobs.map(j => j.industry))).sort(), []);

  const toggleType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type) 
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const toggleMode = (mode: string) => {
    setFilters(prev => ({
      ...prev,
      modes: prev.modes.includes(mode)
        ? prev.modes.filter(m => m !== mode)
        : [...prev.modes, mode]
    }));
  };

  const roleTypes = ['Full-time', 'Internship', 'Contract', 'Part-time'];
  const workModes = ['Remote', 'Hybrid', 'Onsite'];

  return (
    <div className="flex flex-wrap items-center w-full">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full pb-2 md:pb-0 mask-gradient pl-1">
        
        {/* Functional Industry Dropdown */}
        <div className="relative flex-shrink-0">
          <button className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full border transition-all ${
            filters.industry 
              ? 'bg-brand text-white border-brand' 
              : 'bg-[#141414] text-white border-white/10 hover:bg-[#1a1a1a] hover:border-white/20'
          }`}>
            {filters.industry || 'Industry'} 
            <ChevronDown size={14} className={filters.industry ? 'text-white' : 'text-neutral-500'}/>
          </button>
          
          {/* Native Select Overlay for accessibility and mobile support */}
          <select 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={filters.industry || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value || null }))}
          >
            <option value="">All Industries</option>
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        {/* Clear filters button (only visible if any filter is active) */}
        {(filters.industry || filters.types.length > 0 || filters.modes.length > 0) && (
           <button 
             onClick={() => setFilters({ search: filters.search, types: [], modes: [], industry: null })}
             className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-xs font-bold text-neutral-500 hover:text-white transition-colors"
           >
             <X size={12} /> clear
           </button>
        )}

        <div className="w-px h-6 bg-white/5 mx-2 flex-shrink-0" />

        {roleTypes.map(type => (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`flex-shrink-0 px-5 py-2.5 text-sm font-bold rounded-full border transition-all duration-300 ${
              filters.types.includes(type)
                ? 'bg-white text-black border-white scale-105'
                : 'bg-transparent text-neutral-500 border-white/5 hover:border-white/20 hover:text-white hover:bg-[#141414]'
            }`}
          >
            {type}
          </button>
        ))}

        <div className="w-px h-6 bg-white/5 mx-2 flex-shrink-0" />

        {workModes.map(mode => (
          <button
            key={mode}
            onClick={() => toggleMode(mode)}
            className={`flex-shrink-0 px-5 py-2.5 text-sm font-bold rounded-full border transition-all duration-300 ${
              filters.modes.includes(mode)
                ? 'bg-white text-black border-white scale-105'
                : 'bg-transparent text-neutral-500 border-white/5 hover:border-white/20 hover:text-white hover:bg-[#141414]'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
};
