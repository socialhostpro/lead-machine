import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request data
    const { type, messageData, recipientEmails } = await req.json()

    // Get SendGrid API key from environment
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured')
    }

    // Prepare email content based on notification type
    let subject = ''
    let htmlContent = ''
    let textContent = ''

    if (type === 'new_message') {
      const { leadName, leadEmail, message, timestamp, companyName } = messageData
      
      subject = `New Message from Lead: ${leadName}`
      htmlContent = `
        <h2>New Lead Message Received</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Lead Information:</h3>
          <p><strong>Name:</strong> ${leadName}</p>
          <p><strong>Email:</strong> ${leadEmail}</p>
          <p><strong>Company:</strong> ${companyName || 'Not specified'}</p>
          <p><strong>Received:</strong> ${new Date(timestamp).toLocaleString()}</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0;">
          <h3>Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
          <p><strong>Action Required:</strong> Please log into your Lead Machine dashboard to respond to this message.</p>
          <p><a href="https://leads.imaginecapital.ai" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a></p>
        </div>
      `
      textContent = `New Lead Message Received

Lead Information:
Name: ${leadName}
Email: ${leadEmail}
Company: ${companyName || 'Not specified'}
Received: ${new Date(timestamp).toLocaleString()}

Message:
${message}

Action Required: Please log into your Lead Machine dashboard to respond to this message.
Dashboard: https://leads.imaginecapital.ai`

    } else if (type === 'multiple_messages') {
      const { count, leads, companyName } = messageData
      
      subject = `${count} New Messages from Leads`
      
      const leadsHtml = leads.map(lead => `
        <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
          <p><strong>${lead.name}</strong> (${lead.email})</p>
          <p style="color: #666; font-size: 14px;">${lead.message.substring(0, 100)}${lead.message.length > 100 ? '...' : ''}</p>
        </div>
      `).join('')
      
      htmlContent = `
        <h2>${count} New Lead Messages Received</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Recent Messages:</h3>
          ${leadsHtml}
        </div>
        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
          <p><strong>Action Required:</strong> Please log into your Lead Machine dashboard to respond to these messages.</p>
          <p><a href="https://leads.imaginecapital.ai" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a></p>
        </div>
      `
      
      const leadsText = leads.map(lead => `- ${lead.name} (${lead.email}): ${lead.message.substring(0, 100)}${lead.message.length > 100 ? '...' : ''}`).join('\n')
      
      textContent = `${count} New Lead Messages Received

Recent Messages:
${leadsText}

Action Required: Please log into your Lead Machine dashboard to respond to these messages.
Dashboard: https://leads.imaginecapital.ai`
    }

    // Prepare SendGrid email payload
    const emailPayload = {
      personalizations: recipientEmails.map(email => ({
        to: [{ email }],
        subject
      })),
      from: {
        email: 'notifications@imaginecapital.ai',
        name: 'Lead Machine Notifications'
      },
      content: [
        {
          type: 'text/plain',
          value: textContent
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    }

    // Send email via SendGrid
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    })

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text()
      console.error('SendGrid API Error:', errorText)
      throw new Error(`SendGrid API error: ${sendgridResponse.status}`)
    }

    // Try to log the notification in our database (optional, won't fail the email send)
    try {
      const { error: logError } = await supabaseClient
        .from('email_notifications')
        .insert({
          notification_type: type,
          recipient_emails: recipientEmails,
          subject: subject,
          sent_at: new Date().toISOString(),
          sendgrid_response: sendgridResponse.status
        })

      if (logError) {
        console.error('Error logging notification:', logError)
      }
    } catch (dbError) {
      console.error('Database logging failed (non-critical):', dbError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent successfully',
        recipients: recipientEmails.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('SendGrid notification error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})