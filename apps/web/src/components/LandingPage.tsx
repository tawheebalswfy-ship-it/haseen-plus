import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function LandingPage() {
  const { t, locale } = useLanguage();
  const isRtl = locale === "ar";
  const supportedPolicies = [
    {
      name: t.landing.features.passwordPolicy.title,
      scope: "ECC 2-2",
      refs: ["A.5.15", "A.8.2", "A.8.24"],
      note: isRtl ? "8 فجوات قابلة للكشف" : "8 detectable gaps",
      description: t.landing.features.passwordPolicy.description,
    },
    {
      name: t.landing.features.riskAssessment.title,
      scope: "ECC 1-5",
      refs: ["A.5.7", "A.6.1.2"],
      note: isRtl ? "8 فجوات قابلة للكشف" : "8 detectable gaps",
      description: t.landing.features.riskAssessment.description,
    },
  ];

  const comingSoonDomains = [
    { name: isRtl ? "أمن الشبكات" : "Network Security", ecc: "ECC 3-1" },
    { name: isRtl ? "حماية البيانات" : "Data Protection", ecc: "ECC 3-2" },
    { name: isRtl ? "الاستجابة للحوادث" : "Incident Response", ecc: "ECC 4-2" },
    { name: isRtl ? "استمرارية الأعمال" : "Business Continuity", ecc: "ECC 5-1" },
    { name: isRtl ? "إدارة الأصول" : "Asset Management", ecc: "ECC 2-1" },
    { name: isRtl ? "العمليات الأمنية" : "Security Operations", ecc: "ECC 4-1" },
    { name: isRtl ? "أمن الحوسبة السحابية" : "Cloud Security", ecc: "ECC CCC" },
    { name: isRtl ? "أمن التقنيات التشغيلية" : "OT/ICS Security", ecc: "ECC OT" },
  ];

  const mappingDomains = [
    { name: isRtl ? "الحوكمة" : "Governance", controls: 3, iso: "§5.2, §5.3", annex: "A.5.1-A.5.2" },
    { name: isRtl ? "إدارة المخاطر" : "Risk Management", controls: 2, iso: "§6.1", annex: "A.5.7" },
    { name: isRtl ? "إدارة الأصول" : "Asset Management", controls: 2, iso: "§8.1", annex: "A.5.9-A.5.12" },
    { name: isRtl ? "إدارة الهوية والوصول" : "Identity & Access", controls: 3, iso: "§9.1-§9.2", annex: "A.5.15, A.8.2" },
    { name: isRtl ? "أمن الشبكات" : "Network Security", controls: 2, iso: "§8.1", annex: "A.8.20-A.8.22" },
    { name: isRtl ? "حماية البيانات" : "Data Protection", controls: 2, iso: "§8.2, §10.1", annex: "A.5.12, A.8.24" },
    { name: isRtl ? "العمليات الأمنية" : "Security Operations", controls: 2, iso: "§9.1, §10.1", annex: "A.8.15-A.8.16" },
    { name: isRtl ? "إدارة الحوادث" : "Incident Management", controls: 2, iso: "§10.1", annex: "A.5.24-A.5.26" },
    { name: isRtl ? "استمرارية الأعمال" : "Business Continuity", controls: 2, iso: "§8.1", annex: "A.5.30, A.8.14" },
  ];

  return (
    <div className="min-h-screen bg-transparent text-gray-950 dark:text-white">
      <Navbar />

      <section className="relative overflow-hidden pb-20 pt-28 sm:pb-24 sm:pt-36">
        <div className="absolute inset-0 -z-10 bg-white dark:bg-gray-950" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              {isRtl ? "مشروع بحثي — جامعي" : "Research Project — University"}
              </div>

              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-gray-950 sm:text-5xl lg:text-6xl dark:text-white">
                <span className="block">{isRtl ? "فحص امتثال السياسات" : "Policy Compliance"}</span>
                <span className="mt-2 block text-gray-700 dark:text-gray-400">
                {isRtl ? "لمعايير ISO 27001 و NCA ECC" : "ISO 27001 & NCA ECC"}
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                {isRtl
                  ? "منصة بحثية لتحليل سياسات الأمن السيبراني واكتشاف فجوات الامتثال وربط ضوابط NCA ECC بمرجعيات ISO 27001:2022 ضمن تجربة واضحة ومباشرة."
                  : "A research platform for analyzing cybersecurity policies, surfacing compliance gaps, and mapping NCA ECC controls to ISO 27001:2022 in a clear, decision-oriented workflow."}
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/auth/sign-up"
                  className="inline-flex items-center justify-center rounded-full bg-gray-900 dark:bg-white px-8 py-3.5 text-base font-semibold !text-white dark:!text-gray-900 shadow-lg transition-colors hover:bg-gray-800 dark:hover:bg-gray-200 no-underline"
                >
                  {t.landing.hero.cta}
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 no-underline dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {t.landing.hero.learnMore}
                </Link>
              </div>

              <div className="mt-16 grid grid-cols-3 gap-6 border-t border-gray-200 pt-8 dark:border-gray-800">
                {[
                  { value: "16", label: isRtl ? "فجوة امتثال" : "Compliance Gaps" },
                  { value: "<1s", label: isRtl ? "وقت التحليل" : "Analysis Time" },
                  { value: "2", label: isRtl ? "لغات مدعومة" : "Languages" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-3xl font-semibold text-gray-950 dark:text-white">{s.value}</div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200/80 bg-white dark:bg-gray-900 p-7 shadow-[0_32px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/88">
              <div className="flex items-center justify-between border-b border-gray-100 pb-5 dark:border-gray-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                    {isRtl ? "التغطية الحالية" : "Current Coverage"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-gray-950 dark:text-white">
                    {isRtl ? "تحليل مدعوم بالنموذج" : "Model-backed Analysis"}
                  </h2>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {isRtl ? "نشط" : "Active"}
                </span>
              </div>

              <div className="space-y-4 py-5">
                {supportedPolicies.map((policy) => (
                  <div key={policy.name} className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{policy.scope}</p>
                        <h3 className="mt-2 text-lg font-semibold text-gray-950 dark:text-white">{policy.name}</h3>
                      </div>
                      <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:border-gray-900/60 dark:text-gray-400">
                        {policy.note}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{policy.description}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{policy.refs.join("  •  ")}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                  {isRtl ? "المحرك" : "Engine"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {isRtl
                    ? "bert-base-multilingual-cased مع دعم كامل للعربية والإنجليزية وتقرير ربط مباشر بضوابط ECC ومرجعيات ISO."
                    : "bert-base-multilingual-cased with Arabic and English support, paired with direct ECC and ISO mapping outputs."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">
              {isRtl ? "منهجية الربط" : "Mapping Logic"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {isRtl ? "ما هي العلاقة بين NCA ECC و ISO 27001؟" : "NCA ECC & ISO 27001 — How They Relate"}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
              {isRtl
                ? "ضوابط الأمن السيبراني الأساسية (ECC) التي تصدرها الهيئة الوطنية للأمن السيبراني (NCA) هي الإطار الإلزامي للمنظمات في المملكة العربية السعودية. وهي مبنية على أساس معيار ISO 27001:2022 العالمي مع إضافات تراعي المتطلبات المحلية. هذه المنصة تربط بين الإطارين تلقائياً."
                : "The Essential Cybersecurity Controls (ECC) issued by Saudi Arabia's National Cybersecurity Authority (NCA) are the mandatory compliance framework for organizations operating in the Kingdom. ECC is built upon the international ISO 27001:2022 standard, with additional requirements addressing local regulatory needs. This platform automatically maps between both frameworks."}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-[24px] border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">01</p>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">NCA ECC</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {isRtl
                  ? "الإطار الوطني الإلزامي: يغطي 5 مجالات رئيسية — الحوكمة، الدفاع، الصمود، تقنيات الطرف الثالث، والحوسبة السحابية — مع 114+ ضابطة فرعية."
                  : "Saudi Arabia's mandatory national framework covering 5 main domains — Governance, Defense, Resilience, Third-party, and Cloud — with 114+ sub-controls."}
              </p>
            </div>

            <div className="rounded-[24px] border border-gray-300 bg-gray-100 p-8 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-700 dark:text-gray-300">02</p>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                {isRtl ? "ربط تلقائي" : "Automatic Mapping"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {isRtl
                  ? "المنصة تربط كل ضابطة ECC بالبند المقابل في ISO 27001 ومرفق A تلقائياً، مع تحديد نوع الربط (مباشر، جزئي، أو مرتبط)."
                  : "The platform maps each ECC control to its corresponding ISO 27001 clause and Annex A control, identifying the relationship type (direct, partial, or related)."}
              </p>
            </div>

            <div className="rounded-[24px] border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">03</p>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">ISO 27001:2022</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {isRtl
                  ? "المعيار العالمي لإدارة أمن المعلومات: يتضمن 93 ضابطة في مرفق A موزعة على 4 فئات — تنظيمية، بشرية، مادية، وتقنية."
                  : "The international information security management standard with 93 Annex A controls across 4 themes — Organizational, People, Physical, and Technological."}
              </p>
            </div>
          </div>

          <div className="mt-14 rounded-[28px] border border-gray-200 bg-white p-8 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.32)] dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-end justify-between gap-4 border-b border-gray-100 pb-6 dark:border-gray-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                  {isRtl ? "نطاق التغطية" : "Coverage"}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
              {isRtl ? "مجالات ECC المغطاة في الربط" : "ECC Domains Covered in Mapping"}
                </h3>
              </div>
              <Link to="/dashboard/framework-comparison" className="text-sm font-semibold text-gray-700 no-underline dark:text-gray-400">
                {isRtl ? "عرض جدول الربط" : "View mapping table"}
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mappingDomains.map((d, index) => (
                <div key={d.name} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-gray-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.name}</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{d.controls} {isRtl ? "ضوابط" : "controls"}</p>
                  <div className="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <p>ISO {d.iso}</p>
                    <p>{d.annex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">
              {isRtl ? "قدرات التحليل" : "Analysis Scope"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {t.landing.features.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-gray-500 dark:text-gray-400">
              {isRtl
                ? "نموذج الذكاء الاصطناعي مدرّب حالياً على نوعين من السياسات، مع خطط لتوسيع التغطية."
                : "The AI model is currently trained on two policy types, with plans to expand coverage."}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {supportedPolicies.map((policy) => (
              <div key={policy.name} className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.32)] dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">{policy.scope}</p>
                    <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{policy.name}</h3>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {isRtl ? "متاح الآن" : "Available now"}
                  </span>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{policy.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[policy.scope, ...policy.refs].map((tag) => (
                    <span key={tag} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400">{tag}</span>
                  ))}
                </div>
                <p className="mt-5 text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{policy.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-dashed border-gray-300 bg-gray-50/70 p-8 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                {isRtl ? "قريباً" : "Upcoming"}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {isRtl ? "مجالات قادمة قريباً" : "Coming Soon — Future Policy Domains"}
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {comingSoonDomains.map((d, index) => (
                <div key={d.name} className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.name}</p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{d.ecc}</p>
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300 dark:text-gray-600">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">
              {isRtl ? "طريقة العمل" : "Workflow"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {t.landing.howItWorks.title}
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: "1",
                title: t.landing.howItWorks.step1.title,
                desc: t.landing.howItWorks.step1.description,
              },
              {
                step: "2",
                title: t.landing.howItWorks.step2.title,
                desc: t.landing.howItWorks.step2.description,
              },
              {
                step: "3",
                title: isRtl ? "كشف الفجوات" : "Gap Detection",
                desc: isRtl
                  ? "النظام يكشف تلقائياً عن الفجوات في الامتثال مع درجة ثقة لكل فجوة."
                  : "The system automatically identifies compliance gaps with a confidence score for each.",
              },
              {
                step: "4",
                title: t.landing.howItWorks.step3.title,
                desc: isRtl
                  ? "احصل على تقارير مفصلة وتوصيات للمعالجة مع ربط بضوابط NCA و ISO."
                  : "Get detailed reports and remediation recommendations mapped to NCA and ISO controls.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-[24px] border border-gray-200 bg-white p-6 text-start dark:border-gray-800 dark:bg-gray-900">
                <div className="inline-flex rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {isRtl ? `الخطوة ${item.step}` : `Step ${item.step}`}
                </div>
                <h3 className="mt-5 text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isRtl ? "التقنيات المستخدمة" : "Built With"}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["bert-base-multilingual-cased", "PyTorch", "FastAPI", "Google Cloud Run", "React", "TypeScript", "Supabase", "Tailwind CSS"].map((tech) => (
              <span key={tech} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-950 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white">{t.landing.cta.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-400">{t.landing.cta.description}</p>
            <Link
              to="/auth/sign-up"
              className="mt-8 inline-flex items-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-gray-900 shadow-lg hover:bg-gray-200 transition-colors no-underline"
            >
              {t.landing.cta.button}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
