import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, X, CheckCircle, ExternalLink } from "lucide-react";

export default function EvidenceUploader({ controlId, assessmentId, currentEvidenceUrl, onEvidenceSaved }) {
  const [isUploading, setIsUploading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState(currentEvidenceUrl || null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEvidenceUrl(file_url);
    if (onEvidenceSaved) onEvidenceSaved(file_url);
    setIsUploading(false);
  };

  const clearEvidence = () => {
    setEvidenceUrl(null);
    if (onEvidenceSaved) onEvidenceSaved(null);
  };

  return (
    <div className="space-y-2">
      {evidenceUrl ? (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">Evidence attached</p>
            <a
              href={evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
            >
              View file <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-emerald-600 hover:text-red-600 hover:bg-red-50"
            onClick={clearEvidence}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition-all group">
          {isUploading ? (
            <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-slate-400 group-hover:text-teal-500" />
          )}
          <span className="text-sm text-slate-500 group-hover:text-teal-600">
            {isUploading ? "Uploading..." : "Attach evidence file"}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv,.txt"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}