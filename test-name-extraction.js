// Test script for name extraction
const transcript = "Robin Wright, an existing client, called Sword and Shield Attorneys to request a callback from Adrienne Middleton regarding a grandparent visitation case. Robin provided her name and phone number (850-238-7432) and stated that anytime is suitable for the callback. The agent confirmed the information and assured Robin that her message would be passed on to the team.";

console.log("Testing name extraction patterns on:");
console.log(transcript);
console.log("\n");

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

for (let i = 0; i < namePatterns.length; i++) {
  const pattern = namePatterns[i];
  const match = transcript.match(pattern);
  console.log(`Pattern ${i + 1}: ${pattern}`);
  if (match) {
    console.log(`✅ MATCH! First: ${match[1]}, Last: ${match[2]}`);
    break;
  } else {
    console.log("❌ No match");
  }
  console.log("");
}