import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const frameworkInfo = {
  ECC: { name: "Essential Cybersecurity Controls", color: "bg-blue-500" },
  CSCC: { name: "Cloud Cybersecurity Controls", color: "bg-purple-500" },
  DCC: { name: "Data Cybersecurity Controls", color: "bg-teal-500" },
  OTCC: { name: "Operational Technology Controls", color: "bg-orange-500" },
  TCC: { name: "Telecom Cybersecurity Controls", color: "bg-pink-500" },
};

export default function FrameworkCard({ framework, score, controlsCount, status }) {
  const info = frameworkInfo[framework] || { name: framework, color: "bg-slate-500" };
  
  return (
    <Link to={createPageUrl(`Assessment?framework=${framework}`)}>
      <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-12 rounded-full ${info.color}`} />
            <div>
              <h3 className="font-semibold text-slate-900">{framework}</h3>
              <p className="text-sm text-slate-500">{info.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {score !== undefined && (
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{score}%</p>
                <p className="text-xs text-slate-500">{controlsCount} controls</p>
              </div>
            )}
            {status && (
              <Badge variant="secondary" className={
                status === "completed" ? "bg-emerald-50 text-emerald-700" :
                status === "in_progress" ? "bg-amber-50 text-amber-700" :
                "bg-slate-100 text-slate-600"
              }>
                {status.replace("_", " ")}
              </Badge>
            )}
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  );
}