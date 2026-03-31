import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const colors = {
  compliant: "#10b981",
  partial: "#f59e0b",
  non_compliant: "#ef4444",
};

export default function DomainChart({ controls }) {
  // Group controls by domain and calculate stats
  const domainStats = controls?.reduce((acc, control) => {
    const domain = control.domain || "Other";
    if (!acc[domain]) {
      acc[domain] = { compliant: 0, partial: 0, non_compliant: 0, total: 0 };
    }
    acc[domain].total++;
    if (control.status === "compliant") acc[domain].compliant++;
    else if (control.status === "partial") acc[domain].partial++;
    else if (control.status === "non_compliant") acc[domain].non_compliant++;
    return acc;
  }, {}) || {};

  const chartData = Object.entries(domainStats).map(([domain, stats]) => ({
    name: domain.length > 20 ? domain.substring(0, 20) + "..." : domain,
    fullName: domain,
    compliant: stats.compliant,
    partial: stats.partial,
    non_compliant: stats.non_compliant,
    score: Math.round((stats.compliant / stats.total) * 100),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900 mb-2">{data.fullName}</p>
          <div className="space-y-1 text-sm">
            <p className="text-emerald-600">Compliant: {data.compliant}</p>
            <p className="text-amber-600">Partial: {data.partial}</p>
            <p className="text-red-600">Non-Compliant: {data.non_compliant}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-6">Compliance by Domain</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="compliant" stackId="a" fill={colors.compliant} radius={[0, 0, 0, 0]} />
            <Bar dataKey="partial" stackId="a" fill={colors.partial} radius={[0, 0, 0, 0]} />
            <Bar dataKey="non_compliant" stackId="a" fill={colors.non_compliant} radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-sm text-slate-600">Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-sm text-slate-600">Partial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-sm text-slate-600">Non-Compliant</span>
        </div>
      </div>
    </Card>
  );
}