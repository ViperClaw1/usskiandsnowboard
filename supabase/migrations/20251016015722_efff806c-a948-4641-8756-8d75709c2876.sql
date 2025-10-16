-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('athlete', 'employer', 'admin');

-- Create profiles table to store basic user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table to manage user permissions
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create athlete_profiles table for detailed athlete information
CREATE TABLE public.athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  photo_url TEXT,
  sport_discipline TEXT,
  bio TEXT,
  career_interests TEXT[],
  skills TEXT[],
  geographic_preferences TEXT[],
  availability TEXT,
  is_public BOOLEAN DEFAULT true,
  profile_completeness INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on athlete_profiles
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;

-- Create education table
CREATE TABLE public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.athlete_profiles(id) ON DELETE CASCADE NOT NULL,
  school TEXT NOT NULL,
  degree TEXT,
  graduation_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on education
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

-- Create experience table
CREATE TABLE public.experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.athlete_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  organization TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on experience
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;

-- Create certifications table
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.athlete_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  issuer TEXT,
  issue_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on certifications
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Create employer_profiles table
CREATE TABLE public.employer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_person TEXT,
  opportunities_offered TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on employer_profiles
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;

-- Create connection_requests table
CREATE TABLE public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES public.employer_profiles(id) ON DELETE CASCADE NOT NULL,
  athlete_id UUID REFERENCES public.athlete_profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  opportunity_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'intro_sent', 'interview_scheduled', 'placed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on connection_requests
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_athlete_profiles_updated_at
  BEFORE UPDATE ON public.athlete_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employer_profiles_updated_at
  BEFORE UPDATE ON public.employer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connection_requests_updated_at
  BEFORE UPDATE ON public.connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for athlete_profiles
CREATE POLICY "Athletes can view their own profile"
  ON public.athlete_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Athletes can update their own profile"
  ON public.athlete_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Athletes can create their own profile"
  ON public.athlete_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employers can view public athlete profiles"
  ON public.athlete_profiles
  FOR SELECT
  USING (
    is_public = true 
    AND public.has_role(auth.uid(), 'employer')
  );

CREATE POLICY "Admins can view all athlete profiles"
  ON public.athlete_profiles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for education
CREATE POLICY "Athletes can manage their own education"
  ON public.education
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE id = education.athlete_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can view education for public profiles"
  ON public.education
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE id = education.athlete_id
      AND is_public = true
    )
    AND public.has_role(auth.uid(), 'employer')
  );

CREATE POLICY "Admins can view all education"
  ON public.education
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for experience
CREATE POLICY "Athletes can manage their own experience"
  ON public.experience
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE id = experience.athlete_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can view experience for public profiles"
  ON public.experience
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE id = experience.athlete_id
      AND is_public = true
    )
    AND public.has_role(auth.uid(), 'employer')
  );

CREATE POLICY "Admins can view all experience"
  ON public.experience
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for certifications
CREATE POLICY "Athletes can manage their own certifications"
  ON public.certifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE id = certifications.athlete_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can view certifications for public profiles"
  ON public.certifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE id = certifications.athlete_id
      AND is_public = true
    )
    AND public.has_role(auth.uid(), 'employer')
  );

CREATE POLICY "Admins can view all certifications"
  ON public.certifications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for employer_profiles
CREATE POLICY "Employers can view their own profile"
  ON public.employer_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Employers can update their own profile"
  ON public.employer_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Employers can create their own profile"
  ON public.employer_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all employer profiles"
  ON public.employer_profiles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for connection_requests
CREATE POLICY "Employers can create connection requests"
  ON public.connection_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employer_profiles
      WHERE id = connection_requests.employer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can view their own requests"
  ON public.connection_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employer_profiles
      WHERE id = connection_requests.employer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can view requests for them"
  ON public.connection_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athlete_profiles
      WHERE id = connection_requests.athlete_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all connection requests"
  ON public.connection_requests
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));