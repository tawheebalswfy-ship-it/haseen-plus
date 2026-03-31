import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Grid3X3, List, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageHeader from "@/components/common/PageHeader";
import PolicyUploader from "@/components/policy/PolicyUploader";
import PolicyCard from "@/components/policy/PolicyCard";
import PolicyDetails from "@/components/policy/PolicyDetails";
import { logAudit } from "@/components/audit/auditLogger";

export default function Policies() {
  const [showUploader, setShowUploader] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: () => base44.entities.Policy.list("-created_date"),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const analyzeMutation = useMutation({
    mutationFn: async (policy) => {
      await base44.entities.Policy.update(policy.id, { status: "analyzing" });
      
      // Call AI to analyze policy
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this cybersecurity policy document for compliance with Saudi Arabia's National Cybersecurity Authority (NCA) regulations. 
        
Policy Title: ${policy.title}
File URL: ${policy.file_url}

Provide analysis in JSON format with:
1. category: The policy category (access_control, data_protection, incident_response, network_security, asset_management, business_continuity, third_party, physical_security, or other)
2. compliance_score: A score from 0-100 indicating overall compliance level
3. nca_controls_mapped: Array of NCA control IDs this policy addresses (e.g., ["ECC-1-1-1", "ECC-2-1-1"])
4. gaps: Array of identified compliance gaps
5. recommendations: Array of specific recommendations to improve compliance
6. strengths: Array of policy strengths`,
        file_urls: [policy.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            category: { type: "string" },
            compliance_score: { type: "number" },
            nca_controls_mapped: { type: "array", items: { type: "string" } },
            gaps: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } }
          }
        }
      });

      await base44.entities.Policy.update(policy.id, {
        status: "analyzed",
        category: result.category,
        compliance_score: result.compliance_score,
        nca_controls_mapped: result.nca_controls_mapped,
        analysis_result: result
      });

      await logAudit({
        action: "policy_analyzed",
        entityType: "policy",
        entityId: policy.id,
        entityName: policy.title,
        user: currentUser,
        details: { score: result.compliance_score, category: result.category },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (policy) => {
      await logAudit({
        action: "policy_deleted",
        entityType: "policy",
        entityId: policy.id,
        entityName: policy.title,
        user: currentUser,
      });
      return base44.entities.Policy.delete(policy.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const filteredPolicies = policies.filter(p => 
    filterStatus === "all" || p.status === filterStatus
  );

  const handleUploadComplete = async (policy) => {
    await logAudit({
      action: "policy_uploaded",
      entityType: "policy",
      entityId: policy.id,
      entityName: policy.title,
      user: currentUser,
    });
    queryClient.invalidateQueries({ queryKey: ["policies"] });
    setShowUploader(false);
    analyzeMutation.mutate(policy);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Policy Documents"
          description="Upload and analyze your organization's security policies against NCA compliance requirements"
          backTo="Dashboard"
          backLabel="Dashboard"
          actions={
            <Button 
              className="bg-slate-900 hover:bg-slate-800"
              onClick={() => setShowUploader(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Policy
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <Tabs value={filterStatus} onValueChange={setFilterStatus}>
            <TabsList className="bg-white">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="analyzing">Analyzing</TabsTrigger>
              <TabsTrigger value="analyzed">Analyzed</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Policies Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : filteredPolicies.length > 0 ? (
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-4"
          }>
            {filteredPolicies.map(policy => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                onAnalyze={() => analyzeMutation.mutate(policy)}
                onDelete={() => deleteMutation.mutate(policy)}
                onView={() => setSelectedPolicy(policy)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl">
            <div className="p-4 rounded-full bg-slate-100 inline-block mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No policies uploaded</h3>
            <p className="text-slate-500 mb-6">Upload your first policy document to get started</p>
            <Button onClick={() => setShowUploader(true)}>
              Upload Policy
            </Button>
          </div>
        )}

        {/* Upload Dialog */}
        <Dialog open={showUploader} onOpenChange={setShowUploader}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Upload Policy Document</DialogTitle>
            </DialogHeader>
            <PolicyUploader onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>

        {/* Policy Details Dialog */}
        <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <PolicyDetails 
              policy={selectedPolicy} 
              onClose={() => setSelectedPolicy(null)}
              onReanalyze={() => {
                analyzeMutation.mutate(selectedPolicy);
                setSelectedPolicy(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}