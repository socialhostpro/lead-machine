console.log("Manual Lead Name Update Script");
console.log("=====================================");
console.log("");
console.log("To update the existing Robin Wright lead from 'Unknown Call (03:43 PM)' to 'Robin Wright':");
console.log("");
console.log("1. Open the application in the browser");
console.log("2. Find the lead with phone number: 850-238-7432");
console.log("3. Click 'Edit Lead' button");
console.log("4. Update the name fields:");
console.log("   - First Name: Robin");
console.log("   - Last Name: Wright");
console.log("5. Save the changes");
console.log("");
console.log("OR run this SQL query in the Supabase SQL editor:");
console.log("");
console.log(`UPDATE leads 
SET first_name = 'Robin', 
    last_name = 'Wright' 
WHERE phone = '850-238-7432' 
  AND first_name = 'Unknown' 
  AND last_name LIKE '%Call%';`);
console.log("");
console.log("The enhanced name extraction will prevent this issue for future calls.");