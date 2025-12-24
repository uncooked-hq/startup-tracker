import React, { useEffect } from 'react';
import { Job } from '@/lib/types';
import { X, MapPin, Briefcase, DollarSign, Building, ExternalLink, Link2, Calendar } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';

interface JobModalProps {
  job: Job | null;
  onClose: () => void;
}

// Helper to format salary range
const formatSalary = (job: Job): string => {
  if (job.salary) return job.salary;
  if (job.salaryMin && job.salaryMax) {
    const currency = job.salaryCurrency || 'USD';
    return `${currency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
  }
  if (job.salaryMin) {
    const currency = job.salaryCurrency || 'USD';
    return `${currency} ${job.salaryMin.toLocaleString()}+`;
  }
  return 'Not specified';
};

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-[#141414]">
          <div className="flex gap-4 items-center">
            <div className="flex items-center justify-center w-16 h-16 text-3xl bg-white/5 rounded-2xl border border-white/5 font-bold">
              <div className="flex justify-center items-center rounded-md overflow-hidden">
                <CompanyLogo name={job.company} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">{job.role}</h2>
              <div className="flex items-center gap-2 text-neutral-400 mt-1">
                <span className="font-medium text-white">{job.company}</span>
                {job.industry && (
                  <>
                    <span>•</span>
                    <span>{job.industry}</span>
                  </>
                )}
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
              <div className="text-sm font-medium text-white truncate">{job.location || 'Not specified'}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Briefcase size={12}/> Type</div>
              <div className="text-sm font-medium text-white truncate">{job.type || 'Not specified'}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><DollarSign size={12}/> Salary</div>
              <div className="text-sm font-medium text-white truncate">{formatSalary(job)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Building size={12}/> Mode</div>
              <div className="text-sm font-medium text-white truncate">{job.workMode || 'Not specified'}</div>
            </div>
          </div>

          {/* Additional Info */}
          {(job.roleLevel || job.fundingStage || job.offersEquity) && (
            <div className="flex flex-wrap gap-2">
              {job.roleLevel && (
                <span className="px-3 py-1.5 text-xs text-neutral-300 bg-white/5 border border-white/5 rounded-full">
                  Level: {job.roleLevel}
                </span>
              )}
              {job.fundingStage && (
                <span className="px-3 py-1.5 text-xs text-neutral-300 bg-white/5 border border-white/5 rounded-full">
                  {job.fundingStage}
                </span>
              )}
              {job.offersEquity && (
                <span className="px-3 py-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full">
                  Equity Available
                </span>
              )}
            </div>
          )}

          {/* Company Description */}
          {job.description && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif italic text-white/80">about the company</h3>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-neutral-300 leading-relaxed">
                {job.description}
              </div>
            </div>
          )}

          {/* Role Description */}
          {job.roleDescription && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif italic text-white/80">about the role</h3>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-neutral-300 leading-relaxed">
                {job.roleDescription}
              </div>
            </div>
          )}

          {/* Sources - Where this job is listed */}
          {job.sources && job.sources.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-serif italic text-white/80 flex items-center gap-2">
                <Link2 size={18} /> found on {job.sources.length} platform{job.sources.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {job.sources.map((source) => (
                  <a
                    key={source.id}
                    href={source.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand/30 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-brand/10 rounded-xl border border-brand/20 text-brand font-bold text-sm">
                        {source.source.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{source.source}</div>
                        <div className="text-xs text-neutral-500 flex items-center gap-1">
                          <Calendar size={10} />
                          Last seen: {new Date(source.last_seen_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-neutral-500 group-hover:text-brand transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-[#141414] flex justify-end gap-3 sticky bottom-0">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5 rounded-full"
          >
            close
          </button>
          {job.sources && job.sources.length > 0 && (
            <a
              href={job.sources[0].application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95 bg-brand rounded-full shadow-lg shadow-brand/20 flex items-center gap-2"
            >
              apply now <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};