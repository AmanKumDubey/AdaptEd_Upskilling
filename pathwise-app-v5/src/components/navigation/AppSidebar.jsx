import { LogoutButton } from "../LogoutButton";
import { NotificationBell } from "../notifications/NotificationBell";

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

const learnerItems = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "path", label: "Learning Path", icon: "◇" },
  { id: "courses", label: "Explore", icon: "◎" },
  { id: "wallet", label: "Skills Wallet", icon: "❖" },
  { id: "assess", label: "Assessments", icon: "✦" },
];

const employerItems = [
  { id: "emp-dashboard", label: "Overview", icon: "⬡" },
  { id: "emp-team", label: "Team Skills", icon: "◎" },
  { id: "emp-assess", label: "Assessments", icon: "✦" },
];

export function AppSidebar({
  collapsed,
  currentView,
  employerMode,
  showEmployerToggle = true,
  elevatedOrgs = [],
  activeOrgId,
  onSelectOrg,
  onChangeView,
  onToggleCollapsed,
  onToggleMode,
}) {
  const navItems = employerMode ? employerItems : learnerItems;

  return (
    <aside className={`app-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <div className="brand-lockup">
        <div className="brand-mark">P</div>
        {!collapsed && <span className="brand-name">Pathwise</span>}
      </div>

      {/* Phase B10: only shown to users who actually hold an owner/admin/hr
          role in some organization - this used to render for every logged-in
          user regardless of real access (confirmed: employerMode was derived
          purely from the URL, with no permission check anywhere upstream). */}
      {!collapsed && showEmployerToggle && (
        <div className="mode-switcher" aria-label="Application mode">
          <span className={!employerMode ? "is-active" : ""}>Learner</span>
          <button
            type="button"
            className={`toggle-track ${employerMode ? "on" : ""}`}
            onClick={onToggleMode}
            aria-label={`Switch to ${employerMode ? "learner" : "employer"} mode`}
            aria-pressed={employerMode}
          >
            <span className="toggle-thumb" />
          </button>
          <span className={employerMode ? "is-active" : ""}>Employer</span>
        </div>
      )}

      {/* Phase B14: only shown when this user actually manages more than one
          organization - the common single-org case stays exactly as before,
          no extra chrome. */}
      {!collapsed && employerMode && elevatedOrgs.length > 1 && (
        <select
          aria-label="Active organization"
          value={activeOrgId || ""}
          onChange={(event) => onSelectOrg(event.target.value)}
          style={{ width: "100%", margin: "0 0 10px", padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(148,163,184,0.25)", fontSize: 12.5, fontFamily: "inherit", background: "white", color: "#334155" }}
        >
          {elevatedOrgs.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.role})</option>
          ))}
        </select>
      )}

      <nav className="app-navigation" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`nav-item ${currentView === item.id ? "active" : ""}`}
            onClick={() => onChangeView(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <nav className="app-navigation-footer" aria-label="Account">
        <NotificationBell collapsed={collapsed} />
        <button
          type="button"
          className={`nav-item ${currentView === "account" ? "active" : ""}`}
          onClick={() => onChangeView("account")}
          title={collapsed ? "Profile" : undefined}
        >
          <span className="nav-icon" aria-hidden="true">☺</span>
          {!collapsed && <span>Profile</span>}
        </button>
      </nav>

      {!collapsed && (
        <div className="pro-card">
          <div className="pro-card-title">Pro Plan</div>
          <div className="pro-card-copy">Unlimited courses & assessments</div>
        </div>
      )}

      {authEnabled && !collapsed && (
        <LogoutButton className="sidebar-logout" style={{ width: "100%", marginTop: 10, padding: "10px 16px", fontSize: 13 }} />
      )}

      <button
        type="button"
        className="sidebar-collapse"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "›" : "‹"}
      </button>
    </aside>
  );
}
