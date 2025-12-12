import { prisma } from './prisma'

async function seed() {
  const testJobs = [
    {
      company_name: 'TechCorp',
      industry: 'SaaS',
      location: 'San Francisco, CA',
      funding_stage: 'Series B',
      role_title: 'Senior Full Stack Engineer',
      role_type: 'Full-time',
      role_level: 'Senior',
      work_mode: 'Remote',
      compensation: '$150,000 - $200,000',
      equity: '0.1% - 0.5%',
      posting_date: new Date(),
      closing_date: null,
      company_description: 'TechCorp is a leading SaaS platform helping businesses scale.',
      application_link: 'https://techcorp.com/jobs/senior-engineer-1',
      source_website: 'https://www.ycombinator.com/jobs',
      is_active: true,
    },
    {
      company_name: 'StartupXYZ',
      industry: 'Fintech',
      location: 'New York, NY',
      funding_stage: 'Series A',
      role_title: 'Mid-Level Backend Developer',
      role_type: 'Full-time',
      role_level: 'Mid',
      work_mode: 'Hybrid',
      compensation: '$120,000 - $150,000',
      equity: null,
      posting_date: new Date(),
      closing_date: null,
      company_description: 'StartupXYZ is revolutionizing the fintech space.',
      application_link: 'https://startupxyz.com/jobs/backend-dev-1',
      source_website: 'https://www.workatastartup.com',
      is_active: true,
    },
    {
      company_name: 'AI Innovations',
      industry: 'AI/ML',
      location: 'Remote',
      funding_stage: 'Seed',
      role_title: 'Entry Level Frontend Developer',
      role_type: 'Full-time',
      role_level: 'Entry',
      work_mode: 'Remote',
      compensation: '$80,000 - $100,000',
      equity: '0.05% - 0.2%',
      posting_date: new Date(),
      closing_date: null,
      company_description: 'AI Innovations is building the future of artificial intelligence.',
      application_link: 'https://aiinnovations.com/jobs/frontend-1',
      source_website: 'https://www.ycombinator.com/jobs',
      is_active: true,
    },
    {
      company_name: 'DataFlow',
      industry: 'Data Analytics',
      location: 'London, UK',
      funding_stage: 'Series C',
      role_title: 'Lead Data Engineer',
      role_type: 'Full-time',
      role_level: 'Senior',
      work_mode: 'Onsite',
      compensation: '£90,000 - £120,000',
      equity: null,
      posting_date: new Date(),
      closing_date: null,
      company_description: 'DataFlow provides cutting-edge data analytics solutions.',
      application_link: 'https://dataflow.com/jobs/lead-engineer-1',
      source_website: 'https://www.workatastartup.com',
      is_active: true,
    },
    {
      company_name: 'CloudScale',
      industry: 'Cloud Infrastructure',
      location: 'Austin, TX',
      funding_stage: 'Series A',
      role_title: 'DevOps Engineer',
      role_type: 'Full-time',
      role_level: 'Mid',
      work_mode: 'Hybrid',
      compensation: '$130,000 - $160,000',
      equity: '0.2% - 0.4%',
      posting_date: new Date(),
      closing_date: null,
      company_description: 'CloudScale is building the next generation of cloud infrastructure.',
      application_link: 'https://cloudscale.com/jobs/devops-1',
      source_website: 'https://www.ycombinator.com/jobs',
      is_active: true,
    },
  ]

  console.log('Seeding database with test jobs...')

  for (const job of testJobs) {
    await prisma.job.upsert({
      where: {
        application_link: job.application_link,
      },
      update: job,
      create: job,
    })
  }

  console.log(`✓ Seeded ${testJobs.length} test jobs`)
  await prisma.$disconnect()
}

seed()
  .catch((error) => {
    console.error('Error seeding database:', error)
    process.exit(1)
  })

