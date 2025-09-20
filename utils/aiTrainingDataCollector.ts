// AI Training Data Collection Service
// Extracts and processes data from leads, insights, and calls for vectorization

import { Lead, AIInsights, CallDetails, Note } from '../types';
import { supabase } from './supabase';

export interface VectorContent {
  contentText: string;
  contentType: 'ai_insight' | 'call_transcript' | 'call_summary' | 'lead_note' | 'interaction_log' | 'pain_point' | 'next_step' | 'qualification_reason' | 'legal_analysis';
  contentSubtype?: string;
  metadata: Record<string, any>;
  sourceData: any;
  leadId?: string;
  companyId: string;
  trainingWeight?: number;
  qualityScore?: number;
}

export class AITrainingDataCollector {
  private readonly MAX_CONTENT_LENGTH = 8000; // Max tokens for embedding
  private readonly MIN_CONTENT_LENGTH = 10;   // Minimum useful content

  /**
   * Extract training data from a lead's AI insights
   */
  extractFromAIInsights(lead: Lead): VectorContent[] {
    if (!lead.aiInsights) return [];

    const vectors: VectorContent[] = [];
    const insights = lead.aiInsights;
    const baseMetadata = {
      leadId: lead.id,
      leadStatus: lead.status,
      leadSource: lead.source,
      serviceType: insights.serviceType || 'general',
      timestamp: new Date().toISOString(),
      companyName: lead.company,
      leadName: `${lead.firstName} ${lead.lastName}`,
    };

    // 1. Qualification Analysis
    if (insights.justification && insights.justification.length > this.MIN_CONTENT_LENGTH) {
      vectors.push({
        contentText: insights.justification,
        contentType: 'ai_insight',
        contentSubtype: 'qualification_reason',
        metadata: {
          ...baseMetadata,
          qualificationScore: insights.qualificationScore,
          outcomeType: 'qualification',
        },
        sourceData: insights,
        leadId: lead.id,
        companyId: lead.companyId,
        qualityScore: this.calculateQualityScore(insights.justification, 'qualification'),
        trainingWeight: this.calculateTrainingWeight(insights.qualificationScore),
      });
    }

    // 2. Pain Points (each as separate vector)
    insights.keyPainPoints?.forEach((painPoint, index) => {
      if (painPoint && painPoint.length > this.MIN_CONTENT_LENGTH) {
        vectors.push({
          contentText: painPoint,
          contentType: 'pain_point',
          contentSubtype: `pain_point_${index + 1}`,
          metadata: {
            ...baseMetadata,
            painPointIndex: index,
            totalPainPoints: insights.keyPainPoints?.length || 0,
            outcomeType: 'pain_identification',
          },
          sourceData: { painPoint, fullInsights: insights },
          leadId: lead.id,
          companyId: lead.companyId,
          qualityScore: this.calculateQualityScore(painPoint, 'pain_point'),
          trainingWeight: 1.2, // Pain points are valuable for training
        });
      }
    });

    // 3. Next Steps (each as separate vector)
    insights.suggestedNextSteps?.forEach((nextStep, index) => {
      if (nextStep && nextStep.length > this.MIN_CONTENT_LENGTH) {
        vectors.push({
          contentText: nextStep,
          contentType: 'next_step',
          contentSubtype: `next_step_${index + 1}`,
          metadata: {
            ...baseMetadata,
            nextStepIndex: index,
            totalNextSteps: insights.suggestedNextSteps?.length || 0,
            outcomeType: 'action_recommendation',
          },
          sourceData: { nextStep, fullInsights: insights },
          leadId: lead.id,
          companyId: lead.companyId,
          qualityScore: this.calculateQualityScore(nextStep, 'next_step'),
          trainingWeight: 1.1,
        });
      }
    });

    // 4. Legal-Specific Analysis
    if (insights.legalSpecific && insights.serviceType === 'legal') {
      const legalContent = this.formatLegalAnalysis(insights.legalSpecific);
      if (legalContent.length > this.MIN_CONTENT_LENGTH) {
        vectors.push({
          contentText: legalContent,
          contentType: 'legal_analysis',
          contentSubtype: insights.legalSpecific.caseType || 'general_legal',
          metadata: {
            ...baseMetadata,
            caseType: insights.legalSpecific.caseType,
            urgencyLevel: insights.legalSpecific.urgencyLevel,
            jurisdiction: insights.legalSpecific.jurisdiction,
            potentialValue: insights.legalSpecific.potentialValue,
            outcomeType: 'legal_analysis',
          },
          sourceData: insights.legalSpecific,
          leadId: lead.id,
          companyId: lead.companyId,
          qualityScore: this.calculateQualityScore(legalContent, 'legal'),
          trainingWeight: 1.3, // Legal analysis is high value
        });
      }
    }

    // 5. Detailed Analysis (if available and lengthy)
    if (insights.detailedAnalysis && insights.detailedAnalysis.length > this.MIN_CONTENT_LENGTH) {
      vectors.push({
        contentText: this.truncateContent(insights.detailedAnalysis),
        contentType: 'ai_insight',
        contentSubtype: 'detailed_analysis',
        metadata: {
          ...baseMetadata,
          isLengthyContent: insights.isLengthy || false,
          analysisLength: insights.detailedAnalysis.length,
          outcomeType: 'comprehensive_analysis',
        },
        sourceData: insights,
        leadId: lead.id,
        companyId: lead.companyId,
        qualityScore: this.calculateQualityScore(insights.detailedAnalysis, 'detailed'),
        trainingWeight: 1.4, // Detailed analysis is very valuable
      });
    }

    return vectors;
  }

  /**
   * Extract training data from call details
   */
  extractFromCallDetails(lead: Lead): VectorContent[] {
    if (!lead.callDetails) return [];

    const vectors: VectorContent[] = [];
    const callDetails = lead.callDetails;
    const baseMetadata = {
      leadId: lead.id,
      leadStatus: lead.status,
      conversationId: callDetails.conversationId,
      agentId: callDetails.agentId,
      callDuration: callDetails.callDuration,
      timestamp: callDetails.callStartTime || new Date().toISOString(),
      companyName: lead.company,
      leadName: `${lead.firstName} ${lead.lastName}`,
    };

    // 1. Call Summary
    if (callDetails.transcriptSummary && callDetails.transcriptSummary.length > this.MIN_CONTENT_LENGTH) {
      vectors.push({
        contentText: callDetails.transcriptSummary,
        contentType: 'call_summary',
        contentSubtype: 'transcript_summary',
        metadata: {
          ...baseMetadata,
          summaryTitle: callDetails.summaryTitle,
          outcomeType: 'call_summary',
        },
        sourceData: callDetails,
        leadId: lead.id,
        companyId: lead.companyId,
        qualityScore: this.calculateQualityScore(callDetails.transcriptSummary, 'call_summary'),
        trainingWeight: 1.0,
      });
    }

    // 2. Call History Patterns
    if (callDetails.callHistory && callDetails.callHistory.length > 0) {
      const callPattern = this.analyzeCallPattern(callDetails.callHistory);
      if (callPattern.length > this.MIN_CONTENT_LENGTH) {
        vectors.push({
          contentText: callPattern,
          contentType: 'interaction_log',
          contentSubtype: 'call_pattern',
          metadata: {
            ...baseMetadata,
            totalCalls: callDetails.callHistory.length,
            callTypes: callDetails.callHistory.map(c => c.type),
            callOutcomes: callDetails.callHistory.map(c => c.status),
            outcomeType: 'interaction_pattern',
          },
          sourceData: callDetails.callHistory,
          leadId: lead.id,
          companyId: lead.companyId,
          qualityScore: this.calculateQualityScore(callPattern, 'call_pattern'),
          trainingWeight: 0.9,
        });
      }
    }

    return vectors;
  }

  /**
   * Extract training data from lead notes
   */
  extractFromNotes(lead: Lead): VectorContent[] {
    if (!lead.notes || lead.notes.length === 0) return [];

    const vectors: VectorContent[] = [];
    const baseMetadata = {
      leadId: lead.id,
      leadStatus: lead.status,
      companyName: lead.company,
      leadName: `${lead.firstName} ${lead.lastName}`,
    };

    lead.notes.forEach((note, index) => {
      if (note.text && note.text.length > this.MIN_CONTENT_LENGTH) {
        vectors.push({
          contentText: note.text,
          contentType: 'lead_note',
          contentSubtype: 'user_note',
          metadata: {
            ...baseMetadata,
            noteIndex: index,
            noteId: note.id,
            noteCreatedAt: note.createdAt,
            totalNotes: lead.notes.length,
            outcomeType: 'user_interaction',
          },
          sourceData: note,
          leadId: lead.id,
          companyId: lead.companyId,
          qualityScore: this.calculateQualityScore(note.text, 'note'),
          trainingWeight: 0.8, // User notes are somewhat valuable but less structured
        });
      }
    });

    return vectors;
  }

  /**
   * Extract training data from lead interactions
   */
  extractFromLeadInteractions(lead: Lead): VectorContent[] {
    const vectors: VectorContent[] = [];
    const baseMetadata = {
      leadId: lead.id,
      leadStatus: lead.status,
      leadSource: lead.source,
      companyName: lead.company,
      leadName: `${lead.firstName} ${lead.lastName}`,
      createdAt: lead.createdAt,
    };

    // 1. Issue Description
    if (lead.issueDescription && lead.issueDescription.length > this.MIN_CONTENT_LENGTH) {
      vectors.push({
        contentText: lead.issueDescription,
        contentType: 'interaction_log',
        contentSubtype: 'issue_description',
        metadata: {
          ...baseMetadata,
          interactionType: 'initial_contact',
          outcomeType: 'problem_statement',
        },
        sourceData: { issueDescription: lead.issueDescription, lead },
        leadId: lead.id,
        companyId: lead.companyId,
        qualityScore: this.calculateQualityScore(lead.issueDescription, 'issue'),
        trainingWeight: 1.1, // Issue descriptions are valuable for understanding problems
      });
    }

    // 2. Status Progression Context
    const statusContext = this.createStatusContext(lead);
    if (statusContext.length > this.MIN_CONTENT_LENGTH) {
      vectors.push({
        contentText: statusContext,
        contentType: 'interaction_log',
        contentSubtype: 'status_progression',
        metadata: {
          ...baseMetadata,
          currentStatus: lead.status,
          lastContactTime: lead.lastContactTime,
          hasCallerTracking: !!lead.callerTracking,
          outcomeType: 'lead_progression',
        },
        sourceData: lead,
        leadId: lead.id,
        companyId: lead.companyId,
        qualityScore: this.calculateQualityScore(statusContext, 'status'),
        trainingWeight: 0.7,
      });
    }

    return vectors;
  }

  /**
   * Process all training data from a lead
   */
  async processLeadForTraining(lead: Lead): Promise<VectorContent[]> {
    const allVectors: VectorContent[] = [];

    try {
      // Extract from different data sources
      allVectors.push(...this.extractFromAIInsights(lead));
      allVectors.push(...this.extractFromCallDetails(lead));
      allVectors.push(...this.extractFromNotes(lead));
      allVectors.push(...this.extractFromLeadInteractions(lead));

      // Filter out low-quality content
      const qualityVectors = allVectors.filter(v => 
        (v.qualityScore ?? 0) >= 0.3 && 
        v.contentText.length >= this.MIN_CONTENT_LENGTH
      );

      console.log(`Processed lead ${lead.id}: ${allVectors.length} total vectors, ${qualityVectors.length} quality vectors`);
      
      return qualityVectors;
    } catch (error) {
      console.error(`Error processing lead ${lead.id} for training:`, error);
      return [];
    }
  }

  /**
   * Batch process multiple leads
   */
  async batchProcessLeads(leads: Lead[], companyId: string): Promise<VectorContent[]> {
    const allVectors: VectorContent[] = [];
    const batchSize = 10; // Process in batches to avoid memory issues

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leads.length / batchSize)}`);

      const batchPromises = batch.map(lead => this.processLeadForTraining(lead));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allVectors.push(...result.value);
        } else {
          console.error(`Failed to process lead ${batch[index].id}:`, result.reason);
        }
      });

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Batch processing complete: ${allVectors.length} vectors from ${leads.length} leads`);
    return allVectors;
  }

  // Private helper methods

  private calculateQualityScore(content: string, type: string): number {
    let score = 0.5; // Base score

    // Content length scoring
    if (content.length > 100) score += 0.1;
    if (content.length > 300) score += 0.1;
    if (content.length > 500) score += 0.1;

    // Content richness scoring
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) score += 0.1;
    if (sentences.length > 5) score += 0.1;

    // Specific content type scoring
    switch (type) {
      case 'qualification':
        if (content.includes('because') || content.includes('due to')) score += 0.1;
        if (content.includes('score') || content.includes('likely')) score += 0.05;
        break;
      case 'pain_point':
        if (content.includes('need') || content.includes('problem') || content.includes('issue')) score += 0.1;
        break;
      case 'next_step':
        if (content.includes('should') || content.includes('recommend') || content.includes('suggest')) score += 0.1;
        break;
      case 'legal':
        if (content.includes('case') || content.includes('law') || content.includes('legal')) score += 0.1;
        break;
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  private calculateTrainingWeight(qualificationScore?: number): number {
    if (!qualificationScore) return 1.0;
    
    // Higher qualification scores get higher training weights
    if (qualificationScore >= 8) return 1.5;
    if (qualificationScore >= 6) return 1.2;
    if (qualificationScore >= 4) return 1.0;
    return 0.8;
  }

  private formatLegalAnalysis(legalData: any): string {
    const parts: string[] = [];
    
    if (legalData.caseType) parts.push(`Case Type: ${legalData.caseType}`);
    if (legalData.legalIssue) parts.push(`Legal Issue: ${legalData.legalIssue}`);
    if (legalData.urgencyLevel) parts.push(`Urgency: ${legalData.urgencyLevel}`);
    if (legalData.potentialValue) parts.push(`Potential Value: ${legalData.potentialValue}`);
    if (legalData.jurisdiction) parts.push(`Jurisdiction: ${legalData.jurisdiction}`);
    if (legalData.timelineEstimate) parts.push(`Timeline: ${legalData.timelineEstimate}`);
    
    return parts.join('. ');
  }

  private analyzeCallPattern(callHistory: any[]): string {
    const totalCalls = callHistory.length;
    const completedCalls = callHistory.filter(c => c.status === 'completed').length;
    const missedCalls = callHistory.filter(c => c.status === 'missed').length;
    const avgDuration = callHistory
      .filter(c => c.duration > 0)
      .reduce((sum, c) => sum + c.duration, 0) / Math.max(1, callHistory.filter(c => c.duration > 0).length);

    return `Call pattern: ${totalCalls} total calls, ${completedCalls} completed, ${missedCalls} missed. Average duration: ${Math.round(avgDuration)} seconds. Call frequency suggests ${this.interpretCallFrequency(callHistory)}.`;
  }

  private interpretCallFrequency(callHistory: any[]): string {
    if (callHistory.length <= 1) return 'initial contact';
    if (callHistory.length <= 3) return 'moderate interest';
    if (callHistory.length <= 5) return 'high engagement';
    return 'very high engagement';
  }

  private createStatusContext(lead: Lead): string {
    const parts: string[] = [];
    
    parts.push(`Lead status: ${lead.status}`);
    parts.push(`Source: ${lead.source}`);
    if (lead.lastContactTime) {
      const daysSinceContact = Math.floor((Date.now() - new Date(lead.lastContactTime).getTime()) / (1000 * 60 * 60 * 24));
      parts.push(`Last contact: ${daysSinceContact} days ago`);
    }
    
    if (lead.callerTracking) {
      parts.push(`Call tracking: ${lead.callerTracking.totalCalls} total calls`);
      if (lead.callerTracking.isReturning) parts.push('returning caller');
    }
    
    return parts.join('. ');
  }

  private truncateContent(content: string): string {
    if (content.length <= this.MAX_CONTENT_LENGTH) return content;
    
    // Try to truncate at sentence boundary
    const truncated = content.substring(0, this.MAX_CONTENT_LENGTH);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > this.MAX_CONTENT_LENGTH * 0.8) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }
}

// Export singleton instance
export const trainingDataCollector = new AITrainingDataCollector();