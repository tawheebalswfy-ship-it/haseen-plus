import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function DetailedReport({ report }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="prose prose-slate max-w-none">
        <p className="text-slate-700 leading-relaxed">{report.summary}</p>
      </div>

      <Separator />

      {/* Sections */}
      {report.sections?.map((section, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">{section.heading}</h3>
          <div className="p-4 rounded-lg bg-slate-50">
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{section.content}</p>
          </div>
        </div>
      ))}

      {/* Recommendations */}
      {report.recommendations?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Recommendations</h3>
          <ol className="space-y-3">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {idx + 1}
                </span>
                <p className="text-slate-700">{rec}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}