import { prisma } from './prisma'

async function test() {
  try {
    const count = await prisma.job.count()
    console.log(`✓ Database connection successful! Found ${count} jobs`)
    
    const jobs = await prisma.job.findMany({ take: 3 })
    console.log('\nSample jobs:')
    jobs.forEach(job => {
      console.log(`- ${job.company_name}: ${job.role_title}`)
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('✗ Database connection failed:', error)
    process.exit(1)
  }
}

test()

