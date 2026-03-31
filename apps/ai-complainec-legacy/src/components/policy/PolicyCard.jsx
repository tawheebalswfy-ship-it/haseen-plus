import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MoreVertical, Eye, Trash2, RefreshCw, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

const statusConfig = {
  pending: { icon: Clock, color: "bg-slate-100 text-slate-600", label: "Pending" },
  analyzing: { icon: Loader2, color: "bg-blue-50 text-blue-600", label: "Analyzing", spin: true },
  analyzed: { icon: CheckCircle, color: "bg-emerald-50 text-emerald-600", label: "Analyzed" },
  failed: { icon: AlertCircle, color: "bg-red-50 text-red-600", label: "Failed" },
};

const categoryLabels = {
  access_control: "Access Control",
  data_protection: "Data Protection",
  incident_response: "Incident Response",
  network_security: "Network Security",
  asset_management: "Asset Management",
  business_continuity: "Business Continuity",
  third_party: "Third Party",
  physical_security: "Physical Security",
  other: "Other",
};

export default function PolicyCard({ policy, onAnalyze, onDelete, onView }) {
  const status = statusConfig[policy.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-100">
            <FileText className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 line-clamp-1">{policy.title}</h3>
            <p className="text-xs text-slate-500">
              {format(new Date(policy.created_date), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(policy)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAnalyze?.(policy)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Analyze
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(policy)} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={status.color}>
            <StatusIcon className={`w-3 h-3 mr-1 ${status.spin ? "animate-spin" : ""}`} />
            {status.label}
          </Badge>
          {policy.category && (
            <Badge variant="outline" className="text-slate-600">
              {categoryLabels[policy.category] || policy.category}
            </Badge>
          )}
        </div>
        {policy.compliance_score !== undefined && policy.compliance_score !== null && (
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-900">{policy.compliance_score}%</span>
            <p className="text-xs text-slate-500">Compliance</p>
          </div>
        )}
      </div>
    </Card>
  );
}