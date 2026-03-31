import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, FileText, AlertTriangle, TrendingUp, Plus } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import ComplianceGauge from "@/components/dashboard/ComplianceGauge";
import FrameworkCard from "@/components/dashboard/FrameworkCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import PageHeader from "@/components/common/PageHeader";

export default function Dashboard() {
  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => base44.entities.ComplianceAssessment.list("-created_date"),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["policies"],
    queryFn: () => base44.entities.Policy.list("-created_date"),
  });

  // Calculate overall stats
  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(a => a.status === "completed").length;
  const averageScore = assessments.length > 0
    ? Math.round(assessments.reduce((sum, a) => sum + (a.overall_score || 0), 0) / assessments.length)
    : 0;
  
  const analyzedPolicies = policies.filter(p => p.status === "analyzed").length;
  const policiesWithGaps = policies.filter(p => p.compliance_score && p.compliance_score < 80).length;

  // Framework summary
  const frameworkSummary = assessments.reduce((acc, assessment) => {
    if (!acc[assessment.framework]) {
      acc[assessment.framework] = { score: 0, count: 0, status: assessment.status };
    }
    acc[assessment.framework].score += assessment.overall_score || 0;
    acc[assessment.framework].count++;
    return acc;
  }, {});

  // Recent activity
  const recentActivity = [
    ...assessments.slice(0, 3).map(a => ({
      type: "assessment",
      title: `${a.framework} Assessment`,
      description: a.status === "completed" ? `Score: ${a.overall_score}%` : `Status: ${a.status}`,
      time: a.created_date,
    })),
    ...policies.slice(0, 3).map(p => ({
      type: "policy",
      title: p.title,
      description: p.status === "analyzed" ? `Compliance: ${p.compliance_score}%` : `Status: ${p.status}`,
      time: p.created_date,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Compliance Dashboard"
          description="Monitor your organization's cybersecurity compliance with NCA regulations"
          actions={
            <div className="flex gap-3">
              <Link to={createPageUrl("Policies")}>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Upload Policy
                </Button>
              </Link>
              <Link to={createPageUrl("NewAssessment")}>
                <Button className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </Button>
              </Link>
            </div>
          }
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Overall Compliance"
            value={`${averageScore}%`}
            subtitle="Across all frameworks"
            icon={Shield}
            trend={averageScore >= 70 ? "+5% from last month" : null}
            trendUp={averageScore >= 70}
          />
          <StatsCard
            title="Assessments"
            value={totalAssessments}
            subtitle={`${completedAssessments} completed`}
            icon={TrendingUp}
          />
          <StatsCard
            title="Policies Analyzed"
            value={analyzedPolicies}
            subtitle={`${policies.length} total uploaded`}
            icon={FileText}
          />
          <StatsCard
            title="Gaps Identified"
            value={policiesWithGaps}
            subtitle="Policies need attention"
            icon={AlertTriangle}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Compliance Gauge */}
          <ComplianceGauge
            score={averageScore}
            label="Average Compliance Score"
          />

          {/* NCA Frameworks */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold text-slate-900">NCA Frameworks</h3>
            {["ECC", "CSCC", "DCC", "OTCC", "TCC"].map(framework => {
              const summary = frameworkSummary[framework];
              return (
                <FrameworkCard
                  key={framework}
                  framework={framework}
                  score={summary ? Math.round(summary.score / summary.count) : undefined}
                  status={summary?.status}
                />
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity activities={recentActivity} />
          
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-2">Quick Start Guide</h3>
            <p className="text-slate-300 text-sm mb-6">
              Get started with your compliance assessment in three simple steps
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">1</div>
                <div>
                  <p className="font-medium">Upload Policies</p>
                  <p className="text-sm text-slate-400">Upload your organization's security policies for AI analysis</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">2</div>
                <div>
                  <p className="font-medium">Start Assessment</p>
                  <p className="text-sm text-slate-400">Select an NCA framework and begin your compliance assessment</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">3</div>
                <div>
                  <p className="font-medium">Review & Remediate</p>
                  <p className="text-sm text-slate-400">Get AI-powered recommendations to close compliance gaps</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}