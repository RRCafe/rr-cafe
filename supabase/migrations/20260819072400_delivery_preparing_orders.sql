-- Drop the existing policy
DROP POLICY IF EXISTS "Delivery partners can view relevant orders." ON orders;

-- Create the new policy using delivery_partners table instead of profiles
CREATE POLICY "Delivery partners can view relevant orders." ON orders FOR SELECT USING (
  (auth.uid() = delivery_partner_id) OR
  (status IN ('preparing', 'ready') AND order_type = 'delivery' AND delivery_partner_id IS NULL AND EXISTS (SELECT 1 FROM delivery_partners WHERE id = auth.uid()))
);
