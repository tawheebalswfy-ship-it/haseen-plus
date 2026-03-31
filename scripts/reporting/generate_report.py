"""
PolicyShield — Comprehensive Project Report Generator
Generates a professional Word document (.docx) covering all system design aspects.
"""

import os
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

# ── Styling helpers ──────────────────────────────────────────

def set_cell_shading(cell, hex_color):
    """Set background color on a table cell."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def add_styled_table(doc, headers, rows, col_widths=None):
    """Add a formatted table with header shading."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header row
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for run in p.runs:
                run.bold = True
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        set_cell_shading(cell, "1F4E79")

    # Data rows
    for r_idx, row_data in enumerate(rows):
        for c_idx, val in enumerate(row_data):
            cell = table.rows[r_idx + 1].cells[c_idx]
            cell.text = str(val)
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.size = Pt(9)
            if r_idx % 2 == 1:
                set_cell_shading(cell, "D6E4F0")

    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(w)

    return table


def add_heading_with_number(doc, text, level=1):
    """Add a heading."""
    doc.add_heading(text, level=level)


def add_body(doc, text):
    """Add a body paragraph."""
    p = doc.add_paragraph(text)
    p.style.font.size = Pt(11)
    return p


def set_narrow_margins(doc):
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)


# ── Report Content ──────────────────────────────────────────

def build_report():
    doc = Document()
    set_narrow_margins(doc)

    # ─── Title Page ───
    for _ in range(6):
        doc.add_paragraph("")

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("PolicyShield")
    run.bold = True
    run.font.size = Pt(36)
    run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run(
        "AI-Powered ISO 27001 & NCA ECC-2:2024\nCompliance Gap Detection System"
    )
    run.font.size = Pt(18)
    run.font.color.rgb = RGBColor(0x4A, 0x4A, 0x4A)

    doc.add_paragraph("")

    info = doc.add_paragraph()
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = info.add_run(
        "College of Computing — Umm Al-Qura University\n"
        "Department of Cybersecurity\n"
        "2025"
    )
    run.font.size = Pt(13)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

    doc.add_page_break()

    # ─── Table of Contents placeholder ───
    add_heading_with_number(doc, "Table of Contents", level=1)
    toc_items = [
        "1. Executive Summary",
        "2. Project Overview",
        "3. System Architecture",
        "4. ML Pipeline Design",
        "5. Model Architecture",
        "6. Dataset Generation",
        "7. API Design",
        "8. Database Schema",
        "9. Frontend Application",
        "10. Gap Detection Framework",
        "11. Deployment Architecture",
        "12. Security Considerations",
        "13. System Design Diagrams",
        "14. Technology Stack",
        "15. Future Improvements",
    ]
    for item in toc_items:
        p = doc.add_paragraph(item)
        p.paragraph_format.space_after = Pt(2)

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 1. Executive Summary
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "1. Executive Summary")
    add_body(doc,
        "PolicyShield is an AI-powered compliance gap detection system designed to help "
        "organizations assess their security policies against the Saudi National Cybersecurity "
        "Authority (NCA) Essential Cybersecurity Controls (ECC-2:2024) and ISO 27001:2022 standards. "
        "The system uses a fine-tuned multilingual BERT (mBERT) model to automatically identify "
        "16 specific compliance gaps across two critical security domains: Password Policy and "
        "Risk Assessment."
    )
    add_body(doc,
        "The platform provides a complete compliance management workflow — from uploading and "
        "classifying policy documents through AI-powered gap detection, to generating remediation "
        "tasks with contextual guidance, and producing comprehensive compliance reports. The system "
        "supports both English and Arabic languages, making it particularly suited for organizations "
        "operating in the Gulf region."
    )

    add_heading_with_number(doc, "Key Capabilities", level=2)
    capabilities = [
        "Automated detection of 16 compliance gaps using multi-label classification",
        "Support for both English and Arabic policy documents (bilingual mBERT)",
        "Real-time inference via REST API (100–500ms per document)",
        "Severity-weighted compliance scoring aligned with NCA ECC-2:2024",
        "Automated remediation task generation with AI guidance",
        "Interactive compliance dashboard with drill-down analytics",
        "Evidence management with file upload and preview",
        "Comprehensive reporting and export capabilities",
    ]
    for cap in capabilities:
        doc.add_paragraph(cap, style="List Bullet")

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 2. Project Overview
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "2. Project Overview")

    add_heading_with_number(doc, "2.1 Problem Statement", level=2)
    add_body(doc,
        "Organizations in Saudi Arabia are required to comply with the NCA ECC-2:2024 framework, "
        "which mandates comprehensive cybersecurity controls. Manually reviewing policy documents "
        "against these controls is time-consuming, error-prone, and requires specialized expertise. "
        "PolicyShield automates this process by using natural language processing to identify "
        "specific gaps in security policy documents."
    )

    add_heading_with_number(doc, "2.2 Objectives", level=2)
    objectives = [
        "Develop an AI model capable of detecting 16 specific compliance gaps in policy documents",
        "Build a production-ready REST API for real-time policy analysis",
        "Create an intuitive web dashboard for compliance management workflows",
        "Support bilingual (English/Arabic) document analysis",
        "Map detected gaps to NCA ECC-2:2024 controls for actionable remediations",
        "Provide severity-weighted scoring for prioritized gap resolution",
    ]
    for obj in objectives:
        doc.add_paragraph(obj, style="List Bullet")

    add_heading_with_number(doc, "2.3 Scope", level=2)
    add_styled_table(doc,
        ["Dimension", "Coverage"],
        [
            ["Regulatory Framework", "NCA ECC-2:2024 / ISO 27001:2022"],
            ["Policy Domains", "Password Policy (ECC 2-2), Risk Assessment (ECC 1-5)"],
            ["Languages", "English, Arabic"],
            ["Gap Count", "16 (8 per domain)"],
            ["NCA Controls Mapped", "20 ECC controls"],
            ["Deployment", "Google Cloud Run (me-central1, Doha)"],
        ],
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 3. System Architecture
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "3. System Architecture")

    add_heading_with_number(doc, "3.1 High-Level Architecture", level=2)
    add_body(doc,
        "PolicyShield follows a modern three-tier architecture with clear separation of concerns:"
    )
    add_body(doc,
        "1) Presentation Layer — React 19 + TypeScript SPA with TailwindCSS, providing an "
        "interactive compliance dashboard with bilingual support.\n"
        "2) Application Layer — FastAPI REST API deployed on Google Cloud Run, hosting the "
        "mBERT inference engine with auto-scaling capabilities.\n"
        "3) Data Layer — Supabase (PostgreSQL) for persistent storage with Row-Level Security, "
        "Supabase Storage for file management, and Google Cloud Storage for model artifacts."
    )

    add_heading_with_number(doc, "3.2 Component Overview", level=2)
    add_styled_table(doc,
        ["Component", "Technology", "Responsibility"],
        [
            ["Frontend SPA", "React 19, TypeScript 5.9, Vite", "User interface, data visualization, workflow management"],
            ["API Gateway", "FastAPI + Uvicorn", "Model inference, document analysis, health monitoring"],
            ["ML Model", "mBERT (110M params)", "Multi-label gap detection (16 sigmoid outputs)"],
            ["Database", "Supabase (PostgreSQL)", "Policies, assessments, tasks, reports, user profiles"],
            ["File Storage", "Supabase Storage", "Policy files, evidence documents (with signed URLs)"],
            ["Model Storage", "Google Cloud Storage", "Model weights (SafeTensors), tokenizer files"],
            ["Container Runtime", "Google Cloud Run", "Auto-scaling serverless container (me-central1)"],
            ["Authentication", "Supabase Auth", "Email/password sign-in with JWT tokens"],
        ],
    )

    add_heading_with_number(doc, "3.3 Data Flow", level=2)
    add_body(doc,
        "The primary data flow for policy analysis follows these steps:\n\n"
        "1. User uploads a policy document (PDF/DOCX/TXT) through the web dashboard.\n"
        "2. Document text is extracted and sent to the FastAPI /analyze endpoint.\n"
        "3. The API chunks the document into ~350-word segments with 50-word overlap.\n"
        "4. Each chunk is tokenized (max 512 tokens) and passed through the mBERT model.\n"
        "5. Per-chunk predictions are aggregated via max-pooling across all 16 gap labels.\n"
        "6. Probabilities exceeding the threshold (default 0.6) are flagged as detected gaps.\n"
        "7. A severity-weighted compliance score is computed per domain and overall.\n"
        "8. Results are returned to the frontend and persisted in Supabase.\n"
        "9. The dashboard maps gaps to NCA ECC controls and generates remediation tasks."
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 4. ML Pipeline Design
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "4. ML Pipeline Design")

    add_heading_with_number(doc, "4.1 Pipeline Overview", level=2)
    add_body(doc,
        "The machine learning pipeline consists of five stages: Dataset Generation, "
        "Data Preprocessing, Model Training, Model Export, and Deployment. Each stage "
        "is implemented as a standalone Python script for reproducibility."
    )
    add_styled_table(doc,
        ["Stage", "Tool / Framework", "Output"],
        [
            ["Dataset Generation", "Google Gemini 2.5 Flash API", "Synthetic policy documents (JSON/CSV/JSONL)"],
            ["Data Preprocessing", "Pandas, NumPy, HuggingFace Tokenizer", "Multi-hot vectors (N×16), tokenized sequences"],
            ["Model Training", "HuggingFace Trainer, PyTorch", "mBERT + classifier head checkpoints"],
            ["Model Export", "SafeTensors", "model.safetensors (~681 MB) + tokenizer files"],
            ["Deployment", "Docker, Google Cloud Run", "FastAPI container with GCS model download"],
        ],
    )

    add_heading_with_number(doc, "4.2 Dataset Generation", level=2)
    add_body(doc,
        "The training dataset is synthetically generated using Google Gemini 2.5 Flash. "
        "Each sample consists of a realistic policy excerpt and a set of compliance gap labels. "
        "A two-pass verification approach ensures label quality: the first pass generates the "
        "policy text with intended gaps, and the second pass independently verifies each gap label."
    )
    add_body(doc,
        "The generator supports 14 sample profiles covering four compliance levels "
        "(Compliant, Partially Compliant, Non-Compliant, Critical), two languages "
        "(English, Arabic), 12 industries, and 5 company sizes. Output is saved in "
        "JSON, CSV, and incremental JSONL formats for flexibility."
    )

    add_heading_with_number(doc, "4.3 Data Preprocessing", level=2)
    add_body(doc,
        "Each sample is converted to a 16-dimensional binary vector (multi-hot encoding) "
        "representing the presence or absence of each gap. The text is tokenized using the "
        "bert-base-multilingual-cased tokenizer with a maximum sequence length of 512 tokens. "
        "Documents exceeding this limit are split into overlapping chunks (~350 words with "
        "~50-word overlap) and predictions are aggregated via max-pooling."
    )

    add_heading_with_number(doc, "4.4 Training Configuration", level=2)
    add_styled_table(doc,
        ["Parameter", "Value"],
        [
            ["Optimizer", "AdamW"],
            ["Learning Rate", "2e-5 (with warmup)"],
            ["Batch Size", "8–16"],
            ["Epochs", "Variable (early stopping)"],
            ["Loss Function", "BCEWithLogitsLoss (multi-label)"],
            ["Weight Decay", "0.01"],
            ["Warmup Steps", "10% of total"],
            ["Gradient Clipping", "1.0"],
            ["Framework", "HuggingFace Transformers Trainer"],
        ],
    )

    add_heading_with_number(doc, "4.5 Evaluation Metrics", level=2)
    add_styled_table(doc,
        ["Metric", "Description", "Relevance"],
        [
            ["Hamming Loss", "Fraction of incorrectly predicted labels", "Primary — penalizes each wrong gap label"],
            ["Subset Accuracy", "Exact match of all 16 labels", "Strict — all gaps must match exactly"],
            ["Micro F1", "F1 averaged over all label predictions", "Balances precision/recall across all gaps"],
            ["Macro F1", "F1 averaged per-label then averaged", "Ensures rare gaps are not ignored"],
            ["Per-gap Precision", "Correct detections / total predictions", "Avoids false positives per gap"],
            ["Per-gap Recall", "Correct detections / actual gaps", "Avoids missing real gaps"],
            ["AUC-ROC", "Area under ROC curve per gap", "Threshold-independent performance"],
        ],
    )

    add_heading_with_number(doc, "4.6 Business Metrics", level=2)
    add_styled_table(doc,
        ["Metric", "Target"],
        [
            ["Overall compliance accuracy", "≥ 85%"],
            ["Critical gap recall", "≥ 90%"],
            ["Inference latency (p95)", "< 500ms"],
            ["False positive rate", "< 15%"],
        ],
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 5. Model Architecture
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "5. Model Architecture")

    add_heading_with_number(doc, "5.1 GapDetectionModel", level=2)
    add_body(doc,
        "The production model (v2.0) is a custom PyTorch module built on top of the "
        "bert-base-multilingual-cased backbone. It uses a two-layer classification head "
        "with dropout regularization to produce 16 independent probability outputs."
    )
    add_body(doc,
        "Architecture: mBERT backbone (12 layers, 12 attention heads, 768 hidden dim) → "
        "[CLS] token embedding (768-dim) → Linear(768→256) → ReLU → Dropout(0.3) → "
        "Linear(256→16) → Sigmoid. Each output represents the probability of a specific "
        "compliance gap being present in the document."
    )

    add_heading_with_number(doc, "5.2 Model Specifications", level=2)
    add_styled_table(doc,
        ["Property", "Value"],
        [
            ["Base Model", "bert-base-multilingual-cased"],
            ["Task", "Multi-label binary classification"],
            ["Number of Labels", "16"],
            ["Hidden Size", "768"],
            ["Attention Heads", "12"],
            ["Transformer Layers", "12"],
            ["Vocabulary Size", "119,547 (multilingual WordPiece)"],
            ["Classifier Dropout", "0.3"],
            ["Activation Functions", "ReLU (hidden), Sigmoid (output)"],
            ["Total Parameters", "~110M (backbone) + ~200K (classifier head)"],
            ["Model Size", "~681 MB (SafeTensors format)"],
            ["Max Input Tokens", "512"],
        ],
    )

    add_heading_with_number(doc, "5.3 Why mBERT?", level=2)
    add_styled_table(doc,
        ["Requirement", "mBERT Capability"],
        [
            ["Bilingual (Arabic + English)", "Pre-trained on 104 languages including Arabic"],
            ["Domain Understanding", "Strong contextual encoding of security policy language"],
            ["Sequence Classification", "CLS token pooling well-suited for document-level labels"],
            ["Deployment Constraints", "~110M params fits in Cloud Run CPU instances"],
        ],
    )

    add_heading_with_number(doc, "5.4 Model Evolution", level=2)
    add_styled_table(doc,
        ["Aspect", "v1.0 (Legacy)", "v2.0 (Production)"],
        [
            ["Task", "3-class classification", "16-label multi-label"],
            ["Labels", "Fully / Partially / Non-Compliant", "16 specific gap IDs"],
            ["Architecture", "BertForSequenceClassification", "Custom GapDetectionModel"],
            ["Loss", "CrossEntropyLoss", "BCEWithLogitsLoss"],
            ["Output", "Softmax (3 probs)", "Sigmoid (16 probs)"],
            ["Granularity", "Document-level only", "Per-gap, per-domain"],
            ["Actionability", "Low (just a label)", "High (specific gaps to fix)"],
        ],
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 6. Dataset Generation
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "6. Dataset Generation")

    add_heading_with_number(doc, "6.1 Generation Process", level=2)
    add_body(doc,
        "The training dataset is generated using Google Gemini 2.5 Flash via the google-genai "
        "Python SDK. Each sample undergoes a two-step process: (1) Prompt Gemini to generate a "
        "realistic policy excerpt based on domain, compliance profile, language, industry, and "
        "company size parameters; (2) Prompt Gemini to independently verify each gap label "
        "with binary confirmation."
    )

    add_heading_with_number(doc, "6.2 Gap Definitions — Password Policy (ECC 2-2)", level=2)
    add_styled_table(doc,
        ["Gap ID", "Description", "Severity"],
        [
            ["GAP_PP_001", "Weak password complexity requirements", "High (3)"],
            ["GAP_PP_002", "Inadequate password expiration policy", "Medium (2)"],
            ["GAP_PP_003", "Weak account lockout policy", "Medium (2)"],
            ["GAP_PP_004", "Missing Multi-Factor Authentication (MFA)", "Critical (4)"],
            ["GAP_PP_005", "Missing Privileged Access Management (PAM)", "Critical (4)"],
            ["GAP_PP_006", "Missing password encryption/storage requirements", "High (3)"],
            ["GAP_PP_007", "Missing periodic review schedule", "Medium (2)"],
            ["GAP_PP_008", "Missing or vague roles and responsibilities", "Medium (2)"],
        ],
    )

    add_heading_with_number(doc, "6.3 Gap Definitions — Risk Assessment (ECC 1-5)", level=2)
    add_styled_table(doc,
        ["Gap ID", "Description", "Severity"],
        [
            ["GAP_RA_001", "Missing documented risk methodology", "Critical (4)"],
            ["GAP_RA_002", "Missing risk identification procedures", "High (3)"],
            ["GAP_RA_003", "Missing likelihood/impact assessment scales", "High (3)"],
            ["GAP_RA_004", "Missing risk treatment options", "High (3)"],
            ["GAP_RA_005", "Missing mandatory risk assessment triggers", "Critical (4)"],
            ["GAP_RA_006", "Missing risk register requirements", "Medium (2)"],
            ["GAP_RA_007", "Missing periodic review schedule", "Medium (2)"],
            ["GAP_RA_008", "Missing integration with project management", "Medium (2)"],
        ],
    )

    add_heading_with_number(doc, "6.4 Compliance Scoring Formula", level=2)
    add_body(doc,
        "The compliance score is severity-weighted using the formula:\n\n"
        "    score = 1 − (Σ w_g for detected gaps) / (Σ w_g for all gaps)\n\n"
        "Where w_g is the severity weight (2–4) of gap g.\n\n"
        "Classification thresholds:\n"
        "  • Fully Compliant: score ≥ 0.9 (and 0 gaps detected)\n"
        "  • Partially Compliant: 0.5 ≤ score < 0.9\n"
        "  • Non-Compliant: score < 0.5"
    )

    add_heading_with_number(doc, "6.5 Dataset Variation Dimensions", level=2)
    add_styled_table(doc,
        ["Dimension", "Values"],
        [
            ["Languages", "English, Arabic"],
            ["Industries", "12 (Finance, Healthcare, Government, Telecom, Energy, etc.)"],
            ["Company Sizes", "5 (Startup, SME, Medium, Large Enterprise, Government Agency)"],
            ["Compliance Profiles", "4 (Compliant, Partially Compliant, Non-Compliant, Critical)"],
        ],
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 7. API Design
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "7. API Design")

    add_heading_with_number(doc, "7.1 Overview", level=2)
    add_styled_table(doc,
        ["Property", "Value"],
        [
            ["Framework", "FastAPI + Uvicorn"],
            ["Base URL", "https://ecc-model-host-636663078359.me-central1.run.app"],
            ["Deployment", "Docker → Google Cloud Run (me-central1, Doha)"],
            ["Authentication", "None (public API)"],
            ["CORS", "All origins allowed (development)"],
            ["Docs", "/docs (Swagger UI), /redoc (ReDoc)"],
        ],
    )

    add_heading_with_number(doc, "7.2 Endpoints", level=2)
    add_styled_table(doc,
        ["Method", "Path", "Description", "Tags"],
        [
            ["GET", "/", "API metadata and version info", "meta"],
            ["GET", "/health", "Health / readiness probe (Cloud Run)", "meta"],
            ["POST", "/analyze", "Analyze policy document for compliance gaps", "inference"],
        ],
    )

    add_heading_with_number(doc, "7.3 POST /analyze — Request", level=2)
    add_styled_table(doc,
        ["Field", "Type", "Required", "Constraints", "Default", "Description"],
        [
            ["text", "string", "Yes", "1–50,000 chars", "—", "Full policy document text"],
            ["threshold", "float", "No", "0.0–1.0", "0.6", "Confidence threshold for gap detection"],
        ],
    )

    add_heading_with_number(doc, "7.4 POST /analyze — Response (AnalyzeResponse)", level=2)
    add_styled_table(doc,
        ["Field", "Type", "Description"],
        [
            ["overall_compliance", "string", "Compliance level label (Fully/Partially/Non-Compliant)"],
            ["overall_score", "float", "Overall compliance score (0–100)"],
            ["gap_count", "integer", "Total gaps detected across all domains"],
            ["num_chunks", "integer", "Number of 512-token chunks processed"],
            ["inference_time_ms", "float", "Total inference time in milliseconds"],
            ["domains_detected", "list[string]", "Domains found in the document"],
            ["password_policy", "DomainResult", "Password Policy domain results"],
            ["risk_assessment", "DomainResult", "Risk Assessment domain results"],
            ["all_gap_probabilities", "dict[str, float]", "Raw probability for every gap label"],
        ],
    )

    add_heading_with_number(doc, "7.5 Data Models", level=2)

    add_body(doc, "GapDetail Schema:")
    add_styled_table(doc,
        ["Field", "Type", "Description"],
        [
            ["gap_id", "string", "Gap identifier (e.g., GAP_PP_001)"],
            ["description", "string", "Human-readable gap description"],
            ["confidence", "float", "Model confidence score (0.0–1.0)"],
        ],
    )

    doc.add_paragraph("")
    add_body(doc, "DomainResult Schema:")
    add_styled_table(doc,
        ["Field", "Type", "Description"],
        [
            ["gaps_detected", "list[string]", "List of detected gap IDs for this domain"],
            ["gap_count", "integer", "Number of gaps detected"],
            ["score", "float", "Domain compliance score (0–100)"],
            ["details", "list[GapDetail]", "Detailed gap information with confidence"],
        ],
    )

    add_heading_with_number(doc, "7.6 Error Handling", level=2)
    add_styled_table(doc,
        ["HTTP Status", "Meaning", "When"],
        [
            ["200", "Success", "Request processed normally"],
            ["422", "Validation Error", "Missing text, text too long, invalid threshold"],
            ["503", "Service Unavailable", "Model failed to load at startup"],
            ["500", "Internal Server Error", "Unexpected runtime failure"],
        ],
    )

    add_heading_with_number(doc, "7.7 Performance & Constraints", level=2)
    add_styled_table(doc,
        ["Constraint", "Value"],
        [
            ["Max input length", "50,000 characters"],
            ["Max tokens per chunk", "512 tokens"],
            ["Model memory", "~1.5 GB RAM"],
            ["Inference time (typical)", "100–500ms per document"],
            ["Concurrency", "Cloud Run auto-scaling (0 → N instances)"],
            ["Cold start", "~15–30s (model download from GCS)"],
        ],
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 8. Database Schema
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "8. Database Schema")

    add_heading_with_number(doc, "8.1 Overview", level=2)
    add_body(doc,
        "The database is hosted on Supabase (managed PostgreSQL) with Row-Level Security (RLS) "
        "enabled on all tables. Each table is scoped to the authenticated user via auth.uid(). "
        "The uuid-ossp extension provides UUID generation for primary keys."
    )

    add_heading_with_number(doc, "8.2 Entity-Relationship Summary", level=2)
    add_styled_table(doc,
        ["Table", "Purpose", "Key Fields"],
        [
            ["profiles", "User accounts (synced from auth.users)", "id (UUID), email, full_name, avatar_url"],
            ["classification_history", "Past analysis results", "policy_text, result_label, confidence, inference_time_ms"],
            ["policies", "Uploaded policy documents", "title, status, category, compliance_score, file_url, analysis_result (JSONB)"],
            ["assessments", "Compliance assessments", "name, framework, status, overall_score, results (JSONB), comments (JSONB)"],
            ["reports", "Generated compliance reports", "title, type, assessment_id, content (JSONB)"],
            ["tasks", "Remediation tasks", "title, control_id, priority, status, ai_guidance (JSONB), comments (JSONB)"],
            ["schedules", "Recurring assessment schedules", "name, framework, frequency, enabled, next_run"],
            ["teams", "Team management", "name, description, members (JSONB)"],
        ],
    )

    add_heading_with_number(doc, "8.3 Policies Table Detail", level=2)
    add_styled_table(doc,
        ["Column", "Type", "Constraints", "Description"],
        [
            ["id", "UUID", "PK, auto-generated", "Unique policy identifier"],
            ["user_id", "UUID", "FK → auth.users", "Owner"],
            ["title", "TEXT", "NOT NULL", "Policy document title"],
            ["status", "TEXT", "CHECK (uploaded/analyzing/analyzed)", "Processing status"],
            ["category", "TEXT", "nullable", "Policy category (password_policy, risk_assessment)"],
            ["compliance_score", "REAL", "nullable", "Overall compliance score (0–100)"],
            ["file_url", "TEXT", "nullable", "Supabase Storage path"],
            ["nca_controls_mapped", "JSONB", "default []", "Mapped NCA ECC control IDs"],
            ["analysis_result", "JSONB", "nullable", "Full API response from /analyze"],
        ],
    )

    add_heading_with_number(doc, "8.4 Assessments Table Detail", level=2)
    add_styled_table(doc,
        ["Column", "Type", "Constraints", "Description"],
        [
            ["id", "UUID", "PK, auto-generated", "Assessment identifier"],
            ["user_id", "UUID", "FK → auth.users", "Owner"],
            ["name", "TEXT", "NOT NULL", "Assessment name"],
            ["framework", "TEXT", "NOT NULL", "Compliance framework (NCA ECC)"],
            ["status", "TEXT", "CHECK (draft/in_progress/completed)", "Assessment status"],
            ["overall_score", "REAL", "nullable", "Overall compliance score"],
            ["results", "JSONB", "default []", "Control-level assessment results"],
            ["comments", "JSONB", "default []", "User comments with timestamps"],
        ],
    )

    add_heading_with_number(doc, "8.5 Tasks Table Detail", level=2)
    add_styled_table(doc,
        ["Column", "Type", "Constraints", "Description"],
        [
            ["id", "UUID", "PK, auto-generated", "Task identifier"],
            ["user_id", "UUID", "FK → auth.users", "Owner"],
            ["title", "TEXT", "NOT NULL", "Task title"],
            ["description", "TEXT", "nullable", "Detailed description"],
            ["control_id", "TEXT", "nullable", "Related NCA ECC control ID"],
            ["assessment_id", "TEXT", "nullable", "Source assessment ID"],
            ["priority", "TEXT", "CHECK (critical/high/medium/low)", "Task priority"],
            ["status", "TEXT", "CHECK (open/in_progress/completed/deferred)", "Task status"],
            ["assigned_to", "TEXT", "nullable", "Assignee name"],
            ["due_date", "TEXT", "nullable", "Due date"],
            ["ai_guidance", "JSONB", "nullable", "AI-generated remediation guidance"],
            ["comments", "JSONB", "default []", "User comments with timestamps"],
        ],
    )

    add_heading_with_number(doc, "8.6 Storage Buckets", level=2)
    add_styled_table(doc,
        ["Bucket", "Size Limit", "Allowed Types", "Purpose"],
        [
            ["policy-files", "10 MB", "PDF, TXT, CSV, DOCX", "Uploaded policy documents"],
            ["evidence-files", "10 MB", "PDF, TXT, CSV, DOCX, PNG, JPEG, GIF, XLSX", "Assessment evidence files"],
        ],
    )
    add_body(doc,
        "Storage policies enforce user-level isolation: each user can only access files "
        "in their own folder (path prefix = auth.uid())."
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 9. Frontend Application
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "9. Frontend Application")

    add_heading_with_number(doc, "9.1 Technology Stack", level=2)
    add_styled_table(doc,
        ["Technology", "Version", "Purpose"],
        [
            ["React", "19", "UI framework with functional components and hooks"],
            ["TypeScript", "5.9", "Type-safe JavaScript"],
            ["Vite", "6.x", "Build tool and dev server (HMR)"],
            ["TailwindCSS", "4.x", "Utility-first CSS framework"],
            ["Supabase JS", "2.x", "Database client and authentication"],
            ["Recharts", "2.x", "Data visualization (charts and graphs)"],
            ["Lucide React", "—", "Icon library"],
        ],
    )

    add_heading_with_number(doc, "9.2 Dashboard Pages", level=2)
    add_styled_table(doc,
        ["Page", "Component", "Description"],
        [
            ["Overview", "OverviewPage.tsx", "KPI cards, compliance score gauges, gap distribution charts, recent activity"],
            ["Policies", "PoliciesPage.tsx", "Upload policies, trigger ML analysis, view per-policy results and NCA mappings"],
            ["Assessments", "AssessmentsPage.tsx", "Create assessments from analysis results, manage controls, upload evidence, add comments"],
            ["Remediation", "RemediationPage.tsx", "View auto-generated tasks, AI guidance, status tracking, comment threads"],
            ["Reports", "ReportsPage.tsx", "Generate and export compliance reports (PDF/JSON), audit trails"],
            ["Risk Dashboard", "RiskDashboardPage.tsx", "Risk heat maps, severity distribution, domain-level risk analysis"],
            ["Framework Comparison", "FrameworkComparisonPage.tsx", "Compare NCA ECC vs ISO 27001 coverage, control mapping visualization"],
        ],
    )

    add_heading_with_number(doc, "9.3 Key Features", level=2)
    features = [
        "Bilingual support (English/Arabic) with automatic RTL layout switching",
        "Dark mode support with system preference detection",
        "Real-time policy analysis with progress indicators",
        "Interactive charts showing gap distribution, compliance trends, and risk levels",
        "Evidence file management with upload, preview (images/PDF), and download",
        "Comment system on assessments and tasks with timestamps",
        "Automated task generation from detected gaps with AI remediation guidance",
        "Local storage caching for offline access to previously loaded data",
    ]
    for f in features:
        doc.add_paragraph(f, style="List Bullet")

    add_heading_with_number(doc, "9.4 State Management", level=2)
    add_body(doc,
        "Application state is managed through a Zustand-like custom store (useComplianceStore) "
        "that provides a unified interface for CRUD operations on all entities. The store "
        "implements a dual-persistence strategy:\n\n"
        "1. Primary: Supabase PostgreSQL (remote, persisted, RLS-secured)\n"
        "2. Fallback: localStorage cache (offline access, hydration on load)\n\n"
        "Data flows from Supabase on initial load, with localStorage serving as a "
        "read-through cache. All mutations write to both stores simultaneously."
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 10. Gap Detection Framework
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "10. Gap Detection Framework")

    add_heading_with_number(doc, "10.1 NCA ECC-2:2024 Control Mapping", level=2)
    add_body(doc,
        "Each detected gap is mapped to one or more NCA ECC-2:2024 controls. The system "
        "tracks 20 ECC controls across the two supported domains. This mapping enables "
        "the dashboard to display control-level compliance status and generate targeted "
        "remediation tasks."
    )

    add_heading_with_number(doc, "10.2 Password Policy Controls", level=2)
    add_styled_table(doc,
        ["Control ID", "Control Name", "Related Gaps"],
        [
            ["ECC 2-2-1", "Password Complexity Requirements", "GAP_PP_001"],
            ["ECC 2-2-2", "Password Expiration Policy", "GAP_PP_002"],
            ["ECC 2-2-3", "Account Lockout Policy", "GAP_PP_003"],
            ["ECC 2-2-4", "Multi-Factor Authentication", "GAP_PP_004"],
            ["ECC 2-2-5", "Privileged Access Management", "GAP_PP_005"],
            ["ECC 2-2-6", "Password Storage & Encryption", "GAP_PP_006"],
            ["ECC 2-2-7", "Periodic Review Schedule", "GAP_PP_007"],
            ["ECC 2-2-8", "Roles and Responsibilities", "GAP_PP_008"],
        ],
    )

    add_heading_with_number(doc, "10.3 Risk Assessment Controls", level=2)
    add_styled_table(doc,
        ["Control ID", "Control Name", "Related Gaps"],
        [
            ["ECC 1-5-1", "Risk Assessment Methodology", "GAP_RA_001"],
            ["ECC 1-5-2", "Risk Identification Procedures", "GAP_RA_002"],
            ["ECC 1-5-3", "Risk Analysis (Likelihood/Impact)", "GAP_RA_003"],
            ["ECC 1-5-4", "Risk Treatment Options", "GAP_RA_004"],
            ["ECC 1-5-5", "Risk Assessment Triggers", "GAP_RA_005"],
            ["ECC 1-5-6", "Risk Register Requirements", "GAP_RA_006"],
            ["ECC 1-5-7", "Periodic Review Schedule", "GAP_RA_007"],
            ["ECC 1-5-8", "Integration with PM", "GAP_RA_008"],
        ],
    )

    add_heading_with_number(doc, "10.4 Inference Pipeline Detail", level=2)
    add_body(doc,
        "The inference pipeline processes documents through six stages:\n\n"
        "1. Domain Detection — Keyword heuristic identifies which domains (Password Policy, "
        "Risk Assessment) are present. Password Policy requires 1+ keyword match; "
        "Risk Assessment requires 2+ keyword matches.\n\n"
        "2. Document Chunking — Text is split into ~350-word segments with ~50-word overlap "
        "at section headings, then paragraphs, then word-count boundaries.\n\n"
        "3. Tokenization — Each chunk is tokenized with the mBERT tokenizer (max 512 tokens, "
        "dynamic padding, truncation enabled).\n\n"
        "4. Per-Chunk Inference — Each tokenized chunk passes through the mBERT backbone and "
        "classification head, producing 16 sigmoid probabilities.\n\n"
        "5. Max-Pool Aggregation — For multi-chunk documents, per-gap maximum probability "
        "is taken across all chunks.\n\n"
        "6. Threshold & Scoring — Probabilities exceeding the threshold (default 0.6) are "
        "flagged as detected gaps. A severity-weighted score is computed per domain and overall."
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 11. Deployment Architecture
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "11. Deployment Architecture")

    add_heading_with_number(doc, "11.1 Container Configuration", level=2)
    add_styled_table(doc,
        ["Setting", "Value"],
        [
            ["Base Image", "python:3.12-slim (multi-stage build)"],
            ["PyTorch Build", "CPU-only (download.pytorch.org/whl/cpu)"],
            ["Runtime Command", "uvicorn app:app --host 0.0.0.0 --port $PORT"],
            ["Default Port", "8080"],
            ["Health Check Interval", "30 seconds"],
            ["Health Start Period", "60 seconds"],
        ],
    )

    add_heading_with_number(doc, "11.2 Google Cloud Run Configuration", level=2)
    add_styled_table(doc,
        ["Setting", "Value"],
        [
            ["Region", "me-central1 (Doha, Qatar)"],
            ["Scaling", "Auto (0 → N instances)"],
            ["Memory", "2 GB (sufficient for ~1.5 GB model)"],
            ["CPU", "2 vCPU"],
            ["Startup Probe", "GET /health"],
            ["Container Registry", "Artifact Registry (me-central3)"],
        ],
    )

    add_heading_with_number(doc, "11.3 Model Loading Strategy", level=2)
    add_body(doc,
        "On container startup, the model loading follows a fallback chain:\n\n"
        "1. Check local path (./policy_gap_detector/)\n"
        "2. If not found → download from GCS (gs://model-files33/policy_gap_detector/)\n"
        "3. Fallback prefixes: policy_gap_detector/, checkpoint-505/\n"
        "4. Validate checkpoint shape before loading (rejects legacy 3-class models)\n"
        "5. Set model to eval mode + inference mode"
    )

    add_heading_with_number(doc, "11.4 CI/CD Pipeline", level=2)
    add_body(doc,
        "The deployment uses Google Cloud Build with a two-step pipeline:\n\n"
        "1. Build: docker build using the multi-stage Dockerfile\n"
        "2. Push: docker push to Artifact Registry (me-central3-docker.pkg.dev)\n\n"
        "Cloud Run automatically deploys new revisions when a new image is pushed."
    )

    add_heading_with_number(doc, "11.5 Frontend Deployment", level=2)
    add_body(doc,
        "The React SPA is built with Vite (npm run build) producing static assets that can be "
        "deployed to any static hosting service (Vercel, Netlify, Firebase Hosting). "
        "Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are injected at build time."
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 12. Security Considerations
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "12. Security Considerations")

    add_heading_with_number(doc, "12.1 Database Security", level=2)
    security_items = [
        "Row-Level Security (RLS) enabled on all tables — users can only access their own data",
        "All table operations filtered by auth.uid() = user_id",
        "Storage policies enforce user-level folder isolation",
        "Auto-generated UUIDs for primary keys prevent enumeration attacks",
    ]
    for item in security_items:
        doc.add_paragraph(item, style="List Bullet")

    add_heading_with_number(doc, "12.2 API Security", level=2)
    api_security = [
        "Input validation via Pydantic schemas (text length, threshold range)",
        "Maximum document size enforced (50,000 characters)",
        "CORS configuration (should be restricted to frontend domain in production)",
        "Health endpoint for monitoring without exposing sensitive data",
    ]
    for item in api_security:
        doc.add_paragraph(item, style="List Bullet")

    add_heading_with_number(doc, "12.3 Authentication", level=2)
    add_body(doc,
        "User authentication is handled by Supabase Auth with JWT tokens. The frontend "
        "stores tokens securely and includes them in all API requests to Supabase. "
        "Signed URLs with expiration are used for private file access in Storage buckets."
    )

    add_heading_with_number(doc, "12.4 Data Protection", level=2)
    data_protection = [
        "All data in transit encrypted via TLS (HTTPS)",
        "Supabase encrypts data at rest",
        "Policy documents stored in private Storage buckets (not publicly accessible)",
        "Evidence files accessible only via time-limited signed URLs",
    ]
    for item in data_protection:
        doc.add_paragraph(item, style="List Bullet")

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 13. System Design Diagrams
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "13. System Design Diagrams")

    add_body(doc,
        "The following system design diagrams are maintained in draw.io format in the "
        "system-design/ directory. Each diagram documents a specific architectural or "
        "behavioral aspect of the PolicyShield system."
    )

    diagrams = [
        ("system-architecture.drawio",
         "System Architecture Diagram",
         "Shows the three-tier architecture: Frontend Layer (React SPA, TailwindCSS), "
         "Backend/API Layer (FastAPI, Uvicorn, mBERT Model, Document Chunker), "
         "Data Layer (Supabase PostgreSQL, Supabase Storage, Google Cloud Storage). "
         "Includes Cloud Run container deployment with auto-scaling."),

        ("use-case-diagram.drawio",
         "Use Case Diagram",
         "Defines 13 use cases across 3 actors: Security Officer (upload policy, view results, "
         "manage assessments, create remediation tasks), Compliance Manager (approve assessments, "
         "generate reports, compare frameworks), System Administrator (manage users, configure "
         "schedules, manage teams). The PolicyShield System boundary contains all use cases."),

        ("class-component-diagram.drawio",
         "Class / Component Diagram",
         "Maps React component hierarchy: ComplianceDashboard → 7 page components "
         "(OverviewPage, PoliciesPage, AssessmentsPage, RemediationPage, ReportsPage, "
         "RiskDashboardPage, FrameworkComparisonPage). Shows library classes: "
         "PolicyClassifierAPI, useComplianceStore, SupabaseClient. Includes type interfaces "
         "for Policy, Assessment, Task, Report."),

        ("data-flow-diagram.drawio",
         "Data Flow Diagram (DFD Level 1)",
         "Traces data through 6 processes: Upload Policy, Analyze Document (AI), "
         "Store Results, Generate Assessment, Create Tasks, Generate Report. "
         "External entities: User, ML Model API, Supabase DB. Data stores: "
         "Policy Store, Assessment Store, Task Store, Report Store."),

        ("sequence-authentication.drawio",
         "Sequence Diagram — Authentication",
         "Shows the email/password sign-up and sign-in flow between User, Frontend (React), "
         "Supabase Auth, and Database. Includes profile auto-creation trigger, JWT token "
         "management, and session persistence."),

        ("sequence-policy-classification.drawio",
         "Sequence Diagram — Policy Classification",
         "Details the end-to-end flow: User submits text → Frontend sends POST /analyze → "
         "FastAPI chunks document → mBERT inference → Max-pool aggregation → "
         "Domain scoring → Response with gaps, scores, compliance level."),

        ("sequence-gap-analysis.drawio",
         "Sequence Diagram — Gap Analysis",
         "Shows how detected gaps flow through the system: API response → Frontend parses "
         "gap details → Maps gaps to NCA controls → Calculates control-level scores → "
         "Updates assessment results → Generates remediation tasks."),

        ("sequence-batch-classification.drawio",
         "Sequence Diagram — Batch Classification",
         "Illustrates the batch processing workflow: User selects multiple policies → "
         "Frontend queues sequential API calls → Progress tracking → "
         "Bulk result storage → Dashboard refresh."),

        ("activity-policy-assessment.drawio",
         "Activity Diagram — Policy Assessment",
         "Swimlane diagram with User, System, and AI Model lanes. Shows the full "
         "assessment workflow: Upload → Validate → Analyze → Review Gaps → "
         "Accept/Reject findings → Generate Tasks → Complete Assessment."),

        ("activity-remediation-task.drawio",
         "Activity Diagram — Remediation Task",
         "Swimlane diagram showing task lifecycle: Task Created → Assigned → "
         "In Progress → Evidence Uploaded → Review → Completed/Deferred. "
         "Includes decision points for priority escalation and due date checking."),

        ("state-diagrams.drawio",
         "State Diagrams",
         "Contains state machines for three entities: Policy (Uploaded → Analyzing → Analyzed), "
         "Assessment (Draft → In Progress → Completed), Task (Open → In Progress → "
         "Completed/Deferred). Each shows valid state transitions and trigger events."),

        ("deployment-diagram.drawio",
         "Deployment Diagram",
         "UML deployment diagram showing physical infrastructure: Client Browser → "
         "Vercel/Netlify (React SPA) → Google Cloud Run (FastAPI Container) → "
         "Google Cloud Storage (Model Files). Supabase Cloud: PostgreSQL + "
         "Auth + Storage. All connected via HTTPS."),
    ]

    for filename, title, description in diagrams:
        add_heading_with_number(doc, title, level=2)
        add_body(doc, f"File: system-design/{filename}")
        add_body(doc, description)

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 14. Technology Stack
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "14. Technology Stack")

    add_heading_with_number(doc, "14.1 ML & AI Layer", level=2)
    add_styled_table(doc,
        ["Technology", "Version", "Purpose"],
        [
            ["Google Gemini 2.5 Flash", "Latest", "Synthetic dataset generation"],
            ["PyTorch", "≥ 2.0.0", "Deep learning framework"],
            ["HuggingFace Transformers", "≥ 4.35.0", "mBERT backbone and Trainer"],
            ["SafeTensors", "≥ 0.4.0", "Secure model serialization"],
            ["scikit-learn", "≥ 1.3", "Evaluation metrics"],
            ["Pandas / NumPy", "≥ 2.0 / ≥ 1.24", "Data processing"],
        ],
    )

    add_heading_with_number(doc, "14.2 Backend Layer", level=2)
    add_styled_table(doc,
        ["Technology", "Version", "Purpose"],
        [
            ["Python", "3.12", "Runtime language"],
            ["FastAPI", "≥ 0.115.0", "REST API framework"],
            ["Uvicorn", "Latest", "ASGI server"],
            ["Docker", "—", "Containerization"],
            ["Google Cloud Run", "—", "Serverless container platform"],
            ["Google Cloud Storage", "—", "Model artifact storage"],
        ],
    )

    add_heading_with_number(doc, "14.3 Frontend Layer", level=2)
    add_styled_table(doc,
        ["Technology", "Version", "Purpose"],
        [
            ["React", "19", "UI component framework"],
            ["TypeScript", "5.9", "Type-safe development"],
            ["Vite", "6.x", "Build tool with HMR"],
            ["TailwindCSS", "4.x", "Utility-first CSS"],
            ["Recharts", "2.x", "Data visualization"],
            ["Lucide React", "—", "Icon library"],
        ],
    )

    add_heading_with_number(doc, "14.4 Data & Infrastructure Layer", level=2)
    add_styled_table(doc,
        ["Technology", "Version", "Purpose"],
        [
            ["Supabase", "—", "Backend-as-a-Service (PostgreSQL + Auth + Storage)"],
            ["PostgreSQL", "15+", "Relational database with JSONB support"],
            ["Google Cloud Build", "—", "CI/CD pipeline"],
            ["Artifact Registry", "—", "Docker image registry"],
        ],
    )

    doc.add_page_break()

    # ═══════════════════════════════════════════════════════
    # 15. Future Improvements
    # ═══════════════════════════════════════════════════════
    add_heading_with_number(doc, "15. Future Improvements")

    add_heading_with_number(doc, "15.1 Model Enhancements", level=2)
    add_styled_table(doc,
        ["Enhancement", "Description"],
        [
            ["Additional Domains", "Extend to ECC 3-x, 4-x controls (Incident Management, Business Continuity)"],
            ["Document Structure Awareness", "Section-level gap attribution for precise localization"],
            ["Active Learning", "Flag uncertain predictions for human review and retraining"],
            ["Model Distillation", "Smaller model variant for edge/on-premise deployment"],
            ["Continuous Training", "Re-train on verified user predictions for domain adaptation"],
        ],
    )

    add_heading_with_number(doc, "15.2 Platform Enhancements", level=2)
    add_styled_table(doc,
        ["Enhancement", "Description"],
        [
            ["SSO Integration", "Support SAML/OIDC for enterprise single sign-on"],
            ["Audit Logging", "Comprehensive audit trail for all user actions"],
            ["Notification System", "Email/SMS alerts for assessment deadlines and task assignments"],
            ["Multi-tenant Support", "Organization-level data isolation and team management"],
            ["API Rate Limiting", "Token-based rate limiting for production security"],
            ["PDF Report Export", "Generate formatted PDF compliance reports with charts"],
        ],
    )

    # ─── Footer on last page ───
    doc.add_paragraph("")
    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run("— End of Report —")
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
    run.italic = True

    return doc


# ── Main ──────────────────────────────────────────────────

if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    output_dir = repo_root / "docs" / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = os.fspath(output_dir / "PolicyShield_Project_Report.docx")
    doc = build_report()
    doc.save(output_path)
    print(f"Report generated: {output_path}")
    print(f"File size: {os.path.getsize(output_path) / 1024:.1f} KB")
