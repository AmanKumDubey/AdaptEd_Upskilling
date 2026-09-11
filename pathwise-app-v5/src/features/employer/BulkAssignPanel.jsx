import { useState } from "react";
import { GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { PERSONAS } from "../../SkillsAssessment";
import { useCreateAssignment } from "../../hooks";
import { displayName } from "./employerData";

// Assign one assessment track to several members at once. Reuses the same
// single-assignment endpoint AssignmentsPanel uses (POST .../assessment-
// assignments) - one request per selected member rather than a dedicated
// bulk endpoint, since the backend already handles duplicates/permissions
// per-request and this keeps the surface area small.
export function BulkAssignPanel({ orgId, team, refetch }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [personaId, setPersonaId] = useState("tech");
  const [dueAt, setDueAt] = useState("");
  const { execute: createAssignment } = useCreateAssignment();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const toggle = (userId) => {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const toggleAll = () => {
    setSelectedIds((prev) => (prev.length === team.length ? [] : team.map((member) => member.userId)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!orgId || selectedIds.length === 0) return;
    setSubmitting(true);
    setResult(null);
    // The <input type="date"> value is a plain "YYYY-MM-DD" string, but the
    // backend's Zod schema requires a full ISO 8601 date-time (z.string().datetime()).
    const dueAtIso = dueAt ? new Date(`${dueAt}T00:00:00.000Z`).toISOString() : undefined;
    const outcomes = await Promise.allSettled(
      selectedIds.map((userId) => createAssignment({ orgId, userId, personaId, dueAt: dueAtIso })),
    );
    const succeeded = outcomes.filter((o) => o.status === "fulfilled").length;
    setSubmitting(false);
    setResult({ succeeded, failed: outcomes.length - succeeded });
    setSelectedIds([]);
    refetch();
  };

  return (
    <GlassCard className="fade-up s3">
      <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Bulk Assign</div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <select value={personaId} onChange={(event) => setPersonaId(event.target.value)} style={{ flex: 1, minWidth: 130, padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 12.5 }}>
            {Object.values(PERSONAS).map((persona) => <option key={persona.id} value={persona.id}>{persona.title}</option>)}
          </select>
          <input
            type="date"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            aria-label="Due date (optional)"
            style={{ padding: "9px 10px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 12.5, fontFamily: "inherit" }}
          />
        </div>

        <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, marginBottom: 12 }}>
          {team.length === 0 && <p style={{ fontSize: 12.5, color: T.muted, padding: 12, margin: 0 }}>No members to assign yet.</p>}
          {team.length > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: "1px solid rgba(148,163,184,0.1)", fontSize: 12.5, fontWeight: 600, color: T.slate, cursor: "pointer" }}>
              <input type="checkbox" checked={selectedIds.length === team.length} onChange={toggleAll} />
              Select all ({team.length})
            </label>
          )}
          {team.map((member) => (
            <label key={member.userId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 12.5, color: T.navy, cursor: "pointer" }}>
              <input type="checkbox" checked={selectedIds.includes(member.userId)} onChange={() => toggle(member.userId)} />
              {displayName(member)}
            </label>
          ))}
        </div>

        <button type="submit" className="btn-primary" style={{ width: "100%", fontSize: 12.5 }} disabled={submitting || selectedIds.length === 0}>
          {submitting ? "Assigning…" : `Assign to ${selectedIds.length || ""} member${selectedIds.length === 1 ? "" : "s"}`.trim()}
        </button>
      </form>

      {result && (
        <p style={{ fontSize: 12, color: result.failed ? T.rose : T.green, marginTop: 10 }}>
          Assigned to {result.succeeded} member{result.succeeded === 1 ? "" : "s"}{result.failed ? `, ${result.failed} failed` : ""}.
        </p>
      )}
    </GlassCard>
  );
}
