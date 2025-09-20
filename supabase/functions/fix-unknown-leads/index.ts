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

    console.log('🔧 Starting production fix for Unknown Call leads...')

    // Name extraction patterns
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
    ]
    
    const singleNamePatterns = [
      /^([A-Z][a-z]+)\s+called/i,
      /(?:caller|client)\s+([A-Z][a-z]+)/i,
      /name\s+(?:is\s+)?([A-Z][a-z]+)/i
    ]

    // Get user profile for company filtering
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    let leadsQuery = supabaseClient
      .from('leads')
      .select('*')
      .eq('first_name', 'Unknown')
      .like('last_name', '%Call%')
      .eq('source', 'Incoming Call')

    // Filter by company unless user is SAAS_ADMIN
    if (profile.role !== 'SAAS_ADMIN') {
      leadsQuery = leadsQuery.eq('company_id', profile.company_id)
    }

    const { data: unknownLeads, error: fetchError } = await leadsQuery

    if (fetchError) {
      throw new Error(`Error fetching leads: ${fetchError.message}`)
    }

    console.log(`🔍 Found ${unknownLeads.length} Unknown Call leads to process`)

    let updatedCount = 0
    let skippedCount = 0
    const updates = []

    for (const lead of unknownLeads) {
      if (!lead.issue_description) {
        console.log(`⏭️ Skipping lead ${lead.id} - no issue description`)
        skippedCount++
        continue
      }

      let firstName = 'Unknown'
      let lastName = lead.last_name // Keep original timestamp-based name as fallback

      // Try full name patterns first
      for (const pattern of namePatterns) {
        const match = lead.issue_description.match(pattern)
        if (match) {
          firstName = match[1]
          lastName = match[2]
          console.log(`✅ Extracted full name: ${firstName} ${lastName} from lead ${lead.id}`)
          break
        }
      }

      // If still unknown, try single name patterns
      if (firstName === 'Unknown') {
        for (const pattern of singleNamePatterns) {
          const match = lead.issue_description.match(pattern)
          if (match) {
            firstName = match[1]
            lastName = 'Caller'
            console.log(`✅ Extracted single name: ${firstName} from lead ${lead.id}`)
            break
          }
        }
      }

      // Update the lead if we extracted a name
      if (firstName !== 'Unknown') {
        const { error: updateError } = await supabaseClient
          .from('leads')
          .update({
            first_name: firstName,
            last_name: lastName
          })
          .eq('id', lead.id)

        if (updateError) {
          console.error(`❌ Error updating lead ${lead.id}:`, updateError)
        } else {
          console.log(`✅ Updated: ${lead.first_name} ${lead.last_name} → ${firstName} ${lastName}`)
          updates.push({
            id: lead.id,
            old_name: `${lead.first_name} ${lead.last_name}`,
            new_name: `${firstName} ${lastName}`,
            phone: lead.phone
          })
          updatedCount++
        }
      } else {
        console.log(`⏭️ Could not extract name from lead ${lead.id}`)
        skippedCount++
      }
    }

    const result = {
      success: true,
      message: 'Production fix completed successfully',
      total_processed: unknownLeads.length,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      updates: updates,
      timestamp: new Date().toISOString()
    }

    console.log('🎉 Production fix complete:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Error in production fix:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})