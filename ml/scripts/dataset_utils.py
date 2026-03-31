# Dataset Utilities for Gap-Level Compliance Dataset
# Helper functions for loading, filtering, chunking, and preparing data for ML training.
#
# NEW FORMAT: Each sample is a policy excerpt with 16 binary gap labels.
# The model does multi-label classification (not single-label document classification).

import json
import csv
import os
import re
from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd

# All 16 gap IDs in canonical order (must match generate_compliance_dataset.py)
ALL_GAP_IDS = [
    "GAP_PP_001", "GAP_PP_002", "GAP_PP_003", "GAP_PP_004",
    "GAP_PP_005", "GAP_PP_006", "GAP_PP_007", "GAP_PP_008",
    "GAP_RA_001", "GAP_RA_002", "GAP_RA_003", "GAP_RA_004",
    "GAP_RA_005", "GAP_RA_006", "GAP_RA_007", "GAP_RA_008",
]
GAP_TO_IDX = {g: i for i, g in enumerate(ALL_GAP_IDS)}
NUM_GAPS = len(ALL_GAP_IDS)

PP_GAP_IDS = [g for g in ALL_GAP_IDS if g.startswith("GAP_PP")]
RA_GAP_IDS = [g for g in ALL_GAP_IDS if g.startswith("GAP_RA")]

COMPLIANCE_LEVELS = ["compliant", "partially_compliant", "non_compliant"]


# ============================================================
# LOADING
# ============================================================

def load_dataset_json(filepath: str = "dataset/compliance_dataset.json") -> List[Dict]:
    """Load the full dataset from JSON."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_dataset_csv(filepath: str = "dataset/compliance_dataset.csv") -> pd.DataFrame:
    """Load dataset as pandas DataFrame."""
    return pd.read_csv(filepath, encoding='utf-8-sig')


# ============================================================
# FILTERING
# ============================================================

def filter_by_language(dataset: List[Dict], language: str) -> List[Dict]:
    """Filter samples by language ('en' or 'ar')."""
    return [s for s in dataset if s['language'] == language]


def filter_by_compliance(dataset: List[Dict], level: str) -> List[Dict]:
    """Filter by overall compliance level ('compliant', 'partially_compliant', 'non_compliant')."""
    return [s for s in dataset if s['overall_compliance'] == level]


def filter_by_domain(dataset: List[Dict], domain: str) -> List[Dict]:
    """Filter samples that cover a specific domain."""
    return [s for s in dataset if domain in s.get('domains_covered', [])]


def filter_by_gap_count(dataset: List[Dict], min_gaps: int = 0, max_gaps: int = 16) -> List[Dict]:
    """Filter by gap count range."""
    return [s for s in dataset if min_gaps <= s['gap_count'] <= max_gaps]


# ============================================================
# MULTI-LABEL PREPARATION
# ============================================================

def extract_gap_vectors(dataset: List[Dict]) -> np.ndarray:
    """
    Convert gap_labels dicts to a numpy array of shape (N, 16).
    Each row is a multi-hot binary vector.
    """
    vectors = []
    for sample in dataset:
        vec = [sample["gap_labels"].get(gid, 0) for gid in ALL_GAP_IDS]
        vectors.append(vec)
    return np.array(vectors, dtype=np.float32)


def extract_texts(dataset: List[Dict]) -> List[str]:
    """Extract policy excerpts from dataset."""
    return [s["policy_excerpt"] for s in dataset]


def prepare_for_training(dataset: List[Dict]) -> Tuple[List[str], np.ndarray]:
    """
    Prepare dataset for multi-label gap detection training.

    Returns:
        texts: List of policy excerpt strings
        gap_vectors: numpy array of shape (N, 16), multi-hot binary labels
    """
    texts = extract_texts(dataset)
    gap_vectors = extract_gap_vectors(dataset)
    return texts, gap_vectors


# ============================================================
# DOCUMENT CHUNKING (for inference on full documents)
# ============================================================

def chunk_document(text: str, max_chunk_words: int = 350, overlap_words: int = 50) -> List[str]:
    """
    Split a full policy document into overlapping chunks for model inference.

    Strategy:
    1. Try to split on section headings (e.g., "## Section", "3.1 Title")
    2. Fall back to paragraph-based splitting
    3. Merge very small chunks, split very large ones

    Args:
        text: Full document text
        max_chunk_words: Maximum words per chunk (~512 BERT tokens)
        overlap_words: Overlap between consecutive chunks

    Returns:
        List of text chunks
    """
    # Try section-based splitting first
    section_pattern = r'(?=\n#{1,4}\s|\n\d+[\.\)]\s|\n[١-٩][\.\-])'
    sections = re.split(section_pattern, text)
    sections = [s.strip() for s in sections if s.strip()]

    # If no sections found, split by double newlines (paragraphs)
    if len(sections) <= 1:
        sections = re.split(r'\n\s*\n', text)
        sections = [s.strip() for s in sections if s.strip()]

    # If still one big block, split by word count with overlap
    if len(sections) <= 1:
        return _split_by_words(text, max_chunk_words, overlap_words)

    # Merge small sections and split large ones
    chunks = []
    current_chunk = ""

    for section in sections:
        section_words = len(section.split())

        # If section alone exceeds max, split it
        if section_words > max_chunk_words:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""
            chunks.extend(_split_by_words(section, max_chunk_words, overlap_words))
            continue

        # If adding section exceeds max, save current and start new
        combined = (current_chunk + "\n\n" + section).strip() if current_chunk else section
        if len(combined.split()) > max_chunk_words:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = section
        else:
            current_chunk = combined

    if current_chunk:
        chunks.append(current_chunk.strip())

    # Filter out very small chunks (< 20 words) — merge into previous
    final_chunks = []
    for chunk in chunks:
        if len(chunk.split()) < 20 and final_chunks:
            final_chunks[-1] = final_chunks[-1] + "\n\n" + chunk
        else:
            final_chunks.append(chunk)

    return final_chunks if final_chunks else [text]


def _split_by_words(text: str, max_words: int, overlap: int) -> List[str]:
    """Split text by word count with overlap."""
    words = text.split()
    if len(words) <= max_words:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_words, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += max_words - overlap

    return chunks


# ============================================================
# AGGREGATION (merge chunk-level predictions into document report)
# ============================================================

def aggregate_chunk_predictions(
    chunk_probs: List[Dict[str, float]],
    threshold: float = 0.5
) -> Dict:
    """
    Aggregate per-chunk gap probabilities into a document-level report.

    For each gap, take the MAX probability across all chunks.
    (If ANY chunk strongly indicates a gap, the gap is flagged.)

    Args:
        chunk_probs: List of dicts, each mapping gap_id → probability (0-1)
        threshold: Decision threshold (default 0.5)

    Returns:
        Dict with aggregated gap predictions and compliance assessment
    """
    if not chunk_probs:
        return {"error": "No chunks to aggregate"}

    # Max-pool across chunks for each gap
    aggregated = {}
    for gid in ALL_GAP_IDS:
        max_prob = max(cp.get(gid, 0.0) for cp in chunk_probs)
        aggregated[gid] = {
            "probability": round(max_prob, 4),
            "detected": max_prob >= threshold,
        }

    # Determine which domains are relevant
    pp_detected = any(aggregated[g]["detected"] or aggregated[g]["probability"] > 0.3
                      for g in PP_GAP_IDS)
    ra_detected = any(aggregated[g]["detected"] or aggregated[g]["probability"] > 0.3
                      for g in RA_GAP_IDS)

    # Count gaps by domain
    pp_gaps = [g for g in PP_GAP_IDS if aggregated[g]["detected"]]
    ra_gaps = [g for g in RA_GAP_IDS if aggregated[g]["detected"]]
    total_gaps = pp_gaps + ra_gaps

    # Domain-level scores (percentage of gaps NOT found)
    pp_score = round(1.0 - len(pp_gaps) / len(PP_GAP_IDS), 2) if pp_detected else None
    ra_score = round(1.0 - len(ra_gaps) / len(RA_GAP_IDS), 2) if ra_detected else None

    # Overall compliance
    if len(total_gaps) == 0:
        overall_compliance = "compliant"
    elif len(total_gaps) >= 6:
        overall_compliance = "non_compliant"
    else:
        overall_compliance = "partially_compliant"

    return {
        "gaps": aggregated,
        "gaps_detected": [g for g in ALL_GAP_IDS if aggregated[g]["detected"]],
        "gap_count": len(total_gaps),
        "overall_compliance": overall_compliance,
        "domains_assessed": {
            "password_policy": {
                "present": pp_detected,
                "gaps": pp_gaps,
                "score": pp_score,
            },
            "risk_assessment": {
                "present": ra_detected,
                "gaps": ra_gaps,
                "score": ra_score,
            },
        },
        "num_chunks_analyzed": len(chunk_probs),
    }


# ============================================================
# STATISTICS
# ============================================================

def dataset_summary(dataset: List[Dict]) -> Dict:
    """Print and return a summary of the dataset."""
    total = len(dataset)
    if total == 0:
        print("Empty dataset!")
        return {}

    gap_vectors = extract_gap_vectors(dataset)

    # Compliance distribution
    compliance_dist = {}
    for s in dataset:
        c = s["overall_compliance"]
        compliance_dist[c] = compliance_dist.get(c, 0) + 1

    # Language distribution
    lang_dist = {}
    for s in dataset:
        lang_dist[s["language"]] = lang_dist.get(s["language"], 0) + 1

    # Gap frequency
    gap_freq = {gid: int(gap_vectors[:, i].sum()) for i, gid in enumerate(ALL_GAP_IDS)}

    # Gap count distribution
    gap_counts = gap_vectors.sum(axis=1)

    summary = {
        "total_samples": total,
        "compliance_distribution": compliance_dist,
        "language_distribution": lang_dist,
        "gap_frequency": gap_freq,
        "avg_gap_count": round(float(gap_counts.mean()), 2),
        "avg_score": round(float(np.mean([s["overall_score"] for s in dataset])), 2),
        "label_density": round(float(gap_vectors.mean()), 4),
    }

    print(f"Dataset: {total} samples")
    print(f"  Compliance: {compliance_dist}")
    print(f"  Languages:  {lang_dist}")
    print(f"  Avg gaps:   {summary['avg_gap_count']}")
    print(f"  Avg score:  {summary['avg_score']}")
    print(f"  Label density: {summary['label_density']:.2%}")
    print(f"  Gap frequencies:")
    for gid, count in gap_freq.items():
        bar = "█" * int(count / total * 30)
        print(f"    {gid}: {count:>3} ({count/total:>5.1%}) {bar}")

    return summary
