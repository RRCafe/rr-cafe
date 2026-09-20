-- Drop the old overly permissive policy
DROP POLICY IF EXISTS "Delivery partners can update their location/status." ON delivery_partners;

-- Create the secure policy
CREATE POLICY "Delivery partners can update their location/status." ON delivery_partners 
FOR UPDATE 
USING (auth.uid() = id AND status != 'suspend') 
WITH CHECK (status != 'suspend');
