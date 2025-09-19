import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the session or user object
    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the ElevenLabs API key from secrets
    const elevenLabsApiKey = Deno.env.get('ELEVEN_LABS_API_KEY')
    if (!elevenLabsApiKey) {
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's company info
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get company's default agent ID
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('default_agent_id')
      .eq('id', profile.company_id)
      .single()

    if (companyError || !company?.default_agent_id) {
      return new Response(
        JSON.stringify({ error: 'Company default agent ID not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const conversationId = url.searchParams.get('conversation_id')

    let elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${company.default_agent_id}&summary_mode=include`
    
    // If conversation_id is provided, fetch specific conversation details
    if (conversationId) {
      elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`
    }

    // Fetch from ElevenLabs API
    const elevenLabsResponse = await fetch(elevenLabsUrl, {
      headers: {
        'xi-api-key': elevenLabsApiKey,
      },
    })

    if (!elevenLabsResponse.ok) {
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${elevenLabsResponse.statusText}` }),
        { status: elevenLabsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await elevenLabsResponse.json()

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})