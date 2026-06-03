import type { GapDetail } from "./api";
import type { ComplianceAssessment, ControlResult, Policy, RemediationTask } from "../components/compliance/types";
import { DOMAIN_CONTROL_MAP, GAP_CONTROL_MAP, NCA_CONTROLS } from "../components/compliance/types";
import { POLICY_DOMAIN_BY_ID, POLICY_DOMAINS, formatPolicyDomain } from "../config/policyDomains";

export interface PolicyDomainFinding {
  id: string;
  label: string;
  status: "compliant" | "partial" | "non_compliant" | "unknown";
  score?: number;
  gapCount: number;
  findings: string[];
  policies: string[];
}

export function normalizeScore(score?: number | null): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 0;
  const percent = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function getAnalyzedPolicies(policies: Policy[]): Policy[] {
  return policies.filter((policy) => policy.status === "analyzed");
}

export function getPolicyDomains(policy: Policy): string[] {
  const result = policy.analysis_result;
  const domains = new Set<string>();
  const addDomain = (value: unknown) => {
    if (typeof value !== "string") return;
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (POLICY_DOMAIN_BY_ID[normalized]) domains.add(normalized);
  };

  if (policy.category) addDomain(policy.category);
  const detected = result?.domains_detected;
  if (Array.isArray(detected)) detected.forEach(addDomain);

  if (result) {
    Object.keys(result).forEach(addDomain);
    for (const domain of POLICY_DOMAINS) {
      const domainResult = result[domain.id];
      if (domainResult && typeof domainResult === "object") domains.add(domain.id);
    }
  }

  getPolicyGaps(policy).forEach((gap) => detectDomainFromText(`${gap.gap_id} ${gap.description}`)?.forEach((id) => domains.add(id)));

  return Array.from(domains);
}

export function getPolicyGaps(policy: Policy): GapDetail[] {
  const result = policy.analysis_result;
  if (!result) return [];

  const gaps = new Map<string, GapDetail>();
  const addGap = (gap: unknown) => {
    if (!gap || typeof gap !== "object") return;
    const g = gap as Partial<GapDetail>;
    if (!g.gap_id) return;
    const current = gaps.get(g.gap_id);
    const next: GapDetail = {
      gap_id: g.gap_id,
      description: g.description ?? g.gap_id,
      confidence: typeof g.confidence === "number" ? g.confidence : 0,
    };
    if (!current || next.confidence > current.confidence) gaps.set(next.gap_id, next);
  };

  const flatGaps = result.gaps_detected;
  if (Array.isArray(flatGaps)) flatGaps.forEach(addGap);

  for (const key of POLICY_DOMAINS.map((domain) => domain.id)) {
    const domainResult = result[key];
    if (domainResult && typeof domainResult === "object") {
      const details = (domainResult as Record<string, unknown>).details;
      if (Array.isArray(details)) details.forEach(addGap);
    }
  }

  return Array.from(gaps.values());
}

function detectDomainFromText(text: string): string[] {
  const value = text.toLowerCase().replace(/[\s-]+/g, "_");
  const matches = new Set<string>();
  for (const domain of POLICY_DOMAINS) {
    if (value.includes(domain.id)) matches.add(domain.id);
  }

  const keywordMap: Record<string, string[]> = {
    password_policy: ["password", "mfa", "authentication", "lockout", "credential"],
    risk_assessment: ["risk", "likelihood", "impact", "treatment"],
    access_control: ["access", "privilege", "permission", "authorization", "iam"],
    asset_management: ["asset", "inventory", "classification"],
    business_continuity: ["continuity", "recovery", "backup", "rto", "rpo"],
    data_protection: ["data", "encryption", "privacy", "retention"],
    incident_response: ["incident", "response", "escalation"],
    log_monitoring: ["log", "monitoring", "alert", "siem"],
    third_party_security: ["third_party", "supplier", "vendor", "contractor"],
    vuln_management: ["vulnerability", "vulnerabilities", "patch", "scan"],
  };

  for (const [domainId, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((keyword) => value.includes(keyword))) matches.add(domainId);
  }

  return Array.from(matches);
}

function getDomainScore(policy: Policy, domainId: string): number | undefined {
  const domainResult = policy.analysis_result?.[domainId];
  if (!domainResult || typeof domainResult !== "object") return undefined;
  const rawScore = (domainResult as Record<string, unknown>).score;
  return typeof rawScore === "number" ? normalizeScore(rawScore) : undefined;
}

export function getPolicyDomainFindings(policies: Policy[], locale: string = "en"): PolicyDomainFinding[] {
  const analyzed = getAnalyzedPolicies(policies);
  const findingsByDomain = new Map<string, PolicyDomainFinding>();

  const ensure = (domainId: string): PolicyDomainFinding => {
    const existing = findingsByDomain.get(domainId);
    if (existing) return existing;
    const next: PolicyDomainFinding = {
      id: domainId,
      label: formatPolicyDomain(domainId, locale),
      status: "unknown",
      gapCount: 0,
      findings: [],
      policies: [],
    };
    findingsByDomain.set(domainId, next);
    return next;
  };

  for (const policy of analyzed) {
    const domains = getPolicyDomains(policy);
    const gaps = getPolicyGaps(policy);
    for (const domainId of domains) {
      const item = ensure(domainId);
      if (!item.policies.includes(policy.title)) item.policies.push(policy.title);
      const score = getDomainScore(policy, domainId);
      if (score !== undefined) item.score = item.score === undefined ? score : Math.round((item.score + score) / 2);
    }

    for (const gap of gaps) {
      const gapDomains = detectDomainFromText(`${gap.gap_id} ${gap.description}`);
      for (const domainId of gapDomains) {
        const item = ensure(domainId);
        if (!item.policies.includes(policy.title)) item.policies.push(policy.title);
        item.gapCount += 1;
        item.findings.push(`${gap.gap_id}: ${gap.description}`);
      }
    }
  }

  return Array.from(findingsByDomain.values()).map((item) => {
    const score = item.score;
    const status = item.gapCount > 0
      ? item.gapCount >= 2 ? "non_compliant" : "partial"
      : score === undefined ? "unknown" : score >= 85 ? "compliant" : score >= 60 ? "partial" : "non_compliant";
    return { ...item, status };
  });
}

export function getPolicyGapCount(policy: Policy): number {
  const resultCount = policy.analysis_result?.gap_count;
  if (typeof resultCount === "number") return resultCount;
  return getPolicyGaps(policy).length;
}

export function getPolicyMetrics(policies: Policy[]) {
  const analyzed = getAnalyzedPolicies(policies);
  const totalScore = analyzed.reduce((sum, policy) => sum + normalizeScore(policy.compliance_score), 0);
  const average = analyzed.length > 0 ? Math.round(totalScore / analyzed.length) : 0;

  return {
    totalPolicies: policies.length,
    policiesAnalyzed: analyzed.length,
    overallCompliance: average,
    averageComplianceScore: average,
    gapsIdentified: analyzed.reduce((sum, policy) => sum + getPolicyGapCount(policy), 0),
  };
}

export function buildPolicyAssessment(policy: Policy): ComplianceAssessment {
  const controls = NCA_CONTROLS.ECC || [];
  const domains = new Set(getPolicyDomains(policy));
  const gaps = getPolicyGaps(policy);
  const gapsPerControl = new Map<string, GapDetail[]>();
  const coverableControlIds = new Set<string>();

  domains.forEach((domain) => {
    (DOMAIN_CONTROL_MAP[domain] || []).forEach((controlId) => coverableControlIds.add(controlId));
  });

  gaps.forEach((gap) => {
    const controlId = GAP_CONTROL_MAP[gap.gap_id];
    if (!controlId) return;
    if (!gapsPerControl.has(controlId)) gapsPerControl.set(controlId, []);
    gapsPerControl.get(controlId)!.push(gap);
    coverableControlIds.add(controlId);
  });

  const results: ControlResult[] = controls.map((control) => {
    if (!coverableControlIds.has(control.id)) {
      return {
        control_id: control.id,
        control_name: control.name,
        domain: control.domain,
        status: "not_assessed",
        score: 0,
        findings: "Not covered by detected policy domains.",
        evidence_files: [],
      };
    }

    const controlGaps = gapsPerControl.get(control.id) || [];
    if (controlGaps.length === 0) {
      return {
        control_id: control.id,
        control_name: control.name,
        domain: control.domain,
        status: "compliant",
        score: 100,
        findings: "No compliance gaps detected for this control.",
        evidence_files: [],
      };
    }

    const avgConfidence = controlGaps.reduce((sum, gap) => sum + gap.confidence, 0) / controlGaps.length;
    const findings = controlGaps
      .map((gap) => `${gap.gap_id}: ${gap.description} (${Math.round(gap.confidence * 100)}%)`)
      .join("; ");

    return {
      control_id: control.id,
      control_name: control.name,
      domain: control.domain,
      status: avgConfidence >= 0.7 ? "non_compliant" : "partial",
      score: avgConfidence >= 0.7 ? Math.round((1 - avgConfidence) * 30) : Math.round((1 - avgConfidence) * 70),
      findings: `${avgConfidence >= 0.7 ? "Gaps" : "Partial gaps"}: ${findings}`,
      evidence_files: [],
    };
  });

  return {
    id: `policy-${policy.id}`,
    name: policy.title,
    framework: "ECC",
    status: "completed",
    overall_score: normalizeScore(policy.compliance_score),
    policy_status: policy.category,
    detected_domains: getPolicyDomains(policy),
    findings: gaps.map((gap) => `${gap.gap_id}: ${gap.description}`),
    results,
    comments: [],
    created_date: policy.created_date,
  };
}

export function buildPolicyAssessments(policies: Policy[]): ComplianceAssessment[] {
  return getAnalyzedPolicies(policies).map(buildPolicyAssessment);
}

export function buildGapTasksFromPolicies(policies: Policy[]): RemediationTask[] {
  return getAnalyzedPolicies(policies).flatMap((policy) =>
    getPolicyGaps(policy).map((gap) => {
      const controlId = GAP_CONTROL_MAP[gap.gap_id];
      const control = (NCA_CONTROLS.ECC || []).find((item) => item.id === controlId);
      const policyScore = normalizeScore(policy.compliance_score);
      const domain = detectDomainFromText(`${gap.gap_id} ${gap.description}`)[0] || getPolicyDomains(policy)[0];
      const priority: RemediationTask["priority"] =
        policyScore < 60 || gap.confidence >= 0.85 ? "high"
          : policyScore < 85 || gap.confidence >= 0.6 ? "medium"
            : "low";
      const recommendedAction = `Address ${gap.gap_id}: ${gap.description}`;
      return {
        id: `policy-gap-${policy.id}-${gap.gap_id}`,
        title: `Remediate ${formatPolicyDomain(domain || "policy", "en")}`,
        description: `Related policy: ${policy.title}. Domain: ${domain ? formatPolicyDomain(domain, "en") : "Undetected"}. ${recommendedAction}. Due date: Suggested.`,
        control_id: controlId,
        related_policy: policy.title,
        domain,
        recommended_action: recommendedAction,
        priority,
        status: "open",
        due_date: "Suggested",
        ai_guidance: {
          steps: [
            control ? `Review ${control.id} requirements: ${control.description}` : `Review the control mapped to ${gap.gap_id}`,
            recommendedAction,
            "Update the policy and collect evidence",
            "Re-analyze the policy to verify remediation",
          ],
          estimated_effort: gap.confidence >= 0.7 ? "8-20 hours" : "4-10 hours",
          tools_needed: ["GRC Platform", "Document Management System"],
        },
        comments: [],
        created_date: policy.created_date,
      } satisfies RemediationTask;
    })
  );
}
