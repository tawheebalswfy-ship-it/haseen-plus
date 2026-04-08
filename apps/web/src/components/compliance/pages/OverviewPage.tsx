import { useNavigate } from "react-router-dom";
import { useComplianceStore } from "../store";
import { NCA_CONTROLS } from "../types";
import { useLanguage } from "../../../contexts/LanguageContext";

/* ── NCA Framework metadata shown in the dashboard ── */
const NCA_FRAMEWORKS = [
  { key: "ECC", name: "ECC", full: "Essential Cybersecurity Controls", fullAr: "ضوابط الأمن السيبراني الأساسية", color: "#6366f1" },
  { key: "CSCC", name: "CSCC", full: "Cloud Cybersecurity Controls", fullAr: "ضوابط الأمن السيبراني للحوسبة السحابية", color: "#8b5cf6" },
  { key: "DCC", name: "DCC", full: "Data Cybersecurity Controls", fullAr: "ضوابط الأمن السيبراني للبيانات", color: "#10b981" },
  { key: "OTCC", name: "OTCC", full: "Operational Technology Controls", fullAr: "ضوابط الأمن السيبراني للتقنيات التشغيلية", color: "#f59e0b" },
  { key: "TCC", name: "TCC", full: "Telecom Cybersecurity Controls", fullAr: "ضوابط الأمن السيبراني للاتصالات", color: "#ef4444" },
];

export default function OverviewPage() {
  const { assessments, policies } = useComplianceStore();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const isRtl = locale === "ar";
  const c = t.compliance.overview;

  const completedAssessments = assessments.filter((a) => a.status === "completed");
  const averageScore =
    completedAssessments.length > 0
      ? Math.round(
          completedAssessments.reduce((sum, a) => sum + (a.overall_score || 0), 0) /
            completedAssessments.length
        )
      : 0;
  const analyzedPolicies = policies.filter((p) => p.status === "analyzed").length;
  const policiesWithGaps = policies.filter((p) => p.compliance_score && p.compliance_score < 80).length;

  // Per-framework latest scores
  const frameworkScores: Record<string, { score: number; controls: number } | null> = {};
  for (const fw of NCA_FRAMEWORKS) {
    const fwAssessments = completedAssessments.filter((a) => a.framework === fw.key);
    const latest = fwAssessments.sort(
      (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    )[0];
    frameworkScores[fw.key] = latest
      ? { score: Math.round(latest.overall_score || 0), controls: (NCA_CONTROLS as Record<string, unknown[]>)[fw.key]?.length ?? 0 }
      : null;
  }

  // Gauge arc
  const gaugeRadius = 70;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (averageScore / 100) * gaugeCircumference;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{c.subtitle}</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Overall Compliance */}
        <button
          onClick={() => navigate("/dashboard/risk")}
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer text-start dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{c.overallCompliance}</p>
            <p className={`mt-1 text-3xl font-bold ${averageScore >= 70 ? "text-emerald-600" : averageScore >= 40 ? "text-amber-500" : "text-red-500"}`}>{averageScore}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.acrossFrameworks}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
        </button>

        {/* Assessments */}
        <button
          onClick={() => navigate("/dashboard/assessments")}
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer text-start dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{c.assessments}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{assessments.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{completedAssessments.length} {c.xCompleted}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
        </button>

        {/* Policies Analyzed */}
        <button
          onClick={() => navigate("/dashboard/policies")}
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer text-start dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{c.policiesAnalyzed}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{analyzedPolicies}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{policies.length} {c.totalUploaded}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-600/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-400 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
        </button>

        {/* Gaps Identified */}
        <button
          onClick={() => navigate("/dashboard/remediation")}
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md cursor-pointer text-start dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{isRtl ? "الثغرات المحددة" : "Gaps Identified"}</p>
            <p className="mt-1 text-3xl font-bold text-red-500">{policiesWithGaps}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{isRtl ? "سياسات تحتاج اهتماماً" : "Policies need attention"}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/10 text-red-500 dark:bg-red-400/10 dark:text-red-400 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        </button>
      </div>

      {/* ── Compliance Gauge + NCA Frameworks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44">
            <svg className="w-44 h-44" viewBox="0 0 160 160">
              {/* Background track */}
              <circle cx="80" cy="80" r={gaugeRadius} fill="none" strokeWidth="12"
                className="stroke-gray-100 dark:stroke-gray-800" />
              {/* Score arc */}
              <circle cx="80" cy="80" r={gaugeRadius} fill="none" strokeWidth="12"
                stroke={averageScore >= 70 ? "#10b981" : averageScore >= 40 ? "#f59e0b" : "#ef4444"}
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={gaugeOffset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">{averageScore}%</span>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-0.5">
                {isRtl ? "النتيجة" : "Score"}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{c.averageScore}</p>
        </div>

        {/* NCA Frameworks list */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-5">{c.ncaFrameworks}</h3>
          <div className="space-y-1">
            {NCA_FRAMEWORKS.map((fw) => {
              const data = frameworkScores[fw.key];
              return (
                <button
                  key={fw.key}
                  onClick={() => navigate("/dashboard/framework-comparison")}
                  className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-start transition hover:bg-gray-50 cursor-pointer border-0 bg-transparent dark:hover:bg-gray-800/50"
                >
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: fw.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{fw.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{isRtl ? fw.fullAr : fw.full}</p>
                  </div>
                  {data ? (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-end">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{data.score}%</span>
                        <p className="text-[10px] text-gray-400">{isRtl ? "ضوابط" : "controls"}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {isRtl ? "مكتمل" : "completed"}
                      </span>
                    </div>
                  ) : null}
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={isRtl ? "M15.75 19.5L8.25 12l7.5-7.5" : "M8.25 4.5l7.5 7.5-7.5 7.5"} />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
