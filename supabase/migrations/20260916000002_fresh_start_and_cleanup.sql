
-- Drop redundant columns in customer table
ALTER TABLE public.customer DROP COLUMN IF EXISTS delivery_lat;
ALTER TABLE public.customer DROP COLUMN IF EXISTS delivery_lng;

-- Truncate tables to clear all data.
-- CASCADE handles any foreign key references automatically.
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.delivery_partners CASCADE;
TRUNCATE TABLE public.customer CASCADE;

-- Clear non-owner users from authentication
DELETE FROM auth.users WHERE id NOT IN (SELECT id FROM public.owner);
