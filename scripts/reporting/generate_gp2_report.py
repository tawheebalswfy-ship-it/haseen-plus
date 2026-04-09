"""
Generate Graduation Project 2 Report — Word Document
AI-Powered Compliance Guard for Adherence with Cybersecurity
Authority Regulations in Saudi Arabia  (AICG)

Matches GP1 report format exactly (same structure, styling, chapter layout).
"""

from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PATH = os.fspath(REPO_ROOT / "docs" / "reports" / "GP2_Report_AICG_v4.docx")
UQU_LOGO = os.fspath(REPO_ROOT / "artifacts" / "gp1-images" / "page1_img1.png")
AICG_LOGO = os.fspath(REPO_ROOT / "artifacts" / "gp1-images" / "page1_img2.png")
REPORT_ASSET_DIR = os.fspath(REPO_ROOT / "artifacts" / "report-assets")
CHART_DIR = os.fspath(REPO_ROOT / "artifacts" / "report_charts")

STUDENTS = [
    ("Sabah Alanazi",   "44411937"),
    ("Aryaf Albishri",  "444002124"),
    ("Meaad Alzahrani", "444000681"),
    ("Weaam Alzahrani", "444001190"),
]
SUPERVISOR       = "Dr. Yasmeen J. Rashidi"
SUPERVISOR_EMAIL = "yjrashidi@uqu.edu.sa"
PROJECT_ID       = "S E C - 4 7 1 - P 2 - F12"
COURSE           = "SEC 3108"
DATE_STR         = "March 31, 2026"
TITLE = ("AI-Powered Compliance Guard for Adherence with "
         "Cybersecurity Authority Regulations in Saudi Arabia")
SHORT = "AICG"

FIGURE_ASSETS = {
    "Figure 3.1: High-Level System Architecture": os.path.join(REPORT_ASSET_DIR, "fig_3_1_system_architecture.png"),
    "Figure 3.2: ML Pipeline Workflow": os.path.join(REPORT_ASSET_DIR, "fig_3_2_ml_pipeline.png"),
    "Figure 3.3: Model Classification Head Architecture": os.path.join(REPORT_ASSET_DIR, "fig_3_3_model_classification_head.png"),
    "Figure 3.4: Document Chunking & Aggregation Pipeline": os.path.join(REPORT_ASSET_DIR, "fig_3_4_chunking_aggregation_pipeline.png"),
    "Figure 3.5: Sequence Diagram \u2014 Policy Classification": os.path.join(REPORT_ASSET_DIR, "fig_3_5_sequence_policy_classification.png"),
    "Figure 3.6: Sequence Diagram \u2014 Authentication": os.path.join(REPORT_ASSET_DIR, "fig_3_5b_sequence_authentication.png"),
    "Figure 3.7: Sequence Diagram \u2014 Assessment & Gap Analysis": os.path.join(REPORT_ASSET_DIR, "fig_3_5c_sequence_assessment_gap.png"),
    "Figure 3.8: Class / Component Diagram": os.path.join(REPORT_ASSET_DIR, "fig_3_6_class_diagram.png"),
    "Figure 3.9: Data Flow Diagram (Context)": os.path.join(REPORT_ASSET_DIR, "fig_3_7_dfd.png"),
    "Figure 3.9b: Data Flow Diagram (Level 1)": os.path.join(REPORT_ASSET_DIR, "fig_3_8_dfd_level_1.png"),
    "Figure 3.10: Activity & State Diagrams": os.path.join(REPORT_ASSET_DIR, "fig_3_9_activity_policy_assessment.png"),
    "Figure 3.11: Deployment Architecture (Google Cloud Run)": os.path.join(REPORT_ASSET_DIR, "fig_3_10_deployment_architecture.png"),
    "Figure 3.12: Database Entity-Relationship Diagram": os.path.join(REPORT_ASSET_DIR, "fig_3_11_database_erd.png"),
    "Figure 3.13: Use Case Diagram": os.path.join(REPORT_ASSET_DIR, "fig_3_12_use_case_diagram.png"),
    "Figure 3.14: Landing Page": os.path.join(REPORT_ASSET_DIR, "fig_3_13_landing_page.png"),
    "Figure 3.15: Sign In / Sign Up": os.path.join(REPORT_ASSET_DIR, "fig_3_14_sign_in.png"),
    "Figure 3.16: Dashboard Overview": os.path.join(REPORT_ASSET_DIR, "fig_3_15_dashboard_overview.png"),
    "Figure 3.17: Policy Upload & Analysis": os.path.join(REPORT_ASSET_DIR, "fig_3_16_policy_upload_analysis.png"),
    "Figure 3.18: Analysis Result \u2014 Compliant Document": os.path.join(REPORT_ASSET_DIR, "fig_3_17_analysis_compliant.png"),
    "Figure 3.19: Analysis Result \u2014 Non-Compliant Document": os.path.join(REPORT_ASSET_DIR, "fig_3_18_analysis_non_compliant.png"),
    "Figure 3.20: Assessments Page": os.path.join(REPORT_ASSET_DIR, "fig_3_19_assessments.png"),
    "Figure 3.21: Remediation Tasks": os.path.join(REPORT_ASSET_DIR, "fig_3_20_remediation.png"),
    "Figure 3.22: Framework Comparison": os.path.join(REPORT_ASSET_DIR, "fig_3_21_framework.png"),
    "Figure 3.23: Risk Dashboard": os.path.join(REPORT_ASSET_DIR, "fig_3_22_risk.png"),
    "Figure 3.24: Arabic RTL Interface": os.path.join(REPORT_ASSET_DIR, "fig_3_23_arabic_rtl.png"),
    "Figure 4.1: Dataset Distribution Overview": os.path.join(CHART_DIR, "dataset_distribution_overview.png"),
    "Figure 4.2: Training Progress (Enhanced)": os.path.join(CHART_DIR, "training_curves.png"),
    "Figure 4.3: Per-Gap Precision / Recall / F1 (Test Set)": os.path.join(CHART_DIR, "per_gap_performance.png"),
    "Figure 4.4: ROC Curves (Test Set)": os.path.join(CHART_DIR, "roc_curves.png"),
    "Figure 4.5: Domain-Level Performance Comparison": os.path.join(CHART_DIR, "domain_radar.png"),
    "Figure 4.6: Multi-Label Confusion Matrix": os.path.join(CHART_DIR, "confusion_heatmap.png"),
    "Figure 4.7: Gap Count Distribution per Sample": os.path.join(CHART_DIR, "gap_count_distribution.png"),
    "Figure 4.8: Analysis Result \u2014 Compliant Document (High Score)": os.path.join(REPORT_ASSET_DIR, "fig_3_17_analysis_compliant.png"),
    "Figure 4.9: Analysis Result \u2014 Non-Compliant Document (Low Score)": os.path.join(REPORT_ASSET_DIR, "fig_3_18_analysis_non_compliant.png"),
}

# ── helpers ──────────────────────────────────────────────────────────
def _shade(cell, color):
    tc = cell._element.get_or_add_tcPr()
    sh = tc.makeelement(qn("w:shd"),
            {qn("w:fill"): color, qn("w:val"): "clear"})
    tc.append(sh)

def _table(doc, hdrs, rows):
    t = doc.add_table(rows=1+len(rows), cols=len(hdrs))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(hdrs):
        c = t.rows[0].cells[i]; c.text = h
        _shade(c, "000000")
        for p in c.paragraphs:
            for r in p.runs:
                r.bold = True; r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(255,255,255)
    for ri, rd in enumerate(rows):
        for ci, v in enumerate(rd):
            c = t.rows[ri+1].cells[ci]; c.text = str(v)
            for p in c.paragraphs:
                for r in p.runs: r.font.size = Pt(9)
    return t

def _h(doc, txt, lvl=1):   doc.add_heading(txt, level=lvl)
def _p(doc, txt):           return doc.add_paragraph(txt)
def _b(doc, txt, lvl=0):
    p = doc.add_paragraph(txt, style="List Bullet")
    if lvl: p.paragraph_format.left_indent = Cm(1.5*lvl)
    return p

def _center(doc, txt, sz=11, bold=False):
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(txt); r.font.size = Pt(sz); r.bold = bold
    return p

def _fig(doc, caption, width=Inches(6.0)):
    """Insert a report figure if available, otherwise keep the placeholder."""
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    asset_path = FIGURE_ASSETS.get(caption)
    if asset_path and os.path.exists(asset_path):
        p.add_run().add_picture(asset_path, width=width)
    else:
        r = p.add_run("[  Insert Screenshot Here  ]")
        r.font.size = Pt(11); r.font.color.rgb = RGBColor(120,120,120); r.italic = True
    c = doc.add_paragraph(); c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = c.add_run(caption); r2.bold = True; r2.font.size = Pt(9)

def _pb(doc): doc.add_page_break()

def _insert_toc(doc):
    """Insert a static Table of Contents built from the known report structure."""
    toc_entries = [
        (1, "1  Introduction"),
        (2, "1.1  Background"),
        (2, "1.2  Problem Definition & Objectives"),
        (2, "1.3  Project Contribution"),
        (2, "1.4  Structure of the Project"),
        (1, "2  Literature Review or Related Work"),
        (2, "2.1  Summary and Comparison of Studies"),
        (1, "3  Solution Approach / Methodology"),
        (2, "3.1  Overall Approach"),
        (2, "3.2  Methodology Details"),
        (3, "3.2.1  Technology Stack"),
        (3, "3.2.2  Data Collection"),
        (3, "3.2.3  AI Model Development"),
        (3, "3.2.4  Backend API Development"),
        (3, "3.2.5  Frontend Web Application"),
        (3, "3.2.6  Database Design"),
        (2, "3.3  System Modeling Diagrams"),
        (2, "3.4  Operational Logic & Scenarios"),
        (2, "3.5  Prototype Design"),
        (2, "3.6  Security & Privacy Threat Modeling"),
        (1, "4  Testing and Evaluation"),
        (2, "4.1  Dataset Analysis"),
        (2, "4.2  Model Training Results"),
        (2, "4.3  Test Set Evaluation"),
        (2, "4.4  Model Inference Testing"),
        (2, "4.5  API Testing"),
        (2, "4.6  Performance Metrics"),
        (2, "4.7  Compliance Score Validation"),
        (2, "4.8  Usability Evaluation"),
        (1, "5  Conclusion"),
        (2, "5.1  Summary of Achievements in Graduation Project 2"),
        (2, "5.2  Key Findings"),
        (2, "5.3  Challenges Encountered"),
        (2, "5.4  Lessons Learned"),
        (2, "5.5  Future Work"),
        (2, "5.6  Final Summary"),
        (1, "References"),
    ]

    indent_map = {1: Inches(0), 2: Inches(0.4), 3: Inches(0.8)}
    font_map  = {1: (True, Pt(12)), 2: (False, Pt(11)), 3: (False, Pt(10))}

    for lvl, title in toc_entries:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = indent_map[lvl]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        bold, size = font_map[lvl]
        r = p.add_run(title)
        r.font.name = "Times New Roman"
        r.font.size = size
        r.bold = bold

# ── build ────────────────────────────────────────────────────────────
def build():
    doc = Document()
    sty = doc.styles["Normal"]; sty.font.name = "Times New Roman"; sty.font.size = Pt(12)
    # Force all heading levels to black (match GP1 LaTeX style)
    for lvl in range(1, 4):
        hs = doc.styles[f"Heading {lvl}"]
        hs.font.color.rgb = RGBColor(0, 0, 0)
        hs.font.name = "Times New Roman"
    for sec in doc.sections:
        sec.top_margin = sec.bottom_margin = sec.left_margin = sec.right_margin = Cm(2.54)

    # ════════════════════════════════════════════════════════════════
    #  TITLE PAGE  (mirrors GP1 exactly)
    # ════════════════════════════════════════════════════════════════
    doc.add_paragraph()
    # University logo (centered)
    if os.path.exists(UQU_LOGO):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(UQU_LOGO, width=Inches(1.8))
    doc.add_paragraph()
    _center(doc, "College of Computing\nCybersecurity Department", 14, True)
    doc.add_paragraph()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Project Report"); r.font.size = Pt(12); r.font.small_caps = True
    doc.add_paragraph()
    _center(doc, TITLE, 20, True)
    # AICG project logo
    if os.path.exists(AICG_LOGO):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(AICG_LOGO, width=Inches(2.0))
    doc.add_paragraph()
    _center(doc, COURSE, 14, True)
    doc.add_paragraph()
    _center(doc, "Submitted by", 12, True)
    for n, sid in STUDENTS:
        _center(doc, f"Student Name: {n}    ID: {sid}", 11)
    _pb(doc)

    # supervisor page
    for _ in range(6): doc.add_paragraph()
    _center(doc, f"Project Supervisor: {SUPERVISOR}", 12, True)
    _center(doc, f"Project ID: {PROJECT_ID}", 12, True)
    _center(doc, DATE_STR, 11)
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  CONTACT INFORMATION
    # ════════════════════════════════════════════════════════════════
    _h(doc, "Contact Information")
    _p(doc,
        "This project report is submitted to the Department of Cybersecurity at Umm "
        "Al-Qura University in partial fulfillment of the requirements for the degree "
        "of Bachelor of Science in Cybersecurity.")
    _h(doc, "Author(s):", 3)
    for n, sid in STUDENTS:
        _p(doc, f"Name: {n}"); _p(doc, f"Email: {sid}@uqu.edu.sa"); doc.add_paragraph()
    _h(doc, "University Supervisor(s):", 3)
    _p(doc, f"Name: {SUPERVISOR}"); _p(doc, f"Email: {SUPERVISOR_EMAIL}")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  IP DECLARATION
    # ════════════════════════════════════════════════════════════════
    _h(doc, "Intellectual Property Right Declaration")
    _p(doc,
        f'This is to declare that the work under the supervision of {SUPERVISOR}, '
        f'having the title \u201c{TITLE}\u201d and carried out in partial fulfillment '
        'of the requirements for the Bachelor of Science in Cybersecurity, is the sole '
        'property of Umm Al-Qura University and the respective supervisor. It is '
        'protected under intellectual property laws and conventions, and may only be '
        'used or extended with written permission from the University and supervisor.')
    _p(doc, "This declaration applies to all students and faculty members.")
    _p(doc, f"Date: {DATE_STR}")
    _h(doc, "Author(s):", 3)
    for n, sid in STUDENTS:
        _p(doc, f"Name: {n}"); _p(doc, f"Email: s{sid}@uqu.edu.sa          Signature: _______________"); doc.add_paragraph()
    _h(doc, "University Supervisor(s):", 3)
    _p(doc, f"Name: {SUPERVISOR}"); _p(doc, f"Email: {SUPERVISOR_EMAIL}")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  ANTI-PLAGIARISM DECLARATION
    # ════════════════════════════════════════════════════════════════
    _h(doc, "Anti-Plagiarism Declaration")
    _p(doc,
        f'This is to declare that the publication produced under the supervision of '
        f'{SUPERVISOR}, titled \u201c{TITLE}\u201d is the original work of the '
        'author(s). No part of it has been reproduced illegally or plagiarized, and '
        'all referenced materials have been cited properly. The author(s) accept full '
        'responsibility for any proven violations of this declaration.')
    _p(doc, f"Date: {DATE_STR}")
    _h(doc, "Author(s):", 3)
    for n, sid in STUDENTS:
        _p(doc, f"Name: {n}"); _p(doc, f"Email: s{sid}@uqu.edu.sa          Signature: _______________"); doc.add_paragraph()
    _h(doc, "University Supervisor(s):", 3)
    _p(doc, f"Name: {SUPERVISOR}"); _p(doc, f"Email: {SUPERVISOR_EMAIL}")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  ACKNOWLEDGMENT
    # ════════════════════════════════════════════════════════════════
    _h(doc, "Acknowledgment")
    _p(doc,
        f"We express our deepest gratitude to our project supervisor, {SUPERVISOR}, "
        "for her invaluable guidance, expert insights, and continuous encouragement "
        f"throughout the development of the {SHORT}. We also extend our sincere "
        "appreciation to the Department of Cybersecurity at Umm Al-Qura University for "
        "providing the academic foundation and resources necessary to complete this "
        "project. Furthermore, we are grateful for the regulatory frameworks provided by "
        "the National Cybersecurity Authority (NCA), specifically the Essential "
        "Cybersecurity Controls (ECC), which served as the essential benchmark for our "
        "automated compliance system. Finally, we would like to thank our families and "
        "peers for their constant support and motivation during this journey toward "
        "enhancing the cybersecurity resilience of Saudi SMEs.")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  ABSTRACT
    # ════════════════════════════════════════════════════════════════
    _h(doc, "Abstract")
    _p(doc,
        "Building upon the design and architecture established in Graduation Project 1, "
        "this report documents the full implementation, deployment, and evaluation of the "
        f"{SHORT} platform \u2014 an AI-powered cybersecurity compliance system for Saudi "
        "SMEs. The implemented system comprises: (1) a custom bilingual compliance dataset "
        "of 891 samples generated via Google Gemini 2.5 Flash with automated quality "
        "verification; (2) a fine-tuned mDeBERTa-v3-base model with layer-wise learning rates "
        "and per-label threshold optimization for 16-label multi-label gap detection across "
        "Password Policy (ECC 2-2) and Risk Assessment (ECC 1-5) domains, achieving a test "
        "Macro F1 of 0.6037; (3) a FastAPI backend deployed on Google Cloud Run with document "
        "chunking and severity-weighted compliance scoring; (4) a React/TypeScript web "
        "application with bilingual (Arabic/English) support and a comprehensive compliance "
        "dashboard; and (5) a Supabase PostgreSQL database with row-level security. The "
        "platform accepts policy documents in PDF, DOCX, or plain text, analyzes them against "
        "NCA ECC controls, maps detected gaps to ISO 27001:2022 clauses, and provides "
        "actionable remediation guidance. The system achieves sub-second inference time and "
        "reduces manual audit effort from weeks to minutes.")
    _p(doc,
        "Keywords\u2014 NCA ECC, ISO 27001, Compliance Automation, NLP, mDeBERTa-v3, "
        "Multi-label Classification, Gap Detection, Saudi Arabia, Vision 2030.")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  TABLE OF CONTENTS
    # ════════════════════════════════════════════════════════════════
    _h(doc, "Contents")
    _insert_toc(doc)
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  LIST OF TABLES
    # ════════════════════════════════════════════════════════════════
    _h(doc, "List of Tables")
    lot = [
        ("2.1","Summary and Comparison of Studies (from GP1)"),
        ("3.1","Technology Stack"),
        ("3.2","Dataset Statistics"),
        ("3.3","Gap Labels \u2014 Password Policy (ECC 2-2)"),
        ("3.4","Gap Labels \u2014 Risk Assessment (ECC 1-5)"),
        ("3.5","Model Architecture Parameters"),
        ("3.6","API Endpoints"),
        ("3.7","Database Schema Summary"),
        ("3.8","Frontend Pages and Components"),
        ("3.9","Compliance Scoring Thresholds"),
        ("3.10","Threat Model and Security Controls"),
        ("3.11","STRIDE Threat Model & Mitigations"),
        ("4.1","Test Set Evaluation \u2014 Threshold Strategies"),
        ("4.2","Per-Gap Detection Metrics (Conservative Per-Label)"),
        ("4.3","Domain-Level Summary"),
        ("4.4","Test Case Results \u2014 Model Inference"),
        ("4.5","Test Case Results \u2014 API Endpoints"),
        ("4.6","Usability Evaluation Criteria"),
    ]
    for n, t in lot: _p(doc, f"Table {n}: {t}")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    #  LIST OF FIGURES
    # ════════════════════════════════════════════════════════════════
    _h(doc, "List of Figures")
    lof = [
        ("3.1","High-Level System Architecture"),
        ("3.2","ML Pipeline Workflow"),
        ("3.3","Model Classification Head"),
        ("3.4","Document Chunking & Aggregation Pipeline"),
        ("3.5","Sequence Diagram \u2014 Policy Classification"),
        ("3.6","Sequence Diagram \u2014 Authentication"),
        ("3.7","Sequence Diagram \u2014 Assessment & Gap Analysis"),
        ("3.8","Class / Component Diagram"),
        ("3.9","Data Flow Diagram"),
        ("3.10","Activity & State Diagrams"),
        ("3.11","Deployment Architecture"),
        ("3.12","Database Entity-Relationship Diagram"),
        ("3.13","Use Case Diagram"),
        ("3.14","Prototype \u2014 Landing Page"),
        ("3.15","Prototype \u2014 Sign In / Sign Up"),
        ("3.16","Prototype \u2014 Dashboard Overview"),
        ("3.17","Prototype \u2014 Policy Upload & Analysis"),
        ("3.18","Prototype \u2014 Analysis Result (Compliant)"),
        ("3.19","Prototype \u2014 Analysis Result (Non-Compliant)"),
        ("3.20","Prototype \u2014 Assessments Page"),
        ("3.21","Prototype \u2014 Remediation Tasks"),
        ("3.22","Prototype \u2014 Framework Comparison"),
        ("3.23","Prototype \u2014 Risk Dashboard"),
        ("3.24","Prototype \u2014 Arabic RTL Interface"),
        ("4.1","Dataset Distribution Overview"),
        ("4.2","Training Progress (Enhanced)"),
        ("4.3","Per-Gap Precision / Recall / F1 (Test Set)"),
        ("4.4","ROC Curves (Test Set)"),
        ("4.5","Domain-Level Performance Comparison"),
        ("4.6","Multi-Label Confusion Matrix"),
        ("4.7","Gap Count Distribution per Sample"),
        ("4.8","Analysis Result \u2014 Compliant Document (High Score)"),
        ("4.9","Analysis Result \u2014 Non-Compliant Document (Low Score)"),
    ]
    for n, t in lof: _p(doc, f"Figure {n}: {t}")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    # CHAPTER 1 — Introduction
    # ════════════════════════════════════════════════════════════════
    _h(doc, "1  Introduction")

    _h(doc, "1.1  Background", 2)
    _p(doc,
        "Currently, many organizations have amalgamated cyberspace solutions within their "
        "conventional business processes. The more a business integrates digital solutions "
        "and increases its online presence, the more it becomes vulnerable to cybersecurity "
        "threats. In Saudi Arabia, the National Cybersecurity Authority (NCA) issued the "
        "Essential Cybersecurity Controls (ECC), which is a regulatory framework to govern "
        "cybersecurity practices. Compliance with these controls is compulsory for all "
        "organizations operating IT systems in Saudi Arabia. Despite the availability of "
        "international standards such as ISO 27001, PCI DSS, and NIST frameworks, these "
        "remain generic solutions that often fail to address the unique operational contexts "
        "and resource constraints characteristic of Saudi SMEs.")
    _p(doc,
        f"Graduation Project 1 established the problem definition, literature review, "
        f"system design, and threat modeling for {SHORT}. This report documents Graduation "
        f"Project 2, covering the full implementation, deployment, testing, and evaluation "
        f"of the platform.")

    _h(doc, "1.2  Problem Definition & Objectives", 2)
    _p(doc,
        "Saudi SMEs manage their cybersecurity compliance using fragmented and manual "
        "methods that are inefficient, error-prone, and lack continuity. The primary "
        "objective of this project is to develop a web-based AI platform that automates "
        "compliance processes for a focused set of ECC-ISO cybersecurity regulations. "
        "The system utilizes Supervised Learning to train NLP models on regulatory texts, "
        "with an initial focus on the Password Policy (ECC 2-2) and Risk Assessment "
        "(ECC 1-5) controls from the NCA ECC.")

    _h(doc, "1.3  Project Contribution", 2)
    _p(doc, f"The main contributions delivered in GP2 for {SHORT} are:")
    _b(doc, "AI-driven 16-label multi-label gap detection using fine-tuned mDeBERTa-v3 (evolved from mBERT baseline)")
    _b(doc, "Custom bilingual (Arabic/English) compliance dataset of 260 samples")
    _b(doc, "Automated ECC\u2013ISO 27001 cross-framework mapping")
    _b(doc, "Full-stack web platform with real-time compliance scoring")
    _b(doc, "Severity-weighted scoring with actionable remediation guidance")
    _b(doc, "Cloud-native deployment on Google Cloud Run (me-central1)")
    _b(doc, "Bilingual interface with RTL Arabic support")
    _b(doc, "Centralized compliance reporting and audit trail")

    _h(doc, "1.4  Structure of the Project", 2)
    _p(doc,
        "This report is structured as follows: "
        "Chapter 1: Introduction \u2014 provides background, objectives, and contributions. "
        "Chapter 2: Literature Review \u2014 summarizes the related work from GP1. "
        "Chapter 3: Solution Approach / Methodology \u2014 details the full implementation "
        "including dataset construction, AI model, backend, frontend, database, system "
        "diagrams, prototype screenshots, and security. "
        "Chapter 4: Testing and Evaluation \u2014 covers dataset analysis, model training results, "
        "test set evaluation with per-gap metrics, model inference testing, API testing, "
        "performance metrics, compliance score validation, and usability evaluation. "
        "Chapter 5: Conclusion \u2014 summarizes achievements, challenges, lessons learned, "
        "and future work.")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    # CHAPTER 2 — Literature Review (recap)
    # ════════════════════════════════════════════════════════════════
    _h(doc, "2  Literature Review or Related Work")
    _p(doc,
        "The Essential Cybersecurity Controls (ECC) of the Saudi National Cybersecurity "
        "Authority establish a legal baseline for cybersecurity compliance in the Kingdom. "
        "The ECC includes 114 controls across five domains and twenty-nine subdomains "
        "focused on governance, risk management, and operational resilience. However, a "
        "major limitation is the absence of automation and digital tools to support "
        "ongoing compliance verification.")
    _p(doc,
        "The literature review conducted in GP1 was organized into three themes: "
        "(1) automated compliance checking frameworks; (2) natural language processing "
        "(NLP) for regulatory text; and (3) Regulatory Technology applications and "
        "Saudi governance considerations. These findings validated the need for a "
        f"bilingual, AI-enabled compliance platform \u2014 which {SHORT} now implements.")

    _h(doc, "2.1  Summary and Comparison of Studies", 2)
    _p(doc, "Table 2.1 summarizes the key studies reviewed in GP1.")
    _table(doc,
        ["Ref.", "Main Focus / Methodology", "Key Strength", "Key Limitation"],
        [
            ["[11]","AI, Blockchain & Smart Contracts for automated cybersecurity policy enforcement",
             "Scalability, reduced manual effort via simulation","Conceptual; requires real-world testing"],
            ["[29]","NLP (Sentence-BERT) for GDPR clause-to-regulation matching",
             "High semantic embedding effectiveness","Limited to English and GDPR only"],
            ["[16]","Literature review on NLP transformers for compliance analysis",
             "Strong synthesis of NLP progress","Lacks benchmarking standards; limited Arabic datasets"],
            ["[14]","Deep learning & GNN for semantic alignment of regulations",
             "Captures semantic context beyond surface similarity","Domain-specific; limited validation"],
            ["[20]","RC2AS: Risk-Based Cybersecurity Compliance Assessment for ECC",
             "Structured quantitative maturity assessment","Small-scale; lacks AI-driven automation"],
            ["[15]","Rule-based NLP with ontologies for compliance checking",
             "High precision and explainable","High engineering cost; poor scalability"],
        ]
    )
    _p(doc,
        "For the complete literature review and full comparison table, refer to the GP1 report.")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    # CHAPTER 3 — Solution Approach / Methodology
    # ════════════════════════════════════════════════════════════════
    _h(doc, "3  Solution Approach / Methodology")
    _p(doc,
        "This chapter details the full implementation of the "
        f"{SHORT} platform, covering dataset construction, AI model development, "
        "backend API, frontend application, database design, system modeling diagrams, "
        "prototype design (with screenshots), and security implementation.")

    # ── 3.1 Overall Approach ──
    _h(doc, "3.1  Overall Approach", 2)
    _p(doc,
        f"The core of {SHORT} is an AI-powered system that automates the compliance "
        "assessment process. The methodology follows a linear workflow: Data Collection "
        "\u2192 Preprocessing & Feature Extraction \u2192 AI Model \u2192 Compliance "
        "Scoring \u2192 User Interface \u2192 Real-time Monitoring.")
    _fig(doc, "Figure 3.1: High-Level System Architecture")

    # ── 3.2 Methodology Details ──
    _h(doc, "3.2  Methodology Details", 2)
    _p(doc, "The system architecture consists of several interconnected modules:")
    _b(doc, "Data Collection Module: Regulatory documents (NCA ECC, ISO 27001) and organizational policies.")
    _b(doc, "Preprocessing and Feature Extraction Engine: Cleaning, tokenization, language detection, Arabic normalization.")
    _b(doc, "AI Model: Supervised classification engine built on mDeBERTa-v3 for 16-label gap detection.")
    _b(doc, "Compliance Scoring Module: Severity-weighted scoring with per-domain breakdown.")
    _b(doc, "User Interface: Interactive dashboard with real-time compliance metrics.")
    _b(doc, "Real-time Monitoring: Continuous visibility over compliance status.")

    _h(doc, "3.2.1  Technology Stack", 3)
    _table(doc,
        ["Category", "Technology", "Version / Details"],
        [
            ["Frontend Framework", "React", "19.2.0"],
            ["Language (Frontend)", "TypeScript", "5.9.3"],
            ["CSS Framework", "Tailwind CSS", "4.1.18"],
            ["Build Tool", "Vite", "7.3.1"],
            ["Router", "React Router DOM", "7.13.0"],
            ["Backend Framework", "FastAPI", "0.115.0"],
            ["ML Framework", "PyTorch (CPU-only)", "\u2014"],
            ["NLP Library", "HuggingFace Transformers", "4.40.0"],
            ["Pre-trained Model", "microsoft/mdeberta-v3-base", "~86M params"],
            ["Database", "Supabase (PostgreSQL)", "Managed"],
            ["Authentication", "Supabase Auth (JWT)", "\u2014"],
            ["Cloud Platform", "Google Cloud Run", "me-central1 (Doha)"],
            ["Model Storage", "Google Cloud Storage", "Bucket: model-files33"],
            ["Dataset Generation", "Google Gemini 2.5 Flash", "API"],
            ["PDF Extraction", "pdf.js-dist", "4.9.155"],
            ["Containerization", "Docker (multi-stage)", "python:3.12-slim"],
        ]
    )

    # ── 3.2.2 Data Collection ──
    _h(doc, "3.2.2  Data Collection", 3)
    _p(doc,
        "A custom compliance dataset was generated using the Google Gemini 2.5 Flash API "
        "through a two-pass generation pipeline (generate + verify). The generator script "
        "produces bilingual policy excerpts with multi-label gap annotations.")
    _b(doc, "14 sample profiles controlling gap distribution patterns")
    _b(doc, "12 industry variations (Banking, Healthcare, Telecom, Government, etc.)")
    _b(doc, "5 company size categories (Micro, Small, Medium, Large, Enterprise)")
    _b(doc, "Resumable operation via incremental JSONL output")

    _p(doc, "Table 3.2: Dataset Statistics")
    _table(doc,
        ["Metric", "Value"],
        [
            ["Total Samples", "260"],
            ["English Samples", "130 (50%)"],
            ["Arabic Samples", "130 (50%)"],
            ["Fully Compliant", "48 (18.5%)"],
            ["Partially Compliant", "92 (35.4%)"],
            ["Non-Compliant", "120 (46.2%)"],
            ["Password Policy Only", "89 (34.2%)"],
            ["Risk Assessment Only", "79 (30.4%)"],
            ["Both Domains", "92 (35.4%)"],
            ["Average Gap Count", "5.05 per sample"],
        ]
    )

    _p(doc, "Table 3.3: Gap Labels \u2014 Password Policy (ECC 2-2)")
    _table(doc,
        ["Gap ID", "Description", "Severity"],
        [
            ["GAP_PP_001","Weak password complexity requirements","3"],
            ["GAP_PP_002","Inadequate password expiration policy","2"],
            ["GAP_PP_003","Weak account lockout mechanisms","2"],
            ["GAP_PP_004","Missing multi-factor authentication (MFA)","4"],
            ["GAP_PP_005","Missing privileged access management (PAM)","4"],
            ["GAP_PP_006","Missing password encryption/storage requirements","3"],
            ["GAP_PP_007","Missing periodic review schedule","2"],
            ["GAP_PP_008","Missing roles and responsibilities definition","2"],
        ]
    )
    _p(doc, "Table 3.4: Gap Labels \u2014 Risk Assessment (ECC 1-5)")
    _table(doc,
        ["Gap ID", "Description", "Severity"],
        [
            ["GAP_RA_001","Missing risk assessment methodology","4"],
            ["GAP_RA_002","Missing risk identification procedures","3"],
            ["GAP_RA_003","Missing likelihood/impact assessment scales","3"],
            ["GAP_RA_004","Missing risk treatment options","3"],
            ["GAP_RA_005","Missing assessment triggers/schedule","4"],
            ["GAP_RA_006","Missing risk register requirements","2"],
            ["GAP_RA_007","Missing periodic review schedule","2"],
            ["GAP_RA_008","Missing project management integration","2"],
        ]
    )

    # ── 3.2.3 AI Model ──
    _h(doc, "3.2.3  AI Model Development", 3)
    _p(doc,
        f"The core analytical component of {SHORT} is a GapDetectionModel built on "
        "microsoft/mdeberta-v3-base (mDeBERTa-v3). The model was initially developed using "
        "bert-base-multilingual-cased (mBERT), but mBERT's shared 110k WordPiece "
        "vocabulary diluted Arabic-specific representations and led to poor convergence "
        "on the bilingual 16-label gap detection task. mDeBERTa-v3, pre-trained on "
        "CC100 multilingual data with a 128k SentencePiece vocabulary and disentangled "
        "attention, provides significantly better cross-lingual transfer for "
        "Arabic/English regulatory text. The model uses mean-pooled token representations "
        "fed into a wider two-layer classification head with Batch Normalization and "
        "sigmoid activation for multi-label classification across 16 gap labels.")

    _p(doc, "Table 3.5: Model Architecture Parameters")
    _table(doc,
        ["Parameter", "Value"],
        [
            ["Base Model","microsoft/mdeberta-v3-base"],
            ["Previous Model (replaced)","bert-base-multilingual-cased (mBERT)"],
            ["Vocabulary Size","128,100 tokens (SentencePiece)"],
            ["Hidden Size","768"],
            ["Attention Heads","12"],
            ["Encoder Layers","12"],
            ["Language Support","100+ languages (English, Arabic)"],
            ["Pre-training Data","CC100 multilingual corpus (vs mBERT: Wikipedia only)"],
            ["Max Sequence Length","512 tokens"],
            ["Pooling Strategy","[CLS] token representation"],
            ["Classification Head","Linear(768\u2192512) \u2192 BN \u2192 ReLU \u2192 Dropout \u2192 Linear(512\u2192256) \u2192 ReLU \u2192 Dropout \u2192 Linear(256\u219216)"],
            ["Output Activation","Sigmoid (per-label independent)"],
            ["Loss Function","BCEWithLogitsLoss with pos_weight"],
            ["Optimizer","AdamW with layer-wise learning rates"],
            ["Backbone LR","8e-6 to 1.5e-5 (adaptive to dataset size)"],
            ["Head LR","5e-4"],
            ["Label Smoothing","0.05"],
            ["Word Dropout Augmentation","10%"],
            ["Number of Gap Labels","16 (8 Password Policy + 8 Risk Assessment)"],
        ]
    )
    _fig(doc, "Figure 3.2: ML Pipeline Workflow")
    _fig(doc, "Figure 3.3: Model Classification Head Architecture")

    _p(doc, "Model Evolution:")
    _b(doc, "v1.0 \u2014 3-class BertForSequenceClassification (compliant / partial / non-compliant)")
    _b(doc, "v2.0 \u2014 16-class multi-label GapDetectionModel with mBERT + BCEWithLogitsLoss (poor convergence on bilingual task)")
    _b(doc, "v3.0 \u2014 mDeBERTa-v3-base + BCEWithLogitsLoss with pos_weight + wider classification head + layer-wise LR (current)")

    _h(doc, "Document Processing Pipeline", 3)
    _p(doc,
        "For inference, documents undergo a chunking pipeline:")
    _b(doc, "1. Input text (up to 50,000 characters)")
    _b(doc, "2. Document chunking: split on headings, then paragraphs (~350 words/chunk, 50-word overlap)")
    _b(doc, "3. Per-chunk tokenization with mDeBERTa-v3 tokenizer (512 max tokens)")
    _b(doc, "4. Per-chunk inference: mDeBERTa-v3 \u2192 classifier \u2192 16 sigmoid outputs")
    _b(doc, "5. Max-pooling aggregation across all chunks per gap label")
    _b(doc, "6. Domain detection via keyword heuristic")
    _b(doc, "7. Severity-weighted compliance scoring")
    _fig(doc, "Figure 3.4: Document Chunking & Aggregation Pipeline")

    _p(doc, "Table 3.9: Compliance Scoring Thresholds")
    _p(doc, "Score = 1 \u2212 (weighted_detected_gaps / total_weighted_gaps)")
    _table(doc,
        ["Score Range", "Classification"],
        [
            ["\u2265 0.90","Compliant"],
            ["0.50 \u2013 0.89","Partially Compliant"],
            ["< 0.50","Non-Compliant"],
        ]
    )

    # ── 3.2.4 Backend API ──
    _h(doc, "3.2.4  Backend API Development", 3)
    _p(doc,
        "The backend is a FastAPI application (~1,000 lines) deployed on Google Cloud Run. "
        "It loads the trained model from Google Cloud Storage at startup.")

    _p(doc, "Table 3.6: API Endpoints")
    _table(doc,
        ["Endpoint","Method","Purpose"],
        [
            ["/","GET","API metadata and version info"],
            ["/health","GET","Health/readiness probe for Cloud Run"],
            ["/analyze","POST","Analyze policy document for compliance gaps"],
        ]
    )

    _p(doc, "AnalyzeRequest: text (1\u201350,000 chars), threshold (0.0\u20131.0, default 0.6)")
    _p(doc,
        "AnalyzeResponse includes: overall_compliance, overall_score, gap_count, "
        "domains_detected, per-domain gap details with confidence scores, "
        "all_gap_probabilities, and inference_time_ms.")

    _p(doc, "Deployment Configuration:")
    _b(doc, "Docker multi-stage build (python:3.12-slim, CPU-only PyTorch)")
    _b(doc, "Region: me-central1 (Doha, Middle East)")
    _b(doc, "Memory: 2 GB, CPU: 2 cores, Port: 8080")
    _b(doc, "Health check: GET /health every 30 seconds")
    _fig(doc, "Figure 3.11: Deployment Architecture (Google Cloud Run)")

    # ── 3.2.5 Frontend ──
    _h(doc, "3.2.5  Frontend Web Application", 3)
    _p(doc,
        "The frontend is a single-page application built with React 19, TypeScript 5.9, "
        "and Tailwind CSS 4. It provides a comprehensive compliance dashboard with "
        "bilingual (Arabic/English) support and full RTL layout.")

    _p(doc, "Table 3.8: Frontend Pages and Components")
    _table(doc,
        ["Page","Route","Purpose"],
        [
            ["Landing Page","/","Feature showcase, NCA ECC mapping, workflow, tech stack"],
            ["Authentication","/auth/*","Email/password sign in and registration"],
            ["Account","/account","User profile management"],
            ["Dashboard Overview","/dashboard","KPI cards, compliance gauge, recent activity"],
            ["Policies","/dashboard/policies","Upload & analyze policy documents (PDF/DOCX/TXT)"],
            ["Assessments","/dashboard/assessments","Create NCA ECC / ISO 27001 assessments"],
            ["Remediation","/dashboard/remediation","Track tasks with priorities and AI guidance"],
            ["Framework Comparison","/dashboard/framework-comparison","ECC \u2194 ISO 27001 mapping"],
            ["Risk Dashboard","/dashboard/risk","Risk metrics and scoring"],
        ]
    )

    _p(doc, "Key Frontend Features:")
    _b(doc, "Bilingual Support: Full Arabic/English with RTL layout (\u223c1,000+ translated strings)")
    _b(doc, "File Processing: Client-side PDF, DOCX, TXT text extraction")
    _b(doc, "Real-time Analysis: Upload triggers immediate API analysis")
    _b(doc, "Responsive Design: Mobile-first with collapsible sidebar")
    _b(doc, "Compliance Store: Central state with Supabase sync + localStorage fallback")

    # ── 3.2.6 Database ──
    _h(doc, "3.2.6  Database Design", 3)
    _p(doc,
        "The database is hosted on Supabase (managed PostgreSQL) with Row-Level Security "
        "(RLS) ensuring each user can only access their own data.")

    _p(doc, "Table 3.7: Database Schema Summary")
    _table(doc,
        ["Table","Purpose","Key Columns"],
        [
            ["auth.users","Supabase-managed identity and user metadata","id, email, raw_user_meta_data"],
            ["policies","Uploaded policy documents","title, status, compliance_score, analysis_result"],
            ["assessments","Compliance assessments","framework, overall_score, results (JSONB)"],
            ["tasks","Remediation tasks","priority, status, control_id, ai_guidance"],
        ]
    )
    _p(doc, "Storage Buckets:")
    _b(doc, "policy-files \u2014 Uploaded policy documents (PDF, TXT, DOCX; max 10 MB)")
    _b(doc, "evidence-files \u2014 Assessment evidence files (PDF, images; max 10 MB)")
    _fig(doc, "Figure 3.12: Database Entity-Relationship Diagram")
    _pb(doc)

    # ── 3.3 System Modeling Diagrams ──
    _h(doc, "3.3  System Modeling Diagrams", 2)

    _h(doc, "3.3.1  Sequence Diagram \u2014 Policy Classification", 3)
    _fig(doc, "Figure 3.5: Sequence Diagram \u2014 Policy Classification")

    _h(doc, "3.3.2  Sequence Diagram \u2014 Authentication", 3)
    _p(doc,
        "This diagram covers the Sign Up and Sign In workflows using Supabase Auth. "
        "The Sign Up flow includes email/password registration, email verification, "
        "and storage of user metadata within Supabase Auth. The Sign In flow shows "
        "JWT token exchange and session establishment.")
    _fig(doc, "Figure 3.6: Sequence Diagram \u2014 Authentication")

    _h(doc, "3.3.3  Sequence Diagram \u2014 Assessment & Gap Analysis", 3)
    _p(doc,
        "This sequence diagram models the assessment creation workflow where a user "
        "initiates an NCA ECC assessment, the system loads framework controls, performs "
        "per-control gap analysis using the AI model, calculates scores, generates "
        "remediation tasks, and persists results to the database.")
    _fig(doc, "Figure 3.7: Sequence Diagram \u2014 Assessment & Gap Analysis")

    _h(doc, "3.3.4  Class / Component Diagram", 3)
    _p(doc,
        "The class diagram shows the frontend package structure (contexts, pages, "
        "services, types) and backend package (GapDetectionModel, FastAPI endpoints) "
        "with their relationships and key attributes.")
    _fig(doc, "Figure 3.8: Class / Component Diagram")

    _h(doc, "3.3.5  Data Flow Diagram", 3)
    _p(doc,
        "The data flow diagram shows how data moves through the system: from user "
        "interactions through authentication, policy upload, text extraction, AI "
        "classification, compliance scoring, assessment management, and task generation. "
        "It highlights the current runtime stores and integrations, including Supabase "
        "Auth, the three application tables, browser cache, and cloud storage.")
    _fig(doc, "Figure 3.9: Data Flow Diagram")

    # ── 3.4 Operational Logic ──
    _h(doc, "3.4  Operational Logic & Scenarios", 2)
    _h(doc, "3.4.1  Activity & State Diagrams", 3)
    _p(doc,
        "The activity diagram uses swimlanes to show the parallel responsibilities of "
        "User, Frontend, Backend/ML, and Database during the policy assessment workflow. "
        "Three state machine diagrams show the lifecycle states for Policy documents "
        "(Draft \u2192 Uploaded \u2192 Analyzing \u2192 Analyzed), Assessments (Created \u2192 In Progress "
        "\u2192 Completed), and Remediation Tasks (Open \u2192 In Progress \u2192 Completed/Deferred).")
    _fig(doc, "Figure 3.10: Activity & State Diagrams")

    _h(doc, "3.4.2  Use Case Diagram", 3)
    _p(doc,
        "The use case diagram shows the current actors and workflows around authentication, "
        "policy analysis, assessments, remediation, framework comparison, and risk review. "
        "It reflects the implemented dashboard experience rather than the earlier expanded model.")
    _fig(doc, "Figure 3.13: Use Case Diagram")
    _pb(doc)

    # ── 3.5 Prototype Design (SCREENSHOTS) ──
    _h(doc, "3.5  Prototype Design", 2)
    _p(doc,
        f"The following screenshots demonstrate the implemented {SHORT} web application, "
        "showcasing the key features and user workflows.")

    screens = [
        ("3.14","Landing Page",
         "The landing page displays the platform overview, supported policy domains, "
         "NCA ECC \u2194 ISO 27001 mapping logic, workflow steps, and technology stack."),
        ("3.15","Sign In / Sign Up",
         "Users authenticate via email and password. The page includes form validation "
         "and success confirmation messages."),
        ("3.16","Dashboard Overview",
         "The main dashboard shows KPI cards (compliance score, policies analyzed, open "
         "tasks, assessments), a compliance gauge, recent activity, and quick start actions."),
        ("3.17","Policy Upload & Analysis",
         "Users upload policy documents (PDF, DOCX, TXT) via drag-and-drop. The system "
         "triggers AI analysis and displays results."),
        ("3.18","Analysis Result \u2014 Compliant Document",
         "When a well-structured policy is analyzed, the system shows a high compliance "
         "score with few or no gaps detected, along with confidence levels per domain."),
        ("3.19","Analysis Result \u2014 Non-Compliant Document",
         "When a weak policy is analyzed, the system displays a low compliance score with "
         "multiple gaps identified, each showing gap ID, description, and confidence."),
        ("3.20","Assessments Page",
         "Users create and manage NCA ECC and ISO 27001 assessments with control-by-control "
         "evaluation, evidence upload, and comment threads."),
        ("3.21","Remediation Tasks",
         "Tracks remediation tasks generated from detected gaps with priority levels, "
         "status tracking, AI guidance, and comment threads."),
        ("3.22","Framework Comparison",
         "Displays the ECC \u2194 ISO 27001 control mapping, showing how NCA ECC domains "
         "map to ISO 27001 clauses and Annex A controls."),
        ("3.23","Risk Dashboard",
         "Visualizes risk metrics including risk scores, assessment status, and compliance "
         "posture across different domains."),
        ("3.24","Arabic RTL Interface",
         "The same interface in Arabic with proper right-to-left layout, translated "
         "navigation, labels, and compliance terminology."),
    ]
    for num, title, desc in screens:
        _h(doc, f"Figure {num}: {title}", 3)
        _fig(doc, f"Figure {num}: {title}")
        _p(doc, desc)
        doc.add_paragraph()
    _pb(doc)

    # ── 3.6 Security & Privacy ──
    _h(doc, "3.6  Security & Privacy Threat Modeling", 2)

    _h(doc, "3.6.1  Security Controls Implemented", 3)
    _b(doc, "Supabase Auth with JWT session tokens and automatic refresh")
    _b(doc, "Row-Level Security (RLS) on the application tables: policies, assessments, and tasks")
    _b(doc, "Per-user data isolation (users access only their own records)")
    _b(doc, "Optional API Key authentication for backend endpoints")
    _b(doc, "HTTPS/TLS encryption in transit; Supabase encryption at rest")
    _b(doc, "Storage bucket policies restrict file access to owner folder")
    _b(doc, "Input validation: text limited to 50,000 characters, file types restricted")

    _h(doc, "3.6.2  STRIDE Model Analysis", 3)
    _p(doc, "Table 3.11: STRIDE Threat Model & Mitigations")
    _table(doc,
        ["Threat Category","Example in System","Mitigation"],
        [
            ["Spoofing","Fake user login to alter assessment data","Supabase Auth with JWT, route guards"],
            ["Tampering","Unauthorized alteration of compliance data","RLS policies, JSONB integrity, HTTPS"],
            ["Repudiation","User denies submitting a document","Policy analysis_result JSONB audit trail with timestamps"],
            ["Information Disclosure","Leak of SME assessment findings or remediation tasks","RLS isolation, CORS config, encrypted transport"],
            ["Denial of Service","API overload by malicious actor","Cloud Run auto-scaling, input size limits"],
            ["Elevation of Privilege","User gains admin rights","RLS per-user policies, no admin escalation path"],
        ]
    )

    _h(doc, "3.6.3  Threat Model and Risk Analysis", 3)
    _p(doc, "Table 3.10: Threat Model and Security Controls")
    _table(doc,
        ["Threat","Scenario","CIA Scores","Risk Level","Mitigation"],
        [
            ["Data Breaches","API/DB exploit to exfiltrate data","C:10 I:8 A:6 = 8","High",
             "Data encryption, RBAC, audit logs"],
            ["Unauthorized Access","Stolen/weak credentials","C:9 I:9 A:7 = 8.3","High",
             "Supabase Auth, secure sessions"],
            ["Data Corruption","Ransomware alters stored data","C:9 I:10 A:8 = 9","High",
             "Automated backups, SHA-256 checksums"],
            ["Denial of Service","API overload","C:2 I:3 A:10 = 5","Medium",
             "Rate limiting, Cloud Run scaling"],
            ["Privacy Leakage","Assessment comments expose PII","C:4 I:3 A:2 = 3","Low",
             "Data minimization, masking"],
        ]
    )
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    # CHAPTER 4 — Testing and Evaluation
    # ════════════════════════════════════════════════════════════════
    _h(doc, "4  Testing and Evaluation")

    # ── 4.1 Dataset Analysis ──
    _h(doc, "4.1  Dataset Analysis", 2)
    _p(doc,
        "The final training dataset consists of 891 bilingual samples (472 English, 419 Arabic) "
        "generated via Google Gemini 2.5 Flash with automated quality verification. After "
        "data cleaning, 13 mislabeled samples were removed where intended gaps did not match "
        "actual gap labels. Figure 4.1 shows the dataset distribution across gap labels, "
        "compliance levels, domains, and languages.")
    _fig(doc, "Figure 4.1: Dataset Distribution Overview")
    _fig(doc, "Figure 4.7: Gap Count Distribution per Sample")
    _p(doc,
        "The gap count distribution shows a mean of 1.8 gaps per sample, with a heavy "
        "concentration at 0 gaps (compliant samples comprising 48% of the dataset).")

    # ── 4.2 Training Results ──
    _h(doc, "4.2  Model Training Results", 2)
    _p(doc,
        "The mDeBERTa-v3-base model was trained for 52 epochs with early stopping "
        "(patience=10). The best checkpoint was saved at epoch 42 based on validation "
        "Macro F1. Training used BCEWithLogitsLoss with pos_weight for class imbalance, "
        "layer-wise learning rates (backbone: 8e-6 to 1.5e-5, classification head: 5e-4), "
        "and word dropout augmentation (10%). This model replaced the initial mBERT "
        "baseline which struggled to converge on the bilingual 16-label task.")
    _fig(doc, "Figure 4.2: Training Progress (Enhanced)")
    _p(doc,
        "The training curves show steady convergence: training loss decreased from 1.45 to "
        "0.98, while validation loss decreased from 1.23 to 0.72. Validation Macro F1 "
        "plateaued around 0.60 after epoch 30, with the best checkpoint at epoch 42.")

    # ── 4.3 Test Set Evaluation ──
    _h(doc, "4.3  Test Set Evaluation", 2)
    _p(doc,
        "Three threshold strategies were compared on the held-out test set (134 samples):")

    _p(doc, "Table 4.1: Test Set Evaluation \u2014 Threshold Strategies")
    _table(doc,
        ["Strategy", "Macro F1", "Micro F1", "Exact Match", "Hamming Acc"],
        [
            ["Fixed (0.50)", "0.5551", "0.5566", "0.3582", "0.8484"],
            ["Global (0.74)", "0.5910", "0.6017", "0.5000", "0.9104"],
            ["Conservative per-label", "0.6037", "0.6069", "0.4552", "0.8997"],
        ]
    )
    _p(doc,
        "The Conservative Per-Label strategy achieved the best test Macro F1 of 0.6037. "
        "This strategy optimizes a threshold per gap label on the validation set, clamps "
        "to [0.43, 0.65], and blends with the global optimum (0.74).")

    _p(doc, "Table 4.2: Per-Gap Detection Metrics (Conservative Per-Label)")
    _table(doc,
        ["Gap ID", "Precision", "Recall", "F1", "Support"],
        [
            ["GAP_PP_001", "0.895", "1.000", "0.944", "17"],
            ["GAP_PP_002", "0.591", "0.684", "0.634", "19"],
            ["GAP_PP_003", "0.571", "0.522", "0.545", "23"],
            ["GAP_PP_004", "0.667", "0.706", "0.686", "17"],
            ["GAP_PP_005", "0.650", "1.000", "0.788", "13"],
            ["GAP_PP_006", "0.625", "0.882", "0.732", "17"],
            ["GAP_PP_007", "0.588", "0.500", "0.541", "20"],
            ["GAP_PP_008", "0.550", "0.524", "0.537", "21"],
            ["GAP_RA_001", "0.917", "0.733", "0.815", "15"],
            ["GAP_RA_002", "0.304", "0.700", "0.424", "10"],
            ["GAP_RA_003", "0.444", "0.889", "0.593", "9"],
            ["GAP_RA_004", "0.550", "0.917", "0.688", "12"],
            ["GAP_RA_005", "0.333", "0.875", "0.483", "8"],
            ["GAP_RA_006", "0.389", "0.700", "0.500", "10"],
            ["GAP_RA_007", "0.222", "0.333", "0.267", "12"],
            ["GAP_RA_008", "0.364", "0.727", "0.485", "11"],
        ]
    )
    _fig(doc, "Figure 4.3: Per-Gap Precision / Recall / F1 (Test Set)")

    _p(doc, "Table 4.3: Domain-Level Summary")
    _table(doc,
        ["Domain", "Macro F1", "Strongest Gap", "Weakest Gap"],
        [
            ["Password Policy (PP)", "0.6758", "GAP_PP_001 (0.944)", "GAP_PP_008 (0.537)"],
            ["Risk Assessment (RA)", "0.5317", "GAP_RA_001 (0.815)", "GAP_RA_007 (0.267)"],
        ]
    )
    _fig(doc, "Figure 4.5: Domain-Level Performance Comparison")
    _p(doc,
        "The model performs notably stronger on Password Policy gaps (Macro F1: 0.6758) "
        "than Risk Assessment gaps (0.5317). The 14-point gap is attributed to lower training "
        "support for RA labels (80\u2013100 samples vs 102\u2013120 for PP labels).")

    _fig(doc, "Figure 4.4: ROC Curves (Test Set)")
    _p(doc,
        "ROC analysis shows strong discriminative ability across all gaps. Password Policy "
        "AUCs range from 0.87 to 1.00, while Risk Assessment AUCs range from 0.81 to 0.98. "
        "Even the weakest gap (GAP_RA_007, AUC=0.81) is well above random baseline, indicating "
        "the model has learned meaningful representations.")

    _fig(doc, "Figure 4.6: Multi-Label Confusion Matrix")
    _p(doc,
        "The confusion matrix reveals that False Positives (FP) are more common than False "
        "Negatives (FN) for most RA gaps, confirming the model\u2019s tendency to over-predict "
        "low-support labels. The BCEWithLogitsLoss with pos_weight effectively handles high-support "
        "PP labels but the RA domain labels with fewer positive samples remain challenging.")

    # ── 4.4 Model Inference Testing ──
    _h(doc, "4.4  Model Inference Testing", 2)
    _p(doc,
        "The model was tested using representative policy samples covering different "
        "compliance levels and languages.")
    _p(doc, "Table 4.4: Test Case Results \u2014 Model Inference")
    _table(doc,
        ["Test Case","Input","Expected Result","Status"],
        [
            ["Compliant PP (EN)","Strong password policy with all controls",
             "Low gap detection, high score","Pass"],
            ["Weak PP (EN)","Minimal policy missing MFA/PAM",
             "Multiple gaps (PP_004, PP_005)","Pass"],
            ["Arabic Policy","Arabic password policy text",
             "Correct domain detection + gaps","Pass"],
            ["Risk Assessment","Risk management policy",
             "RA domain detected, relevant gaps","Pass"],
            ["Empty/Short Text","Minimal input",
             "Graceful handling, no crash","Pass"],
            ["Long Document","50,000 char document",
             "Chunking + max-pool aggregation","Pass"],
        ]
    )

    _h(doc, "4.5  API Testing", 2)
    _p(doc, "The API was tested at three levels:")
    _b(doc, "test_local.py \u2014 Offline model inference (4 test cases)")
    _b(doc, "test_api.py \u2014 Local server endpoint tests")
    _b(doc, "test_deployed_api.py \u2014 Cloud Run deployment verification")

    _p(doc, "Table 4.5: Test Case Results \u2014 API Endpoints")

    _table(doc,
        ["Test","Endpoint","Expected","Result"],
        [
            ["Health Check","GET /health","200 OK, model_loaded=true","Pass"],
            ["Metadata","GET /","200 OK, version info","Pass"],
            ["Analyze (valid)","POST /analyze","200, gap results","Pass"],
            ["Analyze (empty)","POST /analyze","422 Validation Error","Pass"],
            ["Analyze (too long)","POST /analyze","422, text > 50K","Pass"],
            ["Invalid endpoint","GET /invalid","404 Not Found","Pass"],
        ]
    )

    _h(doc, "4.6  Performance Metrics", 2)
    _b(doc, "Model inference time: <500 ms per document (CPU)")
    _b(doc, "API response time: <1 second end-to-end")
    _b(doc, "Cold start: ~30\u201360 seconds (model download from GCS)")
    _b(doc, "Warm inference: consistent sub-second on subsequent requests")
    _b(doc, "Document support: up to 50,000 characters per request")

    _h(doc, "4.7  Compliance Score Validation", 2)
    _p(doc,
        "The AI model\u2019s compliance scoring was validated by analyzing documents with "
        "known compliance levels. Below are results showing the percentage scores generated "
        "by the system for compliant and non-compliant documents.")
    _fig(doc, "Figure 4.8: Analysis Result \u2014 Compliant Document (High Score)")
    _p(doc,
        "The above shows the system\u2019s analysis of a well-structured policy that meets "
        "most NCA ECC requirements, resulting in a high compliance percentage.")
    _fig(doc, "Figure 4.9: Analysis Result \u2014 Non-Compliant Document (Low Score)")
    _p(doc,
        "The above shows the system\u2019s analysis of a weak policy with multiple gaps, "
        "resulting in a low compliance percentage with specific gap identifications.")

    _h(doc, "4.8  Usability Evaluation", 2)
    _p(doc, "Table 4.6: Usability Evaluation Criteria")
    _table(doc,
        ["Criterion","Status","Notes"],
        [
            ["Bilingual Support","\u2713 Implemented","Full AR/EN with RTL, ~1000+ strings"],
            ["Responsive Design","\u2713 Implemented","Mobile-first with collapsible sidebar"],
            ["File Upload","\u2713 Implemented","PDF, DOCX, TXT with drag-and-drop"],
            ["Real-time Feedback","\u2713 Implemented","Loading states, progress indicators"],
            ["Error Handling","\u2713 Implemented","Validation, graceful error messages"],
        ]
    )
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    # CHAPTER 5 — Conclusion
    # ════════════════════════════════════════════════════════════════
    _h(doc, "5  Conclusion")

    _h(doc, "5.1  Summary of Achievements in Graduation Project 2", 2)
    _p(doc,
        f"Graduation Project 2 successfully transitioned the {SHORT} platform from "
        "conceptual design to a fully implemented and deployed system:")
    _b(doc, "Custom bilingual dataset of 260 samples (130 EN + 130 AR) with 16 gap labels")
    _b(doc, "Fine-tuned mDeBERTa-v3-base model (evolved from mBERT baseline) achieving test Macro F1 of 0.6037")
    _b(doc, "FastAPI backend with document chunking deployed on Google Cloud Run")
    _b(doc, "Full-featured React/TypeScript web application with bilingual support")
    _b(doc, "Supabase PostgreSQL with RLS on policies, assessments, and remediation tasks; user profiles managed by Supabase Auth")
    _b(doc, "End-to-end integration: upload \u2192 extraction \u2192 analysis \u2192 scoring \u2192 remediation")

    _h(doc, "5.2  Key Findings", 2)
    _b(doc, "Multi-label gap detection provides more actionable insights than single-label classification.")
    _b(doc, "mDeBERTa-v3's SentencePiece tokenizer (128k vocab, CC100 pre-training) with disentangled attention significantly outperforms mBERT for bilingual Arabic/English compliance text.")
    _b(doc, "BCEWithLogitsLoss with pos_weight effectively handles class imbalance by up-weighting minority gap labels.")
    _b(doc, "Model evolution from mBERT to mDeBERTa-v3 was necessary: mBERT's shared 110k WordPiece vocabulary failed to capture Arabic regulatory nuances.")
    _b(doc, "Conservative per-label threshold optimization improves Macro F1 by 8.8% over the fixed 0.50 baseline.")
    _b(doc, "Password Policy domain (F1: 0.6758) outperforms Risk Assessment (F1: 0.5317) due to higher training support.")
    _b(doc, "Document chunking with max-pool aggregation handles long texts within the 512-token limit.")
    _b(doc, "Severity-weighted scoring offers more nuanced assessment than binary pass/fail.")

    _h(doc, "5.3  Challenges Encountered", 2)
    _b(doc, "Dataset Scarcity: No public NCA ECC datasets exist; synthetic generation via Gemini was necessary.")
    _b(doc, "Arabic NLP: Formal Arabic regulatory language required specialized normalization.")
    _b(doc, "Class Imbalance: Sparse multi-label gaps (mean 1.8/sample) required pos_weight in BCEWithLogitsLoss to avoid predicting all zeros.")
    _b(doc, "RA Domain Performance: Risk Assessment gaps with lower training support (80\u2013100 samples) showed weaker F1 (0.53).")
    _b(doc, "Model Size: mDeBERTa-v3 (~350 MB) requires Docker optimization for Cloud Run.")
    _b(doc, "Cold Start: Initial model loading takes 30\u201360 s; mitigated by keep-alive.")

    _h(doc, "5.4  Lessons Learned", 2)
    _b(doc, "Sigmoid multi-label classification is better suited for gap detection than softmax multi-class.")
    _b(doc, "BCEWithLogitsLoss with pos_weight is effective for sparse multi-label tasks where negatives outnumber positives.")
    _b(doc, "Synthetic dataset generation with LLMs can bootstrap domain-specific ML, but quality verification is essential.")
    _b(doc, "Per-label threshold optimization blended with a global threshold provides robust generalization.")
    _b(doc, "Cloud Run provides cost-effective serverless deployment for bursty ML inference.")
    _b(doc, "Row-Level Security simplifies multi-tenant isolation without app-layer logic.")

    _h(doc, "5.5  Future Work", 2)
    _b(doc, "Expand to additional ECC domains: Network Security, Data Protection, Incident Response, Business Continuity")
    _b(doc, "Explore Asymmetric Loss or focal loss for RA labels to further reduce false positives on low-support gaps")
    _b(doc, "Augment RA training samples via paraphrasing and back-translation to close the domain performance gap")
    _b(doc, "Integrate Gemini 2.5 Pro for AI-generated remediation guidance")
    _b(doc, "Add scheduled assessment automation with periodic re-analysis")
    _b(doc, "Implement PDF report generation for audit-ready documentation")
    _b(doc, "Expand training dataset to 1,000+ real-world policy samples")

    _h(doc, "5.6  Final Summary", 2)
    _p(doc,
        f"The {SHORT} demonstrates that NLP and multi-label classification can effectively "
        "automate cybersecurity compliance gap detection for Saudi SMEs. The platform "
        "reduces manual audit time from weeks to minutes while providing specific, "
        "actionable gap identification mapped to both NCA ECC and ISO 27001 frameworks. "
        "The bilingual design and cloud-native deployment make it accessible to a wide "
        "range of Saudi organizations, supporting the Kingdom\u2019s Vision 2030 goals "
        "for digital transformation and cybersecurity resilience.")
    _pb(doc)

    # ════════════════════════════════════════════════════════════════
    # REFERENCES
    # ════════════════════════════════════════════════════════════════
    _h(doc, "References")
    refs = [
        '[1] Y. Li and Q. Liu. (2021) A comprehensive review study of cyberattacks and cyber security. Energy Rep.',
        '[2] S. AlDaajeh et al. (2022) The role of national cybersecurity strategies on the improvement of cybersecurity education. Comput. Secur.',
        '[3] National Cybersecurity Authority (NCA). (2018) Essential cybersecurity controls (ECC-1:2018). NCA Portal.',
        '[4] M. M. Alshammari and Y. H. Al-Mamary. (2025) Building trust and cybersecurity awareness in Saudi Arabia. Systems.',
        '[5] R. Alzahrani. (2024) An overview of AI data protection in the context of Saudi Arabia. IJSR.',
        '[6] A. Folorunso et al. (2024) Security compliance and its implication for cybersecurity. WJARR.',
        '[7] M. F. Almoaigel and A. Abuabid. (2023) Implementation of cybersecurity situation awareness model in Saudi SMEs. IJACSA.',
        '[8] N. Rawindaran et al. (2023) Enhancing cyber security governance and policy for SMEs in Industry 5.0. Digital.',
        '[9] A. Alotaibi et al. (2021) The impact of cybersecurity practices on cyberattack damage in small enterprises in Saudi Arabia. ResearchGate.',
        '[10] S. Perera et al. (2022) Factors affecting reputational damage to organisations due to cyberattacks. Informatics.',
        '[11] L. Alevizos and V. Ta. (2024) Automated cybersecurity compliance and threat response using AI, blockchain & smart contracts. arXiv.',
        '[12] National Cybersecurity Authority (NCA). (2024) Essential cybersecurity controls (ECC-2:2024). NCA Portal.',
        '[13] NCA. (2018) Guide to ECC implementation. NCA Portal.',
        '[14] H. Guo et al. (2020) Deep semantic compliance advisor for unstructured document compliance checking. IJCAI.',
        '[15] J. Zhang and N. El-Gohary. (2015) Semantic NLP-based information extraction for automated compliance checking. ASCE J. Comp. Civil Eng.',
        '[16] Jain et al. (2025) AI/NLP\'s role in regulatory compliance. ACL Findings.',
        '[17] Buddhadev et al. (2025) Automated compliance checking of unstructured data using LLMs and LangChain. MMEP.',
        '[18] H. Pappil Kothandapani and Hariharan. (2025) AI-driven regulatory compliance: Transforming financial oversight through LLMs. Figshare.',
        '[19] J. Viracacha Pe\u00f1a. (2024) Artificial intelligence in RegTech: Transforming automated compliance audits. SSRN.',
        '[20] A. Alfaadhel et al. (2023) RC2AS: Risk-based cybersecurity compliance assessment system. Applied Sciences.',
        '[21] Rawindaran et al. (2023) Enhancing cyber security governance for SMEs: Saudi Arabia vs UK. Digital.',
        '[22] S. Alarifi. (2023) Small and medium businesses readiness towards cyberattacks in Saudi Arabia. GER.',
        '[23] IJACSA. (2023) Implementation of cybersecurity situation awareness model in Saudi SMEs.',
        '[24] F. Abudaqqa. (2025) AI for IT governance in Saudi Arabia. European Scientific Journal.',
        '[25] R. Alzahrani. (2024) An overview of AI data protection in Saudi Arabia. IJSR.',
        '[26] M. M. Alshammari and Y. H. Al-Mamary. (2025) Building trust and cybersecurity awareness in Saudi Arabia. Systems.',
        '[27] Folorunso et al. (2024) Compliance conformance and firm cybersecurity performance. WJARR.',
        '[28] L. Rodr\u00edguez Valencia et al. (2025) Systematic review of AI applied to compliance. JRFM.',
        '[29] Amaral et al. (2022) NLP-based automated compliance checking against GDPR. arXiv.',
    ]
    for r in refs: _p(doc, r)

    # ── Save ──
    doc.save(OUTPUT_PATH)
    sz = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"\u2705 Report saved: {OUTPUT_PATH}")
    print(f"   Size: {sz:.1f} KB")
    embedded = sum(1 for asset in FIGURE_ASSETS.values() if os.path.exists(asset))
    print(f"   Figure assets available: {embedded}")


if __name__ == "__main__":
    build()
