CREATE POLICY "Owners can insert orders" ON orders FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()) );
CREATE POLICY "Owners can insert order items" ON order_items FOR INSERT WITH CHECK ( EXISTS (SELECT 1 FROM owner WHERE id = auth.uid()) );
