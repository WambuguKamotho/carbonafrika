-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LANDOWNER', 'BUYER', 'VERIFIER', 'ADMIN', 'COMMUNITY_PARTNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('LAND_RESTORATION', 'CLEAN_ENERGY');

-- CreateEnum
CREATE TYPE "LandType" AS ENUM ('FOREST', 'SAVANNA', 'GRASSLAND', 'FARMLAND', 'WETLAND', 'MANGROVE');

-- CreateEnum
CREATE TYPE "EnergyType" AS ENUM ('BIOGAS', 'SOLAR_PV', 'BIOCHARCOAL', 'COOKSTOVES', 'MICRO_HYDRO', 'WIND');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ENERGY_METER', 'WEATHER_STATION', 'SOIL_SENSOR', 'FLOW_METER', 'FUEL_SENSOR');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('AVAILABLE', 'LISTED', 'SOLD', 'RETIRED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'COLLECTING', 'COLLECTED', 'DELIVERED', 'RELEASED', 'DISPUTED', 'REFUNDED', 'FAILED', 'SETTLED');

-- CreateEnum
CREATE TYPE "ResaleRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BuyerInquiryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerEarningKind" AS ENUM ('ONBOARDING', 'VERIFICATION', 'ROYALTY');

-- CreateEnum
CREATE TYPE "PartnerEarningStatus" AS ENUM ('PENDING', 'PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "walletAddress" TEXT,
    "walletNonce" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'LANDOWNER',
    "phone" TEXT,
    "country" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycRequestedAt" TIMESTAMP(3),
    "kycSubmissionNote" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "verifierScopes" "ProjectType"[] DEFAULT ARRAY[]::"ProjectType"[],
    "inviteToken" TEXT,
    "inviteTokenExpiry" TIMESTAMP(3),
    "bankAccountName" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIban" TEXT,
    "bankSwiftBic" TEXT,
    "bankCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL DEFAULT 'LAND_RESTORATION',
    "landType" "LandType",
    "energyType" "EnergyType",
    "capacityKw" DOUBLE PRECISION,
    "householdsServed" INTEGER,
    "fuelDisplacedKgY" DOUBLE PRECISION,
    "methodologyCode" TEXT,
    "partnerId" TEXT,
    "partnerRoyaltyPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "boundary" JSONB,
    "hectares" DOUBLE PRECISION NOT NULL,
    "estimatedTons" DOUBLE PRECISION NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PENDING',
    "ipfsDocumentHash" TEXT,
    "satelliteImageUrl" TEXT,
    "mediaUrls" TEXT[],
    "onChainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminReviewedById" TEXT,
    "adminReviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Methodology" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "scope" TEXT,
    "summary" TEXT NOT NULL,
    "bufferPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "monitoringPeriodMonths" INTEGER NOT NULL DEFAULT 12,
    "documentUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Methodology_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "BufferPool" (
    "id" TEXT NOT NULL,
    "totalReserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BufferPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BufferContribution" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "creditId" TEXT,
    "projectId" TEXT,
    "tonnes" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'issuance',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BufferContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringPeriod" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportIpfsHash" TEXT,
    "verifiedTons" DOUBLE PRECISION,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoringPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'comment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IoTDevice" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "label" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IoTDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kwhGenerated" DOUBLE PRECISION,
    "co2AvoidedKg" DOUBLE PRECISION,
    "householdsServed" INTEGER,
    "fuelDisplacedKg" DOUBLE PRECISION,
    "temperatureC" DOUBLE PRECISION,
    "humidityPct" DOUBLE PRECISION,
    "soilMoisturePct" DOUBLE PRECISION,
    "rainfallMm" DOUBLE PRECISION,
    "windSpeedMs" DOUBLE PRECISION,
    "gasFlowM3h" DOUBLE PRECISION,
    "pressureKpa" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatelliteSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ndvi" DOUBLE PRECISION NOT NULL,
    "cloudCover" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'sentinel-2-l2a',
    "bbox" JSONB,

    CONSTRAINT "SatelliteSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "verifierId" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "carbonTons" DOUBLE PRECISION,
    "txHash" TEXT,
    "reportIpfsHash" TEXT,
    "creditsIssued" BOOLEAN NOT NULL DEFAULT false,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarbonCredit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bufferTons" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vintageYear" INTEGER,
    "status" "CreditStatus" NOT NULL DEFAULT 'AVAILABLE',
    "mintTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarbonCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "pricePerTon" DOUBLE PRECISION NOT NULL,
    "totalTons" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "txHash" TEXT,
    "isResale" BOOLEAN NOT NULL DEFAULT false,
    "sellerUserId" TEXT,
    "resaleOfPurchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "totalTons" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION,
    "buyerTotal" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "txHash" TEXT,
    "collectTxHash" TEXT,
    "deliverTxHash" TEXT,
    "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settlementError" TEXT,
    "collectedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "disputeOpenedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "buyerConfirmedAt" TIMESTAMP(3),
    "autoReleaseAt" TIMESTAMP(3),
    "retired" BOOLEAN NOT NULL DEFAULT false,
    "retirementTxHash" TEXT,
    "nftTokenId" TEXT,
    "retirementReason" TEXT,
    "retirementNote" TEXT,
    "retiredAt" TIMESTAMP(3),
    "resold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResaleRequest" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "tons" DOUBLE PRECISION NOT NULL,
    "proposedPricePerTon" DOUBLE PRECISION NOT NULL,
    "approvedPricePerTon" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "status" "ResaleRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "buyerNote" TEXT,
    "adminNote" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "listingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResaleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerInquiry" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT,
    "estimatedAnnualTons" DOUBLE PRECISION,
    "useCase" TEXT,
    "message" TEXT,
    "source" TEXT,
    "status" "BuyerInquiryStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "organization" TEXT,
    "yearsExperience" INTEGER,
    "communitiesServed" TEXT,
    "message" TEXT,
    "source" TEXT,
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEarning" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "projectId" TEXT,
    "purchaseId" TEXT,
    "kind" "PartnerEarningKind" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USDC',
    "status" "PartnerEarningStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "payoutTxHash" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "coverUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_onChainId_key" ON "Project"("onChainId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_landType_idx" ON "Project"("landType");

-- CreateIndex
CREATE INDEX "Project_energyType_idx" ON "Project"("energyType");

-- CreateIndex
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");

-- CreateIndex
CREATE INDEX "Project_country_idx" ON "Project"("country");

-- CreateIndex
CREATE INDEX "Project_methodologyCode_idx" ON "Project"("methodologyCode");

-- CreateIndex
CREATE INDEX "Project_partnerId_idx" ON "Project"("partnerId");

-- CreateIndex
CREATE INDEX "BufferContribution_poolId_createdAt_idx" ON "BufferContribution"("poolId", "createdAt");

-- CreateIndex
CREATE INDEX "BufferContribution_creditId_idx" ON "BufferContribution"("creditId");

-- CreateIndex
CREATE INDEX "BufferContribution_projectId_idx" ON "BufferContribution"("projectId");

-- CreateIndex
CREATE INDEX "MonitoringPeriod_projectId_startsAt_idx" ON "MonitoringPeriod"("projectId", "startsAt");

-- CreateIndex
CREATE INDEX "ProjectComment_projectId_createdAt_idx" ON "ProjectComment"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IoTDevice_deviceKey_key" ON "IoTDevice"("deviceKey");

-- CreateIndex
CREATE INDEX "IoTDevice_projectId_idx" ON "IoTDevice"("projectId");

-- CreateIndex
CREATE INDEX "IoTDevice_deviceKey_idx" ON "IoTDevice"("deviceKey");

-- CreateIndex
CREATE INDEX "DeviceReading_projectId_recordedAt_idx" ON "DeviceReading"("projectId", "recordedAt");

-- CreateIndex
CREATE INDEX "DeviceReading_deviceId_recordedAt_idx" ON "DeviceReading"("deviceId", "recordedAt");

-- CreateIndex
CREATE INDEX "SatelliteSnapshot_projectId_idx" ON "SatelliteSnapshot"("projectId");

-- CreateIndex
CREATE INDEX "SatelliteSnapshot_capturedAt_idx" ON "SatelliteSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "Verification_projectId_idx" ON "Verification"("projectId");

-- CreateIndex
CREATE INDEX "Verification_status_idx" ON "Verification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CarbonCredit_tokenId_key" ON "CarbonCredit"("tokenId");

-- CreateIndex
CREATE INDEX "CarbonCredit_projectId_idx" ON "CarbonCredit"("projectId");

-- CreateIndex
CREATE INDEX "CarbonCredit_status_idx" ON "CarbonCredit"("status");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_creditId_idx" ON "Listing"("creditId");

-- CreateIndex
CREATE INDEX "Listing_sellerUserId_idx" ON "Listing"("sellerUserId");

-- CreateIndex
CREATE INDEX "Purchase_buyerId_idx" ON "Purchase"("buyerId");

-- CreateIndex
CREATE INDEX "Purchase_listingId_idx" ON "Purchase"("listingId");

-- CreateIndex
CREATE INDEX "Purchase_settlementStatus_idx" ON "Purchase"("settlementStatus");

-- CreateIndex
CREATE INDEX "Purchase_autoReleaseAt_idx" ON "Purchase"("autoReleaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResaleRequest_listingId_key" ON "ResaleRequest"("listingId");

-- CreateIndex
CREATE INDEX "ResaleRequest_status_createdAt_idx" ON "ResaleRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResaleRequest_buyerId_idx" ON "ResaleRequest"("buyerId");

-- CreateIndex
CREATE INDEX "ResaleRequest_purchaseId_idx" ON "ResaleRequest"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerInquiry_createdUserId_key" ON "BuyerInquiry"("createdUserId");

-- CreateIndex
CREATE INDEX "BuyerInquiry_status_createdAt_idx" ON "BuyerInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerInquiry_email_idx" ON "BuyerInquiry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerApplication_createdUserId_key" ON "PartnerApplication"("createdUserId");

-- CreateIndex
CREATE INDEX "PartnerApplication_status_createdAt_idx" ON "PartnerApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerApplication_email_idx" ON "PartnerApplication"("email");

-- CreateIndex
CREATE INDEX "PartnerEarning_partnerId_status_idx" ON "PartnerEarning"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerEarning_projectId_idx" ON "PartnerEarning"("projectId");

-- CreateIndex
CREATE INDEX "PartnerEarning_purchaseId_idx" ON "PartnerEarning"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "JobLog_queue_status_idx" ON "JobLog"("queue", "status");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_methodologyCode_fkey" FOREIGN KEY ("methodologyCode") REFERENCES "Methodology"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BufferContribution" ADD CONSTRAINT "BufferContribution_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "BufferPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BufferContribution" ADD CONSTRAINT "BufferContribution_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "CarbonCredit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringPeriod" ADD CONSTRAINT "MonitoringPeriod_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IoTDevice" ADD CONSTRAINT "IoTDevice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReading" ADD CONSTRAINT "DeviceReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "IoTDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceReading" ADD CONSTRAINT "DeviceReading_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatelliteSnapshot" ADD CONSTRAINT "SatelliteSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarbonCredit" ADD CONSTRAINT "CarbonCredit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "CarbonCredit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleRequest" ADD CONSTRAINT "ResaleRequest_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResaleRequest" ADD CONSTRAINT "ResaleRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEarning" ADD CONSTRAINT "PartnerEarning_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

