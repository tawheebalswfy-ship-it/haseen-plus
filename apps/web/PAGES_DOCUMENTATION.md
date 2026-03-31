# PolicyShield — Pages & Data Flow Documentation

> Auto-generated documentation explaining how each page in the PolicyShield ISO compliance platform works, how data flows through the system, and how the ML model integrates with the UI.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [ML Model Architecture](#ml-model-architecture)
3. [Landing Page](#1-landing-page)
4. [Dashboard Shell (ComplianceDashboard)](#2-dashboard-shell--compliancedashboard)
5. [Overview Page](#3-overview-page)
6. [Policies Page](#4-policies-page)
7. [Assessments Page](#5-assessments-page)
8. [Remediation Page](#6-remediation-page)
9. [Framework Comparison Page](#7-framework-comparison-page)
10. [Risk Dashboard Page](#8-risk-dashboard-page)
11. [Reports Page](#9-reports-page)
12. [End-to-End Data Flow](#end-to-end-data-flow)

---

## System Overview

PolicyShield is an AI-powered compliance platform that analyzes organizational security policies against the **NCA ECC-2:2024** (Essential Cybersecurity Controls) framework, with cross-mapping to **ISO 27001:2022**.

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **ML Model** | Fine-tuned mBERT (bert-base-multilingual-cased) | Gap detection in policy documents |
| **Backend** | FastAPI on Google Cloud Run | Model inference API |
| **Frontend** | React 19 + TypeScript + Vite + TailwindCSS | Dashboard & compliance management UI |
| **Database** | Supabase (PostgreSQL + Storage + Auth) | Persistent data & file storage |

---

## ML Model Architecture

### Model: Fine-tuned mBERT

- **Base**: `bert-base-multilingual-cased` (~110M parameters)
- **Custom Head**: `Linear(768 → 256) → ReLU → Dropout(0.3) → Linear(256 → 16) → Sigmoid`
- **Output**: 16 independent sigmoid probabilities (multi-label classification)
- **Languages**: English + Arabic
- **Model Size**: ~681 MB (SafeTensors format)

### The 16 Gap Labels

The model detects 16 compliance gaps across 2 domains:

**Password Policy Domain (ECC 2-2):**

| Gap ID | Description |
|--------|-------------|
| GAP_PP_001 | Missing minimum password length requirement |
| GAP_PP_002 | No password complexity rules |
| GAP_PP_003 | Missing password expiration policy |
| GAP_PP_004 | No password history/reuse prevention |
| GAP_PP_005 | Missing account lockout mechanism |
| GAP_PP_006 | No multi-factor authentication requirement |
| GAP_PP_007 | Missing secure password storage guidelines |
| GAP_PP_008 | No password transmission security |

**Risk Assessment Domain (ECC 1-5):**

| Gap ID | Description |
|--------|-------------|
| GAP_RA_001 | No risk assessment methodology defined |
| GAP_RA_002 | Missing asset identification and classification |
| GAP_RA_003 | No threat identification process |
| GAP_RA_004 | Missing vulnerability assessment |
| GAP_RA_005 | No risk evaluation criteria |
| GAP_RA_006 | Missing risk treatment plan |
| GAP_RA_007 | No risk monitoring and review process |
| GAP_RA_008 | Missing risk communication procedures |

### Inference Pipeline

```
Document → Chunk (350 words, 50 overlap)
        → Tokenize (max 512 tokens)
        → mBERT forward pass
        → 16 sigmoid outputs per chunk
        → Max-pool across all chunks
        → Apply threshold (default 0.6)
        → Group by domain
        → Calculate severity-weighted compliance score
```

### API Endpoint

```
POST /analyze
Body: { "text": "...", "threshold": 0.6 }
Response: {
  overall_score: 0.85,
  overall_compliance: "Partially Compliant",
  gap_count: 3,
  num_chunks: 5,
  inference_time_ms: 234,
  domains_detected: ["password_policy", "risk_assessment"],
  password_policy: { score: 0.75, gaps: [...] },
  risk_assessment: { score: 0.95, gaps: [...] },
  gaps_detected: [ { gap_id, description, confidence } ],
  all_gap_probabilities: { GAP_PP_001: 0.82, ... }
}
```

---

## 1. Landing Page

**File**: `src/components/LandingPage.tsx`
**Route**: `/`

### Purpose
Public-facing entry point that introduces PolicyShield to new users. Explains the platform's capabilities, supported compliance frameworks, and the AI model behind it.

### UI Sections

| Section | Description |
|---------|-------------|
| **Hero** | Main headline + description + CTA buttons (Sign Up / View Dashboard) |
| **Statistics Bar** | 16 compliance gaps · <1s analysis time · 2 languages |
| **Model-Backed Analysis** | Card highlighting mBERT model capabilities and supported domains |
| **NCA ECC ↔ ISO 27001 Mapping** | 3 visual cards explaining the mapping relationship |
| **Coverage Domains Grid** | 9 ECC domains with their control counts |
| **Coming Soon** | Preview of upcoming domains (Network Security, Data Protection, etc.) |
| **4-Step Workflow** | Upload → Analyze → Assess → Remediate visualization |
| **Tech Stack** | BERT, PyTorch, FastAPI, React badges |
| **Final CTA** | Dark background call-to-action to get started |

### State & Interactions
- Uses `useLanguage()` for English ↔ Arabic toggle with RTL support
- All content is static — no API calls
- Navigation links to `/auth/sign-up` and `/dashboard`

---

## 2. Dashboard Shell — ComplianceDashboard

**File**: `src/components/compliance/ComplianceDashboard.tsx`
**Route**: `/dashboard/*`

### Purpose
Layout wrapper providing navigation, sidebar, and header for all dashboard sub-pages. Not a page itself — it renders child routes.

### UI Sections

| Section | Description |
|---------|-------------|
| **Sidebar** | Sticky left navigation with 7 links + language toggle + home link |
| **Top Header** | Mobile menu toggle + breadcrumb + "NCA ECC · ISO 27001" badge |
| **Content Area** | Renders the active child page |

### Navigation Items

| # | Label | Icon | Route |
|---|-------|------|-------|
| 1 | Dashboard | LayoutDashboard | `/dashboard` |
| 2 | Policies | FileText | `/dashboard/policies` |
| 3 | Assessments | ClipboardCheck | `/dashboard/assessments` |
| 4 | Remediation | Wrench | `/dashboard/remediation` |
| 5 | Framework | GitCompare | `/dashboard/framework` |
| 6 | Risk Dashboard | AlertTriangle | `/dashboard/risk` |
| 7 | Reports | BarChart3 | `/dashboard/reports` |

### State
- `sidebarOpen` — mobile sidebar toggle
- `useLocation()` — determines active nav item
- `useLanguage()` — i18n and RTL direction

---

## 3. Overview Page

**File**: `src/components/compliance/pages/OverviewPage.tsx`
**Route**: `/dashboard`

### Purpose
Dashboard home showing high-level compliance posture: KPIs, recent activity, model coverage, and quick-start guide.

### UI Sections

| Section | Description |
|---------|-------------|
| **Header** | Upload Policy + New Assessment CTA buttons |
| **4 Stat Cards** | Overall Compliance %, Assessments count, Policies Analyzed, Open Tasks |
| **Compliance Gauge** | Circular progress indicator showing overall score |
| **ECC Framework Bar** | Most recent assessment's ECC score + framework label |
| **Recent Activity** | 5 most recent assessments and policies (sorted by date) |
| **Quick Start Guide** | 3-step walkthrough (Upload → Map → Remediate) |
| **AI Model Coverage** | Password Policy (8 gaps) + Risk Assessment (8 gaps) badges |
| **Coming Soon Domains** | Preview of future expansion |
| **NCA ↔ ISO Mapping Summary** | ECC controls count, ISO controls mapped, coverage % |

### Data Flow
```
useComplianceStore() → assessments, policies, tasks
  ↓
Calculate: avg compliance score, open task count, recent activity
  ↓
Render stat cards + gauge + activity list
```

### Key Calculations
- **Overall Compliance %** = Average of all assessment `overall_score` values
- **Open Tasks** = Tasks where `status !== 'completed'`
- **At-Risk Policies** = Policies with `analysis_result.overall_score < 0.8`

---

## 4. Policies Page

**File**: `src/components/compliance/pages/PoliciesPage.tsx`
**Route**: `/dashboard/policies`

### Purpose
Upload policy documents, analyze them with the ML model, and view gap detection results. This is the **primary integration point** between the frontend and the ML API.

### UI Sections

| Section | Description |
|---------|-------------|
| **Header** | Filter tabs (All / Uploaded / Analyzing / Analyzed) + Upload button |
| **Policy Cards Grid** | Each card shows: status badge, title, category, compliance score bar |
| **Expanded Detail** | Overall compliance label + score, text extraction info, chunk count, inference time, domains detected, gap details per domain, domain-level scores |
| **Upload Dialog** | Title input + file drop zone (PDF/DOCX/TXT) OR paste text area + progress steps |

### Data Flow (Upload → Analysis)
```
User uploads file
  ↓
Extract text (client-side for TXT, cloud for PDF/DOCX)
  ↓
addPolicy({ title, content, status: 'uploaded' })  →  Supabase
  ↓
updatePolicy({ status: 'analyzing' })
  ↓
policyClassifierAPI.analyzeDocument(text)  →  POST /analyze  →  Cloud Run
  ↓
Receive AnalyzeResponse: {
  overall_score, overall_compliance, gap_count,
  num_chunks, inference_time_ms, domains_detected,
  password_policy: { score, gaps: [...] },
  risk_assessment: { score, gaps: [...] },
  gaps_detected: [{ gap_id, description, confidence }]
}
  ↓
updatePolicy({ status: 'analyzed', analysis_result: response })  →  Supabase
  ↓
Render gap details in expandable card
```

### User Interactions
- **Upload** — Opens dialog, user selects file or pastes text
- **Analyze** — Automatic after upload; shows extracting → uploading → analyzing → done
- **View Details** — Click card to expand gap analysis breakdown
- **Reanalyze** — Re-sends text to the ML model
- **Delete** — Remove policy from store

---

## 5. Assessments Page

**File**: `src/components/compliance/pages/AssessmentsPage.tsx`
**Route**: `/dashboard/assessments`

### Purpose
Create and manage compliance assessments against the NCA ECC framework. Maps model-detected gaps to specific ECC controls, scores each control, and supports evidence management + comments.

### UI Sections

| Section | Description |
|---------|-------------|
| **Assessment List** | Cards showing: framework badge, overall score, name, control count, compliance breakdown bar |
| **Assessment Detail** | Expanded view with 4 tabs |
| **Controls Tab** | Grouped by ECC domain, table with Control ID/Name/Status/Score/Findings. Click status to cycle through states. |
| **Evidence Tab** | Per-control file upload to Supabase Storage, preview (image/PDF), download |
| **Comments Tab** | Discussion thread with author, timestamp, add comment |
| **Audit Tab** | Timeline of assessment creation events + comment history |
| **Generate Tasks Button** | Auto-creates remediation tasks from non-compliant controls |

### Data Flow (Assessment Creation)
```
User clicks "New Assessment" → enters name
  ↓
Collect all previously analyzed policies from store
  ↓
For each policy, extract gaps from policy.analysis_result
  ↓
Map gaps → ECC controls using GAP_CONTROL_MAP:
  GAP_PP_001 → ["ECC-2-2-1"]    (Identity & Access Management)
  GAP_RA_001 → ["ECC-1-5-1"]    (Cybersecurity Risk Management)
  ... (16 gaps → 20 ECC controls)
  ↓
Score each control:
  - No gaps detected       → "compliant" (100%)
  - Gaps with confidence ≥ 0.7 → "non_compliant" (low score)
  - Gaps with confidence < 0.7 → "partial" (medium score)
  - Domain not in analysis → "not_assessed"
  ↓
Calculate overall_score = average of all control scores
  ↓
addAssessment({ controls, overall_score, ... })  →  Supabase
```

### Evidence Management
```
Upload: uploadEvidenceFile(userId, assessmentId, file)  →  Supabase Storage (evidence-files bucket)
View:   downloadEvidenceFile(path) → blob → preview modal (images inline, PDFs in iframe)
Download: blob → saveAs
Delete: deleteEvidenceFile(path)
```

### Task Generation
```
Click "Generate Tasks"
  ↓
Filter controls where status ∈ { "non_compliant", "partial" }
  ↓
For each non-compliant control:
  - Create task with title = "Remediate: {control_name}"
  - Set priority based on status (non_compliant → high, partial → medium)
  - Generate AI guidance (steps, effort, tools)
  ↓
addTask(task)  →  Supabase
```

---

## 6. Remediation Page

**File**: `src/components/compliance/pages/RemediationPage.tsx`
**Route**: `/dashboard/remediation`

### Purpose
Manage remediation tasks. Users create tasks manually or auto-generate from non-compliant assessment controls. Each task includes AI-generated guidance, priority/status tracking, comments, and due dates.

### UI Sections

| Section | Description |
|---------|-------------|
| **Header** | Delete All · Auto-Generate · Create Task buttons |
| **Stats Cards** | Total / Open / In Progress / Completed / Critical counts |
| **Filters** | Status filter (All/Open/In Progress/Completed/Deferred) + Priority filter (All/Critical/High/Medium/Low) |
| **Task List** | Each item shows: checkbox, title, priority badge, status, due date, expand arrow |
| **Expanded Detail** | AI Guidance (steps, effort, tools), comments thread, status buttons, delete |

### AI Guidance Generation
Each task receives context-aware remediation guidance:

```
{
  steps: [
    "1. Review current {control_name} implementation",
    "2. Identify specific gaps and deficiencies",
    "3. Develop remediation action plan",
    "4. Implement required changes",
    "5. Validate compliance with ECC requirements",
    "6. Document changes and update assessment"
  ],
  effort: "20-40 hours",     // based on priority level
  tools: [                    // based on control domain
    "Network Scanner",        // for network controls
    "IAM Platform",           // for identity controls
    "DLP Solution",           // for data controls
    "SIEM/SOAR"              // for incident controls
  ]
}
```

### Task Lifecycle
```
Open  →  In Progress  →  Completed
  ↓                         ↑
  └──→  Deferred  ──────────┘
```

### User Interactions
- **Create Task** — Manual entry: title, description, priority, due date
- **Auto-Generate** — Select an assessment → creates tasks from all non-compliant controls
- **Status Cycling** — Click checkbox or status buttons to advance state
- **Add Comment** — Enter text + Post button
- **Delete** — Remove individual task or all tasks

---

## 7. Framework Comparison Page

**File**: `src/components/compliance/pages/FrameworkComparisonPage.tsx`
**Route**: `/dashboard/framework`

### Purpose
Visual mapping table showing the relationship between NCA ECC-2:2024 controls and ISO 27001:2022 controls. Displays live compliance status from the latest assessment.

### UI Sections

| Section | Description |
|---------|-------------|
| **4 Summary Cards** | Coverage %, Total ECC Controls (20), Unique ISO Controls (9), Direct Mappings count |
| **Domain Coverage Chart** | Horizontal bars showing % coverage per ECC domain |
| **Search + Filters** | Search by control name/ID, filter by ECC domain, filter by relationship type |
| **Mapping Table** | Columns: ECC Control, Domain, Mapping Type (↔ Direct / ~ Partial / → Related), ISO Control, ISO Clause, Live Status |

### Mapping Data
20 ECC → ISO mappings covering:
- **Cybersecurity Governance** (ECC-1-x): 5 controls → ISO 5.x / A.5.x
- **Cybersecurity Defense** (ECC-2-x): 5 controls → ISO 8.x / A.8.x
- **Cybersecurity Resilience** (ECC-3-x): 4 controls → ISO 8.x / A.5.x
- **Third-Party Security** (ECC-4-x): 3 controls → ISO 5.x / A.5.x
- **ICS/OT Security** (ECC-5-x): 3 controls → ISO 8.x / A.5.x

### Live Status Integration
```
Latest ECC assessment → control statuses
  ↓
For each row in mapping table:
  find matching control by ECC Control ID
  ↓
  Display: "Compliant 95%" / "Partial 60%" / "Non-Compliant 30%" / "Not Assessed"
```

---

## 8. Risk Dashboard Page

**File**: `src/components/compliance/pages/RiskDashboardPage.tsx`
**Route**: `/dashboard/risk`

### Purpose
Visual risk heat map showing cyber risks derived from non-compliant controls and open high-priority tasks. Uses a 5×5 Impact/Likelihood matrix.

### UI Sections

| Section | Description |
|---------|-------------|
| **Empty State** | Shown when no assessments or tasks exist |
| **4 Stat Cards** | Critical / High / Medium / Low risk counts |
| **5×5 Heat Map** | Y = Likelihood (Rare → Almost Certain), X = Impact (Negligible → Catastrophic), color-coded cells with risk counts |
| **Framework Risk** | Summary showing ECC assessment risk overview |
| **Risk Alerts** | Top 5 critical risks listed |

### Risk Calculation

```
FROM ASSESSMENTS:
  Non-compliant controls → Impact = control_priority_to_number, Likelihood = 3-5
  Partial controls       → Impact = 1-4 (lower), Likelihood = 1-3

FROM TASKS:
  Critical priority → Impact = 5, Likelihood = 3-5
  High priority     → Impact = 4, Likelihood = 3-5

RISK SCORING:
  Score = Impact × Likelihood
  ≥ 16 → Critical (Red)
  ≥ 9  → High (Orange)
  ≥ 4  → Medium (Amber)
  < 4  → Low (Green)
```

### User Interactions
- Click any heat map cell → opens modal showing the list of risks at that Impact/Likelihood intersection
- Close modal to return to main view

---

## 9. Reports Page

**File**: `src/components/compliance/pages/ReportsPage.tsx`
**Route**: `/dashboard/reports`

### Purpose
Generate and manage compliance reports in 4 formats. Reports can be viewed, exported as PDF, and shared via public links.

### Report Types

| Type | Icon | Description |
|------|------|-------------|
| **Executive** | Briefcase | High-level summary for leadership |
| **Detailed** | FileText | Comprehensive control-by-control breakdown |
| **Gap Analysis** | Search | Focus on identified non-compliance gaps |
| **Remediation Plan** | Tool | Action items and remediation steps |

### UI Sections

| Section | Description |
|---------|-------------|
| **Report List** | Cards showing: type, framework, date, score %, share link button, delete |
| **Generate Dialog** | Select type (4 visual cards), enter title, optionally link to assessment |
| **Report Detail** | Full report view with: header, share banner, content sections, Export PDF button |

### Report Sharing
```
Report created → generate 16-char random share_token
Share URL: /shared/report/{share_token}
Copy button → clipboard + toast confirmation
```

### Report Content Generation
```
Select report type + optional assessment
  ↓
Template engine generates sections:
  - Executive Summary
  - Key Findings
  - Compliance Overview (from linked assessment)
  - Detailed Controls Analysis (for Detailed type)
  - Gap List (for Gap Analysis type)
  - Remediation Steps (for Remediation Plan type)
  - Recommendations
  ↓
addReport({ title, type, content, assessment_id, share_token })  →  Supabase
```

---

## End-to-End Data Flow

### Complete User Journey

```
┌───────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                                │
│  User learns about the platform → Signs up / Logs in              │
└─────────────────────────────┬─────────────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                     OVERVIEW (Dashboard)                           │
│  See KPIs, recent activity, quick start guide                     │
│  → Navigate to Upload Policy                                      │
└─────────────────────────────┬─────────────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                       POLICIES PAGE                                │
│  Upload PDF/DOCX/TXT → Extract text → Send to ML model           │
│                                                                    │
│  POST /analyze  ──────────────────────────────────┐               │
│     text: "..."                                    ▼               │
│     threshold: 0.6                        ┌──────────────┐        │
│                                           │  mBERT Model │        │
│     ◄─────── AnalyzeResponse ◄────────────│  16 Sigmoids │        │
│     { overall_score, gaps_detected,       │  Cloud Run   │        │
│       password_policy, risk_assessment }  └──────────────┘        │
│                                                                    │
│  Store analysis results in Supabase                               │
└─────────────────────────────┬─────────────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                     ASSESSMENTS PAGE                               │
│  Create assessment → Collect gaps from all analyzed policies      │
│  Map gaps → ECC controls using GAP_CONTROL_MAP                    │
│  Score each control → Calculate overall compliance                │
│                                                                    │
│  Upload evidence files → Supabase Storage                         │
│  Add comments → Persisted as JSONB                                │
│  Generate remediation tasks from non-compliant controls           │
└─────────────────────────────┬─────────────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│                     REMEDIATION PAGE                               │
│  View auto-generated tasks (or create manually)                   │
│  Each task has: AI guidance, priority, status, comments           │
│  Status lifecycle: Open → In Progress → Completed                 │
└─────────────────────────────┬─────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│              FRAMEWORK COMPARISON PAGE                              │
│  View ECC ↔ ISO 27001 mappings with live compliance status        │
│  20 ECC controls mapped to 9 unique ISO controls                  │
└────────────────────────────────────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                  RISK DASHBOARD PAGE                                │
│  5×5 heat map derived from non-compliant controls + open tasks    │
│  Risk scoring: Impact × Likelihood → Critical/High/Medium/Low     │
└────────────────────────────────────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                     REPORTS PAGE                                    │
│  Generate reports (Executive/Detailed/Gap Analysis/Remediation)   │
│  Link to assessment → auto-populate data                          │
│  Export as PDF · Share via public link                             │
└────────────────────────────────────────────────────────────────────┘
```

### Data Storage Summary

| Table | Key Fields | Updated By |
|-------|-----------|------------|
| `policies` | title, content, status, analysis_result, category | PoliciesPage |
| `assessments` | name, framework, controls[], overall_score, comments[] | AssessmentsPage |
| `tasks` | title, description, priority, status, ai_guidance, comments[] | RemediationPage, AssessmentsPage |
| `reports` | title, type, content, assessment_id, share_token | ReportsPage |
| `evidence-files` (Storage) | userId/assessmentId/filename | AssessmentsPage |

### Technology Integration Map

| Component | Technology | Role |
|-----------|-----------|------|
| ML Inference | mBERT on Cloud Run | Gap detection from policy text |
| API Client | `src/lib/api.ts` | Calls POST /analyze on Cloud Run |
| State Management | `src/components/compliance/store.ts` | Supabase CRUD + localStorage cache |
| Auth | Supabase Auth | User authentication + RLS |
| File Storage | Supabase Storage | Evidence files (evidence-files bucket) |
| Type Definitions | `src/components/compliance/types.ts` | NCA_CONTROLS, GAP_CONTROL_MAP, interfaces |
