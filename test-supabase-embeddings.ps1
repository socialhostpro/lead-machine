# Test Supabase Embeddings Function
$uri = "https://xxjpzdmatqcgjxsdokou.supabase.co/functions/v1/supabase-embeddings"
$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDA4MjQsImV4cCI6MjA3MzUxNjgyNH0.mFRzWP5O18B6xw65sWEbJWOufAiMZ2-ypBrMxQ4okbw'
}

$testBody = @{
    texts = @(
        "This is a test lead with customer service issue",
        "Potential client interested in our services",
        "Follow-up call needed for this prospect"
    )
    model = "gte-small"
    options = @{
        normalize = $true
        truncate = $true
    }
} | ConvertTo-Json -Depth 5

Write-Host "Testing Supabase embedding function..."

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $testBody
    Write-Host "SUCCESS! Status Code: $($response.StatusCode)"
    
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Number of embeddings generated: $($data.embeddings.Count)"
    Write-Host "Embedding dimensions: $($data.embeddings[0].Count)"
    Write-Host "Model used: $($data.model)"
    Write-Host "Total tokens: $($data.usage.total_tokens)"
    
    # Verify embedding quality
    $embedding = $data.embeddings[0]
    $magnitude = [Math]::Sqrt(($embedding | ForEach-Object { $_ * $_ } | Measure-Object -Sum).Sum)
    Write-Host "Embedding magnitude: $magnitude (should be close to 1.0 for normalized vectors)"
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode"
    
    if ($statusCode -eq 502) {
        Write-Host "ERROR: 502 - Function deployment issue"
    } elseif ($statusCode -eq 500) {
        Write-Host "ERROR: 500 - Function execution error"
    } else {
        Write-Host "Other error: $statusCode"
    }
    
    Write-Host "Error details: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "If successful, this confirms Supabase embeddings are working without OpenAI!"