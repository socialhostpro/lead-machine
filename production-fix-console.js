// PRODUCTION FIX: Browser Console Script to Fix All "Unknown Call" Leads
// Run this in the browser console while logged into the Lead Machine app

async function fixAllUnknownLeads() {
    console.log("🔧 Starting production fix for Unknown Call leads...");
    
    // Name extraction patterns (same as in the updated sync function)
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
    
    const singleNamePatterns = [
        /^([A-Z][a-z]+)\s+called/i,
        /(?:caller|client)\s+([A-Z][a-z]+)/i,
        /name\s+(?:is\s+)?([A-Z][a-z]+)/i
    ];
    
    try {
        // Get the Supabase client from the global window object
        if (!window.supabase) {
            console.error("❌ Supabase client not found. Make sure you're on the Lead Machine app page.");
            return;
        }
        
        console.log("📊 Fetching all Unknown Call leads...");
        
        // Fetch all leads with "Unknown" first name and Call-like last name
        const { data: unknownLeads, error: fetchError } = await window.supabase
            .from('leads')
            .select('*')
            .eq('first_name', 'Unknown')
            .like('last_name', '%Call%')
            .eq('source', 'Incoming Call');
            
        if (fetchError) {
            console.error("❌ Error fetching leads:", fetchError);
            return;
        }
        
        console.log(`🔍 Found ${unknownLeads.length} Unknown Call leads to process`);
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const lead of unknownLeads) {
            if (!lead.issue_description) {
                console.log(`⏭️ Skipping lead ${lead.id} - no issue description`);
                skippedCount++;
                continue;
            }
            
            let firstName = 'Unknown';
            let lastName = lead.last_name; // Keep original timestamp-based name as fallback
            
            // Try full name patterns first
            for (const pattern of namePatterns) {
                const match = lead.issue_description.match(pattern);
                if (match) {
                    firstName = match[1];
                    lastName = match[2];
                    console.log(`✅ Extracted full name: ${firstName} ${lastName} from lead ${lead.id}`);
                    break;
                }
            }
            
            // If still unknown, try single name patterns
            if (firstName === 'Unknown') {
                for (const pattern of singleNamePatterns) {
                    const match = lead.issue_description.match(pattern);
                    if (match) {
                        firstName = match[1];
                        lastName = 'Caller';
                        console.log(`✅ Extracted single name: ${firstName} from lead ${lead.id}`);
                        break;
                    }
                }
            }
            
            // Update the lead if we extracted a name
            if (firstName !== 'Unknown') {
                const { error: updateError } = await window.supabase
                    .from('leads')
                    .update({
                        first_name: firstName,
                        last_name: lastName
                    })
                    .eq('id', lead.id);
                    
                if (updateError) {
                    console.error(`❌ Error updating lead ${lead.id}:`, updateError);
                } else {
                    console.log(`✅ Updated lead ${lead.id}: ${lead.first_name} ${lead.last_name} → ${firstName} ${lastName}`);
                    updatedCount++;
                }
            } else {
                console.log(`⏭️ Could not extract name from lead ${lead.id}: "${lead.issue_description.substring(0, 100)}..."`);
                skippedCount++;
            }
            
            // Add small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log("\n🎉 PRODUCTION FIX COMPLETE!");
        console.log(`✅ Successfully updated: ${updatedCount} leads`);
        console.log(`⏭️ Skipped (no name found): ${skippedCount} leads`);
        console.log(`📊 Total processed: ${unknownLeads.length} leads`);
        
        // Refresh the page to see updated data
        console.log("\n🔄 Refreshing page to show updated leads...");
        window.location.reload();
        
    } catch (error) {
        console.error("❌ Unexpected error during fix:", error);
    }
}

// Confirm before running
console.log("🚨 PRODUCTION FIX READY");
console.log("This will update all 'Unknown Call' leads with proper names extracted from transcripts.");
console.log("Run: fixAllUnknownLeads() to start the fix");
console.log("Or run automatically in 5 seconds...");

// Auto-run after 5 seconds unless cancelled
let autoRunTimer = setTimeout(() => {
    console.log("🚀 Auto-running production fix...");
    fixAllUnknownLeads();
}, 5000);

console.log("To cancel auto-run: clearTimeout(" + autoRunTimer + ")");

// Make function available globally
window.fixAllUnknownLeads = fixAllUnknownLeads;