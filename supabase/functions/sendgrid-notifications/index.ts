import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    // Validate environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }
    
    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    // Create Supabase client
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get and validate the request data
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }
    
    const { type, messageData, recipientEmails, companyId } = requestData;
    
    if (!type || !messageData || !recipientEmails || !Array.isArray(recipientEmails)) {
      throw new Error('Missing required fields: type, messageData, or recipientEmails');
    }
    
    if (recipientEmails.length === 0) {
      throw new Error('No recipient emails provided');
    }

    // Get company email settings
    let emailSettings = {
      fromEmail: 'notifications@imaginecapital.ai',
      fromName: 'Lead Machine Notifications',
      replyToEmail: 'notifications@imaginecapital.ai',
      dnsVerified: false
    }

    if (companyId) {
      const { data: company } = await supabaseClient
        .from('companies')
        .select('email_from_address, email_reply_to_address, email_from_name, sendgrid_dns_verified')
        .eq('id', companyId)
        .single()

      if (company) {
        emailSettings = {
          fromEmail: company.email_from_address || 'notifications@imaginecapital.ai',
          fromName: company.email_from_name || 'Lead Machine Notifications',
          replyToEmail: company.email_reply_to_address || 'notifications@imaginecapital.ai',
          dnsVerified: company.sendgrid_dns_verified || false
        }
      }
    }

    // Prepare email content based on notification type
    let subject = ''
    let htmlContent = ''
    let textContent = ''

    if (type === 'test_email') {
      const { testMessage, adminEmail } = messageData
      
      subject = 'Lead Machine Test Email'
      htmlContent = `
        <h2>Test Email from Lead Machine</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>This is a test email to verify your email configuration is working correctly.</strong></p>
          <p><strong>Test Message:</strong> ${testMessage || 'No message provided'}</p>
          <p><strong>Sent to:</strong> ${adminEmail}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
          <p><strong>✅ Success!</strong> Your SendGrid configuration is working correctly.</p>
          <p>You can now receive email notifications when new messages arrive from leads.</p>
          <p><a href="https://leads.imaginecapital.ai" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
        </div>
      `
      textContent = `
Test Email from Lead Machine

This is a test email to verify your email configuration is working correctly.

Test Message: ${testMessage || 'No message provided'}
Sent to: ${adminEmail}
Timestamp: ${new Date().toLocaleString()}

✅ Success! Your SendGrid configuration is working correctly.
You can now receive email notifications when new messages arrive from leads.

Dashboard: https://leads.imaginecapital.ai
      `
    } else if (type === 'new_message') {
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
      textContent = `
New Lead Message Received

Lead Information:
Name: ${leadName}
Email: ${leadEmail}
Company: ${companyName || 'Not specified'}
Received: ${new Date(timestamp).toLocaleString()}

Message:
${message}

Action Required: Please log into your Lead Machine dashboard to respond to this message.
Dashboard: https://leads.imaginecapital.ai
      `
    } else if (type === 'lead_info') {
      const { subject: customSubject, message, leadName, leadEmail, leadPhone, leadCompany, leadSource, leadStatus, leadId } = messageData
      
      subject = customSubject || `Lead Information: ${leadName}`
      htmlContent = `
        <h2>Lead Information Summary</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Lead Details:</h3>
          <p><strong>Name:</strong> ${leadName}</p>
          <p><strong>Email:</strong> ${leadEmail}</p>
          <p><strong>Phone:</strong> ${leadPhone}</p>
          <p><strong>Company:</strong> ${leadCompany || 'Not provided'}</p>
          <p><strong>Source:</strong> ${leadSource}</p>
          <p><strong>Status:</strong> ${leadStatus}</p>
          <p><strong>Lead ID:</strong> ${leadId}</p>
        </div>
        <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0;">
          <h3>Complete Information:</h3>
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 14px;">${message}</pre>
        </div>
        <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
          <p><strong>Dashboard Access:</strong> Manage this lead and others in your dashboard.</p>
          <p><a href="https://leads.imaginecapital.ai" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a></p>
        </div>
      `
      textContent = `
Lead Information Summary

Lead Details:
Name: ${leadName}
Email: ${leadEmail}
Phone: ${leadPhone}
Company: ${leadCompany || 'Not provided'}
Source: ${leadSource}
Status: ${leadStatus}
Lead ID: ${leadId}

Complete Information:
${message}

Dashboard Access: Manage this lead and others in your dashboard.
Dashboard: https://leads.imaginecapital.ai
      `
    } else {
      // Handle unrecognized email types
      throw new Error(`Unsupported email type: ${type}. Supported types are: test_email, new_message, lead_info`);
    }

    // Validate that email content was properly set
    if (!subject || !htmlContent || !textContent) {
      throw new Error(`Email content not properly generated for type: ${type}`);
    }

    // Prepare SendGrid email payload with custom email settings
    const emailPayload = {
      personalizations: recipientEmails.map(email => ({
        to: [{ email }],
        subject
      })),
      from: {
        email: emailSettings.fromEmail,
        name: emailSettings.fromName
      },
      reply_to: {
        email: emailSettings.replyToEmail,
        name: emailSettings.fromName
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
      console.error('SendGrid API Error:', {
        status: sendgridResponse.status,
        statusText: sendgridResponse.statusText,
        errorText: errorText,
        headers: Object.fromEntries(sendgridResponse.headers.entries())
      })
      throw new Error(`SendGrid API error (${sendgridResponse.status}): ${errorText || sendgridResponse.statusText}`)
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // Provide more specific error information
    let errorMessage = 'Email notification failed';
    let statusCode = 500;
    
    if (error.message.includes('SendGrid API key not configured')) {
      errorMessage = 'SendGrid API key is not configured';
      statusCode = 500;
    } else if (error.message.includes('SendGrid API error')) {
      errorMessage = `SendGrid service error: ${error.message}`;
      statusCode = 502;
    } else if (error.message.includes('Unsupported email type')) {
      errorMessage = `Invalid email type: ${error.message}`;
      statusCode = 400;
    } else if (error.message.includes('Email content not properly generated')) {
      errorMessage = `Email generation failed: ${error.message}`;
      statusCode = 500;
    } else if (error.message.includes('JSON')) {
      errorMessage = 'Invalid request format';
      statusCode = 400;
    } else if (error.message.includes('Missing required fields')) {
      errorMessage = `Invalid request: ${error.message}`;
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      }
    )
  }
})