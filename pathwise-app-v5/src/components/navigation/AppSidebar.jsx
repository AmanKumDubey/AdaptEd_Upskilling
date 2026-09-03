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

      {!collapsed && (
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

      {!collapsed && (
        <div className="pro-card">
          <div className="pro-card-title">Pro Plan</div>
          <div className="pro-card-copy">Unlimited courses & assessments</div>
        </div>
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
