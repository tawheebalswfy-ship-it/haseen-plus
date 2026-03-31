"""
Test the deployed ISO Policy Gap Detector API on Cloud Run.
"""

import requests
import json

API_URL = "https://ecc-model-host-636663078359.me-central1.run.app"


def test_health_check():
    print("\n" + "=" * 60)
    print("Testing Health Check")
    print("=" * 60)

    response = requests.get(f"{API_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_analyze_compliant():
    print("\n" + "=" * 60)
    print("Testing: Compliant Password Policy")
    print("=" * 60)

    text = (
        "## Password Policy\n\n"
        "Passwords must be at least 12 characters with uppercase, lowercase, "
        "digits, and special characters. Passwords expire every 90 days with "
        "12-password history. Accounts lock after 5 failed attempts for 30 min. "
        "MFA is mandatory for remote and privileged access. PAM enforces JIT "
        "access and session recording. Passwords hashed with Argon2/bcrypt. "
        "Policy reviewed quarterly by CISO. CISO owns policy, IT Security "
        "implements, HR handles onboarding, all employees must comply."
    )

    response = requests.post(f"{API_URL}/analyze", json={"text": text})
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Compliance:  {data['overall_compliance']}")
        print(f"  Score:       {data['overall_score']}")
        print(f"  Gaps:        {data['gap_count']}")
        print(f"  Domains:     {data['domains_detected']}")
        print(f"  Time:        {data['inference_time_ms']:.2f}ms")
    else:
        print(f"✗ Error: {response.status_code} — {response.text}")


def test_analyze_noncompliant():
    print("\n" + "=" * 60)
    print("Testing: Non-Compliant Policy (many gaps)")
    print("=" * 60)

    text = "Users should choose passwords. No specific requirements."

    response = requests.post(f"{API_URL}/analyze", json={"text": text})
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Compliance:  {data['overall_compliance']}")
        print(f"  Score:       {data['overall_score']}")
        print(f"  Gap count:   {data['gap_count']}")
        print(f"  PP gaps:     {data['password_policy']['gaps_detected']}")
        print(f"  RA gaps:     {data['risk_assessment']['gaps_detected']}")
        print(f"  Time:        {data['inference_time_ms']:.2f}ms")
        if data['password_policy']['details']:
            for d in data['password_policy']['details']:
                print(f"    {d['gap_id']}: {d['description']} ({d['confidence']:.0%})")
    else:
        print(f"✗ Error: {response.status_code} — {response.text}")


def test_analyze_arabic():
    print("\n" + "=" * 60)
    print("Testing: Arabic Policy Document")
    print("=" * 60)

    text = (
        "## سياسة كلمة المرور\n\n"
        "يجب أن تتكون كلمة المرور من 12 حرفاً على الأقل مع أحرف كبيرة وصغيرة وأرقام ورموز. "
        "تنتهي صلاحية كلمة المرور كل 90 يوماً."
    )

    response = requests.post(f"{API_URL}/analyze", json={"text": text})
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Compliance:  {data['overall_compliance']}")
        print(f"  Score:       {data['overall_score']}")
        print(f"  Gaps:        {data['gap_count']}")
        print(f"  Domains:     {data['domains_detected']}")
        print(f"  PP gaps:     {data['password_policy']['gaps_detected']}")
        print(f"  RA gaps:     {data['risk_assessment']['gaps_detected']}")
        print(f"  PP score:    {data['password_policy']['score']}")
        print(f"  RA score:    {data['risk_assessment']['score']}")
        print(f"  Time:        {data['inference_time_ms']:.2f}ms")
    else:
        print(f"✗ Error: {response.status_code} — {response.text}")


def test_full_report():
    print("\n" + "=" * 60)
    print("Testing: Full JSON Response Structure")
    print("=" * 60)

    text = "Password policy: minimum 8 characters. No MFA required. No risk assessment performed."

    response = requests.post(f"{API_URL}/analyze", json={"text": text})
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
        # Verify structure
        assert "overall_compliance" in data
        assert "overall_score" in data
        assert "password_policy" in data
        assert "risk_assessment" in data
        assert "all_gap_probabilities" in data
        assert len(data["all_gap_probabilities"]) == 16
        print("\n✓ Response structure valid")
    else:
        print(f"✗ Error: {response.status_code} — {response.text}")


if __name__ == "__main__":
    test_health_check()
    test_analyze_compliant()
    test_analyze_noncompliant()
    test_analyze_arabic()
    test_full_report()
    print("\n" + "=" * 60)
    print("✓ All deployed API tests completed!")
    print("=" * 60)
