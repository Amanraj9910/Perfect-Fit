Write-Host "Starting Perfect-Fit Project Setup..." -ForegroundColor Cyan

# -----------------------------
# Check for Node.js
# -----------------------------
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Host "Node.js found ($nodeVersion)" -ForegroundColor Green
} else {
    Write-Host "Node.js NOT found. Please install Node.js v20+." -ForegroundColor Red
    exit 1
}

# -----------------------------
# Check for Python
# -----------------------------
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host "Python found ($pythonVersion)" -ForegroundColor Green
} else {
    Write-Host "Python NOT found. Please install Python 3.11+." -ForegroundColor Red
}

# -----------------------------
# 1. Install Node.js Dependencies
# -----------------------------
Write-Host "`nInstalling Node.js dependencies (Frontend & Backend)..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Node dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "Failed to install Node dependencies." -ForegroundColor Red
    exit 1
}

# -----------------------------
# 2. Install Python Dependencies
# -----------------------------
Write-Host "`nInstalling Python dependencies (Analytics Service)..." -ForegroundColor Yellow

$requirementsPath = "backend/analytics-service/requirements.txt"

if (Test-Path $requirementsPath) {
    python -m pip install --upgrade pip
    python -m pip install -r $requirementsPath

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Python dependencies installed successfully." -ForegroundColor Green
    } else {
        Write-Host "Failed to install Python dependencies." -ForegroundColor Yellow
    }
} else {
    Write-Host "requirements.txt not found at $requirementsPath" -ForegroundColor Yellow
}

# -----------------------------
# 3. Check Docker (Optional)
# -----------------------------
Write-Host "`nChecking Docker status..." -ForegroundColor Yellow

if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker --version
    Write-Host "Docker is installed. Use 'docker compose up -d' for DB & Redis." -ForegroundColor Green
} else {
    Write-Host "Docker not found. Required for local DB and Redis." -ForegroundColor Yellow
}

# -----------------------------
# Final Message
# -----------------------------
Write-Host "`nSetup Complete!" -ForegroundColor Cyan
Write-Host "Run: npm run dev:all" -ForegroundColor Cyan
