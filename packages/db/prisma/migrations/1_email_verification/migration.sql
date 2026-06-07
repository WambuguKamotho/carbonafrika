-- Add email verification fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifyExpiry" TIMESTAMP(3);

-- Existing users (wallet auth, admin invites) are pre-verified
-- so they don't get locked out. Only /register flow users need to verify.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerifyToken" IS NULL;

-- Unique index for token lookup
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerifyToken_key" ON "User"("emailVerifyToken");
