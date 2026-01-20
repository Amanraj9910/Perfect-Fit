Write-Host "🚀 Starting Perfect-Fit Project Setup..." -ForegroundColor Cyan

# Check for Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Host "✅ Node.js found ($nodeVersion)" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js NOT found. Please install Node.js v20+." -ForegroundColor Red
    exit 1
}

# Check for Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host "✅ Python found ($pythonVersion)" -ForegroundColor Green
} else {
    Write-Host "❌ Python NOT found. Please install Python 3.11+." -ForegroundColor Red
    # Don't exit, just warn if they only want frontend
}

# 1. Install Node.js Dependencies (Root & Workspaces)
Write-Host "`n📦 Installing Node.js dependencies (Frontend & Backend Services)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node dependencies installed." -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install Node dependencies." -ForegroundColor Red
    exit 1
}

# 2. Install Python Dependencies
Write-Host "`n🐍 Installing Python dependencies (Analytics Service)..." -ForegroundColor Yellow
if (Test-Path "backend/analytics-service/requirements.txt") {
    pip install -r backend/analytics-service/requirements.txt
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Python dependencies installed." -ForegroundColor Green
    } else {
        Write-Host "⚠️ Failed to install Python dependencies. Ensure pip is in PATH." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ backend/analytics-service/requirements.txt not found." -ForegroundColor Yellow
}

# 3. Check Docker (Informational)
Write-Host "`n🐳 Checking Docker status..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker --version
    Write-Host "✅ Docker is installed. Remember to run 'docker compose up -d' for local DBs." -ForegroundColor Green
} else {
    Write-Host "⚠️ Docker not found. You will need it for the local Database and Redis." -ForegroundColor Yellow
}

# 4. Environment File Setup (Copy examples if missing)
# (Logic to copy .env.example to .env could go here)

Write-Host "`n🎉 Setup Complete! You can now run 'npm run dev:all' to start the project." -ForegroundColor Cyan
