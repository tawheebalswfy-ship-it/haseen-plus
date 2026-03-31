import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, XCircle } from "lucide-react";

export default function GapAnalysisReport({ report }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Gap Analysis Summary</p>
            <p className="text-sm text-red-700 mt-1">{report.summary}</p>
          </div>
        </div>
      </Card>

      {/* Sections (Gaps) */}
      {report.sections?.map((section, idx) => (
        <div key={idx} className="border-l-4 border-red-400 pl-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            {section.heading}
          </h3>
          <p className="text-slate-700 mt-2 whitespace-pre-line">{section.content}</p>
        </div>
      ))}

      {/* Remediation Recommendations */}
      {report.recommendations?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Remediation Actions</h3>
          <div className="space-y-3">
            {report.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
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