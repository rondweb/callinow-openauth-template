#!/usr/bin/env pwsh
# Script para configurar secrets do Cloudflare Workers para produção

Write-Host "🚀 Configurando Secrets para Produção - CallNow OpenAuth" -ForegroundColor Cyan
Write-Host ""

# Carregar variáveis do .env
Write-Host "📋 Carregando variáveis do .env..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.+)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

Write-Host "✅ Variáveis carregadas do .env" -ForegroundColor Green
Write-Host ""

# Verificar se wrangler está instalado
Write-Host "🔍 Verificando Wrangler CLI..." -ForegroundColor Yellow
try {
    $null = npx wrangler --version
    Write-Host "✅ Wrangler CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao verificar Wrangler" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Login no Cloudflare
Write-Host "🔐 Verificando login no Cloudflare..." -ForegroundColor Yellow
Write-Host "   Se necessário, uma janela do navegador será aberta para autenticação." -ForegroundColor Gray
Write-Host ""

try {
    npx wrangler whoami 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Fazendo login no Cloudflare..." -ForegroundColor Yellow
        npx wrangler login
    }
    Write-Host "✅ Autenticado no Cloudflare" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao autenticar no Cloudflare" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Função para configurar um secret
function Set-WorkerSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [bool]$IsMandatory = $true
    )
    
    if ([string]::IsNullOrWhiteSpace($SecretValue) -or $SecretValue -like "*your-*") {
        if ($IsMandatory) {
            Write-Host "   ⚠️  $SecretName não configurado no .env (obrigatório)" -ForegroundColor Yellow
            return $false
        } else {
            Write-Host "   ⏭️  $SecretName não configurado (opcional)" -ForegroundColor Gray
            return $true
        }
    }
    
    Write-Host "   📤 Configurando $SecretName..." -ForegroundColor Cyan
    
    try {
        # Criar arquivo temporário com o valor
        $tempFile = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $tempFile -Value $SecretValue -NoNewline
        
        # Configurar secret usando o arquivo
        Get-Content $tempFile | npx wrangler secret put $SecretName 2>&1 | Out-Null
        
        # Remover arquivo temporário
        Remove-Item $tempFile -Force
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $SecretName configurado" -ForegroundColor Green
            return $true
        } else {
            Write-Host "   ❌ Erro ao configurar $SecretName" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "   ❌ Erro ao configurar $SecretName`: $_" -ForegroundColor Red
        return $false
    }
}

# Configurar secrets obrigatórios
Write-Host "📧 Configurando secrets do Mailjet (obrigatório)..." -ForegroundColor Cyan
Write-Host ""

$success = $true
$success = $success -and (Set-WorkerSecret "MAILJET_API_KEY" $envVars["MAILJET_API_KEY"] $true)
$success = $success -and (Set-WorkerSecret "MAILJET_SECRET_KEY" $envVars["MAILJET_SECRET_KEY"] $true)
$success = $success -and (Set-WorkerSecret "EMAIL_FROM_EMAIL" $envVars["EMAIL_FROM_EMAIL"] $true)
$success = $success -and (Set-WorkerSecret "EMAIL_FROM_NAME" $envVars["EMAIL_FROM_NAME"] $true)

Write-Host ""

# Configurar secrets opcionais do GitHub
if ($envVars["GITHUB_CLIENT_ID"] -and $envVars["GITHUB_CLIENT_ID"] -notlike "*your-*") {
    Write-Host "🐙 Configurando secrets do GitHub OAuth (opcional)..." -ForegroundColor Cyan
    Write-Host ""
    Set-WorkerSecret "GITHUB_CLIENT_ID" $envVars["GITHUB_CLIENT_ID"] $false
    Set-WorkerSecret "GITHUB_CLIENT_SECRET" $envVars["GITHUB_CLIENT_SECRET"] $false
    Write-Host ""
}

# Configurar secrets opcionais do Google
if ($envVars["GOOGLE_CLIENT_ID"] -and $envVars["GOOGLE_CLIENT_ID"] -notlike "*your-*") {
    Write-Host "🔍 Configurando secrets do Google OAuth (opcional)..." -ForegroundColor Cyan
    Write-Host ""
    Set-WorkerSecret "GOOGLE_CLIENT_ID" $envVars["GOOGLE_CLIENT_ID"] $false
    Set-WorkerSecret "GOOGLE_CLIENT_SECRET" $envVars["GOOGLE_CLIENT_SECRET"] $false
    Write-Host ""
}

# Configurar secrets opcionais do Microsoft
if ($envVars["MICROSOFT_CLIENT_ID"] -and $envVars["MICROSOFT_CLIENT_ID"] -notlike "*your-*") {
    Write-Host "🪟 Configurando secrets do Microsoft OAuth (opcional)..." -ForegroundColor Cyan
    Write-Host ""
    Set-WorkerSecret "MICROSOFT_CLIENT_ID" $envVars["MICROSOFT_CLIENT_ID"] $false
    Set-WorkerSecret "MICROSOFT_CLIENT_SECRET" $envVars["MICROSOFT_CLIENT_SECRET"] $false
    Write-Host ""
}

# Resumo
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

if ($success) {
    Write-Host "✅ Secrets configurados com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Verifique os secrets: npx wrangler secret list" -ForegroundColor White
    Write-Host "   2. Deploy para produção: npm run deploy" -ForegroundColor White
    Write-Host "   3. Teste na URL de produção" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "   - Reative o email noreply@callinow.com no Mailjet" -ForegroundColor White
    Write-Host "     https://app.mailjet.com/account/sender" -ForegroundColor Gray
    Write-Host "   - Configure SPF/DKIM no DNS para melhor entregabilidade" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  Alguns secrets podem não ter sido configurados" -ForegroundColor Yellow
    Write-Host "   Verifique as mensagens acima e tente novamente" -ForegroundColor White
    Write-Host ""
}

Write-Host "📚 Para mais informações, consulte: PRODUCTION_DEPLOY.md" -ForegroundColor Cyan
Write-Host ""
