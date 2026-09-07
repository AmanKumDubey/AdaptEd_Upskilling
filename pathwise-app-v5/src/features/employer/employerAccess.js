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
//
// Phase B14: a user can hold an elevated role in more than one organization
// (owner of one, admin of another). `org` used to be whichever elevated org
// came back first from the API with no way to change it - now the caller
// can persist a choice (localStorage, so it survives a refresh) and
// `elevatedOrgs` is exposed so AppSidebar.jsx can render a switcher.
// ─────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useMyOrganizations } from "../../hooks";

const ELEVATED_ROLES = ["owner", "admin", "hr"];
const SELECTED_ORG_KEY = "pathwise.employer.selectedOrgId";

// In demo mode there's no login/org system at all - the Employer views keep
// showing their static demo data unconditionally, exactly as before.
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

function loadSelectedOrgId() {
  try {
    return window.localStorage.getItem(SELECTED_ORG_KEY);
  } catch {
    return null;
  }
}

function saveSelectedOrgId(orgId) {
  try {
    if (orgId) window.localStorage.setItem(SELECTED_ORG_KEY, orgId);
    else window.localStorage.removeItem(SELECTED_ORG_KEY);
  } catch {
    // Ignore storage restrictions - falls back to "first elevated org" every load.
  }
}

// Returns { loading, hasAccess, org, elevatedOrgs, selectOrg, refetch }.
// `org` is the active organization (the stored choice if it's still one this
// user manages, else the first elevated org); `elevatedOrgs` is every
// organization where this user holds owner/admin/hr, for a switcher UI.
export function useEmployerAccess() {
  const { data: organizations, loading, refetch } = useMyOrganizations();
  const [selectedOrgId, setSelectedOrgId] = useState(loadSelectedOrgId);

  const elevatedOrgs = useMemo(
    () => (organizations || []).filter((candidate) => ELEVATED_ROLES.includes(candidate.role)),
    [organizations],
  );

  const org = useMemo(() => {
    if (selectedOrgId) {
      const match = elevatedOrgs.find((candidate) => candidate.id === selectedOrgId);
      if (match) return match;
    }
    return elevatedOrgs[0] || null;
  }, [elevatedOrgs, selectedOrgId]);

  const selectOrg = (orgId) => {
    setSelectedOrgId(orgId);
    saveSelectedOrgId(orgId);
  };

  if (!authEnabled) {
    return { loading: false, hasAccess: true, org: null, elevatedOrgs: [], selectOrg: () => {}, refetch: () => {} };
  }

  return { loading, hasAccess: Boolean(org), org, elevatedOrgs, selectOrg, refetch };
}
