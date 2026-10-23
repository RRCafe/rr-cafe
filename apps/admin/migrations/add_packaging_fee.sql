-- Migration: Add packaging fee columns to pricing_config
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/wgdhunmtmtmvduzchqjb/sql

ALTER TABLE pricing_config 
ADD COLUMN IF NOT EXISTS packaging_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS packaging_fee_type TEXT DEFAULT 'per_order';
