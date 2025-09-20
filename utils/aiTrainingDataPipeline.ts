// Automated AI Training Data Pipeline
// Continuously processes new leads, insights, and calls for vector database training

import { Lead } from '../types';
import { supabase } from './supabase';
import { trainingDataCollector, VectorContent } from './aiTrainingDataCollector';
import { textEmbeddingService } from './textEmbeddingService';
import { vectorStorageService } from './vectorStorageService';

// Database Lead format (matches Supabase schema)
interface DatabaseLead {
  id: string;
  created_at: string;
  company_id: string;
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  notes: any; // JSON type
  issue_description: string;
  source_conversation_id: string;
  ai_insights: any; // JSON type
}

// Utility function to convert database lead to application lead
function convertDatabaseLeadToLead(dbLead: DatabaseLead): Lead {
  return {
    id: dbLead.id,
    companyId: dbLead.company_id,
    firstName: dbLead.first_name,
    lastName: dbLead.last_name,
    company: dbLead.company,
    email: dbLead.email,
    phone: dbLead.phone,
    status: dbLead.status as any, // Cast to LeadStatus enum
    source: dbLead.source as any, // Cast to LeadSource enum
    createdAt: dbLead.created_at,
    notes: Array.isArray(dbLead.notes) ? dbLead.notes : [],
    issueDescription: dbLead.issue_description,
    aiInsights: dbLead.ai_insights || null,
    // Add other optional fields as needed
  };
}

export interface PipelineJob {
  id: string;
  companyId: string;
  jobType: 'batch_process' | 'real_time' | 'reprocess';
  contentSource: 'leads' | 'ai_insights' | 'call_data' | 'notes';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startedAt?: string;
  completedAt?: string;
  errorDetails?: any;
  config: {
    batchSize: number;
    validateVectors: boolean;
    overwriteExisting: boolean;
    minQualityScore: number;
  };
}

export interface PipelineStats {
  totalJobsRun: number;
  successfulJobs: number;
  failedJobs: number;
  totalVectorsCreated: number;
  totalTokensUsed: number;
  totalCost: number;
  averageProcessingTime: number;
  lastRunTime?: string;
}

export class AITrainingDataPipeline {
  private readonly DEFAULT_BATCH_SIZE = 25;
  private readonly DEFAULT_MIN_QUALITY = 0.3;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between batches
  private readonly MAX_RETRIES = 3;

  private currentJobs = new Map<string, PipelineJob>();
  private stats: PipelineStats = {
    totalJobsRun: 0,
    successfulJobs: 0,
    failedJobs: 0,
    totalVectorsCreated: 0,
    totalTokensUsed: 0,
    totalCost: 0,
    averageProcessingTime: 0,
  };

  /**
   * Process all leads for a company in batch mode
   */
  async processBatchLeads(
    companyId: string,
    options: {
      batchSize?: number;
      validateVectors?: boolean;
      overwriteExisting?: boolean;
      minQualityScore?: number;
      onProgress?: (progress: { processed: number; total: number; currentLead?: string }) => void;
    } = {}
  ): Promise<{ jobId: string; success: boolean; error?: string }> {
    try {
      // Get all leads for the company
      const { data: dbLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (leadsError) {
        throw new Error(`Failed to fetch leads: ${leadsError.message}`);
      }

      if (!dbLeads || dbLeads.length === 0) {
        return { jobId: '', success: false, error: 'No leads found for company' };
      }

      // Convert database leads to application leads
      const leads = dbLeads.map(convertDatabaseLeadToLead);

      // Create pipeline job
      const job = await this.createPipelineJob({
        companyId,
        jobType: 'batch_process',
        contentSource: 'leads',
        totalItems: leads.length,
        config: {
          batchSize: options.batchSize || this.DEFAULT_BATCH_SIZE,
          validateVectors: options.validateVectors || false,
          overwriteExisting: options.overwriteExisting || false,
          minQualityScore: options.minQualityScore || this.DEFAULT_MIN_QUALITY,
        },
      });

      // Start processing in the background
      this.processLeadsBatch(job, leads, options.onProgress).catch(error => {
        console.error(`Batch processing failed for job ${job.id}:`, error);
        this.updateJobStatus(job.id, 'failed', { error: error.message });
      });

      return { jobId: job.id, success: true };

    } catch (error) {
      console.error('Error starting batch processing:', error);
      return { 
        jobId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Process a single lead in real-time mode
   */
  async processLeadRealTime(
    lead: Lead,
    options: {
      validateVectors?: boolean;
      minQualityScore?: number;
    } = {}
  ): Promise<{ success: boolean; vectorsCreated: number; error?: string }> {
    try {
      console.log(`Processing lead ${lead.id} in real-time...`);

      // Extract training data
      const vectorContents = await trainingDataCollector.processLeadForTraining(lead);
      
      if (vectorContents.length === 0) {
        return { success: true, vectorsCreated: 0 };
      }

      // Filter by quality score
      const qualityVectors = vectorContents.filter(v => 
        (v.qualityScore ?? 0) >= (options.minQualityScore || this.DEFAULT_MIN_QUALITY)
      );

      if (qualityVectors.length === 0) {
        console.log(`No vectors met quality threshold for lead ${lead.id}`);
        return { success: true, vectorsCreated: 0 };
      }

      // Generate embeddings
      const embeddingResult = await textEmbeddingService.generateVectorEmbeddings(qualityVectors);
      
      if (embeddingResult.failed.length > 0) {
        console.warn(`${embeddingResult.failed.length} vectors failed embedding generation`);
      }

      // Store vectors
      const storageResult = await vectorStorageService.storeBatchVectors(
        embeddingResult.successful,
        options.validateVectors || false
      );

      // Update statistics
      this.updateStats({
        vectorsCreated: storageResult.successful.length,
        tokensUsed: embeddingResult.stats.totalTokens,
        cost: embeddingResult.stats.totalCost,
      });

      console.log(`Real-time processing complete for lead ${lead.id}: ${storageResult.successful.length} vectors created`);

      return {
        success: true,
        vectorsCreated: storageResult.successful.length,
      };

    } catch (error) {
      console.error(`Real-time processing failed for lead ${lead.id}:`, error);
      return {
        success: false,
        vectorsCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reprocess existing data with updated algorithms or parameters
   */
  async reprocessData(
    companyId: string,
    options: {
      contentTypes?: string[];
      olderThan?: Date;
      newQualityThreshold?: number;
      batchSize?: number;
    } = {}
  ): Promise<{ jobId: string; success: boolean; error?: string }> {
    try {
      // Create reprocessing job
      const job = await this.createPipelineJob({
        companyId,
        jobType: 'reprocess',
        contentSource: 'leads', // Will be determined based on what needs reprocessing
        totalItems: 0, // Will be updated when we count items
        config: {
          batchSize: options.batchSize || this.DEFAULT_BATCH_SIZE,
          validateVectors: true, // Always validate during reprocessing
          overwriteExisting: true,
          minQualityScore: options.newQualityThreshold || this.DEFAULT_MIN_QUALITY,
        },
      });

      // Start reprocessing in the background
      this.reprocessDataBatch(job, options).catch(error => {
        console.error(`Reprocessing failed for job ${job.id}:`, error);
        this.updateJobStatus(job.id, 'failed', { error: error.message });
      });

      return { jobId: job.id, success: true };

    } catch (error) {
      console.error('Error starting reprocessing:', error);
      return {
        jobId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set up automatic processing for new leads
   */
  enableAutoProcessing(
    companyId: string,
    options: {
      realTimeEnabled: boolean;
      batchInterval?: number; // minutes
      qualityThreshold?: number;
    }
  ): boolean {
    try {
      // Store auto-processing configuration
      const config = {
        companyId,
        realTimeEnabled: options.realTimeEnabled,
        batchInterval: options.batchInterval || 60, // Default 1 hour
        qualityThreshold: options.qualityThreshold || this.DEFAULT_MIN_QUALITY,
        enabledAt: new Date().toISOString(),
      };

      // In a real implementation, this would be stored in a configuration table
      console.log('Auto-processing enabled for company:', companyId, config);

      // Set up periodic batch processing if enabled
      if (options.batchInterval && options.batchInterval > 0) {
        this.schedulePeriodicProcessing(companyId, options.batchInterval);
      }

      return true;

    } catch (error) {
      console.error('Error enabling auto-processing:', error);
      return false;
    }
  }

  /**
   * Get status of a pipeline job
   */
  getJobStatus(jobId: string): PipelineJob | null {
    return this.currentJobs.get(jobId) || null;
  }

  /**
   * Get pipeline statistics
   */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.currentJobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'running') {
      await this.updateJobStatus(jobId, 'cancelled');
      return true;
    }

    return false;
  }

  // Private methods

  private async createPipelineJob(jobData: Partial<PipelineJob>): Promise<PipelineJob> {
    const job: PipelineJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId: jobData.companyId!,
      jobType: jobData.jobType!,
      contentSource: jobData.contentSource!,
      status: 'pending',
      totalItems: jobData.totalItems || 0,
      processedItems: 0,
      failedItems: 0,
      config: jobData.config!,
    };

    this.currentJobs.set(job.id, job);
    
    // In a real implementation, this would also be stored in the database
    console.log(`Created pipeline job: ${job.id}`);
    
    return job;
  }

  private async processLeadsBatch(
    job: PipelineJob,
    leads: any[],
    onProgress?: (progress: { processed: number; total: number; currentLead?: string }) => void
  ): Promise<void> {
    const startTime = Date.now();
    await this.updateJobStatus(job.id, 'running', { startedAt: new Date().toISOString() });

    let totalVectorsCreated = 0;
    let totalTokensUsed = 0;
    let totalCost = 0;

    try {
      for (let i = 0; i < leads.length; i += job.config.batchSize) {
        // Check if job was cancelled
        const currentJob = this.currentJobs.get(job.id);
        if (currentJob?.status === 'cancelled') {
          console.log(`Job ${job.id} was cancelled`);
          return;
        }

        const batch = leads.slice(i, i + job.config.batchSize);
        console.log(`Processing batch ${Math.floor(i / job.config.batchSize) + 1}/${Math.ceil(leads.length / job.config.batchSize)}`);

        for (const leadData of batch) {
          try {
            // Convert database lead to application lead
            const lead = convertDatabaseLeadToLead(leadData);

            // Report progress
            if (onProgress) {
              onProgress({
                processed: i + batch.indexOf(leadData),
                total: leads.length,
                currentLead: `${lead.firstName} ${lead.lastName}`,
              });
            }

            // Process lead
            const result = await this.processLeadRealTime(lead, {
              validateVectors: job.config.validateVectors,
              minQualityScore: job.config.minQualityScore,
            });

            if (result.success) {
              totalVectorsCreated += result.vectorsCreated;
              job.processedItems++;
            } else {
              job.failedItems++;
              console.error(`Failed to process lead ${lead.id}:`, result.error);
            }

            // Update job progress
            await this.updateJobProgress(job.id, job.processedItems, job.failedItems);

          } catch (error) {
            job.failedItems++;
            console.error(`Error processing lead in batch:`, error);
          }
        }

        // Rate limiting between batches
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
      }

      // Job completed successfully
      const processingTime = Date.now() - startTime;
      await this.updateJobStatus(job.id, 'completed', {
        completedAt: new Date().toISOString(),
        vectorsCreated: totalVectorsCreated,
        processingTimeMs: processingTime,
      });

      // Update global statistics
      this.updateStats({
        vectorsCreated: totalVectorsCreated,
        tokensUsed: totalTokensUsed,
        cost: totalCost,
        processingTime: processingTime,
        jobCompleted: true,
      });

      console.log(`Batch processing completed for job ${job.id}: ${totalVectorsCreated} vectors created in ${processingTime}ms`);

    } catch (error) {
      await this.updateJobStatus(job.id, 'failed', { error: error.message });
      this.stats.failedJobs++;
      throw error;
    }
  }

  private async reprocessDataBatch(job: PipelineJob, options: any): Promise<void> {
    // Implementation for reprocessing existing data
    console.log(`Starting reprocessing job ${job.id} with options:`, options);
    
    // This would involve:
    // 1. Finding existing vectors that need reprocessing
    // 2. Re-extracting data with updated algorithms
    // 3. Generating new embeddings
    // 4. Updating or replacing existing vectors
    
    // For now, mark as completed (this would be a full implementation)
    await this.updateJobStatus(job.id, 'completed', {
      completedAt: new Date().toISOString(),
      note: 'Reprocessing implementation pending',
    });
  }

  private schedulePeriodicProcessing(companyId: string, intervalMinutes: number): void {
    // Set up periodic processing
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(async () => {
      try {
        console.log(`Running periodic processing for company ${companyId}`);
        
        // Check for new leads since last processing
        const lastRun = this.stats.lastRunTime;
        const cutoffTime = lastRun ? new Date(lastRun) : new Date(Date.now() - intervalMs);
        
        const { data: dbLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('company_id', companyId)
          .gte('created_at', cutoffTime.toISOString());

        if (dbLeads && dbLeads.length > 0) {
          console.log(`Found ${dbLeads.length} new leads for periodic processing`);
          
          // Process new leads
          for (const dbLead of dbLeads) {
            const lead = convertDatabaseLeadToLead(dbLead);
            await this.processLeadRealTime(lead);
          }
        }

        this.stats.lastRunTime = new Date().toISOString();

      } catch (error) {
        console.error('Error in periodic processing:', error);
      }
    }, intervalMs);

    console.log(`Periodic processing scheduled every ${intervalMinutes} minutes for company ${companyId}`);
  }

  private async updateJobStatus(jobId: string, status: PipelineJob['status'], updates: any = {}): Promise<void> {
    const job = this.currentJobs.get(jobId);
    if (!job) return;

    job.status = status;
    Object.assign(job, updates);

    // In a real implementation, this would update the database
    console.log(`Job ${jobId} status updated to: ${status}`);
  }

  private async updateJobProgress(jobId: string, processed: number, failed: number): Promise<void> {
    const job = this.currentJobs.get(jobId);
    if (!job) return;

    job.processedItems = processed;
    job.failedItems = failed;

    // In a real implementation, this would update the database
  }

  private updateStats(updates: {
    vectorsCreated?: number;
    tokensUsed?: number;
    cost?: number;
    processingTime?: number;
    jobCompleted?: boolean;
  }): void {
    if (updates.vectorsCreated) {
      this.stats.totalVectorsCreated += updates.vectorsCreated;
    }
    
    if (updates.tokensUsed) {
      this.stats.totalTokensUsed += updates.tokensUsed;
    }
    
    if (updates.cost) {
      this.stats.totalCost += updates.cost;
    }
    
    if (updates.jobCompleted) {
      this.stats.totalJobsRun++;
      this.stats.successfulJobs++;
      
      if (updates.processingTime) {
        const totalTime = this.stats.averageProcessingTime * (this.stats.totalJobsRun - 1) + updates.processingTime;
        this.stats.averageProcessingTime = totalTime / this.stats.totalJobsRun;
      }
    }
  }

  /**
   * Monitor system health and performance
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: {
      activeJobs: number;
      errorRate: number;
      averageProcessingTime: number;
      lastSuccessfulRun?: string;
    };
    recommendations: string[];
  } {
    const activeJobs = Array.from(this.currentJobs.values()).filter(j => j.status === 'running').length;
    const errorRate = this.stats.totalJobsRun > 0 ? this.stats.failedJobs / this.stats.totalJobsRun : 0;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];
    
    if (errorRate > 0.1) {
      status = 'warning';
      recommendations.push('High error rate detected - review failed jobs');
    }
    
    if (errorRate > 0.3) {
      status = 'critical';
      recommendations.push('Critical error rate - investigate system issues');
    }
    
    if (activeJobs > 5) {
      status = status === 'critical' ? 'critical' : 'warning';
      recommendations.push('High number of active jobs - consider resource scaling');
    }
    
    if (this.stats.averageProcessingTime > 300000) { // 5 minutes
      recommendations.push('Slow processing times - optimize batch size or system resources');
    }

    return {
      status,
      metrics: {
        activeJobs,
        errorRate: Math.round(errorRate * 100) / 100,
        averageProcessingTime: Math.round(this.stats.averageProcessingTime),
        lastSuccessfulRun: this.stats.lastRunTime,
      },
      recommendations,
    };
  }
}

// Export singleton instance
export const aiTrainingDataPipeline = new AITrainingDataPipeline();