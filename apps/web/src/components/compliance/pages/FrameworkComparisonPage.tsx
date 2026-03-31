import { useState } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useComplianceStore } from "../store";

// ── NCA ECC ↔ ISO 27001:2022 Mapping Data ──
interface MappingEntry {
  eccId: string;
  eccName: string;
  eccDomain: string;
  isoClause: string;
  isoControl: string;
  isoAnnex: string;
  relationship: "direct" | "partial" | "related";
}

const ECC_ISO_MAPPING: MappingEntry[] = [
  // Governance
  { eccId: "ECC-1-1-1", eccName: "Cybersecurity Strategy", eccDomain: "Governance", isoClause: "5.2", isoControl: "Policy", isoAnnex: "A.5.1", relationship: "direct" },
  { eccId: "ECC-1-1-2", eccName: "Cybersecurity Policies", eccDomain: "Governance", isoClause: "5.2", isoControl: "Information Security Policy", isoAnnex: "A.5.1", relationship: "direct" },
  { eccId: "ECC-1-1-3", eccName: "Cybersecurity Roles & Responsibilities", eccDomain: "Governance", isoClause: "5.3", isoControl: "Organizational Roles", isoAnnex: "A.5.2", relationship: "direct" },
  // Risk Management
  { eccId: "ECC-1-2-1", eccName: "Risk Management Program", eccDomain: "Risk Management", isoClause: "6.1", isoControl: "Risk Assessment", isoAnnex: "A.5.7", relationship: "direct" },
  { eccId: "ECC-1-2-2", eccName: "Risk Assessment", eccDomain: "Risk Management", isoClause: "6.1.2", isoControl: "Information Security Risk Assessment", isoAnnex: "A.5.7", relationship: "direct" },
  // Asset Management
  { eccId: "ECC-2-1-1", eccName: "Asset Inventory", eccDomain: "Asset Management", isoClause: "8.1", isoControl: "Operational Planning", isoAnnex: "A.5.9", relationship: "direct" },
  { eccId: "ECC-2-1-2", eccName: "Asset Classification", eccDomain: "Asset Management", isoClause: "8.1", isoControl: "Classification of Information", isoAnnex: "A.5.12", relationship: "direct" },
  // Identity & Access Management
  { eccId: "ECC-2-2-1", eccName: "Identity Management", eccDomain: "Identity & Access Management", isoClause: "9.2", isoControl: "User Access Management", isoAnnex: "A.5.15", relationship: "direct" },
  { eccId: "ECC-2-2-2", eccName: "Access Control", eccDomain: "Identity & Access Management", isoClause: "9.1", isoControl: "Access Control Policy", isoAnnex: "A.5.15", relationship: "direct" },
  { eccId: "ECC-2-2-3", eccName: "Privileged Access Management", eccDomain: "Identity & Access Management", isoClause: "9.2", isoControl: "Privileged Access Rights", isoAnnex: "A.8.2", relationship: "direct" },
  // Network Security
  { eccId: "ECC-3-1-1", eccName: "Network Security Architecture", eccDomain: "Network Security", isoClause: "8.1", isoControl: "Networks Security", isoAnnex: "A.8.20", relationship: "direct" },
  { eccId: "ECC-3-1-2", eccName: "Network Segmentation", eccDomain: "Network Security", isoClause: "8.1", isoControl: "Segregation in Networks", isoAnnex: "A.8.22", relationship: "direct" },
  // Data Protection
  { eccId: "ECC-3-2-1", eccName: "Data Classification", eccDomain: "Data Protection", isoClause: "8.2", isoControl: "Classification of Information", isoAnnex: "A.5.12", relationship: "direct" },
  { eccId: "ECC-3-2-2", eccName: "Data Encryption", eccDomain: "Data Protection", isoClause: "10.1", isoControl: "Use of Cryptography", isoAnnex: "A.8.24", relationship: "direct" },
  // Security Operations
  { eccId: "ECC-4-1-1", eccName: "Security Monitoring", eccDomain: "Security Operations", isoClause: "9.1", isoControl: "Monitoring, Measurement, Analysis", isoAnnex: "A.8.15", relationship: "direct" },
  { eccId: "ECC-4-1-2", eccName: "Incident Detection", eccDomain: "Security Operations", isoClause: "10.1", isoControl: "Nonconformity & Corrective Action", isoAnnex: "A.8.16", relationship: "partial" },
  // Incident Management
  { eccId: "ECC-4-2-1", eccName: "Incident Response Plan", eccDomain: "Incident Management", isoClause: "10.1", isoControl: "Incident Management", isoAnnex: "A.5.24", relationship: "direct" },
  { eccId: "ECC-4-2-2", eccName: "Incident Handling Procedures", eccDomain: "Incident Management", isoClause: "10.1", isoControl: "Incident Response", isoAnnex: "A.5.26", relationship: "direct" },
  // Business Continuity
  { eccId: "ECC-5-1-1", eccName: "Business Continuity Plan", eccDomain: "Business Continuity", isoClause: "8.1", isoControl: "ICT Readiness for Business Continuity", isoAnnex: "A.5.30", relationship: "direct" },
  { eccId: "ECC-5-1-2", eccName: "Disaster Recovery", eccDomain: "Business Continuity", isoClause: "8.1", isoControl: "Redundancies", isoAnnex: "A.8.14", relationship: "partial" },
];

const RELATIONSHIP_STYLES = {
  direct: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", label: "Direct" },
  partial: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Partial" },
  related: { bg: "bg-gray-200 dark:bg-gray-700", text: "text-gray-700 dark:text-gray-300", label: "Related" },
};

export default function FrameworkComparisonPage() {
  const { t, locale } = useLanguage();
  const { assessments } = useComplianceStore();
  const c = t.compliance.frameworkComparison;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterRelation, setFilterRelation] = useState("all");

  const domains = [...new Set(ECC_ISO_MAPPING.map((m) => m.eccDomain))];

  const filtered = ECC_ISO_MAPPING.filter((m) => {
    const matchSearch =
      searchTerm === "" ||
      m.eccId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.eccName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.isoAnnex.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.isoControl.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDomain = filterDomain === "all" || m.eccDomain === filterDomain;
    const matchRelation = filterRelation === "all" || m.relationship === filterRelation;
    return matchSearch && matchDomain && matchRelation;
  });

  // Stats
  const total = ECC_ISO_MAPPING.length;
  const directCount = ECC_ISO_MAPPING.filter((m) => m.relationship === "direct").length;
  const partialCount = ECC_ISO_MAPPING.filter((m) => m.relationship === "partial").length;
  const coveragePct = Math.round(((directCount + partialCount * 0.5) / total) * 100);

  // ISO annex unique count
  const uniqueIsoControls = new Set(ECC_ISO_MAPPING.map((m) => m.isoAnnex)).size;

  // Latest ECC assessment results for live compliance status
  const eccAssessments = assessments.filter((a) => a.framework === "ECC" && a.status === "completed");
  const latestEcc = eccAssessments.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0];
  const controlStatusMap = new Map<string, { status: string; score: number }>();
  if (latestEcc?.results) {
    for (const r of latestEcc.results) {
      controlStatusMap.set(r.control_id, { status: r.status, score: r.score });
    }
  }
  const complianceStatusStyle = (status: string) => {
    const m: Record<string, { bg: string; text: string; label: string }> = {
      compliant: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-400", label: "Compliant" },
      partial: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "Partial" },
      non_compliant: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Non-Compliant" },
      not_assessed: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-500 dark:text-gray-400", label: "—" },
    };
    return m[status] || m.not_assessed;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{c.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{c.subtitle}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">{coveragePct}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.coverageScore}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{total}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.eccControls}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
          <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">{uniqueIsoControls}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.isoControls}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{directCount}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.directMappings}</div>
        </div>
      </div>

      {/* Coverage by Domain */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-8 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{c.domainCoverage}</h3>
        <div className="space-y-3">
          {domains.map((domain) => {
            const domainMappings = ECC_ISO_MAPPING.filter((m) => m.eccDomain === domain);
            const domainDirect = domainMappings.filter((m) => m.relationship === "direct").length;
            const domainTotal = domainMappings.length;
            const pct = Math.round((domainDirect / domainTotal) * 100);
            return (
              <div key={domain}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{domain}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{domainDirect}/{domainTotal} ({pct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gray-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={c.searchPlaceholder}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
        />
        <select
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">{c.allDomains}</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filterRelation}
          onChange={(e) => setFilterRelation(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">{c.allRelations}</option>
          <option value="direct">{c.direct}</option>
          <option value="partial">{c.partial}</option>
          <option value="related">{c.related}</option>
        </select>
      </div>

      {/* Mapping Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{c.mappingTable}</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {filtered.length} / {total} {c.controls}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <th className={`${locale === "ar" ? "text-right" : "text-left"} px-4 py-3 font-medium text-gray-500 dark:text-gray-400`}>{c.eccControl}</th>
                <th className={`${locale === "ar" ? "text-right" : "text-left"} px-4 py-3 font-medium text-gray-500 dark:text-gray-400`}>{c.eccDomain}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{c.mapping}</th>
                <th className={`${locale === "ar" ? "text-right" : "text-left"} px-4 py-3 font-medium text-gray-500 dark:text-gray-400`}>{c.isoAnnex}</th>
                <th className={`${locale === "ar" ? "text-right" : "text-left"} px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell`}>{c.isoClause}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{locale === "ar" ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const style = RELATIONSHIP_STYLES[m.relationship];
                return (
                  <tr key={m.eccId} className="border-b border-gray-50 last:border-0 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{m.eccName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{m.eccId}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{m.eccDomain}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                        {m.relationship === "direct" ? "↔" : m.relationship === "partial" ? "~" : "→"}
                        {" "}{style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{m.isoControl}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{m.isoAnnex}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">
                      ISO 27001 §{m.isoClause}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const cs = controlStatusMap.get(m.eccId);
                        if (!cs || cs.status === "not_assessed") {
                          return (
                            <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                              —
                            </span>
                          );
                        }
                        const st = complianceStatusStyle(cs.status);
                        return (
                          <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${st.bg} ${st.text}`}>
                            {st.label} {cs.score}%
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400 dark:text-gray-500">
            {c.noResults}
          </div>
        )}
      </div>
    </div>
  );
}
