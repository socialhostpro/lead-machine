$elevenLabsKey = "sk_8e0100cc23a87c4fcb652f369a451c419eefd21ccf91"
$url = "https://api.elevenlabs.io/v1/user"
$headers = @{
    "Xi-Api-Key" = $elevenLabsKey
    "Content-Type" = "application/json"
}

Write-Host "Testing direct ElevenLabs API connection..."
Write-Host "URL: $url"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    Write-Host "✅ SUCCESS! ElevenLabs API is working:"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ ERROR testing ElevenLabs API:"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}