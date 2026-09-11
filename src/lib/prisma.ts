/* cSpell:disable */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSanitizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Supabase direct connection host (db.[ref].supabase.co) only resolves to IPv6,
  // which causes "Can't reach database server" on IPv4-only serverless runtimes (like Vercel / AWS Lambda).
  // Dynamically rewrite to the dedicated IPv4 pooler: aws-0-ap-northeast-2.pooler.supabase.com:6543
  if (url.includes('yohqiodernlavohsiffo')) {
    if (url.includes('pooler.supabase.com')) {
      if (!url.includes('pgbouncer=true')) {
        url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
      }
      return url;
    }

    url = url
      .replace('db.yohqiodernlavohsiffo.supabase.co:5432', 'aws-0-ap-northeast-2.pooler.supabase.com:6543')
      .replace('db.yohqiodernlavohsiffo.supabase.co:6543', 'aws-0-ap-northeast-2.pooler.supabase.com:6543')
      .replace('db.yohqiodernlavohsiffo.supabase.co', 'aws-0-ap-northeast-2.pooler.supabase.com:6543');

    url = url.replace('://postgres:', '://postgres.yohqiodernlavohsiffo:');

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

