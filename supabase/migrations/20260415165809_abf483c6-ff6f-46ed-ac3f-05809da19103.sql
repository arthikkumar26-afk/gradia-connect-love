-- Add referral columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS referral_bonus_given BOOLEAN DEFAULT false;

-- Generate referral codes for existing profiles
UPDATE public.profiles 
SET referral_code = UPPER(SUBSTR(MD5(id::text || now()::text), 1, 8))
WHERE referral_code IS NULL;

-- Create a trigger to auto-generate referral_code on new profile insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTR(MD5(NEW.id::text || now()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_referral_code
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();