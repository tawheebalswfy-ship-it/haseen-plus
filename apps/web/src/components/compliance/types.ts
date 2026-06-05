// Shared types for the compliance system
export interface Policy {
  id: string;
  title: string;
  status: "uploaded" | "analyzing" | "analyzed";
  category?: string;
  compliance_score?: number;
  file_url?: string;
  nca_controls_mapped?: string[];
  analysis_result?: Record<string, unknown>;
  created_date: string;
}

export interface ComplianceAssessment {
  id: string;
  name: string;
  framework: string;
  status: "draft" | "in_progress" | "completed";
  overall_score: number;
  policy_status?: string;
  detected_domains?: string[];
  findings?: string[];
  results?: ControlResult[];
  comments?: Comment[];
  created_date: string;
}

export interface ControlResult {
  control_id: string;
  control_name: string;
  domain: string;
  status: "compliant" | "partial" | "non_compliant" | "not_assessed";
  score: number;
  findings?: string;
  evidence?: string;
  evidence_files?: EvidenceFile[];
  gap?: string;
  recommendation?: string;
}

export interface RemediationTask {
  id: string;
  title: string;
  description: string;
  control_id?: string;
  assessment_id?: string;
  related_policy?: string;
  domain?: string;
  recommended_action?: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "completed" | "deferred";
  assigned_to?: string;
  due_date?: string;
  ai_guidance?: AIGuidance;
  comments?: Comment[];
  created_date: string;
}

export interface AIGuidance {
  steps: string[];
  estimated_effort?: string;
  resources_needed?: string[];
  tools_needed?: string[];
  success_criteria?: string;
  quick_wins?: string[];
}

// Evidence for assessment controls
export interface EvidenceFile {
  id: string;
  name: string;
  url: string;
  size: number;
  uploaded_date: string;
}

// Comment for assessments / tasks
export interface Comment {
  id: string;
  author: string;
  text: string;
  created_date: string;
}

// NCA Controls data
export const NCA_CONTROLS: Record<string, NCAControl[]> = {
  ECC: [
    { id: "ECC-1-1-1", name: "Cybersecurity Strategy", domain: "Governance", description: "Organizations must develop and maintain a cybersecurity strategy aligned with their business objectives and risk appetite.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "ECC-1-1-2", name: "Cybersecurity Policies", domain: "Governance", description: "Establish, approve, and communicate cybersecurity policies covering all key areas of information security.", maturity_levels: ["Initial", "Defined", "Managed"], priority: "critical" },
    { id: "ECC-1-1-3", name: "Cybersecurity Roles & Responsibilities", domain: "Governance", description: "Define and assign cybersecurity roles and responsibilities across the organization.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "ECC-1-2-1", name: "Risk Management Program", domain: "Risk Management", description: "Establish a formal cybersecurity risk management program that identifies, assesses, and treats risks.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "ECC-1-2-2", name: "Risk Assessment", domain: "Risk Management", description: "Conduct periodic cybersecurity risk assessments to identify threats and vulnerabilities.", maturity_levels: ["Initial", "Defined", "Managed"], priority: "high" },
    { id: "ECC-2-1-1", name: "Asset Inventory", domain: "Asset Management", description: "Maintain a comprehensive inventory of all information assets including hardware, software, and data.", maturity_levels: ["Initial", "Defined"], priority: "high" },
    { id: "ECC-2-1-2", name: "Asset Classification", domain: "Asset Management", description: "Classify all information assets based on criticality and sensitivity.", maturity_levels: ["Defined", "Managed"], priority: "medium" },
    { id: "ECC-2-2-1", name: "Identity Management", domain: "Identity & Access Management", description: "Implement identity management controls for all users accessing organizational systems.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "ECC-2-2-2", name: "Access Control", domain: "Identity & Access Management", description: "Enforce least-privilege access control principles for all systems and data.", maturity_levels: ["Defined", "Managed"], priority: "critical" },
    { id: "ECC-2-2-3", name: "Privileged Access Management", domain: "Identity & Access Management", description: "Implement enhanced controls for privileged accounts and administrative access.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "ECC-3-1-1", name: "Network Security Architecture", domain: "Network Security", description: "Design and implement a secure network architecture with appropriate defense layers.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "ECC-3-1-2", name: "Network Segmentation", domain: "Network Security", description: "Segment networks based on security zones and implement controls between segments.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "ECC-3-2-1", name: "Data Classification", domain: "Data Protection", description: "Classify organizational data based on sensitivity and implement appropriate handling procedures.", maturity_levels: ["Initial", "Defined", "Managed"], priority: "high" },
    { id: "ECC-3-2-2", name: "Data Encryption", domain: "Data Protection", description: "Encrypt sensitive data at rest and in transit using approved cryptographic algorithms.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "ECC-4-1-1", name: "Security Monitoring", domain: "Security Operations", description: "Implement continuous security monitoring to detect potential security incidents.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "high" },
    { id: "ECC-4-1-2", name: "Incident Detection", domain: "Security Operations", description: "Deploy tools and processes for timely detection of cybersecurity incidents.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "ECC-4-2-1", name: "Incident Response Plan", domain: "Incident Management", description: "Develop and maintain a formal incident response plan covering detection, analysis, and recovery.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "ECC-4-2-2", name: "Incident Handling Procedures", domain: "Incident Management", description: "Establish procedures for handling various types of cybersecurity incidents.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "ECC-5-1-1", name: "Business Continuity Plan", domain: "Business Continuity", description: "Develop and test a business continuity plan that addresses cybersecurity disruptions.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "ECC-5-1-2", name: "Disaster Recovery", domain: "Business Continuity", description: "Implement disaster recovery procedures with defined RTO and RPO targets.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "high" },
  ],
};

export interface NCAControl {
  id: string;
  name: string;
  domain: string;
  description: string;
  maturity_levels: string[];
  priority: "critical" | "high" | "medium" | "low";
}

export { FRAMEWORK_COLORS } from "../../lib/ncaFrameworks";

/**
 * Maps detected policy domains to the ECC controls they can meaningfully assess.
 * The model was trained on password_policy and risk_assessment data only.
 * Controls not listed here should be marked "not_assessed" — the model has no training signal for them.
 */
export const DOMAIN_CONTROL_MAP: Record<string, string[]> = {
  password_policy: [
    "ECC-2-2-1",  // Identity Management
    "ECC-2-2-2",  // Access Control
    "ECC-2-2-3",  // Privileged Access Management
    "ECC-3-2-2",  // Data Encryption (password storage/transit)
  ],
  risk_assessment: [
    "ECC-1-2-1",  // Risk Management Program
    "ECC-1-2-2",  // Risk Assessment
  ],
  access_control: ["ECC-2-2-1", "ECC-2-2-2", "ECC-2-2-3"],
  asset_management: ["ECC-2-1-1", "ECC-2-1-2"],
  business_continuity: ["ECC-5-1-1", "ECC-5-1-2"],
  data_protection: ["ECC-3-2-1", "ECC-3-2-2"],
  incident_response: ["ECC-4-2-1", "ECC-4-2-2"],
  log_monitoring: ["ECC-4-1-1", "ECC-4-1-2"],
  third_party_security: ["ECC-1-1-2", "ECC-2-2-2"],
  vuln_management: ["ECC-4-1-1", "ECC-4-1-2"],
};

/**
 * Maps GAP_PP / GAP_RA gap IDs to the specific ECC control they are most relevant to.
 */
export const GAP_CONTROL_MAP: Record<string, string> = {
  // Password policy gaps → IAM controls
  GAP_PP_001: "ECC-2-2-2",  // Weak password complexity → Access Control
  GAP_PP_002: "ECC-2-2-2",  // Inadequate expiration → Access Control
  GAP_PP_003: "ECC-2-2-2",  // Weak account lockout → Access Control
  GAP_PP_004: "ECC-2-2-1",  // Missing MFA → Identity Management
  GAP_PP_005: "ECC-2-2-3",  // Missing PAM → Privileged Access Management
  GAP_PP_006: "ECC-3-2-2",  // Missing encryption → Data Encryption
  GAP_PP_007: "ECC-2-2-1",  // Missing review schedule → Identity Management
  GAP_PP_008: "ECC-2-2-1",  // Missing roles/responsibilities → Identity Management
  // Risk assessment gaps → Risk Management controls
  GAP_RA_001: "ECC-1-2-1",  // Missing methodology → Risk Management Program
  GAP_RA_002: "ECC-1-2-2",  // Missing risk identification → Risk Assessment
  GAP_RA_003: "ECC-1-2-2",  // Missing impact/likelihood scales → Risk Assessment
  GAP_RA_004: "ECC-1-2-1",  // Missing treatment options → Risk Management Program
  GAP_RA_005: "ECC-1-2-2",  // Missing assessment triggers → Risk Assessment
  GAP_RA_006: "ECC-1-2-1",  // Missing risk register → Risk Management Program
  GAP_RA_007: "ECC-1-2-1",  // Missing periodic review → Risk Management Program
  GAP_RA_008: "ECC-1-2-1",  // Missing project integration → Risk Management Program
  GAP_AC_001: "ECC-2-2-1",
  GAP_AC_002: "ECC-2-2-2",
  GAP_AC_003: "ECC-2-2-3",
  GAP_AC_004: "ECC-2-2-2",
  GAP_AM_001: "ECC-2-1-1",
  GAP_AM_002: "ECC-2-1-2",
  GAP_AM_003: "ECC-2-1-1",
  GAP_AM_004: "ECC-2-1-2",
  GAP_BC_001: "ECC-5-1-1",
  GAP_BC_002: "ECC-5-1-2",
  GAP_BC_003: "ECC-5-1-1",
  GAP_BC_004: "ECC-5-1-2",
  GAP_DP_001: "ECC-3-2-1",
  GAP_DP_002: "ECC-3-2-2",
  GAP_DP_003: "ECC-3-2-1",
  GAP_DP_004: "ECC-3-2-2",
  GAP_IR_001: "ECC-4-2-1",
  GAP_IR_002: "ECC-4-2-2",
  GAP_IR_003: "ECC-4-2-1",
  GAP_IR_004: "ECC-4-2-2",
  GAP_LM_001: "ECC-4-1-1",
  GAP_LM_002: "ECC-4-1-2",
  GAP_LM_003: "ECC-4-1-1",
  GAP_LM_004: "ECC-4-1-2",
  GAP_TP_001: "ECC-1-1-2",
  GAP_TP_002: "ECC-2-2-2",
  GAP_TP_003: "ECC-1-1-2",
  GAP_TP_004: "ECC-2-2-2",
  GAP_VM_001: "ECC-4-1-1",
  GAP_VM_002: "ECC-4-1-2",
  GAP_VM_003: "ECC-4-1-1",
  GAP_VM_004: "ECC-4-1-2",
};

/**
 * Arabic descriptions for the 16 gap IDs detected by the model.
 */
export const GAP_NAMES_AR: Record<string, string> = {
  GAP_PP_001: "ضعف تعقيد كلمة المرور",
  GAP_PP_002: "عدم كفاية سياسة انتهاء صلاحية كلمة المرور",
  GAP_PP_003: "ضعف آلية قفل الحساب",
  GAP_PP_004: "غياب المصادقة متعددة العوامل (MFA)",
  GAP_PP_005: "غياب إدارة الوصول المميز (PAM)",
  GAP_PP_006: "غياب تشفير كلمات المرور",
  GAP_PP_007: "غياب جدول مراجعة السياسة",
  GAP_PP_008: "غياب تحديد الأدوار والمسؤوليات",
  GAP_RA_001: "غياب منهجية إدارة المخاطر",
  GAP_RA_002: "غياب تحديد المخاطر",
  GAP_RA_003: "غياب مقاييس التأثير والاحتمالية",
  GAP_RA_004: "غياب خيارات معالجة المخاطر",
  GAP_RA_005: "غياب محفزات التقييم",
  GAP_RA_006: "غياب سجل المخاطر",
  GAP_RA_007: "غياب المراجعة الدورية",
  GAP_RA_008: "غياب التكامل مع المشاريع",
};

/**
 * Arabic names for ECC controls used in remediation guidance.
 */
export const NCA_CONTROL_NAMES_AR: Record<string, string> = {
  "ECC-1-1-1": "استراتيجية الأمن السيبراني",
  "ECC-1-1-2": "سياسات الأمن السيبراني",
  "ECC-1-1-3": "أدوار ومسؤوليات الأمن السيبراني",
  "ECC-1-2-1": "برنامج إدارة المخاطر",
  "ECC-1-2-2": "تقييم المخاطر",
  "ECC-2-1-1": "جرد الأصول",
  "ECC-2-1-2": "تصنيف الأصول",
  "ECC-2-2-1": "إدارة الهوية",
  "ECC-2-2-2": "التحكم في الوصول",
  "ECC-2-2-3": "إدارة الوصول المميز",
  "ECC-3-1-1": "بنية أمن الشبكات",
  "ECC-3-1-2": "تجزئة الشبكات",
  "ECC-3-2-1": "تصنيف البيانات",
  "ECC-3-2-2": "تشفير البيانات",
  "ECC-4-1-1": "المراقبة الأمنية",
  "ECC-4-1-2": "اكتشاف الحوادث",
  "ECC-4-2-1": "خطة الاستجابة للحوادث",
  "ECC-4-2-2": "إجراءات التعامل مع الحوادث",
  "ECC-5-1-1": "خطة استمرارية الأعمال",
  "ECC-5-1-2": "التعافي من الكوارث",
};

/**
 * Arabic domain names for ECC control domains.
 */
export const DOMAIN_NAMES_AR: Record<string, string> = {
  "Governance": "الحوكمة",
  "Risk Management": "إدارة المخاطر",
  "Asset Management": "إدارة الأصول",
  "Identity & Access Management": "إدارة الهوية والوصول",
  "Network Security": "أمن الشبكات",
  "Data Protection": "حماية البيانات",
  "Security Operations": "العمليات الأمنية",
  "Incident Management": "إدارة الحوادث",
  "Business Continuity": "استمرارية الأعمال",
};

/**
 * Arabic names for ISO 27001 controls used in framework comparison.
 */
export const ISO_CONTROL_NAMES_AR: Record<string, string> = {
  "Policy": "السياسة",
  "Information Security Policy": "سياسة أمن المعلومات",
  "Organizational Roles": "الأدوار التنظيمية",
  "Risk Assessment": "تقييم المخاطر",
  "Information Security Risk Assessment": "تقييم مخاطر أمن المعلومات",
  "Operational Planning": "التخطيط التشغيلي",
  "Classification of Information": "تصنيف المعلومات",
  "User Access Management": "إدارة وصول المستخدمين",
  "Access Control Policy": "سياسة التحكم في الوصول",
  "Privileged Access Rights": "صلاحيات الوصول المميز",
  "Networks Security": "أمن الشبكات",
  "Segregation in Networks": "الفصل في الشبكات",
  "Use of Cryptography": "استخدام التشفير",
  "Monitoring, Measurement, Analysis": "المراقبة والقياس والتحليل",
  "Nonconformity & Corrective Action": "عدم المطابقة والإجراء التصحيحي",
  "Incident Management": "إدارة الحوادث",
  "Incident Response": "الاستجابة للحوادث",
  "ICT Readiness for Business Continuity": "جاهزية تقنية المعلومات لاستمرارية الأعمال",
  "Redundancies": "النسخ الاحتياطي والتكرار",
};
