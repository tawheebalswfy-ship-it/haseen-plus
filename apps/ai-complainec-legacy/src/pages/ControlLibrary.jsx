import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Shield, ChevronRight, BookOpen, Filter } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

const NCA_CONTROLS = {
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
  CSCC: [
    { id: "CSCC-1-1-1", name: "Cloud Governance", domain: "Cloud Governance", description: "Establish cloud-specific governance policies and procedures.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "CSCC-1-2-1", name: "Cloud Risk Management", domain: "Cloud Governance", description: "Identify and manage risks specific to cloud computing environments.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "CSCC-2-1-1", name: "Cloud Provider Assessment", domain: "Cloud Provider Management", description: "Assess and monitor cloud service providers for compliance and security posture.", maturity_levels: ["Defined", "Managed"], priority: "critical" },
    { id: "CSCC-2-2-1", name: "Data Residency", domain: "Data Management", description: "Ensure organizational data is stored and processed within approved geographic boundaries.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "CSCC-3-1-1", name: "Cloud Access Control", domain: "Identity & Access", description: "Implement strong access controls for cloud environments including MFA.", maturity_levels: ["Defined", "Managed"], priority: "critical" },
    { id: "CSCC-3-2-1", name: "Cloud Encryption", domain: "Data Protection", description: "Encrypt cloud-stored data using customer-managed keys where applicable.", maturity_levels: ["Managed", "Optimized"], priority: "high" },
  ],
  DCC: [
    { id: "DCC-1-1-1", name: "Data Governance Framework", domain: "Data Governance", description: "Establish a data governance framework covering policies, standards, and accountability.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "DCC-2-1-1", name: "Personal Data Protection", domain: "Privacy", description: "Implement controls to protect personal data in accordance with applicable regulations.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "DCC-2-2-1", name: "Data Retention & Disposal", domain: "Data Lifecycle", description: "Define and enforce data retention schedules and secure disposal procedures.", maturity_levels: ["Defined", "Managed"], priority: "medium" },
    { id: "DCC-3-1-1", name: "Data Breach Response", domain: "Incident Response", description: "Establish procedures for detecting, reporting, and responding to data breaches.", maturity_levels: ["Defined", "Managed"], priority: "critical" },
  ],
  OTCC: [
    { id: "OTCC-1-1-1", name: "OT Security Strategy", domain: "OT Governance", description: "Develop a cybersecurity strategy specific to operational technology environments.", maturity_levels: ["Defined", "Managed"], priority: "critical" },
    { id: "OTCC-2-1-1", name: "OT Asset Inventory", domain: "OT Asset Management", description: "Maintain inventory of all OT assets including PLCs, SCADA, and ICS components.", maturity_levels: ["Defined"], priority: "high" },
    { id: "OTCC-3-1-1", name: "OT Network Segmentation", domain: "OT Network Security", description: "Implement air-gap or secure segmentation between OT and IT networks.", maturity_levels: ["Defined", "Managed"], priority: "critical" },
    { id: "OTCC-4-1-1", name: "OT Incident Response", domain: "OT Operations", description: "Develop OT-specific incident response procedures considering operational continuity.", maturity_levels: ["Defined", "Managed"], priority: "high" },
  ],
  TCC: [
    { id: "TCC-1-1-1", name: "Telecom Security Policy", domain: "Governance", description: "Establish telecom-specific security policies covering network infrastructure.", maturity_levels: ["Defined", "Managed"], priority: "high" },
    { id: "TCC-2-1-1", name: "Network Infrastructure Security", domain: "Network Security", description: "Secure telecom network infrastructure against unauthorized access and attacks.", maturity_levels: ["Defined", "Managed", "Optimized"], priority: "critical" },
    { id: "TCC-3-1-1", name: "Subscriber Data Protection", domain: "Data Protection", description: "Protect subscriber personal and usage data from unauthorized disclosure.", maturity_levels: ["Managed", "Optimized"], priority: "critical" },
    { id: "TCC-4-1-1", name: "Lawful Interception Security", domain: "Compliance", description: "Implement security controls around lawful interception capabilities.", maturity_levels: ["Defined", "Managed"], priority: "high" },
  ]
};

const priorityColors = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

const frameworkColors = {
  ECC: "bg-blue-500",
  CSCC: "bg-purple-500",
  DCC: "bg-teal-500",
  OTCC: "bg-orange-500",
  TCC: "bg-pink-500",
};

export default function ControlLibrary() {
  const [search, setSearch] = useState("");
  const [selectedFramework, setSelectedFramework] = useState("ECC");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedControl, setSelectedControl] = useState(null);

  const controls = NCA_CONTROLS[selectedFramework] || [];
  const domains = ["all", ...new Set(controls.map(c => c.domain))];

  const filtered = controls.filter(c => {
    const matchSearch = !search ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchDomain = selectedDomain === "all" || c.domain === selectedDomain;
    const matchPriority = selectedPriority === "all" || c.priority === selectedPriority;
    return matchSearch && matchDomain && matchPriority;
  });

  const totalByPriority = {
    critical: controls.filter(c => c.priority === "critical").length,
    high: controls.filter(c => c.priority === "high").length,
    medium: controls.filter(c => c.priority === "medium").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="NCA Control Library"
          description="Browse all NCA framework controls, requirements, and compliance guidance"
          backTo="Dashboard"
          backLabel="Dashboard"
        />

        {/* Framework Selector */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {Object.keys(NCA_CONTROLS).map(fw => (
            <button
              key={fw}
              onClick={() => { setSelectedFramework(fw); setSelectedDomain("all"); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                selectedFramework === fw
                  ? `${frameworkColors[fw]} text-white shadow-md`
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              <Shield className="w-4 h-4" />
              {fw}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedFramework === fw ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {NCA_CONTROLS[fw].length}
              </span>
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Critical Controls</p>
            <p className="text-2xl font-bold text-red-600">{totalByPriority.critical}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">High Priority</p>
            <p className="text-2xl font-bold text-orange-600">{totalByPriority.high}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total Controls</p>
            <p className="text-2xl font-bold text-slate-900">{controls.length}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search controls by ID, name, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="w-52 bg-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filter by domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map(d => (
                <SelectItem key={d} value={d}>{d === "all" ? "All Domains" : d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Controls List */}
        <div className="space-y-3">
          {filtered.map(control => (
            <Card
              key={control.id}
              className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedControl(control)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{control.id}</span>
                    <Badge variant="outline" className={`text-xs ${priorityColors[control.priority]}`}>
                      {control.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600">
                      {control.domain}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{control.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{control.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0 ml-4 mt-1" />
              </div>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card className="p-12 bg-white border-0 shadow-sm text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No controls match your search</p>
            </Card>
          )}
        </div>

        {/* Control Detail Dialog */}
        <Dialog open={!!selectedControl} onOpenChange={() => setSelectedControl(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">{selectedControl?.id}</span>
                <span>{selectedControl?.name}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedControl && (
              <div className="space-y-4 pt-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={priorityColors[selectedControl.priority]}>
                    {selectedControl.priority} priority
                  </Badge>
                  <Badge variant="outline" className="bg-slate-50 text-slate-600">
                    {selectedControl.domain}
                  </Badge>
                  <Badge variant="outline" className={`${frameworkColors[selectedFramework]} text-white border-0`}>
                    {selectedFramework}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Description</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedControl.description}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Maturity Levels</p>
                  <div className="flex gap-2">
                    {selectedControl.maturity_levels?.map((level, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-xs text-blue-700 font-medium">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Implementation Guidance</p>
                  <p className="text-sm text-amber-800">
                    Ensure this control is addressed in your policy documentation and that evidence is collected during assessments. Reference NCA {selectedFramework} framework documentation for detailed requirements.
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}