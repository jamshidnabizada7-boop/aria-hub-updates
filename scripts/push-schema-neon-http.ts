/**
 * push-schema-neon-http.ts
 * Applies the full Prisma schema to Neon via HTTP (port 443).
 * Use when port 5432 is blocked by ISP.
 */
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';

// Load .env
const envFile = fs.readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=\r]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
}

const DATABASE_URL = envVars['DATABASE_URL'] || process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('❌ DATABASE_URL not found'); process.exit(1); }

const sql = neon(DATABASE_URL);

async function run() {
  console.log('🔧 Applying schema to Neon via HTTP...\n');

  const ddl = `
-- Language
CREATE TABLE IF NOT EXISTS "Language" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "nativeName" TEXT NOT NULL DEFAULT '',
  "direction" TEXT NOT NULL DEFAULT 'ltr', "isDefault" BOOLEAN NOT NULL DEFAULT false, "order" INTEGER NOT NULL DEFAULT 0,
  "flag" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Language_code_key" ON "Language"("code");

-- SiteSetting
CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "id" TEXT NOT NULL, "siteName" TEXT NOT NULL DEFAULT 'ARIA HUB', "tagline" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '', "logoUrl" TEXT, "logoDarkUrl" TEXT, "faviconUrl" TEXT, "appleIconUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#0A66C2', "secondaryColor" TEXT NOT NULL DEFAULT '#0EA5E9', "accentColor" TEXT NOT NULL DEFAULT '#22D3EE',
  "fontFamily" TEXT NOT NULL DEFAULT 'Geist', "email" TEXT, "phone" TEXT, "address" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD', "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi', "dateFormat" TEXT NOT NULL DEFAULT 'MMM dd, yyyy',
  "maintenanceMode" BOOLEAN NOT NULL DEFAULT false, "gaId" TEXT, "fbPixelId" TEXT, "customScripts" TEXT, "mapEmbed" TEXT,
  "socialPosition" TEXT NOT NULL DEFAULT 'left', "socialHideOnScroll" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- Section
CREATE TABLE IF NOT EXISTS "Section" (
  "id" TEXT NOT NULL, "key" TEXT NOT NULL, "title" TEXT NOT NULL DEFAULT '', "titleI18n" JSONB,
  "subtitle" TEXT, "subtitleI18n" JSONB, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0, "background" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Section_key_key" ON "Section"("key");

-- MenuItem
CREATE TABLE IF NOT EXISTS "MenuItem" (
  "id" TEXT NOT NULL, "label" TEXT NOT NULL, "labelI18n" JSONB, "url" TEXT, "icon" TEXT,
  "parentId" TEXT, "order" INTEGER NOT NULL DEFAULT 0, "openInNewTab" BOOLEAN NOT NULL DEFAULT false, "visible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MenuItem_parentId_idx" ON "MenuItem"("parentId");
CREATE INDEX IF NOT EXISTS "MenuItem_order_idx" ON "MenuItem"("order");
ALTER TABLE "MenuItem" DROP CONSTRAINT IF EXISTS "MenuItem_parentId_fkey";
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ServiceCategory
CREATE TABLE IF NOT EXISTS "ServiceCategory" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "slug" TEXT NOT NULL,
  "description" TEXT, "image" TEXT, "icon" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- Service
CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "titleI18n" JSONB, "slug" TEXT NOT NULL,
  "categoryId" TEXT, "excerpt" TEXT, "excerptI18n" JSONB, "description" TEXT, "descriptionI18n" JSONB,
  "icon" TEXT, "image" TEXT, "gallery" TEXT, "price" TEXT, "featured" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft', "sort" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Service_slug_key" ON "Service"("slug");
CREATE INDEX IF NOT EXISTS "Service_categoryId_idx" ON "Service"("categoryId");
CREATE INDEX IF NOT EXISTS "Service_featured_idx" ON "Service"("featured");
CREATE INDEX IF NOT EXISTS "Service_status_idx" ON "Service"("status");
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_categoryId_fkey";
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Visa
CREATE TABLE IF NOT EXISTS "Visa" (
  "id" TEXT NOT NULL, "country" TEXT NOT NULL, "countryI18n" JSONB, "countryCode" TEXT NOT NULL DEFAULT '',
  "visaType" TEXT NOT NULL, "visaTypeI18n" JSONB, "slug" TEXT NOT NULL, "description" TEXT, "descriptionI18n" JSONB,
  "eligibility" TEXT, "applicationProcess" TEXT, "duration" TEXT, "processingTime" TEXT, "fee" TEXT,
  "requirements" TEXT, "documents" TEXT, "image" TEXT, "featured" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft', "sort" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Visa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Visa_slug_key" ON "Visa"("slug");
CREATE INDEX IF NOT EXISTS "Visa_featured_idx" ON "Visa"("featured");
CREATE INDEX IF NOT EXISTS "Visa_status_idx" ON "Visa"("status");
CREATE INDEX IF NOT EXISTS "Visa_country_idx" ON "Visa"("country");

-- OpportunityCategory
CREATE TABLE IF NOT EXISTS "OpportunityCategory" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "slug" TEXT NOT NULL,
  "description" TEXT, "image" TEXT, "icon" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OpportunityCategory_slug_key" ON "OpportunityCategory"("slug");

-- Opportunity
CREATE TABLE IF NOT EXISTS "Opportunity" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "titleI18n" JSONB, "slug" TEXT NOT NULL,
  "categoryId" TEXT, "organization" TEXT, "country" TEXT, "deadline" TEXT, "description" TEXT, "descriptionI18n" JSONB,
  "eligibility" TEXT, "eligibilityI18n" JSONB, "benefits" TEXT, "benefitsI18n" JSONB, "requirements" TEXT,
  "website" TEXT, "applyUrl" TEXT, "image" TEXT, "featured" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft', "sort" INTEGER NOT NULL DEFAULT 0,
  "sourceUrl" TEXT, "contentHash" TEXT, "importStatus" TEXT, "importedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Opportunity_slug_key" ON "Opportunity"("slug");
CREATE INDEX IF NOT EXISTS "Opportunity_categoryId_idx" ON "Opportunity"("categoryId");
CREATE INDEX IF NOT EXISTS "Opportunity_featured_idx" ON "Opportunity"("featured");
CREATE INDEX IF NOT EXISTS "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX IF NOT EXISTS "Opportunity_sourceUrl_idx" ON "Opportunity"("sourceUrl");
CREATE INDEX IF NOT EXISTS "Opportunity_contentHash_idx" ON "Opportunity"("contentHash");
CREATE INDEX IF NOT EXISTS "Opportunity_importStatus_idx" ON "Opportunity"("importStatus");
ALTER TABLE "Opportunity" DROP CONSTRAINT IF EXISTS "Opportunity_categoryId_fkey";
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OpportunityCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ImportSource
CREATE TABLE IF NOT EXISTS "ImportSource" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "url" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'rss',
  "category" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true, "lastRunAt" TIMESTAMP(3), "cronSchedule" TEXT,
  "maxItems" INTEGER NOT NULL DEFAULT 20, "transform" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ImportSource_name_key" ON "ImportSource"("name");

-- ImportRun
CREATE TABLE IF NOT EXISTS "ImportRun" (
  "id" TEXT NOT NULL, "sourceId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
  "itemsFound" INTEGER NOT NULL DEFAULT 0, "itemsImported" INTEGER NOT NULL DEFAULT 0,
  "errors" TEXT, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ImportRun_sourceId_idx" ON "ImportRun"("sourceId");
CREATE INDEX IF NOT EXISTS "ImportRun_startedAt_idx" ON "ImportRun"("startedAt");
ALTER TABLE "ImportRun" DROP CONSTRAINT IF EXISTS "ImportRun_sourceId_fkey";
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GalleryAlbum
CREATE TABLE IF NOT EXISTS "GalleryAlbum" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT,
  "cover" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GalleryAlbum_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GalleryAlbum_slug_key" ON "GalleryAlbum"("slug");

-- GalleryItem
CREATE TABLE IF NOT EXISTS "GalleryItem" (
  "id" TEXT NOT NULL, "title" TEXT, "url" TEXT NOT NULL, "type" TEXT NOT NULL DEFAULT 'image',
  "albumId" TEXT, "category" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GalleryItem_albumId_idx" ON "GalleryItem"("albumId");
CREATE INDEX IF NOT EXISTS "GalleryItem_category_idx" ON "GalleryItem"("category");
ALTER TABLE "GalleryItem" DROP CONSTRAINT IF EXISTS "GalleryItem_albumId_fkey";
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "GalleryAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PaymentMethod
CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "slug" TEXT NOT NULL,
  "accountNumber" TEXT, "iban" TEXT, "accountTitle" TEXT, "description" TEXT, "descriptionI18n" JSONB,
  "instructions" TEXT, "instructionsI18n" JSONB, "logo" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMethod_slug_key" ON "PaymentMethod"("slug");
CREATE INDEX IF NOT EXISTS "PaymentMethod_status_idx" ON "PaymentMethod"("status");

-- Testimonial
CREATE TABLE IF NOT EXISTS "Testimonial" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "role" TEXT,
  "company" TEXT, "avatar" TEXT, "rating" INTEGER NOT NULL DEFAULT 5, "content" TEXT NOT NULL,
  "contentI18n" JSONB, "featured" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft', "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Testimonial_featured_idx" ON "Testimonial"("featured");
CREATE INDEX IF NOT EXISTS "Testimonial_status_idx" ON "Testimonial"("status");

-- Partner
CREATE TABLE IF NOT EXISTS "Partner" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "logo" TEXT, "website" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- Counter
CREATE TABLE IF NOT EXISTS "Counter" (
  "id" TEXT NOT NULL, "label" TEXT NOT NULL, "labelI18n" JSONB, "value" INTEGER NOT NULL DEFAULT 0,
  "suffix" TEXT, "icon" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- Faq
CREATE TABLE IF NOT EXISTS "Faq" (
  "id" TEXT NOT NULL, "question" TEXT NOT NULL, "questionI18n" JSONB, "answer" TEXT NOT NULL, "answerI18n" JSONB,
  "category" TEXT, "order" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- NewsCategory
CREATE TABLE IF NOT EXISTS "NewsCategory" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "slug" TEXT NOT NULL, "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NewsCategory_slug_key" ON "NewsCategory"("slug");

-- News
CREATE TABLE IF NOT EXISTS "News" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "titleI18n" JSONB, "slug" TEXT NOT NULL,
  "excerpt" TEXT, "excerptI18n" JSONB, "content" TEXT, "contentI18n" JSONB,
  "image" TEXT, "categoryId" TEXT, "author" TEXT, "featured" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'draft', "tags" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "News_slug_key" ON "News"("slug");
CREATE INDEX IF NOT EXISTS "News_featured_idx" ON "News"("featured");
CREATE INDEX IF NOT EXISTS "News_status_idx" ON "News"("status");
CREATE INDEX IF NOT EXISTS "News_categoryId_idx" ON "News"("categoryId");
ALTER TABLE "News" DROP CONSTRAINT IF EXISTS "News_categoryId_fkey";
ALTER TABLE "News" ADD CONSTRAINT "News_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NewsCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SocialLink
CREATE TABLE IF NOT EXISTS "SocialLink" (
  "id" TEXT NOT NULL, "platform" TEXT NOT NULL, "label" TEXT NOT NULL, "url" TEXT NOT NULL,
  "icon" TEXT, "color" TEXT, "order" INTEGER NOT NULL DEFAULT 0, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- FooterLink
CREATE TABLE IF NOT EXISTS "FooterLink" (
  "id" TEXT NOT NULL, "column" TEXT NOT NULL, "label" TEXT NOT NULL, "labelI18n" JSONB, "url" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FooterLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FooterLink_column_idx" ON "FooterLink"("column");

-- Department
CREATE TABLE IF NOT EXISTS "Department" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "email" TEXT, "phone" TEXT,
  "description" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- Branch
CREATE TABLE IF NOT EXISTS "Branch" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "address" TEXT, "addressI18n" JSONB,
  "phone" TEXT, "email" TEXT, "hours" TEXT, "hoursI18n" JSONB, "isMain" BOOLEAN NOT NULL DEFAULT false,
  "lat" DOUBLE PRECISION, "lng" DOUBLE PRECISION, "mapUrl" TEXT, "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- ProcessStep
CREATE TABLE IF NOT EXISTS "ProcessStep" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "titleI18n" JSONB, "description" TEXT NOT NULL, "descriptionI18n" JSONB,
  "icon" TEXT, "order" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProcessStep_status_idx" ON "ProcessStep"("status");
CREATE INDEX IF NOT EXISTS "ProcessStep_order_idx" ON "ProcessStep"("order");

-- PricingPackage
CREATE TABLE IF NOT EXISTS "PricingPackage" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "slug" TEXT NOT NULL,
  "price" TEXT NOT NULL, "period" TEXT NOT NULL DEFAULT 'one-time', "description" TEXT, "descriptionI18n" JSONB,
  "features" TEXT, "featuresI18n" JSONB, "icon" TEXT, "featured" BOOLEAN NOT NULL DEFAULT false, "badge" TEXT,
  "ctaLabel" TEXT NOT NULL DEFAULT 'Get Started', "ctaUrl" TEXT NOT NULL DEFAULT '#contact',
  "order" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingPackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PricingPackage_slug_key" ON "PricingPackage"("slug");
CREATE INDEX IF NOT EXISTS "PricingPackage_status_idx" ON "PricingPackage"("status");
CREATE INDEX IF NOT EXISTS "PricingPackage_featured_idx" ON "PricingPackage"("featured");

-- TeamMember
CREATE TABLE IF NOT EXISTS "TeamMember" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "nameI18n" JSONB, "role" TEXT NOT NULL, "roleI18n" JSONB,
  "bio" TEXT, "bioI18n" JSONB, "photo" TEXT, "email" TEXT, "linkedin" TEXT, "twitter" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0, "featured" BOOLEAN NOT NULL DEFAULT false, "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TeamMember_status_idx" ON "TeamMember"("status");
CREATE INDEX IF NOT EXISTS "TeamMember_featured_idx" ON "TeamMember"("featured");

-- ComparisonRow
CREATE TABLE IF NOT EXISTS "ComparisonRow" (
  "id" TEXT NOT NULL, "feature" TEXT NOT NULL, "ariaValue" TEXT NOT NULL DEFAULT '✓', "othersValue" TEXT NOT NULL DEFAULT '—',
  "order" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComparisonRow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ComparisonRow_status_idx" ON "ComparisonRow"("status");

-- CtaBanner
CREATE TABLE IF NOT EXISTS "CtaBanner" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "titleI18n" JSONB, "subtitle" TEXT, "subtitleI18n" JSONB,
  "buttonText" TEXT NOT NULL DEFAULT 'Get Started', "buttonTextI18n" JSONB,
  "buttonUrl" TEXT NOT NULL DEFAULT '#contact', "secondaryText" TEXT,
  "accent" TEXT NOT NULL DEFAULT 'primary', "order" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CtaBanner_pkey" PRIMARY KEY ("id")
);

-- Advertisement
CREATE TABLE IF NOT EXISTS "Advertisement" (
  "id" TEXT NOT NULL, "title" TEXT, "image" TEXT NOT NULL, "link" TEXT, "placement" TEXT NOT NULL DEFAULT 'sidebar',
  "status" TEXT NOT NULL DEFAULT 'active', "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Advertisement_status_idx" ON "Advertisement"("status");

-- Subscriber
CREATE TABLE IF NOT EXISTS "Subscriber" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "name" TEXT, "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Subscriber_email_key" ON "Subscriber"("email");

-- AdminUser
CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "password" TEXT NOT NULL, "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_email_key" ON "AdminUser"("email");

-- AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL, "userId" TEXT, "action" TEXT NOT NULL, "entity" TEXT NOT NULL,
  "entityId" TEXT, "before" JSONB, "after" JSONB, "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Visit
CREATE TABLE IF NOT EXISTS "Visit" (
  "id" TEXT NOT NULL, "path" TEXT NOT NULL, "referrer" TEXT, "ua" TEXT, "ip" TEXT, "country" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Visit_path_idx" ON "Visit"("path");
CREATE INDEX IF NOT EXISTS "Visit_createdAt_idx" ON "Visit"("createdAt");

-- _prisma_migrations (needed by prisma)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL, "checksum" VARCHAR(64) NOT NULL, "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL, "logs" TEXT, "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);
`;

  // Split by semicolons and run each statement
  const statements = ddl.split(';').map(s => s.trim()).filter(s => s.length > 10);
  let ok = 0, failed = 0;
  for (const stmt of statements) {
    try {
      await sql.query(stmt + ';');
      ok++;
    } catch (e: any) {
      // Ignore "already exists" errors
      if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        ok++;
      } else {
        console.warn(`  ⚠ ${e.message?.split('\n')[0]}`);
        failed++;
      }
    }
  }
  console.log(`✅ Schema applied: ${ok} statements OK, ${failed} warnings`);
}

run().catch(e => { console.error('❌', e?.message || e); process.exit(1); });
