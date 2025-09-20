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
  CLOSED_WON = 'Closed - Won',
  CLOSED_LOST = 'Closed - Lost',
}

export enum LeadSource {
  MANUAL = 'Manual',
  INCOMING_CALL = 'Incoming Call',
  BOT = 'Bot',
  WEB_FORM = 'Web Form',
}

export interface CallDetails {
  conversationId: string;
  agentId?: string;
  summaryTitle: string;
  transcriptSummary: string;
  callStartTime?: string; // ISO timestamp from ElevenLabs start_time_unix_secs
  callDuration?: number;  // Duration in seconds
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
}