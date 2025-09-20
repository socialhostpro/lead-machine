// Google AdWords and Analytics Integration
// Multi-tenant support for per-company tracking configuration

// Google AdWords Configuration
export interface GoogleAdsConfig {
  conversionId: string;
  conversionLabel: string;
  enabled: boolean;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
}

// Google Analytics Configuration  
export interface GoogleAnalyticsConfig {
  measurementId: string;
  enabled: boolean;
}

// UTM Parameters Interface
export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string; // Google Click ID
  fbclid?: string; // Facebook Click ID
}

export class GoogleAdsService {
  private adsConfig: GoogleAdsConfig;
  private analyticsConfig: GoogleAnalyticsConfig;

  constructor(adsConfig?: GoogleAdsConfig, analyticsConfig?: GoogleAnalyticsConfig) {
    // Use provided config or fallback to environment variables
    this.adsConfig = adsConfig || {
      conversionId: process.env.REACT_APP_GOOGLE_ADS_CONVERSION_ID || '',
      conversionLabel: process.env.REACT_APP_GOOGLE_ADS_CONVERSION_LABEL || '',
      enabled: !!(process.env.REACT_APP_GOOGLE_ADS_CONVERSION_ID && process.env.REACT_APP_GOOGLE_ADS_CONVERSION_LABEL)
    };

    this.analyticsConfig = analyticsConfig || {
      measurementId: process.env.REACT_APP_GOOGLE_ANALYTICS_ID || '',
      enabled: !!process.env.REACT_APP_GOOGLE_ANALYTICS_ID
    };
  }

  /**
   * Update configuration for multi-tenant support
   */
  updateConfig(adsConfig?: Partial<GoogleAdsConfig>, analyticsConfig?: Partial<GoogleAnalyticsConfig>): void {
    if (adsConfig) {
      this.adsConfig = { ...this.adsConfig, ...adsConfig };
    }
    if (analyticsConfig) {
      this.analyticsConfig = { ...this.analyticsConfig, ...analyticsConfig };
    }
  }

  /**
   * Initialize Google AdWords and Analytics tracking
   */
  initializeTracking(): void {
    if (typeof window === 'undefined') return;

    // Initialize Google Analytics
    if (this.analyticsConfig.enabled) {
      this.initializeGoogleAnalytics();
    }

    // Initialize Google AdWords
    if (this.adsConfig.enabled) {
      this.initializeGoogleAds();
    }
  }

  /**
   * Initialize Google Analytics (GA4)
   */
  private initializeGoogleAnalytics(): void {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.analyticsConfig.measurementId}`;
    document.head.appendChild(script);

    script.onload = () => {
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }

      gtag('js', new Date());
      gtag('config', this.analyticsConfig.measurementId, {
        page_title: 'Lead Machine',
        page_location: window.location.href,
        send_page_view: true
      });

      // Store gtag globally
      (window as any).gtag = gtag;
    };
  }

  /**
   * Initialize Google AdWords conversion tracking
   */
  private initializeGoogleAds(): void {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=AW-${this.adsConfig.conversionId}`;
    document.head.appendChild(script);

    script.onload = () => {
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }

      gtag('js', new Date());
      gtag('config', `AW-${this.adsConfig.conversionId}`);

      // Store gtag globally if not already available
      (window as any).gtag = (window as any).gtag || gtag;
    };
  }

  /**
   * Track a conversion event (new lead, form submission, etc.)
   */
  trackConversion(eventName: string, value?: number, currency: string = 'USD'): void {
    if (!this.adsConfig.enabled || typeof window === 'undefined') return;

    const gtag = (window as any).gtag;
    if (!gtag) {
      console.warn('Google AdWords tracking not initialized');
      return;
    }

    // Track AdWords conversion
    gtag('event', 'conversion', {
      send_to: `AW-${this.adsConfig.conversionId}/${this.adsConfig.conversionLabel}`,
      value: value || 1,
      currency: currency,
      event_category: 'lead_generation',
      event_label: eventName
    });

    // Also track in Google Analytics if available
    if (this.analyticsConfig.enabled) {
      gtag('event', eventName, {
        event_category: 'lead_generation',
        value: value || 1,
        currency: currency
      });
    }

    console.log(`🎯 Conversion tracked: ${eventName}`, { value, currency });
  }

  /**
   * Track a page view
   */
  trackPageView(page: string, title?: string): void {
    if (typeof window === 'undefined') return;

    const gtag = (window as any).gtag;
    if (!gtag) return;

    if (this.analyticsConfig.enabled) {
      gtag('config', this.analyticsConfig.measurementId, {
        page_path: page,
        page_title: title || document.title
      });
    }
  }

  /**
   * Track custom events
   */
  trackEvent(eventName: string, parameters: Record<string, any> = {}): void {
    if (typeof window === 'undefined') return;

    const gtag = (window as any).gtag;
    if (!gtag) return;

    if (this.analyticsConfig.enabled) {
      gtag('event', eventName, {
        event_category: 'user_interaction',
        ...parameters
      });
    }
  }

  /**
   * Extract UTM parameters from URL
   */
  getUTMParameters(): UTMParameters {
    if (typeof window === 'undefined') return {};

    const urlParams = new URLSearchParams(window.location.search);
    
    return {
      utm_source: urlParams.get('utm_source') || undefined,
      utm_medium: urlParams.get('utm_medium') || undefined,
      utm_campaign: urlParams.get('utm_campaign') || undefined,
      utm_term: urlParams.get('utm_term') || undefined,
      utm_content: urlParams.get('utm_content') || undefined,
      gclid: urlParams.get('gclid') || undefined,
      fbclid: urlParams.get('fbclid') || undefined
    };
  }

  /**
   * Store UTM parameters in session storage for attribution
   */
  storeUTMParameters(): void {
    if (typeof window === 'undefined') return;

    const utmParams = this.getUTMParameters();
    const hasUTMData = Object.values(utmParams).some(value => value !== undefined);

    if (hasUTMData) {
      sessionStorage.setItem('leadMachine_utmParams', JSON.stringify(utmParams));
      sessionStorage.setItem('leadMachine_utmTimestamp', Date.now().toString());
    }
  }

  /**
   * Get stored UTM parameters for lead attribution
   */
  getStoredUTMParameters(): UTMParameters | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem('leadMachine_utmParams');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to parse stored UTM parameters:', error);
      return null;
    }
  }

  /**
   * Track lead generation with UTM attribution
   */
  trackLead(leadData: {
    leadId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    source: string;
    value?: number;
  }): void {
    // Track conversion
    this.trackConversion('lead_generated', leadData.value);

    // Track detailed event with UTM attribution
    const utmParams = this.getStoredUTMParameters() || this.getUTMParameters();
    
    this.trackEvent('new_lead', {
      lead_id: leadData.leadId,
      lead_source: leadData.source,
      lead_value: leadData.value || 1,
      ...utmParams
    });

    console.log('📊 Lead tracked with attribution:', {
      leadData,
      utmParams
    });
  }

  /**
   * Check if tracking is enabled and configured
   */
  isTrackingEnabled(): boolean {
    return this.adsConfig.enabled || this.analyticsConfig.enabled;
  }

  /**
   * Get configuration status
   */
  getTrackingStatus(): {
    googleAds: boolean;
    googleAnalytics: boolean;
    conversionId?: string;
    measurementId?: string;
  } {
    return {
      googleAds: this.adsConfig.enabled,
      googleAnalytics: this.analyticsConfig.enabled,
      conversionId: this.adsConfig.enabled ? this.adsConfig.conversionId : undefined,
      measurementId: this.analyticsConfig.enabled ? this.analyticsConfig.measurementId : undefined
    };
  }
}

/**
 * Create a company-specific Google Ads service instance
 */
export function createCompanyGoogleAdsService(company: {
  google_ads_conversion_id?: string;
  google_ads_conversion_label?: string;
  google_analytics_id?: string;
  google_ads_access_token?: string;
  google_ads_refresh_token?: string;
  google_ads_account_id?: string;
}): GoogleAdsService {
  const adsConfig: GoogleAdsConfig = {
    conversionId: company.google_ads_conversion_id || '',
    conversionLabel: company.google_ads_conversion_label || '',
    enabled: !!(company.google_ads_conversion_id && company.google_ads_conversion_label),
    accessToken: company.google_ads_access_token,
    refreshToken: company.google_ads_refresh_token,
    accountId: company.google_ads_account_id
  };

  const analyticsConfig: GoogleAnalyticsConfig = {
    measurementId: company.google_analytics_id || '',
    enabled: !!company.google_analytics_id
  };

  return new GoogleAdsService(adsConfig, analyticsConfig);
}

// Export singleton instance (for backwards compatibility)
export const googleAdsService = new GoogleAdsService();