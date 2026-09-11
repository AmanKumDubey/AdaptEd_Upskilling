import { useOutletContext } from "react-router-dom";
import { GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { averagePathProgress, averageScore, displayName, domainRollup, downloadCSV, initials, teamToCSV, topDomains, useTeamProgress } from "./employerData";
import { NoOrgAccess } from "./NoOrgAccess";

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

// ─── Shared presentational pieces (Phase B28 visual pass) ─────────────
function StatCard({ icon, label, value, sub, subColor, color }) {
  return (
    <GlassCard style={{ position: "relative", overflow: "hidden", borderTop: `3px solid ${color}`, borderRadius: `0 0 ${T.radius}px ${T.radius}px` }}>
      <div aria-hidden="true" style={{ position: "absolute", top: -30, right: -30, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${color}14, transparent 70%)` }} />
      <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11.5, color: T.muted, marginBottom: 10 }}>{label}</div>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: `${color}14`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{icon}</div>
      </div>
      <div className="stat-num" style={{ position: "relative", fontSize: 34, color: T.navy }}>{value}</div>
      <div style={{ position: "relative", fontSize: 11.5, color: subColor || T.muted, marginTop: 6, fontWeight: 600 }}>{sub}</div>
    </GlassCard>
  );
}

function LeaderRow({ rank, avatarColor, avatarLabel, name, meta, tags, score, scoreLabel, scoreColor, isLast }) {
  return (
    <div className="glass-hover" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 10px", borderRadius: 12, borderBottom: isLast ? "none" : "1px solid rgba(148,163,184,0.08)" }}>
      <div style={{ width: 26, textAlign: "center", flexShrink: 0, fontSize: rank <= 3 ? 17 : 13, color: T.faint }} className={rank <= 3 ? "" : "stat-num"}>
        {RANK_MEDAL[rank - 1] || `#${rank}`}
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${avatarColor}18, ${avatarColor}08)`, border: `1px solid ${avatarColor}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: avatarColor, fontFamily: "'General Sans'", flexShrink: 0 }}>{avatarLabel}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{name}</div>
        <div style={{ fontSize: 11.5, color: T.muted, textTransform: "capitalize" }}>{meta}</div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 200 }}>
        {tags.map((tag) => <span key={tag} style={{ fontSize: 10.5, padding: "3px 8px", background: "rgba(148,163,184,0.06)", borderRadius: 5, color: T.muted }}>{tag}</span>)}
      </div>
      <div style={{ textAlign: "right", minWidth: 56, flexShrink: 0 }}>
        <div className="stat-num" style={{ fontSize: 20, color: T.navy }}>{score}</div>
        <div style={{ fontSize: 10.5, color: scoreColor || T.muted, fontWeight: 600 }}>{scoreLabel}</div>
      </div>
    </div>
  );
}

function DomainBar({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
      <div className="domain-label" style={{ fontSize: 13, fontWeight: 600, color: T.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, position: "relative", height: 8, background: "rgba(148,163,184,0.08)", borderRadius: 4 }}>
        <div style={{ position: "absolute", height: "100%", width: `${value}%`, background: color, borderRadius: 4, transition: "width 1s", boxShadow: `0 0 8px ${color}50` }} />
      </div>
      <div style={{ width: 50, textAlign: "right" }}>
        <span className="stat-num" style={{ fontSize: 12, color }}>{value}%</span>
      </div>
    </div>
  );
}

// ─── Employer Dashboard ──────────────────────────────────────────────
// Real team data (adapted-backend's GET /api/orgs/:orgId/team-progress) for
// whichever organization this user manages. The old "Skills Gap Analysis"
// section compared team scores against a "target" that doesn't exist as real
// data anywhere (no target-setting feature) - replaced with a team-wide
// domain average instead of inventing target numbers.
export function EmployerDashboardView() {
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
    { icon: "👥", label: "Team Members", value: String(team.length), sub: employerAccess.org?.name || "", color: T.blue },
    { icon: "🎯", label: "Avg. Skill Score", value: avgScore === null ? "—" : String(avgScore), sub: `${assessedCount}/${team.length} assessed`, color: T.green },
    { icon: "📚", label: "Courses Completed", value: String(totalCoursesCompleted), sub: "across the team", color: T.amber },
    { icon: "🧭", label: "Avg. Path Progress", value: avgPathProgress === null ? "—" : `${avgPathProgress}%`, sub: "of generated roadmaps", color: T.violet },
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
          ⬇ Export Team Report
        </button>
      </div>

      <div className="fade-up s1 grid-4col" style={{ marginBottom: 28 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <GlassCard className="fade-up s2" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Team Leaderboard</div>
        {loading && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
        {!loading && leaderboard.length === 0 && (
          <div style={{ textAlign: "center", padding: "18px 0" }}>
            <div style={{ fontSize: 26, marginBottom: 6, opacity: 0.6 }}>👥</div>
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No members yet.</p>
          </div>
        )}
        {leaderboard.map((member, i) => (
          <LeaderRow
            key={member.userId}
            rank={i + 1}
            avatarColor={T.blue}
            avatarLabel={initials(member)}
            name={displayName(member)}
            meta={`${member.role}${member.learningPath?.targetRole ? ` · aiming for ${member.learningPath.targetRole}` : ""}`}
            tags={topDomains(member)}
            score={member.latestAssessment?.score ?? "—"}
            scoreLabel={member.latestAssessment ? member.latestAssessment.level : "Not assessed"}
            scoreColor={member.latestAssessment ? LEVEL_COLOR(member.latestAssessment.score) : T.muted}
            isLast={i === leaderboard.length - 1}
          />
        ))}
      </GlassCard>

      <GlassCard className="fade-up s3">
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Team Domain Performance</div>
        {weakestDomains.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No completed assessments yet.</p>}
        {weakestDomains.map((d) => (
          <DomainBar key={d.domain} label={d.domain} value={d.avg} color={d.avg < 40 ? T.rose : d.avg < 70 ? T.amber : T.green} />
        ))}
        <div style={{ fontSize: 11, color: T.faint, marginTop: 8 }}>Team average across everyone's most recent assessment, weakest domain first</div>
      </GlassCard>
    </div>
  );
}

const LEVEL_COLOR = (score) => (score >= 80 ? T.green : score >= 60 ? T.blue : score >= 40 ? T.amber : T.rose);
