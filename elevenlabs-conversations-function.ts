// ELEVENLABS CONVERSATIONS EDGE FUNCTION
// Deploy this in Supabase Dashboard -> Edge Functions -> Create Function
// Function name: elevenlabs-conversations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ConversationData {
  conversation_uuid: string;
  analysis: {
    user_feedback: string;
    customer_summary: string;
    inbound_phone_number: string;
    call_successful: boolean;
    user_sentiment: string;
    customer_phone_number: string;
  };
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

    const requestData: ConversationData = await req.json()
    console.log('Processing conversation data:', requestData)

    // Get ElevenLabs API key from secrets
    const elevenLabsKey = Deno.env.get('ELEVEN_LABS_API_KEY')
    if (!elevenLabsKey) {
      throw new Error('ElevenLabs API key not configured')
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

    // Check if lead already exists with this conversation_id
    const { data: existingLead } = await supabaseClient
      .from('leads')
      .select('id')
      .eq('source_conversation_id', requestData.conversation_uuid)
      .single()

    if (existingLead) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Lead already exists',
        leadId: existingLead.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Create new lead from conversation data
    const leadData = {
      company_id: profile.company_id,
      first_name: 'Unknown', // ElevenLabs doesn't provide names
      last_name: 'Caller',
      email: `${requestData.conversation_uuid}@elevenlabs.placeholder`,
      phone: requestData.analysis.customer_phone_number || 'Unknown',
      company: 'Unknown',
      issue_description: requestData.analysis.customer_summary,
      status: requestData.analysis.call_successful ? 'Qualified' : 'Unqualified',
      source: 'ElevenLabs',
      source_conversation_id: requestData.conversation_uuid,
      ai_insights: {
        user_feedback: requestData.analysis.user_feedback,
        customer_summary: requestData.analysis.customer_summary,
        user_sentiment: requestData.analysis.user_sentiment,
        call_successful: requestData.analysis.call_successful,
        inbound_phone_number: requestData.analysis.inbound_phone_number
      },
      notes: []
    }

    const { data: newLead, error: leadError } = await supabaseClient
      .from('leads')
      .insert(leadData)
      .select()
      .single()

    if (leadError) {
      throw leadError
    }

    console.log('Created lead:', newLead.id)

    return new Response(JSON.stringify({ 
      success: true, 
      leadId: newLead.id,
      message: 'Lead created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing conversation:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})