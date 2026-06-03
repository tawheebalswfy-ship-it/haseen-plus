# AICG Monorepo

**AI-Powered Compliance Guard** — a web-based platform that automates cybersecurity compliance gap detection for Saudi SMEs against NCA ECC and ISO 27001 frameworks using a fine-tuned multilingual BERT model.

## Workspace Layout

```text
aicg/
├─ apps/
│  ├─ web/                     # React 19 + TypeScript frontend (Vite 7)
│  ├─ model-api/               # FastAPI inference service (mBERT)
│  └─ ai-complainec-legacy/    # Legacy prototype (archived)
├─ packages/                   # Shared schemas and config placeholders
├─ ml/
│  ├─ datasets/                # Training data (CSV/JSON)
│  ├─ models/                  # Trained model weights
│  ├─ notebooks/               # Jupyter notebooks
│  └─ scripts/                 # Training and evaluation scripts
├─ docs/
│  ├─ architecture/            # draw.io system diagrams
│  ├─ references/              # Reference documents
│  └─ reports/                 # GP1/GP2 Word reports
├─ artifacts/                  # Report assets, images, media
├─ infra/                      # Cloud Deploy configs, Supabase schema
└─ scripts/                    # Report generation and screenshot scripts
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 20+ (LTS) | https://nodejs.org or `winget install OpenJS.NodeJS.LTS` |
| **npm** | 10+ (bundled with Node) | Comes with Node.js |
| **Python** | 3.11+ | https://python.org or `winget install Python.Python.3.12` |
| **Git** | Latest | https://git-scm.com or `winget install Git.Git` |

Verify your setup:

```bash
node -v    # should print v20+ (e.g. v24.11.0)
npm -v     # should print 10+  (e.g. 11.6.1)
python --version   # should print 3.11+
git --version
```

---

## Quick Start — Web App

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/aicg.git
cd aicg
```

### 2. Install dependencies

**From the monorepo root** (recommended):

```bash
npm install
```

This installs all workspace dependencies including the web app.

**Or install only the web app:**

```bash
npm run install:web
```

**Or from the app folder directly:**

```bash
cd apps/web
npm install
cd ../..
```

### 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env`:

```env
# Supabase — get from Supabase Console → Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# FastAPI Gap Detector — local or Cloud Run URL
VITE_API_URL=http://localhost:8080
VITE_API_KEY=your-api-key
```

> **Note:** The app works without env vars using localStorage fallback, but Supabase features (auth, persistence) and AI analysis require valid credentials.

### 4. Start the development server

**From the root:**

```bash
npm run dev:web
```

**Or from the app folder:**

```bash
cd apps/web
npm run dev
```

The app will start at **http://localhost:5173**. Open it in your browser.

### 5. Build for production (optional)

```bash
npm run build:web
npm run preview:web    # preview the production build locally
```

---

## Quick Start — Model API

The FastAPI inference service runs the mBERT gap-detection model.

### 1. Install Python dependencies

```bash
cd apps/model-api
python -m pip install -r requirements.txt
cd ../..
```

Or from root:

```bash
npm run install:model-api
```

### 2. Run the API server

```bash
npm run dev:model-api
```

Or directly:

```bash
cd apps/model-api
python -m uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

The API runs at **http://localhost:8080**. Interactive docs at **http://localhost:8080/docs**.

> **Note:** The model is downloaded from Google Cloud Storage on first startup (~681 MB). Subsequent starts use the cached local copy.

### 3. Test the API

```bash
python apps/model-api/test_local.py       # offline model test
python apps/model-api/test_api.py          # local server test
python apps/model-api/test_deployed_api.py # Cloud Run test
```

---

## Running Both Together

For the full end-to-end experience (upload → AI analysis → results), run both services:

```bash
# Terminal 1 — Model API
npm run dev:model-api

# Terminal 2 — Web App
npm run dev:web
```

Set `VITE_API_URL=http://localhost:8080` in `apps/web/.env` to connect the frontend to the local API.

---

## Database Setup

The app uses **Supabase** (managed PostgreSQL) with Row-Level Security. To set up your database:

1. Create a project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `infra/supabase/supabase_schema.sql`
3. Copy the project URL and anon key into `apps/web/.env`

---

## All Root Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspace dependencies |
| `npm run install:web` | Install web app dependencies only |
| `npm run dev:web` | Start the web dev server (port 5173) |
| `npm run build:web` | Type-check and build the web app |
| `npm run lint:web` | Lint the web app |
| `npm run preview:web` | Preview the production build |
| `npm run install:model-api` | Install model API Python dependencies |
| `npm run dev:model-api` | Start the FastAPI server (port 8080) |
| `npm run test:model-api:local` | Run offline model tests |
| `npm run report:gp2` | Generate the GP2 Word report |
| `npm run report:screenshots` | Capture web app screenshots for reports |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.9, Tailwind CSS 4, Vite 7 |
| Backend | FastAPI, Python 3.12, mBERT (bert-base-multilingual-cased) |
| Database | Supabase (PostgreSQL + RLS + Auth + Storage) |
| Deployment | Google Cloud Run (me-central1), Vercel |
| CI/CD | GitHub Actions |

---

## Project Documentation

- Architecture diagrams: `docs/architecture/` (draw.io files)
- GP2 Report: `docs/reports/GP2_Report_AICG_v4.docx`
- API design: `docs/architecture/api-design.md`
- ML pipeline design: `docs/architecture/ml-pipeline-design.md`
- Migration map: `docs/migration-map.md`
