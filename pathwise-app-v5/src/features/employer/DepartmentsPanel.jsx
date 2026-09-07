import { useState } from "react";
import { GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { useCreateDepartment, useDepartments } from "../../hooks";

// Phase B15: the backend has had create/list department endpoints since B5
// (org creation itself), but nothing in the app ever surfaced them - this is
// the first UI for departments. Assigning a member to one happens from their
// row in the roster (see EmployerTeamView.jsx's "Manage member" card).
export function DepartmentsPanel({ orgId, onChanged }) {
  const [name, setName] = useState("");
  const { data: departments, loading, refetch } = useDepartments(orgId);
  const { execute: createDepartment, loading: creating, error } = useCreateDepartment();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !orgId) return;
    await createDepartment({ orgId, name: name.trim() });
    setName("");
    refetch();
    onChanged?.();
  };

  return (
    <GlassCard className="fade-up" style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Departments</div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Engineering"
          style={{ flex: 1, minWidth: 160, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 13.5 }}
        />
        <button type="submit" className="btn-primary" style={{ fontSize: 13 }} disabled={creating || !name.trim()}>
          {creating ? "Adding…" : "Add Department"}
        </button>
      </form>
      {error && <p style={{ fontSize: 12.5, color: T.rose, marginBottom: 10 }}>{error}</p>}

      {!loading && departments.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No departments yet.</p>}
      {departments.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {departments.map((d) => (
            <span key={d.id} style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(148,163,184,0.08)", fontSize: 12.5, color: T.slate, fontWeight: 500 }}>{d.name}</span>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
