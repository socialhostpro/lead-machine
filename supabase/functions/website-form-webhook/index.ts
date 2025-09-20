import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-company-id, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get company ID from headers or body
    const companyId = req.headers.get('x-company-id');
    const apiKey = req.headers.get('x-api-key');
    
    if (!companyId) {
      return new Response(JSON.stringify({ 
        error: 'Missing company ID in x-company-id header' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify company exists and API key if provided
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, webhook_api_key')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ 
        error: 'Invalid company ID' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify API key if company has one set
    if (company.webhook_api_key && company.webhook_api_key !== apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Invalid API key' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the incoming form data
    const formData = await req.json();
    console.log('📥 Received webhook data:', formData);

    // Extract lead information with flexible field mapping
    const extractLeadData = (data: any) => {
      // Common field mappings
      const fieldMappings = {
        firstName: ['firstName', 'first_name', 'fname', 'firstname', 'name'],
        lastName: ['lastName', 'last_name', 'lname', 'lastname', 'surname'],
        email: ['email', 'email_address', 'emailAddress', 'e_mail'],
        phone: ['phone', 'telephone', 'mobile', 'cell', 'phoneNumber', 'phone_number'],
        company: ['company', 'organization', 'business', 'companyName', 'company_name'],
        message: ['message', 'comments', 'inquiry', 'description', 'details', 'notes']
      };

      const lead: any = {
        company_id: companyId,
        source: 'Website Form',
        status: 'NEW',
        created_at: new Date().toISOString()
      };

      // Extract data using field mappings
      for (const [leadField, possibleFields] of Object.entries(fieldMappings)) {
        for (const field of possibleFields) {
          if (data[field] && !lead[leadField]) {
            lead[leadField] = data[field];
            break;
          }
        }
      }

      // Handle name field if firstName/lastName not found separately
      if (!lead.firstName && !lead.lastName && data.name) {
        const nameParts = data.name.split(' ');
        lead.firstName = nameParts[0] || '';
        lead.lastName = nameParts.slice(1).join(' ') || '';
      }

      // Set issue description from message or form type
      lead.issueDescription = lead.message || `Website form submission from ${company.name}`;

      // Add UTM parameters if present
      const utmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
      utmFields.forEach(field => {
        if (data[field]) {
          lead[field] = data[field];
        }
      });

      // Add any custom fields as metadata
      const standardFields = ['firstName', 'lastName', 'email', 'phone', 'company', 'message'];
      const customFields: any = {};
      
      Object.keys(data).forEach(key => {
        if (!standardFields.some(field => fieldMappings[field]?.includes(key)) && 
            !utmFields.includes(key)) {
          customFields[key] = data[key];
        }
      });

      if (Object.keys(customFields).length > 0) {
        lead.custom_fields = customFields;
      }

      return lead;
    };

    const leadData = extractLeadData(formData);

    // Validate required fields
    if (!leadData.email && !leadData.phone) {
      return new Response(JSON.stringify({ 
        error: 'Either email or phone is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for duplicate leads (same email or phone in last 24 hours)
    let duplicateQuery = supabase
      .from('leads')
      .select('id')
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (leadData.email) {
      duplicateQuery = duplicateQuery.eq('email', leadData.email);
    } else if (leadData.phone) {
      duplicateQuery = duplicateQuery.eq('phone', leadData.phone);
    }

    const { data: duplicates } = await duplicateQuery;

    if (duplicates && duplicates.length > 0) {
      console.log('⚠️ Duplicate lead detected, skipping...');
      return new Response(JSON.stringify({ 
        message: 'Duplicate lead detected (same email/phone within 24 hours)',
        leadId: duplicates[0].id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create the lead
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (leadError) {
      console.error('❌ Error creating lead:', leadError);
      throw leadError;
    }

    console.log('✅ Lead created successfully:', newLead.id);

    // Send notification email if configured
    try {
      const { data: emailSettings } = await supabase
        .from('email_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (emailSettings?.sendgrid_api_key && emailSettings?.notification_email) {
        // Trigger email notification
        await fetch(`${supabaseUrl}/functions/v1/sendgrid-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            type: 'new_lead',
            leadId: newLead.id,
            companyId: companyId
          })
        });
      }
    } catch (emailError) {
      console.error('⚠️ Email notification failed:', emailError);
      // Don't fail the webhook for email errors
    }

    return new Response(JSON.stringify({ 
      success: true,
      leadId: newLead.id,
      message: 'Lead created successfully'
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🚨 Webhook error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});