# Perfect Fit – FULL SEQUENTIAL BUILD ORDER (ZERO‑SKIP, MODULE‑BY‑MODULE)

**Purpose**: This document answers ONLY one question: **“If I start today from scratch, what EXACTLY do I build first, finish completely, then move to the next — without skipping anything?”**

This is a **construction blueprint**, not a feature list.

---

## 🧱 STAGE 0: PROJECT & INFRA FOUNDATION (MANDATORY FIRST)

**Goal**: Establish the bedrock. No feature code until the environment is healthy.

### 0.1 Repository & Project Setup
- [ ] **Decide Monorepo Strategy**: Initialize Turborepo with pnpm.
- [ ] **Folder Structure**:
    - `/apps/candidate-portal` (Next.js)
    - `/apps/recruiter-portal` (Next.js)
    - `/services/auth-service` (NestJS)
    - `/services/user-service` (NestJS)
    - `/services/job-service` (NestJS)
    - `/services/analysis-service` (Python/FastAPI)
    - `/packages/ui` (Shared components)
    - `/packages/content-types` (Shared types)
- [ ] **Code Standards**: Setup ESLint, Prettier, and Husky pre-commit hooks.
- [ ] **Env Var Strategy**: Create `.env.example` templates and setup `dotenv`.

### 0.2 Backend Base (NestJS & Python)
- [ ] **NestJS Gateway/Service**: Initialize basic NestJS app structure.
- [ ] **Global Error Handler**: Implement `AllExceptionsFilter` in NestJS.
- [ ] **Request Validation**: Setup `ValidationPipe` with `class-validator` and `class-transformer`.
- [ ] **Logging**: Configure Winston or Pino interaction with consistent log formatting (JSON).
- [ ] **Python Setup**: Initialize FastAPI project with Poetry/Pipenv.

### 0.3 Database & Infra Connections
- [ ] **PostgreSQL**: Provision Azure SQL, run init script, and verify connection from NestJS (Prisma).
- [ ] **Redis**: Provision Azure Cache for Redis, verify connection (ioredis).
- [ ] **Azure Blob**: Provision Storage Account, create `resumes` and `images` containers, check access keys.
- [ ] **Migrations**: Setup Prisma Migrate flow and run initial `init` migration.

✅ **STOP CONDITION**: Backend boots without errors, simple `/health` endpoint returns 200 OK, DB/Redis/Blob are reachable, and logs are visible.

---

## 🔐 STAGE 1: AUTHENTICATION & USER IDENTITY (MODULE 1)

**Goal**: Secure identity management. **Everything else depends on this.**

### 1.1 User Core Schema
- [ ] **Schema Definition**: Create `User` table in Prisma.
    - Fields: `id`, `email`, `password_hash`, `role` (ENUM: Candidate, Recruiter, Admin), `is_verified`, `created_at`.
- [ ] **Run Migration**: Apply schema changes to DB.

### 1.2 Basic Auth (Finish Fully)
- [ ] **Register API**: Endpoint `POST /auth/register` (Email/Password). Hash specific password (bcrypt).
- [ ] **Login API**: Endpoint `POST /auth/login`. Validate creds, return JWT (Access + Refresh).
- [ ] **JWT Strategy**: Implement Passport-JWT strategy.
    - **Access Token**: Short-lived (15m).
    - **Refresh Token**: Long-lived (7d), stored HTTP-only cookie.
    - **Token Blacklist**: Redis integration for logout/revocation.
- [ ] **Logout API**: Endpoint `POST /auth/logout` (Invalidate tokens).

### 1.3 Email Verification
- [ ] **Token Gen**: Generate cryptographically secure random token.
- [ ] **SendGrid Service**: Integrate SendGrid to send emails.
- [ ] **Verify Endpoint**: `GET /auth/verify-email?token=xyz`. Updates `is_verified = true`.
- [ ] **Resend Flow**: API to trigger a new verification email.

### 1.4 Password Management
- [ ] **Forgot Password**: `POST /auth/forgot-password` (sends magic link/code).
- [ ] **Reset Password**: `POST /auth/reset-password` (verifies token, updates hash).
- [ ] **Security**: Invalidate all sessions (refresh tokens) on password change.

### 1.5 Azure AD B2C & Social Login
- [ ] **B2C Tenant**: Create and configure Azure AD B2C tenant.
- [ ] **App Registration**: Register app, get Client ID/Secret.
- [ ] **Social Providers**: Configure Google, GitHub, LinkedIn in B2C dashboard.
- [ ] **Token Validation**: Middleware to validate B2C tokens alongside internal JWTs.
- [ ] **Link Users**: Logic to map B2C `oid` to internal `User` record (upsert).

✅ **STOP CONDITION**: You can register (Email/Social), login, get a valid JWT, verify email, and logout. All routes protected by Guard reject unauthenticated requests.

---

## 👤 STAGE 2: BASIC USER PROFILE (MODULE 2 – CORE DATA)

**Goal**: Users exist. Now give them a face. **NO AI yet.**

### 2.1 Profile Schema
- [ ] **Schema**: Create `CandidateProfile` and `RecruiterProfile` tables linked to `User`.
    - Fields: `firstName`, `lastName`, `phone`, `location`, `headline`, `bio`, `visibility` (Public/Private).
- [ ] **Migration**: Run Prisma migration.

### 2.2 Profile APIs
- [ ] **GET /profile/me**: Retrieve current user's profile.
- [ ] **PUT /profile/me**: Update mutable fields. Use DTOs for validation.
- [ ] **Validation**: Ensure phone number format, string lengths.

### 2.3 Profile Completion Engine
- [ ] **Logic**: Service method `calculateCompletion%()`.
    - Rules: Name+Loc (20%), Bio (10%), Experience (30%), etc.
- [ ] **API**: Expose completion score in profile response.

✅ **STOP CONDITION**: User can fully CRUD their personal details. DB reflects changes immediately.

---

## 📝 STAGE 3: EXPERIENCE, EDUCATION, SKILLS (MODULE 2.1)

**Goal**: The "meat" of the candidate profile.

### 3.1 Experience
- [ ] **Schema**: `Experience` table (User 1:N Experience).
    - `company`, `title`, `start_date`, `end_date`, `is_current`, `description`.
- [ ] **APIs**: CRUD endpoints `/profile/experience`.
- [ ] **Validation**: `end_date` cannot be before `start_date`.

### 3.2 Education
- [ ] **Schema**: `Education` table.
    - `institution`, `degree`, `field`, `start_date`, `end_date`.
- [ ] **APIs**: CRUD endpoints `/profile/education`.

### 3.3 Skills
- [ ] **Schema**: `Skill` (Master list) and `UserSkill` (Pivot table with proficiency).
- [ ] **Seed Data**: Populate initial list of 50-100 common tech skills.
- [ ] **APIs**:
    - `GET /skills/search?q=`: Autocomplete.
    - `POST /profile/skills`: Add/Remove skills.

### 3.4 Certifications
- [ ] **Schema**: `Certification` table (`name`, `issuer`, `date`, `url`).
- [ ] **APIs**: CRUD endpoints.

### 3.5 Recalculate Logic
- [ ] **Trigger**: On any update to these sections, re-trigger `calculateCompletion%()`.

✅ **STOP CONDITION**: A user can manually build a complete LinkedIn-style profile via API.

---

## 📄 STAGE 4: RESUME STORAGE & PARSING (MODULE 2.2)

**Goal**: Automate data entry. Turn PDFs into structured data.

### 4.1 Resume Upload
- [ ] **API**: `POST /resume/upload`.
- [ ] **Validation**: File type (PDF/DOCX), Size (<5MB).
- [ ] **Storage**: Stream file to Azure Blob Storage (`resumes` container). Saving path to DB `User.resume_url`.

### 4.2 Resume Download
- [ ] **API**: `GET /resume/download`.
- [ ] **Security**: Generate SAS (Shared Access Signature) URL (expires in 1h) so private blobs aren't public.

### 4.3 Resume Parsing (Azure Doc Intelligence)
- [ ] **Integration**: Connect Python/NestJS service to Azure Document Intelligence (Prebuilt Layout/Resume model).
- [ ] **Extraction**: Call API with blob URL. Receive JSON response.
- [ ] **Normalization**: Map Azure's rigid JSON to our `Experience`/`Education` DTOs.

### 4.4 Auto-Populate Flow
- [ ] **Draft Mode**: Save parsed data as "Draft" entries or return to UI for confirmation.
- [ ] **Confirmation API**: User reviews parsed data -> `POST /profile/confirm-resume-data` -> commits to DB.

✅ **STOP CONDITION**: Upload a PDF -> Wait -> DB is populated with correct Job Titles, Dates, and Schools.

---

## 🧠 STAGE 5: AI RESUME ANALYSIS (MODULE 4.1 – PART 1)

**Goal**: Provide qualitative feedback on the resume.

### 5.1 Resume Text Prep
- [ ] **Text Extraction**: Ensure we have clean full-text from Stage 4.

### 5.2 GPT Resume Analysis
- [ ] **Prompt Engineering**: Create system prompt for "Resume Critic".
    - Criteria: Clarity, Impact (Action verbs), Formatting (detected via rules), Skills gaps.
- [ ] **Service**: Call Azure OpenAI (GPT-3.5/4).
- [ ] **Output**: Structured JSON `{ "score": 85, "strengths": [], "weaknesses": [], "improvements": [] }`.

### 5.3 Store Analysis
- [ ] **Schema**: `ResumeAnalysis` table/collection (CosmosDB or JSONB in Postgres).
- [ ] **Versioning**: Link analysis to specific resume version.

✅ **STOP CONDITION**: Every uploaded resume gets a persistent "Score" and "Critique" stored in the DB.

---

## 🐙 STAGE 6: GITHUB INTEGRATION & ANALYSIS (MODULE 2.3)

**Goal**: Prove coding ability via public history.

### 6.1 OAuth Flow
- [ ] **GitHub App**: Register in GitHub Developer settings.
- [ ] **Connect API**: `GET /auth/github` -> Redirect.
- [ ] **Callback**: Exchange code for Access Token. Store encrypted token in DB.

### 6.2 Data Fetch
- [ ] **Client**: Setup `Octokit` or raw HTTP client.
- [ ] **Fetcher Service**:
    - Get User Profile (Followers, Public Repos).
    - Get Top Repos (Stars, Forks, Language).
    - Get Commit Activity (Last year).

### 6.3 Code Analysis (Lightweight)
- [ ] **Static Analysis**: (Optional for MVP, maybe just count lines/languages).
- [ ] **Quality Checks**: Check for `README.md`, `TESTS`, CI workflows in top repos.

### 6.4 GitHub Scoring Engine
- [ ] **Algorithm**: `calculateGitHubScore(data)`.
    - Weights: Commit consistency (40%), Repo popularity (30%), Code diversity (30%).
- [ ] **Storage**: Save result to `CandidateScorecard` (partial).

### 6.5 Scheduled Refresh
- [ ] **BullMQ**: Setup a daily/weekly job to refresh stats.

✅ **STOP CONDITION**: Connect GitHub -> Wait ~1 min -> "GitHub Score: 78/100" appears in DB with breakdown.

---

## 💼 STAGE 7: LINKEDIN INTEGRATION & TRUST (MODULE 2.4)

**Goal**: Establish credibility & fraud resistance.

### 7.1 LinkedIn OAuth
- [ ] **App Setup**: Register LinkedIn App (Sign In with LinkedIn).
- [ ] **Connect Flow**: Standard OAuth 2.0 flow. Store token.

### 7.2 LinkedIn Data Ingestion
- [ ] **Profile**: Basic fields (Name, Avatar).
- [ ] **Compliance**: Respect LinkedIn API limits and TOS (use official API for basic profile, or user-provided export if API limited).

### 7.3 Data Normalization
- [ ] **Mapping**: Convert LinkedIn JSON to our `Experience` schema.

### 7.4 Consistency Check (Anti-Fraud)
- [ ] **Engine**: Compare `Resume.Experience` vs `LinkedIn.Experience`.
- [ ] **Flags**: Detect dates mismatch > 3 months, missing companies, title inflation.

### 7.5 LinkedIn Credibility Score
- [ ] **Scoring**:
    - Profile Completeness.
    - Connection Count (if available) as proxy for networking.
    - Consistency Score (Resume vs LinkedIn).
- [ ] **Storage**: Update `CandidateScorecard`.

✅ **STOP CONDITION**: User links LinkedIn -> System generates a "Trust Score" and "Consistency Report".

---

## 🏢 STAGE 8: RECRUITER & COMPANY CORE (MODULE 3.1 + 3.2)

**Goal**: Enable the "Demand" side of the marketplace.

### 8.1 Company Core Schema
- [ ] **Schema**: `Company` table (`name`, `domain`, `description`, `logo_url`, `is_verified`).

### 8.2 Company Registration Flow
- [ ] **API**: `POST /company/register`.
- [ ] **Validation**: Check if email domain is NOT generic (gmail, yahoo).
- [ ] **Mapping**: Auto-assign first user as "Admin".

### 8.3 Company Verification
- [ ] **Auto-Check**: DNS check (optional) or Domain ownership.
- [ ] **Manual**: Admin UI to toggle `is_verified`.

### 8.4 Recruiter User Mapping
- [ ] **Schema**: `CompanyUser` table (User -> Company).
- [ ] **Roles**: Admin, Recruiter, Viewer.

### 8.5 Team Invitations
- [ ] **Invite API**: `POST /company/invite` (Email).
- [ ] **Token**: Generate invite token/email.
- [ ] **Accept Flow**: `POST /company/join` (consumes token).

### 8.6 RBAC Enforcement
- [ ] **Guards**: Ensure only `CompanyAdmin` can invite/remove users.

✅ **STOP CONDITION**: A company exists, has a verified status, and multiple recruiters can belong to it.

---

## 💼 STAGE 9: JOB POSTING SYSTEM (MODULE 3.3)

**Goal**: Create structured demand data.

### 9.1 Job Core Schema
- [ ] **Schema**: `Job` table.
    - `title`, `type` (Remote/Hybrid), `salary_min`, `salary_max`, `status` (Draft/Live/Closed).
    - Link to `Company`.

### 9.2 Job Description Builder
- [ ] **Fields**: `description` (Rich Text/Markdown), `responsibilities` (Array), `requirements` (Array).

### 9.3 Skill Requirement Engine
- [ ] **Linkage**: `JobSkill` table.
    - `skill_id`, `priority` (Must-Have vs Nice-to-Have), `level`.
- [ ] **API**: Select skills from Master list.

### 9.4 Lifecycle Management
- [ ] **APIs**: Publish, Pause, Close endpoints.
- [ ] **Validation**: Cannot publish without Title, Description, and at least 1 Must-Have skill.

### 9.5 Job Embedding Pipeline
- [ ] **Trigger**: On Publish/Update.
- [ ] **Generation**: Create text chunk: "Title + Description + Skills".
- [ ] **Embedding**: Call Azure OpenAI Embeddings.
- [ ] **Vector Store**: Save vector to Azure AI Search index.

✅ **STOP CONDITION**: Recruiter posts a job -> It is searchable and has a vector representation in AI Search.

---

## 🤖 STAGE 10: CANDIDATE SCORECARD ENGINE (MODULE 4.1 – FULL)

**Goal**: The "One Score to Rule Them All".

### 10.1 Aggregation
- [ ] **Service**: `ScorecardService`.
- [ ] **Inputs**: Fetch Resume Score, GitHub Score, LinkedIn Score, Skill Match % (dynamic per job).

### 10.2 Weighting Engine
- [ ] **Config**: Define weights (e.g., Tech Role: Skills 40%, GitHub 20%, Exp 20%).

### 10.3 Calculation
- [ ] **Formula**: Weighted Average.
- [ ] **Output**: Final Score (0-100).

### 10.4 Explainability
- [ ] **Generation**: Use simple logic or LLM to generate "Why this score?": "Strong GitHub, but missing React skill".

### 10.5 Versioning
- [ ] **History**: Track score changes.

✅ **STOP CONDITION**: Every Candidate + Job pair can generate a Scorecard on demand.

---

## 🎯 STAGE 11: JOB–CANDIDATE MATCHING ENGINE (MODULE 4.2)

**Goal**: The core value prop. Connect Supply & Demand.

### 11.1 Rule-Based Matching (Hard constraints)
- [ ] **Filters**: Exclude if "Must-Have" skills missing (optional configuration), or Location mismatch.

### 11.2 Semantic Matching (Soft constraints)
- [ ] **Search**: Query Azure AI Search with Job Vector -> Get closest Candidate Vectors.
- [ ] **Similarity**: Calculate Cosine Similarity.

### 11.3 Composite Match Score
- [ ] **Aggr**: Combine Semantic Score + Rule-Based Score.

### 11.4 Backend Ranking
- [ ] **API**: `GET /jobs/:id/matches`.
- [ ] **Logic**: Return list of Candidates sorted by Match %.

✅ **STOP CONDITION**: API returns sorted list of candidates relevant to a specific job.

---

## 🔍 STAGE 12: SEARCH & DISCOVERY (MODULE 4.3)

**Goal**: Allow Recruiter to hunt manually.

### 12.1 Indexing
- [ ] **Sync**: Ensure User/Profile changes sync to Azure AI Search index in near-real-time.

### 12.2 Search Engine
- [ ] **API**: `GET /search/candidates`.
- [ ] **Features**: Full-text search (Name, Bio, Job Title).

### 12.3 Filtering
- [ ] **Facets**: Filter by Skill, Experience Years, Location.

### 12.4 Saved Searches
- [ ] **Schema**: `SavedSearch` table (`criteria_json`, `user_id`).
- [ ] **Alerts**: Boolean `notify_me`.

✅ **STOP CONDITION**: Recruiter can search "React Dev London", filter by "3+ years", and see results.

---

## 🖥️ STAGE 13: CANDIDATE FRONTEND (MODULE 5)

**Goal**: The UI for the Candidate. *Build this only after APIs work.*

### 13.1 Auth & Onboarding UI
- [ ] **Pages**: Login, Register, Forgot Password.
- [ ] **Integration**: Connect to Module 1 APIs.

### 13.2 Profile Wizard
- [ ] **UX**: Multi-step form (Info -> Exp -> Edu -> Skills).
- [ ] **Components**: Date pickers, Skill autocomplete chips.

### 13.3 Resume / Integrations UI
- [ ] **Resume**: File upload with progress bar. Parsing loading state. Review screen.
- [ ] **Socials**: "Connect GitHub" / "Connect LinkedIn" buttons.

### 13.4 Job Discovery & Apply
- [ ] **Search**: Job list with filters.
- [ ] **Apply**: "One Click Apply" button.

### 13.5 Scorecard UI
- [ ] **Dashboard**: Show user their own "Profile Strength" and "Marketability".

✅ **STOP CONDITION**: A real human can sign up, create profile, and apply to a test job via UI.

---

## 💼 STAGE 14: RECRUITER FRONTEND (MODULE 6)

**Goal**: The UI for the Recruiter.

### 14.1 Onboarding & Company
- [ ] **Company Setup**: Form to create company.
- [ ] **Team**: Invite modal.

### 14.2 Job Management UI
- [ ] **Dashboard**: List of jobs (Active, Draft).
- [ ] **Editor**: Job creation wizard with Rich Text Editor.

### 14.3 Candidate Discovery UI
- [ ] **Search**: Search bar + Filters sidebar.
- [ ] **Results**: Card view of candidates.

### 14.4 Pipeline UI
- [ ] **ATS View**: Kanban board or List for a specific job.
- [ ] **Scorecard**: Visual display of the Match Score breakdown.

✅ **STOP CONDITION**: Recruiter can post job, search candidates, and move applicant to "Interview" stage.

---

## 🔔 STAGE 15: NOTIFICATIONS (MODULE 7)

**Goal**: Keep users engaged.

### 15.1 Event Definitions
- [ ] **Triggers**: Define events (Applied, Viewed, Invited, Matched).

### 15.2 Email Engine
- [ ] **Templates**: HTML templates for each event.
- [ ] **Worker**: Queue listener to send emails asynchronously.

### 15.3 In-App Notifications
- [ ] **Schema**: `Notification` table.
- [ ] **UI**: Notification Bell in navbar with "Mark as Read".

✅ **STOP CONDITION**: Actions in UI trigger real emails and red badge updates in Navbar.

---

## 🔒 STAGE 16: SECURITY & GDPR (MODULE 8)

**Goal**: Production hardening.

### 16.1 Security Hardening
- [ ] **Rate Limiting**: Configure strict limits on publicly exposed endpoints.
- [ ] **Scanning**: Enable container scanning, dep checks.

### 16.2 Data Privacy
- [ ] **Export**: `GET /me/export` (GDPR).
- [ ] **Forget Me**: `DELETE /me` (Hard delete or anonymize).

✅ **STOP CONDITION**: Passes basic security audit.

---

## 📊 STAGE 17: ANALYTICS & MONITORING (MODULE 9)

**Goal**: Visibility.

### 17.1 Product Analytics
- [ ] **Tracking**: DB counters for simple internal analytics.

### 17.2 System Monitoring
- [ ] **Logs**: Azure Monitor / App Insights fully wired.
- [ ] **Alerts**: Slack/Email alert on 500 errors > 1%.

✅ **FINAL STOP CONDITION**: Platform is deployed, monitored, and features work end-to-end.
