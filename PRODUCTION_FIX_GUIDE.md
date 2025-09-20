# PRODUCTION FIX: Unknown Call Leads Name Extraction

This fix resolves the issue where leads imported from ElevenLabs show as "Unknown Call (time)" instead of the actual caller's name from the transcript.

## 🔧 What This Fix Does

1. **Enhanced Name Extraction**: Updates the `sync-leads` edge function with improved regex patterns to extract names from call transcripts
2. **Retroactive Fix**: Updates all existing "Unknown Call" leads by extracting names from their `issue_description` field
3. **Future Prevention**: Ensures all new calls will have proper name extraction

## 📋 Implementation Options

### Option 1: Browser Console Fix (Immediate)
1. Open the Lead Machine app in your browser
2. Log in as admin
3. Open browser developer console (F12)
4. Copy and paste the contents of `run-production-fix.js`
5. Run `runProductionFix()`

### Option 2: Edge Function Fix (Recommended)
```bash
# Deploy the fix function
npx supabase functions deploy fix-unknown-leads

# Test the function (in browser console)
runProductionFix()
```

### Option 3: SQL Fix (Database Direct)
1. Open Supabase SQL Editor
2. Run the queries in `fix-all-unknown-leads.sql`

## 🎯 Expected Results

### Before Fix:
- Name: "Unknown Call (03:43 PM)"
- Description: "Robin Wright, an existing client, called..."

### After Fix:
- Name: "Robin Wright"  
- Description: "Robin Wright, an existing client, called..."

## 📊 Pattern Examples

The fix recognizes these name patterns:

1. **"First Last, an existing client, called"**
   - "Robin Wright, an existing client, called Sword and Shield..."
   - Extracts: Robin Wright

2. **"First Last called"**
   - "John Smith called about his case..."
   - Extracts: John Smith

3. **"First Last provided/stated/mentioned"**
   - "Mary Johnson provided her phone number..."
   - Extracts: Mary Johnson

4. **Single names**
   - "Robin called regarding..."
   - Extracts: Robin Caller

## 🚀 Deployment Steps

1. **Deploy Enhanced Sync Function**
   ```bash
   npx supabase functions deploy sync-leads
   ```

2. **Deploy Production Fix Function**
   ```bash
   npx supabase functions deploy fix-unknown-leads
   ```

3. **Run the Fix**
   - Via browser console: `runProductionFix()`
   - Via SQL: Execute `fix-all-unknown-leads.sql`

4. **Verify Results**
   - Check leads list for updated names
   - Confirm "Unknown Call" count reduced

## ⚠️ Important Notes

- **Backup First**: The fix modifies existing lead data
- **Test Environment**: Run on staging first if available
- **Admin Access**: Requires admin/SAAS_ADMIN permissions
- **Company Scope**: Non-admin users only fix their company's leads

## 🔄 Future Calls

All new ElevenLabs calls will automatically use the enhanced name extraction patterns, preventing "Unknown Call" entries going forward.

## 📞 Support

If names still show as "Unknown Call" after this fix:
1. Check the `issue_description` field contains the caller's name
2. Verify the name follows one of the supported patterns
3. Consider adding new regex patterns for edge cases