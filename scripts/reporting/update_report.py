"""
Update PolicyShield_Project_Report.docx:
  - Enhance Section 6 (Dataset Generation) with detailed methodology
  - Add new section: Training Challenges & Methodology Evolution
  - Add new section: Testing & Validation Results
  - Add statistics tables and charts throughout
"""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import os, json
from pathlib import Path

# ── paths ──────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = REPO_ROOT / "docs" / "reports"
CHARTS_DIR = REPO_ROOT / "artifacts" / "report-charts"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

SRC = os.fspath(REPORTS_DIR / "PolicyShield_Project_Report.docx")
DST = os.fspath(REPORTS_DIR / "PolicyShield_Project_Report_Updated.docx")
CHARTS = os.fspath(CHARTS_DIR)

# ── helper: styled paragraph ──────────────────────────────────────────
def add_para(doc, text, style="Normal", bold=False, size=None, alignment=None, space_after=None):
    p = doc.add_paragraph(style=style)
    run = p.add_run(text)
    if bold:
        run.bold = True
    if size:
        run.font.size = Pt(size)
    if alignment is not None:
        p.alignment = alignment
    if space_after is not None:
        p.paragraph_format.space_after = Pt(space_after)
    return p

def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(text, style="List Bullet")
    p.paragraph_format.left_indent = Cm(1.27 * (level + 1))
    return p

def shade_cells(row, color="D9E2F3"):
    for cell in row.cells:
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

def add_table(doc, headers, rows, col_widths=None):
    """Create a bordered table with shaded header row."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header
    hdr = table.rows[0]
    for i, h in enumerate(headers):
        hdr.cells[i].text = h
        for p in hdr.cells[i].paragraphs:
            for r in p.runs:
                r.bold = True
                r.font.size = Pt(9)
    shade_cells(hdr, "2E75B6")
    # white text on header
    for cell in hdr.cells:
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.color.rgb = RGBColor(255, 255, 255)

    # Data rows
    for ri, row_data in enumerate(rows):
        row = table.rows[ri + 1]
        for ci, val in enumerate(row_data):
            row.cells[ci].text = str(val)
            for p in row.cells[ci].paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
        if ri % 2 == 1:
            shade_cells(row, "EDF2F9")

    if col_widths:
        for ri, row in enumerate(table.rows):
            for ci, w in enumerate(col_widths):
                row.cells[ci].width = Cm(w)
    return table


# ══════════════════════════════════════════════════════════════════════
# GENERATE CHARTS
# ══════════════════════════════════════════════════════════════════════

def generate_charts():
    # Colors
    blue, orange, green = "#2E75B6", "#ED7D31", "#70AD47"
    dark_blue = "#1B4F72"

    # 1. Compliance Distribution Pie
    fig, ax = plt.subplots(figsize=(6, 4))
    labels = ["Compliant\n(48)", "Partially Compliant\n(92)", "Non-Compliant\n(120)"]
    sizes = [48, 92, 120]
    colors = [green, orange, "#C00000"]
    explode = (0.03, 0.03, 0.03)
    ax.pie(sizes, labels=labels, colors=colors, explode=explode,
           autopct="%1.1f%%", startangle=140, textprops={"fontsize": 10})
    ax.set_title("Dataset Compliance Distribution (260 Samples)", fontsize=12, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(CHARTS, "compliance_dist.png"), dpi=200)
    plt.close()

    # 2. Language Distribution Bar
    fig, ax = plt.subplots(figsize=(5, 3.5))
    langs = ["English", "Arabic"]
    counts = [130, 130]
    bars = ax.bar(langs, counts, color=[blue, dark_blue], width=0.5)
    ax.set_ylabel("Number of Samples")
    ax.set_title("Language Distribution", fontsize=12, fontweight="bold")
    ax.set_ylim(0, 160)
    for b in bars:
        ax.text(b.get_x() + b.get_width()/2, b.get_height() + 3,
                str(int(b.get_height())), ha="center", fontsize=11, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(CHARTS, "language_dist.png"), dpi=200)
    plt.close()

    # 3. Domain Coverage Bar
    fig, ax = plt.subplots(figsize=(6, 3.5))
    domains = ["Password Policy\nOnly", "Risk Assessment\nOnly", "Both Domains"]
    dcounts = [89, 79, 92]
    bars = ax.bar(domains, dcounts, color=[blue, orange, green], width=0.5)
    ax.set_ylabel("Number of Samples")
    ax.set_title("Domain Coverage Distribution", fontsize=12, fontweight="bold")
    ax.set_ylim(0, 120)
    for b in bars:
        ax.text(b.get_x() + b.get_width()/2, b.get_height() + 2,
                str(int(b.get_height())), ha="center", fontsize=11, fontweight="bold")
    plt.tight_layout()
    plt.savefig(os.path.join(CHARTS, "domain_coverage.png"), dpi=200)
    plt.close()

    # 4. Gap Frequency Horizontal Bar
    gap_freq = {
        "GAP_PP_001": 82, "GAP_PP_002": 91, "GAP_PP_003": 95, "GAP_PP_004": 91,
        "GAP_PP_005": 97, "GAP_PP_006": 89, "GAP_PP_007": 86, "GAP_PP_008": 92,
        "GAP_RA_001": 80, "GAP_RA_002": 75, "GAP_RA_003": 72, "GAP_RA_004": 72,
        "GAP_RA_005": 69, "GAP_RA_006": 72, "GAP_RA_007": 80, "GAP_RA_008": 69,
    }
    fig, ax = plt.subplots(figsize=(8, 5))
    gaps = list(gap_freq.keys())
    vals = list(gap_freq.values())
    colors_bar = [blue]*8 + [orange]*8
    y_pos = np.arange(len(gaps))
    ax.barh(y_pos, vals, color=colors_bar, height=0.6)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(gaps, fontsize=8)
    ax.set_xlabel("Frequency (out of 260 samples)")
    ax.set_title("Gap Label Frequency in Training Dataset", fontsize=12, fontweight="bold")
    ax.invert_yaxis()
    for i, v in enumerate(vals):
        ax.text(v + 1, i, str(v), va="center", fontsize=8)
    # Legend
    from matplotlib.patches import Patch
    legend_elements = [Patch(facecolor=blue, label="Password Policy"),
                       Patch(facecolor=orange, label="Risk Assessment")]
    ax.legend(handles=legend_elements, loc="lower right")
    plt.tight_layout()
    plt.savefig(os.path.join(CHARTS, "gap_frequency.png"), dpi=200)
    plt.close()

    # 5. Training Loss Curve
    steps = [10, 20, 30, 40, 50, 60, 70, 80, 90, 101]
    losses = [1.1, 1.053, 0.917, 0.808, 0.741, 0.689, 0.636, 0.576, 0.543, 0.52]
    fig, ax = plt.subplots(figsize=(6, 3.5))
    ax.plot(steps, losses, marker="o", color=blue, linewidth=2, markersize=5)
    ax.set_xlabel("Training Steps")
    ax.set_ylabel("Loss")
    ax.set_title("Training Loss Curve", fontsize=12, fontweight="bold")
    ax.grid(True, alpha=0.3)
    ax.set_ylim(0.4, 1.2)
    plt.tight_layout()
    plt.savefig(os.path.join(CHARTS, "training_loss.png"), dpi=200)
    plt.close()

    # 6. Gap Count Distribution
    gap_count_dist = {0:48, 1:21, 2:29, 3:17, 4:20, 5:27, 6:15, 7:15, 8:23,
                      9:3, 10:4, 11:4, 12:8, 13:4, 14:8, 15:7, 16:7}
    fig, ax = plt.subplots(figsize=(7, 3.5))
    x = list(gap_count_dist.keys())
    y = list(gap_count_dist.values())
    colors_gc = [green if g == 0 else orange if g <= 5 else "#C00000" for g in x]
    ax.bar(x, y, color=colors_gc, width=0.7)
    ax.set_xlabel("Number of Gaps per Sample")
    ax.set_ylabel("Number of Samples")
    ax.set_title("Gap Count Distribution Across Dataset", fontsize=12, fontweight="bold")
    ax.set_xticks(x)
    plt.tight_layout()
    plt.savefig(os.path.join(CHARTS, "gap_count_dist.png"), dpi=200)
    plt.close()

    print("  Charts generated ✓")


# ══════════════════════════════════════════════════════════════════════
# BUILD UPDATED REPORT
# ══════════════════════════════════════════════════════════════════════

def build_report():
    doc = Document(SRC)

    # ── locate insertion point: after Section 6 (Dataset Generation) ─
    # We'll find the paragraph index of the *next* Heading 1 after "Dataset"
    insert_after_heading = None
    section_6_end = None
    headings_1 = []

    for i, p in enumerate(doc.paragraphs):
        if p.style.name == "Heading 1":
            headings_1.append((i, p.text.strip()))

    # Find Section 6 "Dataset Generation" and the section after it
    for idx, (pi, title) in enumerate(headings_1):
        if "dataset" in title.lower() or "6" in title.split(".")[0]:
            # Section after dataset section
            if idx + 1 < len(headings_1):
                section_6_end = headings_1[idx + 1][0]
            break

    if section_6_end is None:
        print("ERROR: Could not locate Dataset Generation section boundary")
        return

    print(f"  Inserting new sections before paragraph index {section_6_end}")

    # ──────────────────────────────────────────────────────────────────
    # Strategy: We insert new content at section_6_end by adding
    # paragraphs to the document body XML at the right position.
    # python-docx doesn't have a native insert-at-index, so we
    # manipulate the XML body directly.
    # ──────────────────────────────────────────────────────────────────

    body = doc.element.body
    # Get the XML element for paragraph at section_6_end
    ref_element = doc.paragraphs[section_6_end]._element

    # Helper: insert a paragraph element before ref_element
    def insert_heading(text, level=1):
        nonlocal ref_element
        style_id = f'Heading{level}'  # no space: Heading1, Heading2
        p = parse_xml(
            f'<w:p {nsdecls("w")}>'
            f'  <w:pPr><w:pStyle w:val="{style_id}"/></w:pPr>'
            f'  <w:r><w:t xml:space="preserve">{_escape(text)}</w:t></w:r>'
            f'</w:p>'
        )
        body.insert(list(body).index(ref_element), p)
        return p

    def insert_para(text, bold=False, style="Normal"):
        nonlocal ref_element
        bold_xml = "<w:b/>" if bold else ""
        p = parse_xml(
            f'<w:p {nsdecls("w")}>'
            f'  <w:pPr><w:pStyle w:val="{style}"/></w:pPr>'
            f'  <w:r><w:rPr>{bold_xml}</w:rPr>'
            f'    <w:t xml:space="preserve">{_escape(text)}</w:t>'
            f'  </w:r>'
            f'</w:p>'
        )
        body.insert(list(body).index(ref_element), p)
        return p

    def insert_bullet(text):
        return insert_para(text, style="ListBullet")

    def insert_image(path, width=5.5):
        """Insert an image as a new paragraph with an inline picture."""
        nonlocal ref_element
        # Create a temporary paragraph in the doc, add picture, then move it
        temp_para = doc.add_paragraph()
        run = temp_para.add_run()
        run.add_picture(path, width=Inches(width))
        # Move the paragraph element before ref_element
        body.insert(list(body).index(ref_element), temp_para._element)
        return temp_para

    def insert_table(headers, rows):
        """Insert a table before ref_element."""
        nonlocal ref_element
        tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
        tbl.style = "Table Grid"
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        hdr = tbl.rows[0]
        for i, h in enumerate(headers):
            hdr.cells[i].text = h
            for p in hdr.cells[i].paragraphs:
                for r in p.runs:
                    r.bold = True
                    r.font.size = Pt(9)
        shade_cells(hdr, "2E75B6")
        for cell in hdr.cells:
            for p in cell.paragraphs:
                for r in p.runs:
                    r.font.color.rgb = RGBColor(255, 255, 255)
        for ri, row_data in enumerate(rows):
            row = tbl.rows[ri + 1]
            for ci, val in enumerate(row_data):
                row.cells[ci].text = str(val)
                for p in row.cells[ci].paragraphs:
                    for r in p.runs:
                        r.font.size = Pt(9)
            if ri % 2 == 1:
                shade_cells(row, "EDF2F9")
        # Move table element before ref
        body.insert(list(body).index(ref_element), tbl._tbl)
        return tbl

    # ══════════════════════════════════════════════════════════════════
    # SECTION A: Dataset Collection Methodology (detailed)
    # ══════════════════════════════════════════════════════════════════

    insert_heading("Dataset Collection Methodology", 1)

    insert_heading("Overview", 2)
    insert_para(
        "The training dataset was generated programmatically using Google Gemini 2.0 Flash API, "
        "a large language model capable of producing realistic, domain-specific policy text. "
        "The generation process was designed to create diverse, labeled policy excerpts that "
        "simulate real-world organizational security policy documents in both Arabic and English."
    )

    insert_heading("Generation Pipeline", 2)
    insert_para(
        "The dataset generation follows a structured pipeline built in the "
        "generate_compliance_dataset.py script:"
    )
    insert_bullet(
        "Step 1 — Gap Definition: 16 compliance gaps were formally defined, each mapped to "
        "NCA ECC-2:2024 and ISO 27001:2022 controls. Each gap includes a description, severity "
        "weight (2–4), compliant criteria, and non-compliant examples."
    )
    insert_bullet(
        "Step 2 — Sample Profile Design: 13 distinct sample profiles were created spanning "
        "four compliance tiers: Compliant (0 gaps, ~25%), Minor partial compliance (1–2 gaps, ~20%), "
        "Moderate partial compliance (3–5 gaps, ~20%), Severe non-compliance (6+ gaps, ~20%), "
        "and Critical non-compliance (12–16 gaps, ~15%). Each profile specifies which domain(s) "
        "to cover and the gap count range."
    )
    insert_bullet(
        "Step 3 — Prompt Engineering: For each sample, a detailed prompt is constructed that "
        "instructs Gemini to generate a realistic policy excerpt of 200–400 words. The prompt "
        "specifies which gaps to include, the language (English or Arabic), the compliance level, "
        "and domain context. The prompt is carefully designed to avoid mentioning gap IDs in the "
        "generated text, ensuring the model learns from policy content rather than labels."
    )
    insert_bullet(
        "Step 4 — API Call and Response Parsing: The Gemini API is called with structured output "
        "format (JSON), receiving the policy text along with 16 binary gap labels, a compliance "
        "score (0.0–1.0), and the compliance level. Rate limiting and retry logic handle API "
        "quota constraints (15 RPM for Gemini 2.0 Flash free tier)."
    )
    insert_bullet(
        "Step 5 — Validation and Storage: Each generated sample is validated for correct JSON "
        "structure, gap label completeness (all 16 labels present), and language consistency. "
        "Valid samples are saved in CSV, JSON, and JSONL formats for flexibility."
    )

    insert_heading("Dataset Statistics", 2)
    insert_para(
        "The final dataset contains 260 labeled samples with the following distribution:"
    )
    insert_table(
        ["Metric", "Value"],
        [
            ["Total Samples", "260"],
            ["English Samples", "130 (50%)"],
            ["Arabic Samples", "130 (50%)"],
            ["Compliant Samples", "48 (18.5%)"],
            ["Partially Compliant Samples", "92 (35.4%)"],
            ["Non-Compliant Samples", "120 (46.2%)"],
            ["Average Gaps per Sample", "5.05"],
            ["Average Compliance Score", "0.68"],
            ["Password Policy Only", "89 samples"],
            ["Risk Assessment Only", "79 samples"],
            ["Both Domains", "92 samples"],
        ],
    )
    insert_para("")  # spacer

    insert_para("Figure: Compliance Distribution", bold=True)
    insert_image(os.path.join(CHARTS, "compliance_dist.png"), width=4.5)

    insert_para("")
    insert_para("Figure: Language Distribution", bold=True)
    insert_image(os.path.join(CHARTS, "language_dist.png"), width=4.0)

    insert_para("")
    insert_para("Figure: Domain Coverage", bold=True)
    insert_image(os.path.join(CHARTS, "domain_coverage.png"), width=4.5)

    insert_heading("Gap Label Definitions", 2)
    insert_para(
        "Each of the 16 gap labels is mapped to specific NCA ECC-2:2024 and ISO 27001:2022 "
        "controls. The following table lists all gap definitions:"
    )
    insert_table(
        ["Gap ID", "Description", "Severity", "ECC Control", "ISO Control"],
        [
            ["GAP_PP_001", "Weak password complexity requirements", "3", "2-2-3-1", "5.17"],
            ["GAP_PP_002", "Inadequate password expiration policy", "2", "2-2-3-1", "5.17"],
            ["GAP_PP_003", "Weak account lockout policy", "2", "2-2-3-1", "8.5"],
            ["GAP_PP_004", "Missing MFA requirements", "4 (Critical)", "2-2-3-2", "8.5"],
            ["GAP_PP_005", "Missing Privileged Access Management", "4 (Critical)", "2-2-3-4", "8.2"],
            ["GAP_PP_006", "Missing password encryption/storage", "3", "2-2-3-1", "8.5"],
            ["GAP_PP_007", "Missing periodic review schedule", "2", "2-2-3-5", "5.15"],
            ["GAP_PP_008", "Missing roles and responsibilities", "2", "2-2-3-5", "5.15"],
            ["GAP_RA_001", "Missing documented risk methodology", "4 (Critical)", "1-5-1", "6.1.2"],
            ["GAP_RA_002", "Missing risk identification procedures", "3", "1-5-2", "6.1.2"],
            ["GAP_RA_003", "Missing likelihood/impact scales", "3", "1-5-2", "6.1.2"],
            ["GAP_RA_004", "Missing risk treatment options", "3", "1-5-2", "6.1.3"],
            ["GAP_RA_005", "Missing mandatory risk assessment triggers", "4 (Critical)", "1-5-3", "8.2"],
            ["GAP_RA_006", "Missing risk register requirements", "2", "1-5-2", "6.1.2"],
            ["GAP_RA_007", "Missing periodic review schedule", "2", "1-5-4", "8.2"],
            ["GAP_RA_008", "Missing PM integration", "2", "1-5-3", "8.2"],
        ],
    )
    insert_para("")
    insert_para("Figure: Gap Label Frequency in Dataset", bold=True)
    insert_image(os.path.join(CHARTS, "gap_frequency.png"), width=5.5)

    insert_heading("How to Extend the Dataset", 2)
    insert_para(
        "The dataset generation system is designed for incremental expansion. "
        "To add new samples or cover additional policy domains:"
    )
    insert_bullet(
        "1. Define New Gaps: Add new gap definitions to GAP_DEFINITIONS in "
        "generate_compliance_dataset.py. Each gap requires a description, domain, "
        "ECC/ISO control mapping, severity weight, compliant criteria, and non-compliant example."
    )
    insert_bullet(
        "2. Create Sample Profiles: Add new entries to SAMPLE_PROFILES specifying "
        "the domain(s), gap range, and target compliance level."
    )
    insert_bullet(
        "3. Run the Generator: Execute python generate_compliance_dataset.py "
        "which will generate new samples via the Gemini API and append them to the "
        "existing dataset files (CSV, JSON, JSONL)."
    )
    insert_bullet(
        "4. Validate: The script automatically validates each sample for JSON "
        "structure, label completeness, and content quality."
    )
    insert_para(
        "The incremental generation system supports adding samples without re-generating "
        "existing ones, preserving dataset consistency across iterations."
    )

    # ══════════════════════════════════════════════════════════════════
    # SECTION B: Training Challenges & Methodology Evolution
    # ══════════════════════════════════════════════════════════════════

    insert_heading("Training Challenges and Methodology Evolution", 1)

    insert_heading("Initial Approach: Single-Label Classification per Domain", 2)
    insert_para(
        "The initial training approach treated compliance assessment as a single-label "
        "classification problem. Two separate models were planned — one for Password Policy "
        "compliance and one for Risk Assessment compliance — each classifying a document into "
        "three categories: Compliant, Partially Compliant, or Non-Compliant."
    )
    insert_para(
        "This approach used the standard BertForSequenceClassification architecture with "
        "3 output classes and a softmax activation, trained independently on domain-specific data."
    )

    insert_heading("Challenges with the Initial Approach", 2)
    insert_bullet(
        "Limited Granularity: A single compliance label per document could not "
        "identify which specific controls were missing. Users received a compliance "
        "level but no actionable remediation guidance."
    )
    insert_bullet(
        "Domain Isolation: Maintaining two separate models doubled the infrastructure "
        "complexity and prevented cross-domain learning. A document covering both "
        "password policy and risk assessment required two separate API calls."
    )
    insert_bullet(
        "No Gap-Level Detail: The three-class output could not distinguish between "
        "a document missing MFA requirements (critical, severity 4) versus one "
        "missing a periodic review schedule (low priority, severity 2). Both might "
        "receive the same 'Partially Compliant' label."
    )
    insert_bullet(
        "Inflexibility: Adding a new compliance domain (e.g., Access Control, "
        "Incident Response) would require training an entirely new model from scratch."
    )

    insert_heading("Revised Approach: Multi-Label Gap Detection", 2)
    insert_para(
        "The methodology was fundamentally redesigned to a multi-label gap detection approach. "
        "Instead of classifying documents into compliance tiers, the model identifies specific "
        "compliance gaps at a granular level across all domains simultaneously."
    )
    insert_para("Key architectural changes:")
    insert_bullet(
        "Unified Model: A single mBERT backbone serves both Password Policy and "
        "Risk Assessment domains, with a shared representation layer that enables "
        "cross-domain learning."
    )
    insert_bullet(
        "16 Sigmoid Outputs: The classification head was replaced with a multi-label "
        "head producing 16 independent sigmoid outputs (one per gap). Each output "
        "represents the probability that a specific gap exists, allowing multiple gaps "
        "to be detected simultaneously."
    )
    insert_bullet(
        "Custom Architecture: The classification head uses a two-layer MLP "
        "(768 → 256 → 16) with ReLU activation and 30% dropout, replacing the "
        "standard single-layer BertForSequenceClassification head."
    )
    insert_bullet(
        "BCEWithLogitsLoss: The loss function changed from CrossEntropyLoss "
        "(suitable for single-label) to Binary Cross-Entropy with Logits "
        "(suitable for multi-label), treating each gap as an independent binary "
        "classification problem."
    )
    insert_bullet(
        "Document Chunking: Since real-world policy documents can exceed BERT's "
        "512-token limit, a chunking strategy was implemented: documents are split "
        "into 350-word overlapping chunks, each chunk is independently classified, "
        "and gap probabilities are aggregated across chunks via max-pooling."
    )

    insert_heading("Benefits of the New Approach", 2)
    insert_table(
        ["Aspect", "Old Approach (Single-Label)", "New Approach (Multi-Label)"],
        [
            ["Output", "3 classes (Compliant/Partial/Non)", "16 specific gaps with confidence"],
            ["Domains", "Separate model per domain", "Single unified model"],
            ["Granularity", "Document-level only", "Gap-level with severity weights"],
            ["Actionability", "Generic compliance label", "Specific remediation per gap"],
            ["Scoring", "Fixed categories", "Weighted severity-based score (0.0–1.0)"],
            ["Extensibility", "New model per domain", "Add gaps to existing model"],
            ["Documents > 512 tokens", "Truncated", "Chunking with overlap"],
        ],
    )

    insert_para("")
    insert_para("Figure: Training Loss Curve", bold=True)
    insert_image(os.path.join(CHARTS, "training_loss.png"), width=4.5)

    insert_heading("How to Retrain the Model", 2)
    insert_para(
        "After extending the dataset with new samples, the model can be retrained using "
        "the model_building.ipynb Jupyter notebook. The retraining process involves:"
    )
    insert_bullet(
        "1. Load the updated dataset (CSV or JSON) with the new samples."
    )
    insert_bullet(
        "2. The notebook handles tokenization using bert-base-multilingual-cased "
        "tokenizer (vocabulary size: 119,547 tokens supporting 104 languages)."
    )
    insert_bullet(
        "3. Training uses AdamW optimizer with a learning rate of 2e-5, linear "
        "warmup schedule, and early stopping (patience=2) to prevent overfitting."
    )
    insert_bullet(
        "4. The trained model weights (model.safetensors) and configuration are "
        "exported to the policy_gap_detector/ directory."
    )
    insert_bullet(
        "5. Upload the new model to Google Cloud Storage (GCS) bucket for "
        "deployment. The Cloud Run service automatically downloads the latest model on startup."
    )

    # ══════════════════════════════════════════════════════════════════
    # SECTION C: Testing & Validation Results
    # ══════════════════════════════════════════════════════════════════

    insert_heading("Testing and Validation Results", 1)

    insert_heading("Model Performance Metrics", 2)
    insert_para(
        "The model was evaluated on a held-out validation set (20% of the dataset, 52 samples). "
        "The following metrics were recorded:"
    )
    insert_table(
        ["Metric", "Value"],
        [
            ["Validation Accuracy", "79.31%"],
            ["Validation Loss", "0.6318"],
            ["Training Steps", "101"],
            ["Training Loss (final)", "0.52"],
            ["Total FLOPs", "1.06 × 10¹⁴"],
        ],
    )

    insert_para("")
    insert_para("Figure: Gap Count Distribution in Dataset", bold=True)
    insert_image(os.path.join(CHARTS, "gap_count_dist.png"), width=5.0)

    insert_heading("Test Case 1: Compliant Password Policy (English)", 2)
    insert_para(
        "A comprehensive password policy was submitted that addresses all ECC 2-2 requirements:"
    )
    insert_para(
        "Input: \"Passwords must be at least 12 characters with uppercase, lowercase, digits, "
        "and special characters. Passwords expire every 90 days with 12-password history. "
        "Accounts lock after 5 failed attempts for 30 min. MFA is mandatory for remote and "
        "privileged access. PAM enforces JIT access and session recording. Passwords hashed "
        "with Argon2/bcrypt. Policy reviewed quarterly by CISO. CISO owns policy, IT Security "
        "implements, HR handles onboarding, all employees must comply.\"",
        bold=False,
    )
    insert_table(
        ["Field", "Expected Result"],
        [
            ["Overall Compliance", "Compliant"],
            ["Overall Score", "High (close to 1.0)"],
            ["Gap Count", "0 or very few"],
            ["Domains Detected", "password_policy"],
            ["Password Policy Score", "High"],
            ["Rationale", "Policy covers complexity, expiration, lockout, MFA, PAM, encryption, review, roles"],
        ],
    )
    insert_para(
        "This test validates that the model correctly identifies a policy that comprehensively "
        "addresses all eight Password Policy gaps (GAP_PP_001 through GAP_PP_008)."
    )

    insert_heading("Test Case 2: Non-Compliant Policy (English)", 2)
    insert_para(
        "A minimal, vague policy was submitted that lacks almost all required controls:"
    )
    insert_para(
        "Input: \"Users should choose passwords. No specific requirements.\"",
        bold=False,
    )
    insert_table(
        ["Field", "Expected Result"],
        [
            ["Overall Compliance", "Non-Compliant"],
            ["Overall Score", "Low (close to 0.0)"],
            ["Gap Count", "Multiple (6+)"],
            ["Domains Detected", "password_policy"],
            ["Gaps Detected", "GAP_PP_001–008 (most or all)"],
            ["Rationale", "No complexity, expiration, lockout, MFA, PAM, encryption, review, or roles defined"],
        ],
    )
    insert_para(
        "This test confirms the model can detect multiple simultaneous gaps in a severely "
        "deficient policy document."
    )

    insert_heading("Test Case 3: Arabic Policy Document", 2)
    insert_para(
        "A bilingual Arabic policy was submitted to verify multilingual capability:"
    )
    insert_para(
        "Input: \"يجب أن تتكون كلمة المرور من 12 حرفاً على الأقل مع أحرف كبيرة وصغيرة "
        "وأرقام ورموز. تنتهي صلاحية كلمة المرور كل 90 يوماً.\"",
        bold=False,
    )
    insert_table(
        ["Field", "Expected Result"],
        [
            ["Overall Compliance", "Partially Compliant"],
            ["Domains Detected", "password_policy"],
            ["PP Gaps Present", "Missing MFA, PAM, lockout, encryption, review, roles"],
            ["PP Gaps Absent", "Complexity ✓, Expiration ✓"],
            ["Rationale", "Policy defines complexity and expiration but omits other controls"],
        ],
    )
    insert_para(
        "This test validates the model's ability to process Arabic text and correctly "
        "identify both present and missing compliance controls."
    )

    insert_heading("Test Case 4: Mixed Partial Compliance", 2)
    insert_para(
        "A policy with some controls but critical omissions was tested:"
    )
    insert_para(
        "Input: \"Password policy: minimum 8 characters. No MFA required. "
        "No risk assessment performed.\"",
        bold=False,
    )
    insert_table(
        ["Field", "Expected Result"],
        [
            ["Overall Compliance", "Non-Compliant or Partially Compliant"],
            ["Gap Count", "Multiple gaps detected"],
            ["Domain Detection", "password_policy (risk_assessment requires 2+ keyword matches)"],
            ["Key Gaps", "GAP_PP_001 (weak complexity), GAP_PP_004 (missing MFA)"],
            ["Rationale", "8-char minimum is below recommended 12; MFA explicitly absent"],
        ],
    )

    insert_heading("API Response Structure", 2)
    insert_para(
        "Each analysis request returns a structured JSON response with the following fields:"
    )
    insert_table(
        ["Field", "Type", "Description"],
        [
            ["overall_compliance", "string", "compliant / partially_compliant / non_compliant"],
            ["overall_score", "float", "Weighted severity score, 0.0 (worst) to 1.0 (best)"],
            ["gap_count", "integer", "Total number of detected gaps across all domains"],
            ["num_chunks", "integer", "Number of document chunks processed"],
            ["inference_time_ms", "float", "Processing time in milliseconds"],
            ["domains_detected", "list", "Detected policy domains via keyword heuristic"],
            ["password_policy", "object", "Domain-level report with gaps, score, details"],
            ["risk_assessment", "object", "Domain-level report with gaps, score, details"],
            ["all_gap_probabilities", "object", "16 gap confidence values (0.0–1.0 each)"],
        ],
    )

    insert_heading("Scoring Methodology", 2)
    insert_para(
        "The overall compliance score is calculated using severity-weighted penalties:"
    )
    insert_bullet(
        "Each gap has a severity weight: Critical (4), High (3), or Medium (2)."
    )
    insert_bullet(
        "Penalty = Σ (severity_weight × gap_probability) for detected gaps."
    )
    insert_bullet(
        "Score = max(0, 1 − penalty / total_severity_weight)."
    )
    insert_bullet(
        "Compliance level: 0 gaps = Compliant; 1–5 gaps = Partially Compliant; 6+ gaps = Non-Compliant."
    )
    insert_para(
        "This scoring ensures that critical gaps (e.g., missing MFA with severity 4) "
        "impact the score more heavily than lower-priority gaps (e.g., missing periodic review "
        "with severity 2)."
    )

    # ── save ──────────────────────────────────────────────────────────
    doc.save(DST)
    print(f"  Report saved to: {DST}")


def _escape(text):
    """Escape XML special characters."""
    return (
        text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("1. Generating charts...")
    generate_charts()
    print("2. Building updated report...")
    build_report()
    print("Done ✓")
