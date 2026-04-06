"""
Sync generated dataset from iso-policy-project/dataset/ into ml/datasets/processed/
Merges all samples from both locations, deduplicates by ID, and writes final JSONL + JSON.
"""
import json
import os
from pathlib import Path

# Paths
ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "iso-policy-project" / "dataset"
SOURCE_JSONL = SOURCE_DIR / "incremental_samples.jsonl"
TARGET_DIR = ROOT / "ml" / "datasets" / "processed"
TARGET_JSONL = TARGET_DIR / "incremental_samples.jsonl"
TARGET_JSON = TARGET_DIR / "compliance_dataset.json"
TARGET_STATS = TARGET_DIR / "dataset_statistics.json"

ALL_GAP_IDS = [
    "GAP_PP_001", "GAP_PP_002", "GAP_PP_003", "GAP_PP_004",
    "GAP_PP_005", "GAP_PP_006", "GAP_PP_007", "GAP_PP_008",
    "GAP_RA_001", "GAP_RA_002", "GAP_RA_003", "GAP_RA_004",
    "GAP_RA_005", "GAP_RA_006", "GAP_RA_007", "GAP_RA_008",
]


def load_jsonl(path):
    samples = []
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        samples.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
    return samples


def compute_stats(samples):
    total = len(samples)
    if total == 0:
        return {}

    compliance_dist = {}
    lang_dist = {}
    gap_freq = {g: 0 for g in ALL_GAP_IDS}
    domain_dist = {"password_policy_only": 0, "risk_assessment_only": 0, "both": 0}

    for s in samples:
        compliance_dist[s["overall_compliance"]] = compliance_dist.get(s["overall_compliance"], 0) + 1
        lang_dist[s["language"]] = lang_dist.get(s["language"], 0) + 1
        for gid, val in s["gap_labels"].items():
            if val == 1:
                gap_freq[gid] = gap_freq.get(gid, 0) + 1
        d = sorted(s.get("domains_covered", []))
        if d == ["password_policy"]:
            domain_dist["password_policy_only"] += 1
        elif d == ["risk_assessment"]:
            domain_dist["risk_assessment_only"] += 1
        else:
            domain_dist["both"] += 1

    return {
        "total_samples": total,
        "compliance_distribution": compliance_dist,
        "language_distribution": lang_dist,
        "domain_coverage": domain_dist,
        "gap_frequency": gap_freq,
        "avg_gap_count": round(sum(s["gap_count"] for s in samples) / total, 2),
        "avg_score": round(sum(s["overall_score"] for s in samples) / total, 2),
    }


def main():
    print("=" * 60)
    print("DATASET SYNC: iso-policy-project → ml/datasets/processed")
    print("=" * 60)

    # Load from both sources
    source_samples = load_jsonl(SOURCE_JSONL)
    target_samples = load_jsonl(TARGET_JSONL)

    print(f"Source (generator output): {len(source_samples)} samples")
    print(f"Target (training data):    {len(target_samples)} samples")

    # Merge and deduplicate by ID
    seen_ids = set()
    merged = []
    for s in source_samples + target_samples:
        sid = s.get("id", "")
        if sid not in seen_ids:
            seen_ids.add(sid)
            merged.append(s)

    print(f"Merged (deduplicated):     {len(merged)} samples")

    # Write JSONL
    os.makedirs(TARGET_DIR, exist_ok=True)
    with open(TARGET_JSONL, "w", encoding="utf-8") as f:
        for s in merged:
            f.write(json.dumps(s, ensure_ascii=False) + "\n")

    # Write JSON
    with open(TARGET_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)

    # Write stats
    stats = compute_stats(merged)
    with open(TARGET_STATS, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    print(f"\nWritten to:")
    print(f"  {TARGET_JSONL}")
    print(f"  {TARGET_JSON}")
    print(f"  {TARGET_STATS}")
    print(f"\nStats: {json.dumps(stats, indent=2)}")
    print("\n✅ Sync complete!")


if __name__ == "__main__":
    main()
