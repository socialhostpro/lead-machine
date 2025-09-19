// Test ElevenLabs Connection via Frontend
// Open browser console at http://localhost:5173 and run this

async function testElevenLabsConnection() {
    console.log('Testing ElevenLabs connection via Edge Function...');
    
    try {
        // First, we need to be authenticated
        const { data: { user }, error: authError } = await window.supabase.auth.getUser();
        
        if (authError || !user) {
            console.log('❌ Not authenticated. Please sign up/login first.');
            return;
        }
        
        console.log('✅ User authenticated:', user.email);
        
        // Test the Edge Function
        const { data, error } = await window.supabase.functions.invoke('elevenlabs-conversations', {
            body: {
                conversation_uuid: 'test-' + Date.now(),
                analysis: {
                    user_feedback: 'Test feedback from browser',
                    customer_summary: 'Test customer called about product inquiry',
                    inbound_phone_number: '+1234567890',
                    call_successful: true,
                    user_sentiment: 'positive',
                    customer_phone_number: '+0987654321'
                }
            }
        });
        
        if (error) {
            console.log('❌ Edge Function Error:', error);
        } else {
            console.log('✅ Edge Function Success:', data);
        }
        
    } catch (err) {
        console.log('❌ Unexpected error:', err);
    }
}

// Run the test
testElevenLabsConnection();