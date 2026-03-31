/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Assessment from './pages/Assessment';
import AuditTrailPage from './pages/AuditTrailPage';
import Dashboard from './pages/Dashboard';
import NewAssessment from './pages/NewAssessment';
import Policies from './pages/Policies';
import Remediation from './pages/Remediation';
import Reports from './pages/Reports';
import Scheduling from './pages/Scheduling';
import Teams from './pages/Teams';
import ControlLibrary from './pages/ControlLibrary';
import BulkImport from './pages/BulkImport';
import SharedReport from './pages/SharedReport';
import FrameworkComparison from './pages/FrameworkComparison';
import RiskDashboard from './pages/RiskDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Assessment": Assessment,
    "AuditTrailPage": AuditTrailPage,
    "Dashboard": Dashboard,
    "NewAssessment": NewAssessment,
    "Policies": Policies,
    "Remediation": Remediation,
    "Reports": Reports,
    "Scheduling": Scheduling,
    "Teams": Teams,
    "ControlLibrary": ControlLibrary,
    "BulkImport": BulkImport,
    "SharedReport": SharedReport,
    "FrameworkComparison": FrameworkComparison,
    "RiskDashboard": RiskDashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};