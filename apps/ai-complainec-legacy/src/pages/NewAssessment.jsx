import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Shield, Cloud, Database, Settings, Radio } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

const frameworks = [
  {
    id: "ECC",
    name: "Essential Cybersecurity Controls",
    description: "Core cybersecurity controls for all organizations",
    icon: Shield,
    color: "bg-blue-500",
    controlsCount: 114
  },
  {
    id: "CSCC",
    name: "Cloud Cybersecurity Controls",
    description: "Controls for cloud computing environments",
    icon: Cloud,
    color: "bg-purple-500",
    controlsCount: 73
  },
  {
    id: "DCC",
    name: "Data Cybersecurity Controls",
    description: "Data protection and privacy controls",
    icon: Database,
    color: "bg-teal-500",
    controlsCount: 45
  },
  {
    id: "OTCC",
    name: "Operational Technology Controls",
    description: "Controls for industrial control systems",
    icon: Settings,
    color: "bg-orange-500",
    controlsCount: 56
  },
  {
    id: "TCC",
    name: "Telecom Cybersecurity Controls",
    description: "Controls for telecommunications sector",
    icon: Radio,
    color: "bg-pink-500",
    controlsCount: 68
  }
];

export default function NewAssessment() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [selectedFramework, setSelectedFramework] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const framework = frameworks.find(f => f.id === selectedFramework);
      
      const assessment = await base44.entities.ComplianceAssessment.create({
        name: name || `${selectedFramework} Assessment`,
        framework: selectedFramework,
        status: "draft",
        total_controls: framework.controlsCount,
        compliant_controls: 0,
        partial_controls: 0,
        non_compliant_controls: 0,
        overall_score: 0
      });
      
      return assessment;
    },
    onSuccess: (assessment) => {
      navigate(createPageUrl(`Assessment?id=${assessment.id}`));
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="New Compliance Assessment"
          description="Select an NCA framework to begin your compliance assessment"
          backTo="Dashboard"
          backLabel="Dashboard"
        />

        <Card className="p-6 bg-white border-0 shadow-sm mb-6">
          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
            Assessment Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., Q1 2024 ECC Assessment"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2"
          />
        </Card>

        <div className="mb-6">
          <Label className="text-sm font-medium text-slate-700 mb-4 block">
            Select Framework
          </Label>
          <RadioGroup value={selectedFramework} onValueChange={setSelectedFramework}>
            <div className="space-y-3">
              {frameworks.map((framework) => {
                const Icon = framework.icon;
                const isSelected = selectedFramework === framework.id;
                
                return (
                  <label
                    key={framework.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? "border-slate-900 bg-slate-50" 
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <RadioGroupItem value={framework.id} className="sr-only" />
                    <div className={`p-3 rounded-xl ${framework.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{framework.id}</h3>
                        <span className="text-xs text-slate-500">({framework.controlsCount} controls)</span>
                      </div>
                      <p className="text-sm text-slate-600">{framework.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{framework.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-slate-900 bg-slate-900" : "border-slate-300"
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
            Cancel
          </Button>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            disabled={!selectedFramework || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Start Assessment
          </Button>
        </div>
      </div>
    </div>
  );
}