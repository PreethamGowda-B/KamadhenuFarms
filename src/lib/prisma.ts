import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSanitizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // If a direct connection port 5432 is configured in serverless (e.g. Vercel),
  // automatically route through Supabase connection pooler on port 6543
  if (url.includes('.supabase.co:5432')) {
    url = url.replace('.supabase.co:5432', '.supabase.co:6543');
    if (!url.includes('pgbouncer=true')) {
      url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
  }
  return url;
}

const dbUrl = getSanitizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

