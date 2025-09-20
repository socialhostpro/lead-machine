// AI Similarity Search and Context Retrieval Service
// Provides intelligent search and context retrieval for AI training and inference

import { textEmbeddingService } from './textEmbeddingService';
import { VectorContent } from './aiTrainingDataCollector';

export interface SearchResult {
  id: string;
  content: string;
  contentType: string;
  contentSubtype?: string;
  similarityScore: number;
  metadata: Record<string, any>;
  relevanceExplanation: string;
}

export interface ContextualResponse {
  query: string;
  matches: SearchResult[];
  totalMatches: number;
  searchStrategy: 'vector' | 'text' | 'hybrid';
  confidence: number;
  suggestedActions: string[];
  relatedConcepts: string[];
}

export interface TrainingContext {
  leadId: string;
  leadContext: SearchResult[];
  similarLeads: SearchResult[];
  bestPractices: SearchResult[];
  actionableInsights: string[];
  confidenceScore: number;
}

export class AISimilaritySearchService {
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly MAX_RESULTS = 20;
  private readonly CONTEXT_WINDOW = 10;

  /**
   * Search for similar content using vector embeddings
   */
  async searchSimilarContent(
    query: string,
    companyId: string,
    options: {
      contentTypes?: string[];
      excludeLeadId?: string;
      minSimilarity?: number;
      maxResults?: number;
      includeMetadata?: boolean;
    } = {}
  ): Promise<ContextualResponse> {
    const startTime = Date.now();
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await textEmbeddingService.generateSearchEmbedding(query);
      
      // Perform vector similarity search using SQL function
      const searchResults = await this.performVectorSearch(
        queryEmbedding,
        companyId,
        options
      );

      // Enhance results with explanations and context
      const enhancedResults = this.enhanceSearchResults(searchResults, query);

      // Calculate overall confidence
      const confidence = this.calculateSearchConfidence(enhancedResults);

      // Generate suggested actions based on results
      const suggestedActions = this.generateSuggestedActions(enhancedResults, query);

      // Extract related concepts
      const relatedConcepts = this.extractRelatedConcepts(enhancedResults);

      const response: ContextualResponse = {
        query,
        matches: enhancedResults,
        totalMatches: searchResults.length,
        searchStrategy: 'vector',
        confidence,
        suggestedActions,
        relatedConcepts,
      };

      console.log(`Vector search completed in ${Date.now() - startTime}ms: ${enhancedResults.length} results`);
      return response;

    } catch (error) {
      console.error('Vector search failed, falling back to text search:', error);
      
      // Fallback to text-based search
      return this.fallbackTextSearch(query, companyId, options);
    }
  }

  /**
   * Get comprehensive context for AI training about a specific lead
   */
  async getLeadTrainingContext(
    leadId: string,
    companyId: string,
    focusAreas?: string[]
  ): Promise<TrainingContext> {
    try {
      // Get all vectors for this specific lead
      const leadContext = await this.getLeadSpecificContext(leadId);

      // Find similar leads based on patterns
      const similarLeads = await this.findSimilarLeads(leadId, companyId);

      // Get best practices and successful patterns
      const bestPractices = await this.getBestPractices(companyId, focusAreas);

      // Generate actionable insights
      const actionableInsights = this.generateActionableInsights(
        leadContext,
        similarLeads,
        bestPractices
      );

      // Calculate confidence score
      const confidenceScore = this.calculateContextConfidence(
        leadContext,
        similarLeads,
        bestPractices
      );

      return {
        leadId,
        leadContext,
        similarLeads,
        bestPractices,
        actionableInsights,
        confidenceScore,
      };

    } catch (error) {
      console.error('Error getting lead training context:', error);
      return {
        leadId,
        leadContext: [],
        similarLeads: [],
        bestPractices: [],
        actionableInsights: ['Unable to retrieve training context due to error'],
        confidenceScore: 0,
      };
    }
  }

  /**
   * Find relevant examples for AI training
   */
  async findTrainingExamples(
    scenario: string,
    companyId: string,
    exampleTypes: string[] = ['ai_insight', 'call_summary', 'pain_point']
  ): Promise<{
    positiveExamples: SearchResult[];
    negativeExamples: SearchResult[];
    neutralExamples: SearchResult[];
    trainingNotes: string[];
  }> {
    try {
      // Search for relevant examples
      const allResults = await this.searchSimilarContent(scenario, companyId, {
        contentTypes: exampleTypes,
        maxResults: 50,
      });

      // Categorize results based on quality scores and outcomes
      const positiveExamples = allResults.matches.filter(r => 
        (r.metadata.qualityScore ?? 0) >= 0.7 || 
        r.metadata.outcomeType === 'successful_conversion'
      );

      const negativeExamples = allResults.matches.filter(r => 
        (r.metadata.qualityScore ?? 0) < 0.4 || 
        r.metadata.outcomeType === 'lost_opportunity'
      );

      const neutralExamples = allResults.matches.filter(r => 
        !positiveExamples.includes(r) && !negativeExamples.includes(r)
      );

      // Generate training notes
      const trainingNotes = this.generateTrainingNotes(
        scenario,
        positiveExamples,
        negativeExamples
      );

      return {
        positiveExamples: positiveExamples.slice(0, 10),
        negativeExamples: negativeExamples.slice(0, 5),
        neutralExamples: neutralExamples.slice(0, 5),
        trainingNotes,
      };

    } catch (error) {
      console.error('Error finding training examples:', error);
      return {
        positiveExamples: [],
        negativeExamples: [],
        neutralExamples: [],
        trainingNotes: ['Error retrieving training examples'],
      };
    }
  }

  /**
   * Analyze patterns in successful interactions
   */
  async analyzeSuccessPatterns(companyId: string): Promise<{
    commonPatterns: Array<{
      pattern: string;
      frequency: number;
      successRate: number;
      examples: SearchResult[];
    }>;
    insights: string[];
    recommendations: string[];
  }> {
    try {
      // Get successful interactions
      const successfulResults = await this.searchSimilarContent('successful conversion', companyId, {
        contentTypes: ['ai_insight', 'call_summary', 'interaction_log'],
        maxResults: 100,
      });

      // Extract patterns from successful interactions
      const patterns = this.extractPatterns(successfulResults.matches);

      // Generate insights and recommendations
      const insights = this.generatePatternInsights(patterns);
      const recommendations = this.generatePatternRecommendations(patterns);

      return {
        commonPatterns: patterns,
        insights,
        recommendations,
      };

    } catch (error) {
      console.error('Error analyzing success patterns:', error);
      return {
        commonPatterns: [],
        insights: ['Error analyzing patterns'],
        recommendations: ['Unable to generate recommendations'],
      };
    }
  }

  // Private helper methods

  private async performVectorSearch(
    queryEmbedding: number[],
    companyId: string,
    options: any
  ): Promise<any[]> {
    // This would use the Supabase function we defined in the migration
    // For now, we'll return mock data since the table isn't in the TypeScript types yet
    
    console.log('Performing vector search with embedding of length:', queryEmbedding.length);
    
    // Mock implementation - in production this would call the SQL function
    return [
      {
        id: 'mock-1',
        content_text: 'Sample AI insight about lead qualification',
        content_type: 'ai_insight',
        similarity_score: 0.85,
        metadata: { leadId: 'lead-1', qualificationScore: 8 },
        created_at: new Date().toISOString(),
      },
      {
        id: 'mock-2',
        content_text: 'Sample call summary with positive outcome',
        content_type: 'call_summary',
        similarity_score: 0.78,
        metadata: { leadId: 'lead-2', callDuration: 300 },
        created_at: new Date().toISOString(),
      },
    ];
  }

  private async fallbackTextSearch(
    query: string,
    companyId: string,
    options: any
  ): Promise<ContextualResponse> {
    // Text-based search as fallback
    const searchWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    // Mock text search results
    const mockResults: SearchResult[] = [
      {
        id: 'text-1',
        content: `Text search result for "${query}"`,
        contentType: 'ai_insight',
        similarityScore: 0.6,
        metadata: { searchType: 'text_fallback' },
        relevanceExplanation: `Found text match for keywords: ${searchWords.join(', ')}`,
      },
    ];

    return {
      query,
      matches: mockResults,
      totalMatches: mockResults.length,
      searchStrategy: 'text',
      confidence: 0.5,
      suggestedActions: ['Consider improving search query specificity'],
      relatedConcepts: searchWords,
    };
  }

  private enhanceSearchResults(results: any[], query: string): SearchResult[] {
    return results.map(result => ({
      id: result.id,
      content: result.content_text,
      contentType: result.content_type,
      contentSubtype: result.content_subtype,
      similarityScore: result.similarity_score,
      metadata: result.metadata || {},
      relevanceExplanation: this.generateRelevanceExplanation(result, query),
    }));
  }

  private generateRelevanceExplanation(result: any, query: string): string {
    const score = Math.round(result.similarity_score * 100);
    const type = result.content_type.replace('_', ' ');
    
    return `${score}% match - ${type} content with similar concepts to your query`;
  }

  private calculateSearchConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarityScore, 0) / results.length;
    const resultCountFactor = Math.min(results.length / 10, 1); // Normalize to 0-1
    
    return (avgSimilarity * 0.7 + resultCountFactor * 0.3);
  }

  private generateSuggestedActions(results: SearchResult[], query: string): string[] {
    const actions: string[] = [];
    
    if (results.length === 0) {
      actions.push('Try broadening your search query');
      actions.push('Check if similar content exists in the system');
      return actions;
    }

    const highQualityResults = results.filter(r => r.similarityScore > 0.8);
    const painPointResults = results.filter(r => r.contentType === 'pain_point');
    const insightResults = results.filter(r => r.contentType === 'ai_insight');

    if (highQualityResults.length > 0) {
      actions.push('Review high-similarity matches for best practices');
    }

    if (painPointResults.length > 0) {
      actions.push('Analyze common pain points for pattern recognition');
    }

    if (insightResults.length > 0) {
      actions.push('Study AI insights for qualification strategies');
    }

    if (results.length > 10) {
      actions.push('Filter results by content type for focused analysis');
    }

    return actions;
  }

  private extractRelatedConcepts(results: SearchResult[]): string[] {
    const concepts = new Set<string>();
    
    results.forEach(result => {
      // Extract from content type
      concepts.add(result.contentType.replace('_', ' '));
      
      // Extract from metadata
      if (result.metadata.serviceType) {
        concepts.add(result.metadata.serviceType);
      }
      
      if (result.metadata.urgencyLevel) {
        concepts.add(`${result.metadata.urgencyLevel} urgency`);
      }
      
      if (result.metadata.caseType) {
        concepts.add(result.metadata.caseType);
      }
    });

    return Array.from(concepts).slice(0, 10);
  }

  private async getLeadSpecificContext(leadId: string): Promise<SearchResult[]> {
    // Mock implementation - would query vectors for specific lead
    return [
      {
        id: `${leadId}-context-1`,
        content: 'Lead-specific AI insights and interactions',
        contentType: 'ai_insight',
        similarityScore: 1.0,
        metadata: { leadId, contextType: 'lead_specific' },
        relevanceExplanation: 'Direct context from this lead',
      },
    ];
  }

  private async findSimilarLeads(leadId: string, companyId: string): Promise<SearchResult[]> {
    // Mock implementation - would find leads with similar patterns
    return [
      {
        id: 'similar-lead-1',
        content: 'Similar lead pattern and outcome',
        contentType: 'interaction_log',
        similarityScore: 0.82,
        metadata: { similarityReason: 'comparable_pain_points' },
        relevanceExplanation: 'Lead with similar characteristics and successful outcome',
      },
    ];
  }

  private async getBestPractices(companyId: string, focusAreas?: string[]): Promise<SearchResult[]> {
    // Mock implementation - would find high-quality, validated practices
    return [
      {
        id: 'best-practice-1',
        content: 'Proven successful approach for similar scenarios',
        contentType: 'ai_insight',
        similarityScore: 0.9,
        metadata: { qualityScore: 0.95, validated: true },
        relevanceExplanation: 'Validated best practice with high success rate',
      },
    ];
  }

  private generateActionableInsights(
    leadContext: SearchResult[],
    similarLeads: SearchResult[],
    bestPractices: SearchResult[]
  ): string[] {
    const insights: string[] = [];
    
    if (leadContext.length > 0) {
      insights.push('Lead has established interaction history - leverage previous touchpoints');
    }
    
    if (similarLeads.length > 0) {
      insights.push('Similar leads show patterns that can guide next actions');
    }
    
    if (bestPractices.length > 0) {
      insights.push('Apply proven best practices from successful similar cases');
    }
    
    return insights;
  }

  private calculateContextConfidence(
    leadContext: SearchResult[],
    similarLeads: SearchResult[],
    bestPractices: SearchResult[]
  ): number {
    const contextScore = Math.min(leadContext.length / 5, 1) * 0.4;
    const similarityScore = Math.min(similarLeads.length / 3, 1) * 0.3;
    const practiceScore = Math.min(bestPractices.length / 2, 1) * 0.3;
    
    return contextScore + similarityScore + practiceScore;
  }

  private extractPatterns(results: SearchResult[]): Array<{
    pattern: string;
    frequency: number;
    successRate: number;
    examples: SearchResult[];
  }> {
    // Mock pattern extraction
    return [
      {
        pattern: 'Quick response to pain points',
        frequency: 15,
        successRate: 0.85,
        examples: results.slice(0, 3),
      },
      {
        pattern: 'Detailed legal analysis provided',
        frequency: 12,
        successRate: 0.78,
        examples: results.slice(3, 6),
      },
    ];
  }

  private generatePatternInsights(patterns: any[]): string[] {
    return patterns.map(p => 
      `${p.pattern} appears in ${p.frequency} cases with ${Math.round(p.successRate * 100)}% success rate`
    );
  }

  private generatePatternRecommendations(patterns: any[]): string[] {
    return patterns
      .filter(p => p.successRate > 0.7)
      .map(p => `Continue using: ${p.pattern}`)
      .slice(0, 5);
  }

  private generateTrainingNotes(
    scenario: string,
    positiveExamples: SearchResult[],
    negativeExamples: SearchResult[]
  ): string[] {
    const notes: string[] = [];
    
    notes.push(`Training scenario: ${scenario}`);
    notes.push(`Found ${positiveExamples.length} positive examples and ${negativeExamples.length} negative examples`);
    
    if (positiveExamples.length > 0) {
      notes.push('Positive examples show successful patterns to replicate');
    }
    
    if (negativeExamples.length > 0) {
      notes.push('Negative examples highlight approaches to avoid');
    }
    
    return notes;
  }
}

// Export singleton instance
export const aiSimilaritySearchService = new AISimilaritySearchService();