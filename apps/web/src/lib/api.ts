/**
 * ISO Policy Gap Detector API Client
 * Connects to the deployed gap detection model on Cloud Run.
 *
 * The model detects 16 compliance gaps (GAP_PP_001–008, GAP_RA_001–008)
 * via multi-label classification. The API handles document chunking,
 * per-chunk prediction, and aggregation server-side.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const API_KEY = import.meta.env.VITE_API_KEY as string;

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

if (import.meta.env.DEV && !API_BASE_URL) {
  console.info(
    "VITE_API_URL is empty. API requests will use relative /analyze and /health paths."
  );
}
if (!API_KEY) {
  console.warn(
    "Missing VITE_API_KEY. " +
    "API requests will be rejected. " +
    "Add VITE_API_KEY to your .env file."
  );
}

// ── Response types ──

export interface GapDetail {
  gap_id: string;
  label?: string;
  domain?: string;
  severity?: string;
  recommendation?: string;
  source?: string;
  description: string;
  confidence: number;
}

export interface DomainResult {
  gaps_detected: string[];
  gap_count: number;
  score: number;
  details: GapDetail[];
}

export interface AnalyzeResponse {
  overall_compliance: "compliant" | "partially_compliant" | "non_compliant";
  overall_score: number;
  score?: number;
  compliance_score?: number;
  compliance_status?: string;
  gap_count: number;
  num_chunks: number;
  inference_time_ms: number;
  domains_detected: string[];
  password_policy: DomainResult;
  risk_assessment: DomainResult;
  domains?: Record<string, { gap_count: number; score: number; status: string; assessed?: boolean; gaps: GapDetail[] }>;
  detected_gaps?: GapDetail[];
  gaps?: GapDetail[];
  gap_labels?: string[];
  recommendations?: string[];
  all_gap_probabilities: Record<string, number>;
  predictions?: Record<string, { probability: number; threshold: number; detected: boolean }>;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_path: string;
  model_type: string;
  num_gaps: number;
  gap_labels: string[];
}

// ── API client ──

class PolicyClassifierAPI {
  private get headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (API_KEY) h["X-API-Key"] = API_KEY;
    return h;
  }

  /** Check API health status */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(apiUrl("/health"), {
      headers: this.headers,
    });
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Analyze a full policy document for compliance gaps.
   * The API handles chunking, per-chunk prediction, and aggregation.
   */
  async analyzeDocument(text: string, threshold?: number): Promise<AnalyzeResponse> {
    const body: Record<string, unknown> = { text };
    if (threshold !== undefined) body.threshold = threshold;
    if (import.meta.env.DEV) {
      console.info("[api] analyze request", {
        url: apiUrl("/analyze"),
        textLength: text.length,
        preview: text.slice(0, 200),
        threshold,
      });
    }

    const response = await fetch(apiUrl("/analyze"), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || "Analysis failed");
    }

    const data = await response.json();
    if (import.meta.env.DEV) {
      console.info("[api] analyze response", {
        score: data.score ?? data.compliance_score ?? data.overall_score,
        gapCount: data.gap_count,
        detectedGaps: data.detected_gaps?.length ?? data.gaps?.length,
        domains: data.domains_detected,
      });
    }
    return data;
  }
}

// Export singleton instance
export const policyClassifierAPI = new PolicyClassifierAPI();

// ── Compliance helpers ──

/** Map overall_compliance to a display color name */
export function getComplianceColor(compliance: string): string {
  if (compliance === "compliant" || compliance.includes("Compliant") && !compliance.includes("Non") && !compliance.includes("Partial")) return "gray";
  if (compliance === "partially_compliant" || compliance.includes("Partial")) return "amber";
  if (compliance === "non_compliant" || compliance.includes("Non")) return "red";
  return "gray";
}

export function getComplianceIcon(compliance: string): string {
  const color = getComplianceColor(compliance);
  if (color === "gray") return "✓";
  if (color === "amber") return "⚠";
  if (color === "red") return "✗";
  return "?";
}

/** Map API compliance value to human-readable label */
export function getComplianceLabel(compliance: string): string {
  if (compliance === "compliant") return "Compliant";
  if (compliance === "partially_compliant") return "Partially Compliant";
  if (compliance === "non_compliant") return "Non-Compliant";
  if (compliance === "Fully Compliant") return "Compliant";
  return compliance;
}

export default policyClassifierAPI;
