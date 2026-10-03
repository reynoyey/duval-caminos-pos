-- ============================================================================
--  DUVAL CAMINOS COFFEE — ENTERPRISE DATABASE SCHEMA (POSTGRESQL / SUPABASE)
--  All monetary values are stored in Indonesian Rupiah (INTEGER) to eliminate
--  floating-point rounding inaccuracies.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  1. EXTENSIONS & ENUMS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QRIS', 'DEBIT_EDC');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "QrisMode" AS ENUM ('DYNAMIC', 'STATIC');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('NONE', 'PERCENT', 'AMOUNT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SelectionType" AS ENUM ('SINGLE', 'MULTIPLE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
--  2. TABLES
-- ----------------------------------------------------------------------------

-- Shifts
CREATE TABLE IF NOT EXISTS "Shift" (
  "id" TEXT PRIMARY KEY DEFAULT concat('shift_', uuid_generate_v4()),
  "cashierName" TEXT NOT NULL,
  "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
  "openedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "closedAt" TIMESTAMPTZ,
  "openingCash" INTEGER NOT NULL DEFAULT 300000,
  "expectedCash" INTEGER,
  "closingCashCounted" INTEGER,
  "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_shift_status" ON "Shift"("status");
CREATE INDEX IF NOT EXISTS "idx_shift_opened_at" ON "Shift"("openedAt");

-- Categories
CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT PRIMARY KEY DEFAULT concat('cat_', uuid_generate_v4()),
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY DEFAULT concat('prd_', uuid_generate_v4()),
  "sku" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "basePrice" INTEGER NOT NULL,
  "isBeverage" BOOLEAN NOT NULL DEFAULT true,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "tag" TEXT,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_product_category" ON "Product"("categoryId");

-- Modifier Groups
CREATE TABLE IF NOT EXISTS "ModifierGroup" (
  "id" TEXT PRIMARY KEY DEFAULT concat('grp_', uuid_generate_v4()),
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "selectionType" "SelectionType" NOT NULL DEFAULT 'SINGLE',
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "minSelect" INTEGER NOT NULL DEFAULT 0,
  "maxSelect" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- Modifier Options
CREATE TABLE IF NOT EXISTS "ModifierOption" (
  "id" TEXT PRIMARY KEY DEFAULT concat('opt_', uuid_generate_v4()),
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "priceDelta" INTEGER NOT NULL DEFAULT 0,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "groupId" TEXT NOT NULL REFERENCES "ModifierGroup"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_modopt_group" ON "ModifierOption"("groupId");

-- ProductModifierGroups
CREATE TABLE IF NOT EXISTS "ProductModifierGroup" (
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "groupId" TEXT NOT NULL REFERENCES "ModifierGroup"("id") ON DELETE CASCADE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("productId", "groupId")
);

-- Orders
CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT PRIMARY KEY DEFAULT concat('ord_', uuid_generate_v4()),
  "orderNumber" TEXT UNIQUE NOT NULL,
  "queueNumber" INTEGER NOT NULL,
  "orderType" "OrderType" NOT NULL,
  "customerName" TEXT NOT NULL,
  "tableNumber" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PROCESSING',
  "subtotal" INTEGER NOT NULL,
  "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
  "discountValue" INTEGER NOT NULL DEFAULT 0,
  "discountCode" TEXT,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "taxRate" INTEGER NOT NULL DEFAULT 10,
  "taxAmount" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "shiftId" TEXT NOT NULL REFERENCES "Shift"("id") ON DELETE RESTRICT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_order_shift" ON "Order"("shiftId");
CREATE INDEX IF NOT EXISTS "idx_order_status" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "idx_order_created_at" ON "Order"("createdAt");

-- Order Items
CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT PRIMARY KEY DEFAULT concat('oit_', uuid_generate_v4()),
  "productName" TEXT NOT NULL,
  "categoryName" TEXT NOT NULL,
  "isBeverage" BOOLEAN NOT NULL DEFAULT true,
  "basePrice" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL,
  "note" TEXT,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_orderitem_order" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "idx_orderitem_product" ON "OrderItem"("productId");

-- Order Item Modifiers (Historical snapshot for immutable financial audits)
CREATE TABLE IF NOT EXISTS "OrderItemModifier" (
  "id" TEXT PRIMARY KEY DEFAULT concat('oim_', uuid_generate_v4()),
  "groupCode" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "optionCode" TEXT NOT NULL,
  "optionName" TEXT NOT NULL,
  "priceDelta" INTEGER NOT NULL,
  "orderItemId" TEXT NOT NULL REFERENCES "OrderItem"("id") ON DELETE CASCADE,
  "modifierOptionId" TEXT REFERENCES "ModifierOption"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_oim_orderitem" ON "OrderItemModifier"("orderItemId");

-- Payments
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY DEFAULT concat('pay_', uuid_generate_v4()),
  "method" "PaymentMethod" NOT NULL,
  "amount" INTEGER NOT NULL,
  "tendered" INTEGER NOT NULL,
  "change" INTEGER NOT NULL DEFAULT 0,
  "qrisMode" "QrisMode",
  "reference" TEXT,
  "paidAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_payment_order" ON "Payment"("orderId");
CREATE INDEX IF NOT EXISTS "idx_payment_method" ON "Payment"("method");

-- ----------------------------------------------------------------------------
--  3. SUPABASE REALTIME CONFIGURATION
--  Publishes Order updates across WebSockets to Cashier, Barista, and TV
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "Order";
EXCEPTION WHEN others THEN null; END $$;

-- ----------------------------------------------------------------------------
--  4. ROW-LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE "Shift" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModifierGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModifierOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductModifierGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItemModifier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Anonymous / Authenticated POS Terminal Policies (Full counter operational access)
CREATE POLICY "Public Read Catalog" ON "Category" FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON "Product" FOR SELECT USING (true);
CREATE POLICY "Public Read Modifier Groups" ON "ModifierGroup" FOR SELECT USING (true);
CREATE POLICY "Public Read Modifier Options" ON "ModifierOption" FOR SELECT USING (true);
CREATE POLICY "Public Read Product Modifier Groups" ON "ProductModifierGroup" FOR SELECT USING (true);

CREATE POLICY "Public Shift Operations" ON "Shift" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Order Operations" ON "Order" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Order Item Operations" ON "OrderItem" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Order Item Modifier Operations" ON "OrderItemModifier" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Payment Operations" ON "Payment" FOR ALL USING (true) WITH CHECK (true);
