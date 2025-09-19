# Test ElevenLabs via Edge Function (which can access the secret properly)
# This tests the actual integration path

$url = "https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/elevenlabs-conversations"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk"
    "Content-Type" = "application/json"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk0MDgyNCwiZXhwIjoyMDczNTE2ODI0fQ.TJ8BFd8KmdswvkTUIXoW5IvicphK7BgkbtwI4ndC0yk"
}

$body = @{
    conversation_uuid = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    analysis = @{
        user_feedback = "Test feedback - ElevenLabs integration working"
        customer_summary = "Customer called about product pricing and availability"
        inbound_phone_number = "+1234567890"
        call_successful = $true
        user_sentiment = "positive"
        customer_phone_number = "+0987654321"
    }
} | ConvertTo-Json -Depth 3

Write-Host "🧪 Testing ElevenLabs connection via Edge Function..."
Write-Host "This tests the real integration path with your updated API key"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "✅ SUCCESS! ElevenLabs Edge Function is working:"
    Write-Host ($response | ConvertTo-Json -Depth 3)
    Write-Host ""
    Write-Host "🎉 This means:"
    Write-Host "- Your ElevenLabs API key is valid"
    Write-Host "- Edge Function can access the secret"
    Write-Host "- Lead creation pipeline is working"
} catch {
    Write-Host "❌ Edge Function test failed:"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}