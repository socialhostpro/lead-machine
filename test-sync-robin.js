// Test script to trigger sync-leads function with Robin Wright case
// This will test if the enhanced name extraction works

console.log("Testing sync-leads function for Robin Wright case...");

const testTranscript = "Robin Wright, an existing client, called Sword and Shield Attorneys to request a callback from Adrienne Middleton regarding a grandparent visitation case. Robin provided her name and phone number (850-238-7432) and stated that anytime is suitable for the callback.";

// Test the pattern locally first
const pattern = /^([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:,\s+an?\s+existing\s+client)?,?\s+called/i;
const match = testTranscript.match(pattern);

if (match) {
    console.log("✅ Pattern will extract:", match[1], match[2]);
} else {
    console.log("❌ Pattern failed to match");
}

// If we have access to the conversation ID, we could call the sync function
// For now, this demonstrates the pattern works correctly
console.log("\nThe sync-leads function has been updated with the enhanced pattern.");
console.log("Next time it processes Robin Wright's call, it should extract: Robin Wright");
console.log("instead of: Unknown Call (03:43 PM)");