import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useComplianceStore } from "../store";
import { useLanguage } from "../../../contexts/LanguageContext";
import { policyClassifierAPI, getComplianceLabel, getComplianceColor } from "../../../lib/api";
import type { AnalyzeResponse, GapDetail } from "../../../lib/api";
import { extractTextFromFile } from "../../../lib/extract";
import { getPolicyFileUrl, uploadPolicyFile } from "../../../lib/storage";
import { useAuth } from "../../../contexts/AuthContext";

export default function PoliciesPage() {
  const { policies, loading, error, addPolicy, updatePolicy, deletePolicy } = useComplianceStore();
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const c = t.compliance.policies;
  const cc = t.compliance.common;

  const [searchParams, setSearchParams] = useSearchParams();
  const [showUploader, setShowUploader] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (searchParams.get("open") === "true") {
      setShowUploader(true);
      setSearchParams({}, { replace: true });
    }
  }, []);
  const [newTitle, setNewTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<"idle" | "extracting" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [textViewPolicy, setTextViewPolicy] = useState<{ title: string; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = policies.filter((p) => filterStatus === "all" || p.status === filterStatus);

  const collectGaps = (result: AnalyzeResponse): GapDetail[] => {
    const fromResponse = result.detected_gaps ?? result.gaps;
    if (Array.isArray(fromResponse) && fromResponse.length > 0) {
      return fromResponse.map((gap) => ({
        ...gap,
        gap_id: gap.gap_id ?? gap.label ?? "GAP_UNKNOWN",
      }));
    }

    const domainGaps = Object.values(result.domains ?? {}).flatMap((domain) => domain.gaps ?? []);
    if (domainGaps.length > 0) {
      return domainGaps.map((gap) => ({
        ...gap,
        gap_id: gap.gap_id ?? gap.label ?? "GAP_UNKNOWN",
      }));
    }

    return [
      ...(result.password_policy?.details ?? []),
      ...(result.risk_assessment?.details ?? []),
    ];
  };

  const getResultScorePercent = (result: AnalyzeResponse): number => {
    if (typeof result.compliance_score === "number") return result.compliance_score;
    if (typeof result.score === "number") return result.score;
    const gapCount = result.detected_gaps?.length ?? result.gaps?.length ?? result.gap_count ?? 0;
    const score = Math.round(result.overall_score * 100);
    return gapCount > 0 && score === 100 ? Math.max(0, 100 - gapCount * 5) : score;
  };

  const resetUploader = () => {
    setNewTitle("");
    setSelectedFile(null);
    setPastedText("");
    setUploadStep("idle");
    setUploadError(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set title from filename if empty
      if (!newTitle.trim()) {
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        setNewTitle(name);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newTitle.trim()) {
        const name = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        setNewTitle(name);
      }
    }
  }, [newTitle]);

  const handleUploadAndAnalyze = async () => {
    setUploadError(null);

    if (!newTitle.trim()) {
      setUploadError("Enter a policy title before analyzing.");
      return;
    }

    if (!selectedFile && !pastedText.trim()) {
      setUploadError("Select a policy file or paste policy text before analyzing.");
      return;
    }

    setIsUploading(true);
    let policyText = pastedText.trim();
    let fileUrl: string | undefined;
    let shouldCloseUploader = false;

    try {
      // Step 1: Extract text from file using pdf.js / docx parser
      if (selectedFile) {
        setUploadStep("extracting");
        policyText = await extractTextFromFile(selectedFile);
        if (!policyText.trim()) {
          throw new Error("Could not extract text from file");
        }

        // Step 1b: Upload original file to private Supabase Storage
        setUploadStep("uploading");
        try {
          if (!user?.id) {
            throw new Error("User session is required to upload a policy file");
          }
          const { path, error: uploadError } = await uploadPolicyFile(user.id, selectedFile);

          if (!uploadError) {
            fileUrl = path;
          } else {
            console.warn("File upload to storage failed (continuing without):", uploadError);
          }
        } catch (storageErr) {
          console.warn("Storage upload error (continuing):", storageErr);
        }
      }

      // Step 2: Create policy as "analyzing"
      setUploadStep("analyzing");
      const policyId = await addPolicy({
        title: newTitle,
        status: "analyzing",
        file_url: fileUrl,
      });

      // Step 3: Analyze with gap detection model (server handles chunking)
      try {
        const result: AnalyzeResponse = await policyClassifierAPI.analyzeDocument(policyText);

        // Collect all gaps from both domains
        const allGaps = collectGaps(result);
        const scorePercent = getResultScorePercent(result);

        await updatePolicy(policyId, {
          status: "analyzed",
          compliance_score: scorePercent,
          category: getComplianceLabel(result.overall_compliance),
          analysis_result: {
            overall_compliance: result.overall_compliance,
            overall_score: result.overall_score,
            score: result.score,
            compliance_score: scorePercent,
            compliance_status: result.compliance_status,
            gap_count: result.gap_count,
            num_chunks: result.num_chunks,
            inference_time_ms: result.inference_time_ms,
            domains_detected: result.domains_detected,
            domains: result.domains,
            password_policy: result.password_policy,
            risk_assessment: result.risk_assessment,
            detected_gaps: result.detected_gaps,
            gap_labels: result.gap_labels,
            recommendations: result.recommendations,
            predictions: result.predictions,
            all_gap_probabilities: result.all_gap_probabilities,
            gaps_detected: allGaps,
            text_length: policyText.length,
            extracted_text: policyText.slice(0, 30000),
          },
        });

        setUploadStep("done");
        shouldCloseUploader = true;
      } catch {
        // Classification failed but policy is saved
        await updatePolicy(policyId, { status: "uploaded" });
        setUploadError("Analysis failed. The policy was saved, but no analysis result was returned.");
        setUploadStep("error");
      }
    } catch {
      setUploadError("Could not upload or analyze this policy. Check the file or pasted text and try again.");
      setUploadStep("error");
    }

    if (shouldCloseUploader) {
      setTimeout(() => {
        setShowUploader(false);
        resetUploader();
      }, 1500);
    } else {
      setIsUploading(false);
    }
  };

  /** Re-analyze an existing policy — uses stored extracted text if available */
  const handleReanalyze = async (policyId: string, title: string) => {
    await updatePolicy(policyId, { status: "analyzing" });
    try {
      const policy = policies.find((p) => p.id === policyId);
      const storedText = (policy?.analysis_result as Record<string, unknown> | undefined)?.extracted_text as string | undefined;
      const textToAnalyze = storedText || title;

      const result: AnalyzeResponse = await policyClassifierAPI.analyzeDocument(textToAnalyze);

      const allGaps = collectGaps(result);
      const scorePercent = getResultScorePercent(result);

      await updatePolicy(policyId, {
        status: "analyzed",
        compliance_score: scorePercent,
        category: getComplianceLabel(result.overall_compliance),
        analysis_result: {
          overall_compliance: result.overall_compliance,
          overall_score: result.overall_score,
          score: result.score,
          compliance_score: scorePercent,
          compliance_status: result.compliance_status,
          gap_count: result.gap_count,
          num_chunks: result.num_chunks,
          inference_time_ms: result.inference_time_ms,
          domains_detected: result.domains_detected,
          domains: result.domains,
          password_policy: result.password_policy,
          risk_assessment: result.risk_assessment,
          detected_gaps: result.detected_gaps,
          gap_labels: result.gap_labels,
          recommendations: result.recommendations,
          predictions: result.predictions,
          all_gap_probabilities: result.all_gap_probabilities,
          gaps_detected: allGaps,
          text_length: textToAnalyze.length,
          extracted_text: storedText,
        },
      });
    } catch {
      await updatePolicy(policyId, { status: "uploaded" });
    }
  };

  const scoreColor = (score?: number) => {
    if (score === undefined || score === null) return "text-gray-400";
    if (score >= 80) return "text-gray-600 dark:text-gray-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      uploaded: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      analyzing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      analyzed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const canUpload = newTitle.trim() && (selectedFile || pastedText.trim()) && !isUploading;

  const openPolicyFile = async (filePath: string) => {
    const { url, error } = await getPolicyFileUrl(filePath);
    if (error || !url) {
      console.error("Failed to create signed policy file URL:", error);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[24px] border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-400 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading policies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <h1 className="text-lg font-semibold text-red-700 dark:text-red-300">Could not load policies</h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{c.subtitle}</p>
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="mt-4 sm:mt-0 inline-flex items-center rounded-full bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer border-0"
        >
          {c.uploadPolicy}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "uploaded", "analyzing", "analyzed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium cursor-pointer border transition-all ${
              filterStatus === status
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
            }`}
          >
            {status === "all" ? cc.all : status === "uploaded" ? cc.uploaded : status === "analyzing" ? cc.analyzing : cc.analyzed}
          </button>
        ))}
      </div>

      {/* Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((policy) => {
          const details = policy.analysis_result as Record<string, unknown> | undefined;
          const isExpanded = expandedPolicy === policy.id;

          return (
            <div
              key={policy.id}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-300 dark:text-gray-600">POL</div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBadge(policy.status)}`}>
                  {policy.status === "analyzing" ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                      {cc.analyzing}
                    </span>
                  ) : (
                    policy.status === "uploaded" ? cc.uploaded : policy.status === "analyzed" ? cc.analyzed : policy.status
                  )}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{policy.title}</h3>
              {policy.category && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{policy.category}</p>
              )}

              {policy.compliance_score !== undefined && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        policy.compliance_score >= 80 ? "bg-gray-500" : policy.compliance_score >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${policy.compliance_score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${scoreColor(policy.compliance_score)}`}>{policy.compliance_score}%</span>
                </div>
              )}

              {/* Expandable analysis details */}
              {details && (
                <>
                  <button
                    onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
                    className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 cursor-pointer border-0 bg-transparent font-medium mb-2"
                  >
                    {isExpanded ? "▾" : "▸"} {c.viewDetails}
                    {details.gap_count != null && ` (${details.gap_count as number} gaps)`}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-3 dark:bg-gray-800/50">
                      {/* Overall compliance */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{c.complianceLabel}:</span>
                          {(() => {
                            const color = getComplianceColor(String(details.overall_compliance ?? ""));
                            const label = getComplianceLabel(String(details.overall_compliance ?? ""));
                            const colorMap: Record<string, string> = {
                              green: "text-green-600 dark:text-green-400",
                              amber: "text-amber-600 dark:text-amber-400",
                              red: "text-red-600 dark:text-red-400",
                              gray: "text-gray-600 dark:text-gray-400",
                            };
                            return (
                              <span className={`font-semibold ${colorMap[color] || "text-gray-600 dark:text-gray-400"}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Score:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{Math.round((details.overall_score as number) * 100)}%</span>
                        </div>
                        {Array.isArray(details.domains_detected) && (details.domains_detected as string[]).length > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Domains:</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {(details.domains_detected as string[]).map(d => d.replace(/_/g, " ")).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Detected Gaps by Domain */}
                      {(() => {
                        const ppDetails = details.password_policy as Record<string, unknown> | undefined;
                        const raDetails = details.risk_assessment as Record<string, unknown> | undefined;
                        const domainsDetected = (details.domains_detected as string[]) || [];
                        const ppGaps = (ppDetails?.details as GapDetail[]) || [];
                        const raGaps = (raDetails?.details as GapDetail[]) || [];
                        const showPasswordPolicy = domainsDetected.includes("password_policy") || ppGaps.length > 0;
                        const showRiskAssessment = domainsDetected.includes("risk_assessment") || raGaps.length > 0;
                        const totalGaps = ppGaps.length + raGaps.length;

                        if (totalGaps === 0) {
                          return (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">✓ No compliance gaps detected</span>
                            </div>
                          );
                        }

                        return (
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                              Detected Gaps ({totalGaps}):
                            </span>
                            {showPasswordPolicy && ppGaps.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-gray-600 dark:text-gray-300 font-medium text-[11px] uppercase tracking-wider">Password Policy ({ppGaps.length})</span>
                                {ppGaps.map((gap) => (
                                  <div key={gap.gap_id} className="flex items-start gap-2 p-1.5 rounded bg-red-50 dark:bg-red-950/20">
                                    <span className="text-red-500 mt-0.5">⚠</span>
                                    <div className="flex-1">
                                      <span className="font-mono text-red-700 dark:text-red-400">{gap.gap_id}</span>
                                      <span className="text-gray-400 mx-1">—</span>
                                      <span className="text-gray-600 dark:text-gray-300">{gap.description}</span>
                                      <span className="text-gray-400 ms-1">({(gap.confidence * 100).toFixed(0)}%)</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {showRiskAssessment && raGaps.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-gray-600 dark:text-gray-300 font-medium text-[11px] uppercase tracking-wider">Risk Assessment ({raGaps.length})</span>
                                {raGaps.map((gap) => (
                                  <div key={gap.gap_id} className="flex items-start gap-2 p-1.5 rounded bg-red-50 dark:bg-red-950/20">
                                    <span className="text-red-500 mt-0.5">⚠</span>
                                    <div className="flex-1">
                                      <span className="font-mono text-red-700 dark:text-red-400">{gap.gap_id}</span>
                                      <span className="text-gray-400 mx-1">—</span>
                                      <span className="text-gray-600 dark:text-gray-300">{gap.description}</span>
                                      <span className="text-gray-400 ms-1">({(gap.confidence * 100).toFixed(0)}%)</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Domain scores */}
                      {(() => {
                        const ppDetails = details.password_policy as Record<string, unknown> | undefined;
                        const raDetails = details.risk_assessment as Record<string, unknown> | undefined;
                        const domainsDetected = (details.domains_detected as string[]) || [];
                        const showPasswordPolicy = domainsDetected.includes("password_policy") || (((ppDetails?.gap_count as number | undefined) ?? 0) > 0);
                        const showRiskAssessment = domainsDetected.includes("risk_assessment") || (((raDetails?.gap_count as number | undefined) ?? 0) > 0);
                        if (!ppDetails && !raDetails) return null;
                        return (
                          <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400 font-medium">Domain Scores:</span>
                            {ppDetails && showPasswordPolicy && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Password Policy</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                                    <div
                                      className={`h-1.5 rounded-full ${(ppDetails.score as number) >= 0.7 ? "bg-gray-500" : (ppDetails.score as number) >= 0.4 ? "bg-amber-500" : "bg-red-500"}`}
                                      style={{ width: `${(ppDetails.score as number) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-mono w-12 text-right text-gray-900 dark:text-white">{((ppDetails.score as number) * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            )}
                            {raDetails && showRiskAssessment && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Risk Assessment</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                                    <div
                                      className={`h-1.5 rounded-full ${(raDetails.score as number) >= 0.7 ? "bg-gray-500" : (raDetails.score as number) >= 0.4 ? "bg-amber-500" : "bg-red-500"}`}
                                      style={{ width: `${(raDetails.score as number) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-mono w-12 text-right text-gray-900 dark:text-white">{((raDetails.score as number) * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <span>{new Date(policy.created_date).toLocaleDateString()}</span>
                <div className="flex gap-3">
                  {typeof (details as Record<string, unknown> | undefined)?.extracted_text === "string" && (
                    <button
                      onClick={() => setTextViewPolicy({ title: policy.title, text: (details as Record<string, unknown>).extracted_text as string })}
                      className="text-gray-500 hover:text-gray-700 cursor-pointer border-0 bg-transparent dark:text-gray-400"
                    >
                      {locale === "ar" ? "عرض النص" : "View Text"}
                    </button>
                  )}
                  {policy.file_url && (
                    <button
                      onClick={() => openPolicyFile(policy.file_url as string)}
                      className="text-gray-500 hover:text-gray-700 cursor-pointer border-0 bg-transparent dark:text-gray-400"
                    >
                      Open File
                    </button>
                  )}
                  {policy.status !== "analyzing" && (
                    <button
                      onClick={() => handleReanalyze(policy.id, policy.title)}
                      className="text-gray-500 hover:text-gray-700 cursor-pointer border-0 bg-transparent dark:text-gray-400"
                    >
                      {c.reanalyze}
                    </button>
                  )}
                  <button
                    onClick={() => deletePolicy(policy.id)}
                    className="text-red-400 hover:text-red-600 cursor-pointer border-0 bg-transparent"
                  >
                    {cc.delete}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-[24px] border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-300 dark:text-gray-600">POLICIES</div>
          <p className="text-gray-500 dark:text-gray-400">{c.noPolicy}</p>
        </div>
      )}

      {/* ── Policy Text Viewer Dialog ── */}
      {textViewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setTextViewPolicy(null)}>
          <div
            className="bg-white rounded-xl w-full max-w-3xl shadow-xl dark:bg-gray-900 max-h-[85vh] flex flex-col mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{textViewPolicy.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {locale === "ar" ? `${textViewPolicy.text.length.toLocaleString()} حرف` : `${textViewPolicy.text.length.toLocaleString()} characters`}
                </p>
              </div>
              <button
                onClick={() => setTextViewPolicy(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer border-0 bg-transparent p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 dark:bg-gray-950/40">
              <div
                dir="auto"
                className="text-sm text-gray-700 dark:text-gray-300 leading-7 max-w-none"
              >
                {textViewPolicy.text.split(/\n{2,}|\s{2,}(?=[A-Z0-9\u0600-\u06FF]+[\.\)])/).map((para, i) => {
                  const parts = para.split(/(?=[•▪■●])/g);
                  if (parts.length > 1) {
                    return (
                      <div key={i} className="mb-4">
                        {parts[0] && <p className="mb-2">{parts[0].trim()}</p>}
                        <ul className="list-disc list-inside space-y-1 ps-2">
                          {parts.slice(parts[0].trim() ? 1 : 0).map((b, j) => (
                            <li key={j} className="text-gray-600 dark:text-gray-400">{b.replace(/^[•▪■●]\s*/, '').trim()}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  const isHeading = /^\d+(\.\d+)*\s/.test(para.trim());
                  return (
                    <p key={i} className={`mb-3 ${isHeading ? 'font-semibold text-gray-900 dark:text-white mt-5' : ''}`}>
                      {para.trim()}
                    </p>
                  );
                })}
              </div>
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => { navigator.clipboard.writeText(textViewPolicy.text); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                {locale === "ar" ? "نسخ النص" : "Copy Text"}
              </button>
              <button
                onClick={() => setTextViewPolicy(null)}
                className="px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer border-0"
              >
                {locale === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Dialog ── */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!isUploading) { setShowUploader(false); resetUploader(); } }}>
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{c.dialogTitle}</h3>

            {/* Upload progress states */}
            {uploadStep !== "idle" && (
              <div className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
                <div className="flex items-center gap-3">
                  {uploadStep === "extracting" && (
                    <>
                      <span className="inline-block h-5 w-5 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{c.extractingText}</span>
                    </>
                  )}
                  {uploadStep === "uploading" && (
                    <>
                      <span className="inline-block h-5 w-5 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Uploading file to storage…</span>
                    </>
                  )}
                  {uploadStep === "analyzing" && (
                    <>
                      <span className="inline-block h-5 w-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{c.analyzingPolicy}</span>
                    </>
                  )}
                  {uploadStep === "done" && (
                    <>
                      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{c.analysisComplete}</span>
                    </>
                  )}
                  {uploadStep === "error" && (
                    <>
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      <span className="text-sm text-red-600 dark:text-red-400">{c.analysisError}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {uploadError}
              </div>
            )}

            <div className="space-y-4">
              {/* Policy Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{c.policyTitle}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={c.placeholder}
                  disabled={isUploading}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                />
              </div>

              {/* File Drop Zone / Selection */}
              <div>
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="flex flex-col items-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50/30 transition-all cursor-pointer dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-950/20"
                  >
                    <svg className="w-10 h-10 text-gray-300 mb-3 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.dragDrop}</p>
                    <p className="text-xs text-gray-400 mt-1">{c.fileTypes}</p>
                    <button
                      type="button"
                      className="mt-3 px-4 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer bg-transparent dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-950/30"
                    >
                      {c.browseFiles}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border border-gray-200 bg-gray-50 rounded-xl dark:border-gray-800 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.fileSelected} — {(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer border-0 bg-transparent font-medium"
                      >
                        {c.removeFile}
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Divider: OR paste text */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{c.orPasteText}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Text area for paste */}
              <div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={c.pasteHere}
                  disabled={isUploading}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 resize-none dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                />
                {pastedText.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{pastedText.length} {c.textPasted}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => { setShowUploader(false); resetUploader(); }}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 disabled:opacity-50"
                >
                  {cc.cancel}
                </button>
                <button
                  onClick={handleUploadAndAnalyze}
                  disabled={!canUpload}
                  className="px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 cursor-pointer border-0"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 border-t-transparent dark:border-t-transparent animate-spin" />
                      {uploadStep === "extracting" ? c.extractingText : uploadStep === "uploading" ? "Uploading…" : c.analyzingPolicy}
                    </span>
                  ) : (
                    c.upload
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
