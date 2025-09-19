-- Simple migration to ensure schema compatibility
-- This adds missing columns and constraints if they don't exist

-- Ensure companies table has all required columns
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS webhook_url text NULL,
    ADD COLUMN IF NOT EXISTS webhook_header text NULL,
    ADD COLUMN IF NOT EXISTS default_agent_id text NULL,
    ADD COLUMN IF NOT EXISTS address text NULL,
    ADD COLUMN IF NOT EXISTS city text NULL,
    ADD COLUMN IF NOT EXISTS state text NULL,
    ADD COLUMN IF NOT EXISTS zip_code text NULL;

-- Ensure leads table has all required columns
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS company text NULL,
    ADD COLUMN IF NOT EXISTS phone text NULL,
    ADD COLUMN IF NOT EXISTS notes jsonb NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS issue_description text NULL,
    ADD COLUMN IF NOT EXISTS source_conversation_id text NULL,
    ADD COLUMN IF NOT EXISTS ai_insights jsonb NULL;

-- Create forms table if it doesn't exist
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

-- Create the lead form function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_lead_from_form(uuid, jsonb) TO anon;