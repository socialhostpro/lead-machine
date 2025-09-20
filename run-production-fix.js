// Test script to run the production fix via Edge Function
// This can be run in browser console or as a Node.js script

async function runProductionFix() {
    console.log("🚀 Running production fix via Edge Function...");
    
    const SUPABASE_URL = 'https://xxjpzdmatqcgjxsdokou.supabase.co';
    
    try {
        // Get the auth token (you need to be logged in)
        let authToken = '';
        
        if (typeof window !== 'undefined' && window.supabase) {
            // Browser environment
            const session = await window.supabase.auth.getSession();
            if (session.data.session) {
                authToken = session.data.session.access_token;
            } else {
                console.error("❌ Not logged in. Please log in first.");
                return;
            }
        } else {
            console.error("❌ Run this in the browser console while logged into the app");
            return;
        }
        
        console.log("🔑 Using auth token...");
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/fix-unknown-leads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            console.log("🎉 PRODUCTION FIX SUCCESSFUL!");
            console.log(`📊 Total processed: ${result.total_processed}`);
            console.log(`✅ Successfully updated: ${result.updated_count}`);
            console.log(`⏭️ Skipped: ${result.skipped_count}`);
            
            if (result.updates && result.updates.length > 0) {
                console.log("\n📋 Updates made:");
                result.updates.forEach(update => {
                    console.log(`  • ${update.old_name} → ${update.new_name} (${update.phone})`);
                });
            }
            
            console.log("\n🔄 Refreshing page to see changes...");
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
            
        } else {
            console.error("❌ Production fix failed:", result);
        }
        
    } catch (error) {
        console.error("❌ Error running production fix:", error);
    }
}

// Make function available
if (typeof window !== 'undefined') {
    window.runProductionFix = runProductionFix;
    console.log("🔧 Production fix ready!");
    console.log("Run: runProductionFix() to fix all Unknown Call leads");
} else {
    runProductionFix();
}