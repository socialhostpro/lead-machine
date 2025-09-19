import { supabase } from './supabase';

export interface EmailNotificationConfig {
  enabled: boolean;
  adminEmails: string[];
  notificationTypes: {
    newMessage: boolean;
    multipleMessages: boolean;
    batchInterval: number; // minutes
  };
}

// Send immediate email notification for new message
export async function sendNewMessageNotification(
  leadId: string, 
  messageContent: string,
  adminEmails: string[]
): Promise<boolean> {
  try {
    // Handle test mode
    if (leadId === 'test-lead-id') {
      return await sendTestEmailNotification(messageContent, adminEmails);
    }

    // Get lead and company information
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        *,
        company:companies(name)
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Error fetching lead information:', leadError);
      return false;
    }

    // Call the sendgrid-notifications Edge Function
    const { data, error } = await supabase.functions.invoke('sendgrid-notifications', {
      body: {
        type: 'new_message',
        messageData: {
          leadName: `${lead.first_name} ${lead.last_name}`,
          leadEmail: lead.email,
          message: messageContent,
          timestamp: new Date().toISOString(),
          companyName: (lead.company as any)?.name || 'Unknown Company'
        },
        recipientEmails: adminEmails,
        companyId: lead.company_id
      }
    });

    if (error) {
      console.error('Error sending email notification:', error);
      return false;
    }

    console.log('Email notification sent successfully:', data);
    return true;

  } catch (error) {
    console.error('Error in sendNewMessageNotification:', error);
    return false;
  }
}

// Send test email notification
export async function sendTestEmailNotification(
  messageContent: string,
  adminEmails: string[]
): Promise<boolean> {
  try {
    // Call the sendgrid-notifications Edge Function with test data
    const { data, error } = await supabase.functions.invoke('sendgrid-notifications', {
      body: {
        type: 'new_message',
        messageData: {
          leadName: 'Test Lead',
          leadEmail: 'test@example.com',
          message: messageContent,
          timestamp: new Date().toISOString(),
          companyName: 'Test Company'
        },
        recipientEmails: adminEmails,
        companyId: null // Use default settings for test
      }
    });

    if (error) {
      console.error('Error sending test email notification:', error);
      return false;
    }

    console.log('Test email notification sent successfully:', data);
    return true;

  } catch (error) {
    console.error('Error in sendTestEmailNotification:', error);
    return false;
  }
}

// Send batch notification for multiple messages
export async function sendMultipleMessagesNotification(
  companyId: string,
  messageCount: number,
  recentLeads: Array<{
    name: string;
    email: string;
    message: string;
  }>,
  adminEmails: string[]
): Promise<boolean> {
  try {
    // Get company information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('Error fetching company information:', companyError);
      return false;
    }

    // Call the sendgrid-notifications Edge Function
    const { data, error } = await supabase.functions.invoke('sendgrid-notifications', {
      body: {
        type: 'multiple_messages',
        messageData: {
          count: messageCount,
          leads: recentLeads,
          companyName: company.name
        },
        recipientEmails: adminEmails,
        companyId: companyId
      }
    });

    if (error) {
      console.error('Error sending batch email notification:', error);
      return false;
    }

    console.log('Batch email notification sent successfully:', data);
    return true;

  } catch (error) {
    console.error('Error in sendMultipleMessagesNotification:', error);
    return false;
  }
}

// Get email notification configuration for a company
export async function getEmailNotificationConfig(companyId: string): Promise<EmailNotificationConfig | null> {
  try {
    // Get admin users for the company from profiles table
    const { data: adminUsers, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('company_id', companyId)
      .in('role', ['admin', 'manager']);

    if (error) {
      console.error('Error fetching admin users:', error);
      return null;
    }

    const adminEmails = adminUsers?.map(user => (user as any).email).filter(Boolean) || [];

    // Return default configuration (can be made configurable later)
    return {
      enabled: adminEmails.length > 0,
      adminEmails,
      notificationTypes: {
        newMessage: true,
        multipleMessages: true,
        batchInterval: 5 // 5 minutes
      }
    };

  } catch (error) {
    console.error('Error getting email notification config:', error);
    return null;
  }
}

// Real-time notification system
export class EmailNotificationManager {
  private companyId: string;
  private config: EmailNotificationConfig | null = null;
  private messageQueue: Array<{
    leadId: string;
    content: string;
    timestamp: Date;
  }> = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(companyId: string) {
    this.companyId = companyId;
    this.loadConfig();
  }

  private async loadConfig() {
    this.config = await getEmailNotificationConfig(this.companyId);
  }

  // Handle new message notification
  async handleNewMessage(leadId: string, messageContent: string) {
    if (!this.config?.enabled) return;

    // Add to queue for potential batch processing
    this.messageQueue.push({
      leadId,
      content: messageContent,
      timestamp: new Date()
    });

    // If we have multiple messages in queue, start batch timer
    if (this.messageQueue.length > 1 && this.config.notificationTypes.multipleMessages) {
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => {
          this.processBatchNotification();
        }, this.config.notificationTypes.batchInterval * 60 * 1000);
      }
    } else if (this.config.notificationTypes.newMessage) {
      // Send immediate notification for single message
      await sendNewMessageNotification(
        leadId,
        messageContent,
        this.config.adminEmails
      );
    }
  }

  // Process batch notification
  private async processBatchNotification() {
    if (!this.config?.enabled || this.messageQueue.length === 0) return;

    // Get lead information for recent messages
    const recentMessages = await Promise.all(
      this.messageQueue.slice(0, 5).map(async (msg) => {
        const { data: lead } = await supabase
          .from('leads')
          .select('first_name, last_name, email')
          .eq('id', msg.leadId)
          .single();

        return {
          name: lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown Lead',
          email: lead?.email || 'unknown@email.com',
          message: msg.content
        };
      })
    );

    // Send batch notification
    await sendMultipleMessagesNotification(
      this.companyId,
      this.messageQueue.length,
      recentMessages,
      this.config.adminEmails
    );

    // Clear queue and timer
    this.messageQueue = [];
    this.batchTimer = null;
  }

  // Clean up
  destroy() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }
}