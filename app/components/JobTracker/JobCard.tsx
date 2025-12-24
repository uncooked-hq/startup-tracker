import React from 'react';
import { Job } from '@/lib/types';
import { MapPin, Briefcase, Clock, ArrowUpRight } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';

interface JobCardProps {
  job: Job;
  onClick: (job: Job) => void;
}

// Helper to format time ago
const formatTimeAgo = (date: Date | null | undefined): string => {
  if (!date) return 'Recently';
  
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now.getTime() - posted.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

export const JobCard: React.FC<JobCardProps> = ({ job, onClick }) => {
  return (
    <div 
      onClick={() => onClick(job)}
      className="group relative flex flex-col gap-5 p-7 transition-all duration-500 border rounded-[2rem] bg-[#0A0A0A] border-white/5 hover:border-brand/20 hover:bg-[#101010] hover:-translate-y-1 cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="flex items-center justify-center w-14 h-14 text-2xl bg-[#141414] rounded-2xl border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 ease-out shadow-inner text-white font-bold">
            <div className="flex justify-center items-center rounded-md overflow-hidden">
              <CompanyLogo name={job.company} />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-xl font-bold text-white group-hover:text-brand transition-colors tracking-tight">{job.role}</h3>
            <p className="text-sm text-neutral-500 font-medium group-hover:text-neutral-400 transition-colors">{job.company}</p>
          </div>
        </div>
        <span className="text-xs text-neutral-600 font-bold px-3 py-1 bg-[#141414] rounded-full border border-white/5 group-hover:border-white/10 transition-colors">
          {formatTimeAgo(job.postedAt || job.lastSeenAt)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mt-1">
        {job.location && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-400 bg-[#141414] rounded-full border border-white/5 group-hover:border-white/10 group-hover:text-neutral-300 transition-colors">
            <MapPin size={11} className="text-neutral-600 group-hover:text-neutral-500" /> {job.location}
          </span>
        )}
        {job.type && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-400 bg-[#141414] rounded-full border border-white/5 group-hover:border-white/10 group-hover:text-neutral-300 transition-colors">
            <Briefcase size={11} className="text-neutral-600 group-hover:text-neutral-500" /> {job.type}
          </span>
        )}
        {job.workMode && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-400 bg-[#141414] rounded-full border border-white/5 group-hover:border-white/10 group-hover:text-neutral-300 transition-colors">
            <Clock size={11} className="text-neutral-600 group-hover:text-neutral-500" /> {job.workMode}
          </span>
        )}
      </div>

      <button className="absolute bottom-7 right-7 p-3 bg-brand rounded-full opacity-0 transform translate-y-4 scale-75 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-500 text-white hover:bg-brand-hover">
        <ArrowUpRight size={20} strokeWidth={3} />
      </button>
    </div>
  );
};