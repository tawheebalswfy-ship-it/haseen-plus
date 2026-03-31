import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ComplianceDashboard from "../components/compliance/ComplianceDashboard";
import OverviewPage from "../components/compliance/pages/OverviewPage";
import PoliciesPage from "../components/compliance/pages/PoliciesPage";
import AssessmentsPage from "../components/compliance/pages/AssessmentsPage";
import RemediationPage from "../components/compliance/pages/RemediationPage";
import FrameworkComparisonPage from "../components/compliance/pages/FrameworkComparisonPage";
import RiskDashboardPage from "../components/compliance/pages/RiskDashboardPage";

export function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return (
    <ComplianceDashboard>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
        <Route path="remediation" element={<RemediationPage />} />
        <Route path="framework-comparison" element={<FrameworkComparisonPage />} />
        <Route path="risk" element={<RiskDashboardPage />} />
      </Routes>
    </ComplianceDashboard>
  );
}
