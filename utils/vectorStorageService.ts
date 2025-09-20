// Vector Storage System
// Manages storage and retrieval of vectorized training data in Supabase

import { supabase } from './supabase';
import { VectorContent } from './aiTrainingDataCollector';

export interface StoredVector {
  id: string;
  company_id: string;
  lead_id?: string;
  content_text: string;
  content_type: string;
  content_subtype?: string;
  embedding?: number[];
  metadata: Record<string, any>;
  source_data?: any;
  created_at: string;
  updated_at: string;
  training_weight: number;
  quality_score?: number;
  is_validated: boolean;
  validation_notes?: string;
}

export interface VectorSearchResult {
  id: string;
  content_text: string;
  content_type: string;
  content_subtype?: string;
  similarity_score: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface VectorStats {
  total_vectors: number;
  by_content_type: Record<string, number>;
  by_company: Record<string, number>;
  avg_quality_score: number;
  total_validated: number;
  recent_activity: {
    last_24h: number;
    last_7d: number;
    last_30d: number;
  };
}

export class VectorStorageService {
  /**
   * Store a single vector in the database
   */
  async storeVector(
    vectorContent: VectorContent & { embedding: number[] },
    isValidated: boolean = false
  ): Promise<string | null> {
    try {
      const vectorData = {
        company_id: vectorContent.companyId,
        lead_id: vectorContent.leadId || null,
        content_text: vectorContent.contentText,
        content_type: vectorContent.contentType,
        content_subtype: vectorContent.contentSubtype || null,
        embedding: `[${vectorContent.embedding.join(',')}]`, // PostgreSQL array format
        metadata: vectorContent.metadata || {},
        source_data: vectorContent.sourceData || null,
        training_weight: vectorContent.trainingWeight || 1.0,
        quality_score: vectorContent.qualityScore || null,
        is_validated: isValidated,
      };

      const { data, error } = await supabase
        .from('ai_training_vectors')
        .insert(vectorData)
        .select('id')
        .single();

      if (error) {
        console.error('Error storing vector:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in storeVector:', error);
      return null;
    }
  }

  /**
   * Store multiple vectors in a batch
   */
  async storeBatchVectors(
    vectorContents: Array<VectorContent & { embedding: number[] }>,
    isValidated: boolean = false
  ): Promise<{
    successful: string[];
    failed: Array<{ error: string; content: VectorContent }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ error: string; content: VectorContent }> = [];
    
    // Process in smaller batches to avoid database limits
    const batchSize = 50;
    
    for (let i = 0; i < vectorContents.length; i += batchSize) {
      const batch = vectorContents.slice(i, i + batchSize);
      
      try {
        const vectorData = batch.map(vc => ({
          company_id: vc.companyId,
          lead_id: vc.leadId || null,
          content_text: vc.contentText,
          content_type: vc.contentType,
          content_subtype: vc.contentSubtype || null,
          embedding: `[${vc.embedding.join(',')}]`,
          metadata: vc.metadata || {},
          source_data: vc.sourceData || null,
          training_weight: vc.trainingWeight || 1.0,
          quality_score: vc.qualityScore || null,
          is_validated: isValidated,
        }));

        const { data, error } = await supabase
          .from('ai_training_vectors')
          .insert(vectorData)
          .select('id');

        if (error) {
          console.error('Batch insert error:', error);
          batch.forEach(vc => {
            failed.push({ error: error.message, content: vc });
          });
        } else if (data) {
          successful.push(...data.map(d => d.id));
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        batch.forEach(vc => {
          failed.push({ 
            error: error instanceof Error ? error.message : 'Unknown error', 
            content: vc 
          });
        });
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Batch storage complete: ${successful.length} successful, ${failed.length} failed`);
    
    return { successful, failed };
  }

  /**
   * Update vector validation status
   */
  async validateVector(
    vectorId: string,
    isValidated: boolean,
    validationNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_training_vectors')
        .update({
          is_validated: isValidated,
          validation_notes: validationNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vectorId);

      if (error) {
        console.error('Error updating vector validation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in validateVector:', error);
      return false;
    }
  }

  /**
   * Update vector quality score
   */
  async updateQualityScore(vectorId: string, qualityScore: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_training_vectors')
        .update({
          quality_score: Math.max(0, Math.min(1, qualityScore)), // Clamp to 0-1
          updated_at: new Date().toISOString(),
        })
        .eq('id', vectorId);

      if (error) {
        console.error('Error updating quality score:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateQualityScore:', error);
      return false;
    }
  }

  /**
   * Retrieve vectors by company
   */
  async getVectorsByCompany(
    companyId: string,
    options: {
      contentTypes?: string[];
      validated?: boolean;
      minQualityScore?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<StoredVector[]> {
    try {
      let query = supabase
        .from('ai_training_vectors')
        .select('*')
        .eq('company_id', companyId);

      if (options.contentTypes && options.contentTypes.length > 0) {
        query = query.in('content_type', options.contentTypes);
      }

      if (options.validated !== undefined) {
        query = query.eq('is_validated', options.validated);
      }

      if (options.minQualityScore !== undefined) {
        query = query.gte('quality_score', options.minQualityScore);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(options.limit || 100);

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error retrieving vectors:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVectorsByCompany:', error);
      return [];
    }
  }

  /**
   * Retrieve vectors for a specific lead
   */
  async getVectorsByLead(leadId: string): Promise<StoredVector[]> {
    try {
      const { data, error } = await supabase
        .from('ai_training_vectors')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error retrieving lead vectors:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getVectorsByLead:', error);
      return [];
    }
  }

  /**
   * Delete vectors by lead (when lead is deleted)
   */
  async deleteVectorsByLead(leadId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_training_vectors')
        .delete()
        .eq('lead_id', leadId);

      if (error) {
        console.error('Error deleting lead vectors:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteVectorsByLead:', error);
      return false;
    }
  }

  /**
   * Delete old vectors to manage storage
   */
  async cleanupOldVectors(
    companyId: string,
    olderThanDays: number = 365,
    keepValidated: boolean = true
  ): Promise<{ deletedCount: number; error?: string }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let query = supabase
        .from('ai_training_vectors')
        .delete()
        .eq('company_id', companyId)
        .lt('created_at', cutoffDate.toISOString());

      if (keepValidated) {
        query = query.eq('is_validated', false);
      }

      const { error, count } = await query;

      if (error) {
        console.error('Error cleaning up vectors:', error);
        return { deletedCount: 0, error: error.message };
      }

      return { deletedCount: count || 0 };
    } catch (error) {
      console.error('Error in cleanupOldVectors:', error);
      return { 
        deletedCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get vector storage statistics
   */
  async getVectorStats(companyId?: string): Promise<VectorStats> {
    try {
      let baseQuery = supabase.from('ai_training_vectors');
      
      if (companyId) {
        baseQuery = baseQuery.select('*').eq('company_id', companyId);
      } else {
        baseQuery = baseQuery.select('*');
      }

      const { data: vectors, error } = await baseQuery;

      if (error) {
        console.error('Error getting vector stats:', error);
        return this.getEmptyStats();
      }

      if (!vectors || vectors.length === 0) {
        return this.getEmptyStats();
      }

      // Calculate statistics
      const stats: VectorStats = {
        total_vectors: vectors.length,
        by_content_type: {},
        by_company: {},
        avg_quality_score: 0,
        total_validated: 0,
        recent_activity: {
          last_24h: 0,
          last_7d: 0,
          last_30d: 0,
        },
      };

      const now = new Date();
      const day24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const day7dAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const day30dAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalQualityScore = 0;
      let qualityScoreCount = 0;

      vectors.forEach(vector => {
        // Content type distribution
        stats.by_content_type[vector.content_type] = 
          (stats.by_content_type[vector.content_type] || 0) + 1;

        // Company distribution
        stats.by_company[vector.company_id] = 
          (stats.by_company[vector.company_id] || 0) + 1;

        // Validation count
        if (vector.is_validated) {
          stats.total_validated++;
        }

        // Quality score average
        if (vector.quality_score !== null && vector.quality_score !== undefined) {
          totalQualityScore += vector.quality_score;
          qualityScoreCount++;
        }

        // Recent activity
        const createdAt = new Date(vector.created_at);
        if (createdAt > day24hAgo) stats.recent_activity.last_24h++;
        if (createdAt > day7dAgo) stats.recent_activity.last_7d++;
        if (createdAt > day30dAgo) stats.recent_activity.last_30d++;
      });

      stats.avg_quality_score = qualityScoreCount > 0 ? totalQualityScore / qualityScoreCount : 0;

      return stats;
    } catch (error) {
      console.error('Error in getVectorStats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Search for vectors with text similarity (fallback when embeddings not available)
   */
  async searchVectorsText(
    companyId: string,
    searchText: string,
    options: {
      contentTypes?: string[];
      validated?: boolean;
      limit?: number;
    } = {}
  ): Promise<StoredVector[]> {
    try {
      let query = supabase
        .from('ai_training_vectors')
        .select('*')
        .eq('company_id', companyId)
        .textSearch('content_text', searchText);

      if (options.contentTypes && options.contentTypes.length > 0) {
        query = query.in('content_type', options.contentTypes);
      }

      if (options.validated !== undefined) {
        query = query.eq('is_validated', options.validated);
      }

      query = query
        .order('quality_score', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(options.limit || 20);

      const { data, error } = await query;

      if (error) {
        console.error('Error in text search:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchVectorsText:', error);
      return [];
    }
  }

  /**
   * Export vectors for external training or analysis
   */
  async exportVectors(
    companyId: string,
    options: {
      contentTypes?: string[];
      validated?: boolean;
      format?: 'json' | 'csv';
      includeEmbeddings?: boolean;
    } = {}
  ): Promise<string> {
    try {
      const vectors = await this.getVectorsByCompany(companyId, {
        contentTypes: options.contentTypes,
        validated: options.validated,
        limit: 10000, // Large limit for export
      });

      if (options.format === 'csv') {
        return this.vectorsToCSV(vectors, options.includeEmbeddings || false);
      } else {
        return this.vectorsToJSON(vectors, options.includeEmbeddings || false);
      }
    } catch (error) {
      console.error('Error exporting vectors:', error);
      throw error;
    }
  }

  // Private helper methods

  private getEmptyStats(): VectorStats {
    return {
      total_vectors: 0,
      by_content_type: {},
      by_company: {},
      avg_quality_score: 0,
      total_validated: 0,
      recent_activity: {
        last_24h: 0,
        last_7d: 0,
        last_30d: 0,
      },
    };
  }

  private vectorsToJSON(vectors: StoredVector[], includeEmbeddings: boolean): string {
    const exportData = vectors.map(v => ({
      id: v.id,
      content_text: v.content_text,
      content_type: v.content_type,
      content_subtype: v.content_subtype,
      metadata: v.metadata,
      created_at: v.created_at,
      quality_score: v.quality_score,
      training_weight: v.training_weight,
      is_validated: v.is_validated,
      ...(includeEmbeddings && { embedding: v.embedding }),
    }));

    return JSON.stringify(exportData, null, 2);
  }

  private vectorsToCSV(vectors: StoredVector[], includeEmbeddings: boolean): string {
    if (vectors.length === 0) return '';

    const headers = [
      'id', 'content_text', 'content_type', 'content_subtype',
      'created_at', 'quality_score', 'training_weight', 'is_validated'
    ];

    if (includeEmbeddings) {
      headers.push('embedding');
    }

    const csvRows = [headers.join(',')];

    vectors.forEach(v => {
      const row = [
        v.id,
        `"${(v.content_text || '').replace(/"/g, '""')}"`,
        v.content_type,
        v.content_subtype || '',
        v.created_at,
        v.quality_score || '',
        v.training_weight,
        v.is_validated
      ];

      if (includeEmbeddings && v.embedding) {
        row.push(`"[${v.embedding.join(',')}]"`);
      }

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

// Export singleton instance
export const vectorStorageService = new VectorStorageService();