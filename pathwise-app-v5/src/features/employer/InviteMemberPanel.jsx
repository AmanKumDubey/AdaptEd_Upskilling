import { useState } from "react";
import { Badge, GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { useInviteMember, useOrgInvitations, useRevokeInvitation } from "../../hooks";

const INVITE_ROLES = ["member", "hr", "admin"];

// Phase B12: the backend has had a full invite flow since B5 (create
// invitation -> email with an accept link -> POST /api/invitations/accept)
// but nothing in the app ever called it - there was no way to add anyone to
// an organization except by hand in the database. This is the missing
// "send an invite" half; AcceptInvitationPage.jsx is the other half.
export function InviteMemberPanel({ orgId }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const { execute: invite, loading: inviting, error: inviteError } = useInviteMember();
  const { data: pending, loading: loadingInvites, refetch } = useOrgInvitations(orgId);
  const { execute: revoke, loading: revoking } = useRevokeInvitation();
  const [revokingId, setRevokingId] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim() || !orgId) return;
    await invite({ orgId, email: email.trim(), role });
    setEmail("");
    refetch();
  };

  const handleRevoke = async (invitationId) => {
    setRevokingId(invitationId);
    try {
      await revoke({ orgId, invitationId });
      refetch();
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <GlassCard className="fade-up" style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Invite a team member</div>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="colleague@company.com"
          style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 13.5 }}
        />
        <select value={role} onChange={(event) => setRole(event.target.value)} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", fontSize: 13.5 }}>
          {INVITE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="btn-primary" style={{ fontSize: 13 }} disabled={inviting || !email.trim()}>
          {inviting ? "Sending…" : "Send Invite"}
        </button>
      </form>
      {inviteError && <p style={{ fontSize: 12.5, color: T.rose, marginBottom: 10 }}>{inviteError}</p>}

      {!loadingInvites && pending?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Pending invitations</div>
          {pending.map((invitation) => (
            <div key={invitation.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(148,163,184,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: T.navy }}>{invitation.email}</span>
                <Badge variant="muted">{invitation.role}</Badge>
              </div>
              <button className="btn-ghost" style={{ fontSize: 11.5, padding: "5px 12px" }} disabled={revoking && revokingId === invitation.id} onClick={() => handleRevoke(invitation.id)}>
                {revoking && revokingId === invitation.id ? "Revoking…" : "Revoke"}
              </button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
