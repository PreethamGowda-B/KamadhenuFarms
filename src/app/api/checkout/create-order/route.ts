import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCashfreeOrder, getCashfreeConfig } from '@/lib/cashfree';
import { calculateShippingCharge } from '@/lib/shipping';
import { validateDiscountOrReferralCode } from '@/lib/referral';
import { isBangaloreDelivery } from '@/lib/location';
import { generateNextOrderNumber } from '@/lib/orderNumber';
import { AUTHORITATIVE_PRICES, PRODUCTS } from '@/lib/products';
import { checkRateLimitDistributed, getClientIp } from '@/lib/auth';
import {
  claimCheckoutIdempotencyKey,
  releaseCheckoutIdempotencyKey,
} from '@/lib/distributedSecurity';
import {
  createCustomerSession,
  attachCustomerSessionCookie,
  getCustomerSessionFromRequest,
  signOrderAccessToken,
  attachOrderAccessCookie,
} from '@/lib/customerAuth';

class StockUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockUnavailableError';
  }
}

export async function POST(req: NextRequest) {
  let createdOrderId: string | null = null;
  let claimedIdempotencyKey: string | null = null;

  try {
    const ip = getClientIp(req);
    const rate = await checkRateLimitDistributed(`checkout_create:${ip}`, 15, 15 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many checkout attempts. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawIdemKey =
      req.headers.get('x-idempotency-key') ||
      (typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : '');
    const normalizedIdemKey = rawIdemKey.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);

    if (normalizedIdemKey) {
      const acquired = await claimCheckoutIdempotencyKey(normalizedIdemKey, 120);
      if (!acquired) {
        return NextResponse.json(
          { success: false, message: 'This checkout request is already being processed. Please wait.' },
          { status: 409 }
        );
      }
      claimedIdempotencyKey = normalizedIdemKey;
    }

    const {
      name,
      mobile,
      email,
      addressLine1,
      addressLine2,
      area,
      city,
      state,
      pincode,
      landmark,
      items,
      couponCode,
      paymentMethod = 'cashfree',
    } = body;

    const isCod = String(paymentMethod).toLowerCase() === 'cod';

    // Validate customer inputs
    if (!name || typeof name !== 'string' || !name.trim() || !mobile || typeof mobile !== 'string' || !mobile.trim()) {
      return NextResponse.json(
        { success: false, message: 'Please provide full name and mobile number' },
        { status: 400 }
      );
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 10-digit Indian mobile number' },
        { status: 400 }
      );
    }

    const cleanEmail =
      email && typeof email === 'string' && email.trim()
        ? email.trim().toLowerCase().slice(0, 120)
        : `${cleanMobile}@kamadhenuhoneyfarms.in`;

    if (
      !addressLine1 ||
      typeof addressLine1 !== 'string' ||
      !addressLine1.trim() ||
      !city ||
      typeof city !== 'string' ||
      !city.trim() ||
      !state ||
      typeof state !== 'string' ||
      !state.trim() ||
      !pincode ||
      typeof pincode !== 'string' ||
      !pincode.trim()
    ) {
      return NextResponse.json(
        { success: false, message: 'Please provide complete street address, city, state, and pincode' },
        { status: 400 }
      );
    }

    const cleanPincode = pincode.replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid 6-digit delivery pincode' },
        { status: 400 }
      );
    }

    // Strict Server-Side Bangalore Restriction for Cash on Delivery
    if (isCod && !isBangaloreDelivery(cleanPincode, city)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cash on Delivery is currently available only within Bangalore.',
        },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0 || items.length > 20) {
      return NextResponse.json(
        { success: false, message: 'Your cart is empty or contains invalid items' },
        { status: 400 }
      );
    }

    // 1. Validate Products & Authoritative Prices (stock status verified inside DB transaction)
    const requestedProductIds = Array.from(
      new Set(items.map((it: any) => String(it?.productId || '').trim()).filter(Boolean))
    );

    let subtotal = 0;
    const validatedItems: {
      productId: string;
      productNameSnapshot: string;
      weightVariant: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      weightKg: number;
    }[] = [];

    for (const item of items) {
      const productId = String(item?.productId || '').trim();
      const weightVariant = String(item?.weightVariant || '').trim();
      const product = AUTHORITATIVE_PRICES[productId];
      const productConfig = PRODUCTS[productId];

      if (!product || (productConfig && (!productConfig.active || !productConfig.purchasable))) {
        return NextResponse.json(
          { success: false, message: `Product unavailable or invalid ID: ${productId}` },
          { status: 400 }
        );
      }

      const unitPrice = product.prices[weightVariant];
      if (!unitPrice || !Number.isFinite(unitPrice) || unitPrice <= 0) {
        return NextResponse.json(
          { success: false, message: `Invalid weight variant ${weightVariant} for ${product.name}` },
          { status: 400 }
        );
      }

      const parsedQty = Number(item?.quantity);
      if (!Number.isInteger(parsedQty) || parsedQty < 1 || parsedQty > 50) {
        return NextResponse.json(
          { success: false, message: `Invalid quantity for ${product.name} (must be between 1 and 50).` },
          { status: 400 }
        );
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

    // 2. Calculate Server-side Verified Shipping Rate using ONLY validated items
    const shippingResult = await calculateShippingCharge(cleanPincode, validatedItems, subtotal);
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

    // 3. Calculate Authoritative Discount using ONLY validated items & server subtotal
    let discount = 0;
    let validatedCode: string | null = null;
    if (couponCode && typeof couponCode === 'string') {
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

    // 4. Compute Final Verified Total & 50% Advance for COD
    const finalTotal = Math.max(1, subtotal - discount + shippingFee);
    const advanceAmount = isCod ? Math.ceil(finalTotal * 0.5) : finalTotal;
    const codRemainingAmount = isCod ? finalTotal - advanceAmount : 0;

    // 5. Generate Cryptographic Non-Enumerable Order Number
    const orderNumber = generateNextOrderNumber();
    const cleanCustomerName = name.trim().slice(0, 120);
    const existingSession = await getCustomerSessionFromRequest(req);

    // 6. Verify Stock Atomically & Create Customer/Address/Pending Order in Transaction
    let isBrandNewCustomer = false;
    const dbOrder = await prisma.$transaction(async (tx) => {
      const dbInventoryRows = await tx.productInventory.findMany({
        where: { id: { in: requestedProductIds } },
      });
      const inventoryMap = new Map(dbInventoryRows.map((row) => [row.id, row]));
      for (const vItem of validatedItems) {
        const dbStock = inventoryMap.get(vItem.productId);
        if (dbStock) {
          if (dbStock.stockStatus === 'OUT_OF_STOCK') {
            throw new StockUnavailableError(`${vItem.productNameSnapshot} is currently out of stock.`);
          }
          if (dbStock.stockStatus === 'RESTOCKING_SOON' && !dbStock.canPreorder) {
            throw new StockUnavailableError(
              `${vItem.productNameSnapshot} is currently restocking and unavailable for immediate checkout.`
            );
          }
        }
      }

      let customer = null;
      if (existingSession) {
        customer = await tx.customer.findUnique({
          where: { id: existingSession.id },
          select: { id: true },
        });
      }

      if (!customer) {
        customer = await tx.customer.findFirst({
          where: {
            OR: [{ mobile: cleanMobile }, { email: cleanEmail }],
          },
          select: { id: true },
        });
      }

      if (!customer) {
        isBrandNewCustomer = true;
        customer = await tx.customer.create({
          data: {
            name: cleanCustomerName,
            mobile: cleanMobile,
            email: cleanEmail,
          },
          select: { id: true },
        });
      }

      const address = await tx.address.create({
        data: {
          customerId: customer.id,
          recipientName: cleanCustomerName,
          mobileNumber: cleanMobile,
          addressLine1: addressLine1.trim().slice(0, 250),
          addressLine2: addressLine2 ? String(addressLine2).trim().slice(0, 250) : null,
          area: area ? String(area).trim().slice(0, 120) : '',
          city: city.trim().slice(0, 100),
          state: state.trim().slice(0, 100),
          pincode: cleanPincode,
          landmark: landmark ? String(landmark).trim().slice(0, 150) : null,
        },
        select: { id: true },
      });

      return tx.order.create({
        data: {
          orderNumber,
          cashfreeOrderId: orderNumber,
          customerId: customer.id,
          shippingAddressId: address.id,
          subtotal,
          shippingFee,
          discount,
          total: finalTotal,
          currency: 'INR',
          paymentMethod: isCod ? 'COD' : 'CASHFREE',
          paymentStatus: isCod ? 'COD_ADVANCE_PENDING' : 'PAYMENT_PENDING',
          orderStatus: 'NEW',
          advanceAmount: isCod ? advanceAmount : 0,
          advancePaidAmount: 0,
          codRemainingAmount: isCod ? codRemainingAmount : 0,
          referralCode: validatedCode,
          notes: landmark ? `Landmark: ${String(landmark).trim().slice(0, 150)}` : null,
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
          shipments: {
            create: {
              courierProvider: shippingResult.courierName || 'Standard Courier',
              shippingFee,
              status: 'PENDING',
            },
          },
        },
      });
    });

    createdOrderId = dbOrder.id;

    let appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://www.kamadhenuhoneyfarms.in'
    ).replace(/\/$/, '');

    const isSandboxEnv = (process.env.CASHFREE_ENV || '').trim().toUpperCase() === 'SANDBOX';
    if (
      !isSandboxEnv &&
      (appBaseUrl.includes('vercel.app') || appBaseUrl === 'https://kamadhenuhoneyfarms.in')
    ) {
      appBaseUrl = 'https://www.kamadhenuhoneyfarms.in';
    }

    const orderAccessToken = signOrderAccessToken(orderNumber, dbOrder.customerId);
    const returnUrl = `${appBaseUrl}/order-confirmation?orderNumber={order_id}&order_id={order_id}&status=confirmed&token=${encodeURIComponent(orderAccessToken)}`;
    const notifyUrl = `${appBaseUrl}/api/payment/cashfree/webhook`;

    let cashfreeOrder;
    try {
      cashfreeOrder = await createCashfreeOrder({
        orderId: orderNumber,
        orderAmount: advanceAmount,
        orderCurrency: 'INR',
        customer: {
          customer_id: dbOrder.customerId,
          customer_name: cleanCustomerName,
          customer_email: cleanEmail,
          customer_phone: cleanMobile,
        },
        returnUrl,
        notifyUrl,
        orderNote: isCod
          ? `50% COD Advance for Kamadhenu Honey Farms Order ${orderNumber}`
          : `Kamadhenu Honey Farms Pure Honey Order ${orderNumber}`,
      });
    } catch (cfError) {
      // Prevent orphaned NEW/pending orders in DB if gateway initialization fails
      await prisma.order
        .update({
          where: { id: dbOrder.id },
          data: { orderStatus: 'CANCELLED', paymentStatus: 'FAILED' },
        })
        .catch(() => {});
      throw cfError;
    }

    const cashfreeConfig = getCashfreeConfig();

    const response = NextResponse.json({
      success: true,
      paymentSessionId: cashfreeOrder.payment_session_id,
      orderNumber,
      orderId: dbOrder.id,
      cashfreeOrderId: cashfreeOrder.order_id,
      orderAccessToken,
      environment: cashfreeConfig.env,
      amount: advanceAmount,
      currency: 'INR',
      paymentMethod: isCod ? 'COD' : 'CASHFREE',
      subtotal,
      shippingFee,
      discount,
      finalTotal,
      advanceAmount,
      codRemainingAmount,
      courierName: shippingResult.courierName,
      estimatedDays: shippingResult.estimatedDays,
    });

    // Attach order-scoped access cookie (works across redirects without hijacking other customer accounts)
    attachOrderAccessCookie(response, orderAccessToken);

    // Only issue a full customer account session cookie when customer is brand-new
    // (if returning customer isn't signed in yet, we do NOT auto-authenticate someone just from entering their phone number)
    if (isBrandNewCustomer && !existingSession) {
      try {
        const sessionToken = await createCustomerSession(dbOrder.customerId, req);
        if (sessionToken) attachCustomerSessionCookie(response, sessionToken);
      } catch (sessionError) {
        console.error('Session creation error in create-order:', sessionError);
      }
    }

    return response;
  } catch (error: any) {
    if (claimedIdempotencyKey) {
      await releaseCheckoutIdempotencyKey(claimedIdempotencyKey);
    }
    if (error instanceof StockUnavailableError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    console.error('Create Cashfree order error:', error, createdOrderId ? { createdOrderId } : {});
    return NextResponse.json(
      { success: false, message: 'Failed to initialize payment checkout. Please try again.' },
      { status: 500 }
    );
  }
}
