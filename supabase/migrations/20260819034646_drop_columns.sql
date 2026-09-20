-- 1. Delete all order items for orders placed by customers
DELETE FROM public.order_items 
WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id IS NOT NULL);

-- 2. Delete all payments for orders placed by customers
DELETE FROM public.payments 
WHERE order_id IN (SELECT id FROM public.orders WHERE customer_id IS NOT NULL);

-- 3. Delete the orders placed by customers
DELETE FROM public.orders WHERE customer_id IS NOT NULL;

-- 4. Delete all customer profiles
DELETE FROM public.customer;

-- 5. Delete all auth users EXCEPT the owner and delivery partners
DELETE FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.owner)
AND id NOT IN (SELECT id FROM public.delivery_partners);

-- 6. Clean up delivery partners columns
ALTER TABLE public.delivery_partners 
  DROP COLUMN IF EXISTS vehicle_type, 
  DROP COLUMN IF EXISTS kyc_doc_url, 
  DROP COLUMN IF EXISTS vehicle_info,
  DROP COLUMN IF EXISTS is_online;

-- 7. Clean up payments gateway column
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS gateway_payment_id;
