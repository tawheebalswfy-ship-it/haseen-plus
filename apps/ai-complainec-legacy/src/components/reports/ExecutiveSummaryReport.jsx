import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

export default function ExecutiveSummaryReport({ report }) {
  const riskColors = {
    low: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700"
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="prose prose-slate max-w-none">
        <p className="text-slate-700 leading-relaxed">{report.summary}</p>
      </div>

      {/* Risk Rating */}
      {report.risk_rating && (
        <Card className="p-4 bg-slate-50 border-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Overall Risk Rating</span>
            <Badge className={riskColors[report.risk_rating?.toLowerCase()] || riskColors.medium}>
              {report.risk_rating}
            </Badge>
          </div>
        </Card>
      )}

      {/* Sections */}
      {report.sections?.map((section, idx) => (
        <div key={idx}>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">{section.heading}</h3>
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{section.content}</p>
        </div>
      ))}

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            Key Recommendations
          </h3>
          <div className="space-y-2">
            {report.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-teal-50">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {idx + 1}
                </span>
                <p className="text-slate-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}