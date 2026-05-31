import React from 'react';
import { Job } from '@/lib/types';
import { ArrowUp, ArrowDown } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';
import { BookmarkButton } from '../BookmarkButton';

const formatTimeAgo = (date: Date | null | undefined): string => {
  if (!date) return '—';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};

interface JobTableProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  sortConfig: { key: keyof Job; direction: 'asc' | 'desc' } | null;
  onSort: (key: keyof Job) => void;
  isSaved?: (jobId: string) => boolean;
  onToggleSave?: (jobId: string) => void;
}

// Visibility tiers:
//   '' = always visible
//   'hidden sm:table-cell' = hidden on mobile, visible on tablet+
//   'hidden lg:table-cell' = hidden on mobile+tablet, visible on desktop only
const headers: { key: keyof Job; label: string; hideClass: string; widthClass: string }[] = [
  { key: 'role', label: 'Role', hideClass: '', widthClass: 'lg:w-[20%]' },
  { key: 'company', label: 'Company', hideClass: 'hidden sm:table-cell', widthClass: 'w-[20%] lg:w-[14%]' },
  { key: 'location', label: 'Location', hideClass: 'hidden sm:table-cell', widthClass: 'w-[18%] lg:w-[14%]' },
  { key: 'industry', label: 'Industry', hideClass: 'hidden lg:table-cell', widthClass: 'w-[10%]' },
  { key: 'salary', label: 'Salary', hideClass: 'hidden lg:table-cell', widthClass: 'w-[10%]' },
  { key: 'firstSeenAt', label: 'Posted', hideClass: 'hidden sm:table-cell', widthClass: 'w-[8%]' },
];

export const JobTable: React.FC<JobTableProps> = ({ jobs, onJobClick, sortConfig, onSort, isSaved, onToggleSave }) => {
  const getSortIcon = (key: keyof Job) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl lg:rounded-[2rem] border border-white/5 bg-[#0A0A0A] shadow-2xl">
      <div className="w-full overflow-hidden">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-2 lg:px-4 py-3 lg:py-5 text-xs font-bold text-neutral-500 uppercase tracking-wider w-12 lg:w-14 text-center">
                Logo
              </th>
              {headers.map((header) => (
                <th
                  key={header.key}
                  onClick={() => onSort(header.key)}
                  className={`px-2 lg:px-4 py-3 lg:py-5 text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group select-none whitespace-nowrap ${header.hideClass} ${header.widthClass}`}
                >
                  <div className={`flex items-center gap-2 ${header.key === 'role' ? 'justify-center sm:justify-start' : ''}`}>
                    {header.label}
                    <span className={`transition-opacity ${sortConfig?.key === header.key ? 'opacity-100 text-brand' : 'opacity-0 group-hover:opacity-50'}`}>
                      {getSortIcon(header.key) || <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
              ))}
              {onToggleSave && (
                <th className="w-8 pl-1 pr-2 lg:pl-2 lg:pr-4 py-3 lg:py-5 hidden sm:table-cell"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {jobs.map((job, idx) => (
              <tr
                key={job.id}
                onClick={() => onJobClick(job)}
                className="group hover:bg-white/5 transition-colors cursor-pointer"
              >
                <td className="px-2 lg:px-4 py-3 lg:py-4">
                  <div className="flex justify-center items-center rounded-md overflow-hidden">
                    <CompanyLogo name={job.company} industry={job.industry} domain={job.companyDomain} />
                  </div>
                </td>
                {/* Role — always visible. On mobile, shows company + location inline below */}
                {/* max-w-0 forces the cell to honor table-fixed width so truncate works on overflow */}
                <td className="px-2 lg:px-4 py-3 lg:py-4 max-w-0">
                  <div className="font-bold text-white group-hover:text-brand transition-colors text-sm truncate sm:whitespace-normal">
                    {job.role}
                  </div>
                  <div className="block sm:hidden text-xs text-neutral-500 mt-0.5 truncate">
                    {job.company}{job.location ? ` · ${job.location}` : ''}
                  </div>
                </td>
                {/* Company — tablet+ */}
                <td className="px-2 lg:px-4 py-3 lg:py-4 hidden sm:table-cell">
                  <span className="font-medium text-neutral-300 text-sm">{job.company}</span>
                </td>
                {/* Location — tablet+ */}
                <td className="px-2 lg:px-4 py-3 lg:py-4 hidden sm:table-cell">
                  <span className="text-sm text-neutral-400 truncate block max-w-[200px]">{job.location || '—'}</span>
                </td>
                {/* Industry — desktop only */}
                <td className="px-2 lg:px-4 py-3 lg:py-4 hidden lg:table-cell">
                  {job.industry ? (
                    <span className="px-2.5 py-1 rounded-full border border-white/5 bg-white/5 text-xs text-neutral-400 font-medium whitespace-nowrap">
                      {job.industry}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-600">—</span>
                  )}
                </td>
                {/* Salary — desktop only */}
                <td className="px-2 lg:px-4 py-3 lg:py-4 hidden lg:table-cell">
                  <span className="text-sm text-neutral-400 font-medium">{job.salary || '—'}</span>
                </td>
                {/* Posted — tablet+ */}
                <td className="px-2 lg:px-4 py-3 lg:py-4 hidden sm:table-cell">
                  <span className="text-sm text-neutral-500 whitespace-nowrap">{formatTimeAgo(job.firstSeenAt)}</span>
                </td>
                {/* Bookmark — right side, tablet+ only */}
                {onToggleSave && (
                  <td className="pl-1 pr-2 lg:pl-2 lg:pr-4 py-3 lg:py-4 hidden sm:table-cell" id={idx === 0 ? 'tour-bookmark' : undefined}>
                    <BookmarkButton
                      saved={isSaved ? isSaved(job.id) : false}
                      onClick={() => onToggleSave(job.id)}
                      size={15}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {jobs.length === 0 && (
        <div className="p-12 text-center text-neutral-500">
          No jobs found.
        </div>
      )}
    </div>
  );
};
