# AI Training Vector Database - Deployment Guide

## Overview
This guide walks through deploying the comprehensive vector database system for AI training data. The system captures AI summaries, insights, call data, and all interaction information to create vectors for AI bot training and machine learning.

## Architecture Summary
- **Vector Database**: Supabase PostgreSQL with pgvector extension
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Storage**: ai_training_vectors table with similarity search functions
- **Pipeline**: Automated data collection, embedding generation, and storage
- **Interface**: React dashboard for monitoring and management

## Prerequisites
1. Supabase project with PostgreSQL database
2. OpenAI API key with sufficient credits
3. Node.js environment for running the application
4. Access to production database for migration

## Deployment Steps

### 1. Database Setup

#### Apply Vector Database Migration
```sql
-- Run the migration file: supabase/migrations/20240920000001_vector_database_setup.sql
-- This will create:
-- - pgvector extension
-- - ai_training_vectors table
-- - ai_training_sessions table  
-- - ai_knowledge_clusters table
-- - Search functions and indexes
```

#### Verify Database Setup
```sql
-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'ai_training%';

-- Test vector operations
SELECT vector_similarity_search('test content', 'test-company', 5);
```

### 2. Environment Configuration

#### Add Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORGANIZATION=org-your-org-id-here

# Vector Database Settings
VECTOR_ENABLED=true
VECTOR_BATCH_SIZE=25
VECTOR_QUALITY_THRESHOLD=0.3
VECTOR_AUTO_PROCESSING=true

# Cost Management
VECTOR_DAILY_COST_LIMIT=10.00
VECTOR_MONTHLY_COST_LIMIT=100.00
```

#### Update Supabase Configuration
```typescript
// In utils/config.ts - add vector database settings
export const vectorConfig = {
  enabled: process.env.VECTOR_ENABLED === 'true',
  batchSize: parseInt(process.env.VECTOR_BATCH_SIZE || '25'),
  qualityThreshold: parseFloat(process.env.VECTOR_QUALITY_THRESHOLD || '0.3'),
  autoProcessing: process.env.VECTOR_AUTO_PROCESSING === 'true',
  costLimits: {
    daily: parseFloat(process.env.VECTOR_DAILY_COST_LIMIT || '10.00'),
    monthly: parseFloat(process.env.VECTOR_MONTHLY_COST_LIMIT || '100.00'),
  },
};
```

### 3. Service Integration

#### Update Lead Processing
```typescript
// In components/Dashboard.tsx or lead processing logic
import { aiTrainingDataPipeline } from '../utils/aiTrainingDataPipeline';

// Add to lead creation/update handlers
const handleLeadUpdate = async (lead: Lead) => {
  // ... existing lead processing ...
  
  // Process for AI training (if enabled)
  if (vectorConfig.enabled && vectorConfig.autoProcessing) {
    try {
      await aiTrainingDataPipeline.processLeadRealTime(lead, {
        minQualityScore: vectorConfig.qualityThreshold,
      });
    } catch (error) {
      console.error('Vector processing failed:', error);
      // Don't block main workflow on vector processing errors
    }
  }
};
```

#### Add Dashboard Integration
```typescript
// In components/Dashboard.tsx - add AI Training Dashboard access
import { AITrainingDashboard } from './AITrainingDashboard';

const [showAITraining, setShowAITraining] = useState(false);

// Add button in dashboard header or settings
<button 
  onClick={() => setShowAITraining(true)}
  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
>
  🧠 AI Training
</button>

// Add modal
{showAITraining && (
  <AITrainingDashboard 
    companyId={user.companyId}
    onClose={() => setShowAITraining(false)}
  />
)}
```

### 4. Initial Data Processing

#### Batch Process Existing Leads
```typescript
// Run initial processing for existing data
import { aiTrainingDataPipeline } from './utils/aiTrainingDataPipeline';

const processExistingData = async (companyId: string) => {
  console.log('Starting initial data processing...');
  
  const result = await aiTrainingDataPipeline.processBatchLeads(companyId, {
    batchSize: 25,
    validateVectors: true,
    minQualityScore: 0.3,
    onProgress: (progress) => {
      console.log(`Progress: ${progress.processed}/${progress.total} - ${progress.currentLead}`);
    },
  });
  
  if (result.success) {
    console.log(`Batch processing started: ${result.jobId}`);
  } else {
    console.error('Failed to start processing:', result.error);
  }
};

// Run for each company
await processExistingData('company-id-here');
```

### 5. Performance Optimization

#### Monitor Vector Performance
```sql
-- Check vector count and size
SELECT 
  COUNT(*) as total_vectors,
  AVG(array_length(embedding, 1)) as avg_dimensions,
  COUNT(DISTINCT company_id) as companies_using_vectors
FROM ai_training_vectors;

-- Monitor search performance
EXPLAIN ANALYZE 
SELECT * FROM vector_similarity_search('sample query', 'company-id', 10);

-- Check index usage
SELECT 
  schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'ai_training_vectors';
```

#### Optimize for Scale
```sql
-- Adjust vector index parameters for your data size
DROP INDEX IF EXISTS ai_training_vectors_embedding_idx;

-- For < 1M vectors, use IVFFlat with lists = rows/1000
CREATE INDEX ai_training_vectors_embedding_idx 
ON ai_training_vectors 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- For > 1M vectors, consider HNSW indexing (if available)
-- CREATE INDEX ai_training_vectors_embedding_hnsw_idx 
-- ON ai_training_vectors 
-- USING hnsw (embedding vector_cosine_ops);
```

### 6. Cost Management

#### Implement Usage Monitoring
```typescript
// Add to textEmbeddingService.ts
const checkCostLimits = async (): Promise<boolean> => {
  const stats = aiTrainingDataPipeline.getStats();
  
  // Check daily limit (implement daily cost tracking)
  const dailyCost = await getDailyCost();
  if (dailyCost >= vectorConfig.costLimits.daily) {
    console.warn('Daily cost limit reached:', dailyCost);
    return false;
  }
  
  // Check monthly limit
  if (stats.totalCost >= vectorConfig.costLimits.monthly) {
    console.warn('Monthly cost limit reached:', stats.totalCost);
    return false;
  }
  
  return true;
};

// Use before expensive operations
const generateEmbeddings = async (contents: VectorContent[]) => {
  if (!await checkCostLimits()) {
    throw new Error('Cost limits exceeded - vector processing disabled');
  }
  
  // ... continue with embedding generation
};
```

### 7. Testing and Validation

#### Test Vector Search
```typescript
// Test similarity search functionality
import { aiSimilaritySearchService } from './utils/aiSimilaritySearchService';

const testVectorSearch = async () => {
  try {
    // Test search
    const results = await aiSimilaritySearchService.searchSimilarContent(
      'legal consultation divorce',
      'test-company-id',
      { maxResults: 5, minSimilarity: 0.7 }
    );
    
    console.log('Search results:', results);
    
    // Test training context
    const context = await aiSimilaritySearchService.getLeadTrainingContext(
      'test-lead-id',
      { includePatterns: true, includeSuggestions: true }
    );
    
    console.log('Training context:', context);
    
  } catch (error) {
    console.error('Vector search test failed:', error);
  }
};

await testVectorSearch();
```

#### Validate Data Quality
```sql
-- Check vector quality distribution
SELECT 
  quality_score_bucket,
  COUNT(*) as count,
  AVG(quality_score) as avg_quality
FROM (
  SELECT 
    quality_score,
    CASE 
      WHEN quality_score < 0.3 THEN 'Low'
      WHEN quality_score < 0.7 THEN 'Medium'
      ELSE 'High'
    END as quality_score_bucket
  FROM ai_training_vectors
  WHERE quality_score IS NOT NULL
) quality_analysis
GROUP BY quality_score_bucket
ORDER BY quality_score_bucket;

-- Check content type distribution
SELECT 
  content_type,
  COUNT(*) as count,
  AVG(quality_score) as avg_quality
FROM ai_training_vectors
GROUP BY content_type
ORDER BY count DESC;
```

### 8. Monitoring and Maintenance

#### Set Up Monitoring
```typescript
// Add to regular health checks
const vectorHealthCheck = async () => {
  const health = aiTrainingDataPipeline.getSystemHealth();
  const stats = aiTrainingDataPipeline.getStats();
  
  console.log('Vector System Health:', {
    status: health.status,
    activeJobs: health.metrics.activeJobs,
    errorRate: health.metrics.errorRate,
    totalVectors: stats.totalVectorsCreated,
    totalCost: stats.totalCost,
    recommendations: health.recommendations,
  });
  
  // Alert if critical issues
  if (health.status === 'critical') {
    // Send notification to administrators
    console.error('CRITICAL: Vector system issues detected', health.recommendations);
  }
};

// Run every 5 minutes
setInterval(vectorHealthCheck, 5 * 60 * 1000);
```

#### Maintenance Tasks
```sql
-- Weekly: Clean up low-quality vectors
DELETE FROM ai_training_vectors 
WHERE quality_score < 0.2 
AND created_at < NOW() - INTERVAL '30 days';

-- Monthly: Update vector statistics
ANALYZE ai_training_vectors;

-- Quarterly: Reindex for performance
REINDEX INDEX ai_training_vectors_embedding_idx;
```

### 9. Backup and Recovery

#### Vector Data Backup
```bash
# Backup vector tables specifically
pg_dump --host=your-host --port=5432 --username=postgres \
  --table=ai_training_vectors \
  --table=ai_training_sessions \
  --table=ai_knowledge_clusters \
  --data-only --format=custom \
  your-database > vector_backup.dump

# Restore if needed
pg_restore --host=your-host --port=5432 --username=postgres \
  --dbname=your-database \
  --clean --if-exists \
  vector_backup.dump
```

## Production Checklist

- [ ] Database migration applied successfully
- [ ] pgvector extension enabled and functioning
- [ ] OpenAI API key configured with appropriate limits
- [ ] Environment variables set correctly
- [ ] Initial data processing completed
- [ ] Vector search functions tested
- [ ] Performance monitoring established
- [ ] Cost limits configured and tested
- [ ] Backup procedures implemented
- [ ] Error handling and fallbacks verified
- [ ] Dashboard access configured for administrators

## Troubleshooting

### Common Issues

1. **pgvector Extension Missing**
   ```sql
   -- Enable extension (requires superuser)
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **High OpenAI Costs**
   - Review quality threshold settings
   - Implement stricter content filtering
   - Reduce batch processing frequency
   - Monitor token usage per request

3. **Slow Vector Searches**
   - Check index configuration
   - Adjust IVFFlat lists parameter
   - Consider query optimization
   - Monitor concurrent search load

4. **Memory Issues**
   - Reduce batch sizes
   - Implement connection pooling
   - Monitor PostgreSQL memory usage
   - Consider vector compression

### Support Resources

- **Vector Database Design**: See `VECTOR_DATABASE_DESIGN.md`
- **Service Documentation**: Check individual service files in `utils/`
- **Performance Monitoring**: Use AI Training Dashboard
- **Cost Analysis**: Review pipeline statistics and OpenAI usage

## Next Steps

After successful deployment:

1. **Monitor Performance**: Track search latency, quality scores, and cost metrics
2. **Optimize Quality**: Adjust thresholds based on real usage patterns
3. **Scale Indexing**: Update vector indexes as data grows
4. **Enhance Features**: Add advanced search capabilities and training insights
5. **User Training**: Educate users on the AI Training Dashboard features

The vector database system is now ready to capture and vectorize all AI summaries, insights, and call data for comprehensive AI bot training and machine learning applications.