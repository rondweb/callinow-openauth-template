#!/usr/bin/env pwsh

# Test script to verify OAuth flow and diagnose issues

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "OAuth Flow Diagnostic Test" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://127.0.0.1:8787"

# Test 1: Check if dev server is running
Write-Host "[Test 1] Checking if dev server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $BASE_URL -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 302) {
        Write-Host "✅ Dev server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Dev server is NOT running" -ForegroundColor Red
    Write-Host "   Start it with: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Check debug endpoints
Write-Host "[Test 2] Checking debug endpoints..." -ForegroundColor Yellow

# Check users
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/debug/users" -Method Get
    Write-Host "✅ Users endpoint working" -ForegroundColor Green
    Write-Host "   Total users: $($response.count)" -ForegroundColor Gray
    if ($response.count -gt 0) {
        Write-Host "   Recent users:" -ForegroundColor Gray
        foreach ($user in $response.users | Select-Object -First 3) {
            Write-Host "   - $($user.email) (provider: $($user.provider))" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Users endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check KV storage
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/debug/storage" -Method Get
    Write-Host "✅ KV storage endpoint working" -ForegroundColor Green
    Write-Host "   Total keys: $($response.count)" -ForegroundColor Gray
    if ($response.count -gt 0) {
        Write-Host "   OAuth states:" -ForegroundColor Gray
        foreach ($key in $response.keys | Where-Object { $_.name -like "oauth:*" } | Select-Object -First 3) {
            $expiresIn = if ($key.expiration) {
                $expDate = [DateTimeOffset]::FromUnixTimeSeconds($key.expiration)
                $timeLeft = $expDate - [DateTimeOffset]::Now
                "expires in $([Math]::Round($timeLeft.TotalMinutes, 1)) minutes"
            } else {
                "no expiration"
            }
            Write-Host "   - $($key.name) ($expiresIn)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ℹ️ No OAuth states stored (this is normal if no one is authenticating)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ KV storage endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Check email configuration
Write-Host "[Test 3] Checking email configuration..." -ForegroundColor Yellow

if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    
    $mailjetKey = $envContent | Where-Object { $_ -like "MAILJET_API_KEY=*" }
    $emailFrom = $envContent | Where-Object { $_ -like "EMAIL_FROM_EMAIL=*" }
    
    if ($mailjetKey) {
        Write-Host "✅ Mailjet API key configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Mailjet API key not found in .env" -ForegroundColor Yellow
    }
    
    if ($emailFrom) {
        $email = ($emailFrom -split "=")[1]
        Write-Host "✅ Email sender: $email" -ForegroundColor Green
        
        if ($email -eq "info@callinow.tech") {
            Write-Host "   ℹ️ Using verified email (good!)" -ForegroundColor Green
        } elseif ($email -eq "noreply@callinow.com") {
            Write-Host "   ⚠️ Using unverified email - may cause delivery issues" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Email sender not configured in .env" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

Write-Host ""

# Test 4: Provide URL guidance
Write-Host "[Test 4] URL Consistency Check" -ForegroundColor Yellow
Write-Host "✅ Correct URL to use: $BASE_URL" -ForegroundColor Green
Write-Host "❌ DO NOT use: http://localhost:8787" -ForegroundColor Red
Write-Host ""
Write-Host "   When testing authentication:" -ForegroundColor Gray
Write-Host "   1. Always use the SAME URL (don't switch)" -ForegroundColor Gray
Write-Host "   2. Clear browser cache before testing" -ForegroundColor Gray
Write-Host "   3. Complete the flow without long delays" -ForegroundColor Gray

Write-Host ""

# Test 5: Browser recommendations
Write-Host "[Test 5] Browser Recommendations" -ForegroundColor Yellow
Write-Host "Before testing, ensure:" -ForegroundColor Gray
Write-Host "  • Cookies are enabled for $BASE_URL" -ForegroundColor Gray
Write-Host "  • Third-party cookies are not blocked" -ForegroundColor Gray
Write-Host "  • Browser DevTools (F12) is open to see logs" -ForegroundColor Gray
Write-Host "  • Network tab is recording" -ForegroundColor Gray

Write-Host ""

# Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open browser to: $BASE_URL" -ForegroundColor White
Write-Host "2. Open DevTools (F12) → Network tab" -ForegroundColor White
Write-Host "3. Try authentication flow" -ForegroundColor White
Write-Host "4. If error occurs, check:" -ForegroundColor White
Write-Host "   - Browser console for errors" -ForegroundColor Gray
Write-Host "   - Terminal (wrangler dev) for server logs" -ForegroundColor Gray
Write-Host "   - Network tab for /callback request" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed troubleshooting, see:" -ForegroundColor White
Write-Host "  OAUTH_CALLBACK_TROUBLESHOOTING.md" -ForegroundColor Cyan
Write-Host ""
