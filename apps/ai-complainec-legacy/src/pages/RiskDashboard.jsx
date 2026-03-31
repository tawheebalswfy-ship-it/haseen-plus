import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/common/PageHeader";
import { AlertTriangle, AlertOctagon, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Risk matrix: likelihood (rows) x impact (cols) — 5x5
const LIKELIHOOD_LABELS = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

// Color for each cell in the risk matrix
const cellColor = (row, col) => {
  const score = (row + 1) * (col + 1);
  if (score >= 15) return "bg-red-500 text-white";
  if (score >= 9) return "bg-orange-400 text-white";
  if (score >= 5) return "bg-amber-300 text-slate-900";
  if (score >= 3) return "bg-yellow-200 text-slate-900";
  return "bg-emerald-200 text-slate-900";
};

const riskLevel = (score) => {
  if (!score && score !== 0) return { label: "Unknown", color: "bg-slate-100 text-slate-600" };
  if (score >= 80) return { label: "Low", color: "bg-emerald-100 text-emerald-700" };
  if (score >= 60) return { label: "Medium", color: "bg-amber-100 text-amber-700" };
  if (score >= 40) return { label: "High", color: "bg-orange-100 text-orange-700" };
  return { label: "Critical", color: "bg-red-100 text-red-700" };
};

// Derive a pseudo risk position from compliance score
const riskPosition = (score) => {
  if (score >= 80) return { row: 0, col: 0 };   // Rare + Negligible
  if (score >= 70) return { row: 1, col: 1 };
  if (score >= 60) return { row: 2, col: 2 };
  if (score >= 40) return { row: 3, col: 3 };
  return { row: 4, col: 4 };
};

export default function RiskDashboard() {
  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments-all"],
    queryFn: () => base44.entities.ComplianceAssessment.list("-created_date"),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["remediation-tasks"],
    queryFn: () => base44.entities.RemediationTask.list("-created_date"),
  });

  const completedAssessments = assessments.filter(a => a.status === "completed");

  // Aggregate risks per framework
  const frameworkRisks = completedAssessments.map(a => ({
    id: a.id,
    framework: a.framework,
    name: a.name,
    score: a.overall_score || 0,
    ...riskPosition(a.overall_score || 0),
    nonCompliant: a.non_compliant_controls || 0,
    partial: a.partial_controls || 0,
  }));

  // Stats
  const criticalRisks = frameworkRisks.filter(f => f.score < 40).length;
  const highRisks = frameworkRisks.filter(f => f.score >= 40 && f.score < 60).length;
  const mediumRisks = frameworkRisks.filter(f => f.score >= 60 && f.score < 80).length;
  const lowRisks = frameworkRisks.filter(f => f.score >= 80).length;

  const openTasks = tasks.filter(t => t.status === "open" || t.status === "in_progress");
  const criticalTasks = openTasks.filter(t => t.priority === "critical");
  const overdueTasks = openTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());

  // Build 5x5 matrix cells with items
  const matrixCells = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => ({
      row, col,
      items: frameworkRisks.filter(f => f.row === (4 - row) && f.col === col),
    }))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Risk Dashboard"
          description="Visual risk matrix and heat map across all compliance frameworks"
          backTo="Dashboard"
          backLabel="Dashboard"
        />

        {/* Risk Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Critical Risk", count: criticalRisks, color: "bg-red-50 border-red-200", text: "text-red-700", icon: AlertOctagon, iconColor: "text-red-500" },
            { label: "High Risk", count: highRisks, color: "bg-orange-50 border-orange-200", text: "text-orange-700", icon: AlertTriangle, iconColor: "text-orange-500" },
            { label: "Medium Risk", count: mediumRisks, color: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: AlertTriangle, iconColor: "text-amber-500" },
            { label: "Low Risk", count: lowRisks, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: CheckCircle, iconColor: "text-emerald-500" },
          ].map(item => (
            <Card key={item.label} className={`p-5 border ${item.color} shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-600">{item.label}</p>
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <p className={`text-3xl font-bold ${item.text}`}>{item.count}</p>
              <p className="text-xs text-slate-500 mt-1">frameworks</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Risk Matrix */}
          <div className="xl:col-span-2">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-1">Risk Matrix (Heat Map)</h3>
              <p className="text-xs text-slate-500 mb-5">Likelihood vs Impact — frameworks plotted by compliance score</p>

              <div className="flex">
                {/* Y Axis label */}
                <div className="flex items-center mr-2">
                  <span className="text-xs text-slate-400 -rotate-90 whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                    ← Likelihood
                  </span>
                </div>
                <div className="flex-1">
                  {/* Row labels + cells */}
                  {matrixCells.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex items-center mb-1">
                      <span className="text-[10px] text-slate-400 w-20 text-right pr-2 shrink-0">
                        {LIKELIHOOD_LABELS[4 - rowIdx]}
                      </span>
                      {row.map(({ col, items }) => (
                        <div
                          key={col}
                          className={`flex-1 min-h-[56px] rounded mx-0.5 flex flex-col items-center justify-center gap-1 p-1 ${cellColor(4 - rowIdx, col)}`}
                        >
                          {items.map(item => (
                            <Link
                              key={item.id}
                              to={createPageUrl(`Assessment?id=${item.id}`)}
                              title={`${item.name} — ${item.score}%`}
                            >
                              <span className="text-[10px] font-bold bg-white/30 rounded px-1 py-0.5 hover:bg-white/50 transition-colors cursor-pointer leading-tight block text-center">
                                {item.framework}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* X Axis labels */}
                  <div className="flex mt-1 ml-20">
                    {IMPACT_LABELS.map(label => (
                      <div key={label} className="flex-1 text-center text-[10px] text-slate-400 px-1">{label}</div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-1">Impact →</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
                {[
                  { label: "Low", color: "bg-emerald-200" },
                  { label: "Medium", color: "bg-yellow-200" },
                  { label: "Elevated", color: "bg-amber-300" },
                  { label: "High", color: "bg-orange-400" },
                  { label: "Critical", color: "bg-red-500" },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1 text-xs text-slate-600">
                    <span className={`w-3 h-3 rounded ${l.color}`} />{l.label}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          {/* Risk Items List */}
          <div className="space-y-4">
            {/* Framework Risk Levels */}
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Frameworks by Risk</h3>
              <div className="space-y-3">
                {frameworkRisks.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No completed assessments</p>
                )}
                {frameworkRisks
                  .sort((a, b) => a.score - b.score)
                  .map(f => {
                    const rl = riskLevel(f.score);
                    return (
                      <div key={f.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{f.framework}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[120px]">{f.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-700">{f.score}%</span>
                          <Badge className={`${rl.color} border-0 text-xs`}>{rl.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>

            {/* Overdue / Critical Tasks */}
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Risk Alerts</h3>
              <div className="space-y-3">
                {criticalTasks.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertOctagon className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">{criticalTasks.length} Critical Tasks</p>
                      <p className="text-xs text-red-600">Require immediate attention</p>
                    </div>
                  </div>
                )}
                {overdueTasks.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-800">{overdueTasks.length} Overdue Tasks</p>
                      <p className="text-xs text-orange-600">Past due date</p>
                    </div>
                  </div>
                )}
                {criticalTasks.length === 0 && overdueTasks.length === 0 && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm text-emerald-700 font-medium">No critical alerts</p>
                  </div>
                )}
                <Link to={createPageUrl("Remediation")}>
                  <button className="w-full text-xs text-teal-600 hover:text-teal-800 font-medium mt-2 text-center">
                    View all remediation tasks →
                  </button>
                </Link>
              </div>
            </Card>
          </div>
        </div>

        {/* Non-Compliant Controls Table */}
        {completedAssessments.length > 0 && (
          <Card className="bg-white border-0 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Top Risk Controls (Non-Compliant)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Control</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Framework</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Domain</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {completedAssessments.flatMap(a =>
                    (a.control_results || [])
                      .filter(c => c.status === "non_compliant")
                      .slice(0, 3)
                      .map(c => ({ ...c, framework: a.framework, assessmentId: a.id }))
                  ).slice(0, 10).map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{c.control_id}</td>
                      <td className="px-6 py-3">
                        <Badge className="bg-slate-100 text-slate-700 border-0">{c.framework}</Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{c.domain || "—"}</td>
                      <td className="px-6 py-3">
                        <Badge className="bg-red-100 text-red-700 border-0">Non-Compliant</Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-500 text-xs max-w-xs truncate">{c.gap || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}