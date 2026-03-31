import { Card } from "@/components/ui/card";
import { FileText, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

const activityIcons = {
  policy: FileText,
  assessment: Shield,
  alert: AlertTriangle,
  success: CheckCircle,
};

const activityColors = {
  policy: "bg-blue-50 text-blue-600",
  assessment: "bg-purple-50 text-purple-600",
  alert: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
};

export default function RecentActivity({ activities }) {
  return (
    <Card className="p-6 bg-white border-0 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities?.length > 0 ? activities.map((activity, index) => {
          const Icon = activityIcons[activity.type] || FileText;
          const colorClass = activityColors[activity.type] || activityColors.policy;
          
          return (
            <div key={index} className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{activity.title}</p>
                <p className="text-xs text-slate-500">{activity.description}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {activity.time && format(new Date(activity.time), "MMM d")}
              </span>
            </div>
          );
        }) : (
          <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
        )}
      </div>
    </Card>
  );
}