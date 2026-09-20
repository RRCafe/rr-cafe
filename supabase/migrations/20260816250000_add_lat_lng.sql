-- Add lat/lng to orders for precise delivery routing
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lat NUMERIC(10, 7);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_lng NUMERIC(10, 7);
