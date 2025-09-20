// Lead Email Notification System
// Sends email summaries of new leads detected during background checks

import { Lead, Company, User, UserRole } from '../types';
import { sendAdminTestEmail } from './emailNotifications';

export interface LeadSummary {
  totalCount: number;
  leads: Lead[];
  timeframe: string;
  companyName: string;
}

/**
 * Formats lead data for email display
 */
function formatLeadForEmail(lead: Lead): string {
  const distance = lead.distance_from_user ? ` (${lead.distance_from_user.toFixed(1)} miles away)` : '';
  const phone = lead.phone ? ` • Phone: ${lead.phone}` : '';
  const email = lead.email ? ` • Email: ${lead.email}` : '';
  const source = lead.source ? ` • Source: ${lead.source}` : '';
  
  return `
    📋 ${lead.firstName} ${lead.lastName}${distance}
    ${phone}${email}${source}
    Status: ${lead.status}
    Created: ${new Date(lead.createdAt).toLocaleString()}
  `;
}

/**
 * Generates HTML email content for new leads summary
 */
function generateLeadSummaryHTML(summary: LeadSummary): string {
  const leadsList = summary.leads.map(lead => {
    const distance = lead.distance_from_user ? ` <span style="color: #6366f1;">(${lead.distance_from_user.toFixed(1)} miles away)</span>` : '';
    const phone = lead.phone ? `<br>📞 ${lead.phone}` : '';
    const email = lead.email ? `<br>✉️ ${lead.email}` : '';
    const source = lead.source ? `<br>🔗 Source: ${lead.source}` : '';
    
    return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 8px 0; background: #f9fafb;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">
          📋 ${lead.firstName} ${lead.lastName}${distance}
        </h3>
        <div style="color: #6b7280; font-size: 14px;">
          ${phone}${email}${source}
          <br>📊 Status: <strong>${lead.status}</strong>
          <br>🕒 Created: ${new Date(lead.createdAt).toLocaleString()}
        </div>
      </div>
    `;
  }).join('');

  return `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(90deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">🎯 New Leads Alert</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">${summary.companyName}</p>
        </div>
        
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px 0; color: #1f2937;">📊 Summary</h2>
          <p style="margin: 0; color: #4b5563;">
            <strong>${summary.totalCount} new lead${summary.totalCount !== 1 ? 's' : ''}</strong> detected during ${summary.timeframe}
          </p>
        </div>
        
        <div>
          <h2 style="color: #1f2937; margin-bottom: 16px;">📋 Lead Details</h2>
          ${leadsList}
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            🚀 Log in to your Lead Machine dashboard to follow up with these leads immediately!
          </p>
          <a href="https://leads.imaginecapital.ai" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Open Dashboard
          </a>
        </div>
        
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Lead Machine - Automated Lead Management System</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates plain text email content for new leads summary
 */
function generateLeadSummaryText(summary: LeadSummary): string {
  const leadsList = summary.leads.map(formatLeadForEmail).join('\n');
  
  return `
🎯 NEW LEADS ALERT - ${summary.companyName}

📊 SUMMARY
${summary.totalCount} new lead${summary.totalCount !== 1 ? 's' : ''} detected during ${summary.timeframe}

📋 LEAD DETAILS
${leadsList}

🚀 Action Required: Log in to your Lead Machine dashboard to follow up with these leads immediately!
Dashboard: https://leads.imaginecapital.ai

---
Lead Machine - Automated Lead Management System
  `.trim();
}

/**
 * Sends email notification about new leads to company administrators
 */
export async function sendNewLeadsNotification(
  newLeads: Lead[],
  company: Company,
  adminUsers: User[],
  timeframe: string = 'the last check'
): Promise<{ success: boolean; error?: string }> {
  if (newLeads.length === 0) {
    return { success: true }; // No leads to notify about
  }

  const summary: LeadSummary = {
    totalCount: newLeads.length,
    leads: newLeads,
    timeframe,
    companyName: company.name
  };

  try {
    // Get admin email addresses
    const adminEmails = adminUsers
      .filter(user => !user.isDisabled)
      .map(user => user.email)
      .filter(email => email && email.includes('@'));

    if (adminEmails.length === 0) {
      console.warn('No valid admin email addresses found for lead notifications');
      return { success: false, error: 'No valid admin email addresses' };
    }

    const subject = `🎯 ${newLeads.length} New Lead${newLeads.length !== 1 ? 's' : ''} - ${company.name}`;
    const htmlContent = generateLeadSummaryHTML(summary);
    const textContent = generateLeadSummaryText(summary);

    // Send notification using the Supabase edge function
    console.log(`📧 Sending new leads notification to ${adminEmails.length} admin(s)`);
    
    // Use the sendgrid-notifications edge function
    const response = await fetch(`https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/sendgrid-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk`
      },
      body: JSON.stringify({
        type: 'new_leads_summary',
        messageData: {
          subject,
          htmlContent,
          textContent,
          companyName: company.name,
          leadCount: newLeads.length,
          timeframe
        },
        recipientEmails: adminEmails,
        companyId: company.id
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send leads notification:', errorText);
      return { success: false, error: 'Failed to send notification' };
    }

    console.log(`✅ New leads notifications sent to ${adminEmails.length} admin(s)`);
    return { success: true };

  } catch (error) {
    console.error('Error sending new leads notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Filters users to get only administrators and owners
 */
export function getAdminUsers(users: User[]): User[] {
  return users.filter(user => 
    (user.role === UserRole.OWNER || user.role === UserRole.SAAS_ADMIN) && 
    !user.isDisabled
  );
}

/**
 * Formats a time duration for display in email notifications
 */
export function formatTimeframe(minutes: number): string {
  if (minutes < 60) {
    return `the last ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `the last ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `the last ${days} day${days !== 1 ? 's' : ''}`;
  }
}