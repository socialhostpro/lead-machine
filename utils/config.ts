// Application Configuration
// Centralized configuration to avoid hardcoded values

export const CONFIG = {
  // Email configuration
  DEFAULT_EMAIL_DOMAIN: 'imaginecapital.ai',
  DEFAULT_FROM_EMAIL: 'notifications@imaginecapital.ai',
  DEFAULT_REPLY_TO_EMAIL: 'notifications@imaginecapital.ai',
  DEFAULT_EMAIL_FROM_NAME: 'Lead Machine Notifications',
  
  // Application URLs
  DEFAULT_DASHBOARD_URL: 'https://leads.imaginecapital.ai',
  
  // Cache settings
  LEADS_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Sound notification defaults
  DEFAULT_NOTIFICATION_VOLUME: 0.7,
  DEFAULT_NEW_LEAD_SOUND: 'notification',
  DEFAULT_EMAIL_SOUND: 'email',
  
  // Theme settings
  DEFAULT_THEME: 'light' as const,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
} as const;

// Environment-aware configuration getters
export const getConfig = () => {
  return {
    ...CONFIG,
    // Override with environment variables if available
    DASHBOARD_URL: import.meta.env.VITE_DASHBOARD_URL || CONFIG.DEFAULT_DASHBOARD_URL,
    EMAIL_DOMAIN: import.meta.env.VITE_EMAIL_DOMAIN || CONFIG.DEFAULT_EMAIL_DOMAIN,
    FROM_EMAIL: import.meta.env.VITE_FROM_EMAIL || CONFIG.DEFAULT_FROM_EMAIL,
  };
};

export default CONFIG;