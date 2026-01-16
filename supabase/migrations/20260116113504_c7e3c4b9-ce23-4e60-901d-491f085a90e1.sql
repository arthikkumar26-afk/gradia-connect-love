-- Create a table for slot bookings
CREATE TABLE public.slot_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL DEFAULT 'technical_assessment',
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  location TEXT,
  state TEXT,
  district TEXT,
  pincode TEXT,
  programme TEXT,
  segment TEXT,
  department TEXT,
  designation TEXT,
  class_level TEXT,
  class_type TEXT,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for candidates to manage their own bookings
CREATE POLICY "Candidates can view their own bookings"
ON public.slot_bookings
FOR SELECT
USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can create their own bookings"
ON public.slot_bookings
FOR INSERT
WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Candidates can update their own bookings"
ON public.slot_bookings
FOR UPDATE
USING (auth.uid() = candidate_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_slot_bookings_updated_at
BEFORE UPDATE ON public.slot_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();