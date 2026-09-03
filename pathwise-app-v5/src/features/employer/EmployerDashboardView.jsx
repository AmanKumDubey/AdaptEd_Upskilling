import { GlassCard } from "../../components/UIKit";
import { EMPLOYEES } from "../../data/mockData";
import { T } from "../../theme";

// ─── Employer Dashboard ──────────────────────────────────────────────
export function EmployerDashboardView() {
  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Team Overview</h1>
        <p style={{ color: T.muted, fontSize: 14.5 }}>Monitor your team's learning progress and skill development</p>
      </div>

      <div className="fade-up s1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Team Members", value: "5", sub: "+2 this month", color: T.blue },
          { label: "Avg. Skill Score", value: "86", sub: "+4 from last month", color: T.green },
          { label: "Courses Active", value: "12", sub: "across 4 paths", color: T.amber },
          { label: "Assessments", value: "36", sub: "89% pass rate", color: T.violet },
        ].map((s, i) => (
          <GlassCard key={i} style={{ borderTop: `3px solid ${s.color}`, borderRadius: `0 0 ${T.radius}px ${T.radius}px` }}>
            <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 10 }}>{s.label}</div>
            <div className="stat-num" style={{ fontSize: 34, color: T.navy }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: T.green, marginTop: 6, fontWeight: 600 }}>{s.sub}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="fade-up s2" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Team Leaderboard</div>
        {EMPLOYEES.map((e, i) => (
          <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: i < EMPLOYEES.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none" }}>
            <div className="stat-num" style={{ fontSize: 14, color: T.faint, width: 24 }}>#{i+1}</div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${e.color}18, ${e.color}08)`, border: `1px solid ${e.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: e.color, fontFamily: "'General Sans'" }}>{e.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{e.name}</div>
              <div style={{ fontSize: 11.5, color: T.muted }}>{e.role}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {e.topSkills.map(s => <span key={s} style={{ fontSize: 10.5, padding: "3px 8px", background: "rgba(148,163,184,0.06)", borderRadius: 5, color: T.muted }}>{s}</span>)}
            </div>
            <div style={{ textAlign: "right", minWidth: 56 }}>
              <div className="stat-num" style={{ fontSize: 20, color: T.navy }}>{e.score}</div>
              <div style={{ fontSize: 10.5, color: T.green, fontWeight: 600 }}>{e.trend}</div>
            </div>
          </div>
        ))}
      </GlassCard>

      <GlassCard className="fade-up s3">
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Skills Gap Analysis</div>
        {[
          { skill: "Machine Learning", team: 78, target: 90, gap: 12 },
          { skill: "System Design", team: 62, target: 85, gap: 23 },
          { skill: "Cloud Infra", team: 55, target: 80, gap: 25 },
          { skill: "Data Engineering", team: 70, target: 85, gap: 15 },
        ].map(g => (
          <div key={g.skill} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{ width: 130, fontSize: 13, fontWeight: 600, color: T.slate }}>{g.skill}</div>
            <div style={{ flex: 1, position: "relative", height: 8, background: "rgba(148,163,184,0.08)", borderRadius: 4 }}>
              <div style={{ position: "absolute", height: "100%", width: `${g.team}%`, background: g.gap > 20 ? T.rose : g.gap > 10 ? T.amber : T.green, borderRadius: 4, transition: "width 1s" }} />
              <div style={{ position: "absolute", left: `${g.target}%`, top: -3, bottom: -3, width: 2.5, background: T.navy, borderRadius: 2, opacity: 0.2 }} />
            </div>
            <div style={{ width: 50, textAlign: "right" }}>
              <span className="stat-num" style={{ fontSize: 12, color: g.gap > 20 ? T.rose : g.gap > 10 ? T.amber : T.green }}>-{g.gap}%</span>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>Bars = team average · Lines = target proficiency</div>
      </GlassCard>
    </div>
  );
}
