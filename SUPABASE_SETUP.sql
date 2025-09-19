-- LEAD MACHINE DATABASE SETUP
-- Run this in your Supabase SQL Editor
-- This script is safe to run multiple times

-- 1. Create user_role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM (
            'Owner',
            'Member',
            'SaaS Admin'
        );
    END IF;
END;
$$;

-- 2. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    webhook_url text NULL,
    webhook_header text NULL,
    default_agent_id text NULL,
    address text NULL,
    city text NULL,
    state text NULL,
    zip_code text NULL,
    CONSTRAINT companies_pkey PRIMARY KEY (id)
);

-- 3. Create profiles table (renamed from users to avoid conflicts)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text NOT NULL,
    email text NOT NULL,
    company_id uuid NOT NULL,
    role user_role NOT NULL DEFAULT 'Member'::user_role,
    is_disabled boolean NOT NULL DEFAULT false,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_email_key UNIQUE (email),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Add foreign key for company_id if it doesn't exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_company_id_fkey') THEN
       ALTER TABLE public.profiles ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
   END IF;
END;
$$;

-- 5. Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    company_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    status text NOT NULL,
    source text NOT NULL,
    company text NULL,
    phone text NULL,
    notes jsonb NULL DEFAULT '[]'::jsonb,
    issue_description text NULL,
    source_conversation_id text NULL,
    ai_insights jsonb NULL,
    CONSTRAINT leads_pkey PRIMARY KEY (id)
);

-- 6. Add constraints for leads table
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

-- 7. Create forms table
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

-- 8. Create helper functions
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 9. Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for companies
DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.companies;
DROP POLICY IF EXISTS "Allow owners to update their company" ON public.companies;
DROP POLICY IF EXISTS "Allow members to read their own company" ON public.companies;

CREATE POLICY "Allow all access to SaaS Admins" ON public.companies FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow owners to update their company" ON public.companies FOR UPDATE
USING ( public.get_my_role() = 'Owner'::user_role AND id = public.get_my_company_id() );

CREATE POLICY "Allow members to read their own company" ON public.companies FOR SELECT
USING ( id = public.get_my_company_id() );

-- 11. Create RLS policies for profiles
DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read users in their own company" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

CREATE POLICY "Allow all access to SaaS Admins" ON public.profiles FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow users to read users in their own company" ON public.profiles FOR SELECT
USING ( company_id = public.get_my_company_id() );

CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE
USING ( id = auth.uid() );

-- 12. Create RLS policies for leads
DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.leads;
DROP POLICY IF EXISTS "Allow full access to leads for users of the same company" ON public.leads;

CREATE POLICY "Allow all access to SaaS Admins" ON public.leads FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow full access to leads for users of the same company" ON public.leads FOR ALL
USING ( company_id = public.get_my_company_id() );

-- 13. Create RLS policies for forms
DROP POLICY IF EXISTS "Allow all access to SaaS Admins" ON public.forms;
DROP POLICY IF EXISTS "Allow full access for company members" ON public.forms;
DROP POLICY IF EXISTS "Allow public read access to forms" ON public.forms;

CREATE POLICY "Allow all access to SaaS Admins" ON public.forms FOR ALL
USING ( public.get_my_role() = 'SaaS Admin'::user_role );

CREATE POLICY "Allow full access for company members" ON public.forms FOR ALL
USING ( company_id = public.get_my_company_id() );

CREATE POLICY "Allow public read access to forms" ON public.forms FOR SELECT
USING (true);

-- 14. Create function for form lead creation
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

-- 15. Grant permissions
GRANT EXECUTE ON FUNCTION public.create_lead_from_form(uuid, jsonb) TO anon;

-- 16. Create trigger for new user signup
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

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Setup complete!
SELECT 'Lead Machine database setup completed successfully!' as result;