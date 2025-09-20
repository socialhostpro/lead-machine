# Vector Database for AI Training - Design Document

## Overview
This document outlines the design for a vector database system that captures all AI summaries, insights, call data, and lead information for AI bot training and knowledge retrieval.

## Data Sources for Vectorization

### 1. AI Insights (`AIInsights`)
- **Qualification Scores**: Numerical assessment of lead quality
- **Justification Text**: Reasoning behind qualification decisions
- **Key Pain Points**: Identified customer problems and needs
- **Suggested Next Steps**: AI-recommended actions
- **Service Type Classifications**: Legal, medical, financial, etc.
- **Legal-Specific Data**: Case types, urgency levels, jurisdictions
- **Detailed Analysis**: Comprehensive AI-generated analysis

### 2. Call Data (`CallDetails`)
- **Conversation Transcripts**: Full text from ElevenLabs conversations
- **Summary Titles**: Brief conversation descriptions
- **Transcript Summaries**: AI-generated call summaries
- **Call Metadata**: Duration, timestamps, agent information

### 3. Lead Information (`Lead`)
- **Contact Details**: Names, companies, contact information
- **Issue Descriptions**: Customer-reported problems
- **Notes History**: All user-added notes and interactions
- **Status Progression**: How leads move through the pipeline

### 4. Interaction Patterns
- **Communication History**: Email threads, call logs
- **Response Patterns**: How leads respond to different approaches
- **Conversion Indicators**: What leads to successful conversions

## Vector Database Schema

### Core Tables

#### `ai_training_vectors`
```sql
CREATE TABLE ai_training_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    lead_id UUID REFERENCES leads(id),
    
    -- Content and Context
    content_text TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'ai_insight', 'call_transcript', 'summary', 'note', 'interaction'
    content_subtype VARCHAR(50), -- 'pain_point', 'next_step', 'qualification', 'legal_analysis', etc.
    
    -- Vector Data
    embedding VECTOR(1536), -- OpenAI ada-002 embeddings (1536 dimensions)
    
    -- Metadata for Context
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Source Information
    source_data JSONB, -- Original data structure
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Training Metadata
    training_weight FLOAT DEFAULT 1.0, -- Importance weight for training
    quality_score FLOAT, -- Quality assessment (0-1)
    is_validated BOOLEAN DEFAULT FALSE, -- Human validation flag
    validation_notes TEXT,
    
    -- Indexing
    CONSTRAINT valid_content_type CHECK (content_type IN (
        'ai_insight', 'call_transcript', 'call_summary', 'lead_note', 
        'interaction_log', 'pain_point', 'next_step', 'qualification_reason',
        'legal_analysis', 'medical_analysis', 'financial_analysis'
    ))
);

-- Vector similarity search index
CREATE INDEX ai_training_vectors_embedding_idx ON ai_training_vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Standard indexes
CREATE INDEX ai_training_vectors_company_id_idx ON ai_training_vectors(company_id);
CREATE INDEX ai_training_vectors_lead_id_idx ON ai_training_vectors(lead_id);
CREATE INDEX ai_training_vectors_content_type_idx ON ai_training_vectors(content_type);
CREATE INDEX ai_training_vectors_created_at_idx ON ai_training_vectors(created_at);
```

#### `ai_training_sessions`
```sql
CREATE TABLE ai_training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Session Details
    session_name VARCHAR(255) NOT NULL,
    description TEXT,
    training_objective TEXT,
    
    -- Configuration
    vector_selection_criteria JSONB, -- Filters for which vectors to include
    training_parameters JSONB, -- Model parameters, weights, etc.
    
    -- Results
    performance_metrics JSONB, -- Accuracy, loss, etc.
    generated_insights JSONB, -- New insights discovered
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `ai_knowledge_clusters`
```sql
CREATE TABLE ai_knowledge_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Cluster Information
    cluster_name VARCHAR(255) NOT NULL,
    cluster_description TEXT,
    centroid_embedding VECTOR(1536),
    
    -- Cluster Metadata
    vector_count INTEGER DEFAULT 0,
    avg_quality_score FLOAT,
    primary_content_types TEXT[], -- Most common content types in cluster
    
    -- Business Context
    business_value TEXT, -- What this cluster represents for the business
    actionable_insights TEXT[], -- Key insights from this cluster
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link vectors to clusters
CREATE TABLE ai_vector_clusters (
    vector_id UUID REFERENCES ai_training_vectors(id),
    cluster_id UUID REFERENCES ai_knowledge_clusters(id),
    similarity_score FLOAT, -- How well the vector fits the cluster
    PRIMARY KEY (vector_id, cluster_id)
);
```

## Data Collection and Processing Pipeline

### 1. Content Extraction Strategy

#### AI Insights Processing
```typescript
interface AIInsightVector {
    content_text: string;
    content_type: 'ai_insight';
    content_subtype: 'qualification' | 'pain_point' | 'next_step' | 'legal_analysis';
    metadata: {
        lead_id: string;
        qualification_score: number;
        service_type: string;
        urgency_level?: string;
        case_type?: string;
        generated_at: string;
    };
    source_data: AIInsights;
}
```

#### Call Data Processing
```typescript
interface CallVector {
    content_text: string;
    content_type: 'call_transcript' | 'call_summary';
    content_subtype: 'full_transcript' | 'summary' | 'key_moments';
    metadata: {
        lead_id: string;
        conversation_id: string;
        call_duration: number;
        agent_id?: string;
        call_outcome: string;
        timestamp: string;
    };
    source_data: CallDetails;
}
```

#### Lead Interaction Processing
```typescript
interface InteractionVector {
    content_text: string;
    content_type: 'interaction_log' | 'lead_note';
    content_subtype: 'user_note' | 'status_change' | 'email_sent';
    metadata: {
        lead_id: string;
        user_id?: string;
        interaction_type: string;
        lead_status: string;
        timestamp: string;
    };
    source_data: Note | Lead;
}
```

### 2. Text Preprocessing Pipeline

#### Content Cleaning
- Remove PII (personally identifiable information)
- Standardize formatting
- Extract key entities (names, dates, amounts)
- Normalize terminology

#### Content Enhancement
- Add business context
- Tag with service categories
- Identify sentiment and urgency
- Extract actionable items

#### Quality Assessment
- Content completeness score
- Information density
- Relevance to business objectives
- Training value assessment

## Embedding Generation Strategy

### OpenAI Embeddings Configuration
```typescript
interface EmbeddingConfig {
    model: 'text-embedding-ada-002';
    dimensions: 1536;
    max_tokens: 8192;
    batch_size: 100;
    retry_attempts: 3;
}
```

### Content Chunking Strategy
- **Short Content** (< 500 tokens): Process as single chunk
- **Medium Content** (500-2000 tokens): Split semantically at sentence boundaries
- **Long Content** (> 2000 tokens): Create overlapping chunks with context preservation

### Metadata Enrichment
```typescript
interface VectorMetadata {
    // Business Context
    industry_vertical: string;
    service_category: string;
    lead_value_tier: 'high' | 'medium' | 'low';
    
    // Temporal Context
    business_hours: boolean;
    day_of_week: string;
    season: string;
    
    // Interaction Context
    interaction_sequence: number; // 1st call, 2nd follow-up, etc.
    lead_stage: string;
    previous_interactions: string[];
    
    // Outcome Context
    conversion_outcome: 'converted' | 'lost' | 'pending';
    next_action_taken: string;
    success_indicators: string[];
}
```

## AI Training Applications

### 1. Lead Qualification Enhancement
- **Training Data**: Historical qualification decisions with outcomes
- **Objective**: Improve accuracy of AI qualification scoring
- **Metrics**: Precision, recall, conversion correlation

### 2. Conversation Intelligence
- **Training Data**: Call transcripts with successful/unsuccessful outcomes
- **Objective**: Identify patterns that lead to conversions
- **Metrics**: Call outcome prediction accuracy, script optimization

### 3. Next Best Action Recommendations
- **Training Data**: Historical actions taken and their outcomes
- **Objective**: Suggest optimal next steps for each lead
- **Metrics**: Action success rate, revenue impact

### 4. Content Generation
- **Training Data**: High-performing email templates, scripts, responses
- **Objective**: Generate contextual communication content
- **Metrics**: Response rates, engagement metrics

### 5. Anomaly Detection
- **Training Data**: Normal vs. exceptional lead behaviors
- **Objective**: Identify unusual opportunities or risks
- **Metrics**: Early detection accuracy, false positive rate

## Retrieval and Search Capabilities

### Similarity Search Functions
```sql
-- Find similar AI insights
CREATE OR REPLACE FUNCTION find_similar_insights(
    query_embedding VECTOR(1536),
    company_id UUID,
    content_types TEXT[] DEFAULT ARRAY['ai_insight'],
    limit_count INTEGER DEFAULT 10,
    similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content_text TEXT,
    content_type TEXT,
    similarity_score FLOAT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.content_text,
        v.content_type,
        1 - (v.embedding <=> query_embedding) AS similarity_score,
        v.metadata
    FROM ai_training_vectors v
    WHERE v.company_id = find_similar_insights.company_id
        AND v.content_type = ANY(content_types)
        AND 1 - (v.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY v.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

### Contextual Retrieval
```sql
-- Find relevant context for a specific lead
CREATE OR REPLACE FUNCTION get_lead_context(
    target_lead_id UUID,
    context_types TEXT[] DEFAULT ARRAY['ai_insight', 'call_summary', 'interaction_log'],
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    content_text TEXT,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.content_text,
        v.content_type,
        v.created_at,
        v.metadata
    FROM ai_training_vectors v
    WHERE v.lead_id = target_lead_id
        AND v.content_type = ANY(context_types)
        AND v.is_validated = TRUE
    ORDER BY v.created_at DESC, v.quality_score DESC NULLS LAST
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
```

## Privacy and Security Considerations

### Data Privacy
- **PII Removal**: Automatic detection and redaction of personal information
- **Data Anonymization**: Replace specific details with generic placeholders
- **Consent Management**: Track and respect data usage permissions
- **Retention Policies**: Automatic cleanup of expired training data

### Access Control
- **Company Isolation**: Strict separation of training data between companies
- **Role-Based Access**: Different access levels for different user roles
- **Audit Logging**: Track all access and modifications to training data
- **Encryption**: At-rest and in-transit encryption for all vector data

### Compliance
- **GDPR Compliance**: Right to deletion, data portability
- **CCPA Compliance**: California privacy law requirements
- **HIPAA Considerations**: Healthcare data handling where applicable
- **Industry Standards**: Compliance with relevant industry regulations

## Performance and Scalability

### Database Optimization
- **Partitioning**: Partition vectors by company and date
- **Indexing Strategy**: Optimized indexes for vector search and filtering
- **Caching**: Redis caching for frequently accessed vectors
- **Connection Pooling**: Efficient database connection management

### Embedding Generation
- **Batch Processing**: Process embeddings in optimized batches
- **Rate Limiting**: Respect OpenAI API rate limits
- **Retry Logic**: Robust error handling and retry mechanisms
- **Cost Optimization**: Efficient use of embedding API calls

### Vector Search
- **Index Tuning**: Optimize IVFFlat parameters for dataset size
- **Query Optimization**: Efficient similarity search queries
- **Result Caching**: Cache common search results
- **Parallel Processing**: Concurrent processing for large searches

## Monitoring and Analytics

### Quality Metrics
- **Embedding Quality**: Cosine similarity distributions
- **Content Quality**: Human validation scores
- **Training Effectiveness**: Model performance improvements
- **Business Impact**: Revenue correlation with AI insights

### Operational Metrics
- **Processing Speed**: Time to process and embed new content
- **Storage Usage**: Vector database growth and optimization
- **Search Performance**: Query response times and accuracy
- **Error Rates**: Failed embeddings and processing errors

### Business Metrics
- **Insight Accuracy**: How often AI predictions are correct
- **Action Success**: Success rate of AI-recommended actions
- **Revenue Impact**: Direct correlation with business outcomes
- **User Adoption**: How frequently users interact with AI features

This comprehensive vector database system will enable sophisticated AI training and provide intelligent insights to improve lead conversion and business outcomes.