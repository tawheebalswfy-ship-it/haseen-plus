import { useState } from "react";
import { useComplianceStore } from "../store";
import { NCA_CONTROLS, GAP_NAMES_AR, NCA_CONTROL_NAMES_AR } from "../types";
import type { RemediationTask, Comment } from "../types";
import { useLanguage } from "../../../contexts/LanguageContext";
import { buildGapTasksFromPolicies, getAnalyzedPolicies } from "../../../lib/policyAnalysis";

const PRIORITIES: RemediationTask["priority"][] = ["critical", "high", "medium", "low"];
const STATUSES: RemediationTask["status"][] = ["open", "in_progress", "completed", "deferred"];

export default function RemediationPage() {
  const { tasks, loading, error, addTask, updateTask, deleteTask, deleteAllTasks, assessments, policies } = useComplianceStore();
  const { t, locale } = useLanguage();
  const c = t.compliance.remediation;
  const cc = t.compliance.common;
  const [showCreate, setShowCreate] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<RemediationTask["priority"]>("medium");
  const [newDue, setNewDue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoGenAssessment, setAutoGenAssessment] = useState("");
  const [genMsg, setGenMsg] = useState("");
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-400 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading remediation tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
          <h1 className="text-lg font-semibold text-red-700 dark:text-red-300">Could not load remediation data</h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  /** Translate a findings string like "Gaps: GAP_PP_005: Missing PAM (84%)" to Arabic */
  const translateFindings = (findings: string): string => {
    if (locale !== "ar") return findings;
    return findings.replace(/GAP_(?:PP|RA)_\d{3}(?::\s*[^(;]+)?/g, (match) => {
      const gapId = match.match(/GAP_(?:PP|RA)_\d{3}/)?.[0];
      if (gapId && GAP_NAMES_AR[gapId]) return `${gapId}: ${GAP_NAMES_AR[gapId]}`;
      return match;
    }).replace(/^Gaps:\s*/, "الفجوات: ").replace(/^Partial gaps:\s*/, "فجوات جزئية: ");
  };

  /** Translate task title like "Remediate: Identity Management" to Arabic */
  const translateTitle = (title: string): string => {
    if (locale !== "ar") return title;
    const match = title.match(/^Remediate:\s*(.+)$/);
    if (match) {
      const ctrlName = match[1].trim();
      const arName = Object.values(NCA_CONTROLS).flat().find(c => c.name === ctrlName);
      return `معالجة: ${arName ? NCA_CONTROL_NAMES_AR[arName.id] || ctrlName : ctrlName}`;
    }
    return title;
  };

  /** Translate task description to Arabic */
  const translateDesc = (desc: string): string => {
    if (locale !== "ar") return desc;
    return desc
      .replace(/^Control (ECC-[\d-]+) was found non-compliant in assessment "([^"]+)"\./, (_, ctrlId, name) => {
        const arCtrl = NCA_CONTROL_NAMES_AR[ctrlId] || ctrlId;
        return `الضابط ${ctrlId} (${arCtrl}) غير متوافق في تقييم "${name}".`;
      })
      .replace(/Requires remediation\./, "يتطلب معالجة.")
      .replace(/Gap:\s*/, "الفجوة: ")
      .replace(/GAP_(?:PP|RA)_\d{3}(?::\s*[^(;]+)?/g, (match) => {
        const gapId = match.match(/GAP_(?:PP|RA)_\d{3}/)?.[0];
        if (gapId && GAP_NAMES_AR[gapId]) return `${gapId}: ${GAP_NAMES_AR[gapId]}`;
        return match;
      })
      .replace(/^Gaps:\s*/, "الفجوات: ");
  };

  /** Translate priority label */
  const translatePriority = (p: string): string => {
    if (locale !== "ar") return p;
    const m: Record<string, string> = { critical: cc.critical, high: cc.high, medium: cc.medium, low: cc.low };
    return m[p] || p;
  };

  /** Translate status label */
  const translateStatus = (s: string): string => {
    if (locale !== "ar") return s.replace("_", " ");
    const m: Record<string, string> = { open: cc.open, in_progress: cc.inProgress, completed: cc.completed, deferred: cc.deferred };
    return m[s] || s;
  };

  const policyGapTasks = tasks.length === 0 ? buildGapTasksFromPolicies(policies) : [];
  const visibleTasks = tasks.length > 0 ? tasks : policyGapTasks;
  const filtered = visibleTasks
    .filter((t) => filterStatus === "all" || t.status === filterStatus)
    .filter((t) => filterPriority === "all" || t.priority === filterPriority);

  const stats = {
    total: visibleTasks.length,
    open: visibleTasks.filter((t) => t.status === "open").length,
    inProgress: visibleTasks.filter((t) => t.status === "in_progress").length,
    completed: visibleTasks.filter((t) => t.status === "completed").length,
    critical: visibleTasks.filter((t) => t.priority === "critical").length,
  };

  const priorityColor = (p: string) => {
    const m: Record<string, string> = {
      critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    };
    return m[p] || "";
  };

  const statusColor = (s: string) => {
    const m: Record<string, string> = {
      open: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      in_progress: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
      completed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      deferred: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
    };
    return m[s] || "";
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle,
      description: newDesc,
      priority: newPriority,
      status: "open",
      due_date: newDue || undefined,
      comments: [],
      ai_guidance: {
        steps: [
          "Review the current implementation against the control requirement",
          "Identify specific gaps and document remediation approach",
          "Implement changes following organizational change management process",
          "Validate the implementation with evidence collection",
          "Schedule follow-up assessment to verify compliance",
        ],
        estimated_effort: "10–20 hours",
        tools_needed: ["GRC Platform", "Security Scanner", "Document Management System"],
      },
    });
    setNewTitle("");
    setNewDesc("");
    setNewPriority("medium");
    setNewDue("");
    setShowCreate(false);
  };

  const cycleStatus = (task: RemediationTask) => {
    const idx = STATUSES.indexOf(task.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    updateTask(task.id, { status: next });
  };

  const autoGenerateFromGaps = () => {
    const assessment = assessments.find((a) => a.id === autoGenAssessment);
    if (!assessment) return;
    const gaps = (assessment.results || []).filter((r) => r.status === "non_compliant");
    const fwControls = NCA_CONTROLS[assessment.framework] || [];
    let count = 0;
    for (const gap of gaps) {
      const ctrl = fwControls.find((c) => c.id === gap.control_id);
      const effortMap: Record<string, string> = { critical: "20–40 hours", high: "15–25 hours", medium: "8–15 hours", low: "4–8 hours" };
      addTask({
        title: `Remediate: ${gap.control_name}`,
        description: `Control ${gap.control_id} was found non-compliant in assessment "${assessment.name}". ${gap.findings || "Requires remediation."}`,
        control_id: gap.control_id,
        assessment_id: assessment.id,
        priority: ctrl?.priority || "high",
        status: "open",
        comments: [],
        ai_guidance: {
          steps: [
            `Review ${gap.control_id} requirements: ${ctrl?.description || "Refer to the " + assessment.framework + " framework documentation."}`,
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
    setShowAutoGen(false);
    setAutoGenAssessment("");
  };

  const addTaskComment = (taskId: string) => {
    const text = commentTexts[taskId]?.trim();
    if (!text) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const comment: Comment = { id: crypto.randomUUID(), author: "You", text, created_date: new Date().toISOString() };
    const comments = [...(task.comments || []), comment];
    updateTask(taskId, { comments } as Partial<RemediationTask>);
    setCommentTexts((prev) => ({ ...prev, [taskId]: "" }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {c.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          {tasks.length > 0 && (
            <button
              onClick={() => { if (window.confirm(c.confirmDeleteAll)) deleteAllTasks(); }}
              className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer border-0"
            >
              {c.deleteAllTasks}
            </button>
          )}
          <button
            onClick={() => setShowAutoGen(true)}
            className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 cursor-pointer border-0"
          >
            {c.autoGenerate}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center rounded-full bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer border-0"
          >
            {c.createTask}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: c.total, value: stats.total, color: "text-gray-900 dark:text-white" },
          { label: cc.open, value: stats.open, color: "text-gray-600 dark:text-gray-400" },
          { label: cc.inProgress, value: stats.inProgress, color: "text-gray-600 dark:text-gray-400" },
          { label: cc.completed, value: stats.completed, color: "text-gray-600 dark:text-gray-400" },
          { label: cc.critical, value: stats.critical, color: "text-red-600 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {genMsg && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium dark:bg-gray-800 dark:text-gray-400">
          {genMsg}
        </div>
      )}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-1.5">
          <span className="text-xs text-gray-500 self-center mr-1 dark:text-gray-400">{cc.status}:</span>
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
                filterStatus === s
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
            >
              {s === "all" ? cc.all : s === "open" ? cc.open : s === "in_progress" ? cc.inProgress : s === "completed" ? cc.completed : cc.deferred}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <span className="text-xs text-gray-500 self-center mr-1 dark:text-gray-400">{cc.priority}:</span>
          {["all", ...PRIORITIES].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
                filterPriority === p
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
              }`}
            >
              {p === "all" ? cc.all : p === "critical" ? cc.critical : p === "high" ? cc.high : p === "medium" ? cc.medium : cc.low}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filtered.map((task) => {
          const isSuggestion = task.id.startsWith("policy-gap-");
          return (
          <div key={task.id} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div
              className="p-4 flex items-center gap-4 cursor-pointer"
              onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); if (!isSuggestion) cycleStatus(task); }}
                disabled={isSuggestion}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer bg-transparent ${
                  task.status === "completed"
                    ? "border-gray-500 bg-gray-500"
                    : task.status === "in_progress"
                    ? "border-gray-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {task.status === "completed" && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                )}
                {task.status === "in_progress" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium ${task.status === "completed" ? "text-gray-400 line-through" : "text-gray-900 dark:text-white"}`}>
                  {translateTitle(task.title)}
                </h3>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate dark:text-gray-400">{translateDesc(task.description)}</p>
                )}
                {(task.related_policy || task.domain || task.recommended_action) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {task.related_policy && <span>Policy: {task.related_policy}</span>}
                    {task.domain && <span>Domain: {task.domain.replace(/_/g, " ")}</span>}
                    {task.recommended_action && <span>Action: {task.recommended_action}</span>}
                  </div>
                )}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${priorityColor(task.priority)}`}>
                {translatePriority(task.priority)}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 hidden sm:inline-block ${statusColor(task.status)}`}>
                {translateStatus(task.status)}
              </span>
              {task.due_date && (
                <span className="text-xs text-gray-400 flex-shrink-0 hidden md:inline-block">
                  {task.due_date === "Suggested" ? "Suggested" : new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
              <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expandedId === task.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>

            {expandedId === task.id && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                {task.ai_guidance && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{c.guidance}</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-800">
                      <ol className="list-decimal space-y-2.5 text-sm text-gray-700 dark:text-gray-300 ps-5">
                        {task.ai_guidance.steps.map((step, i) => {
                          const translatedStep = locale === "ar" ? (() => {
                            if (step.startsWith("Review ")) {
                              const ctrlMatch = step.match(/^Review (ECC-[\d-]+) requirements: (.+)$/);
                              if (ctrlMatch) {
                                const arName = NCA_CONTROL_NAMES_AR[ctrlMatch[1]];
                                return c.stepReview.replace("{controlId}", ctrlMatch[1]).replace("{description}", arName || ctrlMatch[2]);
                              }
                            }
                            if (step === "Assess current implementation against the specific control requirements") return c.stepAssess;
                            if (step.startsWith("Address identified gap:")) return c.stepAddress.replace("{findings}", translateFindings(step.replace("Address identified gap: ", "")));
                            if (step === "Identify specific gaps in current implementation") return c.stepIdentify;
                            if (step === "Implement required changes and collect supporting evidence") return c.stepImplement;
                            if (step === "Conduct a follow-up assessment to verify remediation") return c.stepVerify;
                            return step;
                          })() : step;

                          // If the step contains multiple gaps (separated by ;), render as sub-list
                          const isGapStep = step.startsWith("Address identified gap:");
                          const gapItems = isGapStep
                            ? (locale === "ar"
                                ? translatedStep.replace(/^[^:]+:\s*/, "").replace(/^[^:]+:\s*/, "")
                                : step.replace("Address identified gap: ", "")
                              ).split(/;\s*/).filter(Boolean)
                            : [];

                          if (isGapStep && gapItems.length > 1) {
                            return (
                              <li key={i} className="leading-relaxed">
                                <span>{locale === "ar" ? c.stepAddress.split("{findings}")[0] : "Address identified gaps:"}</span>
                                <ul className="list-disc ps-5 mt-1.5 space-y-1">
                                  {gapItems.map((gap, j) => (
                                    <li key={j} className="text-gray-600 dark:text-gray-400">{locale === "ar" ? translateFindings(gap.trim()) : gap.trim()}</li>
                                  ))}
                                </ul>
                              </li>
                            );
                          }

                          return (
                            <li key={i} className="leading-relaxed">{translatedStep}</li>
                          );
                        })}
                      </ol>
                      <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                        {task.ai_guidance.estimated_effort && (
                          <span className="inline-flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {c.estEffort}: <span className="font-medium text-gray-700 dark:text-gray-300">{task.ai_guidance.estimated_effort}</span>
                          </span>
                        )}
                        {task.ai_guidance.tools_needed && (
                          <span className="inline-flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.654-3.265A2.25 2.25 0 014.5 9.868V5.25A2.25 2.25 0 016.75 3h10.5a2.25 2.25 0 012.25 2.25v4.618a2.25 2.25 0 01-1.266 2.037l-5.654 3.265a2.25 2.25 0 01-2.16 0z" /></svg>
                            {c.tools}: <span className="font-medium text-gray-700 dark:text-gray-300">{task.ai_guidance.tools_needed.join(", ")}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Comments */}
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">{c.addComment}</h4>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={commentTexts[task.id] || ""}
                      onChange={(e) => setCommentTexts((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      placeholder={c.commentPlaceholder}
                      onKeyDown={(e) => e.key === "Enter" && addTaskComment(task.id)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      onClick={() => addTaskComment(task.id)}
                      disabled={!commentTexts[task.id]?.trim()}
                      className="px-3 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 cursor-pointer border-0"
                    >
                      {c.post}
                    </button>
                  </div>
                  {(task.comments?.length || 0) > 0 ? (
                    <div className="space-y-2">
                      {task.comments!.map((cm) => (
                        <div key={cm.id} className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-400 flex-shrink-0 mt-0.5">
                            {cm.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">{cm.author}</span>
                              <span className="text-[10px] text-gray-400">{new Date(cm.created_date).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{cm.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{c.noComments}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isSuggestion && STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateTask(task.id, { status: s })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-all ${
                        task.status === s
                          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
                      }`}
                    >
                    {s === "open" ? cc.open : s === "in_progress" ? cc.inProgress : s === "completed" ? cc.completed : cc.deferred}
                    </button>
                  ))}
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={isSuggestion}
                    className="ml-auto px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 cursor-pointer border border-red-200 bg-white dark:bg-gray-800 dark:border-red-900 dark:hover:bg-red-900/20"
                  >
                    {isSuggestion ? "Suggested" : cc.delete}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">
            {getAnalyzedPolicies(policies).length > 0
              ? "No remediation tasks required. Current analyzed policies show strong compliance."
              : c.noTasks}
          </p>
        </div>
      )}

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{c.dialogTitle}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{c.taskTitle}</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={c.taskPlaceholder}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{c.description}</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} placeholder={c.descPlaceholder}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{cc.priority}</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as RemediationTask["priority"])}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{c.dueDate}</label>
                  <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">{cc.cancel}</button>
                <button onClick={handleCreate} disabled={!newTitle.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 cursor-pointer border-0">
                  {c.createTask}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Auto-Generate from Assessment Dialog */}
      {showAutoGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAutoGen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{c.autoGenerate}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{c.selectAssessment}</p>
            <select
              value={autoGenAssessment}
              onChange={(e) => setAutoGenAssessment(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white mb-4"
            >
              <option value="">— {c.selectAssessment} —</option>
              {assessments.map((a) => {
                const gaps = (a.results || []).filter((r) => r.status === "non_compliant").length;
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.framework}) — {gaps} gaps
                  </option>
                );
              })}
            </select>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAutoGen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">{cc.cancel}</button>
              <button
                onClick={autoGenerateFromGaps}
                disabled={!autoGenAssessment}
                className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 cursor-pointer border-0"
              >
                {c.generateTasks}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
