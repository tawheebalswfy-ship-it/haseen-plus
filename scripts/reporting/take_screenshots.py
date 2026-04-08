"""Automated screenshot capture for the GP2 report.

The script seeds localStorage with report demo data and enables a dev-only
authentication bypass so the dashboard can be captured without real credentials.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright

BASE_URL = "http://localhost:5173"
OUT_DIR = os.fspath(Path(__file__).resolve().parents[2] / "artifacts" / "report-assets")

os.makedirs(OUT_DIR, exist_ok=True)

VIEWPORT = {"width": 1440, "height": 820}
LANDING_CLIP = {"x": 0, "y": 0, "width": 1440, "height": 780}

NOW = datetime(2026, 3, 31, 12, 0, 0)


def iso(days_ago: int = 0):
    return (NOW - timedelta(days=days_ago)).isoformat() + "Z"


DEMO_DATA = {
    "policies": [
        {
            "id": "policy-compliant-1",
            "title": "Password Policy - Corporate Standard",
            "status": "analyzed",
            "category": "Compliant",
            "compliance_score": 94,
            "created_date": iso(1),
            "analysis_result": {
                "overall_compliance": "Compliant",
                "overall_score": 0.94,
                "gap_count": 0,
                "num_chunks": 2,
                "inference_time_ms": 184.0,
                "domains_detected": ["password_policy"],
                "password_policy": {"gaps_detected": [], "gap_count": 0, "score": 94.0, "details": []},
                "risk_assessment": {"gaps_detected": [], "gap_count": 0, "score": 0.0, "details": []},
                "all_gap_probabilities": {},
                "gaps_detected": [],
                "text_length": 8420,
                "extracted_text": "Strong password policy with MFA, PAM, rotation, and encryption controls.",
            },
        },
        {
            "id": "policy-noncompliant-1",
            "title": "Legacy Access Policy",
            "status": "analyzed",
            "category": "Non-Compliant",
            "compliance_score": 38,
            "created_date": iso(2),
            "analysis_result": {
                "overall_compliance": "Non-Compliant",
                "overall_score": 0.38,
                "gap_count": 5,
                "num_chunks": 3,
                "inference_time_ms": 242.0,
                "domains_detected": ["password_policy", "risk_assessment"],
                "password_policy": {
                    "gaps_detected": ["GAP_PP_004", "GAP_PP_005", "GAP_PP_006"],
                    "gap_count": 3,
                    "score": 25.0,
                    "details": [
                        {"gap_id": "GAP_PP_004", "description": "Missing multi-factor authentication (MFA)", "confidence": 0.92},
                        {"gap_id": "GAP_PP_005", "description": "Missing privileged access management (PAM)", "confidence": 0.89},
                        {"gap_id": "GAP_PP_006", "description": "Missing password encryption/storage requirements", "confidence": 0.81},
                    ],
                },
                "risk_assessment": {
                    "gaps_detected": ["GAP_RA_001", "GAP_RA_005"],
                    "gap_count": 2,
                    "score": 44.0,
                    "details": [
                        {"gap_id": "GAP_RA_001", "description": "Missing risk assessment methodology", "confidence": 0.85},
                        {"gap_id": "GAP_RA_005", "description": "Missing assessment triggers/schedule", "confidence": 0.78},
                    ],
                },
                "all_gap_probabilities": {},
                "gaps_detected": [],
                "text_length": 9640,
                "extracted_text": "Weak legacy access policy missing modern identity and risk controls.",
            },
        },
        {
            "id": "policy-partial-1",
            "title": "Risk Management Policy 2026",
            "status": "analyzed",
            "category": "Partially Compliant",
            "compliance_score": 71,
            "created_date": iso(4),
            "analysis_result": {
                "overall_compliance": "Partially Compliant",
                "overall_score": 0.71,
                "gap_count": 2,
                "num_chunks": 2,
                "inference_time_ms": 198.0,
                "domains_detected": ["risk_assessment"],
                "password_policy": {"gaps_detected": [], "gap_count": 0, "score": 0.0, "details": []},
                "risk_assessment": {
                    "gaps_detected": ["GAP_RA_004", "GAP_RA_007"],
                    "gap_count": 2,
                    "score": 71.0,
                    "details": [
                        {"gap_id": "GAP_RA_004", "description": "Missing risk treatment options", "confidence": 0.66},
                        {"gap_id": "GAP_RA_007", "description": "Missing periodic review schedule", "confidence": 0.61},
                    ],
                },
                "all_gap_probabilities": {},
                "gaps_detected": [],
                "text_length": 7020,
                "extracted_text": "Risk assessment process with some treatment and review gaps.",
            },
        },
    ],
    "assessments": [
        {
            "id": "assessment-1",
            "name": "ECC Quarterly Review - March 2026",
            "framework": "ECC",
            "status": "completed",
            "overall_score": 68,
            "created_date": iso(1),
            "comments": [
                {"id": "comment-1", "author": "Compliance Lead", "text": "Prioritize MFA and risk methodology remediation this quarter.", "created_date": iso(1)}
            ],
            "results": [
                {"control_id": "ECC-1-2-1", "control_name": "Risk Management Program", "domain": "Risk Management", "status": "partial", "score": 62, "findings": "Partial gaps: GAP_RA_001, GAP_RA_004", "evidence_files": []},
                {"control_id": "ECC-1-2-2", "control_name": "Risk Assessment", "domain": "Risk Management", "status": "non_compliant", "score": 18, "findings": "Gaps: GAP_RA_005: Missing assessment triggers/schedule (78%)", "evidence_files": []},
                {"control_id": "ECC-2-2-1", "control_name": "Identity Management", "domain": "Identity & Access Management", "status": "non_compliant", "score": 22, "findings": "Gaps: GAP_PP_004: Missing MFA (92%)", "evidence_files": []},
                {"control_id": "ECC-2-2-3", "control_name": "Privileged Access Management", "domain": "Identity & Access Management", "status": "non_compliant", "score": 15, "findings": "Gaps: GAP_PP_005: Missing PAM (89%)", "evidence_files": []},
                {"control_id": "ECC-3-2-2", "control_name": "Data Encryption", "domain": "Data Protection", "status": "partial", "score": 55, "findings": "Partial gaps: GAP_PP_006: Missing password encryption/storage requirements (81%)", "evidence_files": []},
                {"control_id": "ECC-4-2-1", "control_name": "Incident Response Plan", "domain": "Incident Management", "status": "compliant", "score": 100, "findings": "No compliance gaps detected for this control.", "evidence_files": []},
            ],
        },
        {
            "id": "assessment-2",
            "name": "ECC Baseline Assessment",
            "framework": "ECC",
            "status": "completed",
            "overall_score": 81,
            "created_date": iso(8),
            "comments": [],
            "results": [
                {"control_id": "ECC-2-2-1", "control_name": "Identity Management", "domain": "Identity & Access Management", "status": "compliant", "score": 100, "findings": "No compliance gaps detected for this control.", "evidence_files": []},
                {"control_id": "ECC-2-2-2", "control_name": "Access Control", "domain": "Identity & Access Management", "status": "partial", "score": 70, "findings": "Partial gaps in lockout and expiration configuration.", "evidence_files": []},
                {"control_id": "ECC-3-2-2", "control_name": "Data Encryption", "domain": "Data Protection", "status": "compliant", "score": 100, "findings": "Storage encryption requirements are documented.", "evidence_files": []},
            ],
        },
    ],
    "tasks": [
        {
            "id": "task-1",
            "title": "Enforce MFA for privileged accounts",
            "description": "Deploy MFA for all high-risk administrative users across VPN and cloud consoles.",
            "control_id": "ECC-2-2-1",
            "assessment_id": "assessment-1",
            "priority": "critical",
            "status": "open",
            "due_date": "2026-04-15",
            "created_date": iso(1),
            "ai_guidance": {
                "steps": [
                    "Identify privileged accounts across the organization.",
                    "Integrate MFA into VPN, identity provider, and cloud admin flows.",
                    "Pilot on security administrators and validate break-glass access.",
                    "Roll out to all privileged users and collect evidence screenshots.",
                ],
                "estimated_effort": "20-40 hours",
                "tools_needed": ["IAM Platform", "MFA Solution", "GRC Platform"],
            },
            "comments": [
                {"id": "task-comment-1", "author": "You", "text": "Pilot deployment planned for next week.", "created_date": iso(0)}
            ],
        },
        {
            "id": "task-2",
            "title": "Formalize risk assessment methodology",
            "description": "Document the methodology, scoring scale, and review cadence for enterprise risk assessment.",
            "control_id": "ECC-1-2-1",
            "assessment_id": "assessment-1",
            "priority": "high",
            "status": "in_progress",
            "due_date": "2026-04-20",
            "created_date": iso(2),
            "ai_guidance": {
                "steps": [
                    "Draft a formal risk methodology aligned with ECC and ISO 27001.",
                    "Define likelihood and impact scales.",
                    "Add review triggers and approval workflow.",
                ],
                "estimated_effort": "15-25 hours",
                "tools_needed": ["GRC Platform", "Documentation System"],
            },
            "comments": [],
        },
        {
            "id": "task-3",
            "title": "Encrypt password storage in legacy app",
            "description": "Replace outdated hash implementation with modern salted hashing and secrets rotation.",
            "control_id": "ECC-3-2-2",
            "assessment_id": "assessment-1",
            "priority": "high",
            "status": "open",
            "due_date": "2026-05-01",
            "created_date": iso(3),
            "ai_guidance": {
                "steps": [
                    "Inventory password storage paths.",
                    "Migrate to bcrypt or Argon2 with managed secrets.",
                    "Validate compatibility and update recovery procedures.",
                ],
                "estimated_effort": "15-25 hours",
                "tools_needed": ["Encryption Tools", "Documentation System"],
            },
            "comments": [],
        },
    ],
}


def wait_for_ready(page):
    page.wait_for_load_state("domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except PlaywrightTimeoutError:
        page.wait_for_timeout(2000)
    page.wait_for_timeout(1500)


def screenshot_url(path: str) -> str:
    sep = "&" if "?" in path else "?"
    return f"{BASE_URL}{path}{sep}screenshot=1"


def seed_demo_state(page):
    page.goto(BASE_URL + "/auth/sign-in", wait_until="domcontentloaded", timeout=20000)
    page.evaluate(
        """
        (data) => {
          window.localStorage.setItem('AICG_SCREENSHOT_AUTH', '1');
          window.localStorage.setItem('compliance_guard_data', JSON.stringify(data));
        }
        """,
        DEMO_DATA,
    )


def save_screenshot(page, filename, *, full_page=False, clip=None):
    out = os.path.join(OUT_DIR, f"{filename}.png")
    options = {"path": out, "full_page": full_page}
    if clip is not None:
        options["clip"] = clip
    page.screenshot(**options)
    sz = os.path.getsize(out) / 1024
    print(f"    -> {out} ({sz:.0f} KB)")


def capture_landing(page):
    print(f"  Capturing: Landing Page ({BASE_URL}/) ...")
    page.goto(BASE_URL + "/", wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    save_screenshot(page, "fig_3_13_landing_page", clip=LANDING_CLIP)


def capture_sign_in(page):
    print(f"  Capturing: Sign In / Sign Up ({BASE_URL}/auth/sign-in) ...")
    page.goto(BASE_URL + "/auth/sign-in", wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    save_screenshot(page, "fig_3_14_sign_in")


def capture_dashboard_overview(page):
    print("  Capturing: Dashboard Overview ...")
    page.goto(screenshot_url("/dashboard"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    save_screenshot(page, "fig_3_15_dashboard_overview")


def capture_policy_upload(page):
    print("  Capturing: Policy Upload & Analysis ...")
    page.goto(screenshot_url("/dashboard/policies"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    page.locator("button").filter(has_text="Upload Policy").first.click()
    page.wait_for_timeout(1000)
    save_screenshot(page, "fig_3_16_policy_upload_analysis")


def capture_policy_results(page):
    print("  Capturing: Analysis Result - Compliant ...")
    page.goto(screenshot_url("/dashboard/policies"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    detail_buttons = page.locator("button").filter(has_text="View Details")
    detail_buttons.nth(0).click()
    page.wait_for_timeout(800)
    save_screenshot(page, "fig_3_17_analysis_compliant", full_page=True)

    print("  Capturing: Analysis Result - Non-Compliant ...")
    page.goto(screenshot_url("/dashboard/policies"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    detail_buttons = page.locator("button").filter(has_text="View Details")
    detail_buttons.nth(1).click()
    page.wait_for_timeout(800)
    save_screenshot(page, "fig_3_18_analysis_non_compliant", full_page=True)


def capture_assessments(page):
    print("  Capturing: Assessments Page ...")
    page.goto(screenshot_url("/dashboard/assessments"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    save_screenshot(page, "fig_3_19_assessments")


def capture_remediation(page):
    print("  Capturing: Remediation Tasks ...")
    page.goto(screenshot_url("/dashboard/remediation"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    page.get_by_text("Enforce MFA for privileged accounts").first.click()
    page.wait_for_timeout(800)
    save_screenshot(page, "fig_3_20_remediation", full_page=True)


def capture_framework(page):
    print("  Capturing: Framework Comparison ...")
    page.goto(screenshot_url("/dashboard/framework-comparison"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    save_screenshot(page, "fig_3_21_framework")


def capture_risk(page):
    print("  Capturing: Risk Dashboard ...")
    page.goto(screenshot_url("/dashboard/risk"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    save_screenshot(page, "fig_3_22_risk")


def capture_arabic(page):
    print("  Capturing: Arabic RTL ...")
    page.goto(screenshot_url("/dashboard"), wait_until="domcontentloaded", timeout=20000)
    wait_for_ready(page)
    toggle = page.locator("button:has-text('العربية')").first
    toggle.click()
    page.wait_for_timeout(1500)
    save_screenshot(page, "fig_3_23_arabic_rtl")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=2,
            locale="en-US",
        )
        page = context.new_page()

        capture_landing(page)
        capture_sign_in(page)
        seed_demo_state(page)
        capture_dashboard_overview(page)
        capture_policy_upload(page)
        capture_policy_results(page)
        capture_assessments(page)
        capture_remediation(page)
        capture_framework(page)
        capture_risk(page)
        capture_arabic(page)

        browser.close()

    print(f"\n✅ All screenshots saved to: {OUT_DIR}")
    print(f"   Total files: {len(os.listdir(OUT_DIR))}")


if __name__ == "__main__":
    main()
