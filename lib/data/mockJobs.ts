import { Job } from '@/lib/types';

const companies = [
  { name: 'incident.io', logo: '🔥', industry: 'DevTools' },
  { name: 'Vercel', logo: '▲', industry: 'Infrastructure' },
  { name: 'Linear', logo: '⚡', industry: 'Productivity' },
  { name: 'Supabase', logo: '🟢', industry: 'Database' },
  { name: 'Midjourney', logo: '⛵', industry: 'AI' },
  { name: 'Resend', logo: '✉️', industry: 'DevTools' },
  { name: 'Perplexity', logo: '🧠', industry: 'AI' },
  { name: 'Ramp', logo: '💸', industry: 'Fintech' },
  { name: 'Family', logo: '💎', industry: 'Crypto' },
  { name: 'Notion', logo: '📓', industry: 'Productivity' },
  { name: 'Figma', logo: '🎨', industry: 'Design' },
  { name: 'OpenAI', logo: '🤖', industry: 'AI' },
  { name: 'Stripe', logo: '💳', industry: 'Fintech' },
  { name: 'Airbnb', logo: '🏠', industry: 'Consumer' },
  { name: 'Discord', logo: '🎮', industry: 'Consumer' },
  { name: 'Revolut', logo: '🇬🇧', industry: 'Fintech' },
  { name: 'Monzo', logo: '🏦', industry: 'Fintech' },
  { name: 'Canva', logo: '🖌️', industry: 'Design' },
  { name: 'Shopify', logo: '🛍️', industry: 'E-commerce' },
  { name: 'Spotify', logo: '🎧', industry: 'Consumer' },
  { name: 'Scale AI', logo: '⚖️', industry: 'AI' },
  { name: 'Retool', logo: '🛠️', industry: 'DevTools' },
  { name: 'Brex', logo: '💳', industry: 'Fintech' },
  { name: 'Loom', logo: '📹', industry: 'Productivity' },
  { name: 'Raycast', logo: '☀️', industry: 'Productivity' }
];

const roles = [
  'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 
  'Product Designer', 'Brand Designer', 'Product Manager', 
  'Developer Advocate', 'Growth Engineer', 'Data Scientist', 
  'AI Researcher', 'Founding Engineer', 'Staff Engineer',
  'Marketing Manager', 'Community Manager', 'Sales Engineer'
];

const locations = ['London, UK', 'San Francisco, CA', 'New York, NY', 'Remote', 'Berlin, DE', 'Singapore', 'Toronto, CA', 'Austin, TX', 'Los Angeles, CA'];
const types: Job['type'][] = ['Full-time', 'Contract', 'Internship', 'Part-time'];
const modes: Job['workMode'][] = ['Remote', 'Hybrid', 'Onsite'];

const generateJobs = (count: number): Job[] => {
  return Array.from({ length: count }).map((_, i) => {
    const company = companies[i % companies.length];
    const role = roles[i % roles.length];
    // Randomize slightly using simple math to appear random but consistent
    const locIndex = (i * 3 + 7) % locations.length;
    const typeIndex = (i * 2 + 1) % types.length;
    const modeIndex = (i * 5 + 2) % modes.length;
    const salaryBase = 80 + ((i * 13) % 120);
    const salaryTop = salaryBase + 40 + ((i * 7) % 60);
    
    return {
      id: `${i + 1}`,
      company: company.name,
      role: role,
      location: locations[locIndex],
      type: types[typeIndex],
      workMode: modes[modeIndex],
      salary: `$${salaryBase}k - $${salaryTop}k`,
      industry: company.industry,
      postedAt: `${(i % 23) + 1}h ago`,
      logo: company.logo,
      description: `join ${company.name.toLowerCase()} and help us build the future of ${company.industry.toLowerCase()}. we're looking for cracked engineers who want to ship fast and break things (safely). vibes are immaculate, snacks are unlimited.`,
      requirements: ['React', 'TypeScript', 'Vibes', 'Ship fast']
    };
  });
};

export const mockJobs: Job[] = generateJobs(100);
