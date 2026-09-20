-- Fix delivery partners RLS on orders
DROP POLICY IF EXISTS "Delivery partners can update orders." ON orders;

CREATE POLICY "Delivery partners can update orders." ON orders FOR UPDATE USING (
  auth.uid() = delivery_partner_id OR (delivery_partner_id IS NULL AND EXISTS (SELECT 1 FROM delivery_partners WHERE id = auth.uid()))
);
