import { useState } from "react";
import { Badge, GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { PERSONAS } from "../../SkillsAssessment";
import { useCreateAssignment, useOrgAssignments, useRevokeAssignment } from "../../hooks";
import { displayName } from "./employerData";

// Phase B16: replaces the honest "not built yet" placeholder that used to sit
// here - an owner/admin/hr can now assign a specific assessment track to a
// team member. "Completed" is derived server-side (a real result dated after
// the assignment), not a separate flag this UI has to keep in sync.
export function AssignmentsPanel({ orgId, team }) {
  const [userId, setUserId] = useState("");
  const [personaId, setPersonaId] = useState("tech");
  const { data: assignments, loading, refetch } = useOrgAssignments(orgId);
  const { execute: createAssignment, loading: assigning, error } = useCreateAssignment();
  const { execute: revoke, loading: revoking } = useRevokeAssignment();
  const [revokingId, setRevokingId] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userId || !orgId) return;
    await createAssignment({ orgId, userId, personaId });
    refetch();
  };

  const handleRevoke = async (assignmentId) => {
    setRevokingId(assignmentId);
    try {
      await revoke({ orgId, assignmentId });
      refetch();
    } finally {
      setRevokingId(null);
    }
  };

  const pending = assignments.filter((a) => !a.completed);

  return (
    <GlassCard className="fade-up s2">
      <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Pending Assignments</div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <select value={userId} onChange={(event) => setUserId(event.target.value)} style={{ flex: 1, minWidth: 130, padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 12.5 }}>
          <option value="">Select member…</option>
          {team.map((member) => <option key={member.userId} value={member.userId}>{displayName(member)}</option>)}
        </select>
        <select value={personaId} onChange={(event) => setPersonaId(event.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 12.5 }}>
          {Object.values(PERSONAS).map((persona) => <option key={persona.id} value={persona.id}>{persona.title}</option>)}
        </select>
        <button type="submit" className="btn-primary" style={{ fontSize: 12 }} disabled={assigning || !userId}>
          {assigning ? "Assigning…" : "Assign"}
        </button>
      </form>
      {error && <p style={{ fontSize: 12, color: T.rose, marginBottom: 10 }}>{error}</p>}

      {!loading && pending.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No pending assignments.</p>}
      {pending.map((assignment, i) => (
        <div key={assignment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < pending.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.navy }}>{displayName(assignment)}</div>
            <div style={{ fontSize: 11.5, color: T.muted }}>{PERSONAS[assignment.personaId]?.title || assignment.personaId}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge variant="amber">Pending</Badge>
            <button type="button" className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }} disabled={revoking && revokingId === assignment.id} onClick={() => handleRevoke(assignment.id)}>
              {revoking && revokingId === assignment.id ? "…" : "Cancel"}
            </button>
          </div>
        </div>
      ))}
    </GlassCard>
  );
}
