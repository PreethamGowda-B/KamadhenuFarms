import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms and Conditions | Kamadhenu Honey Farms',
  description: 'Terms and Conditions of Service for Kamadhenu Honey Farms Bangalore.',
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 840, margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#2d3748', lineHeight: 1.7 }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#b8860b', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
        ← Back to Kamadhenu Honey Farms
      </Link>
      
      <h1 style={{ fontSize: '2rem', color: '#1a202c', marginBottom: 8 }}>Terms and Conditions</h1>
      <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: 32 }}>Last Updated: March 2026</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>1. Introduction & Acceptance</h2>
        <p>Welcome to Kamadhenu Honey Farms (<b>kamadhenuhoneyfarms.in</b>). By accessing our website, placing an order, or utilizing our services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our website.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>2. Products & Pricing</h2>
        <p>Kamadhenu Honey Farms produces and sells pure, raw, organic apiary honey, dry fruit honey, and related natural bee products based out of Bangalore, Karnataka, India.</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>All prices listed on the website are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise.</li>
          <li>Product availability and pricing are subject to change without prior notice.</li>
          <li>We take rigorous care to deliver 100% authentic, raw, unadulterated honey. Honey may crystallize naturally over time; this is a sign of pure raw honey and not a defect.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>3. Orders & Payments</h2>
        <p>Orders can be placed directly through our secure online checkout or official WhatsApp channels. Payments are securely processed via Razorpay supporting UPI, Debit/Credit Cards, and Net Banking. Cash on Delivery (COD) may be available for select serviceable pincodes.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>4. Intellectual Property</h2>
        <p>All content on this website, including logos, imagery, product descriptions, farm media, and design elements, is the exclusive property of Kamadhenu Honey Farms and is protected by copyright and intellectual property laws.</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', color: '#2d3748', marginBottom: 12 }}>5. Governing Law & Jurisdiction</h2>
        <p>These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising in relation to these terms shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.</p>
      </section>

      <section style={{ marginTop: 36, padding: 20, background: '#f7fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Contact Information</h3>
        <p style={{ margin: 0 }}><b>Kamadhenu Honey Farms</b></p>
        <p style={{ margin: 0 }}>Location: Taverekere, Magadi Road, Bangalore South, Karnataka 562130, India</p>
        <p style={{ margin: 0 }}>Phone / WhatsApp: +91 9980114675 / +91 9535134351</p>
        <p style={{ margin: 0 }}>Email: contact@kamadhenuhoneyfarms.in / thepreethu01@gmail.com</p>
      </section>
    </div>
  );
}
