import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Kamadhenu Honey Farms',
  description: 'Privacy Policy for Kamadhenu Honey Farms Bangalore.',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 840, margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2d3748', lineHeight: 1.7 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b8860b', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
        ← Back to Kamadhenu Honey Farms
      </Link>
      
      <h1 style={{ fontSize: '2rem', color: '#1a202c', marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: 32 }}>Last Updated: March 2026</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>1. Information We Collect</h2>
        <p>When you visit or place an order on Kamadhenu Honey Farms (<b>kamadhenuhoneyfarms.in</b>), we collect personal information necessary to fulfill your order and deliver your honey:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li><b>Customer Details:</b> Name, mobile phone number, and email address.</li>
          <li><b>Delivery Address:</b> Street address, city, state, postal pincode, and landmark.</li>
          <li><b>Payment Information:</b> Payment transactions are processed directly and securely through PCI-DSS compliant payment gateways (Razorpay). We do not store your complete card details or UPI PIN on our servers.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>2. How We Use Your Information</h2>
        <p>Your information is used strictly to:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Process, package, and dispatch your order.</li>
          <li>Send order updates, tracking information, and delivery confirmations via SMS, WhatsApp, or email.</li>
          <li>Provide customer service and address inquiries.</li>
          <li>Detect and prevent fraudulent transactions.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>3. Data Protection & Sharing</h2>
        <p>We do not sell, rent, or trade your personal data to third parties. Your delivery details are shared only with trusted logistics partners (such as Shiprocket and regional express couriers) solely for the purpose of doorstep order delivery.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>4. Cookies & Security</h2>
        <p>We use standard session cookies to maintain your shopping cart preferences. All communication between your device and our website is protected using industry-standard SSL/TLS encryption.</p>
      </section>

      <section style={{ marginTop: 36, padding: 20, background: '#f7fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Contact Us</h3>
        <p style={{ margin: 0 }}>If you have any questions regarding our Privacy Policy or your personal information, contact us at:</p>
        <p style={{ margin: '8px 0 0' }}><b>Kamadhenu Honey Farms</b></p>
        <p style={{ margin: 0 }}>Email: contact@kamadhenuhoneyfarms.in / thepreethu01@gmail.com</p>
        <p style={{ margin: 0 }}>Phone: +91 9980114675 / +91 9535134351</p>
      </section>
    </div>
  );
}
