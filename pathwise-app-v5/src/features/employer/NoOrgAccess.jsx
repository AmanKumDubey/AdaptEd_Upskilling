import { useState } from "react";
import { GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { useCreateOrganization } from "../../hooks";

// Shared by EmployerDashboardView/EmployerTeamView/EmployerAssessmentsView
// (Phase B12: previously each view defined its own copy of this component
// with no way out of the empty state - creating an organization had a real
// backend endpoint since B5 but no UI anywhere in the app). Creating one
// makes the caller its owner (adapted-backend's createOrganization), which
// is exactly the access this whole section is gated on.
export function NoOrgAccess({ onCreated }) {
  const [name, setName] = useState("");
  const { execute: createOrg, loading, error } = useCreateOrganization();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    await createOrg({ name: name.trim() });
    setName("");
    onCreated?.();
  };

  return (
    <GlassCard style={{ padding: 48, textAlign: "center", maxWidth: 480, margin: "60px auto" }}>
      <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>⬡</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>No organization access</div>
      <p style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.55, marginBottom: 22 }}>
        You need an owner, admin, or HR role in an organization to view team data.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Organization name"
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 13.5, minWidth: 220 }}
        />
        <button className="btn-primary" style={{ fontSize: 13 }} disabled={loading || !name.trim()}>
          {loading ? "Creating…" : "Create Organization"}
        </button>
      </form>
      {error && <p style={{ fontSize: 12.5, color: T.rose, marginTop: 12 }}>{error}</p>}
      <p style={{ fontSize: 11.5, color: T.faint, marginTop: 16 }}>Creating one makes you its owner.</p>
    </GlassCard>
  );
}
