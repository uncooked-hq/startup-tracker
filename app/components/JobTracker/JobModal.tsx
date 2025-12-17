import React, { useEffect } from 'react';
import { Job } from '@/lib/types';
import { X, MapPin, Briefcase, DollarSign, Building, ExternalLink } from 'lucide-react';

interface JobModalProps {
  job: Job | null;
  onClose: () => void;
}

export const JobModal: React.FC<JobModalProps> = ({ job, onClose }) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (job) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [job]);

  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-[#141414]">
          <div className="flex gap-4 items-center">
            <div className="flex items-center justify-center w-16 h-16 text-3xl bg-white/5 rounded-2xl border border-white/5">
              {job.logo}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">{job.role}</h2>
              <div className="flex items-center gap-2 text-neutral-400 mt-1">
                <span className="font-medium text-white">{job.company}</span>
                <span>•</span>
                <span>{job.industry}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-500 transition-colors hover:text-white hover:bg-white/10 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto no-scrollbar space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><MapPin size={12}/> Location</div>
              <div className="text-sm font-medium text-white truncate">{job.location}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Briefcase size={12}/> Type</div>
              <div className="text-sm font-medium text-white truncate">{job.type}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><DollarSign size={12}/> Salary</div>
              <div className="text-sm font-medium text-white truncate">{job.salary}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Building size={12}/> Mode</div>
              <div className="text-sm font-medium text-white truncate">{job.workMode}</div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif italic text-white/80">the vibe check</h3>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-neutral-300 leading-relaxed lowercase">
              "{job.description}"
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-serif italic text-white/80">what you need</h3>
            <div className="flex flex-wrap gap-2">
              {job.requirements.map((req, index) => (
                <span key={index} className="px-3 py-1.5 text-sm text-white bg-[#1a1a1a] border border-white/10 rounded-full">
                  {req}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-[#141414] flex justify-end gap-3 sticky bottom-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5 rounded-full"
          >
            close
          </button>
          <button 
            onClick={() => console.log(`Applied to ${job.id}`)}
            className="px-8 py-3 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95 bg-brand rounded-full shadow-lg shadow-brand/20 flex items-center gap-2"
          >
            apply now <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};