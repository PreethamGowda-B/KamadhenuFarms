import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { generateNextOrderNumber } from '@/lib/orderNumber';
import { calculateShippingCharge } from '@/lib/shipping';
import { validateDiscountOrReferralCode } from '@/lib/referral';
import { isBangaloreDelivery } from '@/lib/location';

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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerDetails,
      items,
      couponCode,
      paymentMethod = 'razorpay',
    } = body;

    const isCod = String(paymentMethod).toLowerCase() === 'cod';

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

    // 2. Strict Server-Side Bangalore Restriction for Cash on Delivery
    if (isCod && !isBangaloreDelivery(customerDetails.pincode, customerDetails.city)) {
      return NextResponse.json(
        { success: false, message: 'Cash on Delivery is currently available only within Bangalore.' },
        { status: 400 }
      );
    }

    // 3. Check if this Razorpay Order has already been confirmed (Idempotency)
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

    // 4. Re-verify financial amounts and referral/coupon discounts server-side
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

    // Server-Side Authoritative Referral & Coupon Validation
    const validation = await validateDiscountOrReferralCode(
      couponCode,
      subtotal,
      items,
      customerDetails.mobile,
      customerDetails.email
    );
    const discount = validation.valid ? validation.calculatedDiscount : 0;
    const finalTotal = Math.max(1, subtotal - discount + shippingFee);

    // 50% Advance calculation for COD orders
    const advanceAmount = isCod ? Math.ceil(finalTotal * 0.50) : finalTotal;
    const codRemainingAmount = isCod ? (finalTotal - advanceAmount) : 0;

    // 5. Generate Unique Sequential Order Number (e.g. KHF-ORD-000001)
    const orderNumber = await generateNextOrderNumber();

    // 6. Database Persistence inside a Transaction
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

      // Check if this customer has prior paid orders to determine if they are genuinely new
      const priorPaidOrdersCount = await tx.order.count({
        where: {
          customerId: customer.id,
          paymentStatus: { in: ['PAID', 'FULLY_PAID', 'COD_ADVANCE_PAID'] },
        },
      });
      const isGenuinelyNewCustomer = priorPaidOrdersCount === 0;

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

      // Create Order record with orderStatus 'NEW' for owner order management
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
          paymentMethod: isCod ? 'COD' : 'RAZORPAY',
          paymentStatus: isCod ? 'COD_ADVANCE_PAID' : 'PAID',
          orderStatus: 'NEW',
          advanceAmount: isCod ? advanceAmount : 0,
          advancePaidAmount: isCod ? advanceAmount : 0,
          codRemainingAmount: isCod ? codRemainingAmount : 0,
          referralCode: validation.valid ? validation.code : null,
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
              amount: advanceAmount, // Recorded advance paid online
              currency: 'INR',
              paymentMethod: isCod ? 'COD_ADVANCE' : 'ONLINE',
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

      // Handle Referral Tracking, Qualification & 5% Reward Issuance
      if (validation.valid) {
        if (validation.source === 'REFERRAL_OFFER' && validation.offerId) {
          // Increment usage count
          await tx.referralOffer.update({
            where: { id: validation.offerId },
            data: { timesUsed: { increment: 1 } },
          });

          const offer = await tx.referralOffer.findUnique({
            where: { id: validation.offerId },
          });

          // Qualify reward if genuinely new customer and not referring themselves
          const hasReferrer = Boolean(offer?.referrerCustomerId && offer.referrerCustomerId !== customer.id);
          const qualifiesReward = isGenuinelyNewCustomer && hasReferrer;

          await tx.referralUsage.create({
            data: {
              offerId: validation.offerId,
              orderId: order.id,
              referrerCustomerId: offer?.referrerCustomerId || null,
              referredCustomerId: customer.id,
              discountApplied: discount,
              status: qualifiesReward ? 'QUALIFIED' : isGenuinelyNewCustomer ? 'QUALIFIED_GLOBAL' : 'DISCOUNT_ONLY',
              qualifiesReward,
            },
          });

          // Award 5% reward on next purchase >= 1kg to the referring existing customer
          if (qualifiesReward && offer?.referrerCustomerId) {
            const rewardCode = `REWARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            await tx.referralReward.create({
              data: {
                offerId: validation.offerId,
                customerId: offer.referrerCustomerId,
                rewardCode,
                discountPercent: 5.0,
                minPurchaseKg: 1.0,
                sourceOrderId: order.id,
                status: 'ACTIVE',
              },
            });

            await tx.adminNotification.create({
              data: {
                title: `Referral Reward Earned (5%)`,
                message: `Referrer earned reward code ${rewardCode} from new customer order ${orderNumber}.`,
                type: 'REFERRAL_REWARD',
                link: `/admin/referrals`,
              },
            });
          }
        } else if (validation.source === 'REFERRAL_REWARD' && validation.rewardId) {
          // Mark reward code as redeemed
          await tx.referralReward.update({
            where: { id: validation.rewardId },
            data: {
              isUsed: true,
              usedAt: new Date(),
              usedOrderId: order.id,
              status: 'USED',
            },
          });
        }
      }

      // Create Admin Notification for new order
      await tx.adminNotification.create({
        data: {
          title: `New Online Order: ${orderNumber}`,
          message: `${customer.name} placed order of ₹${finalTotal} (${orderNumber}) via Razorpay.`,
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
