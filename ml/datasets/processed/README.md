# PolicyShield — Training Dataset

Labeled compliance dataset for training the multilingual BERT classifier. Generated using the **Google Gemini 2.0 Flash** API.

---

## Files

| File                           | Format | Description                                    |
|--------------------------------|--------|------------------------------------------------|
| `compliance_dataset.json`      | JSON   | Full dataset with all fields                   |
| `compliance_dataset.csv`       | CSV    | Tabular format for ML training                 |
| `password_policy_samples.json` | JSON   | Password policy samples only                   |
| `risk_assessment_samples.json` | JSON   | Risk assessment samples only                   |
| `incremental_samples.jsonl`    | JSONL  | Incremental save file (resume support)         |
| `dataset_statistics.json`      | JSON   | Summary statistics of the dataset              |
| `sample_data.csv`              | CSV    | Small sample for quick testing                 |

---

## Labels

| Label               | Quality Level | Score Range |
|---------------------|---------------|-------------|
| Fully Compliant     | Excellent     | 0.8–1.0     |
| Partially Compliant | Partial       | 0.4–0.7     |
| Non-Compliant       | Weak          | 0.0–0.3     |

---

## Policy Types

| Type              | ECC Reference | ISO Reference    |
|-------------------|---------------|------------------|
| Password Policy   | ECC 2-2       | Annex A.9.4      |
| Risk Assessment   | ECC 1-5       | Annex A.6        |

---

## CSV Schema

| Column                   | Type   | Description                         |
|--------------------------|--------|-------------------------------------|
| `id`                     | string | Unique sample identifier            |
| `policy_type`            | string | `password_policy` or `risk_assessment` |
| `policy_type_ar`         | string | Arabic name of the policy type      |
| `language`               | string | `en` or `ar`                        |
| `quality_level`          | string | `excellent`, `partial`, or `weak`   |
| `policy_text`            | string | Full policy document text           |
| `label`                  | string | Classification label                |
| `label_en`               | string | English label name                  |
| `label_ar`               | string | Arabic label name                   |
| `compliance_score`       | float  | 0.0–1.0 compliance score            |
| `gaps_found`             | string | Pipe-separated gap codes            |
| `gap_count`              | int    | Number of gaps found                |
| `ecc_control_reference`  | string | Related ECC control code            |
| `generated_at`           | string | ISO timestamp                       |

---

## Generation

From the project root:

```bash
python generate_compliance_dataset.py
```

This generates 36 samples by default (3 samples x 2 types x 3 qualities x 2 languages). Output is saved incrementally, so interrupted runs can be resumed.

See the root [README](../README.md) for full generation instructions.
