-- Enable realtime for employer_profiles table
ALTER TABLE employer_profiles REPLICA IDENTITY FULL;

-- Add employer_profiles to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE employer_profiles;