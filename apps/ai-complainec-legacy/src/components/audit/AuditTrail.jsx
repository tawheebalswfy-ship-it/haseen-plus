import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, ClipboardCheck, Wrench, FileBarChart, 
  Calendar, User, Loader2 
} from "lucide-react";

const actionConfig = {
  policy_uploaded:       { label: "Policy Uploaded",        color: "bg-blue-100 text-blue-700" },
  policy_analyzed:       { label: "Policy Analyzed",        color: "bg-emerald-100 text-emerald-700" },
  policy_reanalyzed:     { label: "Policy Re-analyzed",     color: "bg-teal-100 text-teal-700" },
  policy_deleted:        { label: "Policy Deleted",         color: "bg-red-100 text-red-700" },
  assessment_created:    { label: "Assessment Created",     color: "bg-purple-100 text-purple-700" },
  assessment_started:    { label: "Assessment Started",     color: "bg-amber-100 text-amber-700" },
  assessment_completed:  { label: "Assessment Completed",   color: "bg-emerald-100 text-emerald-700" },
  assessment_reviewed:   { label: "Assessment Reviewed",    color: "bg-blue-100 text-blue-700" },
  task_created:          { label: "Task Created",           color: "bg-slate-100 text-slate-700" },
  task_assigned:         { label: "Task Assigned",          color: "bg-indigo-100 text-indigo-700" },
  task_status_changed:   { label: "Task Status Changed",    color: "bg-amber-100 text-amber-700" },
  task_completed:        { label: "Task Completed",         color: "bg-emerald-100 text-emerald-700" },
  report_generated:      { label: "Report Generated",       color: "bg-violet-100 text-violet-700" },
  control_updated:       { label: "Control Updated",        color: "bg-cyan-100 text-cyan-700" },
};

const entityIcons = {
  policy: FileText,
  assessment: ClipboardCheck,
  remediation_task: Wrench,
  report: FileBarChart,
  schedule: Calendar,
};

export default function AuditTrail({ entityType, entityId, limit = 20 }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", entityType, entityId],
    queryFn: () => {
      const filter = {};
      if (entityType) filter.entity_type = entityType;
      if (entityId) filter.entity_id = entityId;
      return Object.keys(filter).length > 0
        ? base44.entities.AuditLog.filter(filter, "-created_date", limit)
        : base44.entities.AuditLog.list("-created_date", limit);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No audit history yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const config = actionConfig[log.action] || { label: log.action, color: "bg-slate-100 text-slate-700" };
        const Icon = entityIcons[log.entity_type] || FileText;
        return (
          <div key={log.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${config.color} border-0 text-xs`}>
                  {config.label}
                </Badge>
                {log.entity_name && (
                  <span className="text-sm font-medium text-slate-800 truncate">{log.entity_name}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {log.performed_by_name || log.performed_by || "System"}
                </span>
                <span className="text-xs text-slate-400">
                  {format(new Date(log.created_date), "MMM d, yyyy HH:mm")}
                </span>
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}