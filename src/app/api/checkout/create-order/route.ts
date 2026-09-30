import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCashfreeOrder, getCashfreeConfig } from '@/lib/cashfree';
import { calculateShippingCharge } from '@/lib/shipping';
import { validateDiscountOrReferralCode } from '@/lib/referral';
import { isBangaloreDelivery } from '@/lib/location';
import { generateNextOrderNumber } from '@/lib/orderNumber';
import { AUTHORITATIVE_PRICES } from '@/lib/products';
import { createCustomerSession, attachCustomerSessionCookie } from '@/lib/customerAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Your cart is empty' },
        { status: 400 }
      );
    }

    // 1. Calculate Authoritative Subtotal Server-Side
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

    // 2. Calculate Server-side Verified Shipping Rate
    const shippingResult = await calculateShippingCharge(cleanPincode, items);
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

    // 3. Calculate Authoritative Discount (Static Coupons + Admin Referral Offers & Rewards)
    let discount = 0;
    let validatedCode: string | null = null;
    if (couponCode && typeof couponCode === 'string') {
      const validation = await validateDiscountOrReferralCode(
        couponCode,
        subtotal,
        items,
        cleanMobile,
        email.trim().toLowerCase()
      );
      if (validation.valid) {
        discount = validation.calculatedDiscount;
        validatedCode = validation.code;
      }
    }

    // 4. Compute Final Verified Total & 50% Advance for COD
    const finalTotal = Math.max(1, subtotal - discount + shippingFee);
    const advanceAmount = isCod ? Math.ceil(finalTotal * 0.50) : finalTotal;
    const codRemainingAmount = isCod ? (finalTotal - advanceAmount) : 0;

    // 5. Generate Next Unique Order Number (instantaneous in memory)
    const orderNumber = generateNextOrderNumber();

    // 6. Create or Find Customer & Address in Database
    const cleanEmail = email.trim().toLowerCase();
    const cleanCustomerName = name.trim();

    let appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://kamadhenuhoneyfarms.in'
    ).replace(/\/$/, '');

    if (appBaseUrl.includes('vercel.app')) {
      appBaseUrl = 'https://kamadhenuhoneyfarms.in';
    }

    const returnUrl = `${appBaseUrl}/order-confirmation?order_id={order_id}&orderNumber={order_id}`;
    const notifyUrl = `${appBaseUrl}/api/payment/cashfree/webhook`;

    // 6, 7 & 8: Concurrently create database record AND Cashfree order session
    const dbPromise = (async () => {
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { mobile: cleanMobile },
            { email: cleanEmail },
          ],
        },
        select: { id: true },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: cleanCustomerName,
            mobile: cleanMobile,
            email: cleanEmail,
          },
          select: { id: true },
        });
      }

      const address = await prisma.address.create({
        data: {
          customerId: customer.id,
          recipientName: cleanCustomerName,
          mobileNumber: cleanMobile,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2?.trim() || null,
          area: area?.trim() || '',
          city: city.trim(),
          state: state.trim(),
          pincode: cleanPincode,
          landmark: landmark?.trim() || null,
        },
        select: { id: true },
      });

      return await prisma.order.create({
        data: {
          orderNumber,
          cashfreeOrderId: orderNumber, // Pre-bound without second roundtrip
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
          notes: landmark ? `Landmark: ${landmark}` : null,
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
    })();

    const cashfreePromise = createCashfreeOrder({
      orderId: orderNumber,
      orderAmount: advanceAmount, // Full payment for online, or 50% advance for COD
      orderCurrency: 'INR',
      customer: {
        customer_id: `cust_${cleanMobile}`,
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

    // Concurrently await BOTH database order creation and Cashfree order session
    // This guarantees the database record is 100% committed before checkout opens.
    const [dbOrder, cashfreeOrder] = await Promise.all([
      dbPromise,
      cashfreePromise,
    ]);

    const cashfreeConfig = getCashfreeConfig();

    const response = NextResponse.json({
      success: true,
      paymentSessionId: cashfreeOrder.payment_session_id,
      orderNumber,
      orderId: dbOrder.id,
      cashfreeOrderId: cashfreeOrder.order_id,
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

    try {
      const sessionToken = await createCustomerSession(dbOrder.customerId, req);
      if (sessionToken) attachCustomerSessionCookie(response, sessionToken);
    } catch (sessErr) {
      console.error('Session creation error in create-order:', sessErr);
    }

    return response;
  } catch (error: any) {
    console.error('Create Cashfree order error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to initialize Cashfree payment checkout' },
      { status: 500 }
    );
  }
}
