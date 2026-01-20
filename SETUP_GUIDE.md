# Perfect-Fit Platform - Project Setup Guide

This guide walks you through setting up the Perfect-Fit MVP development environment.

---

## 📋 Prerequisites

### Required Accounts
- [ ] **Azure Account** (Free tier: $200 credit for 30 days)
- [ ] **GitHub Account**
- [ ] **Domain name** (optional for dev, required for production)

### Required Software
- [ ] **Node.js** 20+ and npm/yarn/pnpm
- [ ] **Python** 3.11+
- [ ] **Docker Desktop**
- [ ] **Git**
- [ ] **VS Code** (recommended) or your preferred IDE
- [ ] **Azure CLI**
- [ ] **Terraform** (optional, for IaC)

---

## 🚀 Phase 1: Cloud Setup

### Azure Setup

#### Step 1: Create Azure Account
1. Go to https://azure.microsoft.com/free/
2. Sign up for free account ($200 credit)
3. Verify your identity

#### Step 2: Create Resource Group
```bash
# Login to Azure CLI
az login

# Create resource group
az group create \
  --name perfect-fit-rg \
  --location eastus
```

#### Step 3: Create Azure SQL Database (PostgreSQL)
```bash
# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group perfect-fit-rg \
  --name perfect-fit-db-server \
  --location eastus \
  --admin-user pfadmin \
  --admin-password <YOUR_STRONG_PASSWORD> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32

# Create database
az postgres flexible-server db create \
  --resource-group perfect-fit-rg \
  --server-name perfect-fit-db-server \
  --database-name perfect_fit_db

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group perfect-fit-rg \
  --name perfect-fit-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# For local development, allow your IP
az postgres flexible-server firewall-rule create \
  --resource-group perfect-fit-rg \
  --name perfect-fit-db-server \
  --rule-name AllowMyIP \
  --start-ip-address <YOUR_IP> \
  --end-ip-address <YOUR_IP>
```

#### Step 4: Create Cosmos DB (MongoDB API)
```bash
# Create Cosmos DB account
az cosmosdb create \
  --name perfect-fit-cosmos \
  --resource-group perfect-fit-rg \
  --kind MongoDB \
  --server-version 4.2 \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 \
  --enable-free-tier false

# Create database
az cosmosdb mongodb database create \
  --account-name perfect-fit-cosmos \
  --resource-group perfect-fit-rg \
  --name perfect_fit_mongo

# Create collections
az cosmosdb mongodb collection create \
  --account-name perfect-fit-cosmos \
  --resource-group perfect-fit-rg \
  --database-name perfect_fit_mongo \
  --name resume_analyses \
  --shard "_id"
```

#### Step 5: Create Redis Cache
```bash
az redis create \
  --resource-group perfect-fit-rg \
  --name perfect-fit-redis \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

#### Step 6: Create Blob Storage
```bash
# Create storage account
az storage account create \
  --name perfectfitstorage \
  --resource-group perfect-fit-rg \
  --location eastus \
  --sku Standard_LRS

# Create containers
az storage container create \
  --name resumes \
  --account-name perfectfitstorage

az storage container create \
  --name profile-images \
  --account-name perfectfitstorage
```

#### Step 7: Setup Azure AD B2C (Authentication)
```bash
# Create B2C tenant (must be done via portal)
# Go to: https://portal.azure.com -> Create a resource -> Azure AD B2C

# After creation, configure:
# - User flows (Sign up and sign in)
# - Identity providers (Email, Google, LinkedIn)
# - Application registration
```

**Manual Steps in Azure Portal:**
1. Navigate to Azure AD B2C
2. Create B2C tenant: `perfectfit.onmicrosoft.com`
3. Create User Flow: "Sign up and sign in"
4. Register application:
   - Name: Perfect-Fit Backend
   - Redirect URIs: `http://localhost:3000/auth/callback`
   - Note down: `Client ID`, `Client Secret`, `Tenant ID`

#### Step 8: Create Container Registry (for Docker images)
```bash
az acr create \
  --resource-group perfect-fit-rg \
  --name perfectfitacr \
  --sku Basic \
  --admin-enabled true
```

#### Step 8: Setup Azure OpenAI Service
```bash
# Create Azure OpenAI resource
az cognitiveservices account create \
  --name perfect-fit-openai \
  --resource-group perfect-fit-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus \
  --yes

# Deploy GPT-4 model
az cognitiveservices account deployment create \
  --name perfect-fit-openai \
  --resource-group perfect-fit-rg \
  --deployment-name gpt-4 \
  --model-name gpt-4 \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"

# Deploy GPT-3.5 Turbo for faster/cheaper tasks
az cognitiveservices account deployment create \
  --name perfect-fit-openai \
  --resource-group perfect-fit-rg \
  --deployment-name gpt-35-turbo \
  --model-name gpt-35-turbo \
  --model-version "0613" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"

# Deploy embeddings model
az cognitiveservices account deployment create \
  --name perfect-fit-openai \
  --resource-group perfect-fit-rg \
  --deployment-name text-embedding-ada-002 \
  --model-name text-embedding-ada-002 \
  --model-version "2" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name "Standard"

# Get keys
az cognitiveservices account keys list \
  --name perfect-fit-openai \
  --resource-group perfect-fit-rg
```

#### Step 9: Setup Azure AI Document Intelligence
```bash
# Create Document Intelligence resource
az cognitiveservices account create \
  --name perfect-fit-doc-intel \
  --resource-group perfect-fit-rg \
  --kind FormRecognizer \
  --sku F0 \
  --location eastus \
  --yes

# Get keys
az cognitiveservices account keys list \
  --name perfect-fit-doc-intel \
  --resource-group perfect-fit-rg
```

#### Step 10: Setup Azure AI Search
```bash
# Create AI Search service
az search service create \
  --name perfect-fit-search \
  --resource-group perfect-fit-rg \
  --sku basic \
  --location eastus

# Get admin key
az search admin-key show \
  --service-name perfect-fit-search \
  --resource-group perfect-fit-rg
```

#### Step 11: Setup Azure AI Language
```bash
# Create Language service
az cognitiveservices account create \
  --name perfect-fit-language \
  --resource-group perfect-fit-rg \
  --kind TextAnalytics \
  --sku F0 \
  --location eastus \
  --yes

# Get keys
az cognitiveservices account keys list \
  --name perfect-fit-language \
  --resource-group perfect-fit-rg
```

---

## 📁 Phase 2: Repository Setup

### Step 1: Clone/Create Repository
```bash
# If starting fresh
mkdir perfect-fit
cd perfect-fit
git init

# Or clone existing repo
git clone https://github.com/YOUR_ORG/perfect-fit.git
cd perfect-fit
```

### Step 2: Initialize Monorepo with Turborepo
```bash
# Install Turbo globally (optional)
npm install -g turbo

# Initialize package.json
npm init -y

# Install Turborepo
npm install turbo --save-dev

# Install workspace dependencies
npm install typescript @types/node --save-dev
```

### Step 3: Create Directory Structure
```bash
# Create all directories
mkdir -p frontend/candidate-portal
mkdir -p frontend/recruiter-portal
mkdir -p backend/gateway
mkdir -p backend/auth
mkdir -p backend/user
mkdir -p backend/job
mkdir -p backend/notification
mkdir -p backend/analysis
mkdir -p backend/matching
mkdir -p packages/ui-components
mkdir -p packages/shared-types
mkdir -p packages/config
mkdir -p packages/utils
mkdir -p infrastructure/terraform
mkdir -p infrastructure/docker
mkdir -p docs/api
mkdir -p scripts/setup
```

---

## 🔧 Phase 3: Environment Configuration

### Step 1: Create Root `.env` File
```bash
cat > .env << 'EOF'
# Azure Configuration
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=perfect-fit-rg
AZURE_LOCATION=eastus

# PostgreSQL (Azure SQL)
DATABASE_HOST=perfect-fit-db-server.postgres.database.azure.com
DATABASE_PORT=5432
DATABASE_NAME=perfect_fit_db
DATABASE_USER=pfadmin
DATABASE_PASSWORD=<your-db-password>
DATABASE_SSL=true

# MongoDB (Cosmos DB)
MONGODB_URI=mongodb://perfect-fit-cosmos:***@perfect-fit-cosmos.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb

# Redis (Azure Cache)
REDIS_HOST=perfect-fit-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<redis-password>
REDIS_SSL=true

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT=perfectfitstorage
AZURE_STORAGE_KEY=<storage-key>
AZURE_STORAGE_CONNECTION_STRING=<connection-string>

# Azure AD B2C
AZURE_AD_B2C_TENANT_NAME=perfectfit.onmicrosoft.com
AZURE_AD_B2C_TENANT_ID=<tenant-id>
AZURE_AD_B2C_CLIENT_ID=<client-id>
AZURE_AD_B2C_CLIENT_SECRET=<client-secret>
AZURE_AD_B2C_POLICY_NAME=B2C_1_signupsignin

# JWT
JWT_SECRET=<generate-strong-secret>
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=<generate-another-secret>
JWT_REFRESH_EXPIRY=30d

# Azure OpenAI Service
AZURE_OPENAI_ENDPOINT=https://perfect-fit-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=<openai-api-key>
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_GPT4=gpt-4
AZURE_OPENAI_DEPLOYMENT_GPT35=gpt-35-turbo
AZURE_OPENAI_DEPLOYMENT_EMBEDDING=text-embedding-ada-002

# Azure AI Document Intelligence
AZURE_DOC_INTEL_ENDPOINT=https://perfect-fit-doc-intel.cognitiveservices.azure.com/
AZURE_DOC_INTEL_KEY=<doc-intel-key>

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://perfect-fit-search.search.windows.net
AZURE_SEARCH_ADMIN_KEY=<search-admin-key>
AZURE_SEARCH_INDEX_NAME=candidates

# Azure AI Language
AZURE_LANGUAGE_ENDPOINT=https://perfect-fit-language.cognitiveservices.azure.com/
AZURE_LANGUAGE_KEY=<language-key>

# External APIs
GITHUB_CLIENT_ID=<github-oauth-app-client-id>
GITHUB_CLIENT_SECRET=<github-oauth-app-secret>
LINKEDIN_CLIENT_ID=<linkedin-app-client-id>
LINKEDIN_CLIENT_SECRET=<linkedin-app-secret>

# Email Service
SENDGRID_API_KEY=<sendgrid-api-key>
FROM_EMAIL=noreply@perfectfit.com

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3001,http://localhost:3002
EOF
```

### Step 2: Add `.env` to `.gitignore`
```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env.*.local
*.env

# Build outputs
dist/
build/
.next/
out/
.turbo/

# Logs
logs/
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/
.nyc_output/

# Misc
.cache/
.temp/
EOF
```

---

## 🏗️ Phase 4: Initial Project Files

### Root `package.json`
```json
{
  "name": "perfect-fit",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "frontend/*",
    "backend/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.3.3",
    "prettier": "^3.1.1",
    "eslint": "^8.56.0"
  }
}
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Root `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "exclude": ["node_modules", "dist"]
}
```

---

## ✅ Verification Checklist

### Azure Resources
- [ ] Resource Group created
- [ ] PostgreSQL database accessible
- [ ] Cosmos DB (MongoDB) created
- [ ] Redis cache running
- [ ] Blob storage containers created
- [ ] Azure AD B2C tenant configured
- [ ] Container Registry created
- [ ] Azure OpenAI Service deployed with models
- [ ] Azure Document Intelligence created
- [ ] Azure AI Search created
- [ ] Azure AI Language created

### Local Environment
- [ ] Repository initialized
- [ ] Directory structure created
- [ ] `.env` file configured
- [ ] Dependencies installed
- [ ] Git configured

### Connection Tests
```bash
# Test PostgreSQL connection
psql "host=perfect-fit-db-server.postgres.database.azure.com port=5432 dbname=perfect_fit_db user=pfadmin password=<password> sslmode=require"

# Test Redis connection
redis-cli -h perfect-fit-redis.redis.cache.windows.net -p 6380 -a <password> --tls PING

# Test Azure Blob Storage
az storage blob list --account-name perfectfitstorage --container-name resumes --output table

# Test Azure OpenAI
curl https://perfect-fit-openai.openai.azure.com/openai/deployments/gpt-35-turbo/chat/completions?api-version=2024-02-15-preview \
  -H "Content-Type: application/json" \
  -H "api-key: <your-key>" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

---

## 🎯 Next Steps

After completing setup:
1. Review the **MVP Plan** for detailed week-by-week tasks
2. Start with **Week 1-2: Foundation & Setup**
3. Setup CI/CD pipelines
4. Begin developing Auth Service

---

## 📞 Troubleshooting

### Issue: Azure CLI not authenticated
```bash
az login
az account set --subscription <subscription-id>
```

### Issue: Azure OpenAI access denied
- Apply for Azure OpenAI access if needed
- Check API key is correct
- Verify deployment names match

### Issue: Database connection fails
- Check firewall rules
- Verify credentials
- Ensure SSL/TLS is enabled
- Check network connectivity

### Issue: Azure AI service quota exceeded
- Check service limits in Azure portal
- Request quota increase if needed
- Monitor usage to stay within free tier

---

## 💡 Tips

1. **Use Azure Free Tier wisely** - You have $200 for 30 days
2. **Set up budget alerts** - Monitor Azure spending in portal
3. **Keep secrets secure** - Never commit `.env` files
4. **Use development databases** - Don't use production resources for dev
5. **Tag all resources** - Use tags like `env=dev`, `project=perfect-fit`
6. **Enable monitoring early** - Setup Azure Monitor and Application Insights
7. **Use free tiers** - Document Intelligence (500 pages/month), AI Language (5K requests/month)
8. **Monitor OpenAI usage** - Tokens can add up quickly, set spending limits

---

## 📚 Reference Links

- [Azure Documentation](https://docs.microsoft.com/azure/)
- [Azure OpenAI Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Turborepo Docs](https://turbo.build/repo/docs)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
