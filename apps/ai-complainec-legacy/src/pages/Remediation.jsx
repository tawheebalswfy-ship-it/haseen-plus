import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2, 
  Plus, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Calendar,
  User,
  MessageSquare,
  History
} from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import CommentSection from "@/components/collaboration/CommentSection";
import AssigneeSelector from "@/components/collaboration/AssigneeSelector";
import AuditTrail from "@/components/audit/AuditTrail";
import { logAudit } from "@/components/audit/auditLogger";

const priorityColors = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200"
};

const statusColors = {
  open: "bg-red-50 text-red-700",
  in_progress: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  deferred: "bg-slate-50 text-slate-600"
};

export default function Remediation() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["remediation-tasks"],
    queryFn: () => base44.entities.RemediationTask.list("-created_date"),
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => base44.entities.ComplianceAssessment.filter({ status: "completed" }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const task = await base44.entities.RemediationTask.create(data);
      await logAudit({
        action: "task_created",
        entityType: "remediation_task",
        entityId: task.id,
        entityName: data.title,
        user: currentUser,
        details: { priority: data.priority, control_id: data.control_id },
      });
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remediation-tasks"] });
      setShowCreateDialog(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RemediationTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["remediation-tasks"] });
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const sendAssignmentNotification = async (email, taskTitle) => {
    await base44.entities.Notification.create({
      user_email: email,
      title: "Task Assigned to You",
      message: `You have been assigned: ${taskTitle}`,
      type: "task_assigned",
      entity_type: "remediation_task",
      entity_id: selectedTask?.id
    });
    await logAudit({
      action: "task_assigned",
      entityType: "remediation_task",
      entityId: selectedTask?.id,
      entityName: taskTitle,
      user: currentUser,
      details: { assigned_to: email },
    });
  };

  const generateAIGuidance = async (task) => {
    setIsGeneratingGuidance(true);
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an NCA compliance expert. Provide detailed remediation guidance for:

Control: ${task.control_id} - ${task.title}
Description: ${task.description}
Priority: ${task.priority}

Provide step-by-step remediation guidance in JSON format with:
1. steps: Array of detailed remediation steps
2. estimated_effort: Time estimate (e.g., "2-3 weeks")
3. resources_needed: Array of required resources
4. success_criteria: How to verify remediation is complete
5. quick_wins: Any immediate actions that can be taken`,
      response_json_schema: {
        type: "object",
        properties: {
          steps: { type: "array", items: { type: "string" } },
          estimated_effort: { type: "string" },
          resources_needed: { type: "array", items: { type: "string" } },
          success_criteria: { type: "string" },
          quick_wins: { type: "array", items: { type: "string" } }
        }
      }
    });

    await updateMutation.mutateAsync({
      id: task.id,
      data: { ai_guidance: result }
    });

    setSelectedTask({ ...task, ai_guidance: result });
    setIsGeneratingGuidance(false);
  };

  const autoGenerateTasks = async () => {
    for (const assessment of assessments) {
      const gaps = assessment.control_results?.filter(c => 
        c.status === "non_compliant" || c.status === "partial"
      ) || [];

      for (const gap of gaps) {
        const existing = tasks.find(t => 
          t.control_id === gap.control_id && t.assessment_id === assessment.id
        );
        
        if (!existing) {
          await createMutation.mutateAsync({
            title: gap.control_name,
            description: gap.gap || gap.recommendation,
            control_id: gap.control_id,
            assessment_id: assessment.id,
            priority: gap.status === "non_compliant" ? "high" : "medium",
            status: "open"
          });
        }
      }
    }
  };

  const filteredTasks = tasks.filter(t => 
    filterStatus === "all" || t.status === filterStatus
  );

  const tasksByStatus = {
    open: filteredTasks.filter(t => t.status === "open").length,
    in_progress: filteredTasks.filter(t => t.status === "in_progress").length,
    completed: filteredTasks.filter(t => t.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="AI Remediation Assistant"
          description="Track and remediate compliance gaps with AI-powered guidance"
          backTo="Dashboard"
          backLabel="Dashboard"
          actions={
            <div className="flex gap-3">
              <Button variant="outline" onClick={autoGenerateTasks}>
                <Sparkles className="w-4 h-4 mr-2" />
                Auto-Generate Tasks
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">Total Tasks</p>
            <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">Open</p>
            <p className="text-2xl font-bold text-red-600">{tasksByStatus.open}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{tasksByStatus.in_progress}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-emerald-600">{tasksByStatus.completed}</p>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {["all", "open", "in_progress", "completed", "deferred"].map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className={filterStatus === status ? "bg-slate-900" : ""}
            >
              {status.replace("_", " ")}
            </Button>
          ))}
        </div>

        {/* Task List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map(task => (
            <Card 
              key={task.id} 
              className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                  <Badge variant="secondary" className={statusColors[task.status]}>
                    {task.status?.replace("_", " ")}
                  </Badge>
                </div>
                <span className="text-xs text-slate-500 font-mono">{task.control_id}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{task.title}</h3>
              <p className="text-sm text-slate-600 line-clamp-2 mb-4">{task.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                {task.due_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.due_date), "MMM d")}
                  </span>
                )}
                {task.assigned_to && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.assigned_to.includes("team:") ? "Team" : task.assigned_to.split("@")[0]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {task.ai_guidance && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                )}
              </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <Card className="p-12 bg-white border-0 shadow-sm text-center">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No remediation tasks</h3>
            <p className="text-slate-500 mb-4">Click "Auto-Generate Tasks" to create tasks from assessment gaps</p>
          </Card>
        )}

        {/* Task Detail Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedTask?.title}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedTask?.control_id}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            {selectedTask && (
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={priorityColors[selectedTask.priority]}>
                    {selectedTask.priority} priority
                  </Badge>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(status) => {
                      updateMutation.mutate({ id: selectedTask.id, data: { status } });
                      setSelectedTask({ ...selectedTask, status });
                      if (selectedTask.assigned_to) {
                        base44.entities.Notification.create({
                          user_email: selectedTask.assigned_to,
                          title: "Task Status Updated",
                          message: `Task "${selectedTask.title}" status changed to ${status}`,
                          type: "task_updated",
                          entity_type: "remediation_task",
                          entity_id: selectedTask.id
                        });
                      }
                      logAudit({
                        action: status === "completed" ? "task_completed" : "task_status_changed",
                        entityType: "remediation_task",
                        entityId: selectedTask.id,
                        entityName: selectedTask.title,
                        user: currentUser,
                        details: { from: selectedTask.status, to: status },
                      });
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="deferred">Deferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee */}
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Assigned To</h4>
                  <AssigneeSelector
                    value={selectedTask.assigned_to}
                    onChange={(assignee) => {
                      updateMutation.mutate({ id: selectedTask.id, data: { assigned_to: assignee } });
                      setSelectedTask({ ...selectedTask, assigned_to: assignee });
                    }}
                    onAssign={(email) => sendAssignmentNotification(email, selectedTask.title)}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Description</h4>
                  <p className="text-slate-700">{selectedTask.description}</p>
                </div>

                {/* AI Guidance */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      AI Remediation Guidance
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateAIGuidance(selectedTask)}
                      disabled={isGeneratingGuidance}
                    >
                      {isGeneratingGuidance ? (
                        <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="w-3 h-3 mr-2" />{selectedTask.ai_guidance ? "Regenerate" : "Generate"}</>
                      )}
                    </Button>
                  </div>

                  {selectedTask.ai_guidance ? (
                    <Card className="p-4 bg-purple-50 border-purple-200">
                      {selectedTask.ai_guidance.quick_wins?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-purple-700 uppercase mb-2">Quick Wins</p>
                          <ul className="space-y-1">
                            {selectedTask.ai_guidance.quick_wins.map((win, idx) => (
                              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                {win}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mb-4">
                        <p className="text-xs font-semibold text-purple-700 uppercase mb-2">Remediation Steps</p>
                        <ol className="space-y-2">
                          {selectedTask.ai_guidance.steps?.map((step, idx) => (
                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-3">
                              <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                {idx + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Estimated Effort</p>
                          <p className="text-slate-700">{selectedTask.ai_guidance.estimated_effort}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-purple-700 uppercase mb-1">Success Criteria</p>
                          <p className="text-slate-700">{selectedTask.ai_guidance.success_criteria}</p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 bg-slate-50 border-slate-200 text-center">
                      <p className="text-slate-500 text-sm">Click "Generate" for AI-powered remediation guidance</p>
                    </Card>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t pt-4">
                  <CommentSection entityType="remediation_task" entityId={selectedTask.id} />
                </div>

                {/* Audit Trail */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                    <History className="w-4 h-4 text-slate-500" />
                    Activity History
                  </h4>
                  <AuditTrail entityType="remediation_task" entityId={selectedTask.id} limit={10} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Task Dialog */}
        <CreateTaskDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
          assessments={assessments}
          onCreate={(data) => createMutation.mutate(data)}
        />
      </div>
    </div>
  );
}

function CreateTaskDialog({ open, onOpenChange, assessments, onCreate }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    control_id: "",
    priority: "medium",
    due_date: "",
    assigned_to: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    onCreate(formData);
    
    // Send notification if assigned
    if (formData.assigned_to && !formData.assigned_to.startsWith("team:")) {
      await base44.entities.Notification.create({
        user_email: formData.assigned_to,
        title: "New Task Assigned",
        message: `You have been assigned: ${formData.title}`,
        type: "task_assigned",
        entity_type: "remediation_task"
      });
    }
    
    setFormData({ title: "", description: "", control_id: "", priority: "medium", due_date: "", assigned_to: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Remediation Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Control ID</label>
            <Input
              value={formData.control_id}
              onChange={(e) => setFormData({ ...formData, control_id: e.target.value })}
              placeholder="e.g., ECC-2-2-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the remediation needed"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Assign To</label>
            <AssigneeSelector
              value={formData.assigned_to}
              onChange={(assignee) => setFormData({ ...formData, assigned_to: assignee })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Due Date</label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-slate-900">Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}