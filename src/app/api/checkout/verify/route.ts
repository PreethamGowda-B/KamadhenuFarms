import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCashfreeOrder, getCashfreeOrderPayments, CashfreePaymentEntity } from '@/lib/cashfree';
import { getAdminSessionFromRequest } from '@/lib/auth';
import {
  createCustomerSession,
  attachCustomerSessionCookie,
  getCustomerSessionFromRequest,
  verifyOrderAccessToken,
  attachOrderAccessCookie,
  signOrderAccessToken,
  ORDER_ACCESS_COOKIE_NAME,
} from '@/lib/customerAuth';
import { settleCashfreePaymentAtomic } from '@/lib/orderPaymentSettlement';
import { isOrderPaymentConfirmed } from '@/lib/orderStateMachine';
import {
  notifyAdminNewOrder,
  notifyCustomerOrderConfirmed,
  notifyCustomerPaymentFailed,
} from '@/lib/notifications';

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
    couponCode: order.referralCode || null,
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
          paymentId: latestPayment.cashfreePaymentId || latestPayment.paymentId || String(latestPayment.cf_payment_id || ''),
          status: latestPayment.status || latestPayment.payment_status || 'PAID',
          amount: latestPayment.amount || latestPayment.payment_amount || order.total,
          paidAt: latestPayment.paidAt || latestPayment.payment_time || order.createdAt,
        }
      : null,
    shipment: latestShipment
      ? {
          courier: latestShipment.courierProvider || latestShipment.courier,
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
      token: bodyOrderToken,
    } = body;

    const lookupKey = String(orderNumber || cashfreeOrderId || orderId || '').trim();

    if (!lookupKey) {
      return NextResponse.json(
        { success: false, message: 'Missing order reference for payment verification' },
        { status: 400 }
      );
    }

    // 1. Find Order in Database with short retry loop for replica sync
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
          shipments: true,
        },
      });
      if (order) break;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    // Direct Cashfree Self-Healing Fallback ONLY if caller presents valid cryptographic order token
    // or admin session, preventing unauthorized order enumeration/minting.
    if (!order) {
      const cookieOrderToken = req.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value;
      const validFallbackToken =
        verifyOrderAccessToken(bodyOrderToken, lookupKey) ||
        verifyOrderAccessToken(cookieOrderToken, lookupKey);
      const adminFallback = getAdminSessionFromRequest(req);

      if (validFallbackToken || adminFallback) {
        try {
          const cfOrder = await getCashfreeOrder(lookupKey);
          const cfPayments = await getCashfreeOrderPayments(lookupKey);
          const successfulPayment = cfPayments.find((p) => p.payment_status === 'SUCCESS');

          if (successfulPayment || cfOrder.order_status === 'PAID') {
            const cfOrderAny = cfOrder as any;
            const cleanPhone = (cfOrderAny.customer_details?.customer_phone || '').replace(/\D/g, '').slice(-10) || '0000000000';
            const cleanEmail = (cfOrderAny.customer_details?.customer_email || `${cleanPhone}@kamadhenuhoneyfarms.in`).trim().toLowerCase();
            const cleanName = cfOrderAny.customer_details?.customer_name || 'Valued Customer';
            const isCodAdvance = (cfOrderAny.order_note || '').toLowerCase().includes('50% cod');
            const paidAmount = successfulPayment ? successfulPayment.payment_amount : cfOrder.order_amount;
            const orderTotal = isCodAdvance ? paidAmount * 2 : paidAmount;

            let customer = await prisma.customer.findFirst({
              where: { OR: [{ mobile: cleanPhone }, { email: cleanEmail }] },
            });
            if (!customer) {
              customer = await prisma.customer.create({
                data: { name: cleanName, mobile: cleanPhone, email: cleanEmail },
              });
            }

            let address = await prisma.address.findFirst({ where: { customerId: customer.id } });
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
                shipments: true,
              },
            });
          }
        } catch (cfFallbackErr) {
          console.error('Direct Cashfree fallback lookup failed:', cfFallbackErr);
        }
      }
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found for verification reference.' },
        { status: 404 }
      );
    }

    // 2. Ownership Authorization Check (prevents unauthenticated PII leaks & session hijacking)
    const [customerSession, adminSession] = await Promise.all([
      getCustomerSessionFromRequest(req),
      Promise.resolve(getAdminSessionFromRequest(req)),
    ]);
    const cookieOrderToken = req.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value;
    const validOrderToken =
      verifyOrderAccessToken(bodyOrderToken, order.orderNumber) ||
      verifyOrderAccessToken(cookieOrderToken, order.orderNumber);

    const isOwnerBySession = Boolean(customerSession && customerSession.id === order.customerId);
    const isOwnerByOrderToken = Boolean(validOrderToken && validOrderToken.customerId === order.customerId);
    const isAuthorizedCaller = Boolean(isOwnerBySession || isOwnerByOrderToken || adminSession);

    if (!isAuthorizedCaller) {
      return NextResponse.json(
        { success: false, message: 'Access denied: Please verify your order from your original browser or order confirmation link.' },
        { status: 403 }
      );
    }

    // 3. Idempotency Check: If already confirmed as PAID / COD_ADVANCE_PAID / FULLY_PAID
    if (isOrderPaymentConfirmed(order.paymentStatus)) {

      const response = NextResponse.json({
        success: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        amount: order.total,
        order: formatOrderResponse(order),
        message: 'Order already verified and confirmed',
      });

      if (!cookieOrderToken && isOwnerByOrderToken) {
        attachOrderAccessCookie(response, signOrderAccessToken(order.orderNumber, order.customerId));
      }
      return response;
    }

    // 4. Verify Payment Status directly with Cashfree Official APIs
    const targetOrderId = order.cashfreeOrderId || order.orderNumber;
    const cfPayments = await getCashfreeOrderPayments(targetOrderId);
    const successfulPayment: CashfreePaymentEntity | undefined = cfPayments.find(
      (p) => p.payment_status === 'SUCCESS'
    );

    const isCod = order.paymentMethod === 'COD';
    const expectedChargedAmount = isCod ? order.advanceAmount : order.total;

    if (!successfulPayment) {
      const failedPayment = cfPayments.find(
        (p) =>
          p.payment_status === 'FAILED' ||
          p.payment_status === 'CANCELLED' ||
          p.payment_status === 'USER_DROPPED'
      );

      if (failedPayment) {
        const failedClaim = await prisma.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: { in: ['PAYMENT_PENDING', 'COD_ADVANCE_PENDING'] },
          },
          data: { paymentStatus: 'FAILED' },
        });

        if (failedClaim.count > 0) {
          const firstName = order.customer?.name
            ? String(order.customer.name).trim().split(' ')[0]
            : 'Customer';

          await prisma.adminNotification
            .upsert({
              where: { dedupKey: `PAYMENT_FAILED:${order.orderNumber}` },
              update: {},
              create: {
                title: `Payment Failed: ${order.orderNumber}`,
                message: `${firstName}'s payment attempt of ₹${order.total} (${order.orderNumber}) was declined or cancelled.`,
                type: 'PAYMENT_FAILED',
                link: `/admin/orders/${order.id}`,
                dedupKey: `PAYMENT_FAILED:${order.orderNumber}`,
              },
            })
            .catch((e) => console.warn('Failed to record admin payment failed notification:', e));

          notifyCustomerPaymentFailed(order).catch((e) =>
            console.warn('Customer failed payment notice error:', e)
          );
        }

        return NextResponse.json(
          {
            success: false,
            failed: true,
            message: isAuthorizedCaller
              ? (failedPayment.payment_message || 'Payment was declined or cancelled. Please try again.')
              : 'Payment was declined or cancelled.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          pending: true,
          message: 'Payment is currently pending confirmation from bank. Please wait or check your bank app.',
        },
        { status: 202 }
      );
    }

    // 5. Atomic & Idempotent Settlement (prevents duplicate rewards/referrals under race conditions)
    let methodDescription = 'ONLINE';
    if (typeof successfulPayment.payment_method === 'object' && successfulPayment.payment_method !== null) {
      const methodKeys = Object.keys(successfulPayment.payment_method);
      if (methodKeys.length > 0) methodDescription = methodKeys[0].toUpperCase();
    }

    const completedAt = successfulPayment.payment_completion_time
      ? new Date(successfulPayment.payment_completion_time)
      : new Date();

    const settlement = await settleCashfreePaymentAtomic({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customer?.name,
      orderTotal: order.total,
      expectedAmount: expectedChargedAmount,
      expectedCurrency: order.currency || 'INR',
      isCod,
      referralCode: order.referralCode,
      discount: order.discount,
      currentOrderStatus: order.orderStatus,
      cashfreeOrderId: targetOrderId,
      cfPaymentId: String(successfulPayment.cf_payment_id),
      paidAmount: Number(successfulPayment.payment_amount),
      paidCurrency: successfulPayment.payment_currency || 'INR',
      paymentMethodDescription: methodDescription,
      paidAt: completedAt,
      rawPayload: successfulPayment,
      source: 'checkout_verify',
    });

    if (settlement.currencyMismatch || settlement.amountMismatch) {
      console.error(
        `🚨 [Payment Tampering Detected] Order ${order.orderNumber}: Expected ₹${expectedChargedAmount} ${order.currency}, Received ${successfulPayment.payment_amount} ${successfulPayment.payment_currency}`
      );
      return NextResponse.json(
        {
          success: false,
          message: 'Security error: Paid amount or currency does not match authoritative order total.',
        },
        { status: 400 }
      );
    }

    const updatedOrder = settlement.updatedOrder || order;

    if (!settlement.alreadyPaid) {
      const orderWithDetails = {
        ...updatedOrder,
        customer: order.customer,
        shippingAddress: order.shippingAddress,
        items: order.items,
      };
      notifyAdminNewOrder(orderWithDetails as any).catch((err) =>
        console.warn('Admin push notice error:', err)
      );
      notifyCustomerOrderConfirmed(orderWithDetails as any).catch((err) =>
        console.warn('Customer push notice error:', err)
      );
    }

    if (!isAuthorizedCaller) {
      return NextResponse.json({
        success: true,
        orderNumber: updatedOrder.orderNumber,
        orderId: updatedOrder.id,
        message: 'Payment verified and recorded. Sign in or open your confirmation link to view order details.',
      });
    }

    const response = NextResponse.json({
      success: true,
      orderNumber: updatedOrder.orderNumber,
      orderId: updatedOrder.id,
      amount: updatedOrder.total,
      paymentId: String(successfulPayment.cf_payment_id),
      order: formatOrderResponse(
        {
          ...updatedOrder,
          customer: order.customer,
          shippingAddress: order.shippingAddress,
          items: order.items,
          shipments: order.shipments,
        },
        successfulPayment
      ),
      message: 'Payment verified and order confirmed successfully',
    });

    if (!cookieOrderToken && isOwnerByOrderToken) {
      attachOrderAccessCookie(response, signOrderAccessToken(updatedOrder.orderNumber, updatedOrder.customerId));
    }

    // Issue customer session only if already signed in as this customer OR brand-new customer (1 paid order total)
    if (!customerSession) {
      try {
        const paidCount = await prisma.order.count({
          where: {
            customerId: updatedOrder.customerId,
            paymentStatus: { in: ['PAID', 'COD_ADVANCE_PAID', 'FULLY_PAID'] },
          },
        });
        if (paidCount <= 1) {
          const sessionToken = await createCustomerSession(updatedOrder.customerId, req);
          if (sessionToken) {
            attachCustomerSessionCookie(response, sessionToken);
          }
        }
      } catch (sessionErr) {
        console.error('Failed to create customer session:', sessionErr);
      }
    }

    return response;
  } catch (error: any) {
    console.error('Cashfree payment verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify payment. Please try again.' },
      { status: 500 }
    );
  }
}
