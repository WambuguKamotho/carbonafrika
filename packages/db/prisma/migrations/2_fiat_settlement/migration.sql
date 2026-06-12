-- Migration: fiat settlement
-- Adds bankReference to Purchase for tracking bank transfer payment references.
-- Updates currency defaults from USDC to USD across Purchase, Listing,
-- ResaleRequest, and PartnerEarning tables.

ALTER TABLE "Purchase" ADD COLUMN "bankReference" TEXT;

ALTER TABLE "Purchase" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "Listing" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "ResaleRequest" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "PartnerEarning" ALTER COLUMN "currency" SET DEFAULT 'USD';
