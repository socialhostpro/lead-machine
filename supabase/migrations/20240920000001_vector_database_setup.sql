-- Vector Database Setup for AI Training
-- This migration creates the necessary tables and functions for storing
-- and querying vectorized AI training data from leads, insights, and calls

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Main table for storing vectorized training data
CREATE TABLE IF NOT EXISTS ai_training_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    lead_id UUID,
    
    -- Content and Context
    content_text TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_subtype VARCHAR(50),
    
    -- Vector Data (OpenAI ada-002 embeddings are 1536 dimensions)
    embedding VECTOR(1536),
    
    -- Metadata for Context
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Source Information
    source_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Training Metadata
    training_weight FLOAT DEFAULT 1.0,
    quality_score FLOAT,
    is_validated BOOLEAN DEFAULT FALSE,
    validation_notes TEXT,
    
    -- Constraints
    CONSTRAINT valid_content_type CHECK (content_type IN (
        'ai_insight', 'call_transcript', 'call_summary', 'lead_note', 
        'interaction_log', 'pain_point', 'next_step', 'qualification_reason',
        'legal_analysis', 'medical_analysis', 'financial_analysis'
    )),
    CONSTRAINT valid_quality_score CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    CONSTRAINT valid_training_weight CHECK (training_weight > 0)
);

-- Table for AI training sessions and experiments
CREATE TABLE IF NOT EXISTS ai_training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Session Details
    session_name VARCHAR(255) NOT NULL,
    description TEXT,
    training_objective TEXT,
    
    -- Configuration
    vector_selection_criteria JSONB,
    training_parameters JSONB,
    
    -- Results
    performance_metrics JSONB,
    generated_insights JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('planned', 'running', 'completed', 'failed', 'cancelled'))
);

-- Table for knowledge clusters (grouping similar vectors)
CREATE TABLE IF NOT EXISTS ai_knowledge_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Cluster Information
    cluster_name VARCHAR(255) NOT NULL,
    cluster_description TEXT,
    centroid_embedding VECTOR(1536),
    
    -- Cluster Metadata
    vector_count INTEGER DEFAULT 0,
    avg_quality_score FLOAT,
    primary_content_types TEXT[],
    
    -- Business Context
    business_value TEXT,
    actionable_insights TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_vector_count CHECK (vector_count >= 0),
    CONSTRAINT valid_avg_quality_score CHECK (avg_quality_score IS NULL OR (avg_quality_score >= 0 AND avg_quality_score <= 1))
);

-- Junction table linking vectors to clusters
CREATE TABLE IF NOT EXISTS ai_vector_clusters (
    vector_id UUID REFERENCES ai_training_vectors(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES ai_knowledge_clusters(id) ON DELETE CASCADE,
    similarity_score FLOAT,
    PRIMARY KEY (vector_id, cluster_id),
    
    CONSTRAINT valid_similarity_score CHECK (similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 1))
);

-- Table for tracking embedding generation jobs
CREATE TABLE IF NOT EXISTS ai_embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    
    -- Job Details
    job_type VARCHAR(50) NOT NULL, -- 'batch_process', 'real_time', 'reprocess'
    content_source VARCHAR(50) NOT NULL, -- 'leads', 'ai_insights', 'call_data', 'notes'
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Configuration
    batch_size INTEGER DEFAULT 100,
    processing_config JSONB,
    
    -- Status and Timing
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_details JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_job_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_batch_size CHECK (batch_size > 0),
    CONSTRAINT valid_counts CHECK (processed_items >= 0 AND failed_items >= 0 AND total_items >= 0)
);

-- Indexes for performance

-- Vector similarity search index (using IVFFlat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS ai_training_vectors_embedding_idx 
ON ai_training_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Standard indexes for filtering and joins
CREATE INDEX IF NOT EXISTS ai_training_vectors_company_id_idx ON ai_training_vectors(company_id);
CREATE INDEX IF NOT EXISTS ai_training_vectors_lead_id_idx ON ai_training_vectors(lead_id);
CREATE INDEX IF NOT EXISTS ai_training_vectors_content_type_idx ON ai_training_vectors(content_type);
CREATE INDEX IF NOT EXISTS ai_training_vectors_created_at_idx ON ai_training_vectors(created_at);
CREATE INDEX IF NOT EXISTS ai_training_vectors_quality_score_idx ON ai_training_vectors(quality_score);
CREATE INDEX IF NOT EXISTS ai_training_vectors_is_validated_idx ON ai_training_vectors(is_validated);

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS ai_training_vectors_company_type_idx ON ai_training_vectors(company_id, content_type);
CREATE INDEX IF NOT EXISTS ai_training_vectors_company_validated_idx ON ai_training_vectors(company_id, is_validated);

-- Other table indexes
CREATE INDEX IF NOT EXISTS ai_training_sessions_company_id_idx ON ai_training_sessions(company_id);
CREATE INDEX IF NOT EXISTS ai_training_sessions_status_idx ON ai_training_sessions(status);
CREATE INDEX IF NOT EXISTS ai_knowledge_clusters_company_id_idx ON ai_knowledge_clusters(company_id);
CREATE INDEX IF NOT EXISTS ai_embedding_jobs_company_id_idx ON ai_embedding_jobs(company_id);
CREATE INDEX IF NOT EXISTS ai_embedding_jobs_status_idx ON ai_embedding_jobs(status);

-- Functions for vector operations

-- Function to find similar vectors using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_vectors(
    query_embedding VECTOR(1536),
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
        1 - (v.embedding <=> query_embedding) AS similarity_score,
        v.metadata,
        v.created_at
    FROM ai_training_vectors v
    WHERE v.company_id = target_company_id
        AND (content_types IS NULL OR v.content_type = ANY(content_types))
        AND (NOT require_validation OR v.is_validated = TRUE)
        AND v.embedding IS NOT NULL
        AND 1 - (v.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY v.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get comprehensive lead context
CREATE OR REPLACE FUNCTION get_lead_training_context(
    target_lead_id UUID,
    target_company_id UUID,
    context_types TEXT[] DEFAULT ARRAY['ai_insight', 'call_summary', 'interaction_log'],
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    content_text TEXT,
    content_type TEXT,
    content_subtype TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    quality_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.content_text,
        v.content_type,
        v.content_subtype,
        v.created_at,
        v.metadata,
        v.quality_score
    FROM ai_training_vectors v
    WHERE v.lead_id = target_lead_id
        AND v.company_id = target_company_id
        AND (context_types IS NULL OR v.content_type = ANY(context_types))
        AND v.is_validated = TRUE
    ORDER BY v.created_at DESC, v.quality_score DESC NULLS LAST
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search for relevant training examples
CREATE OR REPLACE FUNCTION search_training_examples(
    search_text TEXT,
    target_company_id UUID,
    example_types TEXT[] DEFAULT ARRAY['ai_insight', 'call_summary'],
    min_quality_score FLOAT DEFAULT 0.5,
    limit_count INTEGER DEFAULT 15
)
RETURNS TABLE (
    id UUID,
    content_text TEXT,
    content_type TEXT,
    similarity_score FLOAT,
    quality_score FLOAT,
    metadata JSONB
) AS $$
DECLARE
    search_embedding VECTOR(1536);
BEGIN
    -- Note: In practice, you would generate the embedding via API call
    -- For now, we'll do a text similarity search as fallback
    RETURN QUERY
    SELECT 
        v.id,
        v.content_text,
        v.content_type,
        0.0::FLOAT AS similarity_score, -- Placeholder for actual similarity
        v.quality_score,
        v.metadata
    FROM ai_training_vectors v
    WHERE v.company_id = target_company_id
        AND v.content_type = ANY(example_types)
        AND (v.quality_score IS NULL OR v.quality_score >= min_quality_score)
        AND v.is_validated = TRUE
        AND v.content_text ILIKE '%' || search_text || '%'
    ORDER BY v.quality_score DESC NULLS LAST, v.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update vector statistics
CREATE OR REPLACE FUNCTION update_vector_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update cluster statistics when vectors are added/removed
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update any clusters this vector belongs to
        UPDATE ai_knowledge_clusters 
        SET 
            vector_count = (
                SELECT COUNT(*) 
                FROM ai_vector_clusters 
                WHERE cluster_id = ai_knowledge_clusters.id
            ),
            avg_quality_score = (
                SELECT AVG(v.quality_score) 
                FROM ai_training_vectors v
                JOIN ai_vector_clusters vc ON v.id = vc.vector_id
                WHERE vc.cluster_id = ai_knowledge_clusters.id
                AND v.quality_score IS NOT NULL
            ),
            updated_at = NOW()
        WHERE id IN (
            SELECT cluster_id 
            FROM ai_vector_clusters 
            WHERE vector_id = NEW.id
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- Update clusters when vector is deleted
        UPDATE ai_knowledge_clusters 
        SET 
            vector_count = (
                SELECT COUNT(*) 
                FROM ai_vector_clusters 
                WHERE cluster_id = ai_knowledge_clusters.id
            ),
            avg_quality_score = (
                SELECT AVG(v.quality_score) 
                FROM ai_training_vectors v
                JOIN ai_vector_clusters vc ON v.id = vc.vector_id
                WHERE vc.cluster_id = ai_knowledge_clusters.id
                AND v.quality_score IS NOT NULL
            ),
            updated_at = NOW()
        WHERE id IN (
            SELECT cluster_id 
            FROM ai_vector_clusters 
            WHERE vector_id = OLD.id
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER ai_training_vectors_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON ai_training_vectors
    FOR EACH ROW EXECUTE FUNCTION update_vector_statistics();

-- Function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers for timestamp columns
CREATE TRIGGER ai_training_vectors_updated_at_trigger
    BEFORE UPDATE ON ai_training_vectors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ai_training_sessions_updated_at_trigger
    BEFORE UPDATE ON ai_training_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ai_knowledge_clusters_updated_at_trigger
    BEFORE UPDATE ON ai_knowledge_clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER ai_embedding_jobs_updated_at_trigger
    BEFORE UPDATE ON ai_embedding_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial content types for reference
INSERT INTO ai_training_vectors (id, company_id, content_text, content_type, metadata, training_weight) 
VALUES 
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Sample AI insight content type', 'ai_insight', '{"sample": true}', 0.1),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Sample call transcript content type', 'call_transcript', '{"sample": true}', 0.1),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Sample call summary content type', 'call_summary', '{"sample": true}', 0.1),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Sample lead note content type', 'lead_note', '{"sample": true}', 0.1),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Sample pain point content type', 'pain_point', '{"sample": true}', 0.1),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Sample next step content type', 'next_step', '{"sample": true}', 0.1)
ON CONFLICT DO NOTHING;

-- Delete sample entries immediately (they were just to validate the schema)
DELETE FROM ai_training_vectors WHERE company_id = '00000000-0000-0000-0000-000000000000';

COMMENT ON TABLE ai_training_vectors IS 'Stores vectorized content from leads, AI insights, and calls for training AI models';
COMMENT ON TABLE ai_training_sessions IS 'Tracks AI training sessions and their results';
COMMENT ON TABLE ai_knowledge_clusters IS 'Groups similar vectors into knowledge clusters for analysis';
COMMENT ON TABLE ai_vector_clusters IS 'Links vectors to their cluster assignments';
COMMENT ON TABLE ai_embedding_jobs IS 'Tracks background jobs for generating embeddings';

COMMENT ON COLUMN ai_training_vectors.embedding IS 'OpenAI ada-002 embedding vector (1536 dimensions)';
COMMENT ON COLUMN ai_training_vectors.metadata IS 'JSON metadata including lead context, timestamps, business context';
COMMENT ON COLUMN ai_training_vectors.quality_score IS 'Quality assessment score from 0.0 to 1.0';
COMMENT ON COLUMN ai_training_vectors.training_weight IS 'Importance weight for training (higher = more important)';