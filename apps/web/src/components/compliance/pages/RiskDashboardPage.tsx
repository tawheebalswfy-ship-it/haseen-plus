import { useState } from "react";
import { Link } from "react-router-dom";
import { useComplianceStore } from "../store";
import { FRAMEWORK_COLORS, NCA_CONTROLS } from "../types";
import { useLanguage } from "../../../contexts/LanguageContext";
import { buildPolicyAssessments, getAnalyzedPolicies, getPolicyGaps } from "../../../lib/policyAnalysis";

type RiskCell = { impact: number; likelihood: number; count: number; items: string[] };

/** Deterministic hash for stable risk placement (no Math.random) */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getRiskLevel(impact: number, likelihood: number): "critical" | "high" | "medium" | "low" {
  const score = impact * likelihood;
  if (score >= 16) return "critical";
  if (score >= 9) return "high";
  if (score >= 4) return "medium";
  return "low";
}

function riskColor(level: string) {
  const m: Record<string, string> = {
    critical: "bg-red-600 hover:bg-red-700",
    high: "bg-orange-500 hover:bg-orange-600",
    medium: "bg-amber-400 hover:bg-amber-500",
    low: "bg-gray-500 hover:bg-gray-600",
  };
  return m[level] || "bg-gray-200";
}

export default function RiskDashboardPage() {
  const { assessments, tasks, policies, loading, error } = useComplianceStore();
  const { t } = useLanguage();
  const c = t.compliance.risk;
  const [selectedCell, setSelectedCell] = useState<RiskCell | null>(null);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[24px] border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-400 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading risk data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <h1 className="text-lg font-semibold text-red-700 dark:text-red-300">Could not load risk data</h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const IMPACT_LABELS = [c.negligible, c.minor, c.moderate, c.major, c.catastrophic];
  const LIKELIHOOD_LABELS = [c.rare, c.unlikely, c.possible, c.likely, c.almostCertain];

  // Generate risk items from assessments and tasks
  const riskItems: { name: string; impact: number; likelihood: number; framework?: string }[] = [];

  const riskAssessments = assessments.length > 0 ? assessments : buildPolicyAssessments(policies);

  // From non-compliant controls
  riskAssessments.forEach((a) => {
    (a.results || []).forEach((r) => {
      if (r.status === "non_compliant") {
        const ctrl = (NCA_CONTROLS[a.framework] || []).find((c) => c.id === r.control_id);
        const priorityImpact: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2 };
        riskItems.push({
          name: `${r.control_id}: ${r.control_name}`,
          impact: priorityImpact[ctrl?.priority || "high"],
          likelihood: 3 + (stableHash(r.control_id) % 3), // 3-5 deterministic
          framework: a.framework,
        });
      } else if (r.status === "partial") {
        const ctrl = (NCA_CONTROLS[a.framework] || []).find((c) => c.id === r.control_id);
        const priorityImpact: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        riskItems.push({
          name: `${r.control_id}: ${r.control_name}`,
          impact: priorityImpact[ctrl?.priority || "medium"],
          likelihood: 1 + (stableHash(r.control_id) % 3), // 1-3 deterministic
          framework: a.framework,
        });
      }
    });
  });

  // From critical/high tasks
  tasks.filter((tk) => tk.status !== "completed" && (tk.priority === "critical" || tk.priority === "high")).forEach((tk) => {
    riskItems.push({
      name: tk.title,
      impact: tk.priority === "critical" ? 5 : 4,
      likelihood: 3 + (stableHash(tk.id) % 3), // 3-5 deterministic
    });
  });

  const analyzedPolicies = getAnalyzedPolicies(policies);
  const policyGapCount = analyzedPolicies.reduce((sum, policy) => sum + getPolicyGaps(policy).length, 0);
  const hasRealData = riskItems.length > 0;

  // Build 5x5 grid
  const grid: RiskCell[][] = Array.from({ length: 5 }, (_, li) =>
    Array.from({ length: 5 }, (_, ii) => ({
      impact: ii + 1,
      likelihood: li + 1,
      count: 0,
      items: [],
    }))
  );

  riskItems.forEach((r) => {
    const li = Math.min(Math.max(r.likelihood - 1, 0), 4);
    const ii = Math.min(Math.max(r.impact - 1, 0), 4);
    grid[li][ii].count++;
    grid[li][ii].items.push(r.name);
  });

  const stats = {
    critical: riskItems.filter((r) => getRiskLevel(r.impact, r.likelihood) === "critical").length,
    high: riskItems.filter((r) => getRiskLevel(r.impact, r.likelihood) === "high").length,
    medium: riskItems.filter((r) => getRiskLevel(r.impact, r.likelihood) === "medium").length,
    low: riskItems.filter((r) => getRiskLevel(r.impact, r.likelihood) === "low").length,
  };

  // ECC risk summary
  const eccItems = riskItems.filter((r) => "framework" in r && r.framework === "ECC");
  const eccAssessments = riskAssessments.filter((a) => a.framework === "ECC");
  const eccLatest = eccAssessments[eccAssessments.length - 1];
  const eccRisk = {
    framework: "ECC",
    color: FRAMEWORK_COLORS.ECC,
    riskCount: eccItems.length,
    score: eccLatest?.overall_score || 0,
  };
  const showEccRisk = eccRisk.riskCount > 0 || eccRisk.score > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {c.subtitle}
        </p>
      </div>

      {!hasRealData ? (
        <div className="rounded-[24px] border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900 mb-6">
          <div className="mx-auto mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gray-300 dark:text-gray-600">RISK</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{c.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {analyzedPolicies.length > 0 && policyGapCount === 0
              ? "No risk gaps detected from analyzed policies."
              : "Upload and analyze policies to populate the risk heat map with real compliance data."}
          </p>
          <Link to="/dashboard/policies?open=true" className="inline-flex items-center rounded-full bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 no-underline">
            Upload Policy
          </Link>
        </div>
      ) : (
      <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: c.criticalRisks, value: stats.critical, bg: "bg-red-100 dark:bg-red-900/30", color: "text-red-700 dark:text-red-400" },
          { label: c.highRisks, value: stats.high, bg: "bg-orange-100 dark:bg-orange-900/30", color: "text-orange-700 dark:text-orange-400" },
          { label: c.mediumRisks, value: stats.medium, bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-700 dark:text-amber-400" },
          { label: c.lowRisks, value: stats.low, bg: "bg-gray-100 dark:bg-gray-800", color: "text-gray-700 dark:text-gray-400" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heat Map */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{c.heatMap}</h3>
          <div className="flex">
            {/* Y-axis label */}
            <div className="flex flex-col justify-center mr-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 -rotate-90 whitespace-nowrap origin-center">{c.likelihood} →</span>
            </div>
            <div className="flex-1">
              {/* Grid - reversed so highest likelihood is at top */}
              {[...grid].reverse().map((row, ri) => (
                <div key={ri} className="flex gap-1 mb-1">
                  <div className="w-20 text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-end pr-2 font-medium">
                    {LIKELIHOOD_LABELS[4 - ri]}
                  </div>
                  {row.map((cell, ci) => {
                    const level = getRiskLevel(cell.impact, cell.likelihood);
                    return (
                      <button
                        key={ci}
                        onClick={() => cell.count > 0 && setSelectedCell(cell)}
                        className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-sm font-bold text-white transition-all cursor-pointer border-0 ${
                          cell.count > 0 ? riskColor(level) : "bg-gray-100 dark:bg-gray-800"
                        }`}
                        title={`Impact: ${IMPACT_LABELS[cell.impact - 1]}, Likelihood: ${LIKELIHOOD_LABELS[cell.likelihood - 1]} - ${cell.count} risks`}
                      >
                        {cell.count > 0 ? cell.count : ""}
                      </button>
                    );
                  })}
                </div>
              ))}
              {/* X-axis labels */}
              <div className="flex gap-1 mt-1">
                <div className="w-20" />
                {IMPACT_LABELS.map((label) => (
                  <div key={label} className="flex-1 text-center text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    {label}
                  </div>
                ))}
              </div>
              <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">{c.impact} →</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 justify-center">
            {[
              { label: c.criticalRisks, color: "bg-red-600" },
              { label: c.highRisks, color: "bg-orange-500" },
              { label: c.mediumRisks, color: "bg-amber-400" },
              { label: c.lowRisks, color: "bg-gray-500" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${l.color}`} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Framework Risk + Alerts */}
        <div className="space-y-6">
          {/* ECC Framework Risk */}
          {showEccRisk && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{c.frameworkRisk}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eccRisk.color }} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ECC</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{eccRisk.riskCount} {c.risks}</span>
                    <span className="text-sm font-bold" style={{ color: eccRisk.score >= 70 ? "#6b7280" : eccRisk.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                      {eccRisk.score}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Alerts */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{c.riskAlerts}</h3>
            <div className="space-y-3">
              {riskItems
                .filter((r) => getRiskLevel(r.impact, r.likelihood) === "critical")
                .slice(0, 5)
                .map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{r.name}</span>
                  </div>
                ))}
              {stats.critical === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{c.noAlerts}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cell Detail Dialog */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedCell(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {c.riskDetails}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {c.impact}: <span className="font-semibold">{IMPACT_LABELS[selectedCell.impact - 1]}</span> · {c.likelihood}: <span className="font-semibold">{LIKELIHOOD_LABELS[selectedCell.likelihood - 1]}</span>
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedCell.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${riskColor(getRiskLevel(selectedCell.impact, selectedCell.likelihood)).split(" ")[0]}`} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="mt-4 w-full py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
            >
              {t.compliance.common.close}
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
