import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Cancellation and Refund Policy | Kamadhenu Honey Farms',
  description: 'Cancellation and Refund Policy for Kamadhenu Honey Farms Bangalore.',
};

export default function RefundPolicyPage() {
  return (
    <div style={{ maxWidth: 840, margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2d3748', lineHeight: 1.7 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b8860b', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
        ← Back to Kamadhenu Honey Farms
      </Link>
      
      <h1 style={{ fontSize: '2rem', color: '#1a202c', marginBottom: 8 }}>Cancellation & Refund Policy</h1>
      <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: 32 }}>Last Updated: March 2026</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>1. Order Cancellation</h2>
        <p>You can cancel an order at no extra charge before it has been dispatched from our farm facility (typically within 12 hours of placing the order). Once an order is handed over to the courier partner, cancellation is no longer possible.</p>
        <p>To request a cancellation, please reach out to us promptly via WhatsApp at <b>+91 9980114675</b> or email <b>thepreethu01@gmail.com</b> with your Order Number.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>2. Damaged or Defective Deliveries</h2>
        <p>Because honey is a natural food product packaged in protective glass/food-grade containers, we inspect every jar before dispatch. In the unlikely event that your parcel arrives damaged in transit, broken, leaking, or with the wrong item:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Please notify us within <b>48 hours</b> of delivery.</li>
          <li>Share clear photos or a short video showing the damaged package/jar along with your Order ID via WhatsApp (+91 9980114675).</li>
          <li>Upon quick verification, we will immediately arrange either a <b>free replacement</b> or a <b>100% full refund</b>, according to your preference.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>3. Refund Timeline & Mode of Payment</h2>
        <p>Approved refunds are processed back to the original method of payment:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li><b>Online Payments (UPI / Cards / Netbanking):</b> The refund will be credited back to the source bank account/card through Razorpay within <b>5 to 7 business days</b>.</li>
          <li><b>Cash on Delivery (COD):</b> Refunds will be credited directly to your bank account or UPI ID upon providing bank details to our customer support.</li>
        </ul>
      </section>

      <section style={{ marginTop: 36, padding: 20, background: '#f7fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Need Help with a Return or Refund?</h3>
        <p style={{ margin: 0 }}>We are dedicated to your total satisfaction with our pure honey.</p>
        <p style={{ margin: '8px 0 0' }}>WhatsApp Support: <b>+91 9980114675</b></p>
        <p style={{ margin: 0 }}>Support Email: <b>contact@kamadhenuhoneyfarms.in</b> / <b>thepreethu01@gmail.com</b></p>
      </section>
    </div>
  );
}
