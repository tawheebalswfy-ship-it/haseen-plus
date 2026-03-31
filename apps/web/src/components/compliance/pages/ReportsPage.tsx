import { useState } from "react";
import { useComplianceStore } from "../store";
import { FRAMEWORK_COLORS } from "../types";
import { useLanguage } from "../../../contexts/LanguageContext";

type ReportType = "executive" | "detailed" | "gap_analysis" | "remediation_plan";

export default function ReportsPage() {
  const { reports, assessments, addReport, deleteReport } = useComplianceStore();
  const { t } = useLanguage();
  const c = t.compliance.reports;
  const cc = t.compliance.common;
  const [showGen, setShowGen] = useState(false);
  const [linkCopied, setLinkCopied] = useState<string | null>(null);

  const REPORT_TYPES: { type: ReportType; label: string; desc: string }[] = [
    { type: "executive", label: c.executive, desc: c.executiveDesc },
    { type: "detailed", label: c.detailed, desc: c.detailedDesc },
    { type: "gap_analysis", label: c.gapAnalysis, desc: c.gapAnalysisDesc },
    { type: "remediation_plan", label: c.remediationPlan, desc: c.remediationPlanDesc },
  ];
  const [selType, setSelType] = useState<ReportType>("executive");
  const [reportTitle, setReportTitle] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  const viewReport = reports.find((r) => r.id === viewId);

  const generateReport = () => {
    if (!reportTitle.trim()) return;
    const assessment = assessments.find((a) => a.id === selectedAssessment);
    addReport({
      title: reportTitle,
      type: selType,
      assessment_id: selectedAssessment || undefined,
      framework: assessment?.framework,
      content: {
        summary: `This ${selType.replace("_", " ")} report provides a comprehensive analysis of your organization's compliance posture${assessment ? ` for the ${assessment.framework} framework` : ""}.`,
        score: assessment?.overall_score || Math.floor(40 + Math.random() * 50),
        sections: [
          { title: "Overview", body: "The assessment covered key NCA compliance domains including cybersecurity governance, defense, resilience, and third-party management." },
          { title: "Key Findings", body: `${assessment ? `${assessment.results?.filter((r) => r.status === "non_compliant").length || 0} controls were found non-compliant` : "Multiple areas require attention"}, with critical gaps in access management and incident response capabilities.` },
          { title: "Recommendations", body: "Immediate priorities include implementing multi-factor authentication, establishing a formal incident response plan, and conducting regular security awareness training." },
        ],
        share_token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      },
    });
    setReportTitle("");
    setSelectedAssessment("");
    setShowGen(false);
  };

  if (viewReport) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => setViewId(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer bg-transparent border-0 dark:text-gray-400 dark:hover:text-gray-200">
          {c.backToList}
        </button>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900" id="report-print-area">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{viewReport.title}</h1>
              <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                {viewReport.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                {viewReport.framework && <span> · <span style={{ color: FRAMEWORK_COLORS[viewReport.framework] }} className="font-semibold">{viewReport.framework}</span></span>}
                {" · "}{new Date(viewReport.created_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Share Link */}
              {viewReport.content?.share_token && (
                <div className="relative">
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/shared/report/${viewReport.content!.share_token}`;
                      navigator.clipboard.writeText(url);
                      setLinkCopied(viewReport.id);
                      setTimeout(() => setLinkCopied(null), 2000);
                    }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {linkCopied === viewReport.id ? c.linkCopied : c.copyLink}
                  </button>
                </div>
              )}
              {/* Export PDF */}
              <button
                onClick={() => {
                  window.print();
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer border-0"
              >
                {c.exportPdf}
              </button>
              {viewReport.content?.score !== undefined && (
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: viewReport.content.score >= 70 ? "#6b7280" : viewReport.content.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                    {viewReport.content.score}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{c.overallScore}</div>
                </div>
              )}
            </div>
          </div>

          {viewReport.content?.share_token && (
            <div className="mb-6 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">{c.shareDesc}</p>
            </div>
          )}

          {viewReport.content?.summary && (
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">{viewReport.content.summary}</p>
          )}

          {viewReport.content?.sections?.map((section, i) => (
            <div key={i} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{section.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {c.subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowGen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center rounded-full bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 cursor-pointer border-0"
        >
          {c.generate}
        </button>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {reports.map((r) => (
          <div
            key={r.id}
            onClick={() => setViewId(r.id)}
            className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-all cursor-pointer dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-300 dark:text-gray-600">RPT</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{r.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {r.type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    {r.framework && <span> · {r.framework}</span>}
                    {" · "}{new Date(r.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.content?.score !== undefined && (
                  <span className="text-lg font-bold" style={{ color: r.content.score >= 70 ? "#6b7280" : r.content.score >= 40 ? "#f59e0b" : "#ef4444" }}>
                    {r.content.score}%
                  </span>
                )}
                {r.content?.share_token && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/shared/report/${r.content!.share_token}`;
                      navigator.clipboard.writeText(url);
                      setLinkCopied(r.id);
                      setTimeout(() => setLinkCopied(null), 2000);
                    }}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0 p-1"
                    title={c.shareLink}
                  >
                    {linkCopied === r.id ? (
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.25" /></svg>
                    )}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteReport(r.id); }}
                  className="text-gray-400 hover:text-red-500 cursor-pointer bg-transparent border-0 p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="rounded-[24px] border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-300 dark:text-gray-600">REPORTS</div>
          <p className="text-gray-500 dark:text-gray-400">{c.noReports}</p>
        </div>
      )}

      {/* Generate Dialog */}
      {showGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGen(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{c.dialogTitle}</h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{c.reportTitle}</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={c.titlePlaceholder}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">{c.reportType}</label>
                <div className="grid grid-cols-2 gap-3">
                  {REPORT_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setSelType(t.type)}
                      className={`p-3 rounded-lg border-2 text-left cursor-pointer transition-all ${
                        selType === t.type
                          ? "border-gray-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-600"
                          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {assessments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">{c.basedOn}</label>
                  <select
                    value={selectedAssessment}
                    onChange={(e) => setSelectedAssessment(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">{c.none}</option>
                    {assessments.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.framework} - {a.overall_score}%)</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowGen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">{cc.cancel}</button>
                <button
                  onClick={generateReport}
                  disabled={!reportTitle.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 cursor-pointer border-0"
                >
                  {c.generateBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
