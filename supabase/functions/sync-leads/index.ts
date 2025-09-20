import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LeadData {
  id: string
  company_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company?: string
  status: string
  source: string
  issue_description?: string
  source_conversation_id?: string
  ai_insights?: object
  notes: any[]
  created_at?: string
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

    // Fetch conversations from ElevenLabs - try without agent_id filter first
    console.log('Fetching ALL conversations from ElevenLabs...')
    const conversationsResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?summary_mode=include`,
      {
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      }
    )

    if (!conversationsResponse.ok) {
      return new Response(
        JSON.stringify({ error: `ElevenLabs API error: ${conversationsResponse.statusText}` }),
        { status: conversationsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const elevenLabsData = await conversationsResponse.json()
    const conversations = elevenLabsData.conversations || []
    
    // DEBUG: Log all conversations with timestamps
    console.log('=== ALL ELEVENLABS CONVERSATIONS ===')
    console.log(`Agent ID: ${company.default_agent_id}`)
    conversations.forEach((conv: any, index: number) => {
      const callTime = new Date(conv.start_time_unix_secs * 1000)
      console.log(`${index + 1}. Conv ID: ${conv.conversation_id}`)
      console.log(`   Start Time: ${callTime.toLocaleString()} (Unix: ${conv.start_time_unix_secs})`)
      console.log(`   Duration: ${conv.duration_secs || 'N/A'} seconds`)
      console.log(`   Status: ${conv.status || 'N/A'}`)
      console.log(`   ---`)
    })
    console.log(`Total conversations found: ${conversations.length}`)
    console.log('=== END DEBUG ===')

    // Get existing leads from database
    const { data: existingLeads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('company_id', profile.company_id)

    if (leadsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing leads' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingLeadsMap = new Map(
      existingLeads?.map(l => [l.source_conversation_id, l]) ?? []
    )

    const newLeads: LeadData[] = []
    const updatedLeads: LeadData[] = []

    // Process each conversation
    for (const conv of conversations) {
      const existingLead = existingLeadsMap.get(conv.conversation_id)
      
      // Fetch detailed conversation data
      const detailResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
        {
          headers: { 'xi-api-key': elevenLabsApiKey }
        }
      )

      let detailData = null
      if (detailResponse.ok) {
        detailData = await detailResponse.json()
      }

      // Extract data from conversation
      const collectedData = detailData?.analysis?.data_collection_results || {}
      const getVal = (key: string) => (collectedData[key] && collectedData[key].value) ? collectedData[key].value : null

      let firstName = getVal('firstname') || 'Unknown'
      let lastName = getVal('lastname') || `Call (${new Date(conv.start_time_unix_secs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      
      // If name extraction failed, try to parse from transcript_summary
      if (firstName === 'Unknown' && conv.transcript_summary) {
        // Enhanced name extraction patterns
        const namePatterns = [
          // Pattern 1: "First Last called" or "First Last, an existing client"
          /^([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:,\s+an?\s+existing\s+client)?,?\s+called/i,
          // Pattern 2: "First Last provided" or "First Last stated"
          /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:provided|stated|mentioned|gave)/i,
          // Pattern 3: "spoke with First Last" or "speaking with First Last"
          /(?:spoke\s+with|speaking\s+with)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
          // Pattern 4: "name is First Last" or "named First Last"
          /(?:name\s+is|named)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
          // Pattern 5: Direct name mention at start of sentence
          /(?:^|\.\s+)([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:called|contacted|phoned)/i
        ];
        
        for (const pattern of namePatterns) {
          const match = conv.transcript_summary.match(pattern);
          if (match) {
            firstName = match[1];
            lastName = match[2];
            console.log(`Extracted name from transcript: ${firstName} ${lastName}`);
            break;
          }
        }
        
        // If still no match, try simpler single name patterns
        if (firstName === 'Unknown') {
          const singleNamePatterns = [
            /^([A-Z][a-z]+)\s+called/i,
            /(?:caller|client)\s+([A-Z][a-z]+)/i,
            /name\s+(?:is\s+)?([A-Z][a-z]+)/i
          ];
          
          for (const pattern of singleNamePatterns) {
            const match = conv.transcript_summary.match(pattern);
            if (match) {
              firstName = match[1];
              lastName = 'Caller';
              console.log(`Extracted single name from transcript: ${firstName}`);
              break;
            }
          }
        }
      }
      
      const email = getVal('email') || `${conv.conversation_id}@imported-lead.com`
      const phone = getVal('phone') || 'N/A'
      const issueDescription = getVal('description') || null

      if (!existingLead) {
        // Create new lead with proper timestamp from ElevenLabs
        const callTimestamp = new Date(conv.start_time_unix_secs * 1000).toISOString()
        
        const newLead: LeadData = {
          id: conv.conversation_id,
          company_id: profile.company_id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          company: '',
          status: 'New',
          source: 'Incoming Call',
          issue_description: issueDescription,
          source_conversation_id: conv.conversation_id,
          ai_insights: null,
          notes: []
        }
        
        newLeads.push({ ...newLead, created_at: callTimestamp } as any)
      } else {
        // Check if existing lead needs updates
        const hasChanges = 
          existingLead.first_name !== firstName ||
          existingLead.last_name !== lastName ||
          existingLead.email !== email ||
          existingLead.phone !== phone ||
          existingLead.issue_description !== issueDescription

        if (hasChanges) {
          const updatedLead: LeadData = {
            ...existingLead,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            issue_description: issueDescription
          }
          updatedLeads.push(updatedLead)
        }
      }
    }

    // Insert new leads
    if (newLeads.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('leads')
        .insert(newLeads)

      if (insertError) {
        console.error('Error inserting new leads:', insertError)
      }
    }

    // Update existing leads
    for (const lead of updatedLeads) {
      const { error: updateError } = await supabaseClient
        .from('leads')
        .update({
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          issue_description: lead.issue_description
        })
        .eq('source_conversation_id', lead.source_conversation_id)

      if (updateError) {
        console.error('Error updating lead:', updateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        newLeads: newLeads.length,
        updatedLeads: updatedLeads.length,
        totalProcessed: conversations.length
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