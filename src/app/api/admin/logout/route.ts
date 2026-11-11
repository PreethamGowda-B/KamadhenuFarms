import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  getClientIp,
  getAdminSessionFromRequestAsync,
  revokeAdminTokenDistributed,
} from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const admin = await getAdminSessionFromRequestAsync(req);
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  await revokeAdminTokenDistributed(token);
  logAdminAction(admin?.email || 'admin@kamadhenuhoneyfarms.in', 'LOGOUT', undefined, undefined, ip);

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(0),
    path: '/',
  });

  return response;
}
