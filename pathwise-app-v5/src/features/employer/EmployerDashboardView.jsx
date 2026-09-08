import { useOutletContext } from "react-router-dom";
import { GlassCard } from "../../components/UIKit";
import { EMPLOYEES } from "../../data/mockData";
import { T } from "../../theme";
import { authEnabled } from "./employerAccess";
import { averagePathProgress, averageScore, displayName, domainRollup, downloadCSV, initials, teamToCSV, topDomains, useTeamProgress } from "./employerData";
import { NoOrgAccess } from "./NoOrgAccess";

// ─── Employer Dashboard ──────────────────────────────────────────────
// Split into two full components (rather than branching mid-component) so
// neither side's hooks can ever collide - authEnabled is fixed at build
// time, so which one renders never changes across a session anyway.
export function EmployerDashboardView() {
  return authEnabled ? <RealEmployerDashboard /> : <DemoEmployerDashboard />;
}

// Phase B10: real team data (adapted-backend's GET /api/orgs/:orgId/team-progress)
// for whichever organization this user manages - replaces the fabricated
// EMPLOYEES mock roster and hand-typed stat cards. The old "Skills Gap
// Analysis" section compared team scores against a "target" that doesn't
// exist as real data anywhere (no target-setting feature) - replaced with a
// team-wide domain average instead of inventing target numbers.
function RealEmployerDashboard() {
  const { employerAccess } = useOutletContext();
  const { data: team, loading } = useTeamProgress(employerAccess.org?.id);

  if (!employerAccess.hasAccess) return <NoOrgAccess onCreated={employerAccess.refetch} />;

  const avgScore = averageScore(team);
  const avgPathProgress = averagePathProgress(team);
  const totalCoursesCompleted = team.reduce((sum, m) => sum + m.coursesCompleted, 0);
  const assessedCount = team.filter((m) => m.latestAssessment).length;
  const weakestDomains = domainRollup(team, 4);
  const leaderboard = [...team].sort((a, b) => (b.latestAssessment?.score ?? -1) - (a.latestAssessment?.score ?? -1));

  const stats = [
    { label: "Team Members", value: String(team.length), sub: employerAccess.org?.name || "", color: T.blue },
    { label: "Avg. Skill Score", value: avgScore === null ? "—" : String(avgScore), sub: `${assessedCount}/${team.length} assessed`, color: T.green },
    { label: "Courses Completed", value: String(totalCoursesCompleted), sub: "across the team", color: T.amber },
    { label: "Avg. Path Progress", value: avgPathProgress === null ? "—" : `${avgPathProgress}%`, sub: "of generated roadmaps", color: T.violet },
  ];

  const handleExport = () => {
    const csv = teamToCSV(team);
    const orgSlug = (employerAccess.org?.name || "team").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    downloadCSV(csv, `${orgSlug}-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Team Overview</h1>
          <p style={{ color: T.muted, fontSize: 14.5 }}>Monitor your team's learning progress and skill development</p>
        </div>
        <button type="button" className="btn-ghost" style={{ fontSize: 12.5 }} onClick={handleExport} disabled={team.length === 0}>
          Export Team Report
        </button>
      </div>

      <div className="fade-up s1" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map((s, i) => (
          <GlassCard key={i} style={{ borderTop: `3px solid ${s.color}`, borderRadius: `0 0 ${T.radius}px ${T.radius}px` }}>
            <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 10 }}>{s.label}</div>
            <div className="stat-num" style={{ fontSize: 34, color: T.navy }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: T.muted, marginTop: 6, fontWeight: 600 }}>{s.sub}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="fade-up s2" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Team Leaderboard</div>
        {loading && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
        {!loading && leaderboard.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No members yet.</p>}
        {leaderboard.map((member, i) => (
          <div key={member.userId} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: i < leaderboard.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none" }}>
            <div className="stat-num" style={{ fontSize: 14, color: T.faint, width: 24 }}>#{i + 1}</div>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${T.blue}18, ${T.blue}08)`, border: `1px solid ${T.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.blue, fontFamily: "'General Sans'" }}>{initials(member)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{displayName(member)}</div>
              <div style={{ fontSize: 11.5, color: T.muted, textTransform: "capitalize" }}>{member.role}{member.learningPath?.targetRole ? ` · aiming for ${member.learningPath.targetRole}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {topDomains(member).map((d) => <span key={d} style={{ fontSize: 10.5, padding: "3px 8px", background: "rgba(148,163,184,0.06)", borderRadius: 5, color: T.muted }}>{d}</span>)}
            </div>
            <div style={{ textAlign: "right", minWidth: 56 }}>
              <div className="stat-num" style={{ fontSize: 20, color: T.navy }}>{member.latestAssessment?.score ?? "—"}</div>
              <div style={{ fontSize: 10.5, color: T.muted, fontWeight: 600 }}>{member.latestAssessment ? member.latestAssessment.level : "Not assessed"}</div>
            </div>
          </div>
        ))}
      </GlassCard>

      <GlassCard className="fade-up s3">
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Team Domain Performance</div>
        {weakestDomains.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No completed assessments yet.</p>}
        {weakestDomains.map((d) => (
          <div key={d.domain} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{ width: 180, fontSize: 13, fontWeight: 600, color: T.slate }}>{d.domain}</div>
            <div style={{ flex: 1, position: "relative", height: 8, background: "rgba(148,163,184,0.08)", borderRadius: 4 }}>
              <div style={{ position: "absolute", height: "100%", width: `${d.avg}%`, background: d.avg < 40 ? T.rose : d.avg < 70 ? T.amber : T.green, borderRadius: 4, transition: "width 1s" }} />
            </div>
            <div style={{ width: 50, textAlign: "right" }}>
              <span className="stat-num" style={{ fontSize: 12, color: d.avg < 40 ? T.rose : d.avg < 70 ? T.amber : T.green }}>{d.avg}%</span>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>Team average across everyone's most recent assessment, weakest domain first</div>
      </GlassCard>
    </div>
  );
}

function DemoEmployerDashboard() {
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
