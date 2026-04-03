import { Link, useNavigate } from "react-router-dom";
import { useComplianceStore } from "../store";
import { FRAMEWORK_COLORS, NCA_CONTROLS } from "../types";
import { useLanguage } from "../../../contexts/LanguageContext";

export default function OverviewPage() {
  const { assessments, policies, tasks } = useComplianceStore();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const isRtl = locale === "ar";
  const c = t.compliance.overview;
  const cc = t.compliance.common;

  const completedAssessments = assessments.filter((a) => a.status === "completed");
  const averageScore =
    completedAssessments.length > 0
      ? Math.round(
          completedAssessments.reduce((sum, a) => sum + (a.overall_score || 0), 0) /
            completedAssessments.length
        )
      : 0;
  const analyzedPolicies = policies.filter((p) => p.status === "analyzed").length;
  const openTasks = tasks.filter((t) => t.status === "open").length;
  const policiesWithGaps = policies.filter((p) => p.compliance_score && p.compliance_score < 80).length;

  // ECC summary from latest ECC assessment
  const eccAssessments = completedAssessments.filter((a) => a.framework === "ECC");
  const eccLatest = eccAssessments.sort(
    (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  )[0] || null;

  const recentActivity = [
    ...assessments.slice(0, 3).map((a) => ({
      type: "assessment" as const,
      title: `${a.framework} ${c.assessment}`,
      description: a.status === "completed" ? `${cc.score}: ${a.overall_score}%` : `${cc.status}: ${a.status}`,
      time: a.created_date,
    })),
    ...policies.slice(0, 3).map((p) => ({
      type: "policy" as const,
      title: p.title,
      description: p.status === "analyzed" ? `${c.compliance}: ${p.compliance_score}%` : `${cc.status}: ${p.status}`,
      time: p.created_date,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);
  const upcomingDomains = [
    { name: isRtl ? "أمن الشبكات" : "Network Security", ecc: "ECC 3-1" },
    { name: isRtl ? "حماية البيانات" : "Data Protection", ecc: "ECC 3-2" },
    { name: isRtl ? "الاستجابة للحوادث" : "Incident Response", ecc: "ECC 4-2" },
    { name: isRtl ? "استمرارية الأعمال" : "Business Continuity", ecc: "ECC 5-1" },
    { name: isRtl ? "إدارة الأصول" : "Asset Management", ecc: "ECC 2-1" },
    { name: isRtl ? "أمن السحابة" : "Cloud Security", ecc: "ECC CCC" },
  ];

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
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link
            to="/dashboard/policies"
            className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 no-underline dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {c.uploadPolicy}
          </Link>
          <Link
            to="/dashboard/assessments"
            className="inline-flex items-center rounded-full bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold !text-white dark:!text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 no-underline"
          >
            {c.newAssessment}
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          {
            title: c.overallCompliance,
            value: `${averageScore}%`,
            subtitle: c.acrossFrameworks,
            link: "/dashboard/risk",
            color: averageScore >= 70 ? "text-gray-900 dark:text-white" : averageScore >= 40 ? "text-amber-600" : "text-red-600",
            code: "01",
          },
          {
            title: c.assessments,
            value: String(assessments.length),
            subtitle: `${completedAssessments.length} ${c.xCompleted}`,
            link: "/dashboard/assessments",
            color: "text-gray-900 dark:text-white",
            code: "02",
          },
          {
            title: c.policiesAnalyzed,
            value: String(analyzedPolicies),
            subtitle: `${policies.length} ${c.totalUploaded}`,
            link: "/dashboard/policies",
            color: "text-gray-900 dark:text-white",
            code: "03",
          },
          {
            title: c.openTasks,
            value: String(openTasks),
            subtitle: `${policiesWithGaps} ${c.gapsIdentified}`,
            link: "/dashboard/remediation",
            color: "text-orange-600",
            code: "04",
          },
        ].map((stat) => (
          <div
            key={stat.title}
            onClick={() => stat.link && navigate(stat.link)}
            className={`rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 transition-all ${stat.link ? "cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700" : ""}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-300 dark:text-gray-600">{stat.code}</div>
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Compliance Gauge + Frameworks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gauge */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-800" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={averageScore >= 70 ? "#6b7280" : averageScore >= 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="10"
                strokeDasharray={`${(averageScore / 100) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{averageScore}%</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{cc.score}</span>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">{c.averageScore}</p>
        </div>

        {/* ECC Framework */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">NCA ECC-1:2018</h3>
          {(() => {
            const score = eccLatest?.overall_score || 0;
            return (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: FRAMEWORK_COLORS.ECC }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">ECC — Essential Cybersecurity Controls</span>
                      <span className="text-sm font-bold" style={{ color: FRAMEWORK_COLORS.ECC }}>
                        {eccLatest ? `${score}%` : "—"}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${score}%`, background: FRAMEWORK_COLORS.ECC }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {eccLatest ? eccLatest.name : c.noAssessmentYet}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{NCA_CONTROLS.ECC.length} {isRtl ? "ضوابط" : "controls"}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Recent Activity + Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{c.recentActivity}</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{c.noActivity}</p>
            ) : (
              recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/70">
                  <div className="w-10 text-xs font-semibold uppercase tracking-[0.2em] text-gray-300 dark:text-gray-600">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(item.time).toLocaleDateString(locale)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Start */}
        <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-white">
          <h3 className="font-semibold text-lg mb-2">{c.quickStart}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{c.quickStartDesc}</p>
          <div className="space-y-4">
            {[
              { step: "1", title: c.step1Title, desc: c.step1Desc },
              { step: "2", title: c.step2Title, desc: c.step2Desc },
              { step: "3", title: c.step3Title, desc: c.step3Desc },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/70">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  {s.step}
                </div>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coming Soon & Mapping */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coming soon */}
        <div className="rounded-[24px] border border-dashed border-gray-300 bg-gray-50/50 p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {isRtl ? "مجالات قادمة قريباً" : "Coming Soon"}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {upcomingDomains.map((d, index) => (
              <div key={d.name} className="rounded-2xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">{d.name}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{d.ecc}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-300 dark:text-gray-600">{String(index + 1).padStart(2, "0")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* NCA ECC ↔ ISO 27001 brief */}
      <div className="rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {isRtl ? "ربط NCA ECC ↔ ISO 27001" : "NCA ECC ↔ ISO 27001 Mapping"}
          </h3>
          <Link
            to="/dashboard/framework-comparison"
            className="text-xs font-semibold text-gray-600 hover:text-gray-700 no-underline dark:text-gray-400"
          >
            {isRtl ? "عرض الكل →" : "View Full Mapping →"}
          </Link>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {isRtl
            ? "ضوابط الأمن السيبراني الأساسية (ECC) من الهيئة الوطنية للأمن السيبراني مبنية على معيار ISO 27001:2022 العالمي. المنصة تربط بين كل ضابطة ECC والبند المقابل في ISO 27001 مع تحديد نوع الربط."
            : "The NCA Essential Cybersecurity Controls (ECC) are built upon the international ISO 27001:2022 standard. The platform maps each ECC control to its corresponding ISO 27001 clause and Annex A control, identifying whether the relationship is direct, partial, or related."}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
            <div className="text-xl font-bold text-gray-900 dark:text-white">20</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? "ضوابط ECC" : "ECC Controls"}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
            <div className="text-xl font-bold text-gray-900 dark:text-white">18</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? "ربط مباشر" : "Direct Mappings"}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
            <div className="text-xl font-bold text-gray-900 dark:text-white">9</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isRtl ? "مجالات" : "Domains"}</div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
