// Represents a job source from a specific platform
export interface JobSource {
  id: string;
  source: string;
  source_role_id: string;
  source_url: string;
  application_url: string;
  last_seen_at: Date;
  created_at: Date;
}

// Main job interface matching TrackerRole schema
export interface Job {
  id: string;
  // Company info
  company: string; // mapped from company_name
  companyDomain?: string | null;
  industry?: string | null;
  fundingStage?: string | null;
  
  // Role info
  role: string; // mapped from role_title
  roleLevel?: string | null;
  type?: string | null; // mapped from role_type
  workMode?: string | null; // mapped from work_mode
  location?: string | null;
  
  // Compensation
  salary?: string | null; // mapped from compensation_text
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  offersEquity?: boolean | null;
  
  // Content
  description?: string | null; // mapped from company_description
  roleDescription?: string | null;
  
  // Dates
  postedAt?: Date | null; // mapped from posting_date
  closingDate?: Date | null;
  
  // Status
  isActive: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  
  // Sources - array of platforms where this job is listed
  sources?: JobSource[];
  
  // Legacy fields for backward compatibility
  logo?: string;
  requirements?: string[];
}

export interface FilterState {
  search: string;
  types: string[];
  modes: string[];
  industry: string | null;
}