// Text Embedding Service
// Generates vector embeddings using Supabase's native vector capabilities
// No external API keys required - uses local sentence-transformer models

import { VectorContent } from './aiTrainingDataCollector';
import { supabase } from './supabase';

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface BatchEmbeddingResult {
  successful: Array<{ index: number; embedding: number[]; tokens: number }>;
  failed: Array<{ index: number; error: string; content: string }>;
  totalTokens: number;
  totalCost: number; // Always 0 for Supabase embeddings
}

export class TextEmbeddingService {
  private readonly SUPABASE_FUNCTION_URL = 'supabase-embeddings';
  private readonly MODEL = 'gte-small'; // Supabase-compatible model
  private readonly MAX_TOKENS = 8192; // Max tokens per request
  private readonly MAX_BATCH_SIZE = 100; // Max items per batch request
  private readonly RATE_LIMIT_DELAY = 100; // Delay between requests in ms
  private readonly EMBEDDING_DIMENSIONS = 384; // gte-small dimensions

  private requestCount = 0;
  private totalTokensUsed = 0;

  constructor() {
    console.log('TextEmbeddingService initialized with Supabase native embeddings');
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for embedding generation');
    }

    const processedText = this.preprocessText(text);
    
    try {
      this.requestCount++;
      
      const { data, error } = await supabase.functions.invoke('supabase-embeddings', {
        body: {
          texts: [processedText],
          model: this.MODEL,
          options: {
            normalize: true,
            truncate: true
          }
        }
      });

      if (error) {
        throw new Error(`Supabase embedding error: ${error.message}`);
      }

      if (!data || !data.embeddings || !Array.isArray(data.embeddings) || data.embeddings.length === 0) {
        throw new Error('Invalid response format from Supabase embedding function');
      }

      const embedding = data.embeddings[0];
      const tokens = data.usage?.total_tokens || this.estimateTokenCount(processedText);
      
      this.totalTokensUsed += tokens;

      const result: EmbeddingResult = {
        embedding: embedding,
        tokens: tokens,
        model: this.MODEL,
      };

      this.updateUsageStats(result.tokens);
      
      return result;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!texts || texts.length === 0) {
      return {
        successful: [],
        failed: [],
        totalTokens: 0,
        totalCost: 0, // Always 0 for Supabase embeddings
      };
    }

    console.log(`Starting batch embedding generation for ${texts.length} texts`);

    const successful: Array<{ index: number; embedding: number[]; tokens: number }> = [];
    const failed: Array<{ index: number; error: string; content: string }> = [];
    let totalTokens = 0;

    // Process in smaller batches to avoid overwhelming the system
    const batchSize = Math.min(this.MAX_BATCH_SIZE, 20);
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchIndices = Array.from({ length: batch.length }, (_, idx) => i + idx);
      
      try {
        // Filter out empty or invalid texts
        const validTexts = batch.filter(text => text && typeof text === 'string' && text.trim().length > 0);
        const validIndices = batchIndices.filter((_, idx) => {
          const text = batch[idx];
          return text && typeof text === 'string' && text.trim().length > 0;
        });

        if (validTexts.length === 0) {
          // Mark all as failed
          batch.forEach((text, idx) => {
            failed.push({
              index: batchIndices[idx],
              error: 'Empty or invalid text',
              content: text || ''
            });
          });
          continue;
        }

        // Call Supabase function for batch
        const { data, error } = await supabase.functions.invoke('supabase-embeddings', {
          body: {
            texts: validTexts,
            model: this.MODEL,
            options: {
              normalize: true,
              truncate: true
            }
          }
        });

        if (error) {
          console.error('Supabase batch embedding error:', error);
          // Mark all as failed
          validTexts.forEach((text, idx) => {
            failed.push({
              index: validIndices[idx],
              error: `Supabase error: ${error.message}`,
              content: text.substring(0, 100)
            });
          });
          continue;
        }

        if (data && data.embeddings && Array.isArray(data.embeddings)) {
          // Process successful embeddings
          data.embeddings.forEach((embedding: number[], idx: number) => {
            if (idx < validIndices.length) {
              const tokens = this.estimateTokenCount(validTexts[idx]);
              successful.push({
                index: validIndices[idx],
                embedding: embedding,
                tokens: tokens
              });
              totalTokens += tokens;
            }
          });
        } else {
          // Mark all as failed due to invalid response
          validTexts.forEach((text, idx) => {
            failed.push({
              index: validIndices[idx],
              error: 'Invalid response format',
              content: text.substring(0, 100)
            });
          });
        }

        // Rate limiting delay between batches
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
        }

      } catch (error: any) {
        console.error(`Batch embedding error for indices ${i}-${i + batch.length - 1}:`, error);
        
        // Mark entire batch as failed
        batch.forEach((text, idx) => {
          failed.push({
            index: batchIndices[idx],
            error: error.message || 'Unknown error',
            content: (text || '').substring(0, 100)
          });
        });
      }
    }

    this.updateUsageStats(totalTokens);

    console.log(`Batch embedding completed: ${successful.length} successful, ${failed.length} failed`);

    return {
      successful,
      failed,
      totalTokens,
      totalCost: 0 // Always 0 for Supabase embeddings
    };
  }

  /**
   * Process vector content items and generate embeddings
   */
  async processVectorContent(
    contents: VectorContent[],
    onProgress?: (current: number, total: number, currentItem?: VectorContent) => void,
    onBatchComplete?: (batchIndex: number, totalBatches: number, successful: number, failed: number) => void
  ): Promise<Array<VectorContent & { embedding?: number[]; error?: string }>> {
    if (!contents || contents.length === 0) {
      return [];
    }

    console.log(`Processing ${contents.length} vector content items`);

    const results: Array<VectorContent & { embedding?: number[]; error?: string }> = [...contents];
    const texts = contents.map(content => content.contentText);
    
    // Generate embeddings in batches
    const batchResult = await this.generateBatchEmbeddings(texts);
    
    // Apply successful embeddings
    batchResult.successful.forEach(({ index, embedding }) => {
      if (index < results.length) {
        results[index].embedding = embedding;
      }
    });

    // Apply errors
    batchResult.failed.forEach(({ index, error }) => {
      if (index < results.length) {
        results[index].error = error;
      }
    });

    // Call progress callback with final stats
    if (onProgress) {
      onProgress(contents.length, contents.length);
    }
    
    if (onBatchComplete) {
      onBatchComplete(1, 1, batchResult.successful.length, batchResult.failed.length);
    }

    console.log(`Vector content processing completed: ${batchResult.successful.length} successful, ${batchResult.failed.length} failed`);

    return results;
  }

  /**
   * Generate embedding for search queries
   */
  async generateSearchEmbedding(query: string): Promise<number[]> {
    const result = await this.generateEmbedding(query);
    return result.embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Preprocess text for optimal embedding generation
   */
  private preprocessText(text: string): string {
    if (!text) return '';
    
    // Remove extra whitespace and normalize
    let processed = text.trim().replace(/\s+/g, ' ');
    
    // Remove special characters that don't add semantic value
    processed = processed.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width characters
    
    // Truncate if too long (optimize for embedding quality)
    const maxWords = 500; // Reasonable limit for good embeddings
    const words = processed.split(' ');
    if (words.length > maxWords) {
      processed = words.slice(0, maxWords).join(' ') + '...';
    }
    
    return processed;
  }

  /**
   * Estimate token count for usage tracking
   */
  private estimateTokenCount(text: string): number {
    if (!text) return 0;
    // Simple estimation: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Update internal usage statistics
   */
  private updateUsageStats(tokens: number): void {
    this.totalTokensUsed += tokens;
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      totalTokensUsed: this.totalTokensUsed,
      totalCost: 0, // Always 0 for Supabase embeddings
      model: this.MODEL,
      embeddingDimensions: this.EMBEDDING_DIMENSIONS
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.requestCount = 0;
    this.totalTokensUsed = 0;
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    // Since we're using Supabase, always return true
    return true;
  }

  /**
   * Get service configuration info
   */
  getConfigInfo() {
    return {
      service: 'Supabase Native Embeddings',
      model: this.MODEL,
      dimensions: this.EMBEDDING_DIMENSIONS,
      maxTokens: this.MAX_TOKENS,
      maxBatchSize: this.MAX_BATCH_SIZE,
      costPerRequest: 0,
      configured: this.isConfigured()
    };
  }

  /**
   * Create a simple text search fallback when embeddings fail
   */
  createTextSearchFallback(query: string, contents: VectorContent[]): VectorContent[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    return contents
      .map(content => {
        const textLower = content.contentText.toLowerCase();
        let score = 0;
        
        // Exact phrase match
        if (textLower.includes(queryLower)) {
          score += 10;
        }
        
        // Individual word matches
        queryWords.forEach(word => {
          if (textLower.includes(word)) {
            score += 1;
          }
        });
        
        // Content type relevance boost
        if (content.contentType === 'ai_insight' || content.contentType === 'pain_point') {
          score *= 1.2;
        }
        
        return { content, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.content);
  }
}

// Export singleton instance
export const textEmbeddingService = new TextEmbeddingService();