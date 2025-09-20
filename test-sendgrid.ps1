# Test SendGrid via Edge Function
# This tests the actual SendGrid integration

$url = "https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/sendgrid-notifications"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk"
    "Content-Type" = "application/json"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk"
}

$body = @{
    type = "test_email"
    messageData = @{
        testMessage = "Testing SendGrid edge function"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        adminEmail = "test@example.com"
    }
    recipientEmails = @("test@example.com")
    companyId = $null
} | ConvertTo-Json -Depth 3

Write-Host "Testing SendGrid connection via Edge Function..."
Write-Host "This tests the SendGrid integration to identify the 500 error"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "SUCCESS! SendGrid Edge Function is working:"
    Write-Host ($response | ConvertTo-Json -Depth 3)
    Write-Host ""
    Write-Host "SendGrid integration is functioning correctly!"
} catch {
    Write-Host "ERROR! SendGrid Edge Function failed:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get more details from the response
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Response Body: $errorBody" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read error response body" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "This confirms the SendGrid 500 error. Check:"
    Write-Host "1. SendGrid API key is set in Supabase environment"
    Write-Host "2. API key has proper permissions"
    Write-Host "3. Edge function logs for more details"
}

Write-Host ""
Write-Host "To check SendGrid environment variables:"
Write-Host "1. Go to Supabase dashboard"
Write-Host "2. Navigate to Project Settings > Edge Functions"
Write-Host "3. Check if SENDGRID_API_KEY is set"