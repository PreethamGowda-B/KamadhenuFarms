import { NextRequest, NextResponse } from 'next/server';
import { calculateShippingCharge } from '@/lib/shipping';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pincode, items } = body;

    if (!pincode || typeof pincode !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 6-digit delivery pincode' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cart cannot be empty' },
        { status: 400 }
      );
    }

    const result = await calculateShippingCharge(pincode, items);

    if (!result.serviceable) {
      return NextResponse.json({
        success: false,
        serviceable: false,
        message: result.error || 'Delivery is currently not available for this pincode',
      });
    }

    return NextResponse.json({
      success: true,
      serviceable: true,
      shippingFee: result.shippingFee,
      courierName: result.courierName,
      estimatedDays: result.estimatedDays,
    });
  } catch (error: any) {
    console.error('Shipping calculation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to calculate shipping rate' },
      { status: 500 }
    );
  }
}
