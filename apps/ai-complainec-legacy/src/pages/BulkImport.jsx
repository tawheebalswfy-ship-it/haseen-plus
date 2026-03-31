import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, Download, X } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

const ENTITY_SCHEMAS = {
  RemediationTask: {
    label: "Remediation Tasks",
    fields: ["title", "control_id", "description", "priority", "status", "due_date", "assigned_to"],
    required: ["title", "control_id"],
    example: [
      { title: "Implement MFA", control_id: "ECC-2-2-1", priority: "critical", status: "open", due_date: "2026-03-01" },
      { title: "Network Segmentation Review", control_id: "ECC-3-1-2", priority: "high", status: "in_progress", due_date: "2026-04-15" }
    ]
  },
  ComplianceAssessment: {
    label: "Compliance Assessments",
    fields: ["name", "framework", "status", "overall_score"],
    required: ["name", "framework"],
    example: [
      { name: "Q1 2026 ECC Assessment", framework: "ECC", status: "completed", overall_score: 72 },
      { name: "Cloud Security Review", framework: "CSCC", status: "draft", overall_score: 0 }
    ]
  }
};

export default function BulkImport() {
  const queryClient = useQueryClient();
  const [selectedEntity, setSelectedEntity] = useState("RemediationTask");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);

  const importMutation = useMutation({
    mutationFn: async (records) => {
      return base44.entities[selectedEntity].bulkCreate(records);
    },
    onSuccess: (data) => {
      setResult({ success: data.length, failed: 0 });
      queryClient.invalidateQueries();
    }
  });

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview([]);
    setResult(null);
    setError(null);
    setIsExtracting(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file: f });

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          records: {
            type: "array",
            items: {
              type: "object",
              properties: Object.fromEntries(
                ENTITY_SCHEMAS[selectedEntity].fields.map(f => [f, { type: "string" }])
              )
            }
          }
        }
      }
    });

    if (extracted.status === "success" && extracted.output?.records) {
      setPreview(extracted.output.records.slice(0, 20));
    } else {
      setError("Could not extract data from file. Please ensure it matches the expected format.");
    }
    setIsExtracting(false);
  };

  const downloadTemplate = () => {
    const schema = ENTITY_SCHEMAS[selectedEntity];
    const header = schema.fields.join(",");
    const exampleRows = schema.example.map(row =>
      schema.fields.map(f => row[f] || "").join(",")
    ).join("\n");
    const csv = `${header}\n${exampleRows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEntity}_template.csv`;
    a.click();
  };

  const handleImport = () => {
    if (preview.length > 0) {
      importMutation.mutate(preview);
    }
  };

  const schema = ENTITY_SCHEMAS[selectedEntity];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Bulk Import"
          description="Import data from Excel or CSV files into the compliance platform"
          backTo="Dashboard"
          backLabel="Dashboard"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Panel */}
          <div className="space-y-4">
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Import Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Import Into</label>
                  <Select value={selectedEntity} onValueChange={(v) => { setSelectedEntity(v); setFile(null); setPreview([]); setResult(null); }}>
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ENTITY_SCHEMAS).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Required Fields</label>
                  <div className="flex flex-wrap gap-1">
                    {schema.required.map(f => (
                      <Badge key={f} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">All Fields</label>
                  <div className="flex flex-wrap gap-1">
                    {schema.fields.map(f => (
                      <Badge key={f} variant="outline" className="bg-slate-50 text-slate-600 text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </Card>

            {/* Upload Area */}
            <Card className="p-5 bg-white border-0 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Upload File</h3>
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer transition-all group">
                {isExtracting ? (
                  <>
                    <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-3" />
                    <p className="text-sm font-medium text-slate-700">Extracting data...</p>
                  </>
                ) : file ? (
                  <>
                    <FileSpreadsheet className="w-10 h-10 text-teal-500 mb-3" />
                    <p className="text-sm font-medium text-slate-700 text-center truncate max-w-full">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Click to change file</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-300 group-hover:text-teal-400 mb-3 transition-colors" />
                    <p className="text-sm font-medium text-slate-700">Upload CSV or Excel file</p>
                    <p className="text-xs text-slate-500 mt-1">.csv, .xlsx supported</p>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
              </label>

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-0 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Data Preview</h3>
                  {preview.length > 0 && (
                    <p className="text-sm text-slate-500">{preview.length} records ready to import</p>
                  )}
                </div>
                {preview.length > 0 && !result && (
                  <Button
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Import {preview.length} Records</>
                    )}
                  </Button>
                )}
              </div>

              {result ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Import Successful!</h3>
                  <p className="text-slate-500">{result.success} records imported successfully</p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => { setFile(null); setPreview([]); setResult(null); }}
                  >
                    Import More
                  </Button>
                </div>
              ) : preview.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">#</th>
                        {schema.fields.slice(0, 5).map(f => (
                          <th key={f} className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">{f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {preview.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                          {schema.fields.slice(0, 5).map(f => (
                            <td key={f} className="px-4 py-3 text-slate-700 max-w-[150px] truncate">
                              {row[f] || <span className="text-slate-300">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400">Upload a file to preview data before importing</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}