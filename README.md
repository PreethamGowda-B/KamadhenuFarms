# 🍯 Kamadhenu Honey Farms (ಕಾಮಧೇನು ಜೇನು ಫಾರ್ಮ್ಸ್)

> **Direct-to-Consumer (D2C) Organic Honey Platform & Apiary Management Suite**  
> Built with Next.js 14, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, and Cashfree Payments.

[![Live Demo](https://img.shields.io/badge/Live%20Store-kamadhenuhoneyfarms.in-d8a64f?style=for-the-badge&logo=vercel&logoColor=white)](https://www.kamadhenuhoneyfarms.in/)  
[![Next.js 14](https://img.shields.io/badge/Next.js-14.1.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)  
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)  
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)  
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech/)  
[![Cashfree Payments](https://img.shields.io/badge/Payments-Cashfree%20V3-008080?style=for-the-badge)](https://www.cashfree.com/)

* * *

## 📖 Overview

**Kamadhenu Honey Farms** is a production-grade e-commerce storefront and operations ERP designed for an authentic local beekeeping apiary based in Bangalore, Karnataka.

The platform bridges farm-fresh honey directly to consumers across India through modern digital channels, combining **full online checkout (UPI / Cards)** with a specialized **50% advance Cash-on-Delivery (COD)** model tailored for local Bangalore customers.

* * *

## ✨ Key Features

### 🛒 D2C Storefront

-   **Authoritative Weight Variants:** Dynamic selection (`250g`, `500g`, `1kg`) across raw honeys, dry fruit infusions, and edible raw comb jars with server-side price verification.
-   **Artisanal Product Highlights:** Detailed purity chips (`100% Unprocessed`, `Live Enzymes Active`, `Edible Virgin Comb`) with customer rating tooltips.
-   **Flagship Launch Marquee:** Hardware-accelerated (`translate3d`) 60fps announcement banner with live stock indicators and direct category filters.
-   **Realtime Pincode Courier Check:** Live delivery estimation with automated fee calculations (Free Delivery for Karnataka on ₹999+; subsidized outside Karnataka).
-   **WhatsApp Commerce Integration:** Instant 1-click cart inquiries and direct bulk orders via pre-filled WhatsApp templates.

### 💳 Payments & Order Processing

-   **Cashfree Payment Gateway (V3):** Seamless modal and redirect checkout supporting UPI Intent (GPay, PhonePe, Paytm), NetBanking, and Credit/Debit cards.
-   **Bangalore 50% Advance Cash on Delivery (COD):** Geo-fenced COD engine that collects a 50% advance online via Cashfree and computes the remaining balance payable on doorstep delivery.
-   **HMAC-SHA256 Webhook Verification:** Tamper-proof webhook verification guaranteeing zero payment spoofing or false orders.
-   **Anti-Tampering Engine:** Server resolves authoritative product pricing and recomputes cart subtotals independently of client payloads.

### 📦 Customer Portal & Order Tracking

-   **Self-Service Order Tracking (`/track`):** Customers enter their order number to view real-time delivery status (`CONFIRMED` ➔ `PROCESSING` ➔ `PACKED` ➔ `SHIPPED` ➔ `DELIVERED`).
-   **Direct Courier Integration:** Instant links to live Delhivery, India Post, or express courier tracking portals using recorded AWB numbers.
-   **Invoice Generation:** Printable digital tax invoices and receipt downloads.

### 🛡️ Admin Suite & Operations ERP

-   **Order Management (`/admin/orders`):** Complete visibility over customer orders, payment receipts, and COD settlement states.
-   **Dispatch Courier Workflow:** Integrated modal to assign courier partners (Delhivery, Professional Couriers, etc.) and AWB tracking numbers with automated audit logging.
-   **COD Balance Collection:** Single-click balance reconciliation marking remaining cash collected upon delivery.
-   **Field Sales & Shop Network (`/admin/shops`):** B2B distribution tracking for retail store partners, stock reorders, and visit history.
-   **Recruitment Portal (`/admin/recruitment`):** Field sales agent recruitment pipelines and applicant review workflows.

* * *

## 🛠️ Architecture & Tech Stack

Layer

Technology

Purpose

**Frontend**

[Next.js 14](https://nextjs.org/) (App Router)

High-performance hybrid SSR & static page rendering

**Styling**

[Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS

Custom luxury aesthetic with glassmorphism & GPU transforms

**Language**

[TypeScript](https://www.typescriptlang.org/)

Type-safe business logic, models, and API contracts

**Database**

[PostgreSQL via Neon](https://neon.tech/)

Serverless scalable relational database

**ORM**

[Prisma ORM](https://www.prisma.io/)

Type-safe schema definitions, migrations, and queries

**Payment Gateway**

[Cashfree SDK](https://www.cashfree.com/)

Secure RBI-compliant payment processing & webhooks

**Icons & UI**

[Lucide React](https://lucide.dev/)

Clean, accessible iconography

**Deployment**

[Vercel](https://vercel.com/)

Edge hosting, global CDN, and automated CI/CD

* * *

## 📁 Repository Structure

```text
KamadhenuFarms/
├── prisma/
│   └── schema.prisma         # Relational database models (Order, Customer, Shipment, Shop, etc.)
├── public/
│   ├── assets/               # Product photography, honey pours, and farm imagery
│   ├── script.js             # Client-side bundle (DOM interactions, cart & checkout)
│   └── styles.css            # Luxury responsive styling & animation keyframes
├── src/
│   ├── app/
│   │   ├── admin/            # Admin portal (orders, recruitment, shops, analytics)
│   │   ├── api/
│   │   │   ├── admin/        # Protected admin routes (dispatch shipment, status update)
│   │   │   ├── checkout/     # Order creation (/create-order) & verification (/verify)
│   │   │   ├── customer/     # Customer session & orders API
│   │   │   ├── orders/       # Public order tracking & invoice endpoints
│   │   │   ├── payment/      # Cashfree webhook listeners & signature verification
│   │   │   └── shipping/     # Pincode delivery fee calculation
│   │   ├── careers/          # Sales recruitment application flow
│   │   ├── order-confirmation/ # Post-checkout success landing page
│   │   ├── track/            # Customer parcel tracking portal
│   │   ├── layout.tsx        # Global app layout & font configurations
│   │   └── page.tsx          # Homepage server component
│   └── lib/
│       ├── auth.ts           # Admin session & JWT validation
│       ├── cashfree.ts       # Cashfree API client & signature verification
│       ├── location.ts       # Bangalore pincode & Karnataka boundary detection
│       ├── orderNumber.ts    # Unique human-readable order number generator
│       ├── prisma.ts         # Global Prisma client singleton
│       ├── products.ts       # Authoritative product catalog & price matrix
│       └── shipping.ts       # Shipping fee calculation rules
├── index.html                # Core landing page template
├── package.json              # NPM dependencies and scripts
└── tailwind.config.js        # Design tokens & color extensions
```

* * *

## 🚀 Getting Started

### 1\. Prerequisites

-   **Node.js** (v18.17.0 or higher recommended)
-   **npm** or **yarn**
-   A **PostgreSQL** database (e.g. [Neon.tech](https://neon.tech/), Supabase, or local PostgreSQL)

### 2\. Clone the Repository

```bash
git clone https://github.com/PreethamGowda-B/KamadhenuFarms.git
cd KamadhenuFarms
```

### 3\. Install Dependencies

```bash
npm install
```

### 4\. Environment Variables Setup

Create a `.env` file in the root directory:

```env
# Database Connections (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

# App URL
NEXT_PUBLIC_APP_URL="https://www.kamadhenuhoneyfarms.in"

# Cashfree Payment Gateway Credentials
CASHFREE_CLIENT_ID="your_cashfree_client_id"
CASHFREE_CLIENT_SECRET="your_cashfree_client_secret"
CASHFREE_ENV="production" # or "sandbox" for development
```

### 5\. Generate Database Client & Run Migrations

```bash
npx prisma generate
npx prisma db push
```

### 6\. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

* * *

## 🔒 Security & Data Integrity

-   **Zero Client Price Trust:** All discounts, weight variant prices, and shipping charges are recomputed and validated server-side.
-   **Webhook Signature Verification:** Webhooks use cryptographic SHA-256 HMAC verification to prevent unauthorized order state manipulation.
-   **Protected Admin Routes:** Admin endpoints enforce cryptographic session tokens with role-based checks.
-   **Audit Logging:** Critical fulfillment actions (such as dispatching shipments or collecting COD cash) are recorded in the `AuditLog` table.

* * *

## 👨‍🌾 About the Farm

Kamadhenu Honey Farms is dedicated to preserving the ancient tradition of natural, ethical beekeeping. Located on pristine farmlands in Bangalore, our bees forage on wild nectar flowers, yielding 100% pure, unprocessed, and unpasteurized raw honey.

-   **Founder & Developer:** Preetham Gowda
-   **Official Website:** [https://www.kamadhenuhoneyfarms.in](https://www.kamadhenuhoneyfarms.in)
-   **Location:** Taverekere, Magadi Road, Bangalore, Karnataka, India

* * *

## 📄 License

This repository is maintained for Kamadhenu Honey Farms. All rights reserved.