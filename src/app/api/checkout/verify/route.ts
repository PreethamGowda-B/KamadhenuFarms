import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { generateNextOrderNumber } from '@/lib/orderNumber';
import { calculateShippingCharge } from '@/lib/shipping';

const AUTHORITATIVE_PRICES: Record<string, { name: string; prices: Record<string, number> }> = {
  p1: {
    name: 'Pure Raw Honey',
    prices: {
      '250g': 1,
      '500g': 1,
      '1kg': 1,
    },
  },
  p2: {
    name: 'Dry Fruits Honey',
    prices: {
      '250g': 1,
      '500g': 1,
      '1kg': 1,
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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerDetails,
      items,
      couponCode,
    } = body;

    // 1. Verify Razorpay Payment Signature Server-Side
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Missing required Razorpay payment signature parameters' },
        { status: 400 }
      );
    }

    const isValidSignature = verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValidSignature) {
      console.error(`❌ [Razorpay] Invalid payment signature for order ${razorpay_order_id}`);
      return NextResponse.json(
        { success: false, message: 'Invalid payment signature. Payment verification failed.' },
        { status: 400 }
      );
    }

    // 2. Check if this Razorpay Order has already been confirmed (Idempotency)
    const existingOrder = await prisma.order.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: {
        customer: true,
        shippingAddress: true,
        items: true,
      },
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderNumber: existingOrder.orderNumber,
        message: 'Order already recorded successfully',
      });
    }

    // 3. Re-verify financial amounts server-side
    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const product = AUTHORITATIVE_PRICES[item.productId];
      if (!product) continue;
      const unitPrice = product.prices[item.weightVariant] || 0;
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      let weightKg = 0.5;
      if (item.weightVariant === '250g') weightKg = 0.35;
      else if (item.weightVariant === '500g') weightKg = 0.65;
      else if (item.weightVariant === '1kg') weightKg = 1.30;

      validatedItems.push({
        productId: item.productId,
        productNameSnapshot: product.name,
        weightVariant: item.weightVariant,
        quantity: qty,
        unitPrice,
        totalPrice: itemTotal,
        weightKg,
      });
    }

    const shippingResult = await calculateShippingCharge(customerDetails.pincode, items);
    const shippingFee = shippingResult.shippingFee;

    let discount = 0;
    if (couponCode) {
      const coupon = VALID_COUPONS[String(couponCode).trim().toUpperCase()];
      if (coupon) {
        discount = coupon.type === 'percent'
          ? Math.round(subtotal * (coupon.value / 100))
          : coupon.value;
      }
    }

    const finalTotal = Math.max(1, subtotal - discount + shippingFee);

    // 4. Generate Unique Sequential Order Number (e.g. KHF-ORD-000001)
    const orderNumber = await generateNextOrderNumber();

    // 5. Database Persistence inside a Transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Find or Create Customer
      const cleanMobile = customerDetails.mobile.replace(/\D/g, '');
      let customer = await tx.customer.findFirst({
        where: {
          OR: [
            { mobile: cleanMobile },
            { email: customerDetails.email.trim().toLowerCase() },
          ],
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerDetails.name.trim(),
            mobile: cleanMobile,
            email: customerDetails.email.trim().toLowerCase(),
          },
        });
      } else {
        // Update name if changed
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { name: customerDetails.name.trim() },
        });
      }

      // Create Address record
      const address = await tx.address.create({
        data: {
          customerId: customer.id,
          recipientName: customerDetails.name.trim(),
          mobileNumber: cleanMobile,
          addressLine1: customerDetails.addressLine1.trim(),
          addressLine2: customerDetails.addressLine2?.trim() || null,
          area: customerDetails.area?.trim() || '',
          city: customerDetails.city.trim(),
          state: customerDetails.state.trim(),
          pincode: customerDetails.pincode.trim(),
          landmark: customerDetails.landmark?.trim() || null,
        },
      });

      // Create Order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          shippingAddressId: address.id,
          subtotal,
          shippingFee,
          discount,
          total: finalTotal,
          currency: 'INR',
          paymentStatus: 'PAID',
          orderStatus: 'CONFIRMED',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          notes: customerDetails.landmark ? `Landmark: ${customerDetails.landmark}` : null,
          items: {
            create: validatedItems.map((it) => ({
              productId: it.productId,
              productNameSnapshot: it.productNameSnapshot,
              weightVariant: it.weightVariant,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
              weightKg: it.weightKg,
            })),
          },
          payments: {
            create: {
              provider: 'RAZORPAY',
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              amount: finalTotal,
              currency: 'INR',
              paymentMethod: 'ONLINE',
              status: 'PAID',
            },
          },
          shipments: {
            create: {
              courierProvider: shippingResult.courierName || 'Standard Courier',
              shippingFee,
              status: 'PENDING',
            },
          },
        },
      });

      // Create Admin Notification for new order
      await tx.adminNotification.create({
        data: {
          title: `New Online Order: ${orderNumber}`,
          message: `${customer.name} placed an order of ₹${finalTotal} (${orderNumber}) via Razorpay.`,
          type: 'HIGH_VALUE_ORDER',
          link: `/admin/orders/${order.id}`,
        },
      });

      return order;
    });

    console.log(`✅ [Order Created] Order ${createdOrder.orderNumber} successfully confirmed.`);

    return NextResponse.json({
      success: true,
      orderNumber: createdOrder.orderNumber,
      orderId: createdOrder.id,
      amount: createdOrder.total,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to verify payment and record order' },
      { status: 500 }
    );
  }
}
