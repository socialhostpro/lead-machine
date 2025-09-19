import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { leadData, webhookUrl, webhookHeader } = await req.json()

    if (!leadData || !webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Lead data and webhook URL are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare webhook headers
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (webhookHeader) {
      headers['Authorization'] = webhookHeader
    }

    // Send webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(leadData),
    })

    if (!webhookResponse.ok) {
      const errorBody = await webhookResponse.text()
      return new Response(
        JSON.stringify({ 
          error: `Webhook failed with status ${webhookResponse.status}: ${errorBody}`,
          status: webhookResponse.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const responseBody = await webhookResponse.text()

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: webhookResponse.status,
        response: responseBody 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})