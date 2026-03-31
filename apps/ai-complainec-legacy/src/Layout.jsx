import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  LayoutDashboard, 
  FileText, 
  ClipboardCheck, 
  FileBarChart,
  Wrench,
  Clock,
  Users,
  LogOut,
  Menu,
  X
} from "lucide-react";
import NotificationBell from "@/components/collaboration/NotificationBell";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "Dashboard", icon: LayoutDashboard },
  { name: "Policies", href: "Policies", icon: FileText },
  { name: "Assessments", href: "NewAssessment", icon: ClipboardCheck },
  { name: "Reports", href: "Reports", icon: FileBarChart },
  { name: "Remediation", href: "Remediation", icon: Wrench },
  { name: "Scheduling", href: "Scheduling", icon: Clock },
  { name: "Teams", href: "Teams", icon: Users },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">Compliance</span>
                <span className="text-lg font-light text-teal-400">Guard</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-400"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = currentPageName === item.href || 
                (item.href === "NewAssessment" && currentPageName === "Assessment") ||
                (item.href === "Reports" && currentPageName === "Reports") ||
                (item.href === "Remediation" && currentPageName === "Remediation") ||
                (item.href === "Scheduling" && currentPageName === "Scheduling");
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive 
                      ? "bg-teal-500/10 text-teal-400" 
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800">
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 lg:hidden">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2 ml-4">
              <Shield className="w-5 h-5 text-teal-500" />
              <span className="font-semibold text-slate-900">ComplianceGuard</span>
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop notification bell */}
        <div className="hidden lg:flex fixed top-4 right-6 z-30">
          <NotificationBell />
        </div>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}