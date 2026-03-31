# Migration Map

This workspace now uses the root `d:\aicg` folder as the monorepo root.

The original `iso-policy-project/` folder is intentionally left in place as a legacy snapshot during the migration. The root `.gitignore` excludes it so the new monorepo can be worked on without mixing legacy and target structures.

## Folder Mapping

| Legacy path | New path | Notes |
| --- | --- | --- |
| `iso-policy-project/iso-security-app` | `apps/web` | Primary React frontend copied without `.git`, `node_modules`, `dist`, or `.env` |
| `iso-policy-project/model-deployment` | `apps/model-api` | Primary FastAPI model service copied without nested repo metadata |
| `iso-policy-project/AIcomplainec/AIcomplainec` | `apps/ai-complainec-legacy` | Legacy prototype retained as a secondary app |
| `iso-policy-project/dataset` | `ml/datasets/processed` | Active processed dataset |
| `iso-policy-project/dataset_old_backup` | `ml/datasets/archive` | Historical dataset backup |
| `iso-policy-project/policy_compliance_classifier` | `ml/models/policy-compliance-classifier` | Main model assets |
| `iso-policy-project/policy_classifier_mbert/checkpoint-101` | `ml/models/checkpoints/policy-classifier-mbert/checkpoint-101` | Training checkpoint |
| `iso-policy-project/model_building.ipynb` | `ml/notebooks/model_building.ipynb` | Training notebook |
| `iso-policy-project/dataset_utils.py` | `ml/scripts/dataset_utils.py` | ML utility script |
| `iso-policy-project/export_gap_detector.py` | `ml/scripts/export_gap_detector.py` | Model export script |
| `iso-policy-project/generate_compliance_dataset.py` | `ml/scripts/generate_compliance_dataset.py` | Dataset generation script |
| `iso-policy-project/requirements.txt` | `ml/requirements.txt` | ML pipeline Python dependencies |
| `iso-policy-project/.env.example` | `ml/.env.example` | ML dataset generation environment template |
| `iso-policy-project/system-design` | `docs/architecture` | Architecture diagrams and design docs |
| `iso-policy-project/reference` | `docs/references` | Source compliance references |
| `iso-policy-project/GP*.docx`, `PolicyShield_Project_Report*.docx`, `*.pdf` | `docs/reports` | Report deliverables and templates |
| `iso-policy-project/report_assets` | `artifacts/report-assets` | Rendered report figures |
| `iso-policy-project/report_charts` | `artifacts/report-charts` | Generated charts |
| `iso-policy-project/report_media_extract` | `artifacts/media-extract` | Extracted media |
| `iso-policy-project/gp1_images` | `artifacts/gp1-images` | GP1 screenshots |
| `iso-policy-project/generate_report.py` and related scripts | `scripts/reporting` | Report-generation utilities |
| `iso-policy-project/iso-security-app/supabase_schema.sql` | `infra/supabase/supabase_schema.sql` | Canonical DB schema copy |
| `iso-policy-project/model-deployment/clouddeploy.yaml` | `infra/cloud/model-api.clouddeploy.yaml` | Canonical Cloud Build config copy |

## Next Cleanup Candidates

- Decide whether `apps/ai-complainec-legacy` should stay active or move to an archive area.
- Move large ML binaries to Git LFS or DVC if they need to be versioned from the root repo.
- Continue de-duplicating infra files inside apps once the root structure is stable.
- Keep aligning path-sensitive scripts with root-level `docs/` and `artifacts/` directories.