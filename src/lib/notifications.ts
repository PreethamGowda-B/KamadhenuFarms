import { prisma } from '@/lib/prisma';
import { sendMulticastPush } from '@/lib/firebaseAdmin';
import { sendOwnerOrderNotification } from '@/lib/ownerNotification';

export type OrderNotificationEvent =
  | 'ORDER_CONFIRMED'
  | 'ORDER_PROCESSING'
  | 'ORDER_PACKED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_FAILED';

interface OrderSnapshot {
  id: string;
  orderNumber: string;
  customerId: string;
  total: number;
  paymentMethod?: string;
  customer?: {
    name?: string;
    mobile?: string;
    email?: string;
  };
  shippingAddress?: {
    city?: string;
    pincode?: string;
  };
  items?: Array<{
    productNameSnapshot?: string;
    weightVariant?: string;
    quantity?: number;
  }>;
}

/**
 * Dispatches New Order notifications to Administrators:
 * 1. Database: Upserts an AdminNotification record (deduplicated via dedupKey).
 * 2. Push: Multicast FCM push to all active admin devices.
 * 3. WhatsApp: Non-blocking Callmebot alert to owner.
 */
export async function notifyAdminNewOrder(order: OrderSnapshot): Promise<void> {
  try {
    const dedupKey = `ORDER_PAID:${order.orderNumber}`;
    const firstName = order.customer?.name ? String(order.customer.name).trim().split(' ')[0] : 'Customer';

    // 1. Ensure AdminNotification is stored in PostgreSQL (idempotent)
    await prisma.adminNotification.upsert({
      where: { dedupKey },
      update: {},
      create: {
        title: `New Order: ${order.orderNumber}`,
        message: `${firstName} placed order of ₹${order.total} (${order.orderNumber}) via Cashfree.`,
        type: 'HIGH_VALUE_ORDER',
        link: `/admin/orders/${order.id}`,
        dedupKey,
        metadata: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          itemCount: order.items?.length || 1,
        }),
      },
    });

    // 2. Fetch active admin device tokens
    const adminTokens = await prisma.deviceToken.findMany({
      where: {
        isAdmin: true,
        isActive: true,
      },
      select: { token: true },
    });

    if (adminTokens.length > 0) {
      const tokens = adminTokens.map((t) => t.token);
      await sendMulticastPush({
        tokens,
        title: `🍯 New Order: ${order.orderNumber}`,
        body: `Total ₹${order.total} • ${order.items?.length || 1} item(s) • Ready for packing.`,
        clickAction: `/admin/orders/${order.id}`,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: 'NEW_ORDER',
        },
        tag: `admin_order_${order.orderNumber}`,
      });
    }

    // 3. Dispatch owner WhatsApp alert (Callmebot) as backup
    if (order.customer?.mobile && order.shippingAddress) {
      sendOwnerOrderNotification({
        orderNumber: order.orderNumber,
        customerName: order.customer.name || 'Customer',
        customerMobile: order.customer.mobile,
        total: order.total,
        paymentMethod: order.paymentMethod || 'CASHFREE',
        items: (order.items || []).map((i) => ({
          productName: i.productNameSnapshot || 'Pure Raw Honey',
          weightVariant: i.weightVariant || '500g',
          quantity: i.quantity || 1,
        })),
        city: order.shippingAddress.city || 'Bangalore',
        pincode: order.shippingAddress.pincode || '560001',
      }).catch((err) => console.warn('Owner WhatsApp alert notice:', err));
    }
  } catch (err) {
    console.error('Error in notifyAdminNewOrder:', err);
  }
}

/**
 * Dispatches Customer Lifecycle Web Push notifications:
 * Strictly checks NotificationDeliveryLog to enforce idempotency.
 */
export async function notifyCustomerOrderEvent(params: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  eventType: OrderNotificationEvent;
  title: string;
  body: string;
  path?: string;
  metadata?: Record<string, string>;
}): Promise<boolean> {
  const { orderId, orderNumber, customerId, eventType, title, body, path, metadata = {} } = params;

  try {
    // 1. Idempotency Check: Prevent duplicate customer push for the same event
    const existingLog = await prisma.notificationDeliveryLog.findUnique({
      where: {
        orderId_eventType_recipient_channel: {
          orderId,
          eventType,
          recipient: customerId,
          channel: 'FCM',
        },
      },
    });

    if (existingLog && existingLog.status === 'SENT') {
      console.log(`ℹ️ [Customer Push] ${eventType} for order ${orderNumber} already sent. Idempotent skip.`);
      return true;
    }

    // 2. Fetch active customer device tokens
    const customerTokens = await prisma.deviceToken.findMany({
      where: {
        customerId,
        isActive: true,
      },
      select: { token: true },
    });

    if (customerTokens.length === 0) {
      console.log(`ℹ️ [Customer Push] Customer ${customerId} has no registered push devices for ${eventType}.`);
      return false;
    }

    const tokens = customerTokens.map((t) => t.token);
    const clickAction = path || `/track-order?orderNumber=${encodeURIComponent(orderNumber)}`;

    // 3. Multicast Push
    const result = await sendMulticastPush({
      tokens,
      title,
      body,
      clickAction,
      data: {
        orderId,
        orderNumber,
        eventType,
        ...metadata,
      },
      tag: `cust_order_${orderNumber}_${eventType}`,
    });

    // 4. Record Delivery Log
    await prisma.notificationDeliveryLog.upsert({
      where: {
        orderId_eventType_recipient_channel: {
          orderId,
          eventType,
          recipient: customerId,
          channel: 'FCM',
        },
      },
      update: {
        status: result.successCount > 0 ? 'SENT' : 'FAILED',
        sentAt: new Date(),
        errorMessage: result.failureCount > 0 ? `${result.failureCount} failed out of ${tokens.length}` : null,
      },
      create: {
        orderId,
        orderNumber,
        eventType,
        recipient: customerId,
        channel: 'FCM',
        status: result.successCount > 0 ? 'SENT' : 'FAILED',
        errorMessage: result.failureCount > 0 ? `${result.failureCount} failed out of ${tokens.length}` : null,
      },
    });

    return result.successCount > 0;
  } catch (err: any) {
    console.error(`Failed to dispatch customer notification (${eventType}):`, err);
    return false;
  }
}

/**
 * Convenience dispatchers for customer order lifecycle stages
 */
export async function notifyCustomerOrderConfirmed(order: OrderSnapshot): Promise<void> {
  await notifyCustomerOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    eventType: 'ORDER_CONFIRMED',
    title: `🍯 Order Confirmed! (${order.orderNumber})`,
    body: `Thank you! Your order of ₹${order.total} has been confirmed and sent to our farm apiary.`,
    path: `/order-confirmation?orderNumber=${encodeURIComponent(order.orderNumber)}`,
  });
}

export async function notifyCustomerOrderProcessing(order: OrderSnapshot): Promise<void> {
  await notifyCustomerOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    eventType: 'ORDER_PROCESSING',
    title: `🐝 Preparing Your Honey (${order.orderNumber})`,
    body: `Your honey jars are being bottled and quality-checked at our Taverekere farm.`,
    path: `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`,
  });
}

export async function notifyCustomerOrderPacked(order: OrderSnapshot): Promise<void> {
  await notifyCustomerOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    eventType: 'ORDER_PACKED',
    title: `📦 Order Packed & Ready (${order.orderNumber})`,
    body: `Your order is securely packed in protective glassware packaging for courier handover.`,
    path: `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`,
  });
}

export async function notifyCustomerOrderShipped(
  order: OrderSnapshot,
  courierName?: string,
  trackingNumber?: string
): Promise<void> {
  const courierInfo = trackingNumber
    ? `Handed over to ${courierName || 'Courier'} (AWB: ${trackingNumber}). Tap to track!`
    : `Your pure honey order is on its way to your doorstep.`;

  await notifyCustomerOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    eventType: 'ORDER_SHIPPED',
    title: `🚚 Order Dispatched! (${order.orderNumber})`,
    body: courierInfo,
    path: `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`,
    metadata: {
      courierName: courierName || '',
      trackingNumber: trackingNumber || '',
    },
  });
}

export async function notifyCustomerOrderDelivered(order: OrderSnapshot): Promise<void> {
  await notifyCustomerOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    eventType: 'ORDER_DELIVERED',
    title: `✨ Order Delivered! (${order.orderNumber})`,
    body: `Your Kamadhenu Honey order has been delivered. Enjoy the pure, farm-fresh goodness!`,
    path: `/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}`,
  });
}

export async function notifyCustomerPaymentFailed(order: OrderSnapshot): Promise<void> {
  await notifyCustomerOrderEvent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    eventType: 'PAYMENT_FAILED',
    title: `⚠️ Payment Unsuccessful (${order.orderNumber})`,
    body: `Your payment for order ${order.orderNumber} (₹${order.total}) could not be completed. Tap to retry.`,
    path: `/order-confirmation?orderNumber=${encodeURIComponent(order.orderNumber)}&retry=true`,
  });
}
