"""
Test the running FastAPI server (local).

Usage:
    1. Start the server:  uvicorn app:app --host 0.0.0.0 --port 8080
    2. Run this script:   python test_api.py
"""

import requests
import json

BASE_URL = "http://localhost:8080"


def test_health():
    resp = requests.get(f"{BASE_URL}/health")
    data = resp.json()
    print("Health:", json.dumps(data, indent=2))
    assert resp.status_code == 200
    assert data["model_type"] == "gap_detection_multilabel"
    assert data["num_gaps"] == 16
    print("✓ Health check passed\n")


def test_analyze_compliant():
    """Test a well-written password policy — should detect few/no gaps."""
    text = """
## Password Policy

### Password Complexity
User passwords must be at least 12 characters, including uppercase, lowercase,
digits, and special characters. Dictionary words and personal info are forbidden.

### Password Expiration
Passwords expire every 90 days. The last 12 passwords cannot be reused.

### Account Lockout
Accounts lock after 5 failed login attempts for 30 minutes.

### Multi-Factor Authentication
MFA is mandatory for all remote access, privileged accounts, and admin systems.
Approved methods: FIDO2 security keys, TOTP, and biometrics.

### Privileged Access Management
PAM solution enforces just-in-time access, session recording, and least privilege.

### Password Storage
Passwords are hashed with Argon2/bcrypt with unique salts. Never stored in plaintext.
Transmission only over TLS 1.2+.

### Review Schedule
This policy is reviewed quarterly by the CISO.

### Roles and Responsibilities
CISO: policy ownership. IT Security: implementation. HR: onboarding. All employees: compliance.
"""
    resp = requests.post(f"{BASE_URL}/analyze", json={"text": text})
    data = resp.json()
    print(f"Compliant policy analysis:")
    print(f"  Compliance:  {data['overall_compliance']}")
    print(f"  Score:       {data['overall_score']}")
    print(f"  Gaps:        {data['gap_count']}")
    print(f"  Chunks:      {data['num_chunks']}")
    print(f"  Domains:     {data['domains_detected']}")
    print(f"  Time:        {data['inference_time_ms']:.1f} ms")
    assert resp.status_code == 200
    print("✓ Compliant policy test passed\n")


def test_analyze_noncompliant():
    """Test a weak policy — should detect multiple gaps."""
    text = """
## Basic Password Rules

Users should choose passwords they can remember. No specific length required.
Passwords do not expire. There is no account lockout mechanism.
We don't use multi-factor authentication currently.
No separate admin accounts are needed.
"""
    resp = requests.post(f"{BASE_URL}/analyze", json={"text": text})
    data = resp.json()
    print(f"Non-compliant policy analysis:")
    print(f"  Compliance:  {data['overall_compliance']}")
    print(f"  Score:       {data['overall_score']}")
    print(f"  Gaps:        {data['gap_count']}")
    print(f"  PP gaps:     {data['password_policy']['gaps_detected']}")
    print(f"  RA gaps:     {data['risk_assessment']['gaps_detected']}")
    print(f"  Time:        {data['inference_time_ms']:.1f} ms")
    if data['password_policy']['details']:
        print(f"  PP details:")
        for d in data['password_policy']['details']:
            print(f"    {d['gap_id']}: {d['description']} ({d['confidence']:.2%})")
    assert resp.status_code == 200
    print("✓ Non-compliant policy test passed\n")


def test_analyze_mixed():
    """Test a document with both password policy and risk assessment content."""
    text = """
## 1. Password Policy

### 1.1 Complexity
Passwords must be at least 12 characters with uppercase, lowercase, digits, specials.

### 1.2 Expiration
Passwords expire every 90 days with 12-password history.

### 1.3 Lockout
Accounts lock after 5 failed attempts for 30 minutes.

## 2. Risk Assessment Framework

### 2.1 Methodology
The organization uses a qualitative risk assessment methodology with 5x5 matrix.

### 2.2 Risk Identification
Threats and vulnerabilities are identified through annual reviews and threat intelligence.

### 2.3 Impact Scales
Impact rated 1-5. Likelihood rated 1-5. Risk = Impact x Likelihood.

### 2.4 Treatment
Risks can be accepted, mitigated, transferred, or avoided.
"""
    resp = requests.post(f"{BASE_URL}/analyze", json={"text": text})
    data = resp.json()
    print(f"Mixed policy analysis:")
    print(f"  Compliance:  {data['overall_compliance']}")
    print(f"  Score:       {data['overall_score']}")
    print(f"  Gaps:        {data['gap_count']}")
    print(f"  Domains:     {data['domains_detected']}")
    print(f"  PP score:    {data['password_policy']['score']}")
    print(f"  RA score:    {data['risk_assessment']['score']}")
    print(f"  Time:        {data['inference_time_ms']:.1f} ms")
    assert resp.status_code == 200
    assert "password_policy" in data["domains_detected"]
    assert "risk_assessment" in data["domains_detected"]
    print("✓ Mixed policy test passed\n")


if __name__ == "__main__":
    test_health()
    test_analyze_compliant()
    test_analyze_noncompliant()
    test_analyze_mixed()
    print("=" * 55)
    print("✓ All API tests passed!")
    print("=" * 55)
