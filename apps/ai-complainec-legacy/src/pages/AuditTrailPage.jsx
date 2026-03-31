import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, ClipboardCheck, Wrench, FileBarChart, 
  Calendar, User, Search, Filter, Loader2, ShieldCheck
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

const actionConfig = {
  policy_uploaded:       { label: "Policy Uploaded",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  policy_analyzed:       { label: "Policy Analyzed",        color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  policy_reanalyzed:     { label: "Policy Re-analyzed",     color: "bg-teal-100 text-teal-700 border-teal-200" },
  policy_deleted:        { label: "Policy Deleted",         color: "bg-red-100 text-red-700 border-red-200" },
  assessment_created:    { label: "Assessment Created",     color: "bg-purple-100 text-purple-700 border-purple-200" },
  assessment_started:    { label: "Assessment Started",     color: "bg-amber-100 text-amber-700 border-amber-200" },
  assessment_completed:  { label: "Assessment Completed",   color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  assessment_reviewed:   { label: "Control Reviewed",       color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  task_created:          { label: "Task Created",           color: "bg-slate-100 text-slate-700 border-slate-200" },
  task_assigned:         { label: "Task Assigned",          color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  task_status_changed:   { label: "Task Status Changed",    color: "bg-amber-100 text-amber-700 border-amber-200" },
  task_completed:        { label: "Task Completed",         color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  report_generated:      { label: "Report Generated",       color: "bg-violet-100 text-violet-700 border-violet-200" },
  control_updated:       { label: "Control Updated",        color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

const entityIcons = {
  policy: FileText,
  assessment: ClipboardCheck,
  remediation_task: Wrench,
  report: FileBarChart,
  schedule: Calendar,
};

const entityColors = {
  policy: "bg-blue-500",
  assessment: "bg-purple-500",
  remediation_task: "bg-orange-500",
  report: "bg-violet-500",
  schedule: "bg-teal-500",
};

export default function AuditTrailPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs-all"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 100),
  });

  const filtered = logs.filter(log => {
    const matchSearch = !search || 
      log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.performed_by?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === "all" || log.entity_type === entityFilter;
    const matchAction = actionFilter === "all" || log.action === actionFilter;
    return matchSearch && matchEntity && matchAction;
  });

  // Stats
  const todayCount = logs.filter(l => {
    const d = new Date(l.created_date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const uniqueUsers = [...new Set(logs.map(l => l.performed_by).filter(Boolean))].length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Audit Trail"
          description="Complete log of all actions and changes across the compliance platform"
          backTo="Dashboard"
          backLabel="Dashboard"
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Total Events</p>
            <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Today</p>
            <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Active Users</p>
            <p className="text-2xl font-bold text-emerald-600">{uniqueUsers}</p>
          </Card>
          <Card className="p-4 bg-white border-0 shadow-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Filtered</p>
            <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by entity, user, or action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-48 bg-white">
              <Filter className="w-4 h-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="policy">Policies</SelectItem>
              <SelectItem value="assessment">Assessments</SelectItem>
              <SelectItem value="remediation_task">Remediation Tasks</SelectItem>
              <SelectItem value="report">Reports</SelectItem>
              <SelectItem value="schedule">Schedules</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-52 bg-white">
              <SelectValue placeholder="Action type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(actionConfig).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Log List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-16 bg-white border-0 shadow-sm text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No audit records yet</h3>
            <p className="text-slate-500">Actions taken in the platform will appear here</p>
          </Card>
        ) : (
          <Card className="bg-white border-0 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filtered.map((log) => {
                const config = actionConfig[log.action] || { label: log.action, color: "bg-slate-100 text-slate-700 border-slate-200" };
                const Icon = entityIcons[log.entity_type] || FileText;
                const dotColor = entityColors[log.entity_type] || "bg-slate-400";
                return (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full ${dotColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={`${config.color} text-xs`}>
                          {config.label}
                        </Badge>
                        {log.entity_name && (
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {log.entity_name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 capitalize">
                          ({log.entity_type?.replace(/_/g, " ")})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.performed_by_name || log.performed_by || "System"}
                        </span>
                        <span>{format(new Date(log.created_date), "MMM d, yyyy 'at' HH:mm")}</span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          {Object.entries(log.details)
                            .filter(([, v]) => v !== null && v !== undefined && v !== "")
                            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Time */}
                    <div className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
                      {format(new Date(log.created_date), "HH:mm")}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}