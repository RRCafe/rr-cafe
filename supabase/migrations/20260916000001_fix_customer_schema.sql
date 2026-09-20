
-- Drop the phone_number column that was mistakenly added, use phone instead
ALTER TABLE public.customer DROP COLUMN IF EXISTS phone_number;

-- Add longitude, latitude, distance to customer table
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS distance numeric;

-- Rename orders columns to refer to the new requested names (actually we just add them if they don't exist)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS calculated_distance_km numeric;
