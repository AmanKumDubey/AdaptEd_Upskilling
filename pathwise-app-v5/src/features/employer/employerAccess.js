// ─────────────────────────────────────────────────────────────────────
// src/features/employer/employerAccess.js
// ─────────────────────────────────────────────────────────────────────
// Phase B10: the Employer views (dashboard/team/reports) used to be reachable
// by flipping a plain UI toggle - any logged-in user, regardless of whether
// they belonged to any organization, could view them (confirmed by reading
// AppSidebar.jsx/PathwisePlatform.jsx: employerMode was derived purely from
// the URL, with no permission check anywhere in the chain). Real employer
// data is now per-organization and owner/admin/hr-only server-side (see
// adapted-backend's GET /api/orgs/:orgId/team-progress) - this hook is the
// single place that decides whether the CURRENT user should see the
// Employer views/toggle at all, so the UI actually reflects real access
// instead of always showing it.
// ─────────────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { useMyOrganizations } from "../../hooks";

const ELEVATED_ROLES = ["owner", "admin", "hr"];

// In demo mode there's no login/org system at all - the Employer views keep
// showing their static demo data unconditionally, exactly as before.
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

// Returns { loading, hasAccess, org } - `org` is the first organization
// where this user holds an elevated role (owner/admin/hr), or null. A user
// in multiple such organizations sees whichever comes first from the API;
// picking which one to manage isn't built yet (this is a real
// simplification, not a bug - flagged here for whoever tackles it next).
export function useEmployerAccess() {
  const { data: organizations, loading } = useMyOrganizations();

  const org = useMemo(
    () => (organizations || []).find((candidate) => ELEVATED_ROLES.includes(candidate.role)) || null,
    [organizations],
  );

  if (!authEnabled) return { loading: false, hasAccess: true, org: null };

  return { loading, hasAccess: Boolean(org), org };
}
