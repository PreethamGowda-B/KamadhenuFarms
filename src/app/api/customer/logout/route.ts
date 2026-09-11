import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CUSTOMER_COOKIE_NAME, clearCustomerSessionCookie } from '@/lib/customerAuth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(CUSTOMER_COOKIE_NAME)?.value;

  if (token) {
    try {
      await prisma.customerSession.deleteMany({
        where: { sessionToken: token },
      });
    } catch (e) {
      console.error('Error removing customer session:', e);
    }
  }

  const response = NextResponse.json({
    success: true,
    message: 'Signed out of customer account',
  });

  clearCustomerSessionCookie(response);
  return response;
}
