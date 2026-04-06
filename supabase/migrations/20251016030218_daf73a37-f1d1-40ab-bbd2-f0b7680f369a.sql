-- Drop the existing check constraint on status
ALTER TABLE public.connection_requests 
DROP CONSTRAINT IF EXISTS connection_requests_status_check;

-- Add a new check constraint that allows pending, accepted, and rejected
ALTER TABLE public.connection_requests 
ADD CONSTRAINT connection_requests_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected'));