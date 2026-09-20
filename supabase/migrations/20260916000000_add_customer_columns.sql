
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS delivery_lat numeric;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS delivery_lng numeric;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS type text;
