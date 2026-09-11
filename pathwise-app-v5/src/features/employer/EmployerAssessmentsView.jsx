import { useOutletContext } from "react-router-dom";
import { Badge, GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { useOrgAssignments } from "../../hooks";
import { displayName, initials, useTeamProgress } from "./employerData";
import { NoOrgAccess } from "./NoOrgAccess";
import { AssignmentsPanel } from "./AssignmentsPanel";
import { BulkAssignPanel } from "./BulkAssignPanel";

// ─── Employer Assessments ────────────────────────────────────────────
// "Recent Results" shows each member's real most recent assessment;
// AssignmentsPanel/BulkAssignPanel cover single- and multi-member assignment
// and share one assignments list/refetch so assigning in either place keeps
// both panels in sync.
export function EmployerAssessmentsView() {
  const { employerAccess } = useOutletContext();
  const { data: team, loading } = useTeamProgress(employerAccess.org?.id);
  const { data: assignments, loading: assignmentsLoading, refetch: refetchAssignments } = useOrgAssignments(employerAccess.org?.id);

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
        <AssignmentsPanel orgId={employerAccess.org?.id} team={team} assignments={assignments} loading={assignmentsLoading} refetch={refetchAssignments} />
        <BulkAssignPanel orgId={employerAccess.org?.id} team={team} refetch={refetchAssignments} />
      </div>
    </div>
  );
}
