-- User-Specific Vector Database Migration
-- Extends the vector system to support individual user training data for personalized AI bots

-- Add user_id to ai_training_vectors table
ALTER TABLE ai_training_vectors 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for efficient user-specific queries
CREATE INDEX ai_training_vectors_user_id_idx ON ai_training_vectors(user_id);
CREATE INDEX ai_training_vectors_user_company_idx ON ai_training_vectors(user_id, company_id);

-- Create user-specific vector search function
CREATE OR REPLACE FUNCTION user_vector_similarity_search(
  query_text TEXT,
  search_user_id UUID,
  search_company_id UUID DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  similarity FLOAT,
  quality_score FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  lead_id UUID,
  user_id UUID
) 
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding VECTOR(1536);
BEGIN
  -- Generate embedding for query (this would be done by the application)
  -- For now, return empty results as this requires OpenAI API call
  -- The application will call this after generating the embedding
  
  -- This is a placeholder - the actual implementation will receive the embedding
  RETURN QUERY
  SELECT 
    v.id,
    v.content,
    v.content_type,
    1 - (v.embedding <=> query_embedding) as similarity,
    v.quality_score,
    v.metadata,
    v.created_at,
    v.lead_id,
    v.user_id
  FROM ai_training_vectors v
  WHERE v.user_id = search_user_id
    AND (search_company_id IS NULL OR v.company_id = search_company_id)
    AND 1 - (v.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY v.embedding <=> query_embedding
  LIMIT result_limit;
END;
$$;

-- Create function to search with pre-computed embedding
CREATE OR REPLACE FUNCTION user_vector_search_with_embedding(
  query_embedding VECTOR(1536),
  search_user_id UUID,
  search_company_id UUID DEFAULT NULL,
  result_limit INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  similarity FLOAT,
  quality_score FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  lead_id UUID,
  user_id UUID
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.content,
    v.content_type,
    1 - (v.embedding <=> query_embedding) as similarity,
    v.quality_score,
    v.metadata,
    v.created_at,
    v.lead_id,
    v.user_id
  FROM ai_training_vectors v
  WHERE v.user_id = search_user_id
    AND (search_company_id IS NULL OR v.company_id = search_company_id)
    AND 1 - (v.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY v.embedding <=> query_embedding
  LIMIT result_limit;
END;
$$;

-- Create user AI bot context table
CREATE TABLE user_ai_bot_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  bot_name TEXT NOT NULL DEFAULT 'AI Assistant',
  personality_prompt TEXT,
  knowledge_base_summary TEXT,
  conversation_style TEXT DEFAULT 'professional',
  specializations TEXT[], -- Array of specialization areas
  last_training_update TIMESTAMPTZ DEFAULT NOW(),
  total_vectors INTEGER DEFAULT 0,
  average_quality_score FLOAT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for bot contexts
CREATE INDEX user_ai_bot_contexts_user_id_idx ON user_ai_bot_contexts(user_id);
CREATE INDEX user_ai_bot_contexts_company_id_idx ON user_ai_bot_contexts(company_id);
CREATE INDEX user_ai_bot_contexts_active_idx ON user_ai_bot_contexts(active) WHERE active = true;

-- Create function to get user bot training context
CREATE OR REPLACE FUNCTION get_user_bot_training_context(
  search_user_id UUID,
  query_text TEXT DEFAULT NULL,
  context_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  bot_context JSONB,
  training_vectors JSONB[],
  conversation_patterns JSONB,
  success_indicators JSONB
) 
LANGUAGE plpgsql
AS $$
DECLARE
  bot_info RECORD;
  vector_data JSONB[];
  pattern_data JSONB;
  success_data JSONB;
BEGIN
  -- Get bot context information
  SELECT * INTO bot_info
  FROM user_ai_bot_contexts
  WHERE user_id = search_user_id AND active = true
  LIMIT 1;

  -- Get relevant training vectors
  SELECT ARRAY_AGG(
    jsonb_build_object(
      'content', content,
      'content_type', content_type,
      'quality_score', quality_score,
      'metadata', metadata,
      'created_at', created_at
    )
  ) INTO vector_data
  FROM (
    SELECT content, content_type, quality_score, metadata, created_at
    FROM ai_training_vectors
    WHERE user_id = search_user_id
      AND quality_score > 0.5
    ORDER BY created_at DESC, quality_score DESC
    LIMIT context_limit
  ) recent_vectors;

  -- Analyze conversation patterns
  SELECT jsonb_build_object(
    'total_conversations', COUNT(DISTINCT lead_id),
    'avg_quality', AVG(quality_score),
    'content_types', jsonb_agg(DISTINCT content_type),
    'common_topics', jsonb_agg(DISTINCT (metadata->>'topic')) FILTER (WHERE metadata->>'topic' IS NOT NULL)
  ) INTO pattern_data
  FROM ai_training_vectors
  WHERE user_id = search_user_id;

  -- Identify success indicators
  SELECT jsonb_build_object(
    'high_quality_interactions', COUNT(*) FILTER (WHERE quality_score > 0.8),
    'successful_outcomes', COUNT(*) FILTER (WHERE metadata->>'outcome' = 'positive'),
    'client_conversions', COUNT(*) FILTER (WHERE metadata->>'lead_status' = 'Client'),
    'preferred_communication_style', MODE() WITHIN GROUP (ORDER BY metadata->>'communication_style')
  ) INTO success_data
  FROM ai_training_vectors
  WHERE user_id = search_user_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Return combined context
  RETURN QUERY
  SELECT 
    CASE 
      WHEN bot_info.id IS NOT NULL THEN
        jsonb_build_object(
          'bot_name', bot_info.bot_name,
          'personality_prompt', bot_info.personality_prompt,
          'conversation_style', bot_info.conversation_style,
          'specializations', bot_info.specializations,
          'total_vectors', bot_info.total_vectors,
          'last_updated', bot_info.last_training_update
        )
      ELSE jsonb_build_object('error', 'No bot context found')
    END as bot_context,
    COALESCE(vector_data, ARRAY[]::jsonb[]) as training_vectors,
    COALESCE(pattern_data, '{}'::jsonb) as conversation_patterns,
    COALESCE(success_data, '{}'::jsonb) as success_indicators;
END;
$$;

-- Create function to update bot context statistics
CREATE OR REPLACE FUNCTION update_user_bot_stats(search_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  vector_count INTEGER;
  avg_quality FLOAT;
BEGIN
  -- Calculate current statistics
  SELECT 
    COUNT(*),
    AVG(quality_score)
  INTO vector_count, avg_quality
  FROM ai_training_vectors
  WHERE user_id = search_user_id;

  -- Update or create bot context
  INSERT INTO user_ai_bot_contexts (
    user_id, 
    company_id, 
    total_vectors, 
    average_quality_score,
    last_training_update
  )
  SELECT 
    search_user_id,
    u.company_id,
    vector_count,
    COALESCE(avg_quality, 0),
    NOW()
  FROM profiles u
  WHERE u.id = search_user_id
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_vectors = EXCLUDED.total_vectors,
    average_quality_score = EXCLUDED.average_quality_score,
    last_training_update = NOW(),
    updated_at = NOW();
END;
$$;

-- Create trigger to automatically update bot stats when vectors are added
CREATE OR REPLACE FUNCTION trigger_update_bot_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update stats for the affected user
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_user_bot_stats(NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_user_bot_stats(OLD.user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_bot_stats_trigger ON ai_training_vectors;
CREATE TRIGGER update_bot_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_training_vectors
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_bot_stats();

-- Add ElevenLabs agent tracking
ALTER TABLE leads 
ADD COLUMN elevenlabs_agent_id TEXT,
ADD COLUMN form_id UUID,
ADD COLUMN caller_latitude FLOAT,
ADD COLUMN caller_longitude FLOAT,
ADD COLUMN caller_address TEXT,
ADD COLUMN distance_from_business FLOAT; -- in miles

-- Create index for geographic queries
CREATE INDEX leads_location_idx ON leads(caller_latitude, caller_longitude) WHERE caller_latitude IS NOT NULL;
CREATE INDEX leads_agent_idx ON leads(elevenlabs_agent_id) WHERE elevenlabs_agent_id IS NOT NULL;
CREATE INDEX leads_form_idx ON leads(form_id) WHERE form_id IS NOT NULL;

-- Add business address to profiles table (renamed from users)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS business_city TEXT,
ADD COLUMN IF NOT EXISTS business_state TEXT,
ADD COLUMN IF NOT EXISTS business_zip_code TEXT,
ADD COLUMN IF NOT EXISTS business_latitude FLOAT,
ADD COLUMN IF NOT EXISTS business_longitude FLOAT;

-- Create index for user business locations
CREATE INDEX profiles_business_location_idx ON profiles(business_latitude, business_longitude) WHERE business_latitude IS NOT NULL;

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 FLOAT,
  lon1 FLOAT,
  lat2 FLOAT,
  lon2 FLOAT
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  earth_radius FLOAT := 3959; -- Earth's radius in miles
  dlat FLOAT;
  dlon FLOAT;
  a FLOAT;
  c FLOAT;
BEGIN
  -- Handle NULL values
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$;

-- Create function to update lead distances
CREATE OR REPLACE FUNCTION update_lead_distances()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE leads 
  SET distance_from_business = calculate_distance_miles(
    u.business_latitude,
    u.business_longitude,
    leads.caller_latitude,
    leads.caller_longitude
  )
  FROM profiles u
  WHERE leads.company_id = u.company_id
    AND leads.caller_latitude IS NOT NULL
    AND leads.caller_longitude IS NOT NULL
    AND u.business_latitude IS NOT NULL
    AND u.business_longitude IS NOT NULL;
END;
$$;

-- Create ElevenLabs agents table
CREATE TABLE elevenlabs_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  agent_id TEXT NOT NULL, -- ElevenLabs agent ID
  agent_name TEXT NOT NULL,
  voice_id TEXT,
  personality_description TEXT,
  specialization TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, agent_id)
);

-- Create indexes for agents
CREATE INDEX elevenlabs_agents_company_idx ON elevenlabs_agents(company_id);
CREATE INDEX elevenlabs_agents_active_idx ON elevenlabs_agents(active) WHERE active = true;

-- Create forms table for tracking form associations
CREATE TABLE lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  form_name TEXT NOT NULL,
  form_description TEXT,
  elevenlabs_agent_id UUID REFERENCES elevenlabs_agents(id),
  webhook_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for forms
CREATE INDEX lead_forms_company_idx ON lead_forms(company_id);
CREATE INDEX lead_forms_agent_idx ON lead_forms(elevenlabs_agent_id);
CREATE INDEX lead_forms_active_idx ON lead_forms(active) WHERE active = true;

-- Update leads table form_id to reference lead_forms
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_form_id_fkey;
ALTER TABLE leads ADD CONSTRAINT leads_form_id_fkey FOREIGN KEY (form_id) REFERENCES lead_forms(id);

-- Create view for enhanced lead data with geographic and agent information
CREATE OR REPLACE VIEW leads_enhanced AS
SELECT 
  l.*,
  u.business_address as user_business_address,
  u.business_latitude as user_business_latitude,
  u.business_longitude as user_business_longitude,
  ea.agent_name as elevenlabs_agent_name,
  ea.specialization as agent_specialization,
  lf.form_name,
  lf.form_description,
  CASE 
    WHEN l.distance_from_business IS NOT NULL THEN
      l.distance_from_business
    WHEN l.caller_latitude IS NOT NULL AND u.business_latitude IS NOT NULL THEN
      calculate_distance_miles(
        u.business_latitude,
        u.business_longitude,
        l.caller_latitude,
        l.caller_longitude
      )
    ELSE NULL
  END as calculated_distance
FROM leads l
LEFT JOIN profiles u ON l.company_id = u.company_id
LEFT JOIN elevenlabs_agents ea ON l.elevenlabs_agent_id = ea.agent_id AND l.company_id = ea.company_id
LEFT JOIN lead_forms lf ON l.form_id = lf.id;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_training_vectors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_ai_bot_contexts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON elevenlabs_agents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead_forms TO authenticated;
GRANT SELECT ON leads_enhanced TO authenticated;