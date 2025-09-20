# Test SendGrid edge function with PowerShell
$uri = "https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/sendgrid-notifications"
$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw'
}

$body = @{
    type = "lead_info"
    messageData = @{
        subject = "Test Lead Information"
        message = "This is a test lead information email to verify the 502 error is fixed."
        leadName = "Test User"
        leadEmail = "test@example.com"
        leadPhone = "555-1234"
        leadCompany = "Test Company"
        leadSource = "Test Source"
        leadStatus = "New"
        leadId = "test-123"
    }
    recipientEmails = @("test@example.com")
    companyId = "test-company-id"
} | ConvertTo-Json -Depth 5

Write-Host "Testing SendGrid edge function..."
Write-Host "Request URI: $uri"
Write-Host "Request Body: $body"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body -ContentType 'application/json'
    Write-Host "✅ SUCCESS!"
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "❌ ERROR!"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Error Message: $($_.Exception.Message)"
    
    if ($_.Exception.Response.StatusCode.value__ -eq 502) {
        Write-Host "🔴 Still getting 502 error - function needs more investigation"
    } else {
        Write-Host "🟡 Different error - may be expected (e.g., missing SendGrid API key)"
    }
}

Write-Host ""
Write-Host "Note: The function should now properly handle 'lead_info' type and not return 502 errors."
Write-Host "If you see a 500 error about SendGrid API key, that's expected since we're testing."
Write-Host "The important thing is that we don't get 502 errors anymore."