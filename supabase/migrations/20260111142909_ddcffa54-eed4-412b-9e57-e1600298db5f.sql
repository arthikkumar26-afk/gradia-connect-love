-- Add additional profile fields for candidate details
ALTER TABLE public.profiles
ADD COLUMN current_state text NULL,
ADD COLUMN current_district text NULL,
ADD COLUMN alternate_number text NULL,
ADD COLUMN highest_qualification text NULL,
ADD COLUMN office_type text NULL,
ADD COLUMN preferred_state text NULL,
ADD COLUMN preferred_district text NULL,
ADD COLUMN preferred_state_2 text NULL,
ADD COLUMN preferred_district_2 text NULL,
ADD COLUMN segment text NULL,
ADD COLUMN program text NULL,
ADD COLUMN classes_handled text NULL,
ADD COLUMN batch text NULL,
ADD COLUMN primary_subject text NULL;