-- Allow owners to insert order items (needed for the manual Billing/POS page)
CREATE POLICY "Owners can insert order items." 
  ON order_items 
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );
