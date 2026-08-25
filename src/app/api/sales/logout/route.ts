import { NextResponse } from 'next/server';
import { SALES_COOKIE_NAME } from '@/lib/salesAuth';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  res.cookies.set(SALES_COOKIE_NAME, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  return res;
}
