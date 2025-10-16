-- Fix search path for update_full_name function
CREATE OR REPLACE FUNCTION update_full_name()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.full_name := TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
  RETURN NEW;
END;
$$;