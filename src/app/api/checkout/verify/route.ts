import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCashfreeOrder, getCashfreeOrderPayments } from '@/lib/cashfree';
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
import { verifyCashfreeOrderStatus } from '@/lib/cashfreeVerify';

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

    // 3. Authoritatively verify payment status via DB + Cashfree Server-Side APIs
    const verification = await verifyCashfreeOrderStatus(order);

    if (verification.outcome === 'TAMPER_MISMATCH') {
      return NextResponse.json(
        {
          success: false,
          status: 'FAILED',
          failed: true,
          message: verification.message,
        },
        { status: 400 }
      );
    }

    if (verification.outcome === 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          pending: true,
          status: 'PENDING',
          message: verification.message,
        },
        { status: 202 }
      );
    }

    if (verification.outcome === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          cancelled: true,
          failed: false,
          status: 'CANCELLED',
          message: verification.message,
        },
        { status: 200 }
      );
    }

    if (verification.outcome === 'FAILED') {
      return NextResponse.json(
        {
          success: false,
          failed: true,
          cancelled: false,
          status: 'FAILED',
          message: verification.message,
        },
        { status: 200 }
      );
    }

    const updatedOrder = verification.order;
    const successfulPayment = verification.successfulPayment;

    if (verification.alreadyConfirmed && !successfulPayment) {
      const response = NextResponse.json({
        success: true,
        status: 'PAID',
        orderNumber: updatedOrder.orderNumber,
        orderId: updatedOrder.id,
        amount: updatedOrder.total,
        order: formatOrderResponse(updatedOrder),
        message: 'Order already verified and confirmed',
      });

      if (!cookieOrderToken && isOwnerByOrderToken) {
        attachOrderAccessCookie(
          response,
          signOrderAccessToken(updatedOrder.orderNumber, updatedOrder.customerId)
        );
      }
      return response;
    }

    const response = NextResponse.json({
      success: true,
      status: 'PAID',
      orderNumber: updatedOrder.orderNumber,
      orderId: updatedOrder.id,
      amount: updatedOrder.total,
      paymentId: successfulPayment ? String(successfulPayment.cf_payment_id) : undefined,
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
