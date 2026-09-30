import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCashfreeOrder, getCashfreeOrderPayments, CashfreePaymentEntity } from '@/lib/cashfree';
import { createCustomerSession, attachCustomerSessionCookie } from '@/lib/customerAuth';
import { sendOwnerOrderNotification } from '@/lib/ownerNotification';

function formatOrderResponse(order: any, paymentDetails?: any) {
  const latestPayment = paymentDetails || (order.payments && order.payments[0]) || null;
  const latestShipment = (order.shipments && order.shipments[0]) || null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    advanceAmount: order.advanceAmount,
    advancePaidAmount: order.advancePaidAmount,
    codRemainingAmount: order.codRemainingAmount,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    couponCode: order.couponCode,
    total: order.total,
    currency: order.currency,
    customer: {
      name: order.customer?.name || 'Customer',
      email: order.customer?.email || '',
      mobile: order.customer?.mobile || '',
    },
    shippingAddress: order.shippingAddress
      ? {
          addressLine1: order.shippingAddress.addressLine1,
          area: order.shippingAddress.area || null,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          pincode: order.shippingAddress.pincode,
          landmark: order.shippingAddress.landmark || null,
        }
      : {
          addressLine1: 'Address provided during checkout',
          area: null,
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          landmark: null,
        },
    items: (order.items || []).map((item: any) => ({
      id: item.id,
      productName: item.productNameSnapshot || 'Pure Raw Honey',
      weightVariant: item.weightVariant || '500g',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    payment: latestPayment
      ? {
          provider: latestPayment.provider || 'CASHFREE',
          paymentId: latestPayment.paymentId || String(latestPayment.cf_payment_id || ''),
          status: latestPayment.status || latestPayment.payment_status || 'PAID',
          amount: latestPayment.amount || latestPayment.payment_amount || order.total,
          paidAt: latestPayment.paidAt || latestPayment.payment_time || order.createdAt,
        }
      : null,
    shipment: latestShipment
      ? {
          courier: latestShipment.courier,
          trackingNumber: latestShipment.trackingNumber,
          status: latestShipment.status,
        }
      : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderNumber,
      cashfreeOrderId,
    } = body;

    const lookupKey = (orderNumber || cashfreeOrderId || orderId || '').trim();

    if (!lookupKey) {
      return NextResponse.json(
        { success: false, message: 'Missing order reference for payment verification' },
        { status: 400 }
      );
    }

    // 1. Find Order in Database with retry loop (for replica sync or slight DB pool delay)
    let order: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      order = await prisma.order.findFirst({
        where: {
          OR: [
            { orderNumber: lookupKey },
            { cashfreeOrderId: lookupKey },
            { id: lookupKey },
          ],
        },
        include: {
          customer: true,
          shippingAddress: true,
          items: true,
          payments: true,
        },
      });
      if (order) break;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    // Direct Cashfree Self-Healing Fallback:
    // If order was somehow not in DB, but customer paid on Cashfree, reconcile and heal immediately!
    if (!order) {
      try {
        const cfOrder = await getCashfreeOrder(lookupKey);
        const cfPayments = await getCashfreeOrderPayments(lookupKey);
        const successfulPayment = cfPayments.find((p) => p.payment_status === 'SUCCESS');

        if (successfulPayment || cfOrder.order_status === 'PAID') {
          const cfOrderAny = cfOrder as any;
          const cleanPhone = (cfOrderAny.customer_details?.customer_phone || '').replace(/\D/g, '').slice(-10) || '0000000000';
          const cleanEmail = (cfOrderAny.customer_details?.customer_email || 'customer@kamadhenuhoneyfarms.in').trim().toLowerCase();
          const cleanName = cfOrderAny.customer_details?.customer_name || 'Valued Customer';
          const isCodAdvance = (cfOrderAny.order_note || '').toLowerCase().includes('50% cod');
          const paidAmount = successfulPayment ? successfulPayment.payment_amount : cfOrder.order_amount;
          const orderTotal = isCodAdvance ? (paidAmount * 2) : paidAmount;

          let customer = await prisma.customer.findFirst({
            where: { OR: [{ mobile: cleanPhone }, { email: cleanEmail }] },
          });
          if (!customer) {
            customer = await prisma.customer.create({
              data: { name: cleanName, mobile: cleanPhone, email: cleanEmail },
            });
          }

          let address = await prisma.address.findFirst({
            where: { customerId: customer.id },
          });
          if (!address) {
            address = await prisma.address.create({
              data: {
                customerId: customer.id,
                recipientName: cleanName,
                mobileNumber: cleanPhone,
                addressLine1: 'Address provided during checkout',
                area: 'Bangalore',
                city: 'Bangalore',
                state: 'Karnataka',
                pincode: '560001',
              },
            });
          }

          order = await prisma.order.create({
            data: {
              orderNumber: lookupKey,
              cashfreeOrderId: lookupKey,
              customerId: customer.id,
              shippingAddressId: address.id,
              subtotal: orderTotal,
              shippingFee: 0,
              discount: 0,
              total: orderTotal,
              currency: 'INR',
              paymentMethod: isCodAdvance ? 'COD' : 'CASHFREE',
              paymentStatus: isCodAdvance ? 'COD_ADVANCE_PAID' : 'PAID',
              orderStatus: 'CONFIRMED',
              cashfreePaymentId: successfulPayment ? String(successfulPayment.cf_payment_id) : null,
              advanceAmount: isCodAdvance ? paidAmount : orderTotal,
              advancePaidAmount: paidAmount,
              codRemainingAmount: isCodAdvance ? paidAmount : 0,
              items: {
                create: [{
                  productId: 'honey_order',
                  productNameSnapshot: 'Kamadhenu Pure Raw Honey',
                  weightVariant: 'Standard',
                  quantity: 1,
                  unitPrice: orderTotal,
                  totalPrice: orderTotal,
                  weightKg: 0.5,
                }],
              },
              payments: successfulPayment ? {
                create: [{
                  provider: 'CASHFREE',
                  cashfreeOrderId: lookupKey,
                  cashfreePaymentId: String(successfulPayment.cf_payment_id),
                  amount: successfulPayment.payment_amount,
                  currency: successfulPayment.payment_currency || 'INR',
                  paymentMethod: isCodAdvance ? 'COD_ADVANCE' : 'ONLINE',
                  status: 'PAID',
                  paidAt: successfulPayment.payment_completion_time ? new Date(successfulPayment.payment_completion_time) : new Date(),
                  rawResponse: JSON.stringify(successfulPayment),
                }],
              } : undefined,
              shipments: {
                create: [{
                  courierProvider: 'Standard Courier',
                  shippingFee: 0,
                  status: 'PENDING',
                }],
              },
            },
            include: {
              customer: true,
              shippingAddress: true,
              items: true,
              payments: true,
            },
          });
        }
      } catch (cfFallbackErr) {
        console.error('Direct Cashfree fallback lookup failed:', cfFallbackErr);
      }
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: `Order not found for reference: ${lookupKey}` },
        { status: 404 }
      );
    }

    // 2. Idempotency Check: If already confirmed as PAID or COD_ADVANCE_PAID
    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'COD_ADVANCE_PAID' || order.paymentStatus === 'FULLY_PAID') {
      const response = NextResponse.json({
        success: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        amount: order.total,
        order: formatOrderResponse(order),
        message: 'Order already verified and confirmed',
      });

      try {
        const sessionToken = await createCustomerSession(order.customerId, req);
        if (sessionToken) attachCustomerSessionCookie(response, sessionToken);
      } catch (err) {
        console.error('Session error on already verified order:', err);
      }

      return response;
    }

    // 3. Verify Payment Status directly with Cashfree Official APIs
    const targetOrderId = order.cashfreeOrderId || order.orderNumber;
    const cfPayments = await getCashfreeOrderPayments(targetOrderId);

    // Find any successful payment attempt
    const successfulPayment: CashfreePaymentEntity | undefined = cfPayments.find(
      (p) => p.payment_status === 'SUCCESS'
    );

    // 4. Amount Security Verification: Verify amount matches server-calculated expected amount
    const isCod = order.paymentMethod === 'COD';
    const expectedChargedAmount = isCod ? order.advanceAmount : order.total;

    if (!successfulPayment) {
      // Check if there is a failed payment attempt
      const failedPayment = cfPayments.find(
        (p) => p.payment_status === 'FAILED' || p.payment_status === 'CANCELLED' || p.payment_status === 'USER_DROPPED'
      );

      if (failedPayment) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        });

        return NextResponse.json(
          {
            success: false,
            failed: true,
            message: failedPayment.payment_message || 'Payment was declined or cancelled. Please try again.',
          },
          { status: 400 }
        );
      }

      // Check if pending
      return NextResponse.json(
        {
          success: false,
          pending: true,
          message: 'Payment is currently pending confirmation from bank. Please wait or check your bank app.',
        },
        { status: 202 }
      );
    }

    // Validate that the paid amount is not less than the authoritative order total
    if (successfulPayment.payment_amount < expectedChargedAmount) {
      console.error(
        `🚨 [Payment Tampering Detected] Order ${order.orderNumber}: Expected ₹${expectedChargedAmount}, Received ₹${successfulPayment.payment_amount}`
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Security error: Paid amount does not match authoritative order total.',
        },
        { status: 400 }
      );
    }

    // 5. Successful Payment Confirmed: Update Database in a Transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const paymentIdStr = String(successfulPayment.cf_payment_id);

      // Determine method description
      let methodDescription = 'ONLINE';
      if (typeof successfulPayment.payment_method === 'object' && successfulPayment.payment_method !== null) {
        const methodKeys = Object.keys(successfulPayment.payment_method);
        if (methodKeys.length > 0) methodDescription = methodKeys[0].toUpperCase();
      }

      const completedAt = successfulPayment.payment_completion_time
        ? new Date(successfulPayment.payment_completion_time)
        : new Date();

      // Update Order Status
      const ord = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: isCod ? 'COD_ADVANCE_PAID' : 'PAID',
          orderStatus: 'CONFIRMED',
          cashfreeOrderId: targetOrderId,
          cashfreePaymentId: paymentIdStr,
          advancePaidAmount: successfulPayment.payment_amount,
        },
      });

      // Check if payment entry already exists
      const existingPayment = await tx.payment.findFirst({
        where: {
          orderId: order.id,
          cashfreePaymentId: paymentIdStr,
        },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: 'CASHFREE',
            cashfreeOrderId: targetOrderId,
            cashfreePaymentId: paymentIdStr,
            amount: successfulPayment.payment_amount,
            currency: successfulPayment.payment_currency || 'INR',
            paymentMethod: isCod ? 'COD_ADVANCE' : methodDescription,
            status: 'PAID',
            paidAt: completedAt,
            rawResponse: JSON.stringify(successfulPayment),
          },
        });
      }

      // Check if customer is genuinely new
      const priorPaidOrdersCount = await tx.order.count({
        where: {
          customerId: order.customerId,
          id: { not: order.id },
          paymentStatus: { in: ['PAID', 'FULLY_PAID', 'COD_ADVANCE_PAID'] },
        },
      });
      const isGenuinelyNewCustomer = priorPaidOrdersCount === 0;

      // Handle Referral Tracking, Qualification & 5% Reward Issuance
      if (order.referralCode) {
        const offer = await tx.referralOffer.findFirst({
          where: { code: order.referralCode, isActive: true },
        });

        if (offer) {
          // Increment usage count
          await tx.referralOffer.update({
            where: { id: offer.id },
            data: { timesUsed: { increment: 1 } },
          });

          const hasReferrer = Boolean(offer.referrerCustomerId && offer.referrerCustomerId !== order.customerId);
          const qualifiesReward = isGenuinelyNewCustomer && hasReferrer;

          // Check if referral usage already recorded
          const existingUsage = await tx.referralUsage.findFirst({
            where: { orderId: order.id },
          });

          if (!existingUsage) {
            await tx.referralUsage.create({
              data: {
                offerId: offer.id,
                orderId: order.id,
                referrerCustomerId: offer.referrerCustomerId || null,
                referredCustomerId: order.customerId,
                discountApplied: order.discount,
                status: qualifiesReward ? 'QUALIFIED' : isGenuinelyNewCustomer ? 'QUALIFIED_GLOBAL' : 'DISCOUNT_ONLY',
                qualifiesReward,
              },
            });
          }

          // Award 5% reward on next purchase >= 1kg to referring customer
          if (qualifiesReward && offer.referrerCustomerId) {
            const rewardCode = `REWARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            await tx.referralReward.create({
              data: {
                offerId: offer.id,
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
                message: `Referrer earned reward code ${rewardCode} from new customer order ${order.orderNumber}.`,
                type: 'REFERRAL_REWARD',
                link: `/admin/referrals`,
              },
            });
          }
        } else {
          // Check if it's a personal reward code
          const reward = await tx.referralReward.findFirst({
            where: { rewardCode: order.referralCode, status: 'ACTIVE' },
          });
          if (reward) {
            await tx.referralReward.update({
              where: { id: reward.id },
              data: {
                isUsed: true,
                usedAt: new Date(),
                usedOrderId: order.id,
                status: 'USED',
              },
            });
          }
        }
      }

      // Create Admin Notification for verified order
      await tx.adminNotification.create({
        data: {
          title: `New Online Order: ${order.orderNumber}`,
          message: `${order.customer.name} placed order of ₹${order.total} (${order.orderNumber}) via Cashfree.`,
          type: 'HIGH_VALUE_ORDER',
          link: `/admin/orders/${order.id}`,
        },
      });

      return ord;
    });

    console.log(`✅ [Cashfree Order Verified] Order ${updatedOrder.orderNumber} successfully marked PAID.`);

    // 7. Send owner WhatsApp notification (fire-and-forget, never blocks customer response)
    const orderWithDetails = await prisma.order.findUnique({
      where: { id: updatedOrder.id },
      include: {
        customer: { select: { name: true, mobile: true } },
        shippingAddress: { select: { city: true, pincode: true } },
        items: { select: { productNameSnapshot: true, weightVariant: true, quantity: true } },
      },
    });

    if (orderWithDetails) {
      sendOwnerOrderNotification({
        orderNumber: orderWithDetails.orderNumber,
        customerName: orderWithDetails.customer.name,
        customerMobile: orderWithDetails.customer.mobile,
        total: orderWithDetails.total,
        paymentMethod: orderWithDetails.paymentMethod,
        items: orderWithDetails.items.map((i) => ({
          productName: i.productNameSnapshot,
          weightVariant: i.weightVariant,
          quantity: i.quantity,
        })),
        city: orderWithDetails.shippingAddress.city,
        pincode: orderWithDetails.shippingAddress.pincode,
      }).catch(() => {}); // explicit fire-and-forget
    }

    // 6. Generate secure customer session token and attach cookie
    const response = NextResponse.json({
      success: true,
      orderNumber: updatedOrder.orderNumber,
      orderId: updatedOrder.id,
      amount: updatedOrder.total,
      paymentId: String(successfulPayment.cf_payment_id),
      order: formatOrderResponse({
        ...updatedOrder,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
        items: order.items,
      }, successfulPayment),
      message: 'Payment verified and order confirmed successfully',
    });

    try {
      const sessionToken = await createCustomerSession(updatedOrder.customerId, req);
      if (sessionToken) {
        attachCustomerSessionCookie(response, sessionToken);
      }
    } catch (sessionErr) {
      console.error('Failed to create customer session:', sessionErr);
    }

    return response;
  } catch (error: any) {
    console.error('Cashfree payment verification error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to verify Cashfree payment' },
      { status: 500 }
    );
  }
}
