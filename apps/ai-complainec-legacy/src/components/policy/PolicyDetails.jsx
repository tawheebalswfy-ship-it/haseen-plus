import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Lightbulb,
  Shield
} from "lucide-react";
import { format } from "date-fns";

export default function PolicyDetails({ policy, onClose, onReanalyze }) {
  if (!policy) return null;

  const analysis = policy.analysis_result || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-100">
            <FileText className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{policy.title}</h2>
            <p className="text-sm text-slate-500">
              Uploaded {format(new Date(policy.created_date), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {policy.file_url && (
            <a href={policy.file_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View File
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={onReanalyze}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-analyze
          </Button>
        </div>
      </div>

      {policy.status === "analyzed" && (
        <>
          {/* Score Card */}
          <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm mb-1">Compliance Score</p>
                <p className="text-5xl font-bold">{policy.compliance_score}%</p>
              </div>
              <div className={`p-4 rounded-full ${
                policy.compliance_score >= 80 ? "bg-emerald-500/20" :
                policy.compliance_score >= 60 ? "bg-amber-500/20" : "bg-red-500/20"
              }`}>
                <Shield className={`w-8 h-8 ${
                  policy.compliance_score >= 80 ? "text-emerald-400" :
                  policy.compliance_score >= 60 ? "text-amber-400" : "text-red-400"
                }`} />
              </div>
            </div>
            {policy.category && (
              <Badge className="mt-4 bg-white/10 text-white border-0">
                {policy.category.replace(/_/g, " ")}
              </Badge>
            )}
          </Card>

          {/* NCA Controls Mapped */}
          {policy.nca_controls_mapped?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">NCA Controls Addressed</h3>
              <div className="flex flex-wrap gap-2">
                {policy.nca_controls_mapped.map((control, idx) => (
                  <Badge key={idx} variant="outline" className="font-mono text-xs">
                    {control}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {analysis.gaps?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Compliance Gaps
              </h3>
              <ul className="space-y-2">
                {analysis.gaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations?.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-500" />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {policy.status === "pending" && (
        <Card className="p-8 text-center bg-slate-50">
          <p className="text-slate-600">This policy has not been analyzed yet.</p>
          <Button className="mt-4" onClick={onReanalyze}>
            Start Analysis
          </Button>
        </Card>
      )}

      {policy.status === "analyzing" && (
        <Card className="p-8 text-center bg-blue-50">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-blue-700">Analyzing policy document...</p>
        </Card>
      )}
    </div>
  );
}