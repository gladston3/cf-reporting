import { describe, it, expect } from 'vitest';

import { prisma } from '@/lib/db';

describe('Prisma client singleton', () => {
  it('exports a PrismaClient instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
    expect(typeof prisma.$disconnect).toBe('function');
  });

  it('returns the same instance on multiple imports', async () => {
    const { prisma: prisma2 } = await import('@/lib/db');
    expect(prisma).toBe(prisma2);
  });
});
