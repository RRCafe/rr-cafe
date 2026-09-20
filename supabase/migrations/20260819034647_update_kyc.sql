UPDATE public.delivery_partners SET kyc_status = 'verified' WHERE phone_number IS NOT NULL AND license_number IS NOT NULL;
