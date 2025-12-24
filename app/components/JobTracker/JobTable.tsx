import React from 'react';
import { Job } from '@/lib/types';
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import CompanyLogo from '../CompanyLogo';

interface JobTableProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  sortConfig: { key: keyof Job; direction: 'asc' | 'desc' } | null;
  onSort: (key: keyof Job) => void;
}

export const JobTable: React.FC<JobTableProps> = ({ jobs, onJobClick, sortConfig, onSort }) => {
  const headers: { key: keyof Job; label: string }[] = [
    { key: 'role', label: 'Role' },
    { key: 'company', label: 'Company' },
    { key: 'industry', label: 'Industry' },
    { key: 'location', label: 'Location' },
    { key: 'type', label: 'Type' },
    { key: 'salary', label: 'Salary' },
  ];

  const getSortIcon = (key: keyof Job) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  return (
    <div className="w-full overflow-hidden rounded-[2rem] border border-white/5 bg-[#0A0A0A] shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-5 text-xs font-bold text-neutral-500 uppercase tracking-wider w-16 text-center">
                Logo
              </th>
              {headers.map((header) => (
                <th
                  key={header.key}
                  onClick={() => onSort(header.key)}
                  className="px-6 py-5 text-xs font-bold text-neutral-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-2">
                    {header.label}
                    <span className={`transition-opacity ${sortConfig?.key === header.key ? 'opacity-100 text-brand' : 'opacity-0 group-hover:opacity-50'}`}>
                      {getSortIcon(header.key) || <ArrowUp size={12} />}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-6 py-5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {jobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onJobClick(job)}
                className="group hover:bg-white/5 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex justify-center items-center rounded-md overflow-hidden">
                    <CompanyLogo name={job.company} />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-white group-hover:text-brand transition-colors text-sm">
                    {job.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-neutral-300 text-sm">
                    {job.company}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {job.industry ? (
                    <span className="px-2.5 py-1 rounded-full border border-white/5 bg-white/5 text-xs text-neutral-400 font-medium whitespace-nowrap">
                      {job.industry}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-600">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-neutral-400">
                    {job.location || '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-neutral-400 whitespace-nowrap">
                    {job.type || '—'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-neutral-400 font-medium">
                    {job.salary || '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="p-2 text-neutral-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 duration-300">
                     <ExternalLink size={16} />
                   </button>
                </td>
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