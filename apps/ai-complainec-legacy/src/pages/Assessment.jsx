import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Loader2, 
  Play, 
  FileText, 
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  History
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ComplianceGauge from "@/components/dashboard/ComplianceGauge";
import ControlsTable from "@/components/assessment/ControlsTable";
import DomainChart from "@/components/assessment/DomainChart";
import AuditTrail from "@/components/audit/AuditTrail";
import CommentSection from "@/components/collaboration/CommentSection";
import { logAudit } from "@/components/audit/auditLogger";

// Sample NCA ECC controls structure
const ECC_CONTROLS = [
  { control_id: "ECC-1-1-1", control_name: "Cybersecurity Strategy", domain: "Cybersecurity Governance" },
  { control_id: "ECC-1-1-2", control_name: "Cybersecurity Policies", domain: "Cybersecurity Governance" },
  { control_id: "ECC-1-1-3", control_name: "Cybersecurity Roles", domain: "Cybersecurity Governance" },
  { control_id: "ECC-1-2-1", control_name: "Risk Management Program", domain: "Cybersecurity Risk Management" },
  { control_id: "ECC-1-2-2", control_name: "Risk Assessment", domain: "Cybersecurity Risk Management" },
  { control_id: "ECC-2-1-1", control_name: "Asset Inventory", domain: "Cybersecurity Defense" },
  { control_id: "ECC-2-1-2", control_name: "Asset Classification", domain: "Cybersecurity Defense" },
  { control_id: "ECC-2-2-1", control_name: "Identity Management", domain: "Identity & Access Management" },
  { control_id: "ECC-2-2-2", control_name: "Access Control", domain: "Identity & Access Management" },
  { control_id: "ECC-2-2-3", control_name: "Privileged Access", domain: "Identity & Access Management" },
  { control_id: "ECC-3-1-1", control_name: "Network Security Architecture", domain: "Network Security" },
  { control_id: "ECC-3-1-2", control_name: "Network Segmentation", domain: "Network Security" },
  { control_id: "ECC-3-2-1", control_name: "Data Classification", domain: "Data Protection" },
  { control_id: "ECC-3-2-2", control_name: "Data Encryption", domain: "Data Protection" },
  { control_id: "ECC-4-1-1", control_name: "Security Monitoring", domain: "Security Operations" },
  { control_id: "ECC-4-1-2", control_name: "Incident Detection", domain: "Security Operations" },
  { control_id: "ECC-4-2-1", control_name: "Incident Response Plan", domain: "Incident Management" },
  { control_id: "ECC-4-2-2", control_name: "Incident Handling", domain: "Incident Management" },
  { control_id: "ECC-5-1-1", control_name: "Business Continuity Plan", domain: "Business Continuity" },
  { control_id: "ECC-5-1-2", control_name: "Disaster Recovery", domain: "Business Continuity" },
];

export default function Assessment() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const assessmentId = urlParams.get("id");
  const frameworkParam = urlParams.get("framework");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: () => base44.entities.ComplianceAssessment.filter({ id: assessmentId }),
    enabled: !!assessmentId,
    select: (data) => data[0]
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["policies"],
    queryFn: () => base44.entities.Policy.filter({ status: "analyzed" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceAssessment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
    }
  });

  const runAssessmentMutation = useMutation({
    mutationFn: async () => {
      await updateMutation.mutateAsync({ 
        id: assessmentId, 
        data: { status: "in_progress" } 
      });

      // Use AI to assess each control based on policies
      const policyContext = policies.map(p => ({
        title: p.title,
        category: p.category,
        score: p.compliance_score,
        controls: p.nca_controls_mapped
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an NCA compliance expert. Based on the following analyzed policies, assess each control's compliance status.

Policies analyzed:
${JSON.stringify(policyContext, null, 2)}

Controls to assess:
${JSON.stringify(ECC_CONTROLS, null, 2)}

For each control, determine:
- status: "compliant", "partial", or "non_compliant" based on whether the policies adequately address the control
- evidence: Brief description of supporting evidence from policies
- gap: If not fully compliant, describe the gap
- recommendation: Specific action to achieve compliance

Return JSON with control_results array.`,
        response_json_schema: {
          type: "object",
          properties: {
            control_results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  control_id: { type: "string" },
                  status: { type: "string" },
                  evidence: { type: "string" },
                  gap: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Merge AI results with control definitions
      const controlResults = ECC_CONTROLS.map(control => {
        const aiResult = result.control_results?.find(r => r.control_id === control.control_id) || {};
        return {
          ...control,
          status: aiResult.status || "not_assessed",
          evidence: aiResult.evidence || "",
          gap: aiResult.gap || "",
          recommendation: aiResult.recommendation || ""
        };
      });

      // Calculate scores
      const compliant = controlResults.filter(c => c.status === "compliant").length;
      const partial = controlResults.filter(c => c.status === "partial").length;
      const nonCompliant = controlResults.filter(c => c.status === "non_compliant").length;
      const total = controlResults.length;
      const score = Math.round(((compliant + (partial * 0.5)) / total) * 100);

      await updateMutation.mutateAsync({
        id: assessmentId,
        data: {
          status: "completed",
          control_results: controlResults,
          compliant_controls: compliant,
          partial_controls: partial,
          non_compliant_controls: nonCompliant,
          total_controls: total,
          overall_score: score,
          risk_level: score >= 80 ? "low" : score >= 60 ? "medium" : score >= 40 ? "high" : "critical"
        }
      });

      await logAudit({
        action: "assessment_completed",
        entityType: "assessment",
        entityId: assessmentId,
        entityName: assessment?.name,
        user: currentUser,
        details: { score, framework: assessment?.framework },
      });
    }
  });

  const handleUpdateControl = async (controlId, updates) => {
    const newResults = assessment.control_results?.map(c => 
      c.control_id === controlId ? { ...c, ...updates } : c
    );

    logAudit({
      action: "control_updated",
      entityType: "assessment",
      entityId: assessmentId,
      entityName: assessment?.name,
      user: currentUser,
      details: { control_id: controlId, new_status: updates.status },
    });
    
    const compliant = newResults.filter(c => c.status === "compliant").length;
    const partial = newResults.filter(c => c.status === "partial").length;
    const nonCompliant = newResults.filter(c => c.status === "non_compliant").length;
    const total = newResults.length;
    const score = Math.round(((compliant + (partial * 0.5)) / total) * 100);

    updateMutation.mutate({
      id: assessmentId,
      data: {
        control_results: newResults,
        compliant_controls: compliant,
        partial_controls: partial,
        non_compliant_controls: nonCompliant,
        overall_score: score,
        risk_level: score >= 80 ? "low" : score >= 60 ? "medium" : score >= 40 ? "high" : "critical"
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Assessment not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={assessment.name}
          description={`${assessment.framework} Framework Assessment`}
          backTo="Dashboard"
          backLabel="Dashboard"
          actions={
            <div className="flex items-center gap-3">
              {assessment.status === "draft" && (
                <Button
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => runAssessmentMutation.mutate()}
                  disabled={runAssessmentMutation.isPending}
                >
                  {runAssessmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Run AI Assessment
                </Button>
              )}
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          }
        />

        {/* Status Banner */}
        {assessment.status === "in_progress" && (
          <Card className="p-4 bg-blue-50 border-blue-200 mb-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <p className="text-blue-700 font-medium">Assessment in progress. AI is analyzing your policies...</p>
            </div>
          </Card>
        )}

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <ComplianceGauge score={assessment.overall_score} label="Overall Score" size="md" />
          
          <Card className="p-6 bg-white border-0 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{assessment.compliant_controls || 0}</p>
              <p className="text-sm text-slate-500">Compliant</p>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border-0 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{assessment.partial_controls || 0}</p>
              <p className="text-sm text-slate-500">Partial</p>
            </div>
          </Card>
          
          <Card className="p-6 bg-white border-0 shadow-sm flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{assessment.non_compliant_controls || 0}</p>
              <p className="text-sm text-slate-500">Non-Compliant</p>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="controls">
          <TabsList className="bg-white mb-6">
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="domains">By Domain</TabsTrigger>
            <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              Audit History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls">
            <ControlsTable 
              controls={assessment.control_results || ECC_CONTROLS.map(c => ({ ...c, status: "not_assessed" }))}
              onUpdateControl={handleUpdateControl}
            />
          </TabsContent>

          <TabsContent value="domains">
            <DomainChart controls={assessment.control_results || []} />
          </TabsContent>

          <TabsContent value="gaps">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Identified Gaps</h3>
              <div className="space-y-4">
                {assessment.control_results?.filter(c => c.gap).map((control, idx) => (
                  <div key={idx} className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {control.control_id}: {control.control_name}
                        </p>
                        <p className="text-sm text-red-700 mt-1">{control.gap}</p>
                        {control.recommendation && (
                          <p className="text-sm text-slate-600 mt-2">
                            <strong>Recommendation:</strong> {control.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!assessment.control_results || assessment.control_results.filter(c => c.gap).length === 0) && (
                  <p className="text-slate-500 text-center py-8">No gaps identified yet. Run the assessment to analyze compliance.</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="discussion">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <CommentSection entityType="assessment" entityId={assessmentId} />
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="p-6 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" />
                Assessment Audit Trail
              </h3>
              <AuditTrail entityType="assessment" entityId={assessmentId} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}