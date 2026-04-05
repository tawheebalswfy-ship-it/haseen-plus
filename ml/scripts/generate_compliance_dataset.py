# Gap-Level Compliance Dataset Generator
# ========================================
# Generates labeled policy EXCERPTS for multi-label gap detection.
# Each sample is a policy chunk (~200-400 words) annotated with
# 16 binary gap labels (GAP_PP_001..008, GAP_RA_001..008).
#
# NEW APPROACH: Instead of classifying whole documents as one type,
# each chunk may cover password_policy, risk_assessment, or both.
# The model learns which specific compliance gaps exist in each chunk.
#
# Based on NCA ECC-2:2024 and ISO 27001:2022
# Supports Arabic and English (Bilingual)
#
# ============================================================
# GEMINI API RATE LIMITS (Free Tier):
# ============================================================
# Model                  | RPM  | TPM       | RPD
# -----------------------|------|-----------|-------
# Gemini 2.5 Pro         | 2    | 125,000   | 50
# Gemini 2.5 Flash       | 10   | 250,000   | 250
# Gemini 2.0 Flash       | 15   | 1,000,000 | 200
# Gemini 2.0 Flash-Lite  | 30   | 1,000,000 | 200
# ============================================================

import os
import json
import csv
import time
import random
from datetime import datetime
from pathlib import Path
from google import genai
from google.genai import types

# ============================================================
# GAP DEFINITIONS (16 gaps total: 8 password policy + 8 risk assessment)
# ============================================================

GAP_DEFINITIONS = {
    # ---- PASSWORD POLICY GAPS (ECC 2-2) ----
    "GAP_PP_001": {
        "description": "Weak password complexity requirements",
        "description_ar": "متطلبات تعقيد كلمة المرور ضعيفة",
        "domain": "password_policy",
        "ecc_control": "2-2-3-1",
        "iso_control": "5.17",
        "severity_weight": 3,
        "compliant_criteria": "Min 12 chars, 3 of 4 character types (upper, lower, digits, special), prohibits personal info and dictionary words",
        "non_compliant_example": "Min 4-8 chars, only letters allowed, allows personal info in passwords"
    },
    "GAP_PP_002": {
        "description": "Inadequate password expiration policy",
        "description_ar": "سياسة انتهاء صلاحية كلمة المرور غير كافية",
        "domain": "password_policy",
        "ecc_control": "2-2-3-1",
        "iso_control": "5.17",
        "severity_weight": 2,
        "compliant_criteria": "Passwords expire every 90 days max, last 12 passwords cannot be reused",
        "non_compliant_example": "No expiration, 365+ day expiration, password history of 3 or less"
    },
    "GAP_PP_003": {
        "description": "Weak account lockout policy",
        "description_ar": "سياسة قفل الحساب ضعيفة",
        "domain": "password_policy",
        "ecc_control": "2-2-3-1",
        "iso_control": "8.5",
        "severity_weight": 2,
        "compliant_criteria": "Account locks after 5 failed attempts, 30-minute lockout duration",
        "non_compliant_example": "No lockout policy, 20+ attempts allowed, 5-minute lockout"
    },
    "GAP_PP_004": {
        "description": "Missing Multi-Factor Authentication (MFA) requirements",
        "description_ar": "متطلبات المصادقة متعددة العوامل مفقودة",
        "domain": "password_policy",
        "ecc_control": "2-2-3-2",
        "iso_control": "8.5",
        "severity_weight": 4,
        "compliant_criteria": "MFA mandatory for remote access, privileged accounts, and admin systems; approved methods specified (FIDO2, TOTP, biometrics)",
        "non_compliant_example": "No mention of MFA, or MFA only optional/recommended"
    },
    "GAP_PP_005": {
        "description": "Missing Privileged Access Management",
        "description_ar": "إدارة الوصول المميز مفقودة",
        "domain": "password_policy",
        "ecc_control": "2-2-3-4",
        "iso_control": "8.2",
        "severity_weight": 4,
        "compliant_criteria": "PAM solution with JIT access, session recording, least privilege, separate admin accounts, quarterly review",
        "non_compliant_example": "No PAM mentioned, shared admin accounts, no session monitoring"
    },
    "GAP_PP_006": {
        "description": "Missing password encryption/storage requirements",
        "description_ar": "متطلبات تشفير وتخزين كلمات المرور مفقودة",
        "domain": "password_policy",
        "ecc_control": "2-2-3-1",
        "iso_control": "8.5",
        "severity_weight": 3,
        "compliant_criteria": "Passwords hashed with Argon2/bcrypt/scrypt + salt, transmission over TLS 1.2+, no plaintext storage",
        "non_compliant_example": "No encryption mentioned, plaintext storage, no secure transmission requirements"
    },
    "GAP_PP_007": {
        "description": "Missing periodic review schedule",
        "description_ar": "جدول المراجعة الدورية مفقود",
        "domain": "password_policy",
        "ecc_control": "2-2-3-5",
        "iso_control": "5.15",
        "severity_weight": 2,
        "compliant_criteria": "Quarterly policy review by CISO, covers effectiveness, emerging threats, regulatory updates",
        "non_compliant_example": "No review schedule, annual-only, ad-hoc reviews"
    },
    "GAP_PP_008": {
        "description": "Missing or vague roles and responsibilities",
        "description_ar": "أدوار ومسؤوليات مفقودة أو غامضة",
        "domain": "password_policy",
        "ecc_control": "2-2-3-5",
        "iso_control": "5.15",
        "severity_weight": 2,
        "compliant_criteria": "Clear CISO, IT Security, HR, and employee responsibilities defined for policy enforcement",
        "non_compliant_example": "Vague 'IT handles security', no specific roles, missing CISO responsibilities"
    },
    # ---- RISK ASSESSMENT GAPS (ECC 1-5) ----
    "GAP_RA_001": {
        "description": "Missing documented risk methodology",
        "description_ar": "منهجية تقييم المخاطر الموثقة مفقودة",
        "domain": "risk_assessment",
        "ecc_control": "1-5-1",
        "iso_control": "6.1.2",
        "severity_weight": 4,
        "compliant_criteria": "Formal risk methodology documented and approved by senior management, includes qualitative and quantitative approaches",
        "non_compliant_example": "No formal methodology, ad-hoc 'we look into issues', no approval process"
    },
    "GAP_RA_002": {
        "description": "Missing risk identification procedures",
        "description_ar": "إجراءات تحديد المخاطر مفقودة",
        "domain": "risk_assessment",
        "ecc_control": "1-5-2",
        "iso_control": "6.1.2",
        "severity_weight": 3,
        "compliant_criteria": "Documented procedures for asset identification/valuation, threat identification, and vulnerability identification",
        "non_compliant_example": "No asset inventory, no threat catalog, no vulnerability scanning process"
    },
    "GAP_RA_003": {
        "description": "Missing likelihood/impact assessment scales",
        "description_ar": "مقاييس تقييم الاحتمالية والتأثير مفقودة",
        "domain": "risk_assessment",
        "ecc_control": "1-5-2",
        "iso_control": "6.1.2",
        "severity_weight": 3,
        "compliant_criteria": "Defined 5-point likelihood and impact scales, risk matrix mapping combined scores to risk levels",
        "non_compliant_example": "No defined scales, subjective H/M/L without criteria, no risk scoring matrix"
    },
    "GAP_RA_004": {
        "description": "Missing risk treatment options",
        "description_ar": "خيارات معالجة المخاطر مفقودة",
        "domain": "risk_assessment",
        "ecc_control": "1-5-2",
        "iso_control": "6.1.3",
        "severity_weight": 3,
        "compliant_criteria": "Four treatment options (Accept, Mitigate, Transfer, Avoid) with selection criteria and documented treatment plans",
        "non_compliant_example": "No treatment options defined, 'take appropriate action' without specifics"
    },
    "GAP_RA_005": {
        "description": "Missing mandatory risk assessment triggers",
        "description_ar": "محفزات تقييم المخاطر الإلزامية مفقودة",
        "domain": "risk_assessment",
        "ecc_control": "1-5-3",
        "iso_control": "8.2",
        "severity_weight": 4,
        "compliant_criteria": "Mandatory triggers: early-stage tech projects, before major infra changes, during third-party planning, before new service releases",
        "non_compliant_example": "No triggers, only periodic/ad-hoc assessments, 'when needed' without specifics"
    },
    "GAP_RA_006": {
        "description": "Missing risk register requirements",
        "description_ar": "متطلبات سجل المخاطر مفقودة",
        "domain": "risk_assessment",
        "ecc_control": "1-5-2",
        "iso_control": "6.1.2",
        "severity_weight": 2,
        "compliant_criteria": "Risk register with risk ID, description, owner, likelihood, impact, score, treatment, status, and review date",
        "non_compliant_example": "No risk register, or register missing critical fields like owner/treatment/status"
    },
    "GAP_RA_007": {
        "description": "Missing periodic review schedule",
        "description_ar": "جدول المراجعة الدورية مفقود",
        "domain": "risk_assessment",
        "ecc_control": "1-5-4",
        "iso_control": "8.2",
        "severity_weight": 2,
        "compliant_criteria": "Annual review minimum, review triggered by regulatory changes, defined review authority",
        "non_compliant_example": "No review schedule, reviews only when problems arise"
    },
    "GAP_RA_008": {
        "description": "Missing integration with project management",
        "description_ar": "التكامل مع إدارة المشاريع مفقود",
        "domain": "risk_assessment",
        "ecc_control": "1-5-3",
        "iso_control": "8.2",
        "severity_weight": 2,
        "compliant_criteria": "Risk assessment integrated into project management gates (initiation, planning, go-live), BCM integration",
        "non_compliant_example": "Risk assessment is standalone, not tied to project lifecycle or business continuity"
    },
}

ALL_GAP_IDS = list(GAP_DEFINITIONS.keys())
PP_GAP_IDS = [g for g in ALL_GAP_IDS if g.startswith("GAP_PP")]
RA_GAP_IDS = [g for g in ALL_GAP_IDS if g.startswith("GAP_RA")]
NUM_GAPS = len(ALL_GAP_IDS)

# ECC and ISO control references (for report metadata)
ECC_CONTROLS = {
    "password_policy": {
        "control_id": "2-2 Identity and Access Management",
        "objective": "Protect logical access to information and technology assets, prevent unauthorized access.",
    },
    "risk_assessment": {
        "control_id": "1-5 Cybersecurity Risk Management",
        "objective": "Manage cybersecurity risks methodologically to protect information and technology assets.",
    }
}

# ============================================================
# SAMPLE PROFILES — Define what gap combinations to generate
# ============================================================
# Each profile specifies: domain coverage, gap count range, and target compliance level.
# The generator randomly selects specific gaps within these constraints.

SAMPLE_PROFILES = [
    # --- COMPLIANT (0 gaps) ~25% of dataset ---
    {"name": "pp_clean",       "domains": ["password_policy"],                    "gap_range": (0, 0), "compliance": "compliant"},
    {"name": "ra_clean",       "domains": ["risk_assessment"],                    "gap_range": (0, 0), "compliance": "compliant"},
    {"name": "mixed_clean",    "domains": ["password_policy", "risk_assessment"], "gap_range": (0, 0), "compliance": "compliant"},

    # --- PARTIALLY COMPLIANT: MINOR (1-2 gaps) ~20% ---
    {"name": "pp_minor",       "domains": ["password_policy"],                    "gap_range": (1, 2), "compliance": "partially_compliant"},
    {"name": "ra_minor",       "domains": ["risk_assessment"],                    "gap_range": (1, 2), "compliance": "partially_compliant"},
    {"name": "mixed_minor",    "domains": ["password_policy", "risk_assessment"], "gap_range": (1, 3), "compliance": "partially_compliant"},

    # --- PARTIALLY COMPLIANT: MODERATE (3-5 gaps) ~20% ---
    {"name": "pp_moderate",    "domains": ["password_policy"],                    "gap_range": (3, 5), "compliance": "partially_compliant"},
    {"name": "ra_moderate",    "domains": ["risk_assessment"],                    "gap_range": (3, 5), "compliance": "partially_compliant"},
    {"name": "mixed_moderate", "domains": ["password_policy", "risk_assessment"], "gap_range": (4, 7), "compliance": "partially_compliant"},

    # --- NON-COMPLIANT: SEVERE (6+ gaps) ~20% ---
    {"name": "pp_severe",      "domains": ["password_policy"],                    "gap_range": (5, 8), "compliance": "non_compliant"},
    {"name": "ra_severe",      "domains": ["risk_assessment"],                    "gap_range": (5, 8), "compliance": "non_compliant"},
    {"name": "mixed_severe",   "domains": ["password_policy", "risk_assessment"], "gap_range": (8, 12), "compliance": "non_compliant"},

    # --- NON-COMPLIANT: CRITICAL (10+ gaps) ~15% ---
    {"name": "mixed_critical", "domains": ["password_policy", "risk_assessment"], "gap_range": (12, 16), "compliance": "non_compliant"},
]

# Variation elements for diversity
VARIATION_ELEMENTS = {
    "industries": [
        "healthcare organization", "financial institution", "government agency",
        "educational institution", "technology company", "energy sector company",
        "telecommunications provider", "retail corporation", "manufacturing company",
        "defense contractor", "research institute", "logistics company"
    ],
    "industries_ar": [
        "منظمة رعاية صحية", "مؤسسة مالية", "جهة حكومية",
        "مؤسسة تعليمية", "شركة تقنية", "شركة قطاع الطاقة",
        "مزود اتصالات", "شركة تجزئة", "شركة تصنيع",
        "مقاول دفاعي", "معهد بحثي", "شركة لوجستية"
    ],
    "company_sizes": [
        "large enterprise (5000+ employees)",
        "medium organization (500-1000 employees)",
        "growing company (100-500 employees)",
        "multinational corporation",
        "regional organization"
    ],
    "company_sizes_ar": [
        "مؤسسة كبيرة (أكثر من 5000 موظف)",
        "منظمة متوسطة (500-1000 موظف)",
        "شركة نامية (100-500 موظف)",
        "شركة متعددة الجنسيات",
        "منظمة إقليمية"
    ],
}


class ComplianceDatasetGenerator:
    """Generator that creates gap-level compliance training samples using Gemini API."""

    DEFAULT_SLEEP = 5  # seconds between API calls
    MAX_RETRIES = 3
    RETRY_DELAY = 30

    def __init__(self, api_key=None, sleep_time=None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found. Set it in environment or pass to constructor.")

        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-2.5-flash"
        self.dataset = []
        self.sleep_time = sleep_time or self.DEFAULT_SLEEP
        self.output_dir = None

        # Token tracking
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    # ---- GAP SELECTION ----

    def _select_gaps(self, profile):
        """
        Randomly select which gaps are present/absent based on profile constraints.
        Returns (gaps_present, gaps_absent) as lists of gap IDs.
        """
        domains = profile["domains"]
        gap_min, gap_max = profile["gap_range"]

        # Determine which gaps are eligible based on domains covered
        eligible_gaps = []
        for gap_id, gap_def in GAP_DEFINITIONS.items():
            if gap_def["domain"] in domains:
                eligible_gaps.append(gap_id)

        # Select how many gaps to include
        num_gaps = random.randint(gap_min, min(gap_max, len(eligible_gaps)))

        # Randomly pick which gaps are present
        gaps_present = sorted(random.sample(eligible_gaps, num_gaps)) if num_gaps > 0 else []
        gaps_absent = sorted([g for g in eligible_gaps if g not in gaps_present])

        return gaps_present, gaps_absent

    # ---- PROMPT BUILDING ----

    def _get_variation_context(self, language, variation_num):
        """Generate unique context for each sample."""
        if language == "en":
            industry = random.choice(VARIATION_ELEMENTS["industries"])
            size = random.choice(VARIATION_ELEMENTS["company_sizes"])
            return f"This policy is for a {industry}, a {size}. Variation #{variation_num}."
        else:
            industry = random.choice(VARIATION_ELEMENTS["industries_ar"])
            size = random.choice(VARIATION_ELEMENTS["company_sizes_ar"])
            return f"هذه السياسة لـ {industry}، {size}. التنوع رقم {variation_num}."

    def _build_generation_prompt(self, gaps_present, gaps_absent, domains, language, variation_ctx):
        """
        Build a prompt that asks Gemini to generate a policy excerpt
        with specific gaps present and specific requirements met.
        """
        domain_names = " and ".join([d.replace("_", " ") for d in domains])

        if language == "en":
            prompt = f"""You are generating training data for a cybersecurity compliance AI model.

Write a policy excerpt (200-400 words) from a cybersecurity policy document that covers: {domain_names}.
Write it as a realistic section from an actual organization's policy — with section numbers, professional tone, specific values.
Context: {variation_ctx}

"""
            if gaps_present:
                prompt += "THE FOLLOWING COMPLIANCE ISSUES MUST BE PRESENT in the text (write it so these problems clearly exist):\n"
                for gap_id in gaps_present:
                    g = GAP_DEFINITIONS[gap_id]
                    prompt += f"- [{gap_id}] {g['description']}: {g['non_compliant_example']}\n"
                prompt += "\n"

            if gaps_absent:
                prompt += "THE FOLLOWING REQUIREMENTS MUST BE PROPERLY ADDRESSED (no issues, fully compliant):\n"
                for gap_id in gaps_absent:
                    g = GAP_DEFINITIONS[gap_id]
                    prompt += f"- [{gap_id}] {g['description']}: {g['compliant_criteria']}\n"
                prompt += "\n"

            if not gaps_present and not gaps_absent:
                prompt += "This excerpt should be FULLY COMPLIANT with all NCA ECC and ISO 27001 requirements for the covered domains.\n\n"

            prompt += """IMPORTANT RULES:
- Output ONLY the policy excerpt text. No explanations, no metadata.
- Write between 200-400 words.
- Use realistic section numbers and professional formatting.
- Do NOT mention gap IDs or that this is training data."""

        else:  # Arabic
            domain_names_ar = " و ".join(["سياسة كلمات المرور" if d == "password_policy" else "تقييم المخاطر" for d in domains])
            prompt = f"""أنت تقوم بإنشاء بيانات تدريب لنموذج ذكاء اصطناعي للامتثال السيبراني.

اكتب مقتطفاً من سياسة (200-400 كلمة) من وثيقة سياسة أمن سيبراني تغطي: {domain_names_ar}.
اكتبه كقسم واقعي من سياسة منظمة حقيقية — مع أرقام أقسام، لهجة مهنية، قيم محددة.
السياق: {variation_ctx}

"""
            if gaps_present:
                prompt += "يجب أن تكون مشاكل الامتثال التالية موجودة في النص (اكتبه بحيث تكون هذه المشاكل واضحة):\n"
                for gap_id in gaps_present:
                    g = GAP_DEFINITIONS[gap_id]
                    prompt += f"- [{gap_id}] {g['description_ar']}: {g['non_compliant_example']}\n"
                prompt += "\n"

            if gaps_absent:
                prompt += "يجب تلبية المتطلبات التالية بشكل صحيح (بدون مشاكل، متوافقة بالكامل):\n"
                for gap_id in gaps_absent:
                    g = GAP_DEFINITIONS[gap_id]
                    prompt += f"- [{gap_id}] {g['description_ar']}: {g['compliant_criteria']}\n"
                prompt += "\n"

            if not gaps_present and not gaps_absent:
                prompt += "يجب أن يكون هذا المقتطف متوافقاً بالكامل مع جميع متطلبات ECC و ISO 27001 للمجالات المغطاة.\n\n"

            prompt += """قواعد مهمة:
- أخرج نص المقتطف فقط. بدون شرح أو بيانات وصفية.
- اكتب بين 200-400 كلمة.
- استخدم أرقام أقسام واقعية وتنسيق مهني.
- لا تذكر معرفات الثغرات أو أن هذا بيانات تدريب."""

        return prompt

    def _build_verification_prompt(self, excerpt, language):
        """Build prompt to verify which gaps exist in a generated excerpt."""
        gap_checklist = json.dumps(
            {gid: g["description"] for gid, g in GAP_DEFINITIONS.items()},
            indent=2, ensure_ascii=False
        )

        if language == "en":
            return f"""Analyze this policy excerpt and determine which compliance gaps are present.

For each gap below, output 1 if the gap EXISTS (the requirement is missing or inadequate) or 0 if the requirement is properly addressed or not applicable to this excerpt.

Gap checklist:
{gap_checklist}

Policy excerpt:
{excerpt}

Respond in JSON only — no extra text:
{{
    "gap_labels": {{"GAP_PP_001": 0 or 1, "GAP_PP_002": 0 or 1, ...all 16 gaps...}},
    "overall_score": 0.0 to 1.0,
    "domains_detected": ["password_policy" and/or "risk_assessment"]
}}"""
        else:
            return f"""حلل هذا المقتطف من السياسة وحدد الثغرات الموجودة.

لكل ثغرة أدناه، أخرج 1 إذا كانت الثغرة موجودة (المتطلب مفقود أو غير كافٍ) أو 0 إذا كان المتطلب ملبى بشكل صحيح أو غير قابل للتطبيق.

قائمة الثغرات:
{gap_checklist}

مقتطف السياسة:
{excerpt}

أجب بصيغة JSON فقط:
{{
    "gap_labels": {{"GAP_PP_001": 0 or 1, "GAP_PP_002": 0 or 1, ...all 16...}},
    "overall_score": 0.0 to 1.0,
    "domains_detected": ["password_policy" و/أو "risk_assessment"]
}}"""

    # ---- API CALLS ----

    def _call_gemini(self, prompt, temperature=0.9, max_tokens=4096):
        """Call Gemini API with retry logic. Returns (text, input_tokens, output_tokens)."""
        contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]
        config = types.GenerateContentConfig(
            temperature=temperature,
            top_p=0.95,
            max_output_tokens=max_tokens,
        )

        for attempt in range(self.MAX_RETRIES):
            try:
                response = self.client.models.generate_content(
                    model=self.model, contents=contents, config=config
                )
                input_tokens = getattr(response.usage_metadata, 'prompt_token_count', 0)
                output_tokens = getattr(response.usage_metadata, 'candidates_token_count', 0)
                return response.text, input_tokens, output_tokens
            except Exception as e:
                error_str = str(e).lower()
                if "rate" in error_str or "quota" in error_str or "429" in error_str:
                    print(f"\n⚠️  Rate limit! Waiting {self.RETRY_DELAY}s (attempt {attempt+1}/{self.MAX_RETRIES})...")
                    time.sleep(self.RETRY_DELAY)
                else:
                    print(f"\n❌ API error (attempt {attempt+1}): {e}")
                    if attempt < self.MAX_RETRIES - 1:
                        time.sleep(10)
        return None, 0, 0

    def _parse_json_response(self, text):
        """Extract JSON from API response, handling markdown code blocks."""
        if not text:
            return None
        cleaned = text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0]
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0]
        try:
            return json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return None

    # ---- SAMPLE CREATION ----

    def _compute_score(self, gap_labels):
        """Compute compliance score from gap labels using severity weights."""
        total_weight = sum(g["severity_weight"] for g in GAP_DEFINITIONS.values())
        penalty = sum(
            GAP_DEFINITIONS[gid]["severity_weight"]
            for gid, present in gap_labels.items()
            if present == 1
        )
        return round(max(0.0, 1.0 - (penalty / total_weight)), 2)

    def _determine_compliance(self, gap_labels):
        """Derive compliance level from gap labels."""
        active = sum(1 for v in gap_labels.values() if v == 1)
        high_severity = sum(
            1 for gid, v in gap_labels.items()
            if v == 1 and GAP_DEFINITIONS[gid]["severity_weight"] >= 4
        )
        if active == 0:
            return "compliant"
        elif high_severity >= 2 or active >= 6:
            return "non_compliant"
        else:
            return "partially_compliant"

    def create_sample(self, profile, language, variation_num):
        """
        Create a single labeled sample.
        1. Select gaps based on profile
        2. Generate excerpt via Gemini
        3. Verify gaps via Gemini
        4. Return structured sample
        """
        # Step 1: Select gaps
        gaps_present, gaps_absent = self._select_gaps(profile)
        variation_ctx = self._get_variation_context(language, variation_num)

        print(f"  Generating {profile['name']} ({language}, var #{variation_num}): "
              f"{len(gaps_present)} gaps targeted...")

        # Step 2: Generate excerpt
        gen_prompt = self._build_generation_prompt(
            gaps_present, gaps_absent, profile["domains"], language, variation_ctx
        )
        excerpt, gen_in, gen_out = self._call_gemini(gen_prompt, temperature=0.95, max_tokens=4096)

        if not excerpt:
            print("    ❌ Generation failed")
            return None

        print(f"    📝 Generated ({gen_in}+{gen_out} tokens)")

        # Rate limit pause
        time.sleep(self.sleep_time)

        # Step 3: Verify gaps
        verify_prompt = self._build_verification_prompt(excerpt, language)
        verify_text, ver_in, ver_out = self._call_gemini(verify_prompt, temperature=0.1, max_tokens=2048)
        verification = self._parse_json_response(verify_text)

        if not verification or "gap_labels" not in verification:
            # Fallback: use intended gaps as labels
            print("    ⚠️  Verification parse failed, using intended labels")
            gap_labels = {gid: (1 if gid in gaps_present else 0) for gid in ALL_GAP_IDS}
            domains_detected = profile["domains"]
        else:
            gap_labels = verification["gap_labels"]
            # Ensure all 16 gaps are present in labels
            for gid in ALL_GAP_IDS:
                if gid not in gap_labels:
                    gap_labels[gid] = 0
                gap_labels[gid] = int(gap_labels[gid])
            domains_detected = verification.get("domains_detected", profile["domains"])

        print(f"    🔍 Verified ({ver_in}+{ver_out} tokens): "
              f"{sum(gap_labels.values())} gaps detected")

        # Step 4: Track tokens
        total_in = gen_in + ver_in
        total_out = gen_out + ver_out
        self.total_input_tokens += total_in
        self.total_output_tokens += total_out

        # Step 5: Compute derived fields
        overall_score = self._compute_score(gap_labels)
        overall_compliance = self._determine_compliance(gap_labels)
        gap_count = sum(1 for v in gap_labels.values() if v == 1)

        # Build gap_details for JSON (findings/recommendations from definitions)
        gap_details = []
        for gid, present in gap_labels.items():
            if present == 1:
                g = GAP_DEFINITIONS[gid]
                gap_details.append({
                    "gap_id": gid,
                    "description": g["description"],
                    "description_ar": g["description_ar"],
                    "domain": g["domain"],
                    "ecc_control": g["ecc_control"],
                    "iso_control": g["iso_control"],
                    "severity_weight": g["severity_weight"],
                })

        sample = {
            "id": f"{profile['name']}_{language}_{variation_num}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "language": language,
            "policy_excerpt": excerpt,
            "domains_covered": domains_detected,
            "overall_compliance": overall_compliance,
            "overall_score": overall_score,
            "gap_labels": gap_labels,
            "gap_details": gap_details,
            "gap_count": gap_count,
            "profile_name": profile["name"],
            "intended_gaps": gaps_present,
            "variation_context": variation_ctx,
            "generated_at": datetime.now().isoformat(),
            "model_used": self.model,
            "token_usage": {
                "generation_input": gen_in,
                "generation_output": gen_out,
                "verification_input": ver_in,
                "verification_output": ver_out,
                "total": total_in + total_out,
            },
        }

        return sample

    # ---- INCREMENTAL SAVE ----

    def _save_incremental(self, sample):
        if not self.output_dir:
            return
        path = os.path.join(self.output_dir, "incremental_samples.jsonl")
        with open(path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(sample, ensure_ascii=False) + '\n')

    def _load_existing_progress(self, output_dir):
        path = os.path.join(output_dir, "incremental_samples.jsonl")
        existing = []
        if os.path.exists(path):
            print(f"\n📂 Found existing progress: {path}")
            with open(path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            existing.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
            print(f"   Loaded {len(existing)} existing samples")
        return existing

    # ---- MAIN GENERATION ----

    def generate_dataset(self, samples_per_profile=2, languages=None, output_dir="dataset"):
        """
        Generate the full gap-level compliance dataset.

        Args:
            samples_per_profile: Number of variations per profile per language
            languages: List of language codes (default: ["en", "ar"])
            output_dir: Output directory path
        """
        if languages is None:
            languages = ["en", "ar"]

        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        # Load existing progress
        self.dataset = self._load_existing_progress(output_dir)
        existing_ids = {s["id"].rsplit("_", 1)[0] for s in self.dataset}

        # Calculate total work
        total_samples = len(SAMPLE_PROFILES) * len(languages) * samples_per_profile
        print(f"\n{'='*60}")
        print(f"GAP-LEVEL COMPLIANCE DATASET GENERATION")
        print(f"{'='*60}")
        print(f"Profiles: {len(SAMPLE_PROFILES)}")
        print(f"Languages: {languages}")
        print(f"Variations per profile: {samples_per_profile}")
        print(f"Total to generate: {total_samples}")
        print(f"Already completed: {len(self.dataset)}")
        print(f"{'='*60}\n")

        generated = 0
        failed = 0

        for profile in SAMPLE_PROFILES:
            for lang in languages:
                for var_num in range(1, samples_per_profile + 1):
                    # Check if already generated
                    check_id = f"{profile['name']}_{lang}_{var_num}"
                    if check_id in existing_ids:
                        print(f"  ⏭️  Skipping {check_id} (already exists)")
                        continue

                    sample = self.create_sample(profile, lang, var_num)

                    if sample:
                        self.dataset.append(sample)
                        self._save_incremental(sample)
                        generated += 1
                        progress = len(self.dataset)
                        print(f"    ✅ Sample {progress}/{total_samples} saved")
                    else:
                        failed += 1
                        print(f"    ❌ Failed")

                    # Rate limit between samples
                    print(f"    ⏳ Waiting {self.sleep_time}s...")
                    time.sleep(self.sleep_time)

        print(f"\n{'='*60}")
        print(f"GENERATION COMPLETE")
        print(f"{'='*60}")
        print(f"Generated: {generated}")
        print(f"Failed: {failed}")
        print(f"Total dataset: {len(self.dataset)}")
        print(f"Total tokens: {self.total_input_tokens + self.total_output_tokens:,}")
        print(f"  Input:  {self.total_input_tokens:,}")
        print(f"  Output: {self.total_output_tokens:,}")

        return self.dataset

    # ---- SAVE FINAL DATASET ----

    def save_dataset(self, output_dir=None):
        """Save complete dataset in JSON and CSV formats."""
        output_dir = output_dir or self.output_dir or "dataset"
        os.makedirs(output_dir, exist_ok=True)

        if not self.dataset:
            print("No samples to save!")
            return

        # --- JSON (full, with all metadata) ---
        json_path = os.path.join(output_dir, "compliance_dataset.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(self.dataset, f, indent=2, ensure_ascii=False)
        print(f"📄 JSON: {json_path} ({len(self.dataset)} samples)")

        # --- CSV (flat, for ML training) ---
        csv_path = os.path.join(output_dir, "compliance_dataset.csv")
        fieldnames = [
            "id", "language", "policy_excerpt", "overall_compliance",
            "overall_score", "gap_count", "domains_covered",
        ] + ALL_GAP_IDS

        with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for sample in self.dataset:
                row = {
                    "id": sample["id"],
                    "language": sample["language"],
                    "policy_excerpt": sample["policy_excerpt"],
                    "overall_compliance": sample["overall_compliance"],
                    "overall_score": sample["overall_score"],
                    "gap_count": sample["gap_count"],
                    "domains_covered": "|".join(sample["domains_covered"]),
                }
                for gid in ALL_GAP_IDS:
                    row[gid] = sample["gap_labels"].get(gid, 0)
                writer.writerow(row)
        print(f"📊 CSV: {csv_path}")

        # --- Statistics ---
        stats = self._compute_statistics()
        stats_path = os.path.join(output_dir, "dataset_statistics.json")
        with open(stats_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
        print(f"📈 Stats: {stats_path}")

        print(f"\nDataset saved to: {output_dir}/")

    def _compute_statistics(self):
        """Compute dataset statistics."""
        total = len(self.dataset)
        if total == 0:
            return {}

        # Compliance distribution
        compliance_dist = {}
        for s in self.dataset:
            c = s["overall_compliance"]
            compliance_dist[c] = compliance_dist.get(c, 0) + 1

        # Language distribution
        lang_dist = {}
        for s in self.dataset:
            l = s["language"]
            lang_dist[l] = lang_dist.get(l, 0) + 1

        # Gap frequency
        gap_freq = {gid: 0 for gid in ALL_GAP_IDS}
        for s in self.dataset:
            for gid, val in s["gap_labels"].items():
                if val == 1:
                    gap_freq[gid] = gap_freq.get(gid, 0) + 1

        # Gap count distribution
        gap_count_dist = {}
        for s in self.dataset:
            gc = s["gap_count"]
            gap_count_dist[gc] = gap_count_dist.get(gc, 0) + 1

        # Domain coverage
        domain_dist = {"password_policy_only": 0, "risk_assessment_only": 0, "both": 0}
        for s in self.dataset:
            d = sorted(s["domains_covered"])
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
            "gap_count_distribution": {str(k): v for k, v in sorted(gap_count_dist.items())},
            "avg_gap_count": round(sum(s["gap_count"] for s in self.dataset) / total, 2),
            "avg_score": round(sum(s["overall_score"] for s in self.dataset) / total, 2),
            "total_tokens_used": self.total_input_tokens + self.total_output_tokens,
        }


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Gap-Level Compliance Dataset Generator (resume-safe)"
    )
    parser.add_argument(
        "--samples-per-profile", type=int, default=10,
        help="Number of variations per profile per language (default: 10). "
             "Increase to generate more samples — existing ones are skipped automatically."
    )
    parser.add_argument(
        "--output-dir", type=str, default=None,
        help="Output directory (default: ml/datasets/processed relative to script)"
    )
    parser.add_argument(
        "--languages", nargs="+", default=["en", "ar"],
        help="Languages to generate (default: en ar)"
    )
    parser.add_argument(
        "--sleep", type=int, default=None,
        help="Seconds between API calls (default: 5)"
    )
    args = parser.parse_args()

    # Resolve output directory to ml/datasets/processed by default
    if args.output_dir:
        output_dir = args.output_dir
    else:
        script_dir = Path(__file__).resolve().parent
        output_dir = str(script_dir.parent / "datasets" / "processed")

    total_expected = len(SAMPLE_PROFILES) * len(args.languages) * args.samples_per_profile
    print("🚀 Gap-Level Compliance Dataset Generator")
    print("=" * 50)
    print(f"Target: {len(SAMPLE_PROFILES)} profiles × {len(args.languages)} langs × {args.samples_per_profile} variations = {total_expected} samples")
    print(f"Output: {output_dir}")

    generator = ComplianceDatasetGenerator(sleep_time=args.sleep)

    # Resume-safe: skips already-generated samples automatically
    # Each sample requires 2 API calls (generate + verify)
    dataset = generator.generate_dataset(
        samples_per_profile=args.samples_per_profile,
        languages=args.languages,
        output_dir=output_dir,
    )

    # Save final dataset (JSON + CSV + statistics)
    generator.save_dataset()

    print("\n✅ Done!")
