export interface PolicyDomainConfig {
  id: string;
  label: string;
  arabicLabel: string;
  description: string;
  riskWeight: number;
}

export const POLICY_DOMAINS: PolicyDomainConfig[] = [
  {
    id: "password_policy",
    label: "Password Policy",
    arabicLabel: "سياسة كلمات المرور",
    description: "Password complexity, rotation, lockout, and authentication requirements.",
    riskWeight: 0.9,
  },
  {
    id: "risk_assessment",
    label: "Risk Assessment",
    arabicLabel: "تقييم المخاطر",
    description: "Risk identification, scoring, treatment, ownership, and review practices.",
    riskWeight: 0.95,
  },
  {
    id: "access_control",
    label: "Access Control",
    arabicLabel: "التحكم في الوصول",
    description: "User access, least privilege, privileged accounts, and periodic reviews.",
    riskWeight: 0.9,
  },
  {
    id: "asset_management",
    label: "Asset Management",
    arabicLabel: "إدارة الأصول",
    description: "Asset inventory, ownership, classification, and lifecycle controls.",
    riskWeight: 0.75,
  },
  {
    id: "business_continuity",
    label: "Business Continuity",
    arabicLabel: "استمرارية الأعمال",
    description: "Continuity planning, recovery objectives, testing, and resilience.",
    riskWeight: 0.85,
  },
  {
    id: "data_protection",
    label: "Data Protection",
    arabicLabel: "حماية البيانات",
    description: "Data classification, encryption, handling, retention, and privacy controls.",
    riskWeight: 0.9,
  },
  {
    id: "incident_response",
    label: "Incident Response",
    arabicLabel: "الاستجابة للحوادث",
    description: "Incident detection, reporting, response, escalation, and lessons learned.",
    riskWeight: 0.9,
  },
  {
    id: "log_monitoring",
    label: "Log Monitoring",
    arabicLabel: "مراقبة السجلات",
    description: "Security logging, monitoring, alerting, retention, and review.",
    riskWeight: 0.8,
  },
  {
    id: "third_party_security",
    label: "Third-Party Security",
    arabicLabel: "أمن الأطراف الثالثة",
    description: "Supplier due diligence, contractual controls, access, and oversight.",
    riskWeight: 0.8,
  },
  {
    id: "vuln_management",
    label: "Vulnerability Management",
    arabicLabel: "إدارة الثغرات",
    description: "Vulnerability scanning, prioritization, remediation, and verification.",
    riskWeight: 0.85,
  },
];

export const POLICY_DOMAIN_IDS = POLICY_DOMAINS.map((domain) => domain.id);

export const POLICY_DOMAIN_BY_ID = Object.fromEntries(
  POLICY_DOMAINS.map((domain) => [domain.id, domain])
) as Record<string, PolicyDomainConfig>;

export function formatPolicyDomain(id: string, locale: string = "en"): string {
  const domain = POLICY_DOMAIN_BY_ID[id];
  if (!domain) return id.replace(/_/g, " ");
  return locale === "ar" ? domain.arabicLabel : domain.label;
}
