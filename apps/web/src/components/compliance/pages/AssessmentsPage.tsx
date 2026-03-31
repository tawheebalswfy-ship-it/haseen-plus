import { useState, useRef } from "react";
import { useComplianceStore } from "../store";
import { NCA_CONTROLS, FRAMEWORK_COLORS, DOMAIN_CONTROL_MAP, GAP_CONTROL_MAP } from "../types";
import type { ComplianceAssessment, ControlResult, Comment, EvidenceFile } from "../types";
import { useLanguage } from "../../../contexts/LanguageContext";
import type { GapDetail } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { uploadEvidenceFile, getEvidenceFileUrl, deleteEvidenceFile, downloadEvidenceFile } from "../../../lib/storage";

export default function AssessmentsPage() {
  const { assessments, policies, addAssessment, updateAssessment, deleteAssessment, addTask } = useComplianceStore();
  const { user } = useAuth();
  const { t } = useLanguage();
  const c = t.compliance.assessments;
  const cc = t.compliance.common;
  const [showNew, setShowNew] = useState(false);
  const selectedFramework = "ECC";
  const [assessmentName, setAssessmentName] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"controls" | "evidence" | "comments" | "audit">("controls");
  const [commentText, setCommentText] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const evidenceRef = useRef<HTMLInputElement>(null);
  const [evidenceControl, setEvidenceControl] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [previewEvidence, setPreviewEvidence] = useState<{ name: string; url: string; type: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const detail = assessments.find((a) => a.id === detailId);

  const runAssessment = async () => {
    if (!assessmentName.trim() || running) return;
    setRunning(true);

    const controls = NCA_CONTROLS[selectedFramework] || [];
    const analyzedPolicies = policies.filter((p) => p.status === "analyzed");

    // If no analyzed policies → all not_assessed
    if (analyzedPolicies.length === 0) {
      const results: ControlResult[] = controls.map((ctrl) => ({
        control_id: ctrl.id, control_name: ctrl.name, domain: ctrl.domain,
        status: "not_assessed" as const, score: 0,
        findings: "No analyzed policies available. Upload and analyze policies first.",
        evidence_files: [],
      }));
      await addAssessment({ name: assessmentName, framework: selectedFramework, status: "completed", overall_score: 0, results, comments: [] });
      setRunning(false); setAssessmentName(""); setShowNew(false);
      return;
    }

    // ── 1. Collect domains and gaps from all analyzed policies ──
    const detectedDomains = new Set<string>();
    const allGaps: GapDetail[] = [];

    for (const p of analyzedPolicies) {
      const ar = p.analysis_result as Record<string, unknown> | undefined;
      if (!ar) continue;

      // Read domains_detected from new analysis result
      if (Array.isArray(ar.domains_detected)) {
        for (const d of ar.domains_detected as string[]) detectedDomains.add(d);
      }

      // Collect gaps from domain-level results
      const ppResult = ar.password_policy as Record<string, unknown> | undefined;
      const raResult = ar.risk_assessment as Record<string, unknown> | undefined;
      if (ppResult && Array.isArray(ppResult.details)) {
        allGaps.push(...(ppResult.details as GapDetail[]));
      }
      if (raResult && Array.isArray(raResult.details)) {
        allGaps.push(...(raResult.details as GapDetail[]));
      }

      // Also check flat gaps_detected array (backwards compatibility)
      if (Array.isArray(ar.gaps_detected)) {
        for (const g of ar.gaps_detected as GapDetail[]) {
          if (!allGaps.some(existing => existing.gap_id === g.gap_id)) {
            allGaps.push(g);
          }
        }
      }
    }

    // Deduplicate gaps (keep highest confidence per gap_id)
    const uniqueGaps = Array.from(
      new Map(allGaps.map((g) => [g.gap_id, g])).values()
    );

    // ── 2. Determine coverable controls from detected domains ──
    const coverableControlIds = new Set<string>();
    detectedDomains.forEach((domain) => {
      (DOMAIN_CONTROL_MAP[domain] || []).forEach((cid) => coverableControlIds.add(cid));
    });

    // ── 3. Route gaps to controls ──
    const gapsPerControl = new Map<string, GapDetail[]>();
    for (const g of uniqueGaps) {
      const targetCtrl = GAP_CONTROL_MAP[g.gap_id];
      if (targetCtrl) {
        if (!gapsPerControl.has(targetCtrl)) gapsPerControl.set(targetCtrl, []);
        gapsPerControl.get(targetCtrl)!.push(g);
      }
    }

    // ── 4. Score each control ──
    const domainLabel = Array.from(detectedDomains).join(", ") || "unknown";
    const uncoveredMsg = `Not covered by the current ML model. The model is trained on: password_policy, risk_assessment. Detected domains: ${domainLabel}. Upload a relevant policy or manually assess this control.`;

    const results: ControlResult[] = controls.map((ctrl) => {
      if (!coverableControlIds.has(ctrl.id)) {
        return {
          control_id: ctrl.id, control_name: ctrl.name, domain: ctrl.domain,
          status: "not_assessed" as const, score: 0,
          findings: uncoveredMsg, evidence_files: [],
        };
      }

      const controlGaps = gapsPerControl.get(ctrl.id) || [];

      if (controlGaps.length === 0) {
        // No gaps found for this control → compliant
        return {
          control_id: ctrl.id, control_name: ctrl.name, domain: ctrl.domain,
          status: "compliant" as const, score: 100,
          findings: "No compliance gaps detected for this control.",
          evidence_files: [],
        };
      }

      // Has gaps → determine severity
      const avgConfidence = controlGaps.reduce((sum, g) => sum + g.confidence, 0) / controlGaps.length;
      const gapDescs = controlGaps
        .filter((g) => g.confidence >= 0.5)
        .map((g) => `${g.gap_id}: ${g.description} (${(g.confidence * 100).toFixed(0)}%)`)
        .slice(0, 4);

      if (avgConfidence >= 0.7) {
        return {
          control_id: ctrl.id, control_name: ctrl.name, domain: ctrl.domain,
          status: "non_compliant" as const,
          score: Math.round((1 - avgConfidence) * 30),
          findings: gapDescs.length > 0 ? `Gaps: ${gapDescs.join("; ")}` : `High-confidence gap detected for ${ctrl.name}.`,
          evidence_files: [],
        };
      }

      return {
        control_id: ctrl.id, control_name: ctrl.name, domain: ctrl.domain,
        status: "partial" as const,
        score: Math.round((1 - avgConfidence) * 70),
        findings: gapDescs.length > 0 ? `Partial gaps: ${gapDescs.join("; ")}` : `Partial gap detected for ${ctrl.name}.`,
        evidence_files: [],
      };
    });

    // Overall score = average across ALL controls (honest compliance posture)
    const assessed = results.filter((r) => r.status !== "not_assessed");
    const overall = assessed.length > 0
      ? Math.round(assessed.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;

    await addAssessment({
      name: assessmentName,
      framework: selectedFramework,
      status: "completed",
      overall_score: overall,
      results,
      comments: [],
    });
    setRunning(false);
    setAssessmentName("");
    setShowNew(false);
  };

  const cycleControlStatus = (controlId: string) => {
    if (!detail) return;
    const order: ControlResult["status"][] = ["compliant", "partial", "non_compliant", "not_assessed"];
    const updated = (detail.results || []).map((r) => {
      if (r.control_id !== controlId) return r;
      const idx = order.indexOf(r.status);
      const next = order[(idx + 1) % order.length];
      const score = next === "compliant" ? 100 : next === "partial" ? 50 : next === "non_compliant" ? 0 : 0;
      return { ...r, status: next, score };
    });
    const compliant = updated.filter((r) => r.status === "compliant").length;
    const overall = Math.round((compliant / updated.length) * 100);
    updateAssessment(detail.id, { results: updated, overall_score: overall });
  };

  const addComment = () => {
    if (!detail || !commentText.trim()) return;
    const comment: Comment = { id: crypto.randomUUID(), author: "You", text: commentText, created_date: new Date().toISOString() };
    const comments = [...(detail.comments || []), comment];
    updateAssessment(detail.id, { comments } as Partial<ComplianceAssessment>);
    setCommentText("");
  };

  const handleEvidenceUpload = async (controlId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!detail || !e.target.files?.length || !user) return;
    const file = e.target.files[0];

    const { path, error } = await uploadEvidenceFile(user.id, detail.id, file);
    if (error) {
      console.error("Evidence upload failed:", error);
      return;
    }

    const evidence: EvidenceFile = { id: crypto.randomUUID(), name: file.name, url: path, size: file.size, uploaded_date: new Date().toISOString() };
    const updated = (detail.results || []).map((r) => {
      if (r.control_id !== controlId) return r;
      return { ...r, evidence_files: [...(r.evidence_files || []), evidence] };
    });
    updateAssessment(detail.id, { results: updated });
    setEvidenceControl(null);
  };

  const clearEvidence = async (controlId: string, evidenceId: string) => {
    if (!detail) return;
    const ctrl = (detail.results || []).find((r) => r.control_id === controlId);
    const ev = ctrl?.evidence_files?.find((e) => e.id === evidenceId);
    if (ev?.url) await deleteEvidenceFile(ev.url);
    const updated = (detail.results || []).map((r) => {
      if (r.control_id !== controlId) return r;
      return { ...r, evidence_files: (r.evidence_files || []).filter((e) => e.id !== evidenceId) };
    });
    updateAssessment(detail.id, { results: updated });
  };

  const viewEvidence = async (filePath: string, fileName: string) => {
    setPreviewLoading(true);
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    let type = "other";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) type = "image";
    else if (ext === "pdf") type = "pdf";

    // Download file as blob to create a local preview URL (avoids CORS/signed-URL issues)
    const { blob, error } = await downloadEvidenceFile(filePath);
    setPreviewLoading(false);
    if (error || !blob) {
      console.error("Failed to load evidence for preview:", error);
      // Fallback: try opening signed URL in new tab
      const signed = await getEvidenceFileUrl(filePath);
      if (signed.url) window.open(signed.url, "_blank", "noopener,noreferrer");
      return;
    }
    const blobUrl = URL.createObjectURL(blob);
    setPreviewEvidence({ name: fileName, url: blobUrl, type });
  };

  const closePreview = () => {
    if (previewEvidence) {
      URL.revokeObjectURL(previewEvidence.url);
      setPreviewEvidence(null);
    }
  };

  const downloadEvidence = async (filePath: string, fileName: string) => {
    const { blob, error } = await downloadEvidenceFile(filePath);
    if (error || !blob) {
      console.error("Failed to download evidence:", error);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTasksFromGaps = () => {
    if (!detail) return;
    const gaps = (detail.results || []).filter((r) => r.status === "non_compliant");
    const fwControls = NCA_CONTROLS[detail.framework] || [];
    let count = 0;
    for (const gap of gaps) {
      const ctrl = fwControls.find((c) => c.id === gap.control_id);
      const effortMap: Record<string, string> = { critical: "20–40 hours", high: "15–25 hours", medium: "8–15 hours", low: "4–8 hours" };
      addTask({
        title: `Remediate: ${gap.control_name}`,
        description: `Control ${gap.control_id} was found non-compliant in assessment "${detail.name}". Gap: ${gap.findings || "Requires remediation."}`,
        control_id: gap.control_id,
        assessment_id: detail.id,
        priority: ctrl?.priority || "high",
        status: "open",
        ai_guidance: {
          steps: [
            `Review ${gap.control_id} requirements: ${ctrl?.description || "Refer to the " + detail.framework + " framework documentation."}`,
            "Assess current implementation against the specific control requirements",
            gap.findings ? `Address identified gap: ${gap.findings}` : "Identify specific gaps in current implementation",
            "Implement required changes and collect supporting evidence",
            "Conduct a follow-up assessment to verify remediation",
          ],
          estimated_effort: effortMap[ctrl?.priority || "high"],
          tools_needed: ctrl?.domain.includes("Network") ? ["Network Scanner", "Firewall Manager", "GRC Platform"] :
                        ctrl?.domain.includes("Access") || ctrl?.domain.includes("Identity") ? ["IAM Platform", "MFA Solution", "GRC Platform"] :
                        ctrl?.domain.includes("Data") ? ["DLP Solution", "Encryption Tools", "GRC Platform"] :
                        ctrl?.domain.includes("Incident") ? ["SIEM/SOAR", "Incident Management Platform", "GRC Platform"] :
                        ["GRC Platform", "Security Scanner", "Documentation System"],
        },
      });
      count++;
    }
    setGenMsg(`${count} ${c.tasksGenerated}`);
    setTimeout(() => setGenMsg(""), 3000);
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      compliant: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      non_compliant: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      not_assessed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
    return m[s] || m.not_assessed;
  };

  if (detail) {
    const grouped = (detail.results || []).reduce<Record<string, ControlResult[]>>((acc, r) => {
      const d = r.domain || "General";
      (acc[d] = acc[d] || []).push(r);
      return acc;
    }, {});

    const tabs = [
      { key: "controls" as const, label: c.controls },
      { key: "evidence" as const, label: c.evidence },
      { key: "comments" as const, label: c.comments },
      { key: "audit" as const, label: c.auditHistory },
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => { setDetailId(null); setActiveTab("controls"); }} className="text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer bg-transparent border-0 dark:text-gray-400 dark:hover:text-gray-200">
          {c.backToList}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{detail.name}</h1>
            <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
              Framework: <span className="font-semibold" style={{ color: FRAMEWORK_COLORS[detail.framework] }}>{detail.framework}</span>
              {" · "}{c.created}: {new Date(detail.created_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={generateTasksFromGaps}
              className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 cursor-pointer border-0"
            >
              {c.generateTasks}
            </button>
            <button
              onClick={() => {
                if (window.confirm(c.confirmDelete)) {
                  deleteAssessment(detail.id);
                  setDetailId(null);
                }
              }}
              className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer border-0"
            >
              {c.deleteAssessment}
            </button>
            <div className="text-3xl font-bold" style={{ color: detail.overall_score >= 70 ? "#6b7280" : detail.overall_score >= 40 ? "#f59e0b" : "#ef4444" }}>
              {detail.overall_score}%
            </div>
          </div>
        </div>

        {genMsg && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium dark:bg-gray-800 dark:text-gray-400">
            {genMsg}
          </div>
        )}

        {/* Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: cc.compliant, count: detail.results?.filter((r) => r.status === "compliant").length || 0, color: "gray" },
            { label: cc.partial, count: detail.results?.filter((r) => r.status === "partial").length || 0, color: "amber" },
            { label: cc.nonCompliant, count: detail.results?.filter((r) => r.status === "non_compliant").length || 0, color: "red" },
            { label: cc.notAssessed, count: detail.results?.filter((r) => r.status === "not_assessed").length || 0, color: "gray" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className={`text-2xl font-bold text-${s.color}-600 dark:text-${s.color}-400`}>{s.count}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ML Coverage Info */}
        {(() => {
          const total = detail.results?.length || 0;
          const assessed = detail.results?.filter((r) => r.status !== "not_assessed").length || 0;
          const notCovered = total - assessed;
          if (notCovered > 0) {
            return (
              <div className="mb-4 px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">ML</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>{assessed}/{total}</strong> {c.controlsCoveredByML}
                    <span className="text-gray-500 dark:text-gray-400"> · {c.mlCoverageNote}</span>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium cursor-pointer border-0 bg-transparent transition-colors ${
                activeTab === tab.key
                  ? "text-gray-600 border-b-2 border-gray-600 dark:text-gray-400 dark:border-gray-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              style={activeTab === tab.key ? { borderBottomWidth: 2, borderBottomStyle: "solid" } : {}}
            >
              {tab.label}
              {tab.key === "comments" && (detail.comments?.length || 0) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{detail.comments?.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Controls Tab */}
        {activeTab === "controls" && (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{c.editStatus}</p>
            {Object.entries(grouped).map(([domain, controls]) => (
              <div key={domain} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">{domain}</h3>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{c.control}</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{cc.status}</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{cc.score}</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">{cc.findings}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {controls.map((ctrl) => (
                        <tr key={ctrl.control_id} className="border-b border-gray-50 last:border-0 dark:border-gray-800/50">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            <span className="text-xs text-gray-400 mr-2">{ctrl.control_id}</span>
                            {ctrl.control_name}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => cycleControlStatus(ctrl.control_id)}
                              className={`text-xs font-semibold px-2 py-1 rounded-full cursor-pointer border-0 ${statusColor(ctrl.status)}`}
                              title={c.editStatus}
                            >
                              {ctrl.status.replace("_", " ")}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">{ctrl.score}%</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{ctrl.findings || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Evidence Tab */}
        {activeTab === "evidence" && (
          <div className="space-y-4">
            {(detail.results || []).map((ctrl) => (
              <div key={ctrl.control_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-gray-400 mr-2">{ctrl.control_id}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{ctrl.control_name}</span>
                  </div>
                  <button
                    onClick={() => { setEvidenceControl(ctrl.control_id); evidenceRef.current?.click(); }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-700 cursor-pointer bg-transparent border-0 dark:text-gray-400"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    {c.uploadEvidence}
                  </button>
                </div>
                {(ctrl.evidence_files?.length || 0) > 0 ? (
                  <div className="space-y-1.5">
                    {ctrl.evidence_files!.map((ev) => (
                      <div key={ev.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg dark:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                          </svg>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{ev.name}</span>
                          <span className="text-xs text-gray-400">({(ev.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewEvidence(ev.url, ev.name)}
                            disabled={previewLoading}
                            className="text-xs text-gray-600 hover:text-gray-700 cursor-pointer bg-transparent border-0 dark:text-gray-400 disabled:opacity-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => downloadEvidence(ev.url, ev.name)}
                            className="text-xs text-gray-600 hover:text-gray-700 cursor-pointer bg-transparent border-0 dark:text-gray-400"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => clearEvidence(ctrl.control_id, ev.id)}
                            className="text-xs text-red-500 hover:text-red-600 cursor-pointer bg-transparent border-0"
                          >
                            {c.clearEvidence}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{c.noEvidence}</p>
                )}
              </div>
            ))}
            <input ref={evidenceRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.svg" className="hidden" onChange={(e) => evidenceControl && handleEvidenceUpload(evidenceControl, e)} />
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={c.commentPlaceholder}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button onClick={addComment} disabled={!commentText.trim()} className="px-4 py-2.5 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 cursor-pointer border-0">
                {c.post}
              </button>
            </div>
            {(detail.comments?.length || 0) > 0 ? (
              <div className="space-y-3">
                {detail.comments!.map((cm) => (
                  <div key={cm.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        {cm.author.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{cm.author}</span>
                      <span className="text-xs text-gray-400">{new Date(cm.created_date).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 ms-9">{cm.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8 dark:text-gray-500">{c.noComments}</p>
            )}
          </div>
        )}

        {/* Audit History Tab */}
        {activeTab === "audit" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-gray-700 dark:text-gray-300">Assessment created</span>
                <span className="text-gray-400 text-xs">{new Date(detail.created_date).toLocaleString()}</span>
              </div>
              {(detail.comments || []).map((cm) => (
                <div key={cm.id} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">Comment by {cm.author}</span>
                  <span className="text-gray-400 text-xs">{new Date(cm.created_date).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{c.subtitle}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="mt-4 sm:mt-0 inline-flex items-center rounded-full bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer border-0"
        >
          {c.newAssessment}
        </button>
      </div>

      {/* Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map((a) => (
          <div key={a.id} onClick={() => setDetailId(a.id)} className="relative rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all cursor-pointer dark:border-gray-800 dark:bg-gray-900 group">
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm(c.confirmDelete)) deleteAssessment(a.id); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 bg-transparent"
              title={c.deleteAssessment}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: FRAMEWORK_COLORS[a.framework] }}>{a.framework}</span>
              <span className="text-2xl font-bold" style={{ color: a.overall_score >= 70 ? "#6b7280" : a.overall_score >= 40 ? "#f59e0b" : "#ef4444" }}>{a.overall_score}%</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{a.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{a.results?.length || 0} {c.controlsAssessed}</p>
            <div className="flex gap-1.5">
              {["compliant", "partial", "non_compliant"].map((s) => {
                const count = a.results?.filter((r) => r.status === s).length || 0;
                const total = a.results?.length || 1;
                return <div key={s} className={`h-2 rounded-full ${s === "compliant" ? "bg-gray-500" : s === "partial" ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${(count / total) * 100}%` }} />;
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">{new Date(a.created_date).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      {assessments.length === 0 && (
        <div className="rounded-[24px] border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-300 dark:text-gray-600">ASSESSMENTS</div>
          <p className="text-gray-500 dark:text-gray-400">{c.noAssessments}</p>
        </div>
      )}

      {/* New Assessment Dialog */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNew(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{c.dialogTitle}</h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{c.nameLabel}</label>
                <input type="text" value={assessmentName} onChange={(e) => setAssessmentName(e.target.value)} placeholder={c.namePlaceholder}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4 dark:bg-gray-800 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">NCA ECC-1:2018</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{NCA_CONTROLS.ECC.length} {cc.controls}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Essential Cybersecurity Controls — ML model trained on ECC controls</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">{cc.cancel}</button>
                <button onClick={runAssessment} disabled={!assessmentName.trim() || running} className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 cursor-pointer border-0">
                  {running && <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {running ? cc.analyzing : c.runAssessment}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Preview Modal */}
      {previewEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closePreview}>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{previewEvidence.name}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewEvidence.url}
                  download={previewEvidence.name}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 no-underline"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download
                </a>
                <button onClick={closePreview} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer bg-transparent border-0">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[300px]">
              {previewEvidence.type === "image" ? (
                <img src={previewEvidence.url} alt={previewEvidence.name} className="max-w-full max-h-[70vh] rounded-lg object-contain" />
              ) : previewEvidence.type === "pdf" ? (
                <iframe src={previewEvidence.url} title={previewEvidence.name} className="w-full h-[70vh] rounded-lg border-0" />
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Preview not available for this file type.</p>
                  <a
                    href={previewEvidence.url}
                    download={previewEvidence.name}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 no-underline"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
