import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCashfreeConfig, getCashfreeOrder } from '@/lib/cashfree';
import { getAdminSessionFromRequest } from '@/lib/auth';
import {
  attachOrderAccessCookie,
  getCustomerSessionFromRequest,
  ORDER_ACCESS_COOKIE_NAME,
  signOrderAccessToken,
  verifyOrderAccessToken,
} from '@/lib/customerAuth';
import { verifyCashfreeOrderStatus } from '@/lib/cashfreeVerify';
import { AUTHORITATIVE_PRICES, PRODUCTS } from '@/lib/products';
import { calculateShippingCharge } from '@/lib/shipping';
import { validateDiscountOrReferralCode } from '@/lib/referral';

function buildItemSignature(
  items: Array<{ productId: string; weightVariant: string; quantity: number }>
): string {
  return [...items]
    .map((i) => `${i.productId}:${i.weightVariant}:${i.quantity}`)
    .sort()
    .join('|');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderNumber = String(body?.orderNumber || '').trim();
    const bodyToken = typeof body?.token === 'string' ? body.token.trim() : '';

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, requiresNewOrder: true, message: 'Missing order number for retry' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber }, { cashfreeOrderId: orderNumber }, { id: orderNumber }],
      },
      include: {
        customer: true,
        shippingAddress: true,
        items: true,
        payments: true,
        shipments: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, requiresNewOrder: true, message: 'Order not found' },
        { status: 404 }
      );
    }

    const [customerSession, adminSession] = await Promise.all([
      getCustomerSessionFromRequest(req),
      Promise.resolve(getAdminSessionFromRequest(req)),
    ]);
    const cookieOrderToken = req.cookies.get(ORDER_ACCESS_COOKIE_NAME)?.value || '';
    const validOrderToken =
      verifyOrderAccessToken(bodyToken, order.orderNumber) ||
      verifyOrderAccessToken(cookieOrderToken, order.orderNumber);

    const isOwnerBySession = Boolean(customerSession && customerSession.id === order.customerId);
    const isOwnerByOrderToken = Boolean(
      validOrderToken && validOrderToken.customerId === order.customerId
    );

    if (!isOwnerBySession && !isOwnerByOrderToken && !adminSession) {
      return NextResponse.json(
        { success: false, message: 'Access denied for order retry.' },
        { status: 403 }
      );
    }

    const orderAccessToken =
      bodyToken || cookieOrderToken || signOrderAccessToken(order.orderNumber, order.customerId);

    // 1. Check authoritative Cashfree state first — never allow duplicate payment for an already-paid/pending order
    const verification = await verifyCashfreeOrderStatus(order);
    if (verification.outcome === 'PAID') {
      const res = NextResponse.json({
        success: true,
        alreadyPaid: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        orderAccessToken,
      });
      if (!cookieOrderToken) attachOrderAccessCookie(res, orderAccessToken);
      return res;
    }

    if (verification.outcome === 'PENDING') {
      const res = NextResponse.json(
        {
          success: false,
          pending: true,
          orderNumber: order.orderNumber,
          orderId: order.id,
          orderAccessToken,
          message: verification.message,
        },
        { status: 202 }
      );
      if (!cookieOrderToken) attachOrderAccessCookie(res, orderAccessToken);
      return res;
    }

    // 2. Check whether the existing unpaid NEW order matches the current cart, address, and payment method
    const items = Array.isArray(body?.items) ? body.items : [];
    const paymentMethodRaw = String(body?.paymentMethod || 'cashfree').toLowerCase();
    const isCod = paymentMethodRaw === 'cod';
    const expectedOrderPaymentMethod = isCod ? 'COD' : 'CASHFREE';
    const cleanPincode = String(body?.pincode || '').replace(/\D/g, '');
    const cleanMobile = String(body?.mobile || order.customer?.mobile || '')
      .replace(/\D/g, '')
      .slice(-10);
    const cleanEmail = String(body?.email || order.customer?.email || '').trim().toLowerCase();
    const couponCode = typeof body?.couponCode === 'string' ? body.couponCode : '';

    let canReuse =
      order.orderStatus === 'NEW' &&
      order.paymentMethod === expectedOrderPaymentMethod &&
      cleanPincode.length === 6 &&
      cleanPincode === order.shippingAddress?.pincode &&
      items.length > 0;

    if (canReuse) {
      let subtotal = 0;
      const validatedItems: Array<{
        productId: string;
        productNameSnapshot: string;
        weightVariant: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        weightKg: number;
      }> = [];

      for (const item of items) {
        const productId = String(item?.productId || '').trim();
        const weightVariant = String(item?.weightVariant || '').trim();
        const parsedQty = Number(item?.quantity);
        const product = AUTHORITATIVE_PRICES[productId];
        const productConfig = PRODUCTS[productId];
        const unitPrice = product?.prices[weightVariant];

        if (
          !product ||
          (productConfig && (!productConfig.active || !productConfig.purchasable)) ||
          !unitPrice ||
          !Number.isInteger(parsedQty) ||
          parsedQty < 1
        ) {
          canReuse = false;
          break;
        }

        const itemTotal = unitPrice * parsedQty;
        subtotal += itemTotal;
        let weightKg = 0.5;
        if (weightVariant === '250g') weightKg = 0.35;
        else if (weightVariant === '500g') weightKg = 0.65;
        else if (weightVariant === '1kg') weightKg = 1.3;

        validatedItems.push({
          productId,
          productNameSnapshot: product.name,
          weightVariant,
          quantity: parsedQty,
          unitPrice,
          totalPrice: itemTotal,
          weightKg,
        });
      }

      if (canReuse) {
        const shippingResult = await calculateShippingCharge(cleanPincode, validatedItems, subtotal);
        let discount = 0;
        let validatedCode: string | null = null;
        if (couponCode) {
          const validation = await validateDiscountOrReferralCode(
            couponCode,
            subtotal,
            validatedItems,
            cleanMobile,
            cleanEmail
          );
          if (validation.valid) {
            discount = Math.max(0, Math.min(subtotal, Math.round(validation.calculatedDiscount)));
            validatedCode = validation.code;
          }
        }

        const finalTotal = Math.max(1, subtotal - discount + shippingResult.shippingFee);
        const expectedExistingSig = buildItemSignature(order.items || []);
        const currentSig = buildItemSignature(validatedItems);

        if (
          !shippingResult.serviceable ||
          finalTotal !== order.total ||
          (validatedCode || null) !== (order.referralCode || null) ||
          expectedExistingSig !== currentSig
        ) {
          canReuse = false;
        }
      }
    }

    if (canReuse) {
      try {
        const cfOrder = await getCashfreeOrder(order.cashfreeOrderId || order.orderNumber);
        if (cfOrder && cfOrder.order_status === 'ACTIVE' && cfOrder.payment_session_id) {
          if (order.paymentStatus === 'FAILED') {
            await prisma.order.updateMany({
              where: {
                id: order.id,
                orderStatus: 'NEW',
                paymentStatus: 'FAILED',
              },
              data: {
                paymentStatus: isCod ? 'COD_ADVANCE_PENDING' : 'PAYMENT_PENDING',
              },
            });
          }

          const cashfreeConfig = getCashfreeConfig();
          const res = NextResponse.json({
            success: true,
            reused: true,
            paymentSessionId: cfOrder.payment_session_id,
            orderNumber: order.orderNumber,
            orderId: order.id,
            cashfreeOrderId: cfOrder.order_id || order.cashfreeOrderId || order.orderNumber,
            orderAccessToken,
            environment: cashfreeConfig.env,
            amount: isCod ? order.advanceAmount : order.total,
            currency: order.currency || 'INR',
            paymentMethod: order.paymentMethod,
          });
          if (!cookieOrderToken) attachOrderAccessCookie(res, orderAccessToken);
          return res;
        }
      } catch (cfErr) {
        console.warn('Cashfree order lookup during retry failed, falling back to new order:', cfErr);
      }
    }

    // Cart/address/method changed or Cashfree session expired: cancel old unpaid NEW order cleanly
    await prisma.order
      .updateMany({
        where: {
          id: order.id,
          orderStatus: 'NEW',
          paymentStatus: { in: ['PAYMENT_PENDING', 'COD_ADVANCE_PENDING', 'FAILED'] },
        },
        data: { orderStatus: 'CANCELLED', paymentStatus: 'FAILED' },
      })
      .catch(() => {});

    return NextResponse.json({
      success: false,
      requiresNewOrder: true,
      message: 'Creating a fresh payment session for your updated order details.',
    });
  } catch (error) {
    console.error('Retry order error:', error);
    return NextResponse.json(
      { success: false, requiresNewOrder: true, message: 'Could not resume previous order session.' },
      { status: 500 }
    );
  }
}
