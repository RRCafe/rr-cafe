CREATE OR REPLACE FUNCTION public.increment_partner_earnings(partner_id UUID, amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.delivery_partners
  SET total_earnings = COALESCE(total_earnings, 0) + amount
  WHERE id = partner_id;
END;
$$;
