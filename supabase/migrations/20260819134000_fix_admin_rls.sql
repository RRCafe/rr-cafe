-- Fix orders policies
DROP POLICY IF EXISTS "Owners can view all orders." ON orders;
DROP POLICY IF EXISTS "Owners can update any order." ON orders;
DROP POLICY IF EXISTS "Owners can insert orders." ON orders;
DROP POLICY IF EXISTS "Owners can insert orders" ON orders;

CREATE POLICY "Owners can view all orders." ON orders FOR SELECT USING (
  (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);
CREATE POLICY "Owners can update any order." ON orders FOR UPDATE USING (
  (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);
CREATE POLICY "Owners can insert orders." ON orders FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);

-- Fix order_items policies
DROP POLICY IF EXISTS "Owners can insert order items." ON order_items;
DROP POLICY IF EXISTS "Owners can insert order items" ON order_items;
CREATE POLICY "Owners can insert order items." ON order_items FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);

-- Fix payments policies
DROP POLICY IF EXISTS "Owners can insert payments directly." ON payments;
DROP POLICY IF EXISTS "Owners can insert/update payments." ON payments;
CREATE POLICY "Owners can insert payments directly." ON payments FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);
CREATE POLICY "Owners can update payments directly." ON payments FOR UPDATE USING (
  (auth.jwt() ->> 'email' = 'ashraqmohideen@gmail.com') OR EXISTS (SELECT 1 FROM owner WHERE id = auth.uid())
);
