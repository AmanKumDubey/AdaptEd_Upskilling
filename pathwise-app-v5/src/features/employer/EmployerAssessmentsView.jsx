import { useOutletContext } from "react-router-dom";
import { Badge, GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { authEnabled } from "./employerAccess";
import { displayName, initials, useTeamProgress } from "./employerData";
import { NoOrgAccess } from "./NoOrgAccess";
import { AssignmentsPanel } from "./AssignmentsPanel";

// ─── Employer Assessments ────────────────────────────────────────────
export function EmployerAssessmentsView() {
  return authEnabled ? <RealEmployerAssessmentsView /> : <DemoEmployerAssessmentsView />;
}

function ComingSoonCard({ title }) {
  return (
    <GlassCard style={{ padding: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: "'General Sans'" }}>{title}</div>
      <p style={{ fontSize: 12.5, color: T.muted, margin: 0 }}>
        Assigning and scheduling assessments isn't built yet - this needs a real assignment/target-setting
        feature on top of what exists today.
      </p>
    </GlassCard>
  );
}

// Phase B10: "Recent Results" now shows each member's real most recent
// assessment. Phase B16 adds real single-member assignment ("Pending
// Assignments"); "Quick Actions" (bulk-assign, scheduling, target-setting)
// still implies features that don't exist anywhere in the backend - left as
// an honest "not built yet" note rather than faking data for them.
function RealEmployerAssessmentsView() {
  const { employerAccess } = useOutletContext();
  const { data: team, loading } = useTeamProgress(employerAccess.org?.id);

  if (!employerAccess.hasAccess) return <NoOrgAccess onCreated={employerAccess.refetch} />;

  const results = team
    .filter((m) => m.latestAssessment)
    .sort((a, b) => new Date(b.latestAssessment.completedAt) - new Date(a.latestAssessment.completedAt));

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <div><h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Assessment Management</h1><p style={{ color: T.muted, fontSize: 14.5 }}>Your team's real assessment history</p></div>
      </div>

      <GlassCard className="fade-up s1" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Recent Results</div>
        {loading && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
        {!loading && results.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No completed assessments yet.</p>}
        {results.length > 0 && (
          <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Employee", "Track", "Score", "Date", "Level"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(148,163,184,0.1)", fontFamily: "'General Sans'" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {results.map((member) => (
                <tr key={member.userId} style={{ borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(148,163,184,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.muted }}>{initials(member)}</div>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: T.navy }}>{displayName(member)}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 13, color: T.slate }}>{member.latestAssessment.personaId}</td>
                  <td style={{ padding: "14px 16px" }}><span className="stat-num" style={{ color: member.latestAssessment.score >= 70 ? T.green : member.latestAssessment.score >= 40 ? "#D97706" : T.rose }}>{member.latestAssessment.score}%</span></td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: T.muted }}>{new Date(member.latestAssessment.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                  <td style={{ padding: "14px 16px" }}><Badge variant={member.latestAssessment.score >= 70 ? "green" : member.latestAssessment.score >= 40 ? "amber" : "rose"}>{member.latestAssessment.level}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </GlassCard>

      <div className="grid-2col">
        <AssignmentsPanel orgId={employerAccess.org?.id} team={team} />
        <ComingSoonCard title="Quick Actions" />
      </div>
    </div>
  );
}

function DemoEmployerAssessmentsView() {
  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div><h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Assessment Management</h1><p style={{ color: T.muted, fontSize: 14.5 }}>Assign, track, and review team assessments</p></div>
          <button className="btn-primary">+ Create Assessment</button>
        </div>
      </div>

      <GlassCard className="fade-up s1" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Recent Results</div>
        <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>{["Employee","Assessment","Score","Date","Status"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid rgba(148,163,184,0.1)", fontFamily: "'General Sans'" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {[
              { emp: "Priya Patel", av: "PP", assess: "Python Advanced", score: 94, date: "Feb 10", pass: true },
              { emp: "Sarah Chen", av: "SC", assess: "ML Fundamentals", score: 89, date: "Feb 9", pass: true },
              { emp: "Marcus Rivera", av: "MR", assess: "React Advanced", score: 82, date: "Feb 8", pass: true },
              { emp: "James Wu", av: "JW", assess: "AWS Architect", score: 68, date: "Feb 7", pass: false },
              { emp: "Elena Volkov", av: "EV", assess: "Product Strategy", score: 91, date: "Feb 6", pass: true },
            ].map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(148,163,184,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.muted }}>{r.av}</div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: T.navy }}>{r.emp}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 13, color: T.slate }}>{r.assess}</td>
                <td style={{ padding: "14px 16px" }}><span className="stat-num" style={{ color: r.score >= 80 ? T.green : r.score >= 70 ? "#D97706" : T.rose }}>{r.score}%</span></td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: T.muted }}>{r.date}</td>
                <td style={{ padding: "14px 16px" }}><Badge variant={r.pass ? "green" : "rose"}>{r.pass ? "Passed" : "Needs Review"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </GlassCard>

      <div className="grid-2col">
        <GlassCard className="fade-up s2">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Pending Assignments</div>
          {[{ emp: "James Wu", a: "Docker & Kubernetes", due: "Feb 15" }, { emp: "Marcus Rivera", a: "System Design", due: "Feb 18" }, { emp: "Elena Volkov", a: "Data Analytics", due: "Feb 20" }].map((x, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i < 2 ? "1px solid rgba(148,163,184,0.08)" : "none" }}>
              <div><div style={{ fontSize: 13.5, fontWeight: 600, color: T.navy }}>{x.emp}</div><div style={{ fontSize: 11.5, color: T.muted }}>{x.a}</div></div>
              <Badge variant="amber">Due {x.due}</Badge>
            </div>
          ))}
        </GlassCard>
        <GlassCard className="fade-up s3">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {["Assign Bulk Assessment", "Export Team Report", "Set Skill Targets", "Schedule Reviews"].map(a => (
              <button key={a} className="btn-ghost" style={{ textAlign: "left", padding: 15, display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span>{a}</span><span style={{ color: T.faint }}>→</span>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
