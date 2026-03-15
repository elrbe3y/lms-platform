/**
 * Prisma Client Instance
 * منصة محمد الربيعي التعليمية
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const globalForPrismaAdapter = global as unknown as { prismaAdapter?: PrismaPg };

function getPrismaAdapter() {
  if (globalForPrismaAdapter.prismaAdapter) {
    return globalForPrismaAdapter.prismaAdapter;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);

  if (process.env.NODE_ENV !== 'production') {
    globalForPrismaAdapter.prismaAdapter = adapter;
  }

  return adapter;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: getPrismaAdapter(),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
