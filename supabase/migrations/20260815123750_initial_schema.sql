-- Users & Roles
CREATE TYPE user_role AS ENUM ('owner', 'customer', 'delivery_partner');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role user_role DEFAULT 'customer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Configuration & Pricing Rules
CREATE TABLE pricing_config (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  base_delivery_fee NUMERIC(10,2) DEFAULT 20.00,
  per_km_rate NUMERIC(10,2) DEFAULT 7.00,
  platform_fee_type VARCHAR(20) DEFAULT 'flat', -- 'flat' or 'percentage'
  platform_fee_value NUMERIC(10,2) DEFAULT 15.00, -- e.g. 15.00 (flat) or 5.00 (%)
  free_delivery_threshold NUMERIC(10,2) DEFAULT 500.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing config
INSERT INTO pricing_config (base_delivery_fee, per_km_rate, platform_fee_type, platform_fee_value, free_delivery_threshold)
VALUES (20.00, 7.00, 'flat', 15.00, 500.00);

-- Categories & Menu Items
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  business_type VARCHAR(50) NOT NULL, -- 'cafe' OR 'wholesale_icecream'
  display_order INT DEFAULT 0
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_veg BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  business_type VARCHAR(50) NOT NULL -- 'cafe' OR 'wholesale_icecream'
);

-- Orders & Billing
CREATE TYPE order_type AS ENUM ('dine_in', 'dine_out', 'delivery');
CREATE TYPE order_status AS ENUM ('placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE order_source AS ENUM ('app', 'pos_manual'); -- 'app' for online, 'pos_manual' for direct QR/cash

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,
  customer_id UUID REFERENCES profiles(id),
  delivery_partner_id UUID REFERENCES profiles(id),
  order_type order_type NOT NULL,
  status order_status DEFAULT 'placed',
  business_type VARCHAR(50) NOT NULL,
  source order_source DEFAULT 'app',
  
  -- Price Breakdown
  items_subtotal NUMERIC(10,2) NOT NULL,
  calculated_distance_km NUMERIC(5,2) DEFAULT 0.00,
  
  customer_delivery_charge NUMERIC(10,2) DEFAULT 0.00, -- Total charged to customer (Base + Distance + Platform Fee)
  partner_commission NUMERIC(10,2) DEFAULT 0.00,      -- Amount paid to delivery partner (Base + Distance)
  owner_platform_fee NUMERIC(10,2) DEFAULT 0.00,       -- Hidden owner platform fee margin
  
  grand_total NUMERIC(10,2) NOT NULL,
  
  -- Delivery Address
  delivery_address TEXT,
  delivery_lat NUMERIC(10,7),
  delivery_lng NUMERIC(10,7),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  item_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(255),
  payment_status VARCHAR(50) DEFAULT 'created', -- 'created', 'captured', 'failed', 'manual_success'
  payment_method VARCHAR(50) DEFAULT 'razorpay', -- 'razorpay', 'cash', 'direct_qr'
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Partner Profiles & Live Locations
CREATE TABLE delivery_partners (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50),
  license_number VARCHAR(100),
  kyc_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  kyc_doc_url TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  current_lat NUMERIC(10,7),
  current_lng NUMERIC(10,7),
  last_location_update TIMESTAMPTZ
);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_partners ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Pricing Config Policies
CREATE POLICY "Pricing config is viewable by everyone." ON pricing_config FOR SELECT USING (true);
-- Only owners can update pricing
CREATE POLICY "Owners can update pricing config." ON pricing_config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);

-- Categories & Menu Items Policies
CREATE POLICY "Menu is viewable by everyone." ON categories FOR SELECT USING (true);
CREATE POLICY "Menu items are viewable by everyone." ON menu_items FOR SELECT USING (true);
-- Owners can manage menu
CREATE POLICY "Owners can insert categories." ON categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Owners can update categories." ON categories FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Owners can delete categories." ON categories FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Owners can insert menu items." ON menu_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Owners can update menu items." ON menu_items FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Owners can delete menu items." ON menu_items FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Orders Policies
-- Owners can see all orders
CREATE POLICY "Owners can view all orders." ON orders FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
-- Customers can see their own orders
CREATE POLICY "Customers can view their orders." ON orders FOR SELECT USING (auth.uid() = customer_id);
-- Delivery partners can see orders assigned to them or unassigned delivery orders
CREATE POLICY "Delivery partners can view relevant orders." ON orders FOR SELECT USING (
  (auth.uid() = delivery_partner_id) OR
  (status = 'ready' AND order_type = 'delivery' AND delivery_partner_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'delivery_partner'))
);
-- Customers can insert orders
CREATE POLICY "Customers can insert orders." ON orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
-- Delivery partners can update order status (accept, pickup, deliver)
CREATE POLICY "Delivery partners can update orders." ON orders FOR UPDATE USING (
  auth.uid() = delivery_partner_id OR (delivery_partner_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'delivery_partner'))
);
-- Owners can update any order
CREATE POLICY "Owners can update any order." ON orders FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Order Items Policies
CREATE POLICY "Users can view order items for their orders." ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.customer_id = auth.uid() OR orders.delivery_partner_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')))
);
CREATE POLICY "Customers can insert order items." ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid())
);

-- Payments Policies
CREATE POLICY "Users can view payments for their orders." ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND (orders.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')))
);
CREATE POLICY "Customers can insert payments." ON payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "Owners can insert/update payments." ON payments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Delivery Partners Policies
CREATE POLICY "Delivery partners can view their own profile." ON delivery_partners FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owners can view all delivery partners." ON delivery_partners FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Delivery partners can update their location/status." ON delivery_partners FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Owners can update delivery partner KYC." ON delivery_partners FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "Delivery partners can insert their own profile." ON delivery_partners FOR INSERT WITH CHECK (auth.uid() = id);

-- Realtime Configuration
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_partners;
