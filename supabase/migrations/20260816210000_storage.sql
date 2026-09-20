-- Create the storage bucket for menu items
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-items', 'menu-items', true) ON CONFLICT DO NOTHING;

-- Set up storage policies
CREATE POLICY "Menu items images are publicly accessible."
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-items');

CREATE POLICY "Owners can upload menu item images."
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'menu-items' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can update menu item images."
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'menu-items' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Owners can delete menu item images."
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'menu-items' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );
