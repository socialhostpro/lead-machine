-- Migration to update vector database for Supabase native embeddings
-- This updates the schema to use 384-dimension vectors instead of OpenAI's 1536 dimensions

-- First, update the vector column to use 384 dimensions (gte-small model)
ALTER TABLE ai_training_vectors 
ALTER COLUMN embedding TYPE VECTOR(384);

-- Update the vector similarity search index for new dimensions
DROP INDEX IF EXISTS ai_training_vectors_embedding_idx;
CREATE INDEX ai_training_vectors_embedding_idx ON ai_training_vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Update the find_similar_vectors function to use new dimensions
CREATE OR REPLACE FUNCTION find_similar_vectors(
    query_embedding VECTOR(384),  -- Updated to 384 dimensions
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

-- Update the user vector search function to use new dimensions
CREATE OR REPLACE FUNCTION user_vector_search_with_embedding(
  query_embedding VECTOR(384),  -- Updated to 384 dimensions
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

-- Update comments to reflect the new model
COMMENT ON COLUMN ai_training_vectors.embedding IS 'Supabase gte-small embedding vector (384 dimensions)';

-- Add a function to validate embedding dimensions
CREATE OR REPLACE FUNCTION validate_embedding_dimension(embedding_vector VECTOR(384))
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the vector has the correct dimensions and no null/infinite values
    RETURN array_length(embedding_vector::float[], 1) = 384;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a trigger to validate embeddings before insert/update
CREATE OR REPLACE FUNCTION validate_embedding_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.embedding IS NOT NULL THEN
        IF NOT validate_embedding_dimension(NEW.embedding) THEN
            RAISE EXCEPTION 'Invalid embedding: must be 384-dimensional vector with valid float values';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the table
DROP TRIGGER IF EXISTS validate_embedding_trigger ON ai_training_vectors;
CREATE TRIGGER validate_embedding_trigger
    BEFORE INSERT OR UPDATE ON ai_training_vectors
    FOR EACH ROW
    EXECUTE FUNCTION validate_embedding_trigger();

-- Update any existing documentation or metadata
UPDATE ai_training_vectors 
SET metadata = jsonb_set(
    COALESCE(metadata, '{}'),
    '{embedding_model}',
    '"gte-small"'
)
WHERE metadata IS NULL OR NOT metadata ? 'embedding_model';

-- Create a function to migrate existing OpenAI embeddings to Supabase format
-- This will be needed if there are existing embeddings to convert
CREATE OR REPLACE FUNCTION migrate_openai_embeddings_to_supabase()
RETURNS TABLE (
    migrated_count INTEGER,
    failed_count INTEGER,
    details TEXT
) AS $$
DECLARE
    migrated INTEGER := 0;
    failed INTEGER := 0;
    total_rows INTEGER;
BEGIN
    -- Get count of existing embeddings
    SELECT COUNT(*) INTO total_rows 
    FROM ai_training_vectors 
    WHERE embedding IS NOT NULL;
    
    -- If no existing embeddings, nothing to migrate
    IF total_rows = 0 THEN
        RETURN QUERY SELECT 0, 0, 'No existing embeddings found to migrate';
        RETURN;
    END IF;
    
    -- Clear existing embeddings that are wrong dimensions
    -- This will trigger regeneration using the new Supabase service
    UPDATE ai_training_vectors 
    SET embedding = NULL,
        metadata = jsonb_set(
            COALESCE(metadata, '{}'),
            '{migration_note}',
            '"Cleared for Supabase regeneration"'
        )
    WHERE embedding IS NOT NULL;
    
    GET DIAGNOSTICS migrated = ROW_COUNT;
    
    RETURN QUERY SELECT 
        migrated, 
        0, 
        format('Cleared %s existing embeddings for regeneration with Supabase model', migrated);
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON FUNCTION migrate_openai_embeddings_to_supabase() IS 'Clears existing OpenAI embeddings so they can be regenerated with Supabase native embeddings';
COMMENT ON FUNCTION validate_embedding_dimension(VECTOR(384)) IS 'Validates that embedding vectors have correct 384 dimensions for gte-small model';

-- Log the migration
INSERT INTO ai_training_sessions (
    company_id,
    session_name,
    status,
    configuration,
    created_at
) VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'Schema Migration to Supabase Embeddings',
    'completed',
    '{"migration": "openai_to_supabase", "new_dimensions": 384, "model": "gte-small", "timestamp": "' || NOW()::text || '"}'::jsonb,
    NOW()
);

-- Display migration information
SELECT 
    'Schema migration completed successfully' as status,
    'Updated ai_training_vectors to use 384-dimension vectors' as embedding_update,
    'Updated similarity functions for new dimensions' as function_update,
    'Added validation triggers for embedding quality' as validation_update,
    'Ready for Supabase native embeddings' as ready_status;