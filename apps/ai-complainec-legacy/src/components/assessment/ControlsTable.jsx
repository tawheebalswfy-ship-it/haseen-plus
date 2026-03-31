import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

const statusConfig = {
  compliant: { icon: CheckCircle, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial: { icon: AlertTriangle, color: "bg-amber-50 text-amber-700 border-amber-200" },
  non_compliant: { icon: XCircle, color: "bg-red-50 text-red-700 border-red-200" },
  not_assessed: { icon: null, color: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function ControlsTable({ controls, onUpdateControl }) {
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedControl, setSelectedControl] = useState(null);

  const filteredControls = controls?.filter(c =>
    c.control_id?.toLowerCase().includes(search.toLowerCase()) ||
    c.control_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const groupedByDomain = filteredControls.reduce((acc, control) => {
    const domain = control.domain || "Other";
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(control);
    return acc;
  }, {});

  return (
    <Card className="bg-white border-0 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search controls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-50 border-0"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Control ID</TableHead>
              <TableHead className="font-semibold">Control Name</TableHead>
              <TableHead className="font-semibold">Domain</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedByDomain).map(([domain, domainControls]) => (
              domainControls.map((control, index) => {
                const status = statusConfig[control.status] || statusConfig.not_assessed;
                const StatusIcon = status.icon;
                const isExpanded = expandedRow === control.control_id;

                return (
                  <>
                    <TableRow 
                      key={control.control_id} 
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(isExpanded ? null : control.control_id)}
                    >
                      <TableCell className="font-mono text-sm">{control.control_id}</TableCell>
                      <TableCell className="font-medium">{control.control_name}</TableCell>
                      <TableCell className="text-slate-600">{control.domain}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.color}>
                          {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                          {control.status?.replace("_", " ") || "Not Assessed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-slate-50 p-4">
                          <div className="space-y-3">
                            {control.evidence && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Evidence</p>
                                <p className="text-sm text-slate-700">{control.evidence}</p>
                              </div>
                            )}
                            {control.gap && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Gap Identified</p>
                                <p className="text-sm text-red-600">{control.gap}</p>
                              </div>
                            )}
                            {control.recommendation && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Recommendation</p>
                                <p className="text-sm text-slate-700">{control.recommendation}</p>
                              </div>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedControl(control);
                              }}
                            >
                              Update Status
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredControls.length === 0 && (
        <div className="p-8 text-center text-slate-500">
          No controls found
        </div>
      )}

      <Dialog open={!!selectedControl} onOpenChange={() => setSelectedControl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Control Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-600">
              {selectedControl?.control_id}: {selectedControl?.control_name}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["compliant", "partial", "non_compliant"].map((status) => {
                const config = statusConfig[status];
                const Icon = config.icon;
                return (
                  <Button
                    key={status}
                    variant="outline"
                    className={config.color}
                    onClick={() => {
                      onUpdateControl?.(selectedControl.control_id, { status });
                      setSelectedControl(null);
                    }}
                  >
                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                    {status.replace("_", " ")}
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}