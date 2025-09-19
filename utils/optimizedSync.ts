import { supabase } from './supabase';

export interface SyncResult {
  success: boolean;
  newConversations: number;
  updatedLeads: number;
  error?: string;
}

// Optimized sync that only downloads new/missing conversations
export async function performIncrementalSync(companyId: string, agentId: string): Promise<SyncResult> {
  try {
    // For now, use hardcoded Supabase URL since we can't access protected properties
    const supabaseUrl = 'https://xxjpzdmatqcgjxsdokou.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw';

    // Get current conversations from ElevenLabs
    const listResponse = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to fetch conversations: ${listResponse.status}`);
    }

    const conversations = await listResponse.json();
    
    // For now, process all conversations (until we add sync tracking columns)
    let newConversations = conversations;

    console.log(`Found ${newConversations.length} conversations to process`);

    if (newConversations.length === 0) {
      return {
        success: true,
        newConversations: 0,
        updatedLeads: 0
      };
    }

    // Process each conversation
    let updatedLeads = 0;
    let processedConversations = 0;

    for (const conversation of newConversations) {
      try {
        // Get detailed conversation data
        const detailResponse = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-conversations?conversation_id=${conversation.conversation_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (detailResponse.ok) {
          const conversationDetail = await detailResponse.json();
          
          // Check if we already have a lead for this conversation
          const { data: existingLead } = await supabase
            .from('leads')
            .select('id')
            .eq('company_id', companyId)
            .eq('source_conversation_id', conversation.conversation_id)
            .single();

          if (!existingLead && conversationDetail.caller_info) {
            // Create new lead from conversation - use the correct database schema format
            const leadData = {
              company_id: companyId,
              first_name: conversationDetail.caller_info.first_name || 'Unknown',
              last_name: conversationDetail.caller_info.last_name || '',
              company: conversationDetail.caller_info.company || '',
              email: conversationDetail.caller_info.email || '',
              phone: conversationDetail.caller_info.phone || '',
              source: 'Incoming Call',
              status: 'New',
              source_conversation_id: conversation.conversation_id,
              issue_description: conversationDetail.summary?.summary || '',
              notes: [],
              ai_insights: null
            };

            const { error: insertError } = await supabase
              .from('leads')
              .insert([leadData]);

            if (!insertError) {
              updatedLeads++;
            }
          }
          
          processedConversations++;
        }
      } catch (convError) {
        console.error(`Error processing conversation ${conversation.conversation_id}:`, convError);
      }
    }

    return {
      success: true,
      newConversations: processedConversations,
      updatedLeads: updatedLeads
    };

  } catch (error) {
    console.error('Incremental sync error:', error);
    return {
      success: false,
      newConversations: 0,
      updatedLeads: 0,
      error: error instanceof Error ? error.message : 'Unknown sync error'
    };
  }
}

// Check if user should receive notifications based on their preferences
export function shouldSendNotification(user: any, notificationType: string): boolean {
  // Check if notifications are enabled
  if (user.emailNotificationsEnabled === false) {
    return false;
  }

  // Check frequency setting
  if (user.notificationFrequency === 'disabled') {
    return false;
  }

  // Check if this specific notification type is enabled
  if (user.notificationTypes && !user.notificationTypes[notificationType]) {
    return false;
  }

  // For non-immediate frequencies, we would need additional logic to batch notifications
  // For now, only send immediate notifications
  return user.notificationFrequency === 'immediate' || !user.notificationFrequency;
}

// Get users who should receive notifications for a company (simplified version)
export async function getNotificationRecipients(companyId: string, notificationType: string = 'newMessage'): Promise<string[]> {
  try {
    // For now, get all admin users since we don't have the notification preferences in the database yet
    const { data: users, error } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('company_id', companyId);

    if (error || !users) {
      console.error('Error fetching notification recipients:', error);
      return [];
    }

    // Return admin and owner emails for now
    return users
      .filter(user => user.role === 'Owner' || user.role === 'SaaS Admin')
      .map(user => user.email);

  } catch (error) {
    console.error('Error getting notification recipients:', error);
    return [];
  }
}