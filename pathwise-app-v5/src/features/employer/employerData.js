// ─────────────────────────────────────────────────────────────────────
// src/features/employer/employerData.js
// ─────────────────────────────────────────────────────────────────────
// Phase B10: real per-org team progress (adapted-backend's GET
// /api/orgs/:orgId/team-progress), plus the shared aggregation helpers the
// dashboard/team views both need (average score, domain rollups, etc.) so
// that logic lives in one place instead of two nearly-identical copies.
// ─────────────────────────────────────────────────────────────────────

import { useApi } from "../../hooks/useApi";
import { organizations as organizationsApi } from "../../api/endpoints";

export function useTeamProgress(orgId) {
  return useApi(() => organizationsApi.getTeamProgress(orgId), {
    initialData: [],
    deps: [orgId],
    enabled: Boolean(orgId),
  });
}

export function displayName(member) {
  const full = `${member.firstName || ""} ${member.lastName || ""}`.trim();
  return full || member.username || member.email;
}

export function initials(member) {
  const name = displayName(member);
  return name.slice(0, 2).toUpperCase();
}

// Top domains from a member's most recent assessment - used as a stand-in
// for "skill tags" (there's no separate per-member skills-wallet endpoint at
// the org level; this is real data, just a proxy rather than the exact same
// merge SkillsWalletView.jsx does for a single logged-in user).
export function topDomains(member, count = 2) {
  const scores = member.latestAssessment?.domainScores || [];
  return [...scores].sort((a, b) => b.score - a.score).slice(0, count).map((d) => d.domain);
}

export function averageScore(team) {
  const withScores = team.filter((m) => m.latestAssessment);
  if (!withScores.length) return null;
  return Math.round(withScores.reduce((sum, m) => sum + m.latestAssessment.score, 0) / withScores.length);
}

export function averagePathProgress(team) {
  const withPaths = team.filter((m) => m.learningPath);
  if (!withPaths.length) return null;
  return Math.round(withPaths.reduce((sum, m) => sum + m.learningPath.percentage, 0) / withPaths.length);
}

// Phase B21: real CSV export for "Export Team Report" - replaces what used
// to be one of the demo mode's Quick Actions button labels with no backing
// action at all in real mode. Built client-side from the same `team` array
// every Employer view already fetches, so no new backend endpoint needed.
export function teamToCSV(team) {
  const headers = ["Name", "Email", "Role", "Assessment Track", "Score", "Level", "Assessment Date", "Courses Completed", "Learning Path Progress"];
  const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = team.map((member) => [
    displayName(member),
    member.email,
    member.role,
    member.latestAssessment?.personaId || "",
    member.latestAssessment?.score ?? "",
    member.latestAssessment?.level || "",
    member.latestAssessment ? new Date(member.latestAssessment.completedAt).toLocaleDateString() : "",
    member.coursesCompleted,
    member.learningPath ? `${member.learningPath.percentage}%` : "",
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
}

export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Team-wide domain averages, weakest first (most actionable order for a
// "where does the team need investment" view).
export function domainRollup(team, limit = 6) {
  const totals = new Map();
  team.forEach((member) => {
    (member.latestAssessment?.domainScores || []).forEach(({ domain, score }) => {
      const entry = totals.get(domain) || { sum: 0, count: 0 };
      entry.sum += score;
      entry.count += 1;
      totals.set(domain, entry);
    });
  });
  return Array.from(totals.entries())
    .map(([domain, { sum, count }]) => ({ domain, avg: Math.round(sum / count) }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, limit);
}
