# Perfect-Fit Architecture Documentation

## 1. Executive Summary
Perfect-Fit is a recruitment platform designed to streamline the hiring process with role-based access for Candidates, Employees, HR, and Admins. It features a modern Next.js frontend and a robust FastAPI backend, utilizing Supabase for database and authentication, and Azure Blob Storage for file management.

## 2. High-Level Architecture

```mermaid
graph TD
    Client[Client (Browser)] -->|HTTPS| Frontend[Next.js Frontend]
    Frontend -->|API Calls| Backend[FastAPI Backend]
    
    subgraph "Backend Services"
        Backend -->|Auth & Data| Supabase[Supabase (PostgreSQL + Auth)]
        Backend -->|File Storage| Azure[Azure Blob Storage]
        Backend -->|AI Features| OpenAI[OpenAI API]
    end
    
    subgraph "Database"
        Supabase --> Tables[Job Roles, Profiles, Applications, Assessments]
    end
```

## 3. Technology Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** TanStack React Query
- **UI Components:** Radix UI, Shadcn/UI, Lucide React
- **Form Handling:** React Hook Form + Zod
- **API Client:** Axios

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Server:** Uvicorn
- **OS/Container:** Docker / Azure Container Apps
- **Authentication:** Supabase Auth (GoTrue) + JWT
- **Logic Patterns:** Router-based separation, Dependency Injection

### Infrastructure & External Services
- **Database:** Supabase (PostgreSQL)
- **Object Storage:** Azure Blob Storage (Resumes, Profile Pictures)
- **AI Integration:** OpenAI (Technical Assessment Scoring)
- **CI/CD:** GitHub Actions
- **Monorepo Manager:** Turbo

## 4. Backend Architecture

The backend is structured as a monolithic FastAPI application (`backend/fastapi_app`), though the folder structure hints at potential microservices separation (`job-service`, `analytics-service` folders exist but are currently unused).

### Project Structure
```
backend/
├── fastapi_app/
│   ├── main.py            # Entry point, Middleware, Exception Handling
│   ├── dependencies.py    # DI for Supabase, User Verification
│   ├── core/
│   │   ├── logging.py     # Centralized logging configuration
│   │   └── storage.py     # Storage utilities
│   ├── routers/
│   │   ├── admin.py       # Admin dashboards
│   │   ├── jobs.py        # Job CRUD & Approval Workflows
│   │   ├── candidates.py  # Candidate Profile Management
│   │   ├── applications.py# Job Application Logic
│   │   └── storage.py     # File Ops
│   └── agents/            # AI Agents (likely for scoring)
└── migrations/            # SQL Migration Scripts
```

### Key Components
- **Direct Database Access:** The backend uses the `postgrest` client (via `supabase-py`) to interact directly with the database. It does not use a traditional ORM (like SQLAlchemy), effectively treating Supabase as a Backend-as-a-Service (BaaS) while wrapping it with custom business logic.
- **Authentication & Authorization:**
  - `dependencies.py` provides `verify_admin` and `get_user_with_role`.
  - Roles are checked against the `profiles` table.
  - JWTs are verified either locally (for speed) or via Supabase Auth API.
- **Optimistic Locking:** The `jobs` router implements optimistic locking using a `version` column to prevent concurrent edit overwrites.
- **Approvals Workflow:** integrated into `jobs.py`, allowing HR/Admins to approve/reject job postings created by Employees.

## 5. Frontend Architecture

The frontend follows a standard Next.js App Router structure.

### Structure
```
frontend/src/
├── app/               # Pages and Routes
├── components/        # Reusable UI components
├── lib/               # Utilities, Hooks, API definitions
└── hooks/             # Custom React Hooks
```

### Key Features
- **Data Fetching:** Heavily relies on `react-query` for caching and server state management.
- **Auth Integration:** Syncs Supabase session with local application state.
- **Responsive UI:** Built mobile-first with Tailwind.

## 6. Database Schema

The database is PostgreSQL, managed via Supabase.

### Core Tables

#### `profiles` (Auth)
- `id` (UUID, PK): Links to `auth.users`.
- `role`: Enum (`admin`, `hr`, `employee`, `candidate`).
- `full_name`, `email`, `avatar_url`.

#### `candidate_profiles` (Extended Info)
- `id` (UUID, PK): Links to `profiles.id`.
- `resume_url`, `linkedin_url`, `portfolio_url`, `skills`, `bio`.

#### `job_roles` (Job Postings)
- `id` (UUID, PK)
- `title`, `description`, `requirements`, `department`.
- `status`: (`pending`, `approved`, `rejected`).
- `is_open`: Boolean.
- `created_by`: Link to `profiles`.
- `version`: Integer (for concurrency control).
- `technical_questions`: JSON/Relation (Managed via separate table).

#### `technical_assessments`
- `id`, `job_id`.
- `question`, `desired_answer`.

#### `job_applications`
- `id`, `job_id`, `applicant_id`.
- `status` (`submitted`, `reviewed`, `interview`, `hired`, `rejected`).
- `cover_letter`, `resume_url`.

#### `technical_assessment_responses`
- `id`, `application_id`, `question_id`.
- `answer`: Candidate's answer.
- `ai_score`: AI generated score.
- `ai_reasoning`: Explanation for the score.

#### `approval_requests`
- Log of approval actions for job roles.

### Security
- **RLS (Row Level Security):** Extensive use of RLS policies to ensure:
  - Candidates can only see/edit their own data.
  - Employees can only edit their own jobs.
  - Admins/HR have broad access.

## 7. Key Workflows

### Job Creation & Approval
1. **Employee** creates a job -> `job_roles` (status: `pending`) + `approval_requests`.
2. **HR/Admin** views pending jobs -> Approves/Rejects.
3. **System** updates status -> Job becomes visible to Candidates.

### Application Process
1. **Candidate** views `approved` & `is_open` jobs.
2. **Candidate** applies -> `job_applications` created.
3. **System** presents `technical_assessments` (if any).
4. **Candidate** submits answers -> `technical_assessment_responses`.
5. **AI Service** (Triggered via background process or API) scores answers.

## 8. External Integrations
- **Azure Blob Storage:** configuration in `backend/fastapi_app/routers/candidates.py` handles file uploads. It generates SAS tokens or public URLs for resumes and profile pictures.
- **OpenAI:** Used for analyzing technical assessment responses (likely in `agents` module).
