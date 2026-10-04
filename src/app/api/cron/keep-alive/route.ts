import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  try {
    // Ping Supabase PostgreSQL with a lightweight native query
    // to refresh the database activity timestamp and prevent idle project pausing
    await prisma.$queryRaw`SELECT 1 as alive`;
    const latency = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        status: 'active',
        database: 'connected',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        message: 'Keep-alive ping successful. Supabase database and backend are active.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Keep-alive ping error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'degraded',
        error: error.message || 'Database ping failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
