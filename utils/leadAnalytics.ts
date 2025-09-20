import { Lead, LeadStatus } from '../types';

export interface LeadAnalytics {
  overview: {
    totalLeads: number;
    conversionRate: number;
    averageTimeToConversion: number;
    topPerformingSource: string;
    periodComparison: {
      current: number;
      previous: number;
      percentageChange: number;
    };
  };
  sourceAnalysis: {
    source: string;
    count: number;
    percentage: number;
    conversionRate: number;
    averageValue: number;
  }[];
  statusDistribution: {
    status: LeadStatus;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  temporalTrends: {
    period: string;
    leads: number;
    conversions: number;
    conversionRate: number;
  }[];
  recommendations: string[];
  insights: string[];
}

export class LeadAnalyticsEngine {
  static generateComprehensiveReport(
    leads: Lead[], 
    timeframe: 'today' | 'week' | 'month' | 'year' | 'all' = 'all'
  ): LeadAnalytics {
    const filteredLeads = this.filterLeadsByTimeframe(leads, timeframe);
    const previousPeriodLeads = this.getPreviousPeriodLeads(leads, timeframe);

    return {
      overview: this.generateOverview(filteredLeads, previousPeriodLeads),
      sourceAnalysis: this.analyzeLeadSources(filteredLeads),
      statusDistribution: this.analyzeStatusDistribution(filteredLeads, previousPeriodLeads),
      temporalTrends: this.analyzeTemporalTrends(leads, timeframe),
      recommendations: this.generateRecommendations(filteredLeads),
      insights: this.generateInsights(filteredLeads)
    };
  }

  private static filterLeadsByTimeframe(leads: Lead[], timeframe: string): Lead[] {
    if (timeframe === 'all') return leads;
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return leads;
    }
    
    return leads.filter(lead => new Date(lead.createdAt) >= startDate);
  }

  private static getPreviousPeriodLeads(leads: Lead[], timeframe: string): Lead[] {
    if (timeframe === 'all') return [];
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (timeframe) {
      case 'today':
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() - now.getDay());
        endDate = new Date(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate());
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        break;
      case 'year':
        endDate = new Date(now.getFullYear(), 0, 1);
        startDate = new Date(endDate.getFullYear() - 1, 0, 1);
        break;
      default:
        return [];
    }
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= startDate && leadDate < endDate;
    });
  }

  private static generateOverview(currentLeads: Lead[], previousLeads: Lead[]): LeadAnalytics['overview'] {
    const totalLeads = currentLeads.length;
    const wonLeads = currentLeads.filter(lead => lead.status === LeadStatus.CLOSED_WON);
    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;
    
    // Calculate average time to conversion
    const avgTimeToConversion = this.calculateAverageTimeToConversion(wonLeads);
    
    // Find top performing source
    const sourceAnalysis = this.analyzeLeadSources(currentLeads);
    const topPerformingSource = sourceAnalysis.length > 0 
      ? sourceAnalysis.reduce((prev, current) => 
          prev.conversionRate > current.conversionRate ? prev : current
        ).source
      : 'N/A';
    
    // Period comparison
    const previousTotal = previousLeads.length;
    const percentageChange = previousTotal > 0 
      ? ((totalLeads - previousTotal) / previousTotal) * 100 
      : totalLeads > 0 ? 100 : 0;

    return {
      totalLeads,
      conversionRate,
      averageTimeToConversion: avgTimeToConversion,
      topPerformingSource,
      periodComparison: {
        current: totalLeads,
        previous: previousTotal,
        percentageChange
      }
    };
  }

  private static calculateAverageTimeToConversion(wonLeads: Lead[]): number {
    if (wonLeads.length === 0) return 0;
    
    const conversionTimes = wonLeads
      .filter(lead => lead.lastContactTime)
      .map(lead => {
        const created = new Date(lead.createdAt).getTime();
        const converted = new Date(lead.lastContactTime!).getTime();
        return (converted - created) / (1000 * 60 * 60 * 24); // days
      });
    
    return conversionTimes.length > 0 
      ? conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length 
      : 0;
  }

  private static analyzeLeadSources(leads: Lead[]): LeadAnalytics['sourceAnalysis'] {
    const sourceMap = new Map<string, { count: number; conversions: number; totalValue: number }>();
    
    leads.forEach(lead => {
      const source = lead.source || 'Unknown';
      const existing = sourceMap.get(source) || { count: 0, conversions: 0, totalValue: 0 };
      
      existing.count++;
      if (lead.status === LeadStatus.CLOSED_WON) {
        existing.conversions++;
        // Since Lead doesn't have value property, we'll use a placeholder calculation
        // You may want to add value property to Lead interface later
        existing.totalValue += 1000; // Placeholder average deal value
      }
      
      sourceMap.set(source, existing);
    });

    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        count: data.count,
        percentage: (data.count / leads.length) * 100,
        conversionRate: data.count > 0 ? (data.conversions / data.count) * 100 : 0,
        averageValue: data.conversions > 0 ? data.totalValue / data.conversions : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  private static analyzeStatusDistribution(
    currentLeads: Lead[], 
    previousLeads: Lead[]
  ): LeadAnalytics['statusDistribution'] {
    const statusCount = new Map<LeadStatus, number>();
    const previousStatusCount = new Map<LeadStatus, number>();
    
    // Count current period
    currentLeads.forEach(lead => {
      statusCount.set(lead.status, (statusCount.get(lead.status) || 0) + 1);
    });
    
    // Count previous period
    previousLeads.forEach(lead => {
      previousStatusCount.set(lead.status, (previousStatusCount.get(lead.status) || 0) + 1);
    });

    return Object.values(LeadStatus).map(status => {
      const currentCount = statusCount.get(status) || 0;
      const previousCount = previousStatusCount.get(status) || 0;
      
      let trend: 'up' | 'down' | 'stable';
      if (currentCount > previousCount) trend = 'up';
      else if (currentCount < previousCount) trend = 'down';
      else trend = 'stable';

      return {
        status,
        count: currentCount,
        percentage: currentLeads.length > 0 ? (currentCount / currentLeads.length) * 100 : 0,
        trend
      };
    }).filter(item => item.count > 0);
  }

  private static analyzeTemporalTrends(
    leads: Lead[], 
    timeframe: string
  ): LeadAnalytics['temporalTrends'] {
    const now = new Date();
    const trends: LeadAnalytics['temporalTrends'] = [];
    
    if (timeframe === 'year' || timeframe === 'all') {
      // Monthly breakdown for year/all
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const periodLeads = leads.filter(lead => {
          const leadDate = new Date(lead.createdAt);
          return leadDate >= date && leadDate < nextDate;
        });
        
        const conversions = periodLeads.filter(lead => lead.status === LeadStatus.CLOSED_WON).length;
        
        trends.push({
          period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          leads: periodLeads.length,
          conversions,
          conversionRate: periodLeads.length > 0 ? (conversions / periodLeads.length) * 100 : 0
        });
      }
    } else if (timeframe === 'month') {
      // Weekly breakdown for month
      for (let i = 3; i >= 0; i--) {
        const endDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const periodLeads = leads.filter(lead => {
          const leadDate = new Date(lead.createdAt);
          return leadDate >= startDate && leadDate < endDate;
        });
        
        const conversions = periodLeads.filter(lead => lead.status === LeadStatus.CLOSED_WON).length;
        
        trends.push({
          period: `Week ${4 - i}`,
          leads: periodLeads.length,
          conversions,
          conversionRate: periodLeads.length > 0 ? (conversions / periodLeads.length) * 100 : 0
        });
      }
    } else if (timeframe === 'week') {
      // Daily breakdown for week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const periodLeads = leads.filter(lead => {
          const leadDate = new Date(lead.createdAt);
          return leadDate >= date && leadDate < nextDate;
        });
        
        const conversions = periodLeads.filter(lead => lead.status === LeadStatus.CLOSED_WON).length;
        
        trends.push({
          period: days[date.getDay()],
          leads: periodLeads.length,
          conversions,
          conversionRate: periodLeads.length > 0 ? (conversions / periodLeads.length) * 100 : 0
        });
      }
    }
    
    return trends;
  }

  private static generateRecommendations(leads: Lead[]): string[] {
    const recommendations: string[] = [];
    const sourceAnalysis = this.analyzeLeadSources(leads);
    const totalLeads = leads.length;
    
    if (totalLeads === 0) {
      return ['Focus on lead generation activities to build your pipeline.'];
    }

    // Source optimization recommendations
    if (sourceAnalysis.length > 1) {
      const topSource = sourceAnalysis[0];
      const lowPerformingSources = sourceAnalysis.filter(s => s.conversionRate < topSource.conversionRate * 0.5);
      
      if (lowPerformingSources.length > 0) {
        recommendations.push(
          `Consider reallocating resources from ${lowPerformingSources.map(s => s.source).join(', ')} to ${topSource.source}, which has a ${topSource.conversionRate.toFixed(1)}% conversion rate.`
        );
      }
    }

    // Status-based recommendations
    const newLeads = leads.filter(l => l.status === LeadStatus.NEW).length;
    const qualifiedLeads = leads.filter(l => l.status === LeadStatus.QUALIFIED).length;
    
    if (newLeads > totalLeads * 0.5) {
      recommendations.push('High volume of unprocessed leads detected. Consider implementing automated lead scoring to prioritize follow-ups.');
    }
    
    if (qualifiedLeads > newLeads * 2) {
      recommendations.push('Strong qualification process! Focus on accelerating the closing process for qualified leads.');
    }

    // Follow-up recommendations
    const staleLeads = leads.filter(lead => {
      if (!lead.lastContactTime) return true;
      const daysSinceContact = (Date.now() - new Date(lead.lastContactTime).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceContact > 7 && lead.status !== LeadStatus.CLOSED_WON && lead.status !== LeadStatus.CLOSED_LOST;
    });
    
    if (staleLeads.length > totalLeads * 0.3) {
      recommendations.push(`${staleLeads.length} leads haven't been contacted in over 7 days. Implement a systematic follow-up schedule to maintain engagement.`);
    }

    // Conversion rate recommendations
    const conversionRate = (leads.filter(l => l.status === LeadStatus.CLOSED_WON).length / totalLeads) * 100;
    if (conversionRate < 10) {
      recommendations.push('Conversion rate is below industry average. Consider improving lead qualification criteria and sales process.');
    } else if (conversionRate > 25) {
      recommendations.push('Excellent conversion rate! Consider scaling your top-performing lead generation channels.');
    }

    return recommendations.length > 0 ? recommendations : ['Continue monitoring lead performance and maintain current successful strategies.'];
  }

  private static generateInsights(leads: Lead[]): string[] {
    const insights: string[] = [];
    const sourceAnalysis = this.analyzeLeadSources(leads);
    const totalLeads = leads.length;
    
    if (totalLeads === 0) {
      return ['No leads data available for analysis.'];
    }

    // Lead volume insights
    insights.push(`Analyzed ${totalLeads} leads across ${sourceAnalysis.length} different sources.`);
    
    // Top source insight
    if (sourceAnalysis.length > 0) {
      const topSource = sourceAnalysis[0];
      insights.push(`${topSource.source} is your highest volume source, contributing ${topSource.percentage.toFixed(1)}% of all leads.`);
    }

    // Conversion insights
    const wonLeads = leads.filter(l => l.status === LeadStatus.CLOSED_WON);
    const conversionRate = (wonLeads.length / totalLeads) * 100;
    insights.push(`Overall conversion rate is ${conversionRate.toFixed(1)}%, with ${wonLeads.length} successful conversions.`);

    // Quality insights
    const qualifiedLeads = leads.filter(l => l.status === LeadStatus.QUALIFIED);
    if (qualifiedLeads.length > 0) {
      const qualificationRate = (qualifiedLeads.length / totalLeads) * 100;
      insights.push(`${qualificationRate.toFixed(1)}% of leads progress to qualified status, indicating ${qualificationRate > 30 ? 'strong' : qualificationRate > 15 ? 'moderate' : 'weak'} lead quality.`);
    }

    // Time-based insights
    const recentLeads = leads.filter(lead => {
      const daysSinceCreated = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 30;
    });
    
    if (recentLeads.length > 0) {
      const recentPercentage = (recentLeads.length / totalLeads) * 100;
      insights.push(`${recentPercentage.toFixed(1)}% of leads were generated in the last 30 days, showing ${recentPercentage > 50 ? 'strong' : recentPercentage > 25 ? 'moderate' : 'low'} recent activity.`);
    }

    // Value insights - removed since Lead doesn't have value property
    // This could be added later if value tracking is implemented
    
    insights.push('Lead value tracking could be implemented to provide revenue-based insights.');

    return insights;
  }
}