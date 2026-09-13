-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('published', 'draft', 'expired', 'archived');

-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('running', 'pending', 'ok', 'partial', 'error', 'stopped');

-- CreateEnum
CREATE TYPE "MonetizationOrderStatus" AS ENUM ('requested', 'payment_claimed', 'paid', 'active', 'delivered', 'declined');

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'ARIA HUB',
    "siteNameI18n" JSONB,
    "tagline" TEXT NOT NULL DEFAULT 'Professional Business Services Platform',
    "taglineI18n" JSONB,
    "description" TEXT NOT NULL DEFAULT 'Premium business, visa and opportunity services.',
    "descriptionI18n" JSONB,
    "logoUrl" TEXT,
    "logoDarkUrl" TEXT,
    "faviconUrl" TEXT,
    "appleIconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0A66C2',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0EA5E9',
    "accentColor" TEXT NOT NULL DEFAULT '#22D3EE',
    "fontFamily" TEXT NOT NULL DEFAULT 'Geist',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "addressI18n" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "dateFormat" TEXT NOT NULL DEFAULT 'MMM dd, yyyy',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "gaId" TEXT,
    "fbPixelId" TEXT,
    "customScripts" TEXT,
    "mapEmbed" TEXT,
    "socialPosition" TEXT NOT NULL DEFAULT 'left',
    "socialHideOnScroll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'ltr',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "flag" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "translations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelI18n" JSONB,
    "url" TEXT,
    "parentId" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "pageSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "excerptI18n" JSONB,
    "description" TEXT NOT NULL,
    "descriptionI18n" JSONB,
    "icon" TEXT,
    "image" TEXT,
    "gallery" TEXT,
    "video" TEXT,
    "price" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visa" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryI18n" JSONB,
    "countryCode" TEXT,
    "visaType" TEXT NOT NULL,
    "visaTypeI18n" JSONB,
    "slug" TEXT NOT NULL,
    "duration" TEXT,
    "processingTime" TEXT,
    "fee" TEXT,
    "requirements" TEXT,
    "requirementsI18n" JSONB,
    "documents" TEXT,
    "documentsI18n" JSONB,
    "eligibility" TEXT,
    "eligibilityI18n" JSONB,
    "embassyDetails" TEXT,
    "applicationProcess" TEXT,
    "applicationProcessI18n" JSONB,
    "faqs" TEXT,
    "image" TEXT,
    "gallery" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "description" TEXT,
    "descriptionI18n" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "slug" TEXT NOT NULL,
    "organization" TEXT,
    "country" TEXT,
    "deadline" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "descriptionI18n" JSONB,
    "eligibility" TEXT,
    "eligibilityI18n" JSONB,
    "benefits" TEXT,
    "benefitsI18n" JSONB,
    "website" TEXT,
    "applyUrl" TEXT,
    "image" TEXT,
    "attachments" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'published',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "originalUrl" TEXT,
    "importedAt" TIMESTAMP(3),
    "lastChecked" TIMESTAMP(3),
    "contentHash" TEXT,
    "aiSummary" TEXT,
    "aiSummaryI18n" JSONB,
    "jobType" TEXT,
    "jobTypeI18n" JSONB,
    "salary" TEXT,
    "salaryI18n" JSONB,
    "educationReq" TEXT,
    "educationReqI18n" JSONB,
    "experience" TEXT,
    "experienceI18n" JSONB,
    "responsibilities" TEXT,
    "responsibilitiesI18n" JSONB,
    "requirements" TEXT,
    "requirementsI18n" JSONB,
    "guidelines" TEXT,
    "guidelinesI18n" JSONB,
    "tags" TEXT,
    "tagsI18n" JSONB,
    "seoTitleI18n" JSONB,
    "seoDescriptionI18n" JSONB,
    "seoKeywords" TEXT,
    "seoKeywordsI18n" JSONB,
    "ogTitle" TEXT,
    "ogTitleI18n" JSONB,
    "ogDescription" TEXT,
    "ogDescriptionI18n" JSONB,
    "canonicalUrl" TEXT,
    "importStatus" TEXT,
    "translationStatus" TEXT,
    "language" TEXT,
    "logoUrl" TEXT,
    "publishedDate" TEXT,
    "extractedData" JSONB,
    "extractedDataI18n" JSONB,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scraperKey" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoPublish" BOOLEAN NOT NULL DEFAULT false,
    "scheduleMinutes" INTEGER NOT NULL DEFAULT 60,
    "defaultCategory" TEXT,
    "config" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "lastRunStats" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "ImportRunStatus" NOT NULL DEFAULT 'running',
    "found" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "processingMs" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryAlbum" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "caption" TEXT,
    "captionI18n" JSONB,
    "category" TEXT,
    "albumId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "qrCode" TEXT,
    "accountNumber" TEXT,
    "iban" TEXT,
    "accountTitle" TEXT,
    "description" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "role" TEXT,
    "roleI18n" JSONB,
    "company" TEXT,
    "companyI18n" JSONB,
    "avatar" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "content" TEXT NOT NULL,
    "contentI18n" JSONB,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelI18n" JSONB,
    "value" INTEGER NOT NULL,
    "suffix" TEXT,
    "suffixI18n" JSONB,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionI18n" JSONB,
    "answer" TEXT NOT NULL,
    "answerI18n" JSONB,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "excerptI18n" JSONB,
    "content" TEXT NOT NULL,
    "contentI18n" JSONB,
    "image" TEXT,
    "author" TEXT,
    "tags" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLink" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FooterLink" (
    "id" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelI18n" JSONB,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhyChooseUsFeature" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "description" TEXT NOT NULL,
    "descriptionI18n" JSONB,
    "icon" TEXT NOT NULL DEFAULT 'Check',
    "color" TEXT NOT NULL DEFAULT 'from-primary to-chart-2',
    "glow" TEXT NOT NULL DEFAULT 'bg-primary/20',
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhyChooseUsFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "department" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "email" TEXT,
    "phone" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "hours" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "mapEmbed" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "video" TEXT,
    "website" TEXT,
    "package" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunitySubmission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "categorySlug" TEXT NOT NULL,
    "country" TEXT,
    "deadline" TIMESTAMP(3),
    "applyUrl" TEXT,
    "applyEmail" TEXT,
    "description" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "sourceIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submitterType" TEXT NOT NULL DEFAULT 'community',
    "jobType" TEXT,
    "salaryRange" TEXT,
    "location" TEXT,
    "companyWebsite" TEXT,
    "referenceCode" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "publishedSlug" TEXT,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "OpportunitySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetizationOrder" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "status" "MonetizationOrderStatus" NOT NULL DEFAULT 'requested',
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "amountAfn" DOUBLE PRECISION NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerOrg" TEXT,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "buyerLang" TEXT NOT NULL DEFAULT 'fa',
    "message" TEXT,
    "opportunityId" TEXT,
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "featuredUntil" TIMESTAMP(3),
    "adminNote" TEXT,
    "sourceIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonetizationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'fa',
    "categorySlug" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmToken" TEXT,
    "sourceIp" TEXT,
    "lastDigestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "avatar" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "browser" TEXT,
    "device" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessStep" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "description" TEXT NOT NULL,
    "descriptionI18n" JSONB,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "slug" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'one-time',
    "description" TEXT,
    "descriptionI18n" JSONB,
    "features" TEXT,
    "featuresI18n" JSONB,
    "icon" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Get Started',
    "ctaUrl" TEXT NOT NULL DEFAULT '#contact',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "role" TEXT NOT NULL,
    "roleI18n" JSONB,
    "bio" TEXT,
    "bioI18n" JSONB,
    "photo" TEXT,
    "email" TEXT,
    "linkedin" TEXT,
    "twitter" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonRow" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "featureI18n" JSONB,
    "ariaValue" TEXT NOT NULL DEFAULT '✓',
    "ariaValueI18n" JSONB,
    "othersValue" TEXT NOT NULL DEFAULT '—',
    "othersValueI18n" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComparisonRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CtaBanner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "subtitle" TEXT,
    "subtitleI18n" JSONB,
    "buttonText" TEXT NOT NULL DEFAULT 'Get Started',
    "buttonTextI18n" JSONB,
    "buttonUrl" TEXT NOT NULL DEFAULT '#contact',
    "secondaryText" TEXT,
    "secondaryTextI18n" JSONB,
    "accent" TEXT NOT NULL DEFAULT 'primary',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CtaBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "DocumentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "excerptI18n" JSONB,
    "content" TEXT,
    "contentI18n" JSONB,
    "previewUrl" TEXT,
    "fileDocxUrl" TEXT,
    "filePdfUrl" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "filters" JSONB,
    "requiredFields" JSONB,
    "requiredFieldsI18n" JSONB,
    "commonMistakes" JSONB,
    "commonMistakesI18n" JSONB,
    "writingTips" JSONB,
    "writingTipsI18n" JSONB,
    "successRate" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateRating" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateBookmark" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "descriptionI18n" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionI18n" JSONB,
    "categoryId" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "filters" JSONB,
    "sampleAnswer" TEXT,
    "sampleAnswerI18n" JSONB,
    "strongExample" TEXT,
    "strongExampleI18n" JSONB,
    "weakExample" TEXT,
    "weakExampleI18n" JSONB,
    "tips" TEXT,
    "tipsI18n" JSONB,
    "commonMistakes" JSONB,
    "commonMistakesI18n" JSONB,
    "followUpQuestions" JSONB,
    "followUpQuestionsI18n" JSONB,
    "expectedDuration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'practice',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "questions" JSONB,
    "responses" JSONB,
    "score" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewExperience" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "studentName" TEXT,
    "studentNameI18n" JSONB,
    "scholarshipName" TEXT,
    "university" TEXT,
    "country" TEXT,
    "degree" TEXT,
    "content" TEXT NOT NULL,
    "contentI18n" JSONB,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaCountry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "code" TEXT NOT NULL,
    "processingTime" TEXT,
    "costEstimate" TEXT,
    "embassyInfo" TEXT,
    "embassyInfoI18n" JSONB,
    "successRate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "descriptionI18n" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaRejection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "description" TEXT NOT NULL,
    "descriptionI18n" JSONB,
    "mitigation" JSONB,
    "mitigationI18n" JSONB,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaRejection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionI18n" JSONB,
    "countryId" TEXT,
    "categoryId" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "bestAnswer" TEXT,
    "bestAnswerI18n" JSONB,
    "wrongAnswer" TEXT,
    "wrongAnswerI18n" JSONB,
    "aiExplanation" TEXT,
    "aiExplanationI18n" JSONB,
    "confidenceTips" TEXT,
    "confidenceTipsI18n" JSONB,
    "followUpQuestions" JSONB,
    "followUpQuestionsI18n" JSONB,
    "status" TEXT NOT NULL DEFAULT 'published',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameI18n" JSONB,
    "description" TEXT,
    "descriptionI18n" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "countryId" TEXT,
    "categoryId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaExperience" (
    "id" TEXT NOT NULL,
    "studentName" TEXT,
    "studentNameI18n" JSONB,
    "countryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "content" TEXT NOT NULL,
    "contentI18n" JSONB,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "publishedStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuccessStory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "storyType" TEXT NOT NULL DEFAULT 'other',
    "country" TEXT NOT NULL,
    "program" TEXT,
    "visaType" TEXT,
    "year" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentI18n" JSONB,
    "authorAlias" TEXT,
    "contactEmail" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialIdea" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "textI18n" JSONB,
    "note" TEXT,
    "noteI18n" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishChannel" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "lastPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostQueue" (
    "id" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "templateType" TEXT NOT NULL,
    "contentRef" TEXT,
    "contentJson" JSONB NOT NULL,
    "captionJson" JSONB NOT NULL,
    "imageStatus" TEXT NOT NULL DEFAULT 'none',
    "imagePaths" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "results" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPostQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "stats" JSONB,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "state" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleI18n" JSONB,
    "content" TEXT NOT NULL,
    "contentI18n" JSONB,
    "status" TEXT NOT NULL DEFAULT 'published',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");

-- CreateIndex
CREATE INDEX "MenuItem_parentId_idx" ON "MenuItem"("parentId");

-- CreateIndex
CREATE INDEX "MenuItem_order_idx" ON "MenuItem"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Section_key_key" ON "Section"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE INDEX "Service_featured_idx" ON "Service"("featured");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Visa_slug_key" ON "Visa"("slug");

-- CreateIndex
CREATE INDEX "Visa_featured_idx" ON "Visa"("featured");

-- CreateIndex
CREATE INDEX "Visa_status_idx" ON "Visa"("status");

-- CreateIndex
CREATE INDEX "Visa_country_idx" ON "Visa"("country");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityCategory_slug_key" ON "OpportunityCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_sourceUrl_key" ON "Opportunity"("sourceUrl");

-- CreateIndex
CREATE INDEX "Opportunity_categoryId_idx" ON "Opportunity"("categoryId");

-- CreateIndex
CREATE INDEX "Opportunity_featured_idx" ON "Opportunity"("featured");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_sourceUrl_idx" ON "Opportunity"("sourceUrl");

-- CreateIndex
CREATE INDEX "Opportunity_contentHash_idx" ON "Opportunity"("contentHash");

-- CreateIndex
CREATE INDEX "Opportunity_importStatus_idx" ON "Opportunity"("importStatus");

-- CreateIndex
CREATE INDEX "Opportunity_deadline_idx" ON "Opportunity"("deadline");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportSource_name_key" ON "ImportSource"("name");

-- CreateIndex
CREATE INDEX "ImportRun_sourceId_idx" ON "ImportRun"("sourceId");

-- CreateIndex
CREATE INDEX "ImportRun_startedAt_idx" ON "ImportRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryAlbum_slug_key" ON "GalleryAlbum"("slug");

-- CreateIndex
CREATE INDEX "GalleryItem_albumId_idx" ON "GalleryItem"("albumId");

-- CreateIndex
CREATE INDEX "GalleryItem_category_idx" ON "GalleryItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_slug_key" ON "PaymentMethod"("slug");

-- CreateIndex
CREATE INDEX "PaymentMethod_status_idx" ON "PaymentMethod"("status");

-- CreateIndex
CREATE INDEX "Testimonial_featured_idx" ON "Testimonial"("featured");

-- CreateIndex
CREATE INDEX "Testimonial_status_idx" ON "Testimonial"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NewsCategory_slug_key" ON "NewsCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");

-- CreateIndex
CREATE INDEX "News_featured_idx" ON "News"("featured");

-- CreateIndex
CREATE INDEX "News_status_idx" ON "News"("status");

-- CreateIndex
CREATE INDEX "News_categoryId_idx" ON "News"("categoryId");

-- CreateIndex
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");

-- CreateIndex
CREATE INDEX "FooterLink_column_idx" ON "FooterLink"("column");

-- CreateIndex
CREATE UNIQUE INDEX "WhyChooseUsFeature_key_key" ON "WhyChooseUsFeature"("key");

-- CreateIndex
CREATE INDEX "Advertisement_status_idx" ON "Advertisement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySubmission_referenceCode_key" ON "OpportunitySubmission"("referenceCode");

-- CreateIndex
CREATE INDEX "OpportunitySubmission_status_createdAt_idx" ON "OpportunitySubmission"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonetizationOrder_referenceCode_key" ON "MonetizationOrder"("referenceCode");

-- CreateIndex
CREATE INDEX "MonetizationOrder_status_createdAt_idx" ON "MonetizationOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertSubscriber_email_key" ON "AlertSubscriber"("email");

-- CreateIndex
CREATE INDEX "AlertSubscriber_status_createdAt_idx" ON "AlertSubscriber"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Visit_path_idx" ON "Visit"("path");

-- CreateIndex
CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");

-- CreateIndex
CREATE INDEX "ProcessStep_status_idx" ON "ProcessStep"("status");

-- CreateIndex
CREATE INDEX "ProcessStep_order_idx" ON "ProcessStep"("order");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPackage_slug_key" ON "PricingPackage"("slug");

-- CreateIndex
CREATE INDEX "PricingPackage_status_idx" ON "PricingPackage"("status");

-- CreateIndex
CREATE INDEX "PricingPackage_featured_idx" ON "PricingPackage"("featured");

-- CreateIndex
CREATE INDEX "TeamMember_status_idx" ON "TeamMember"("status");

-- CreateIndex
CREATE INDEX "TeamMember_featured_idx" ON "TeamMember"("featured");

-- CreateIndex
CREATE INDEX "ComparisonRow_status_idx" ON "ComparisonRow"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCategory_slug_key" ON "DocumentCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_slug_key" ON "DocumentTemplate"("slug");

-- CreateIndex
CREATE INDEX "DocumentTemplate_categoryId_idx" ON "DocumentTemplate"("categoryId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_status_idx" ON "DocumentTemplate"("status");

-- CreateIndex
CREATE INDEX "TemplateComment_templateId_idx" ON "TemplateComment"("templateId");

-- CreateIndex
CREATE INDEX "TemplateComment_userId_idx" ON "TemplateComment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateRating_templateId_userId_key" ON "TemplateRating"("templateId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateBookmark_templateId_userId_key" ON "TemplateBookmark"("templateId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewCategory_slug_key" ON "InterviewCategory"("slug");

-- CreateIndex
CREATE INDEX "InterviewQuestion_categoryId_idx" ON "InterviewQuestion"("categoryId");

-- CreateIndex
CREATE INDEX "InterviewQuestion_difficulty_idx" ON "InterviewQuestion"("difficulty");

-- CreateIndex
CREATE INDEX "InterviewQuestion_status_idx" ON "InterviewQuestion"("status");

-- CreateIndex
CREATE INDEX "InterviewSession_userId_idx" ON "InterviewSession"("userId");

-- CreateIndex
CREATE INDEX "InterviewExperience_status_idx" ON "InterviewExperience"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VisaCountry_code_key" ON "VisaCountry"("code");

-- CreateIndex
CREATE INDEX "VisaCountry_status_idx" ON "VisaCountry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VisaCategory_slug_key" ON "VisaCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "VisaRejection_code_key" ON "VisaRejection"("code");

-- CreateIndex
CREATE INDEX "VisaRejection_status_idx" ON "VisaRejection"("status");

-- CreateIndex
CREATE INDEX "VisaQuestion_countryId_idx" ON "VisaQuestion"("countryId");

-- CreateIndex
CREATE INDEX "VisaQuestion_categoryId_idx" ON "VisaQuestion"("categoryId");

-- CreateIndex
CREATE INDEX "VisaQuestion_status_idx" ON "VisaQuestion"("status");

-- CreateIndex
CREATE INDEX "VisaDocument_countryId_idx" ON "VisaDocument"("countryId");

-- CreateIndex
CREATE INDEX "VisaDocument_categoryId_idx" ON "VisaDocument"("categoryId");

-- CreateIndex
CREATE INDEX "VisaExperience_countryId_idx" ON "VisaExperience"("countryId");

-- CreateIndex
CREATE INDEX "VisaExperience_publishedStatus_idx" ON "VisaExperience"("publishedStatus");

-- CreateIndex
CREATE INDEX "SuccessStory_country_visaType_idx" ON "SuccessStory"("country", "visaType");

-- CreateIndex
CREATE INDEX "SuccessStory_createdAt_idx" ON "SuccessStory"("createdAt");

-- CreateIndex
CREATE INDEX "SuccessStory_status_storyType_idx" ON "SuccessStory"("status", "storyType");

-- CreateIndex
CREATE INDEX "SocialIdea_kind_active_idx" ON "SocialIdea"("kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "PublishChannel_platform_key" ON "PublishChannel"("platform");

-- CreateIndex
CREATE INDEX "SocialPostQueue_scheduledFor_status_idx" ON "SocialPostQueue"("scheduledFor", "status");

-- CreateIndex
CREATE INDEX "SocialPostQueue_status_idx" ON "SocialPostQueue"("status");

-- CreateIndex
CREATE INDEX "PipelineRun_kind_startedAt_idx" ON "PipelineRun"("kind", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OpportunityCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ImportSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "GalleryAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "NewsCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonetizationOrder" ADD CONSTRAINT "MonetizationOrder_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateComment" ADD CONSTRAINT "TemplateComment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateComment" ADD CONSTRAINT "TemplateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateRating" ADD CONSTRAINT "TemplateRating_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateRating" ADD CONSTRAINT "TemplateRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateBookmark" ADD CONSTRAINT "TemplateBookmark_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateBookmark" ADD CONSTRAINT "TemplateBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InterviewCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewExperience" ADD CONSTRAINT "InterviewExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaQuestion" ADD CONSTRAINT "VisaQuestion_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "VisaCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaQuestion" ADD CONSTRAINT "VisaQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VisaCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaDocument" ADD CONSTRAINT "VisaDocument_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "VisaCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaDocument" ADD CONSTRAINT "VisaDocument_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VisaCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaExperience" ADD CONSTRAINT "VisaExperience_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "VisaCountry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

