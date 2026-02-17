
-- Create a function to increment coupon usage count
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id_input UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discount_coupons
  SET total_used = total_used + 1
  WHERE id = coupon_id_input;
END;
$$;
