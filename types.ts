// FIX: Add triple-slash directive to include Vite client types for `import.meta.env`.
/// <reference types="vite/client" />

export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  UNQUALIFIED = 'Unqualified',
  CLIENT = 'Client',
  LOST = 'Lost', 
  ARCHIVE = 'Archive',
  CLOSED_WON = 'Closed - Won',
  CLOSED_LOST = 'Closed - Lost',
}

export enum LeadSource {
  MANUAL = 'Manual',
  INCOMING_CALL = 'Incoming Call',
  BOT = 'Bot',
  WEB_FORM = 'Web Form',
}

export interface CallLog {
  id?: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  duration: number; // Duration in seconds
  type: 'incoming' | 'outgoing';
  status?: 'completed' | 'missed' | 'cancelled';
}

export interface CallDetails {
  conversationId: string;
  agentId?: string;
  summaryTitle: string;
  transcriptSummary: string;
  callStartTime?: string; // ISO timestamp from ElevenLabs start_time_unix_secs
  callDuration?: number;  // Duration in seconds
  lastOutgoingCall?: CallLog; // Most recent outgoing call
  callHistory?: CallLog[]; // Full call history
}

export interface CallerTracking {
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  lastContactTime?: string; // ISO timestamp of last contact
  isReturning: boolean;
}

export enum TimeBasedStatus {
  JUST_CALLED = 'just_called',
  HOURS_5 = 'hours_5',
  HOURS_10 = 'hours_10', 
  HOURS_24 = 'hours_24',
  HOURS_48 = 'hours_48',
  NEVER_CONTACTED = 'never_contacted'
}

export interface Company {
  id: string;
  name: string;
  webhookUrl?: string;
  webhookHeader?: string;
  defaultAgentId?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  email_from_address?: string;        // FIXED: snake_case to match database
  email_reply_to_address?: string;    // FIXED: snake_case to match database
  email_from_name?: string;           // FIXED: snake_case to match database
  sendgrid_dns_verified?: boolean;    // FIXED: snake_case to match database
  last_sync_timestamp?: string;       // FIXED: snake_case to match database
  // Google AdWords configuration (per-company)
  google_ads_conversion_id?: string;
  google_ads_conversion_label?: string;
  google_analytics_id?: string;
  google_ads_access_token?: string;
  google_ads_refresh_token?: string;
  google_ads_connected?: boolean;
  google_ads_account_id?: string;
  // Business location for distance calculations
  business_latitude?: number;
  business_longitude?: number;
  last_conversation_id?: string;      // FIXED: snake_case to match database
}

export interface AIInsights {
  qualificationScore: number;
  justification: string;
  keyPainPoints: string[];
  suggestedNextSteps: string[];
  serviceType?: 'legal' | 'general' | 'medical' | 'financial' | 'insurance' | 'real_estate' | 'other';
  legalSpecific?: {
    caseType?: string;
    caseNumber?: string;
    legalIssue?: string;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
    potentialValue?: string;
    jurisdiction?: string;
    timelineEstimate?: string;
  };
  detailedAnalysis?: string;
  isLengthy?: boolean; // Flag to show "More Details" button
}

export interface Lead {
  id:string;
  companyId: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  notes: Note[];
  source: LeadSource;
  callDetails?: CallDetails;
  issueDescription?: string;
  aiInsights?: AIInsights | null;
  callerTracking?: CallerTracking;
  lastContactTime?: string; // For time-based color coding
  // ElevenLabs and form tracking
  elevenlabs_agent_id?: string;
  form_id?: string;
  // Geographic data
  caller_latitude?: number;
  caller_longitude?: number;
  caller_address?: string;
  distance_from_business?: number; // in miles
  // Enhanced location data
  geocoded_latitude?: number;
  geocoded_longitude?: number;
  parsed_address?: string;
  distance_from_user?: number; // distance from current user location
}

export enum UserRole {
    OWNER = 'Owner',
    MEMBER = 'Member',
    SAAS_ADMIN = 'SaaS Admin',
}

export interface User {
    id: string;
    name: string;
    email: string;
    companyId: string;
    role: UserRole;
    isDisabled?: boolean;
    email_notifications_enabled?: boolean;     // FIXED: snake_case to match database
    notification_frequency?: 'immediate' | 'hourly' | 'daily' | 'disabled';  // FIXED: snake_case
    notification_types?: {                     // FIXED: snake_case to match database
        newMessage: boolean;
        leadUpdates: boolean;
        systemAlerts: boolean;
    };
    sound_notifications_enabled?: boolean;     // FIXED: snake_case to match database
    notification_volume?: number;              // FIXED: snake_case to match database
    new_lead_sound?: string;                   // FIXED: snake_case to match database
    email_sound?: string;                      // FIXED: snake_case to match database
    // Business address for distance calculations and directions
    business_address?: string;
    business_city?: string;
    business_state?: string;
    business_zip_code?: string;
    business_latitude?: number;
    business_longitude?: number;
}

export interface WebFormField {
  enabled: boolean;
  required: boolean;
  label: string;
}

export interface WebForm {
  id: string;
  companyId: string;
  createdAt: string;
  name: string; // Internal name
  title: string; // Public title
  description?: string;
  fields: {
    firstName: WebFormField;
    lastName: WebFormField;
    email: WebFormField;
    phone: WebFormField;
    company: WebFormField;
    issueDescription: WebFormField;
  };
  config: {
    submitButtonText: string;
    theme: 'light' | 'dark';
    primaryColor: string;
    successMessage: string;
  };
  elevenlabs_agent_id?: string; // Associated ElevenLabs agent
}

// ElevenLabs Agent interface
export interface ElevenLabsAgent {
  id: string;
  company_id: string;
  agent_id: string; // ElevenLabs agent ID
  agent_name: string;
  voice_id?: string;
  personality_description?: string;
  specialization?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// User AI Bot Context interface
export interface UserAIBotContext {
  id: string;
  user_id: string;
  company_id: string;
  bot_name: string;
  personality_prompt?: string;
  knowledge_base_summary?: string;
  conversation_style: 'professional' | 'casual' | 'technical' | 'friendly';
  specializations: string[];
  last_training_update: string;
  total_vectors: number;
  average_quality_score: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Geographic utilities interface
export interface GeographicData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}