-- Add registration_number column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN registration_number TEXT UNIQUE;

-- Create a sequence for registration numbers
CREATE SEQUENCE IF NOT EXISTS candidate_registration_seq START WITH 1;

-- Create function to generate registration number
CREATE OR REPLACE FUNCTION public.generate_registration_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_reg_number TEXT;
  year_prefix TEXT;
  seq_number INTEGER;
BEGIN
  -- Only generate for candidates
  IF NEW.role = 'candidate' AND NEW.registration_number IS NULL THEN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
    seq_number := nextval('candidate_registration_seq');
    new_reg_number := 'GRAD-' || year_prefix || '-' || LPAD(seq_number::TEXT, 6, '0');
    NEW.registration_number := new_reg_number;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate registration number on insert
CREATE TRIGGER trigger_generate_registration_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_registration_number();

-- Also create trigger for updates (in case role changes to candidate)
CREATE TRIGGER trigger_generate_registration_number_on_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.registration_number IS NULL AND NEW.role = 'candidate')
  EXECUTE FUNCTION public.generate_registration_number();