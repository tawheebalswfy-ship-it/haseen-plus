# Policy Analysis Test Samples

Use these samples to verify pasted text, TXT upload, and DOCX upload flows across Policies, Overview, Risk Dashboard, Remediation, Assessments, and domain coverage.

## A. Fully Compliant Policy

Expected result: score = 100, status = Compliant, gap_count = 0.

The organization maintains a cybersecurity governance policy approved by executive management. Passwords must be at least 14 characters and include complexity requirements. Multi-factor authentication is mandatory for remote access, privileged accounts, administrative consoles, and critical business applications. Account lockout is enforced after repeated failed attempts. Privileged access is managed through approved PAM workflows, reviewed monthly, and removed when no longer required. Passwords and authentication secrets are encrypted in storage and transit.

Cybersecurity risk management follows a documented methodology with defined likelihood and impact scales. Risks are identified through threat modeling, vulnerability assessment, asset review, supplier review, and project security review. All risks are recorded in a risk register with owner, treatment option, due date, residual risk, approval, and review date. Risk assessments are performed annually and whenever major systems, vendors, business processes, or threats change. Risk treatment options include mitigate, transfer, avoid, or accept with formal approval.

Asset inventory, data classification, encryption, logging, monitoring, incident response, business continuity, third-party security, and vulnerability management controls are documented, assigned, tested, reviewed, and evidenced.

## B. Partially Compliant Policy

Expected result: score between 1 and 99, status = Partially Compliant, some gaps.

The organization performs cybersecurity risk reviews for important systems and keeps a list of major business risks. Risk owners discuss impact and likelihood during review meetings, and high risks are escalated to management. Passwords are required for all users and must not be shared. User access is reviewed periodically for important applications.

The policy does not define a complete risk assessment methodology. It does not require a formal risk register for all assessed risks. Risk treatment options are discussed by management, but the policy does not document mandatory treatment choices or approval criteria. Multi-factor authentication is used for some remote users, but privileged access and administrator accounts are not consistently covered.

## C. Fully Non-Compliant Policy

Expected result: score = 0, status = Non-Compliant, affected domains >= 8, many gaps.

No password policy. No MFA. No account lockout. No privileged access management. Passwords may be short and simple, and password storage requirements are not documented.

No risk assessment. No risk management methodology. No risk register. No likelihood scale. No impact scale. No risk treatment process. No mandatory triggers for reassessment.

No access review. No access control review. No asset inventory. No data classification. No backups. No business continuity. No disaster recovery.

No encryption. The organization does not encrypt sensitive data. No incident response. No incident response plan. No log monitoring. The organization does not collect logs and does not monitor logs.

No vendor security review. The organization does not assess vendors. No third party security review. No vulnerability scanning. The organization does not perform vulnerability scanning. No vulnerability management and no patching process are documented.

Official demo text:

Users may choose any password length or format. Password complexity is not required, password expiration is optional, multi-factor authentication is not required, password reuse is allowed, and temporary passwords may be sent by email.

Risk assessments are performed only when needed. No formal methodology exists, risks are not documented consistently, there is no risk register, and management approval is not required.

Access requests may be approved verbally, users may share accounts, privileged accounts are used for daily work, access reviews are not performed, and terminated users may retain access temporarily.

No complete asset inventory is maintained, ownership is not assigned, asset classification is not required, cloud resources may be deployed without registration, and reconciliation is not performed.

No business continuity plan exists, backups are not guaranteed, restore tests are not performed, Recovery Time Objective and Recovery Point Objective are not defined, and recovery responsibilities are unclear.

Data classification is not required, sensitive data may be stored without encryption, retention periods are not defined, deletion procedures are not documented, and company files may be stored locally without restriction.

Incidents are handled informally, no response plan exists, escalation is handled case by case, no exercises are conducted, and lessons learned are not tracked.

Logs are collected only on some systems, there is no central logging platform, log retention is not enforced, alerts are not formally reviewed, and no SIEM tuning process exists.

Vendors are selected mainly by cost, security assessments are not required, contracts may not include security clauses, vendor access is not reviewed, and offboarding is not documented.

Vulnerability scans are occasional, patch timelines are not defined, critical vulnerabilities may remain open indefinitely, exceptions are not documented, and risk acceptance is not required.
