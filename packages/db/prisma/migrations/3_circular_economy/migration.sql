-- Migration: circular_economy
-- Adds Circular Economy as a third project category (alongside Land Restoration
-- and Clean Energy), covering manufacturing efficiency, recycling, e-waste,
-- composting, and waste heat recovery projects.

-- Extend ProjectType enum
ALTER TYPE "ProjectType" ADD VALUE IF NOT EXISTS 'CIRCULAR_ECONOMY';

-- New CircularType enum for sub-type classification
CREATE TYPE "CircularType" AS ENUM (
  'PLASTIC_RECYCLING',
  'EWASTE_RECYCLING',
  'ORGANIC_COMPOSTING',
  'TEXTILE_RECYCLING',
  'WASTE_HEAT_RECOVERY',
  'INDUSTRIAL_EFFICIENCY'
);

-- Add fields to Project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "circularType" "CircularType";
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "materialTonsPerYear" DOUBLE PRECISION;

-- Index for filtering by circular type
CREATE INDEX IF NOT EXISTS "Project_circularType_idx" ON "Project"("circularType");
