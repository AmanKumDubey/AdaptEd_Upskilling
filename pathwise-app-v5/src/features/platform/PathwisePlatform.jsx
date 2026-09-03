import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FrostBackground } from "../../components/layout/FrostBackground";
import { AppSidebar } from "../../components/navigation/AppSidebar";
import { useProfile } from "../../state/PathwiseDataContext";
import { T } from "../../theme";
import "../../styles/platform.css";

const VIEW_ROUTES = {
  dashboard: "/dashboard",
  path: "/learning-path",
  courses: "/courses",
  wallet: "/skills",
  assess: "/assessment",
  account: "/profile",
  "emp-dashboard": "/employer",
  "emp-team": "/employer/team",
  "emp-assess": "/employer/assessments",
};

const ROUTE_VIEWS = Object.fromEntries(
  Object.entries(VIEW_ROUTES).map(([view, route]) => [route, view]),
);

// ─── Main App ────────────────────────────────────────────────────────
export default function LearningPlatform() {
  const [profile] = useProfile();
  const [selectedSkills, setSelectedSkills] = useState(() => profile?.skills?.length ? profile.skills : ["Python", "Machine Learning", "SQL", "Statistics", "Deep Learning"]);
  const [selectedGoal, setSelectedGoal] = useState(() => profile?.targetRole || "ML Engineer");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentView = location.pathname.startsWith("/learning-path")
    ? "path"
    : ROUTE_VIEWS[location.pathname] ?? "";
  const employerMode = location.pathname.startsWith("/employer");

  const handleChangeView = (view) => navigate(VIEW_ROUTES[view] ?? "/dashboard");
  const handleToggleMode = () => navigate(employerMode ? "/dashboard" : "/employer");

  return (
    <div className="platform-shell" style={{ fontFamily: "'Outfit', sans-serif", background: `linear-gradient(160deg, #F0F7FF 0%, ${T.bg} 30%, #F5F0FF 70%, #F0FFFE 100%)`, color: T.navy, minHeight: "100vh", display: "flex", position: "relative" }}>

      <FrostBackground />

      <AppSidebar
        collapsed={sidebarCollapsed}
        currentView={currentView}
        employerMode={employerMode}
        onChangeView={handleChangeView}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onToggleMode={handleToggleMode}
      />

      {/* ─── Main ─── */}
      <main className="platform-main" style={{ flex: 1, padding: "32px 40px", overflowY: "auto", maxHeight: "100vh", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <Outlet
            context={{
              profile,
              selectedSkills,
              selectedGoal,
              setSelectedSkills,
              setSelectedGoal,
              navigateToView: handleChangeView,
            }}
          />
        </div>
      </main>
    </div>
  );
}
