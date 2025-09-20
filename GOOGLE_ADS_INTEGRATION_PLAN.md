# Google Ads (AdWords) Integration Plan

## Overview
Integrate Google Ads API to track and analyze advertising performance, connect ad campaigns to leads, and provide comprehensive ROI insights for marketing spend optimization.

## Phase 1: Setup & Authentication

### Google Ads API Setup
- **Google Cloud Project**: Create/configure Google Cloud project
- **API Credentials**: Set up OAuth 2.0 credentials for Google Ads API
- **Manager Account**: Link to Google Ads Manager account for customer access
- **Developer Token**: Obtain Google Ads API developer token

### Environment Configuration
```env
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CLIENT_ID=your_oauth_client_id
GOOGLE_ADS_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_ADS_REFRESH_TOKEN=user_refresh_token
GOOGLE_ADS_CUSTOMER_ID=customer_account_id
```

## Phase 2: Database Schema Updates

### New Tables
```sql
-- Google Ads campaigns tracking
CREATE TABLE google_ads_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR NOT NULL,
  campaign_name VARCHAR NOT NULL,
  company_id UUID REFERENCES companies(id),
  status VARCHAR DEFAULT 'ACTIVE',
  budget_amount DECIMAL(10,2),
  budget_currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ad group performance
CREATE TABLE google_ads_adgroups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adgroup_id VARCHAR NOT NULL,
  adgroup_name VARCHAR NOT NULL,
  campaign_id UUID REFERENCES google_ads_campaigns(id),
  status VARCHAR DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Keyword performance tracking
CREATE TABLE google_ads_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id VARCHAR NOT NULL,
  keyword_text VARCHAR NOT NULL,
  adgroup_id UUID REFERENCES google_ads_adgroups(id),
  match_type VARCHAR DEFAULT 'BROAD',
  status VARCHAR DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Daily performance metrics
CREATE TABLE google_ads_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  campaign_id UUID REFERENCES google_ads_campaigns(id),
  adgroup_id UUID REFERENCES google_ads_adgroups(id),
  keyword_id UUID REFERENCES google_ads_keywords(id),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cost_micros BIGINT DEFAULT 0, -- Cost in micros (1M micros = 1 currency unit)
  conversions DECIMAL(8,2) DEFAULT 0,
  conversion_value DECIMAL(10,2) DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0, -- Click-through rate
  cpc_micros BIGINT DEFAULT 0, -- Cost per click in micros
  created_at TIMESTAMP DEFAULT NOW()
);

-- Lead attribution to ads
CREATE TABLE lead_ad_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  campaign_id UUID REFERENCES google_ads_campaigns(id),
  adgroup_id UUID REFERENCES google_ads_adgroups(id),
  keyword_id UUID REFERENCES google_ads_keywords(id),
  click_id VARCHAR, -- Google Click ID (GCLID)
  attribution_model VARCHAR DEFAULT 'LAST_CLICK',
  attributed_cost_micros BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Leads Table Updates
```sql
-- Add Google Ads tracking to existing leads table
ALTER TABLE leads 
ADD COLUMN gclid VARCHAR, -- Google Click ID
ADD COLUMN utm_source VARCHAR,
ADD COLUMN utm_medium VARCHAR,
ADD COLUMN utm_campaign VARCHAR,
ADD COLUMN utm_term VARCHAR,
ADD COLUMN utm_content VARCHAR;
```

## Phase 3: Backend Integration

### Google Ads API Client
```typescript
// utils/googleAdsClient.ts
import { GoogleAdsClient } from 'google-ads-node';

export class GoogleAdsService {
  private client: GoogleAdsClient;
  
  constructor() {
    this.client = new GoogleAdsClient({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });
  }

  async getCampaigns(customerId: string) {
    const customer = this.client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const campaigns = await customer.query(`
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros
      FROM campaign 
      WHERE campaign.status != 'REMOVED'
    `);

    return campaigns;
  }

  async getPerformanceReport(customerId: string, dateRange: string) {
    const customer = this.client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const report = await customer.query(`
      SELECT 
        segments.date,
        campaign.id,
        ad_group.id,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc
      FROM keyword_view 
      WHERE segments.date DURING ${dateRange}
    `);

    return report;
  }
}
```

### Supabase Edge Function
```typescript
// supabase/functions/google-ads-sync/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleAdsService } from './googleAdsService.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { customerId, companyId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const googleAdsService = new GoogleAdsService();
    
    // Sync campaigns
    const campaigns = await googleAdsService.getCampaigns(customerId);
    
    for (const campaign of campaigns) {
      await supabase.from('google_ads_campaigns').upsert({
        campaign_id: campaign.campaign.id,
        campaign_name: campaign.campaign.name,
        company_id: companyId,
        status: campaign.campaign.status,
        budget_amount: campaign.campaign_budget.amount_micros / 1000000,
        updated_at: new Date().toISOString()
      });
    }

    // Sync performance data for last 30 days
    const performanceData = await googleAdsService.getPerformanceReport(
      customerId, 
      'LAST_30_DAYS'
    );

    for (const row of performanceData) {
      await supabase.from('google_ads_performance').upsert({
        date: row.segments.date,
        campaign_id: row.campaign.id,
        adgroup_id: row.ad_group.id,
        impressions: row.metrics.impressions,
        clicks: row.metrics.clicks,
        cost_micros: row.metrics.cost_micros,
        conversions: row.metrics.conversions,
        ctr: row.metrics.ctr,
        cpc_micros: row.metrics.average_cpc
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Google Ads sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

## Phase 4: Frontend Components

### Google Ads Dashboard
```typescript
// components/GoogleAdsDashboard.tsx
import React, { useState, useEffect } from 'react';

interface GoogleAdsDashboardProps {
  companyId: string;
  dateRange: string;
}

export const GoogleAdsDashboard: React.FC<GoogleAdsDashboardProps> = ({
  companyId,
  dateRange
}) => {
  const [campaigns, setCampaigns] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdData();
  }, [companyId, dateRange]);

  const fetchAdData = async () => {
    try {
      setLoading(true);
      
      // Fetch campaigns
      const campaignsResponse = await supabase
        .from('google_ads_campaigns')
        .select('*')
        .eq('company_id', companyId);
      
      // Fetch performance metrics
      const performanceResponse = await supabase
        .from('google_ads_performance')
        .select('*')
        .gte('date', getDateRangeStart(dateRange));

      setCampaigns(campaignsResponse.data || []);
      setPerformance(calculateMetrics(performanceResponse.data || []));
    } catch (error) {
      console.error('Error fetching ad data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          title="Impressions" 
          value={performance?.totalImpressions || 0} 
          trend={performance?.impressionsTrend}
        />
        <MetricCard 
          title="Clicks" 
          value={performance?.totalClicks || 0} 
          trend={performance?.clicksTrend}
        />
        <MetricCard 
          title="Cost" 
          value={`$${(performance?.totalCost || 0).toFixed(2)}`} 
          trend={performance?.costTrend}
        />
        <MetricCard 
          title="CTR" 
          value={`${(performance?.avgCTR || 0).toFixed(2)}%`} 
          trend={performance?.ctrTrend}
        />
      </div>

      {/* Campaign Performance Table */}
      <CampaignPerformanceTable campaigns={campaigns} />
      
      {/* Lead Attribution */}
      <LeadAttributionChart companyId={companyId} />
    </div>
  );
};
```

### Campaign ROI Analysis
```typescript
// components/CampaignROIAnalysis.tsx
export const CampaignROIAnalysis: React.FC = () => {
  const [roiData, setRoiData] = useState([]);

  const calculateROI = (campaignData) => {
    return campaignData.map(campaign => {
      const cost = campaign.totalCost;
      const revenue = campaign.attributedLeads * campaign.avgDealValue;
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
      
      return {
        ...campaign,
        revenue,
        roi,
        roas: cost > 0 ? revenue / cost : 0 // Return on Ad Spend
      };
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Campaign ROI Analysis</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left p-3">Campaign</th>
              <th className="text-left p-3">Cost</th>
              <th className="text-left p-3">Revenue</th>
              <th className="text-left p-3">ROI %</th>
              <th className="text-left p-3">ROAS</th>
              <th className="text-left p-3">Leads</th>
            </tr>
          </thead>
          <tbody>
            {roiData.map(campaign => (
              <tr key={campaign.id}>
                <td className="p-3">{campaign.name}</td>
                <td className="p-3">${campaign.cost.toFixed(2)}</td>
                <td className="p-3">${campaign.revenue.toFixed(2)}</td>
                <td className={`p-3 ${campaign.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {campaign.roi.toFixed(1)}%
                </td>
                <td className="p-3">{campaign.roas.toFixed(2)}x</td>
                <td className="p-3">{campaign.attributedLeads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

## Phase 5: Attribution & Tracking

### UTM Parameter Capture
```typescript
// utils/utmTracking.ts
export const captureUTMParameters = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gclid = urlParams.get('gclid');
  
  const utmData = {
    gclid,
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'),
    utm_campaign: urlParams.get('utm_campaign'),
    utm_term: urlParams.get('utm_term'),
    utm_content: urlParams.get('utm_content'),
  };

  // Store in localStorage for form submission
  localStorage.setItem('lead_attribution', JSON.stringify(utmData));
  
  return utmData;
};

export const getStoredAttribution = () => {
  const stored = localStorage.getItem('lead_attribution');
  return stored ? JSON.parse(stored) : {};
};
```

### Enhanced Lead Creation
```typescript
// Update lead creation to include attribution
const createLeadWithAttribution = async (leadData) => {
  const attribution = getStoredAttribution();
  
  const lead = await supabase.from('leads').insert({
    ...leadData,
    ...attribution,
    created_at: new Date().toISOString()
  });

  // If GCLID exists, attempt to link to campaign
  if (attribution.gclid) {
    await linkLeadToCampaign(lead.id, attribution.gclid);
  }

  return lead;
};
```

## Phase 6: Reporting & Analytics

### Google Ads Performance Reports
- **Campaign Performance Dashboard**
- **Keyword Performance Analysis**
- **Lead Attribution Reports**
- **ROI/ROAS Calculations**
- **Budget Optimization Recommendations**

### Integration with Existing Analytics
- Add Google Ads metrics to existing AI analytics
- Include ad spend in lead cost calculations
- Attribution modeling for multi-touch journeys
- Competitive analysis and benchmarking

## Phase 7: Advanced Features

### Automated Bid Management
- **Performance-based bid adjustments**
- **Budget reallocation recommendations**
- **Keyword expansion suggestions**
- **Negative keyword identification**

### Conversion Tracking
- **Server-side conversion tracking**
- **Enhanced conversion tracking**
- **Offline conversion imports**
- **Custom conversion actions**

## Implementation Timeline

### Week 1-2: Setup & Authentication
- Google Cloud project setup
- API credentials configuration
- Database schema implementation

### Week 3-4: Backend Integration
- Google Ads API client development
- Supabase edge function creation
- Data sync implementation

### Week 5-6: Frontend Components
- Dashboard components
- Performance reporting
- ROI analysis tools

### Week 7-8: Attribution & Tracking
- UTM parameter capture
- Lead attribution system
- Conversion tracking setup

### Week 9-10: Testing & Optimization
- End-to-end testing
- Performance optimization
- User training and documentation

## Success Metrics

### Technical KPIs
- **API Response Time**: < 2 seconds
- **Data Accuracy**: 99.9% match with Google Ads
- **Sync Frequency**: Real-time for critical metrics
- **Error Rate**: < 0.1% for data imports

### Business KPIs
- **Attribution Accuracy**: 95% of leads properly attributed
- **ROI Visibility**: Complete campaign ROI tracking
- **Budget Optimization**: 15% improvement in ROAS
- **Lead Quality**: Enhanced lead scoring with ad data

## Future Enhancements

### AI-Powered Optimization
- **Predictive bid management**
- **Automated budget allocation**
- **Smart keyword recommendations**
- **Performance forecasting**

### Cross-Platform Integration
- **Facebook Ads integration**
- **LinkedIn Ads integration**
- **Multi-channel attribution**
- **Unified marketing dashboard**

---

This comprehensive Google Ads integration will provide complete visibility into advertising performance, accurate lead attribution, and actionable insights for marketing optimization.