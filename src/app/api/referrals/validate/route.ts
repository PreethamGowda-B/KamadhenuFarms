import { NextRequest, NextResponse } from 'next/server';
import { validateDiscountOrReferralCode } from '@/lib/referral';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, subtotal = 0, items = [], customerMobile = null } = body;

    const result = await validateDiscountOrReferralCode(
      code,
      Number(subtotal) || 0,
      items,
      customerMobile
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Referral validation API error:', error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        message: 'Error validating referral code',
      },
      { status: 500 }
    );
  }
}
