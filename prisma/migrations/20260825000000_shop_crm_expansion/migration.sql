-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES_EXECUTIVE', 'EMPLOYEE', 'CANDIDATE');

-- DropIndex
DROP INDEX IF EXISTS "Shop_assignedSalesExecutiveId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Shop_contactNumber_idx";

-- DropIndex
DROP INDEX IF EXISTS "Shop_lastOrderDate_idx";

-- DropIndex
DROP INDEX IF EXISTS "Shop_shopNo_key";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'CANDIDATE';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN IF NOT EXISTS "actualAvgReorderIntervalDays" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "agreedPaymentDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "creditLimit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "creditPeriod" TEXT,
ADD COLUMN IF NOT EXISTS "district" TEXT,
ADD COLUMN IF NOT EXISTS "estimatedMonthlyKg" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS "estimatedReorderCycleDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "frontImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "interiorImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "mapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "mobile" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "nextReorderDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "otherImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "outstandingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ownerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'PAYMENT_AT_DELIVERY',
ADD COLUMN IF NOT EXISTS "pincode" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "potential" TEXT NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS "responseStatus" TEXT NOT NULL DEFAULT 'INTERESTED',
ADD COLUMN IF NOT EXISTS "salespersonId" TEXT,
ADD COLUMN IF NOT EXISTS "salespersonSnapshotMobile" TEXT,
ADD COLUMN IF NOT EXISTS "salespersonSnapshotName" TEXT,
ADD COLUMN IF NOT EXISTS "shopCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "shopType" TEXT NOT NULL DEFAULT 'Grocery Store',
ADD COLUMN IF NOT EXISTS "totalBilledAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalPaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

ALTER TABLE "Shop" ALTER COLUMN "shopNo" DROP NOT NULL;
ALTER TABLE "Shop" ALTER COLUMN "contactPerson" DROP NOT NULL;
ALTER TABLE "Shop" ALTER COLUMN "contactNumber" DROP NOT NULL;
ALTER TABLE "Shop" ALTER COLUMN "state" SET DEFAULT 'Karnataka';
ALTER TABLE "Shop" ALTER COLUMN "pinCode" DROP NOT NULL;

-- Backfill shopCode, ownerName, mobile, pincode from existing columns if empty
UPDATE "Shop" SET "shopCode" = COALESCE("shopNo", 'KHF-SHOP-' || LPAD(id::text, 6, '0')) WHERE "shopCode" = '' OR "shopCode" IS NULL;
UPDATE "Shop" SET "ownerName" = COALESCE("contactPerson", 'Unknown Owner') WHERE "ownerName" = '' OR "ownerName" IS NULL;
UPDATE "Shop" SET "mobile" = COALESCE("contactNumber", '0000000000') WHERE "mobile" = '' OR "mobile" IS NULL;
UPDATE "Shop" SET "pincode" = COALESCE("pinCode", '560001') WHERE "pincode" = '' OR "pincode" IS NULL;

-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'PAYMENT_AT_DELIVERY',
ADD COLUMN IF NOT EXISTS "salespersonId" TEXT,
ADD COLUMN IF NOT EXISTS "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "ShopOrder" ALTER COLUMN "product" DROP NOT NULL;
ALTER TABLE "ShopOrder" ALTER COLUMN "quantity" DROP NOT NULL;
ALTER TABLE "ShopOrder" ALTER COLUMN "quantity" SET DEFAULT 0;
ALTER TABLE "ShopOrder" ALTER COLUMN "kg" DROP NOT NULL;
ALTER TABLE "ShopOrder" ALTER COLUMN "kg" SET DEFAULT 0;
ALTER TABLE "ShopOrder" ALTER COLUMN "orderValue" DROP NOT NULL;
ALTER TABLE "ShopOrder" ALTER COLUMN "orderValue" SET DEFAULT 0;
ALTER TABLE "ShopOrder" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopSequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSequence_pkey" PRIMARY KEY ("id")
);

-- Seed initial sequence if not exists
INSERT INTO "ShopSequence" ("id", "lastSeq", "updatedAt") 
VALUES (1, (SELECT COALESCE(COUNT(*), 0) FROM "Shop"), CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopRequirement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "interested" BOOLEAN NOT NULL DEFAULT true,
    "firstOrderQuantity" INTEGER NOT NULL DEFAULT 0,
    "monthlyQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderCycleDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopPayment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopVisit" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "salespersonId" TEXT,
    "salespersonName" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" TEXT NOT NULL DEFAULT 'ROUTINE_FOLLOW_UP',
    "discussion" TEXT NOT NULL,
    "orderTaken" BOOLEAN NOT NULL DEFAULT false,
    "paymentCollected" DOUBLE PRECISION DEFAULT 0,
    "nextFollowUpDate" TIMESTAMP(3),
    "imageUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopReminder" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "snoozedUntil" TIMESTAMP(3),
    "contactedAt" TIMESTAMP(3),
    "contactedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopActivity" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NEW_SHOP',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopRequirement_shopId_idx" ON "ShopRequirement"("shopId");
CREATE INDEX IF NOT EXISTS "ShopOrderItem_orderId_idx" ON "ShopOrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "ShopPayment_shopId_idx" ON "ShopPayment"("shopId");
CREATE INDEX IF NOT EXISTS "ShopPayment_orderId_idx" ON "ShopPayment"("orderId");
CREATE INDEX IF NOT EXISTS "ShopVisit_shopId_idx" ON "ShopVisit"("shopId");
CREATE INDEX IF NOT EXISTS "ShopVisit_salespersonId_idx" ON "ShopVisit"("salespersonId");
CREATE INDEX IF NOT EXISTS "ShopVisit_visitDate_idx" ON "ShopVisit"("visitDate");
CREATE INDEX IF NOT EXISTS "ShopReminder_shopId_idx" ON "ShopReminder"("shopId");
CREATE INDEX IF NOT EXISTS "ShopReminder_dueDate_idx" ON "ShopReminder"("dueDate");
CREATE INDEX IF NOT EXISTS "ShopReminder_status_idx" ON "ShopReminder"("status");
CREATE INDEX IF NOT EXISTS "ShopActivity_shopId_idx" ON "ShopActivity"("shopId");
CREATE INDEX IF NOT EXISTS "ShopActivity_createdAt_idx" ON "ShopActivity"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminNotification_isRead_idx" ON "AdminNotification"("isRead");
CREATE INDEX IF NOT EXISTS "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");
CREATE INDEX IF NOT EXISTS "Application_role_idx" ON "Application"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "Shop_shopCode_key" ON "Shop"("shopCode");
CREATE INDEX IF NOT EXISTS "Shop_mobile_idx" ON "Shop"("mobile");
CREATE INDEX IF NOT EXISTS "Shop_salespersonId_idx" ON "Shop"("salespersonId");
CREATE INDEX IF NOT EXISTS "Shop_nextReorderDate_idx" ON "Shop"("nextReorderDate");

-- Foreign Keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Shop_salespersonId_fkey') THEN
    ALTER TABLE "Shop" ADD CONSTRAINT "Shop_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopRequirement_shopId_fkey') THEN
    ALTER TABLE "ShopRequirement" ADD CONSTRAINT "ShopRequirement_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopOrderItem_orderId_fkey') THEN
    ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopPayment_shopId_fkey') THEN
    ALTER TABLE "ShopPayment" ADD CONSTRAINT "ShopPayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopPayment_orderId_fkey') THEN
    ALTER TABLE "ShopPayment" ADD CONSTRAINT "ShopPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopVisit_shopId_fkey') THEN
    ALTER TABLE "ShopVisit" ADD CONSTRAINT "ShopVisit_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopVisit_salespersonId_fkey') THEN
    ALTER TABLE "ShopVisit" ADD CONSTRAINT "ShopVisit_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopReminder_shopId_fkey') THEN
    ALTER TABLE "ShopReminder" ADD CONSTRAINT "ShopReminder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShopActivity_shopId_fkey') THEN
    ALTER TABLE "ShopActivity" ADD CONSTRAINT "ShopActivity_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
