$url = "https://xxjpzdmatqcgjxsdokou.supabase.co/rest/v1/rpc/exec_sql"
$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzYyNzQsImV4cCI6MjA0NzYxMjI3NH0.RBFCKcDBGKdKPqDf4L5F7bY8Lv6oPqVp0pSx1vf8j9Y"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4anB6ZG1hdHFjZ2p4c2Rva291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzYyNzQsImV4cCI6MjA0NzYxMjI3NH0.RBFCKcDBGKdKPqDf4L5F7bY8Lv6oPqVp0pSx1vf8j9Y"
    "Content-Type" = "application/json"
}

$sqlScript = Get-Content -Path "sql.txt" -Raw
$body = @{
    sql = $sqlScript
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "Database schema applied successfully!"
    Write-Host $response
} catch {
    Write-Host "Error applying schema: $($_.Exception.Message)"
    Write-Host $_.Exception.Response
}