$uri = "http://localhost:8000/admin/users/create"
$get_uri = "http://localhost:8000/admin/users"

$headers = @{
    "accept" = "application/json"
}

# Generate a random ID to avoid 400 Duplicate Error
$randomId = Get-Random -Minimum 1000 -Maximum 9999
$userId = "WKR-$randomId"

Write-Host "1. Testing GET /admin/users (Check for 500 Error)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $get_uri -Method Get -Headers $headers
    Write-Host "GET Success! Users found: $($response.Count)" -ForegroundColor Green
}
catch {
    Write-Host "GET Failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Server Response: $body" -ForegroundColor Yellow
    }
}

Write-Host "`n2. Testing POST /admin/users/create" -ForegroundColor Cyan
Write-Host "Attempting to create user with ID: $userId"

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -ContentType "multipart/form-data" -Body @{
        name          = "Test User"
        user_id       = $userId
        password      = "password123"
        shift         = "Morning"
        assigned_zone = "Sector 4"
    }
    
    Write-Host "POST Success! Response:" -ForegroundColor Green
    $response | Format-List
}
catch {
    Write-Host "POST Failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Server Response: $body" -ForegroundColor Yellow
    }
}
