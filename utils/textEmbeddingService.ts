// Text Embedding Service
// Generates vector embeddings using OpenAI's text-embedding-ada-002 model

import { VectorContent } from './aiTrainingDataCollector';

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface BatchEmbeddingResult {
  successful: Array<{ index: number; embedding: number[]; tokens: number }>;
  failed: Array<{ index: number; error: string; content: string }>;
  totalTokens: number;
  totalCost: number; // Estimated cost in USD
}

export class TextEmbeddingService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
  private readonly MODEL = 'text-embedding-ada-002';
  private readonly MAX_TOKENS = 8192; // Max tokens per request for ada-002
  private readonly MAX_BATCH_SIZE = 100; // Max items per batch request
  private readonly RATE_LIMIT_DELAY = 100; // Delay between requests in ms
  private readonly COST_PER_1K_TOKENS = 0.0001; // OpenAI pricing for ada-002

  private apiKey: string;
  private requestCount = 0;
  private totalTokensUsed = 0;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not provided. Embedding generation will fail.');
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for embedding generation');
    }

    const processedText = this.preprocessText(text);
    
    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          input: processedText,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const result: EmbeddingResult = {
        embedding: data.data[0].embedding,
        tokens: data.usage.total_tokens,
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
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!texts || texts.length === 0) {
      return {
        successful: [],
        failed: [],
        totalTokens: 0,
        totalCost: 0,
      };
    }

    const result: BatchEmbeddingResult = {
      successful: [],
      failed: [],
      totalTokens: 0,
      totalCost: 0,
    };

    // Process in batches
    for (let i = 0; i < texts.length; i += this.MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + this.MAX_BATCH_SIZE);
      const batchResult = await this.processBatch(batch, i);
      
      result.successful.push(...batchResult.successful);
      result.failed.push(...batchResult.failed);
      result.totalTokens += batchResult.totalTokens;

      // Rate limiting delay between batches
      if (i + this.MAX_BATCH_SIZE < texts.length) {
        await this.delay(this.RATE_LIMIT_DELAY);
      }
    }

    result.totalCost = this.calculateCost(result.totalTokens);
    
    console.log(`Batch embedding complete: ${result.successful.length} successful, ${result.failed.length} failed, ${result.totalTokens} tokens, $${result.totalCost.toFixed(4)} cost`);
    
    return result;
  }

  /**
   * Generate embeddings for vector content objects
   */
  async generateVectorEmbeddings(vectorContents: VectorContent[]): Promise<{
    successful: Array<VectorContent & { embedding: number[] }>;
    failed: Array<VectorContent & { error: string }>;
    stats: {
      totalProcessed: number;
      successfulCount: number;
      failedCount: number;
      totalTokens: number;
      totalCost: number;
    };
  }> {
    const texts = vectorContents.map(vc => vc.contentText);
    const batchResult = await this.generateBatchEmbeddings(texts);
    
    const successful: Array<VectorContent & { embedding: number[] }> = [];
    const failed: Array<VectorContent & { error: string }> = [];

    // Map successful embeddings back to vector content
    batchResult.successful.forEach(({ index, embedding }) => {
      successful.push({
        ...vectorContents[index],
        embedding,
      });
    });

    // Map failed embeddings back to vector content
    batchResult.failed.forEach(({ index, error }) => {
      failed.push({
        ...vectorContents[index],
        error,
      });
    });

    return {
      successful,
      failed,
      stats: {
        totalProcessed: vectorContents.length,
        successfulCount: successful.length,
        failedCount: failed.length,
        totalTokens: batchResult.totalTokens,
        totalCost: batchResult.totalCost,
      },
    };
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
   * Get usage statistics
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      totalTokensUsed: this.totalTokensUsed,
      estimatedCost: this.calculateCost(this.totalTokensUsed),
      averageTokensPerRequest: this.requestCount > 0 ? this.totalTokensUsed / this.requestCount : 0,
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats() {
    this.requestCount = 0;
    this.totalTokensUsed = 0;
  }

  // Private helper methods

  private async processBatch(texts: string[], startIndex: number): Promise<BatchEmbeddingResult> {
    const processedTexts = texts.map(text => this.preprocessText(text));
    
    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          input: processedTexts,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`;
        
        // Mark all texts in this batch as failed
        const failed = texts.map((text, index) => ({
          index: startIndex + index,
          error: errorMessage,
          content: text.substring(0, 100) + '...',
        }));

        return {
          successful: [],
          failed,
          totalTokens: 0,
          totalCost: 0,
        };
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const successful = data.data.map((item: any, index: number) => ({
        index: startIndex + index,
        embedding: item.embedding,
        tokens: Math.floor(data.usage.total_tokens / data.data.length), // Approximate tokens per item
      }));

      this.updateUsageStats(data.usage.total_tokens);

      return {
        successful,
        failed: [],
        totalTokens: data.usage.total_tokens,
        totalCost: this.calculateCost(data.usage.total_tokens),
      };
    } catch (error) {
      console.error('Error processing batch:', error);
      
      // Mark all texts in this batch as failed
      const failed = texts.map((text, index) => ({
        index: startIndex + index,
        error: error instanceof Error ? error.message : 'Unknown error',
        content: text.substring(0, 100) + '...',
      }));

      return {
        successful: [],
        failed,
        totalTokens: 0,
        totalCost: 0,
      };
    }
  }

  private preprocessText(text: string): string {
    if (!text) return '';
    
    // Remove excessive whitespace
    let processed = text.replace(/\s+/g, ' ').trim();
    
    // Remove special characters that might cause issues
    processed = processed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Truncate if too long (approximate token count = characters / 4)
    const maxChars = this.MAX_TOKENS * 4;
    if (processed.length > maxChars) {
      processed = processed.substring(0, maxChars - 3) + '...';
    }
    
    return processed;
  }

  private updateUsageStats(tokens: number) {
    this.requestCount++;
    this.totalTokensUsed += tokens;
  }

  private calculateCost(tokens: number): number {
    return (tokens / 1000) * this.COST_PER_1K_TOKENS;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate that an embedding array is valid
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) return false;
    if (embedding.length !== 1536) return false; // ada-002 dimension
    
    // Check for NaN or infinite values
    return embedding.every(val => typeof val === 'number' && isFinite(val));
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