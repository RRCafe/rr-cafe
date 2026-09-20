
ALTER TABLE public.customer RENAME COLUMN longitude TO delivery_lng;
ALTER TABLE public.customer RENAME COLUMN latitude TO delivery_lat;
ALTER TABLE public.customer RENAME COLUMN distance TO calculated_distance_km;
