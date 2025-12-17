export interface Job {
  id: string;
  company: string;
  role: string;
  location: string;
  type: 'Full-time' | 'Contract' | 'Internship' | 'Part-time';
  workMode: 'Remote' | 'Hybrid' | 'Onsite';
  salary: string;
  industry: string;
  postedAt: string; // e.g., "2d ago"
  logo: string; // emoji or url
  description: string;
  requirements: string[];
}

export interface FilterState {
  search: string;
  types: string[];
  modes: string[];
  industry: string | null;
}