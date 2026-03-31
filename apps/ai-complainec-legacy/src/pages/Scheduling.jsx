import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { 
  Plus, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  FileText,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import PageHeader from "@/components/common/PageHeader";

const frequencyConfig = {
  daily: { label: "Daily", getNext: (date) => addDays(date, 1) },
  weekly: { label: "Weekly", getNext: (date) => addWeeks(date, 1) },
  monthly: { label: "Monthly", getNext: (date) => addMonths(date, 1) },
  quarterly: { label: "Quarterly", getNext: (date) => addMonths(date, 3) }
};

export default function Scheduling() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.ScheduledAnalysis.list("-created_date"),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["policies"],
    queryFn: () => base44.entities.Policy.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const nextRun = frequencyConfig[data.frequency].getNext(new Date());
      return base44.entities.ScheduledAnalysis.create({
        ...data,
        next_run: nextRun.toISOString(),
        status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setShowCreateDialog(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScheduledAnalysis.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduledAnalysis.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] })
  });

  const runNow = async (schedule) => {
    // Trigger analysis for all policies in the schedule
    for (const policyId of schedule.policy_ids || []) {
      const policy = policies.find(p => p.id === policyId);
      if (policy) {
        await base44.entities.Policy.update(policyId, { status: "analyzing" });
        
        // Run AI analysis
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this cybersecurity policy document for compliance with Saudi Arabia's National Cybersecurity Authority (NCA) regulations. 
          
Policy Title: ${policy.title}
File URL: ${policy.file_url}

Provide analysis in JSON format.`,
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

        await base44.entities.Policy.update(policyId, {
          status: "analyzed",
          category: result.category,
          compliance_score: result.compliance_score,
          nca_controls_mapped: result.nca_controls_mapped,
          analysis_result: result
        });
      }
    }

    // Update last run and next run
    const nextRun = frequencyConfig[schedule.frequency].getNext(new Date());
    await updateMutation.mutateAsync({
      id: schedule.id,
      data: {
        last_run: new Date().toISOString(),
        next_run: nextRun.toISOString()
      }
    });

    queryClient.invalidateQueries({ queryKey: ["policies"] });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Automated Analysis Scheduling"
          description="Schedule automatic policy analysis to keep compliance data up-to-date"
          backTo="Dashboard"
          backLabel="Dashboard"
          actions={
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          }
        />

        {/* Active Schedules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {schedules.map(schedule => (
            <Card key={schedule.id} className="p-5 bg-white border-0 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{schedule.name}</h3>
                  <Badge variant="outline" className="mt-1">
                    {frequencyConfig[schedule.frequency]?.label}
                  </Badge>
                </div>
                <Switch
                  checked={schedule.status === "active"}
                  onCheckedChange={(checked) => 
                    updateMutation.mutate({ 
                      id: schedule.id, 
                      data: { status: checked ? "active" : "paused" } 
                    })
                  }
                />
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Next: {schedule.next_run ? format(new Date(schedule.next_run), "MMM d, yyyy HH:mm") : "Not scheduled"}
                  </span>
                </div>
                {schedule.last_run && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Last: {format(new Date(schedule.last_run), "MMM d, yyyy HH:mm")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{schedule.policy_ids?.length || 0} policies</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runNow(schedule)}
                  disabled={schedule.status === "paused"}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Run Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(schedule.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {schedules.length === 0 && (
          <Card className="p-12 bg-white border-0 shadow-sm text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No schedules created</h3>
            <p className="text-slate-500 mb-4">Create a schedule to automatically analyze policies</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </Card>
        )}

        {/* Upcoming Analyses */}
        <Card className="p-6 bg-white border-0 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Upcoming Analyses</h3>
          <div className="space-y-3">
            {schedules
              .filter(s => s.status === "active" && s.next_run)
              .sort((a, b) => new Date(a.next_run) - new Date(b.next_run))
              .slice(0, 5)
              .map(schedule => (
                <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-100">
                      <RefreshCw className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{schedule.name}</p>
                      <p className="text-xs text-slate-500">{schedule.policy_ids?.length || 0} policies</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(schedule.next_run), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(schedule.next_run), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            {schedules.filter(s => s.status === "active").length === 0 && (
              <p className="text-slate-500 text-center py-4">No upcoming analyses scheduled</p>
            )}
          </div>
        </Card>

        {/* Create Schedule Dialog */}
        <CreateScheduleDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          policies={policies}
          onCreate={(data) => createMutation.mutate(data)}
        />
      </div>
    </div>
  );
}

function CreateScheduleDialog({ open, onOpenChange, policies, onCreate }) {
  const [formData, setFormData] = useState({
    name: "",
    frequency: "weekly",
    policy_ids: [],
    notify_on_completion: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    setFormData({ name: "", frequency: "weekly", policy_ids: [], notify_on_completion: true });
  };

  const togglePolicy = (policyId) => {
    setFormData(prev => ({
      ...prev,
      policy_ids: prev.policy_ids.includes(policyId)
        ? prev.policy_ids.filter(id => id !== policyId)
        : [...prev.policy_ids, policyId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Analysis Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Schedule Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weekly Policy Review"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Frequency</label>
            <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Select Policies</label>
            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
              {policies.map(policy => (
                <label
                  key={policy.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    formData.policy_ids.includes(policy.id) ? "bg-teal-50" : "hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.policy_ids.includes(policy.id)}
                    onChange={() => togglePolicy(policy.id)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">{policy.title}</span>
                </label>
              ))}
              {policies.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">No policies uploaded yet</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Notify on completion</label>
            <Switch
              checked={formData.notify_on_completion}
              onCheckedChange={(checked) => setFormData({ ...formData, notify_on_completion: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-slate-900" disabled={!formData.name || formData.policy_ids.length === 0}>
              Create Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}