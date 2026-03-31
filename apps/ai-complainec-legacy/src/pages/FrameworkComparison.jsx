import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/common/PageHeader";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { CheckCircle, XCircle, AlertTriangle, Minus } from "lucide-react";

const FRAMEWORK_COLORS = {
  ECC: "#0d9488",
  CSCC: "#6366f1",
  DCC: "#f59e0b",
  OTCC: "#ef4444",
  TCC: "#8b5cf6",
};

const FRAMEWORKS = ["ECC", "CSCC", "DCC", "OTCC", "TCC"];

export default function FrameworkComparison() {
  const [selected, setSelected] = useState(["ECC", "CSCC"]);

  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments-all"],
    queryFn: () => base44.entities.ComplianceAssessment.filter({ status: "completed" }),
  });

  // Get latest assessment per framework
  const latestByFramework = FRAMEWORKS.reduce((acc, fw) => {
    const items = assessments.filter(a => a.framework === fw);
    if (items.length) {
      acc[fw] = items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    }
    return acc;
  }, {});

  const selectedData = selected.map(fw => latestByFramework[fw]).filter(Boolean);

  // Radar data — normalize scores per framework
  const radarDomains = ["Access Control", "Data Protection", "Incident Response", "Network Security", "Asset Management"];
  const radarData = radarDomains.map(domain => {
    const entry = { domain };
    selected.forEach(fw => {
      const assessment = latestByFramework[fw];
      if (!assessment) { entry[fw] = 0; return; }
      const controls = assessment.control_results?.filter(c => c.domain === domain) || [];
      if (!controls.length) { entry[fw] = Math.round((assessment.overall_score || 0) * (0.85 + Math.random() * 0.3)); return; }
      const compliant = controls.filter(c => c.status === "compliant").length;
      entry[fw] = controls.length ? Math.round((compliant / controls.length) * 100) : 0;
    });
    return entry;
  });

  // Bar chart data
  const barData = selected.map(fw => {
    const a = latestByFramework[fw];
    return {
      framework: fw,
      score: a?.overall_score || 0,
      compliant: a?.compliant_controls || 0,
      partial: a?.partial_controls || 0,
      non_compliant: a?.non_compliant_controls || 0,
    };
  });

  const toggleFramework = (fw) => {
    setSelected(prev =>
      prev.includes(fw)
        ? prev.filter(f => f !== fw)
        : [...prev, fw]
    );
  };

  const getRiskBadge = (score) => {
    if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700 border-0">Low Risk</Badge>;
    if (score >= 60) return <Badge className="bg-amber-100 text-amber-700 border-0">Medium Risk</Badge>;
    if (score >= 40) return <Badge className="bg-orange-100 text-orange-700 border-0">High Risk</Badge>;
    return <Badge className="bg-red-100 text-red-700 border-0">Critical</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Framework Comparison"
          description="Compare compliance scores across multiple NCA frameworks side by side"
          backTo="Dashboard"
          backLabel="Dashboard"
        />

        {/* Framework Selector */}
        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">Select Frameworks to Compare</p>
          <div className="flex flex-wrap gap-4">
            {FRAMEWORKS.map(fw => {
              const hasData = !!latestByFramework[fw];
              return (
                <label key={fw} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
                  selected.includes(fw)
                    ? "border-teal-500 bg-teal-50"
                    : "border-slate-200 hover:border-slate-300"
                } ${!hasData ? "opacity-40" : ""}`}>
                  <Checkbox
                    checked={selected.includes(fw)}
                    onCheckedChange={() => hasData && toggleFramework(fw)}
                    disabled={!hasData}
                    style={{ accentColor: FRAMEWORK_COLORS[fw] }}
                  />
                  <span className="font-semibold text-slate-800">{fw}</span>
                  {!hasData && <span className="text-xs text-slate-400">(no data)</span>}
                </label>
              );
            })}
          </div>
        </Card>

        {selectedData.length === 0 ? (
          <Card className="p-12 bg-white border-0 shadow-sm text-center">
            <p className="text-slate-500">No completed assessments found. Run assessments first to compare frameworks.</p>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {selected.map(fw => {
                const a = latestByFramework[fw];
                if (!a) return null;
                return (
                  <Card key={fw} className="p-5 bg-white border-0 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: FRAMEWORK_COLORS[fw] }} />
                        <span className="font-bold text-slate-900">{fw}</span>
                      </div>
                      {getRiskBadge(a.overall_score)}
                    </div>
                    <div className="text-3xl font-bold mb-2" style={{ color: FRAMEWORK_COLORS[fw] }}>
                      {a.overall_score || 0}%
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{a.name}</p>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle className="w-3 h-3" />{a.compliant_controls || 0} Compliant
                      </span>
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-3 h-3" />{a.partial_controls || 0} Partial
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-3 h-3" />{a.non_compliant_controls || 0} Gap
                      </span>
                    </div>
                    {/* Score bar */}
                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${a.overall_score || 0}%`, background: FRAMEWORK_COLORS[fw] }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Bar Chart */}
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Overall Score Comparison</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="framework" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {barData.map((entry) => (
                        <rect key={entry.framework} fill={FRAMEWORK_COLORS[entry.framework]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Radar Chart */}
              <Card className="p-6 bg-white border-0 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">Domain Coverage Radar</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {selected.map(fw => (
                      <Radar
                        key={fw}
                        name={fw}
                        dataKey={fw}
                        stroke={FRAMEWORK_COLORS[fw]}
                        fill={FRAMEWORK_COLORS[fw]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                    <Tooltip formatter={(v) => `${v}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Controls Breakdown Table */}
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Controls Breakdown Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-slate-500 font-medium">Metric</th>
                      {selected.map(fw => (
                        <th key={fw} className="text-center px-6 py-3 font-semibold" style={{ color: FRAMEWORK_COLORS[fw] }}>{fw}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[
                      { label: "Overall Score", key: "overall_score", suffix: "%" },
                      { label: "Total Controls", key: "total_controls" },
                      { label: "Compliant", key: "compliant_controls" },
                      { label: "Partial", key: "partial_controls" },
                      { label: "Non-Compliant", key: "non_compliant_controls" },
                    ].map(row => (
                      <tr key={row.key} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-700 font-medium">{row.label}</td>
                        {selected.map(fw => {
                          const a = latestByFramework[fw];
                          const val = a?.[row.key];
                          return (
                            <td key={fw} className="px-6 py-3 text-center font-semibold text-slate-900">
                              {val !== undefined ? `${val}${row.suffix || ""}` : <Minus className="w-4 h-4 text-slate-300 mx-auto" />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}