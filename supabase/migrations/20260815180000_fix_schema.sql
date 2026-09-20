-- Fix delivery_partners table to match app expectations
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS vehicle_info TEXT;
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline';
ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(10,2) DEFAULT 0.00;

-- Copy existing data if any
UPDATE delivery_partners SET status = CASE WHEN is_online THEN 'online' ELSE 'offline' END WHERE status IS NULL;

-- Add 'pending' to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'placed';

-- Add missing columns to orders table that the app expects
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(10,2) DEFAULT 0.00;

-- Add gateway_payment_id to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_payment_id VARCHAR(255);

-- Create the owner profile automatically when they sign up
-- First, create a trigger function to auto-create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'ashraqmohideen@gmail.com' THEN 'owner'::user_role ELSE 'customer'::user_role END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also allow POS orders without customer_id (owner creates them)
-- and allow owners to insert orders
CREATE POLICY "Owners can insert orders." ON orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Allow owners to insert payments
CREATE POLICY "Owners can insert payments directly." ON payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
