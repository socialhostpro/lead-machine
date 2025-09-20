$uri = "https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/sendgrid-notifications"
$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw'
}

$testBody = @{
    type = "lead_info"
    messageData = @{
        subject = "Test Lead Information"
        message = "Test message"
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

Write-Host "Testing SendGrid function for 502 error fix..."

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $testBody
    Write-Host "SUCCESS! Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode"
    
    if ($statusCode -eq 502) {
        Write-Host "ISSUE: Still getting 502 error"
    } elseif ($statusCode -eq 500) {
        Write-Host "EXPECTED: 500 error (likely missing SendGrid API key) - this is normal for testing"
    } else {
        Write-Host "INFO: Got status $statusCode - function is responding"
    }
    
    Write-Host "Error details: $($_.Exception.Message)"
}