import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesSessionFromRequest } from '@/lib/salesAuth';
import { getAdminSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Auth Check: Allow authenticated Salesperson or Admin
    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    if (!salesSession && !adminSession) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please log in as a Sales Executive or Admin.' },
        { status: 401 }
      );
    }

    const {
      shopName,
      ownerName,
      mobile,
      whatsapp,
      email,
      address,
      area,
      city,
      district,
      state = 'Karnataka',
      pincode,
      latitude,
      longitude,
      mapsUrl,
      shopType = 'Grocery Store',
      frontImageUrl,
      interiorImageUrl,
      otherImageUrl,
      
      // Honey Requirements
      requirements = [],
      estimatedMonthlyKg = 0,
      estimatedReorderCycleDays = 30,

      // First Order
      firstOrderRequired = false,
      firstOrderItems = [],
      
      // Payment & Credit terms
      paymentMethod = 'PAYMENT_AT_DELIVERY',
      creditPeriod,
      creditLimit = 0,
      agreedPaymentDate,

      // Relationship & Notes
      responseStatus = 'INTERESTED',
      potential = 'MEDIUM',
      notes = '',
    } = body;

    // Strict Validation
    if (!shopName?.trim()) {
      return NextResponse.json({ success: false, message: 'Shop Name is required' }, { status: 400 });
    }
    if (!ownerName?.trim()) {
      return NextResponse.json({ success: false, message: 'Shop Owner Name is required' }, { status: 400 });
    }
    if (!mobile?.trim()) {
      return NextResponse.json({ success: false, message: 'Shop Mobile Number is required' }, { status: 400 });
    }
    if (!address?.trim() || !area?.trim() || !city?.trim() || !pincode?.trim()) {
      return NextResponse.json({ success: false, message: 'Complete Address, Area, City, and Pincode are required' }, { status: 400 });
    }
    if (!frontImageUrl) {
      return NextResponse.json({ success: false, message: 'Shop Front / Board Image is required' }, { status: 400 });
    }

    // Determine Salesperson Details
    const salespersonId = salesSession?.id || (body.salespersonId && body.salespersonId !== 'ADMIN' ? body.salespersonId : null);
    const salespersonName = salesSession?.fullName || body.salespersonName || (adminSession ? 'Admin' : 'Field Sales');
    const salespersonMobile = salesSession?.mobileNumber || body.salespersonMobile || '';

    // Transaction-Safe Atomic Code Generation and Persistence
    const createdData = await prisma.$transaction(async (tx) => {
      // 1. Atomic Sequence Increment (guarantees collision-free KHF-SHOP-000001)
      const seq = await tx.shopSequence.upsert({
        where: { id: 1 },
        update: { lastSeq: { increment: 1 } },
        create: { id: 1, lastSeq: 1 },
      });

      const shopCode = `KHF-SHOP-${String(seq.lastSeq).padStart(6, '0')}`;

      // 2. Compute Initial Financials & Orders
      let totalFirstOrderValue = 0;
      let totalFirstOrderKg = 0;
      const validOrderItems: any[] = [];

      if (firstOrderRequired && Array.isArray(firstOrderItems) && firstOrderItems.length > 0) {
        for (const item of firstOrderItems) {
          const qty = Math.max(0, parseInt(item.quantity || '0', 10));
          const unitPrice = Math.max(0, parseFloat(item.unitPrice || '0'));
          const kgPerUnit = parseFloat(item.kgPerUnit || '0.5');
          if (qty > 0 && unitPrice >= 0) {
            const totalPrice = qty * unitPrice;
            const totalKg = qty * kgPerUnit;
            totalFirstOrderValue += totalPrice;
            totalFirstOrderKg += totalKg;
            validOrderItems.push({
              productName: item.productName || 'Pure Honey',
              quantity: qty,
              unitPrice: unitPrice,
              totalPrice: totalPrice,
              kg: totalKg,
            });
          }
        }
      }

      const cycleDays = Math.max(1, parseInt(String(estimatedReorderCycleDays || '30'), 10));
      const now = new Date();
      let nextReorderDate: Date | null = null;
      if (firstOrderRequired && validOrderItems.length > 0) {
        nextReorderDate = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000);
      }

      let outstanding = 0;
      let totalBilled = 0;
      let totalPaid = 0;

      if (firstOrderRequired && totalFirstOrderValue > 0) {
        totalBilled = totalFirstOrderValue;
        if (paymentMethod === 'CREDIT') {
          outstanding = totalFirstOrderValue;
        } else if (paymentMethod === 'CASH' || paymentMethod === 'UPI' || paymentMethod === 'BANK_TRANSFER') {
          totalPaid = totalFirstOrderValue;
        } else {
          // PAYMENT_AT_DELIVERY
          outstanding = totalFirstOrderValue;
        }
      }

      // 3. Create Shop Record
      const newShop = await tx.shop.create({
        data: {
          shopCode,
          shopNo: shopCode,
          shopName: shopName.trim(),
          ownerName: ownerName.trim(),
          contactPerson: ownerName.trim(),
          mobile: mobile.trim(),
          contactNumber: mobile.trim(),
          whatsapp: whatsapp ? whatsapp.trim() : null,
          email: email ? email.trim() : null,
          address: address.trim(),
          area: area.trim(),
          city: city.trim(),
          district: district ? district.trim() : null,
          state: state.trim(),
          pincode: pincode.trim(),
          pinCode: pincode.trim(),
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          mapsUrl: mapsUrl || null,
          shopType,
          frontImageUrl,
          interiorImageUrl: interiorImageUrl || null,
          otherImageUrl: otherImageUrl || null,

          salespersonId,
          salespersonSnapshotName: salespersonName,
          salespersonSnapshotMobile: salespersonMobile,
          assignedSalesExecutiveId: salespersonId,
          assignedSalesExecutiveName: salespersonName,

          responseStatus,
          potential,
          paymentMethod,
          creditPeriod: paymentMethod === 'CREDIT' ? creditPeriod : null,
          creditLimit: paymentMethod === 'CREDIT' ? Math.max(0, parseFloat(creditLimit || '0')) : 0,
          agreedPaymentDate: paymentMethod === 'CREDIT' && agreedPaymentDate ? new Date(agreedPaymentDate) : null,

          outstandingAmount: outstanding,
          totalBilledAmount: totalBilled,
          totalPaidAmount: totalPaid,

          estimatedMonthlyKg: parseFloat(estimatedMonthlyKg || '0'),
          estimatedReorderCycleDays: cycleDays,
          reorderIntervalDays: cycleDays,
          nextReorderDate,
          firstOrderDate: firstOrderRequired && validOrderItems.length > 0 ? now : null,
          lastOrderDate: firstOrderRequired && validOrderItems.length > 0 ? now : null,
          lastOrderQuantity: totalFirstOrderKg,
          totalOrders: firstOrderRequired && validOrderItems.length > 0 ? 1 : 0,
          totalKgPurchased: totalFirstOrderKg,
          totalPurchaseValue: totalFirstOrderValue,
          notes,
          status: responseStatus === 'ORDER_CONFIRMED' ? 'ORDER_CONFIRMED' : 'ACTIVE',
        },
      });

      // 4. Create Product Requirement Records
      if (Array.isArray(requirements) && requirements.length > 0) {
        for (const reqItem of requirements) {
          if (reqItem.interested) {
            await tx.shopRequirement.create({
              data: {
                shopId: newShop.id,
                productName: reqItem.productName,
                interested: true,
                firstOrderQuantity: parseInt(reqItem.firstOrderQuantity || '0', 10),
                monthlyQuantity: parseInt(reqItem.monthlyQuantity || '0', 10),
                reorderCycleDays: parseInt(reqItem.reorderCycleDays || String(cycleDays), 10),
              },
            });
          }
        }
      }

      // 5. Create First Order (if applicable)
      if (firstOrderRequired && validOrderItems.length > 0) {
        const orderNo = `ORD-${now.getFullYear()}-${String(seq.lastSeq).padStart(6, '0')}`;
        const orderPaymentStatus = paymentMethod === 'CREDIT' ? 'PENDING' : (paymentMethod === 'PAYMENT_AT_DELIVERY' ? 'PENDING' : 'PAID');

        const shopOrder = await tx.shopOrder.create({
          data: {
            shopId: newShop.id,
            orderNo,
            orderDate: now,
            product: validOrderItems.map(i => `${i.quantity}x ${i.productName}`).join(', '),
            quantity: validOrderItems.reduce((acc, i) => acc + i.quantity, 0),
            kg: totalFirstOrderKg,
            orderValue: totalFirstOrderValue,
            totalAmount: totalFirstOrderValue,
            paymentMethod,
            paymentStatus: orderPaymentStatus,
            deliveryStatus: 'DELIVERED',
            dueDate: paymentMethod === 'CREDIT' && agreedPaymentDate ? new Date(agreedPaymentDate) : null,
            salespersonId,
            salesExecutive: salespersonName,
            notes: 'First order placed during shop onboarding',
            items: {
              create: validOrderItems,
            },
          },
        });

        // If paid immediately, create payment record
        if (orderPaymentStatus === 'PAID') {
          await tx.shopPayment.create({
            data: {
              shopId: newShop.id,
              orderId: shopOrder.id,
              amount: totalFirstOrderValue,
              paymentDate: now,
              paymentMethod,
              reference: 'First Order Instant Settlement',
              notes: 'Settled at time of shop onboarding',
              recordedBy: salespersonName,
            },
          });
        }
      }

      // 6. Log Initial Physical Visit
      await tx.shopVisit.create({
        data: {
          shopId: newShop.id,
          salespersonId,
          salespersonName,
          visitDate: now,
          purpose: 'NEW_ONBOARDING',
          discussion: notes || `Initial shop onboarding visit. Response: ${responseStatus}. Potential: ${potential}.`,
          orderTaken: firstOrderRequired && validOrderItems.length > 0,
          paymentCollected: paymentMethod === 'CASH' || paymentMethod === 'UPI' ? totalFirstOrderValue : 0,
          nextFollowUpDate: nextReorderDate,
          notes: `Registered by ${salespersonName}`,
        },
      });

      // 7. Audit Activity Trail
      await tx.shopActivity.create({
        data: {
          shopId: newShop.id,
          userId: salespersonId || 'ADMIN',
          userName: salespersonName,
          activityType: 'REGISTRATION',
          description: `Shop registered with ID ${shopCode}. Response: ${responseStatus}.`,
        },
      });

      // 8. Create Admin Alert Notification
      await tx.adminNotification.create({
        data: {
          title: `New Shop Registered: ${shopName}`,
          message: `Shop ${shopCode} (${shopName}) in ${area}, ${city} registered by ${salespersonName}. Est. monthly: ${estimatedMonthlyKg}kg.`,
          type: 'NEW_SHOP',
          link: `/admin/shops/${newShop.id}`,
        },
      });

      return { shop: newShop, shopCode };
    });

    return NextResponse.json({
      success: true,
      message: 'Shop successfully registered!',
      shopId: createdData.shop.id,
      shopCode: createdData.shopCode,
      shopName: createdData.shop.shopName,
      salespersonName,
      date: new Date().toLocaleDateString('en-IN'),
    });
  } catch (error: any) {
    console.error('Shop creation error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit shop. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';
    const city = searchParams.get('city') || 'ALL';
    const area = searchParams.get('area') || 'ALL';
    const shopType = searchParams.get('shopType') || 'ALL';
    const paymentStatus = searchParams.get('paymentStatus') || 'ALL';
    const reorderStatus = searchParams.get('reorderStatus') || 'ALL';
    const salespersonId = searchParams.get('salespersonId') || 'ALL';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Check caller session
    const salesSession = await getSalesSessionFromRequest(req);
    const adminSession = getAdminSessionFromRequest(req);

    const where: any = {};

    // If caller is salesperson (and not admin), isolate data to their own submitted shops
    if (salesSession && !adminSession) {
      where.salespersonId = salesSession.id;
    } else if (salespersonId !== 'ALL') {
      where.salespersonId = salespersonId;
    }

    if (search) {
      where.OR = [
        { shopName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { shopCode: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status !== 'ALL') {
      where.status = status;
    }
    if (city !== 'ALL') {
      where.city = city;
    }
    if (area !== 'ALL') {
      where.area = area;
    }
    if (shopType !== 'ALL') {
      where.shopType = shopType;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    if (reorderStatus === 'DUE_TODAY') {
      where.nextReorderDate = { gte: startOfToday, lte: endOfToday };
    } else if (reorderStatus === 'DUE_SOON') {
      where.nextReorderDate = { gt: endOfToday, lte: threeDaysFromNow };
    } else if (reorderStatus === 'OVERDUE') {
      where.nextReorderDate = { lt: startOfToday };
    }

    if (paymentStatus === 'OVERDUE') {
      where.AND = [
        { outstandingAmount: { gt: 0 } },
        { agreedPaymentDate: { lt: startOfToday } },
      ];
    } else if (paymentStatus === 'PENDING') {
      where.outstandingAmount = { gt: 0 };
    }

    const [shops, totalCount] = await Promise.all([
      prisma.shop.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          requirements: true,
          orders: { take: 3, orderBy: { orderDate: 'desc' } },
          payments: { take: 3, orderBy: { paymentDate: 'desc' } },
          visits: { take: 3, orderBy: { visitDate: 'desc' } },
          salesperson: {
            select: { id: true, applicationNo: true, fullName: true, mobileNumber: true },
          },
        },
      }),
      prisma.shop.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      shops,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Shop fetch error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch shops' }, { status: 500 });
  }
}
