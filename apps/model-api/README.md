# PolicyShield — Model API

FastAPI inference service for the PolicyShield monorepo. This service now lives at `apps/model-api` and exposes the multi-label gap-detection API consumed by the web frontend.

## Current API Surface

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Service metadata |
| `GET` | `/health` | Readiness, model path, and label metadata |
| `POST` | `/analyze` | Analyze a document for compliance gaps |

## Monorepo Layout

```text
apps/model-api/
├── app.py
├── Dockerfile
├── clouddeploy.yaml
├── requirements.txt
├── test_api.py
├── test_deployed_api.py
└── test_local.py
```

The root-level Cloud Build config is at `../../infra/cloud/model-api.clouddeploy.yaml`.

## Local Setup

### Option 1: from the monorepo root

```bash
npm run install:model-api
npm run dev:model-api
```

### Option 2: from this app folder

```bash
cd apps/model-api
python -m pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 8080 --reload
```

Interactive docs are available at `http://localhost:8080/docs`.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `API_KEY` | Optional `X-API-Key` validation for `/analyze` |
| `MODEL_PATH` | Override the local model directory |
| `GCS_BUCKET_NAME` | Bucket used when downloading the model at startup |
| `GCS_MODEL_PREFIX` | Prefix for model files in GCS |

If `MODEL_PATH` is not set, the service now checks these locations in order:

1. `ml/models/policy-gap-detector`
2. `ml/models/policy-compliance-classifier`
3. `apps/model-api/policy_gap_detector`

If none exist locally, it falls back to GCS download.

## Testing

```bash
python apps/model-api/test_local.py
python apps/model-api/test_api.py
python apps/model-api/test_deployed_api.py
```

## Docker

From the repo root:

```bash
docker build -f apps/model-api/Dockerfile -t policy-gap-api apps/model-api
docker run -p 8080:8080 policy-gap-api
```

## Deployment

Use `infra/cloud/model-api.clouddeploy.yaml` from the repo root, or the local `apps/model-api/clouddeploy.yaml` if you are building from the app directory.
