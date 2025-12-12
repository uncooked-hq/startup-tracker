import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Fix database URL for Next.js - convert relative paths to absolute
function getDatabaseUrl(): string {
  let databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db'
  
  if (databaseUrl.startsWith('file:./') || databaseUrl.startsWith('file:../')) {
    // Remove 'file:' prefix and resolve path relative to project root
    const dbPath = databaseUrl.replace(/^file:/, '')
    const absolutePath = path.resolve(process.cwd(), dbPath)
    databaseUrl = `file:${absolutePath}`
  }
  
  return databaseUrl
}

const databaseUrl = getDatabaseUrl()

// Override DATABASE_URL in process.env so Prisma schema can read it
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:./')) {
  process.env.DATABASE_URL = databaseUrl
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

