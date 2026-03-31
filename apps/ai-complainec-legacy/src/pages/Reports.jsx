import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Loader2, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  FileBarChart,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import ExecutiveSummaryReport from "@/components/reports/ExecutiveSummaryReport";
import DetailedReport from "@/components/reports/DetailedReport";
import GapAnalysisReport from "@/components/reports/GapAnalysisReport";

const reportTypes = [
  { id: "executive_summary", name: "Executive Summary", icon: PieChart, description: "High-level overview for leadership" },
  { id: "detailed", name: "Detailed Assessment", icon: FileBarChart, description: "Complete control-by-control analysis" },
  { id: "gap_analysis", name: "Gap Analysis", icon: BarChart3, description: "Focus on non-compliant areas" },
  { id: "remediation_plan", name: "Remediation Plan", icon: TrendingUp, description: "Action items and timeline" },
];

export default function Reports() {
  const [selectedType, setSelectedType] = useState("executive_summary");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [generatedReport, setGeneratedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => base44.entities.ComplianceAssessment.filter({ status: "completed" }),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["policies"],
    queryFn: () => base44.entities.Policy.list(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => base44.entities.ComplianceReport.list("-created_date", 10),
  });

  const generateReport = async () => {
    setIsGenerating(true);
    const assessment = assessments.find(a => a.id === selectedAssessment);
    
    const prompt = `Generate a ${selectedType.replace("_", " ")} compliance report for:
    
Assessment: ${assessment.name}
Framework: ${assessment.framework}
Overall Score: ${assessment.overall_score}%
Compliant: ${assessment.compliant_controls} | Partial: ${assessment.partial_controls} | Non-Compliant: ${assessment.non_compliant_controls}

Control Results:
${JSON.stringify(assessment.control_results?.slice(0, 20), null, 2)}

Generate a professional ${selectedType === "executive_summary" ? "executive summary with key findings, risk overview, and recommendations" : 
selectedType === "detailed" ? "detailed report with all control assessments and evidence" :
selectedType === "gap_analysis" ? "gap analysis focusing on non-compliant areas with root causes" :
"remediation plan with prioritized action items and estimated timelines"}

Return JSON with: title, summary, sections (array of {heading, content}), recommendations, risk_rating`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          sections: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, content: { type: "string" } } } },
          recommendations: { type: "array", items: { type: "string" } },
          risk_rating: { type: "string" }
        }
      }
    });

    await base44.entities.ComplianceReport.create({
      title: result.title,
      assessment_id: selectedAssessment,
      report_type: selectedType,
      content: result,
      generated_at: new Date().toISOString()
    });

    setGeneratedReport({ ...result, assessment, type: selectedType });
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Compliance Reports"
          description="Generate and export compliance reports for stakeholders"
          backTo="Dashboard"
          backLabel="Dashboard"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Generator */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Generate Report</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Assessment</label>
                  <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessments.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.overall_score}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Report Type</label>
                  <div className="space-y-2">
                    {reportTypes.map(type => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          selectedType === type.id 
                            ? "border-teal-500 bg-teal-50" 
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <type.icon className={`w-5 h-5 ${selectedType === type.id ? "text-teal-600" : "text-slate-400"}`} />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{type.name}</p>
                          <p className="text-xs text-slate-500">{type.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800"
                  disabled={!selectedAssessment || isGenerating}
                  onClick={generateReport}
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" />Generate Report</>
                  )}
                </Button>
              </div>
            </Card>

            {/* Recent Reports */}
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Recent Reports</h3>
              <div className="space-y-3">
                {reports.slice(0, 5).map(report => (
                  <button
                    key={report.id}
                    onClick={() => setGeneratedReport({ ...report.content, type: report.report_type })}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{report.title}</p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(report.created_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {report.report_type?.replace("_", " ")}
                    </Badge>
                  </button>
                ))}
                {reports.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No reports generated yet</p>
                )}
              </div>
            </Card>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-2">
            {generatedReport ? (
              <Card className="bg-white border-0 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{generatedReport.title}</h2>
                    <p className="text-sm text-slate-500">
                      Generated {format(new Date(), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  {generatedReport.type === "executive_summary" && <ExecutiveSummaryReport report={generatedReport} />}
                  {generatedReport.type === "detailed" && <DetailedReport report={generatedReport} />}
                  {generatedReport.type === "gap_analysis" && <GapAnalysisReport report={generatedReport} />}
                  {generatedReport.type === "remediation_plan" && <DetailedReport report={generatedReport} />}
                </div>
              </Card>
            ) : (
              <Card className="bg-white border-0 shadow-sm p-12 text-center">
                <FileBarChart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Report Selected</h3>
                <p className="text-slate-500">Select an assessment and report type to generate a compliance report</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}