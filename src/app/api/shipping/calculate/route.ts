import { NextRequest, NextResponse } from 'next/server';
import { calculateShippingCharge } from '@/lib/shipping';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pincode, items, subtotal } = body;

    if (!pincode || typeof pincode !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 6-digit delivery pincode' },
        { status: 400 }
      );
    }

    const itemsList = (Array.isArray(items) && items.length > 0)
      ? items
      : [{ productId: 'p1', weightVariant: '500g', quantity: 1 }];

    const numericSubtotal = typeof subtotal === 'number' ? subtotal : undefined;
    const result = await calculateShippingCharge(pincode, itemsList, numericSubtotal);

    if (!result.serviceable) {
      return NextResponse.json({
        success: false,
        serviceable: false,
        message: result.error || 'Delivery is currently not available for this pincode',
      });
    }

    const isFree = (numericSubtotal !== undefined && numericSubtotal >= 999) || result.shippingFee === 0;

    return NextResponse.json({
      success: true,
      serviceable: true,
      shippingFee: isFree ? 0 : result.shippingFee,
      isFreeDelivery: isFree,
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
