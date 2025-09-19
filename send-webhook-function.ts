// SEND WEBHOOK EDGE FUNCTION
// Deploy this in Supabase Dashboard -> Edge Functions -> Create Function
// Function name: send-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface WebhookPayload {
  leadId: string;
  agentId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !userData.user) {
      throw new Error('Invalid user')
    }

    const { leadId, agentId }: WebhookPayload = await req.json()

    if (!leadId) {
      throw new Error('leadId is required')
    }

    // Get user's company
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', userData.user.id)
      .single()

    if (!profile?.company_id) {
      throw new Error('User company not found')
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('company_id', profile.company_id)
      .single()

    if (leadError || !lead) {
      throw new Error('Lead not found')
    }

    // Get company webhook settings
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('webhook_url, webhook_header, default_agent_id')
      .eq('id', profile.company_id)
      .single()

    if (companyError || !company) {
      throw new Error('Company not found')
    }

    const webhookUrl = company.webhook_url
    if (!webhookUrl) {
      throw new Error('No webhook URL configured for company')
    }

    // Prepare webhook payload
    const webhookPayload = {
      lead: {
        id: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
        source: lead.source,
        issueDescription: lead.issue_description,
        notes: lead.notes,
        aiInsights: lead.ai_insights,
        createdAt: lead.created_at
      },
      agentId: agentId || company.default_agent_id,
      timestamp: new Date().toISOString()
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Lead-Machine-Webhook/1.0'
    }

    // Add custom header if configured
    if (company.webhook_header) {
      try {
        const customHeaders = JSON.parse(company.webhook_header)
        Object.assign(headers, customHeaders)
      } catch (e) {
        console.warn('Invalid webhook header JSON:', e)
      }
    }

    // Send webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(webhookPayload)
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }

    const responseText = await response.text()
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook sent successfully',
      response: responseText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error sending webhook:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})