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

export interface DomainCoverage {
  id: string;
  label: string;
  assessed: boolean;
  status: "compliant" | "needs_attention" | "not_assessed";
  score?: number;
  gapCount: number;
  gaps: GapDetail[];
}

export interface NormalizedPolicyAnalysis {
  score: number;
  complianceStatus: "Compliant" | "Partially Compliant" | "Non-Compliant";
  gapCount: number;
  gaps: GapDetail[];
  domains: DomainCoverage[];
  affectedDomains: string[];
  assessedDomains: string[];
  recommendations: string[];
}

export function normalizeScore(score?: number | null): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 0;
  const percent = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function getAnalyzedPolicies(policies: Policy[]): Policy[] {
  return policies.filter((policy) => policy.status === "analyzed");
}

function getAnalysisRecord(policyOrAnalysis: Policy | Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!policyOrAnalysis) return undefined;
  const maybePolicy = policyOrAnalysis as Policy;
  return (maybePolicy.analysis_result as Record<string, unknown> | undefined) ?? (policyOrAnalysis as Record<string, unknown>);
}

export function mapGapLabelToDomain(label?: string): string | undefined {
  if (!label) return undefined;
  const normalized = label.trim().toUpperCase();
  const prefixMap: Record<string, string> = {
    GAP_PP_: "password_policy",
    GAP_RA_: "risk_assessment",
    GAP_AC_: "access_control",
    GAP_AM_: "asset_management",
    GAP_BC_: "business_continuity",
    GAP_DP_: "data_protection",
    GAP_IR_: "incident_response",
    GAP_LM_: "log_monitoring",
    GAP_TP_: "third_party_security",
    GAP_VM_: "vuln_management",
  };
  return Object.entries(prefixMap).find(([prefix]) => normalized.startsWith(prefix))?.[1];
}

function normalizeGap(raw: unknown, fallbackDomain?: string): GapDetail | undefined {
  if (typeof raw === "string") {
    const gapId = raw;
    return {
      gap_id: gapId,
      label: gapId,
      domain: fallbackDomain ?? mapGapLabelToDomain(gapId),
      description: gapId,
      confidence: 0,
    };
  }
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const gapId = String(source.gap_id ?? source.label ?? source.id ?? "").trim();
  if (!gapId) return undefined;
  const confidence = typeof source.confidence === "number"
    ? source.confidence
    : typeof source.probability === "number" ? source.probability : 0;
  const domain = typeof source.domain === "string" ? source.domain : fallbackDomain ?? mapGapLabelToDomain(gapId);
  return {
    ...(source as Partial<GapDetail>),
    gap_id: gapId,
    label: typeof source.label === "string" ? source.label : gapId,
    domain,
    severity: typeof source.severity === "string" ? source.severity : undefined,
    recommendation: typeof source.recommendation === "string" ? source.recommendation : undefined,
    source: typeof source.source === "string" ? source.source : undefined,
    description: String(source.description ?? source.title ?? gapId),
    confidence,
  };
}

export function extractAllGaps(policyOrAnalysis: Policy | Record<string, unknown> | undefined): GapDetail[] {
  const result = getAnalysisRecord(policyOrAnalysis);
  if (!result) return [];

  const gaps = new Map<string, GapDetail>();
  const addGap = (raw: unknown, fallbackDomain?: string) => {
    const gap = normalizeGap(raw, fallbackDomain);
    if (!gap) return;
    const key = gap.gap_id;
    const current = gaps.get(key);
    if (!current || gap.confidence >= current.confidence) gaps.set(key, gap);
  };

  for (const key of ["detected_gaps", "gaps", "gaps_detected", "gap_labels"]) {
    const value = result[key];
    if (Array.isArray(value)) value.forEach((item) => addGap(item));
  }

  const domains = result.domains;
  if (domains && typeof domains === "object") {
    for (const [domainId, domainValue] of Object.entries(domains as Record<string, unknown>)) {
      if (!domainValue || typeof domainValue !== "object") continue;
      const domain = domainValue as Record<string, unknown>;
      if (Array.isArray(domain.gaps)) domain.gaps.forEach((item) => addGap(item, domainId));
      if (Array.isArray(domain.details)) domain.details.forEach((item) => addGap(item, domainId));
      if (Array.isArray(domain.gaps_detected)) domain.gaps_detected.forEach((item) => addGap(item, domainId));
    }
  }

  for (const domain of POLICY_DOMAINS) {
    const value = result[domain.id];
    if (!value || typeof value !== "object") continue;
    const domainResult = value as Record<string, unknown>;
    if (Array.isArray(domainResult.details)) domainResult.details.forEach((item) => addGap(item, domain.id));
    if (Array.isArray(domainResult.gaps)) domainResult.gaps.forEach((item) => addGap(item, domain.id));
    if (Array.isArray(domainResult.gaps_detected)) domainResult.gaps_detected.forEach((item) => addGap(item, domain.id));
  }

  return Array.from(gaps.values());
}

export function deriveComplianceStatus(
  score: number,
  gaps: GapDetail[] | number,
  affectedDomains?: string[] | number,
): NormalizedPolicyAnalysis["complianceStatus"] {
  const gapCount = Array.isArray(gaps) ? gaps.length : gaps;
  const affectedDomainCount = Array.isArray(affectedDomains) ? affectedDomains.length : affectedDomains ?? 0;
  if (score === 0 || affectedDomainCount >= 8 || gapCount >= 12) return "Non-Compliant";
  if (score === 100 && gapCount === 0) return "Compliant";
  return "Partially Compliant";
}

export function deriveDomainScore(gapCount: number, assessed: boolean): number | undefined {
  if (!assessed) return undefined;
  if (gapCount <= 0) return 100;
  if (gapCount === 1) return 85;
  if (gapCount === 2) return 70;
  return Math.max(40, 100 - gapCount * 15);
}

function normalizeBackendStatus(status: unknown): NormalizedPolicyAnalysis["complianceStatus"] | undefined {
  if (typeof status !== "string") return undefined;
  const value = status.toLowerCase().replace(/[_-]+/g, " ");
  if (value === "compliant" || value === "fully compliant") return "Compliant";
  if (value === "partially compliant" || value === "partial compliant") return "Partially Compliant";
  if (value === "non compliant" || value === "noncompliant") return "Non-Compliant";
  return undefined;
}

export function deriveDomainCoverage(policyOrAnalysis: Policy | Record<string, unknown> | undefined, locale: string = "en"): DomainCoverage[] {
  const result = getAnalysisRecord(policyOrAnalysis);
  const gaps = extractAllGaps(policyOrAnalysis);
  const overallScore = normalizeScore(
    typeof result?.compliance_score === "number"
      ? result.compliance_score
      : typeof result?.score === "number"
        ? result.score
        : typeof result?.overall_score === "number" ? result.overall_score : undefined
  );
  const gapsByDomain = new Map<string, GapDetail[]>();
  for (const gap of gaps) {
    const domain = gap.domain ?? mapGapLabelToDomain(gap.gap_id);
    if (!domain) continue;
    if (!gapsByDomain.has(domain)) gapsByDomain.set(domain, []);
    gapsByDomain.get(domain)!.push(gap);
  }

  const assessed = new Set<string>();
  const detected = result?.domains_detected;
  if (Array.isArray(detected)) {
    detected.forEach((domain) => {
      if (typeof domain === "string" && POLICY_DOMAIN_BY_ID[domain]) assessed.add(domain);
    });
  }
  if (result?.domains && typeof result.domains === "object") {
    Object.entries(result.domains as Record<string, unknown>).forEach(([domainId, value]) => {
      if (!POLICY_DOMAIN_BY_ID[domainId] || !value || typeof value !== "object") return;
      const domainValue = value as Record<string, unknown>;
      if (domainValue.assessed === true || domainValue.status !== "Not Assessed") assessed.add(domainId);
      const gapCount = typeof domainValue.gap_count === "number" ? domainValue.gap_count : 0;
      const status = typeof domainValue.status === "string" ? domainValue.status.toLowerCase() : "";
      if (gapCount > 0 || status.includes("needs attention")) assessed.add(domainId);
    });
  }
  const affected = result?.affected_domains;
  if (Array.isArray(affected)) {
    affected.forEach((domain) => {
      if (typeof domain === "string" && POLICY_DOMAIN_BY_ID[domain]) assessed.add(domain);
    });
  }
  gapsByDomain.forEach((_, domainId) => assessed.add(domainId));

  return POLICY_DOMAINS.map((domain) => {
    const domainResult = result?.domains && typeof result.domains === "object"
      ? (result.domains as Record<string, Record<string, unknown> | undefined>)[domain.id]
      : undefined;
    const legacyDomain = result?.[domain.id] as Record<string, unknown> | undefined;
    const rawScore = domainResult?.score ?? legacyDomain?.score;
    const domainGaps = gapsByDomain.get(domain.id) ?? [];
    const reportedGapCount = typeof domainResult?.gap_count === "number"
      ? domainResult.gap_count
      : typeof legacyDomain?.gap_count === "number" ? legacyDomain.gap_count : 0;
    const affectedDomains = Array.isArray(result?.affected_domains) ? result.affected_domains : [];
    const domainMarkedAffected = affectedDomains.includes(domain.id);
    const statusText = typeof domainResult?.status === "string" ? domainResult.status.toLowerCase() : "";
    const fallbackAffected = domainMarkedAffected || statusText.includes("needs attention");
    const gapCount = Math.max(reportedGapCount, domainGaps.length, fallbackAffected ? 1 : 0);
    const isAssessed = assessed.has(domain.id);
    const score = overallScore === 0 && gapCount > 0
      ? 0
      : gapCount > 0
      ? deriveDomainScore(gapCount, isAssessed)
      : typeof rawScore === "number" ? normalizeScore(rawScore) : deriveDomainScore(gapCount, isAssessed);
    return {
      id: domain.id,
      label: formatPolicyDomain(domain.id, locale),
      assessed: isAssessed,
      status: !isAssessed ? "not_assessed" : gapCount > 0 ? "needs_attention" : "compliant",
      score,
      gapCount,
      gaps: domainGaps,
    };
  });
}

export function normalizePolicyAnalysis(policy: Policy, locale: string = "en"): NormalizedPolicyAnalysis {
  const result = policy.analysis_result;
  const gaps = extractAllGaps(policy);
  const rawScore = result?.compliance_score ?? result?.score ?? policy.compliance_score ?? result?.overall_score;
  const score = normalizeScore(typeof rawScore === "number" ? rawScore : undefined);
  const gapCount = gaps.length;
  const backendStatus = normalizeBackendStatus(result?.compliance_status ?? result?.overall_compliance ?? policy.category);
  const recommendations = Array.isArray(result?.recommendations)
    ? result.recommendations.filter((item): item is string => typeof item === "string")
    : gaps.map((gap) => gap.recommendation).filter((item): item is string => typeof item === "string");
  const domains = deriveDomainCoverage(policy, locale);
  const affectedDomains = domains.filter((domain) => domain.gapCount > 0).map((domain) => domain.id);
  const derivedStatus = deriveComplianceStatus(score, gapCount, affectedDomains);
  const normalizedGapCount = Math.max(
    gapCount,
    typeof result?.gap_count === "number" ? result.gap_count : 0,
    affectedDomains.length > 0 && score === 0 ? affectedDomains.length : 0
  );
  return {
    score,
    complianceStatus: derivedStatus === "Non-Compliant" ? "Non-Compliant" : backendStatus ?? derivedStatus,
    gapCount: normalizedGapCount,
    gaps,
    domains,
    affectedDomains,
    assessedDomains: domains.filter((domain) => domain.assessed).map((domain) => domain.id),
    recommendations,
  };
}

export function getPolicyDomains(policy: Policy): string[] {
  const result = policy.analysis_result;
  const domains = new Set(deriveDomainCoverage(policy).filter((domain) => domain.assessed).map((domain) => domain.id));
  const addDomain = (value: unknown) => {
    if (typeof value !== "string") return;
    const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (POLICY_DOMAIN_BY_ID[normalized]) domains.add(normalized);
  };

  if (policy.category) addDomain(policy.category);
  const detected = result?.domains_detected;
  if (Array.isArray(detected)) detected.forEach(addDomain);

  getPolicyGaps(policy).forEach((gap) => {
    const domain = gap.domain ?? mapGapLabelToDomain(gap.gap_id);
    if (domain) domains.add(domain);
    detectDomainFromText(`${gap.gap_id} ${gap.description}`)?.forEach((id) => domains.add(id));
  });

  return Array.from(domains);
}

export function getPolicyGaps(policy: Policy): GapDetail[] {
  return extractAllGaps(policy);
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

  if (analyzed.length > 0) {
    POLICY_DOMAINS.forEach((domain) => ensure(domain.id));
  }

  for (const policy of analyzed) {
    const normalized = normalizePolicyAnalysis(policy, locale);
    for (const domain of normalized.domains) {
      const domainId = domain.id;
      const item = ensure(domainId);
      if (domain.assessed && !item.policies.includes(policy.title)) item.policies.push(policy.title);
      const score = domain.score ?? getDomainScore(policy, domainId);
      if (score !== undefined) item.score = item.score === undefined ? score : Math.round((item.score + score) / 2);
      if (domain.gapCount > 0) item.gapCount += domain.gapCount;
      domain.gaps.forEach((gap) => item.findings.push(`${gap.gap_id}: ${gap.description}`));
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
  const normalized = normalizePolicyAnalysis(policy);
  const affectedDomains = normalized.domains.filter((domain) => domain.gapCount > 0).map((domain) => domain.id);
  const assessedDomains = normalized.domains.filter((domain) => domain.assessed).map((domain) => domain.id);
  const domains = new Set([...affectedDomains, ...assessedDomains]);
  const gaps = normalized.gaps;
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
    detected_domains: [...affectedDomains, ...assessedDomains.filter((domain) => !affectedDomains.includes(domain))],
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
      const domain = gap.domain ?? mapGapLabelToDomain(gap.gap_id) ?? detectDomainFromText(`${gap.gap_id} ${gap.description}`)[0] ?? getPolicyDomains(policy)[0];
      const domainLabel = domain ? formatPolicyDomain(domain, "en") : "Undetected";
      const domainPhrase = domainLabel.toLowerCase();
      const priority: RemediationTask["priority"] =
        policyScore < 60 || gap.confidence >= 0.85 ? "high"
          : policyScore < 85 || gap.confidence >= 0.6 ? "medium"
            : "low";
      const recommendedAction = `Address ${domainPhrase} gap: ${gap.gap_id}: ${gap.description}`;
      return {
        id: `policy-gap-${policy.id}-${gap.gap_id}`,
        title: `Remediate ${domainLabel}`,
        description: `Related policy: ${policy.title}. Domain: ${domainLabel}. Action: ${recommendedAction}. Due date: Suggested.`,
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
