/**
 * Owner WhatsApp Notification Utility
 * Sends a WhatsApp message to the owner's number when a new order is placed.
 * Uses the WhatsApp Click-to-Chat API (wa.me) via Callmebot or direct webhook.
 * Currently uses Callmebot free API (no cost, just API key needed).
 */

const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP_NUMBER || '919980114675'; // Owner's WhatsApp number
const CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY || '';

/**
 * Sends an order notification to the owner's WhatsApp via Callmebot.
 * Fails silently — never blocks the main order confirmation flow.
 */
export async function sendOwnerOrderNotification(order: {
  orderNumber: string;
  customerName: string;
  customerMobile: string;
  total: number;
  paymentMethod: string;
  items: Array<{ productName: string; weightVariant: string; quantity: number }>;
  city: string;
  pincode: string;
}): Promise<void> {
  try {
    // Format items list
    const itemsList = order.items
      .map((i) => `  • ${i.productName} (${i.weightVariant}) x${i.quantity}`)
      .join('\n');

    const message =
      `🍯 *NEW ORDER — Kamadhenu Honey Farms*\n\n` +
      `📦 Order: *${order.orderNumber}*\n` +
      `👤 Customer: ${order.customerName}\n` +
      `📱 Mobile: ${order.customerMobile}\n` +
      `📍 Delivery: ${order.city} - ${order.pincode}\n\n` +
      `🛒 Items:\n${itemsList}\n\n` +
      `💰 Total: *₹${order.total}*\n` +
      `💳 Payment: ${order.paymentMethod}\n\n` +
      `⚡ Pack and dispatch at the earliest!`;

    if (CALLMEBOT_API_KEY) {
      // Method 1: Callmebot API (free, requires one-time registration)
      const encoded = encodeURIComponent(message);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${OWNER_WHATSAPP}&text=${encoded}&apikey=${CALLMEBOT_API_KEY}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        console.warn('[Owner Notification] Callmebot API returned error:', res.status);
      } else {
        console.log(`✅ [Owner Notification] WhatsApp sent for order ${order.orderNumber}`);
      }
    } else {
      // Fallback: Log to console so it's visible in Vercel logs
      console.log(
        `\n📲 [OWNER NOTIFICATION — No WhatsApp API key configured]\n` +
        `To: +${OWNER_WHATSAPP}\n` +
        `Message:\n${message}\n`
      );
    }
  } catch (err) {
    // Never throw — this is a non-critical notification
    console.warn('[Owner Notification] Failed to send WhatsApp notification:', err);
  }
}
