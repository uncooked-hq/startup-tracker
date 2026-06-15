import React, { useEffect, useState } from 'react';
import { Job } from '@/lib/types';
import { X, MapPin, Briefcase, DollarSign, Building, ExternalLink, Flag } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';
import { BookmarkButton } from '../BookmarkButton';
import { ReportModal } from './ReportModal';

interface JobModalProps {
  job: Job | null;
  onClose: () => void;
  saved?: boolean;
  onToggleSave?: () => void;
  /** Called when a logged-out user clicks the bookmark (prompts sign-in). */
  onRequestLogin?: () => void;
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

export const JobModal: React.FC<JobModalProps> = ({ job, onClose, saved, onToggleSave, onRequestLogin }) => {
  const [reportOpen, setReportOpen] = useState(false);

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
    <>
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in-up">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-t-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[90vh]">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/5 flex items-start justify-between bg-[#141414] gap-3">
          <div className="flex gap-3 md:gap-4 items-center min-w-0 flex-1">
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-16 md:h-16 text-3xl bg-white/5 rounded-xl md:rounded-2xl border border-white/5 font-bold">
              <div className="flex justify-center items-center rounded-md overflow-hidden">
                <CompanyLogo name={job.company} industry={job.industry} domain={job.companyDomain} sources={job.sources} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-2xl font-semibold text-white tracking-tight truncate">{job.role}</h2>
              <div className="flex items-center gap-2 text-neutral-400 mt-0.5 md:mt-1 text-sm truncate">
                <span className="font-medium text-white truncate">{job.company}</span>
                {job.industry && (
                  <>
                    <span className="flex-shrink-0">·</span>
                    <span className="truncate">{job.industry}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onToggleSave ? (
              <BookmarkButton saved={!!saved} onClick={() => onToggleSave()} size={20} />
            ) : (
              // Logged out: keep the bookmark visible but prompt sign-in on click/hover.
              <BookmarkButton saved={false} onClick={() => onRequestLogin?.()} size={20} tooltip="sign in to save" />
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 transition-colors hover:text-white hover:bg-white/10 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 md:p-6 overflow-y-auto no-scrollbar space-y-6 md:space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
            <div className="p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 min-w-0">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><MapPin size={12}/> Location</div>
              <div className="text-sm font-medium text-white break-words line-clamp-2">{job.location || 'Not specified'}</div>
            </div>
            <div className="p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 min-w-0">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Briefcase size={12}/> Type</div>
              <div className="text-sm font-medium text-white break-words">{job.type || 'Not specified'}</div>
            </div>
            <div className="p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 min-w-0">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><DollarSign size={12}/> Salary</div>
              <div className="text-sm font-medium text-white break-words line-clamp-2">{formatSalary(job)}</div>
            </div>
            <div className="p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 min-w-0">
              <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1"><Building size={12}/> Mode</div>
              <div className="text-sm font-medium text-white break-words">{job.workMode || 'Not specified'}</div>
            </div>
          </div>

          {/* Additional Info */}
          {(job.roleLevel || job.fundingStage || job.offersEquity || job.offersSponsorship != null || job.fundingDetails) && (
            <div className="flex flex-wrap gap-2">
              {job.roleLevel && (
                <span className="px-3 py-1.5 text-xs text-neutral-300 bg-white/5 border border-white/5 rounded-full">
                  Level: {job.roleLevel}
                </span>
              )}
              {/* funding_stage is a source/category label (e.g. "Antler", "AI Lab",
                  "Built In") — display as a neutral tag. The real backer tag below
                  is sourced from job.backers, populated only when we have confirmed data. */}
              {job.fundingStage && (
                <span className="px-3 py-1.5 text-xs text-neutral-300 bg-white/5 border border-white/5 rounded-full">
                  {job.fundingStage}
                </span>
              )}
              {job.backers && job.backers.length > 0 && (
                <span className="px-3 py-1.5 text-xs text-brand bg-brand/5 border border-brand/20 rounded-full">
                  Backed by {job.backers.join(', ')}
                </span>
              )}
              {job.offersEquity && (
                <span className="px-3 py-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full">
                  Equity Available
                </span>
              )}
              {job.offersSponsorship === true && (
                <span className="px-3 py-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  Visa Sponsorship
                </span>
              )}
              {job.offersSponsorship === false && (
                <span className="px-3 py-1.5 text-xs text-neutral-500 bg-white/5 border border-white/5 rounded-full">
                  No Sponsorship
                </span>
              )}
              {job.fundingDetails && job.fundingDetails.split(' · ').filter(Boolean).map((segment, idx) => {
                const isFounded = /^founded\b/i.test(segment);
                return (
                  <span
                    key={`fd-${idx}`}
                    className={
                      isFounded
                        ? 'px-3 py-1.5 text-xs text-neutral-300 bg-white/5 border border-white/10 rounded-full'
                        : 'px-3 py-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full'
                    }
                  >
                    {segment}
                  </span>
                );
              })}
            </div>
          )}

          {/* Vibe Check */}
          {job.vibeCheck && (
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-serif italic text-white/80">the vibe check</h3>
              <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-brand/5 border border-brand/10 text-neutral-300 leading-relaxed text-sm break-words">
                {job.vibeCheck}
              </div>
            </div>
          )}

          {/* Skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-serif italic text-white/80">key skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-white/5 border border-white/5 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}


        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 border-t border-white/5 bg-[#141414] flex items-center justify-between gap-3 sticky bottom-0">
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-1.5 px-2 py-2 text-xs font-medium text-neutral-500 hover:text-red-400 transition-colors"
          >
            <Flag size={14} /> report
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 md:px-6 py-2.5 md:py-3 text-sm font-medium text-white transition-colors hover:bg-white/5 rounded-full"
            >
              close
            </button>
            {job.sources && job.sources.length > 0 && job.sources[0].application_url && (
              <a
                href={job.sources[0].application_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 md:px-8 py-2.5 md:py-3 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95 bg-brand rounded-full shadow-lg shadow-brand/20 flex items-center gap-2"
              >
                apply now <ExternalLink size={16} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
    {reportOpen && <ReportModal job={job} onClose={() => setReportOpen(false)} />}
    </>
  );
};
