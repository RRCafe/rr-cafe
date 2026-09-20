-- Fix pricing_config
DROP POLICY IF EXISTS "Owners can update pricing config." ON pricing_config;
CREATE POLICY "Owners can update pricing config." ON pricing_config FOR UPDATE USING (
  (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);

-- Fix categories
DROP POLICY IF EXISTS "Owners can insert categories." ON categories;
DROP POLICY IF EXISTS "Owners can update categories." ON categories;
DROP POLICY IF EXISTS "Owners can delete categories." ON categories;
CREATE POLICY "Owners can insert categories." ON categories FOR INSERT WITH CHECK ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));
CREATE POLICY "Owners can update categories." ON categories FOR UPDATE USING ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));
CREATE POLICY "Owners can delete categories." ON categories FOR DELETE USING ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));

-- Fix menu_items
DROP POLICY IF EXISTS "Owners can insert menu items." ON menu_items;
DROP POLICY IF EXISTS "Owners can update menu items." ON menu_items;
DROP POLICY IF EXISTS "Owners can delete menu items." ON menu_items;
CREATE POLICY "Owners can insert menu items." ON menu_items FOR INSERT WITH CHECK ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));
CREATE POLICY "Owners can update menu items." ON menu_items FOR UPDATE USING ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));
CREATE POLICY "Owners can delete menu items." ON menu_items FOR DELETE USING ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));

-- Fix order_items (SELECT)
DROP POLICY IF EXISTS "Users can view order items for their orders." ON order_items;
CREATE POLICY "Users can view order items for their orders." ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.customer_id = auth.uid() OR orders.delivery_partner_id = auth.uid()))
  OR (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);

-- Fix payments (SELECT)
DROP POLICY IF EXISTS "Users can view payments for their orders." ON payments;
CREATE POLICY "Users can view payments for their orders." ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.customer_id = auth.uid())
  OR (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);

-- Fix delivery_partners
DROP POLICY IF EXISTS "Owners can view all delivery partners." ON delivery_partners;
DROP POLICY IF EXISTS "Owners can update delivery partner KYC." ON delivery_partners;
CREATE POLICY "Owners can view all delivery partners." ON delivery_partners FOR SELECT USING ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));
CREATE POLICY "Owners can update delivery partner KYC." ON delivery_partners FOR UPDATE USING ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()));

-- Fix storage
DROP POLICY IF EXISTS "Owners can upload menu item images." ON storage.objects;
DROP POLICY IF EXISTS "Owners can update menu item images." ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete menu item images." ON storage.objects;
CREATE POLICY "Owners can upload menu item images." ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'menu-items' AND ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()))
);
CREATE POLICY "Owners can update menu item images." ON storage.objects FOR UPDATE USING (
  bucket_id = 'menu-items' AND ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()))
);
CREATE POLICY "Owners can delete menu item images." ON storage.objects FOR DELETE USING (
  bucket_id = 'menu-items' AND ((auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()))
);
