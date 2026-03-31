import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function PolicyUploader({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file) => {
    const fileExt = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx", "txt"].includes(fileExt)) {
      return { error: "Unsupported file type" };
    }
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const policy = await base44.entities.Policy.create({
        title: file.name.replace(/\.[^/.]+$/, ""),
        file_url,
        file_type: fileExt,
        status: "pending"
      });
      
      return { success: true, policy };
    } catch (error) {
      return { error: error.message };
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = [...e.dataTransfer.files];
    for (const file of droppedFiles) {
      const result = await processFile(file);
      if (result.success) {
        setFiles(prev => [...prev, { name: file.name, status: "uploaded" }]);
        onUploadComplete?.(result.policy);
      }
    }
  }, [onUploadComplete]);

  const handleFileSelect = async (e) => {
    const selectedFiles = [...e.target.files];
    for (const file of selectedFiles) {
      const result = await processFile(file);
      if (result.success) {
        setFiles(prev => [...prev, { name: file.name, status: "uploaded" }]);
        onUploadComplete?.(result.policy);
      }
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300 cursor-pointer",
          isDragging ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300 bg-slate-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <label className="flex flex-col items-center justify-center p-12 cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
          ) : (
            <div className="p-4 rounded-full bg-white shadow-sm mb-4">
              <Upload className="w-8 h-8 text-slate-600" />
            </div>
          )}
          <p className="text-lg font-medium text-slate-900 mb-1">
            {uploading ? "Uploading..." : "Drop your policy documents here"}
          </p>
          <p className="text-sm text-slate-500 mb-4">or click to browse</p>
          <p className="text-xs text-slate-400">Supports PDF, DOCX, TXT files</p>
        </label>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{file.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}