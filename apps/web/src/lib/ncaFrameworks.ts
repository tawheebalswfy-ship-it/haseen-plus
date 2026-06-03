export interface NcaFramework {
  key: string;
  name: string;
  full: string;
  fullAr: string;
  color: string;
}

export const NCA_FRAMEWORKS: NcaFramework[] = [
  {
    key: "ECC",
    name: "ECC",
    full: "Essential Cybersecurity Controls",
    fullAr: "ضوابط الأمن السيبراني الأساسية",
    color: "#374151",
  },
  {
    key: "CSCC",
    name: "CSCC",
    full: "Cloud Cybersecurity Controls",
    fullAr: "ضوابط الأمن السيبراني للحوسبة السحابية",
    color: "#0d6a5c",
  },
  {
    key: "DCC",
    name: "DCC",
    full: "Data Cybersecurity Controls",
    fullAr: "ضوابط الأمن السيبراني للبيانات",
    color: "#0a4c6e",
  },
  {
    key: "OTCC",
    name: "OTCC",
    full: "Operational Technology Cybersecurity Controls",
    fullAr: "ضوابط الأمن السيبراني للتقنيات التشغيلية",
    color: "#c9a84c",
  },
  {
    key: "TCC",
    name: "TCC",
    full: "Telecommunication Cybersecurity Controls",
    fullAr: "ضوابط الأمن السيبراني للاتصالات",
    color: "#8b5a2b",
  },
];

export const FRAMEWORK_COLORS = Object.fromEntries(
  NCA_FRAMEWORKS.map((framework) => [framework.key, framework.color])
) as Record<string, string>;

export const FRAMEWORK_LABELS = Object.fromEntries(
  NCA_FRAMEWORKS.map((framework) => [framework.key, framework.full])
) as Record<string, string>;
