-- This script is idempotent and can be run multiple times safely.
-- It sets up the entire database schema, RLS policies, and helper functions.

-- Create the user_role type only if it doesn't exist, to avoid errors on subsequent runs.
-- We will add 'SaaS Admin' in a separate, idempotent step.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'Owner',
            'Member'
        );
    END IF;
END;
$$;

-- Add the 'SaaS Admin' value to the user_role enum if it's not already there.
-- This is the correct, non-destructive way to update an ENUM.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'SaaS Admin';

-- Create the companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.companies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    CONSTRAINT companies_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.companies IS 'Stores company or organization information.';

-- Add columns to ensure schema is up-to-date, preventing errors on existing databases.
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS webhook_url text NULL,
    ADD COLUMN IF NOT EXISTS webhook_header text NULL,
    ADD COLUMN IF NOT EXISTS default_agent_id text NULL,
    ADD COLUMN IF NOT EXISTS address text NULL,
    ADD COLUMN IF NOT EXISTS city text NULL,
    ADD COLUMN IF NOT EXISTS state text NULL,
    ADD COLUMN IF NOT EXISTS zip_code text NULL;


-- Create the profiles table to store public user profiles if it doesn't exist
-- RENAMED from 'users' to avoid conflicts with auth.users and improve clarity.
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    email text NOT NULL,
    company_id uuid NOT NULL,
    role user_role NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_email_key UNIQUE (email),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.profiles IS 'Public user profiles linked to authentication users and companies.';

-- Add missing columns and foreign key to profiles. This makes the script idempotent.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;

-- Add the role column if it does not exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role user_role NOT NULL DEFAULT 'Member'::user_role;
    END IF;
END;
$$;


-- Correct the role for the first user of each company to be 'Owner'.
-- This is idempotent and ensures data consistency if the role was just added.
WITH company_owners AS (
  SELECT
    company_id,
    (array_agg(id ORDER BY created_at ASC))[1] AS owner_id
  FROM public.profiles
  GROUP BY company_id
)
UPDATE public.profiles u
SET role = 'Owner'::user_role
FROM company_owners co
WHERE u.id = co.owner_id AND u.company_id = co.company_id;


DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_company_id_fkey') THEN
       ALTER TABLE public.profiles ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
   END IF;
END;
$$;


-- Create the leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    company_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    status text NOT NULL,
    source text NOT NULL,
    CONSTRAINT leads_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.leads IS 'Stores all lead information for each company.';

-- Add missing columns and foreign key to leads
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS company text NULL,
    ADD COLUMN IF NOT EXISTS phone text NULL,
    ADD COLUMN IF NOT EXISTS notes jsonb NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS issue_description text NULL,
    ADD COLUMN IF NOT EXISTS source_conversation_id text NULL,
    ADD COLUMN IF NOT EXISTS ai_insights jsonb NULL;

-- Remove deprecated columns
ALTER TABLE public.leads
    DROP COLUMN IF EXISTS call_details,
    DROP COLUMN IF EXISTS has_audio,
    DROP COLUMN IF EXISTS has_user_audio,
    DROP COLUMN IF EXISTS has_response_audio,
    DROP COLUMN IF EXISTS audio_path,
    DROP COLUMN IF EXISTS is_deleted;

DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_source_conversation_id_key') THEN
       ALTER TABLE public.leads ADD CONSTRAINT leads_source_conversation_id_key UNIQUE (source_conversation_id);
   END IF;
   
   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_company_id_fkey') THEN
       ALTER TABLE public.leads ADD CONSTRAINT leads_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
   END IF;
END;
$$;

-- Create the forms table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.forms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    title text NOT NULL,
    description text NULL,
    fields jsonb NOT NULL,
    config jsonb NOT NULL,
    CONSTRAINT forms_pkey PRIMARY KEY (id),
    CONSTRAINT forms_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.forms IS 'Stores embeddable web form definitions.';


-- Helper function to get the current user's role safely, avoiding RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Set a search path to prevent hijacking.
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;
COMMENT ON FUNCTION public.get_my_role() IS 'Safely retrieves the role of the currently authenticated user, bypassing RLS.';

-- Helper function to get the current user's company_id safely, avoiding RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
-- Set a search path to prevent hijacking.
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;
COMMENT ON FUNCTION public.get_my_company_id() IS 'Safely retrieves the company ID of the currently authenticated user, bypassing RLS.';


-- Set up Row Level Security (RLS) for all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure a clean slate, making the script idempotent
DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.companies;
DROP POLICY IF EXISTS "Allow owners to update their company" ON public.companies;
DROP POLICY IF EXISTS "Allow members to read their own company" ON public.companies;

DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read users in their own company" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.leads;
DROP POLICY IF EXISTS "Allow full access to leads for users of the same company" ON public.leads;

DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.forms;
DROP POLICY IF EXISTS "Allow full access for company members" ON public.forms;
DROP POLICY IF EXISTS "Allow public read access to forms" ON public.forms;


-- Create RLS policies for companies
CREATE POLICY "Allow all access to SaaS Admins" ON public.companies FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow owners to update their company" ON public.companies FOR UPDATE
USING ( public.get_my_role() = 'Owner'::user_role AND id = public.get_my_company_id() );

CREATE POLICY "Allow members to read their own company" ON public.companies FOR SELECT
USING ( id = public.get_my_company_id() );


-- Create RLS policies for profiles
CREATE POLICY "Allow all access to SaaS Admins" ON public.profiles FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow users to read users in their own company" ON public.profiles FOR SELECT
USING ( company_id = public.get_my_company_id() );

CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE
USING ( id = auth.uid() );


-- Create RLS policies for leads
CREATE POLICY "Allow all access to SaaS Admins" ON public.leads FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow full access to leads for users of the same company" ON public.leads FOR ALL
USING ( company_id = public.get_my_company_id() );

-- RLS Policies for forms
CREATE POLICY "Allow all access to SaaS Admins" ON public.forms FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow full access for company members" ON public.forms FOR ALL
USING ( company_id = public.get_my_company_id() );

CREATE POLICY "Allow public read access to forms" ON public.forms FOR SELECT
USING (true); -- Anyone can read form definitions

-- Function to securely create a lead from a public form submission
CREATE OR REPLACE FUNCTION public.create_lead_from_form(form_id_in uuid, lead_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  form_company_id uuid;
  new_lead_id uuid;
  form_fields jsonb;
BEGIN
  -- 1. Validate form ID and get company ID
  SELECT company_id, fields INTO form_company_id, form_fields
  FROM public.forms
  WHERE id = form_id_in;

  IF form_company_id IS NULL THEN
    RAISE EXCEPTION 'Invalid form ID';
  END IF;

  -- 2. Validate required fields
  IF NOT (lead_data ? 'firstName' AND jsonb_typeof(lead_data -> 'firstName') = 'string' AND (lead_data->>'firstName') <> '') THEN
     RAISE EXCEPTION 'First Name is required.';
  END IF;
  IF NOT (lead_data ? 'lastName' AND jsonb_typeof(lead_data -> 'lastName') = 'string' AND (lead_data->>'lastName') <> '') THEN
     RAISE EXCEPTION 'Last Name is required.';
  END IF;
  IF NOT (lead_data ? 'email' AND jsonb_typeof(lead_data -> 'email') = 'string' AND (lead_data->>'email') <> '') THEN
     RAISE EXCEPTION 'Email is required.';
  END IF;

  -- 3. Insert the new lead
  INSERT INTO public.leads (
    company_id,
    first_name,
    last_name,
    email,
    phone,
    company,
    issue_description,
    status,
    source,
    notes
  )
  VALUES (
    form_company_id,
    lead_data ->> 'firstName',
    lead_data ->> 'lastName',
    lead_data ->> 'email',
    lead_data ->> 'phone',
    lead_data ->> 'company',
    lead_data ->> 'issueDescription',
    'New', -- Default status
    'Web Form', -- Source
    '[]'::jsonb
  )
  RETURNING id INTO new_lead_id;
  
  RETURN new_lead_id;
END;
$$;
COMMENT ON FUNCTION public.create_lead_from_form(uuid, jsonb) IS 'Creates a new lead from a public web form submission.';

-- Grant anonymous users permission to call the function
GRANT EXECUTE ON FUNCTION public.create_lead_from_form(uuid, jsonb) TO anon;


-- Function and Trigger to create a user profile and company on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Create a new company for the new user
  INSERT INTO public.companies (name)
  VALUES (('Company for ' || NEW.email))
  RETURNING id INTO new_company_id;

  -- Create a public user profile, linking it to the new company and setting role to 'Owner'
  INSERT INTO public.profiles (id, name, email, company_id, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, new_company_id, 'Owner');
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists to make sure we have the latest version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to fire after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();