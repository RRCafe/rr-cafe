CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.email = 'ashraqmohideen@gmail.com' THEN 'owner'::public.user_role ELSE 'customer'::public.user_role END
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors so auth creation doesn't fail
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
