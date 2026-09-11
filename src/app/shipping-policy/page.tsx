import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Shipping and Delivery Policy | Kamadhenu Honey Farms',
  description: 'Shipping and Delivery Policy for Kamadhenu Honey Farms Bangalore.',
};

export default function ShippingPolicyPage() {
  return (
    <div style={{ maxWidth: 840, margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2d3748', lineHeight: 1.7 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b8860b', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
        ← Back to Kamadhenu Honey Farms
      </Link>
      
      <h1 style={{ fontSize: '2rem', color: '#1a202c', marginBottom: 8 }}>Shipping & Delivery Policy</h1>
      <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: 32 }}>Last Updated: March 2026</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>1. Dispatch & Processing Time</h2>
        <p>All orders placed on Kamadhenu Honey Farms are processed, packaged in shockproof food-grade containers, and dispatched from our farm in Taverekere, Bangalore within <b>24 hours</b> of order confirmation (excluding Sundays and national holidays).</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>2. Delivery Timelines</h2>
        <p>Estimated transit times across India:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li><b>Bangalore Urban & Rural:</b> 1 to 2 Business Days (Express Delivery)</li>
          <li><b>Rest of Karnataka:</b> 2 to 3 Business Days</li>
          <li><b>South India (Tamil Nadu, Kerala, Andhra Pradesh, Telangana):</b> 3 to 4 Business Days</li>
          <li><b>Rest of India:</b> 4 to 6 Business Days</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>3. Shipping Charges</h2>
        <p>Shipping charges are dynamically calculated based on your delivery postal pincode and package weight during checkout. We partner with reliable courier aggregators including Shiprocket, DTDC, and BlueDart to guarantee safe transit for our glass jars.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>4. Order Tracking</h2>
        <p>As soon as your shipment is picked up by our courier partner, you will receive a tracking link and consignment number via SMS / WhatsApp. You can also track your parcel live anytime on our <Link href="/track-order" style={{ color: '#b8860b', fontWeight: 600 }}>Track Order</Link> page.</p>
      </section>

      <section style={{ marginTop: 36, padding: 20, background: '#f7fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Shipping Queries</h3>
        <p style={{ margin: 0 }}>For questions regarding shipping or custom bulk deliveries, contact our dispatch team:</p>
        <p style={{ margin: '8px 0 0' }}>WhatsApp: <b>+91 9980114675</b></p>
        <p style={{ margin: 0 }}>Email: <b>contact@kamadhenuhoneyfarms.in</b></p>
      </section>
    </div>
  );
}
