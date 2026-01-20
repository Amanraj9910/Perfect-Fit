# Perfect-Fit Platform

AI-Powered Transparent Hiring & Talent Growth Platform - Quality-first recruitment with explainable AI

---

## 🎯 Project Vision

Transform hiring from "resume filtering" to "skill & potential verification" through AI-powered analysis and transparent candidate evaluation.

---

## 📋 Project Status

**Current Phase:** Planning & Setup  
**Target MVP:** 12-14 weeks  
**Tech Stack:** Azure (100%), NestJS, Next.js, Python/FastAPI

---

## 🏗️ Architecture

**Cloud Infrastructure:**
- Cloud Provider: Microsoft Azure (single cloud)
- AI/ML: Azure OpenAI Service, Document Intelligence, AI Search
- Architecture: Microservices with hybrid monorepo

**Key Technologies:**
- **Frontend:** Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Backend:** NestJS, Prisma, MongoDB (Cosmos DB)
- **AI/ML:** Python FastAPI, Azure OpenAI, LangChain
- **Auth:** Azure AD B2C + JWT
- **Databases:** PostgreSQL, MongoDB, Redis, Azure AI Search

---

## 📁 Repository Structure

```
perfect-fit/
├── frontend/
│   ├── candidate-portal/    # Candidate web app (Next.js)
│   └── recruiter-portal/    # Recruiter dashboard (Next.js)
├── backend/
│   ├── auth/                # Authentication service (NestJS)
│   ├── user/                # User management (NestJS)
│   ├── job/                 # Job posting service (NestJS)
│   ├── notification/        # Notification service (NestJS)
│   ├── analysis/            # AI analysis service (Python)
│   └── matching/            # Matching service (Python)
├── packages/
│   ├── ui-components/       # Shared React components
│   ├── shared-types/        # TypeScript types
│   └── utils/               # Shared utilities
├── infrastructure/
│   ├── terraform/           # Infrastructure as Code
│   └── docker/              # Docker configurations
└── docs/                    # Documentation
```

---

## 🚀 MVP Features

### Phase 1 (Weeks 1-12)
- ✅ User authentication (candidates + recruiters)
- ✅ Profile creation and management
- ✅ Job posting by recruiters
- ✅ Resume analysis (AI-powered)
- ✅ GitHub integration and code analysis
- ✅ LinkedIn profile analysis
- ✅ Candidate scorecard generation
- ✅ Basic job-candidate matching
- ✅ Recruiter dashboard

### Future Phases
- Code execution assessments
- AI interview companion
- Video meetings
- Advanced analytics
- Mobile applications

---

## 📚 Documentation

- **[PROJECT_BRIEF.md](PROJECT_BRIEF.md)** - Complete project vision and features
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Development environment setup
- **[MVP Plan](.gemini/brain/.../mvp_plan.md)** - Detailed 12-week roadmap
- **[Implementation Plan](.gemini/brain/.../implementation_plan.md)** - Full system architecture

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker Desktop
- Azure Account (with $200 free credits)

### Quick Start

1. **Clone Repository**
```bash
git clone https://github.com/YOUR_ORG/perfect-fit.git
cd perfect-fit
```

2. **Automated Setup (Windows)**
Run the setup script to install Node.js and Python dependencies:
```powershell
.\setup_project.ps1
```

3. **Start Local Infrastructure**
Ensure Docker Desktop is running, then start the database and cache:
```bash
docker compose up -d
```

3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your Azure and GCP credentials
```

4. **Setup Cloud Resources**
Follow [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed Azure and GCP setup

5. **Run Development Servers**
```bash
npm run dev
```

---

## 💰 Cost Estimate

**During Development:** $500 - $1,000/month  
**During Production:** $915 - $2,450/month

Detailed breakdown in [MVP Plan](docs/mvp_plan.md)

---

## 👥 Team

**Minimum Team Size:** 6 people
- 1x Tech Lead
- 2x Full-Stack Engineers
- 1x Backend Engineer
- 1x AI/ML Engineer
- 0.5x DevOps Engineer
- 0.5x UI/UX Designer

---

## 📊 Success Metrics (MVP)

**Technical:**
- API response time < 300ms (p95)
- Resume analysis < 30 seconds
- System uptime > 99%

**Business:**
- 50+ candidate registrations
- 10+ recruiter signups
- 20+ job postings
- User satisfaction > 4/5

---

## 🔐 Security

- Azure AD B2C authentication
- JWT with refresh token rotation
- TLS 1.3 encryption
- GDPR compliant
- Audit logging
- Regular security audits

---

## 📝 License

[Your License Here]

---

## 🤝 Contributing

[Contributing guidelines here]

---

## 📞 Contact

[Your contact information]

---

**Built with ❤️ to make hiring fair, transparent, and human-centric**
