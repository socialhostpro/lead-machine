// CORRECTED SENDGRID EDGE FUNCTION
// Fixes camelCase/snake_case mismatch and adds proper test email support
// Date: September 19, 2025

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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request data
    const { type, messageData, recipientEmails, companyId } = await req.json()

    // Get SendGrid API key from environment
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured')
    }

    // Get company email settings using correct snake_case column names
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test Email from Lead Machine</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>✅ Success! Your email configuration is working correctly.</strong></p>
            <p><strong>Test Message:</strong> ${testMessage || 'No message provided'}</p>
            <p><strong>Sent to:</strong> ${adminEmail}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>From:</strong> ${emailSettings.fromEmail} (${emailSettings.fromName})</p>
            <p><strong>Reply-To:</strong> ${emailSettings.replyToEmail}</p>
          </div>
          <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
            <p><strong>Configuration Verified!</strong></p>
            <p>You can now receive email notifications when new messages arrive from leads.</p>
            <p><a href="https://leads.imaginecapital.ai" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
          </div>
        </div>
      `
      textContent = `
Test Email from Lead Machine

✅ Success! Your email configuration is working correctly.

Test Message: ${testMessage || 'No message provided'}
Sent to: ${adminEmail}
Timestamp: ${new Date().toLocaleString()}
From: ${emailSettings.fromEmail} (${emailSettings.fromName})
Reply-To: ${emailSettings.replyToEmail}

Configuration Verified!
You can now receive email notifications when new messages arrive from leads.

Dashboard: https://leads.imaginecapital.ai
      `
    } else if (type === 'new_message') {
      const { leadName, leadEmail, message, timestamp, companyName } = messageData
      
      subject = `New Message from Lead: ${leadName}`
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">New Lead Message Received</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #555;">Lead Information:</h3>
            <p><strong>Name:</strong> ${leadName}</p>
            <p><strong>Email:</strong> ${leadEmail}</p>
            <p><strong>Company:</strong> ${companyName || 'Not specified'}</p>
            <p><strong>Received:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0;">
            <h3 style="color: #555;">Message:</h3>
            <p style="white-space: pre-wrap; line-height: 1.5;">${message}</p>
          </div>
          <div style="margin-top: 30px; padding: 15px; background-color: #e8f4f8; border-radius: 5px;">
            <p><strong>Action Required:</strong> Please log into your Lead Machine dashboard to respond to this message.</p>
            <p><a href="https://leads.imaginecapital.ai" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a></p>
          </div>
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

    console.log('Sending email with payload:', JSON.stringify(emailPayload, null, 2))

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
      throw new Error(`SendGrid API error: ${sendgridResponse.status} - ${errorText}`)
    }

    const responseData = {
      success: true, 
      message: 'Email notification sent successfully',
      recipients: recipientEmails.length,
      timestamp: new Date().toISOString(),
      emailSettings: emailSettings
    }

    console.log('Email sent successfully:', responseData)

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('SendGrid notification error:', error)
    
    const errorResponse = {
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})