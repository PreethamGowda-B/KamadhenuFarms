import { NextRequest, NextResponse } from 'next/server';
import { getRazorpayClient } from '@/lib/razorpay';
import { calculateShippingCharge } from '@/lib/shipping';

// Server-side authoritative product pricing
const AUTHORITATIVE_PRICES: Record<string, { name: string; prices: Record<string, number> }> = {
  p1: {
    name: 'Pure Raw Honey',
    prices: {
      '250g': 250,
      '500g': 399,
      '1kg': 749,
    },
  },
  p2: {
    name: 'Dry Fruits Honey',
    prices: {
      '250g': 399,
      '500g': 599,
      '1kg': 999,
    },
  },
};

const VALID_COUPONS: Record<string, { type: 'percent' | 'fixed'; value: number }> = {
  KAMADHENU10: { type: 'percent', value: 10 },
  HONEY50: { type: 'fixed', value: 50 },
  FREEPURE: { type: 'percent', value: 15 },
  PREETHUGOWDA01: { type: 'percent', value: 10 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      mobile,
      email,
      addressLine1,
      area,
      city,
      state,
      pincode,
      landmark,
      items,
      couponCode,
    } = body;

    // Validate customer inputs
    if (!name?.trim() || !mobile?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please provide full name, mobile number, and email' },
        { status: 400 }
      );
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    if (!addressLine1?.trim() || !city?.trim() || !state?.trim() || !pincode?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please provide complete street address, city, state, and pincode' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Your cart is empty' },
        { status: 400 }
      );
    }

    // 1. Calculate Authoritative Subtotal
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = AUTHORITATIVE_PRICES[item.productId];
      if (!product) {
        return NextResponse.json(
          { success: false, message: `Invalid product ID: ${item.productId}` },
          { status: 400 }
        );
      }

      const unitPrice = product.prices[item.weightVariant];
      if (!unitPrice) {
        return NextResponse.json(
          { success: false, message: `Invalid weight variant ${item.weightVariant} for ${product.name}` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      validatedItems.push({
        productId: item.productId,
        productNameSnapshot: product.name,
        weightVariant: item.weightVariant,
        quantity: qty,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    // 2. Calculate Server-side Verified Shipping Rate
    const shippingResult = await calculateShippingCharge(pincode, items);
    if (!shippingResult.serviceable) {
      return NextResponse.json(
        {
          success: false,
          serviceable: false,
          message: shippingResult.error || 'Delivery is currently not available for this delivery pincode',
        },
        { status: 400 }
      );
    }

    const shippingFee = shippingResult.shippingFee;

    // 3. Calculate Discount if coupon applied
    let discount = 0;
    if (couponCode && typeof couponCode === 'string') {
      const codeKey = couponCode.trim().toUpperCase();
      const coupon = VALID_COUPONS[codeKey];
      if (coupon) {
        if (coupon.type === 'percent') {
          discount = Math.round(subtotal * (coupon.value / 100));
        } else {
          discount = coupon.value;
        }
      }
    }

    // 4. Compute Final Verified Total
    const finalTotal = Math.max(1, subtotal - discount + shippingFee);

    // 5. Create Razorpay Standard Order
    const razorpay = getRazorpayClient();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(finalTotal * 100), // in paise
      currency: 'INR',
      notes: {
        brand: 'KAMADHENU_HONEY_FARMS',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerMobile: cleanMobile,
        deliveryPincode: pincode.trim(),
        shippingFee: String(shippingFee),
        subtotal: String(subtotal),
        discount: String(discount),
      },
    });

    return NextResponse.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      subtotal,
      shippingFee,
      discount,
      finalTotal,
      courierName: shippingResult.courierName,
      estimatedDays: shippingResult.estimatedDays,
    });
  } catch (error: any) {
    console.error('Create Razorpay order error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to initialize payment checkout' },
      { status: 500 }
    );
  }
}
