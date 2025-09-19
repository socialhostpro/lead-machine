$url = "https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/elevenlabs-conversations"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzYyNzQsImV4cCI6MjA0NzYxMjI3NH0.RBFCKcDBGKdKPqDf4L5F7bY8Lv6oPqVp0pSx1vf8j9Y"
    "Content-Type" = "application/json"
}

$body = @{
    conversation_uuid = "test-123"
    analysis = @{
        user_feedback = "test feedback"
        customer_summary = "test summary"
        inbound_phone_number = "+1234567890"
        call_successful = $true
        user_sentiment = "positive"
        customer_phone_number = "+0987654321"
    }
} | ConvertTo-Json -Depth 3

Write-Host "Testing ElevenLabs Edge Function..."
Write-Host "URL: $url"
Write-Host "Body: $body"

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "✅ SUCCESS! Edge Function Response:"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ ERROR testing Edge Function:"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}