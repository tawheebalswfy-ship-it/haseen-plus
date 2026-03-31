# PolicyShield — Web Application

Primary React frontend for the PolicyShield monorepo. This app now lives at `apps/web` and connects to the FastAPI gap-detection service plus Supabase auth, database, and storage.

## Features

- AI gap detection for policy uploads and pasted text
- Compliance dashboard, assessments, reports, remediation, and risk views
- English and Arabic UI with RTL support
- Supabase-backed auth, storage, and persistent records
- Browser-side PDF and DOCX extraction before API analysis

## Monorepo Location

```text
apps/web/
├── public/
├── src/
├── .env.example
├── package.json
├── README.md
└── supabase_schema.sql
```

The canonical shared database schema is also copied to `../../infra/supabase/supabase_schema.sql`.

## Setup

### Option 1: from the monorepo root

```bash
npm run install:web
npm run dev:web
```

### Option 2: from this app folder

```bash
cd apps/web
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## Environment Variables

Create `apps/web/.env` with:

```env
VITE_SUPABASE_URL=<provided>
VITE_SUPABASE_ANON_KEY=<provided>
VITE_API_BASE_URL=<provided>
VITE_API_KEY=<provided>
```

`VITE_API_BASE_URL` should point to the model API, which exposes `GET /health` and `POST /analyze`.

## Database Setup

If you need to recreate the Supabase schema, run the contents of either of these files in the Supabase SQL editor:

- `infra/supabase/supabase_schema.sql`
- `apps/web/supabase_schema.sql`

## Scripts

| Scope | Command | Description |
| --- | --- | --- |
| Root | `npm run dev:web` | Start the frontend dev server |
| Root | `npm run build:web` | Build the frontend |
| Root | `npm run lint:web` | Lint the frontend |
| Local | `npm run dev` | Start Vite in this folder |
| Local | `npm run build` | Type-check and build |
| Local | `npm run preview` | Preview the production build |
| Local | `npm run lint` | Run ESLint |

## Tech Stack

- React 19
- TypeScript 5.9
- Vite 7
- TailwindCSS 4
- React Router 7
- Supabase JS
- pdfjs-dist
