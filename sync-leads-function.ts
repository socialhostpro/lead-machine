// SYNC LEADS EDGE FUNCTION
// Deploy this in Supabase Dashboard -> Edge Functions -> Create Function  
// Function name: sync-leads

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { conversationIds } = await req.json()
    
    if (!Array.isArray(conversationIds)) {
      throw new Error('conversationIds must be an array')
    }

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

    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const conversationId of conversationIds) {
      try {
        // Check if lead already exists
        const { data: existingLead } = await supabaseClient
          .from('leads')
          .select('id')
          .eq('source_conversation_id', conversationId)
          .single()

        if (existingLead) {
          continue // Skip if already exists
        }

        // Fetch conversation data from ElevenLabs
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
          headers: {
            'Xi-Api-Key': elevenLabsKey,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`)
        }

        const conversationData = await response.json()
        
        // Create lead from conversation data
        const leadData = {
          company_id: profile.company_id,
          first_name: 'Unknown',
          last_name: 'Caller',
          email: `${conversationId}@elevenlabs.placeholder`,
          phone: conversationData.analysis?.customer_phone_number || 'Unknown',
          company: 'Unknown',
          issue_description: conversationData.analysis?.customer_summary || 'No summary available',
          status: conversationData.analysis?.call_successful ? 'Qualified' : 'Unqualified',
          source: 'ElevenLabs',
          source_conversation_id: conversationId,
          ai_insights: conversationData.analysis || {},
          notes: []
        }

        const { error: leadError } = await supabaseClient
          .from('leads')
          .insert(leadData)

        if (leadError) {
          throw leadError
        }

        syncedCount++
      } catch (error) {
        errorCount++
        errors.push(`Conversation ${conversationId}: ${error.message}`)
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      syncedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error syncing leads:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})