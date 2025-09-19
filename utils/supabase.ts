import { createClient } from '@supabase/supabase-js';
import { AIInsights, Lead, LeadSource, LeadStatus, Note } from '../types';

// These are now loaded securely from environment variables.
// In a Vite-like environment, env vars are exposed on import.meta.env
// FIX: Removed `as any` cast. Types for `import.meta.env` are now available globally.
const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey) {
  // In a real app, you might want to show a user-friendly message on the UI
  // instead of just throwing an error, but for this context, an error is clear.
  throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
}

// Define a type for our database schema to get type safety.
// This is a simplified version. For a real app, you would generate this from your DB schema.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// FIX: Define Row types separately to avoid recursive type definitions that can confuse TypeScript.
type LeadRow = {
  id: string
  created_at: string
  company_id: string
  first_name: string
  last_name: string
  company: string | null
  email: string
  phone: string | null
  status: string
  source: string
  notes: Json | null
  issue_description: string | null
  source_conversation_id: string | null
  ai_insights: Json | null
};

// RENAMED from UserRow to ProfileRow to match the table name change.
type ProfileRow = {
  id: string;
  name: string;
  email: string;
  company_id: string;
  role: string;
  is_disabled: boolean;
};

type CompanyRow = {
  id: string;
  name: string;
  webhook_url: string | null;
  webhook_header: string | null;
  default_agent_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

type FormRow = {
  id: string;
  company_id: string;
  created_at: string;
  name: string;
  title: string;
  description: string | null;
  fields: Json;
  config: Json;
};

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: LeadRow,
        Insert: Omit<LeadRow, 'id' | 'created_at'>,
        Update: Partial<LeadRow>,
        Relationships: []
      },
      // RENAMED from 'users' to 'profiles' to avoid naming conflicts and improve clarity.
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, 'is_disabled'>; // is_disabled has a default
        Update: Partial<ProfileRow>;
        Relationships: []
      },
      companies: {
        Row: CompanyRow;
        Insert: {
          name: string;
          webhook_url?: string | null;
          webhook_header?: string | null;
          default_agent_id?: string | null;
        };
        Update: Partial<CompanyRow>;
        Relationships: []
      },
      forms: {
        Row: FormRow,
        Insert: Omit<FormRow, 'id' | 'created_at'>,
        Update: Partial<FormRow>,
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_lead_from_form: {
        Args: {
          form_id_in: string,
          lead_data: Json
        },
        Returns: string // The new lead ID
      }
      // FIX: Removed `[_ in never]: never`. An object type cannot have both explicit properties and a mapped type.
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper to convert Supabase snake_case to our app's camelCase
export const fromSupabase = (lead: Database['public']['Tables']['leads']['Row']): Lead => {
    return {
        id: lead.id,
        createdAt: lead.created_at,
        companyId: lead.company_id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        company: lead.company || '',
        email: lead.email,
        phone: lead.phone || '',
        // FIX: Use more specific type assertions instead of 'as any' for better type safety.
        status: lead.status as LeadStatus,
        source: lead.source as LeadSource,
        issueDescription: lead.issue_description ?? undefined,
        // FIX: Cast via 'unknown' for types that don't overlap sufficiently.
        notes: lead.notes ? (lead.notes as unknown as Note[]) : [],
        aiInsights: lead.ai_insights ? (lead.ai_insights as unknown as AIInsights) : null,
    };
};

// Helper to convert our app's camelCase to Supabase snake_case
export const toSupabase = (leadData: Omit<Lead, 'id' | 'createdAt'>): Database['public']['Tables']['leads']['Insert'] => {
    return {
        company_id: leadData.companyId,
        first_name: leadData.firstName,
        last_name: leadData.lastName,
        company: leadData.company,
        email: leadData.email,
        phone: leadData.phone,
        status: leadData.status,
        source: leadData.source,
        notes: (leadData.notes ?? []) as any,
        issue_description: leadData.issueDescription ?? null,
        source_conversation_id: leadData.callDetails?.conversationId ?? null,
        ai_insights: leadData.aiInsights ? (leadData.aiInsights as unknown as Json) : null,
    };
};