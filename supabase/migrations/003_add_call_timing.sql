-- Add call timing fields to leads table
-- This migration adds call start time and duration for ElevenLabs conversations

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS call_start_time timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS call_duration_secs integer NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.call_start_time IS 'Timestamp when the call started (from ElevenLabs start_time_unix_secs)';
COMMENT ON COLUMN public.leads.call_duration_secs IS 'Duration of the call in seconds (from ElevenLabs call_duration_secs)';