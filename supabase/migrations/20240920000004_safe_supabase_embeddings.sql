-- Safe migration to update vector database for Supabase native embeddings
-- This migration safely updates existing schema without conflicts

-- Function to safely add column if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(table_name TEXT, column_name TEXT, column_type TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = table_name 
        AND column_name = column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', table_name, column_name, column_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Check current embedding column dimensions
DO $$
DECLARE
    current_dimensions INTEGER;
BEGIN
    -- Get current vector dimensions
    SELECT 
        CASE 
            WHEN data_type = 'USER-DEFINED' AND udt_name = 'vector' THEN
                CAST(SUBSTRING(column_default FROM '\((\d+)\)') AS INTEGER)
            ELSE NULL
        END INTO current_dimensions
    FROM information_schema.columns 
    WHERE table_name = 'ai_training_vectors' 
    AND column_name = 'embedding';
    
    -- Only update if we need to change dimensions
    IF current_dimensions IS NULL OR current_dimensions != 384 THEN
        -- Update vector column to 384 dimensions
        ALTER TABLE ai_training_vectors 
        ALTER COLUMN embedding TYPE VECTOR(384);
        
        -- Update index for new dimensions
        DROP INDEX IF EXISTS ai_training_vectors_embedding_idx;
        CREATE INDEX ai_training_vectors_embedding_idx ON ai_training_vectors 
        USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        
        RAISE NOTICE 'Updated embedding column to 384 dimensions';
    ELSE
        RAISE NOTICE 'Embedding column already has 384 dimensions';
    END IF;
END;
$$;

-- Update functions to use 384 dimensions
CREATE OR REPLACE FUNCTION find_similar_vectors(
    query_embedding VECTOR(384),
    target_company_id UUID,
    content_types TEXT[] DEFAULT ARRAY['ai_insight', 'call_summary', 'pain_point'],
    limit_count INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7,
    require_validation BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    content_text TEXT,
    content_type TEXT,
    content_subtype TEXT,
    similarity_score FLOAT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.content_text,
        v.content_type,
        v.content_subtype,
        1 - (v.embedding <=> query_embedding) as similarity_score,
        v.metadata,
        v.created_at
    FROM ai_training_vectors v
    WHERE v.company_id = target_company_id
        AND (content_types IS NULL OR v.content_type = ANY(content_types))
        AND (require_validation = FALSE OR v.validation_status = 'validated')
        AND 1 - (v.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY v.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update user vector search function
CREATE OR REPLACE FUNCTION user_vector_search_with_embedding(
  query_embedding VECTOR(384),
  search_user_id UUID,
  search_company_id UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  similarity FLOAT,
  quality_score FLOAT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  lead_id UUID,
  user_id UUID
) AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- Update metadata for existing vectors
UPDATE ai_training_vectors 
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{embedding_model}',
    '"gte-small"'
)
WHERE metadata IS NULL OR NOT metadata ? 'embedding_model';

-- Clear any existing embeddings that may be wrong dimensions
-- This will allow them to be regenerated with the new Supabase service
UPDATE ai_training_vectors 
SET embedding = NULL,
    metadata = jsonb_set(
        COALESCE(metadata, '{}'),
        '{migration_status}',
        '"ready_for_supabase_regeneration"'
    )
WHERE embedding IS NOT NULL;

-- Update column comments
COMMENT ON COLUMN ai_training_vectors.embedding IS 'Supabase gte-small embedding vector (384 dimensions)';

-- Clean up the helper function
DROP FUNCTION add_column_if_not_exists(TEXT, TEXT, TEXT);

-- Log successful migration
INSERT INTO ai_training_sessions (
    company_id,
    session_name,
    status,
    configuration,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'Safe Migration to Supabase Embeddings',
    'completed',
    '{"migration": "safe_openai_to_supabase", "new_dimensions": 384, "model": "gte-small", "cleared_existing": true}'::jsonb,
    NOW()
);

-- Show migration results
SELECT 
    'Safe schema migration completed' as status,
    '384-dimension vectors ready' as embedding_status,
    'Existing embeddings cleared for regeneration' as regeneration_status,
    'Supabase native embeddings configured' as service_status;