import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { GlassCard } from "../../components/UIKit";
import { T } from "../../theme";
import { useAuth } from "../../hooks/useAuth";
import { useDepartments, useMemberSkillVerifications, useRemoveMember, useUpdateMemberDepartment, useUpdateMemberRole, useUnverifySkill, useVerifySkill } from "../../hooks";
import { displayName, initials, useTeamProgress } from "./employerData";
import { NoOrgAccess } from "./NoOrgAccess";
import { InviteMemberPanel } from "./InviteMemberPanel";
import { DepartmentsPanel } from "./DepartmentsPanel";

const MEMBER_ROLES = ["member", "hr", "admin", "owner"];

// ─── Employer Team ───────────────────────────────────────────────────
// The old "Skill Breakdown" section generated a fresh Math.random() bar for
// six hardcoded skill names on every render - not even backed by mock data,
// let alone real. Replaced with the selected member's actual most recent
// assessment domain scores.
export function EmployerTeamView() {
  const { employerAccess } = useOutletContext();
  const { user } = useAuth();
  const { data: team, loading, refetch } = useTeamProgress(employerAccess.org?.id);
  const { data: departments, refetch: refetchDepartments } = useDepartments(employerAccess.org?.id);
  const { execute: updateRole, loading: updatingRole, error: roleError } = useUpdateMemberRole();
  const { execute: updateDepartment, loading: updatingDepartment, error: departmentError } = useUpdateMemberDepartment();
  const { execute: removeMember, loading: removing, error: removeError } = useRemoveMember();
  const [selectedId, setSelectedId] = useState(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Phase B19: groups the roster by department (with a "No department"
  // bucket) so it reads like an org chart instead of a flat list once an org
  // actually has departments; `departmentFilter` narrows to one at a time.
  // With zero departments this collapses back to a single, header-less
  // group - the exact flat list this view always rendered before. Kept
  // above the `!hasAccess` early return below - like every other hook here -
  // so the hook count never changes between renders (e.g. right after
  // NoOrgAccess's create-org flow flips hasAccess from false to true).
  const groupedTeam = useMemo(() => {
    const filtered = departmentFilter
      ? team.filter((member) => (departmentFilter === "__none__" ? !member.departmentId : member.departmentId === departmentFilter))
      : team;

    if (departments.length === 0) {
      return [{ id: "__all__", name: null, members: filtered }];
    }

    const byDepartment = new Map();
    filtered.forEach((member) => {
      const key = member.departmentId || "__none__";
      if (!byDepartment.has(key)) byDepartment.set(key, []);
      byDepartment.get(key).push(member);
    });

    const groups = departments
      .filter((department) => byDepartment.has(department.id))
      .map((department) => ({ id: department.id, name: department.name, members: byDepartment.get(department.id) }));

    if (byDepartment.has("__none__")) {
      groups.push({ id: "__none__", name: "No department", members: byDepartment.get("__none__") });
    }

    return groups;
  }, [team, departments, departmentFilter]);

  // Derived above the `!hasAccess` early return, like every other hook here,
  // so `useMemberSkillVerifications` below always runs in the same order.
  const selected = team.find((m) => m.userId === selectedId) || null;
  const { data: memberVerifications, refetch: refetchVerifications } = useMemberSkillVerifications(employerAccess.org?.id, selected?.id);
  const { execute: verifySkillFor, loading: verifyingSkill } = useVerifySkill();
  const { execute: unverifySkillFor, loading: unverifyingSkill } = useUnverifySkill();
  const [verifyingDomain, setVerifyingDomain] = useState(null);

  if (!employerAccess.hasAccess) return <NoOrgAccess onCreated={employerAccess.refetch} />;

  const canManage = ["owner", "admin"].includes(employerAccess.org?.role);
  // Verifying a skill is allowed for hr too (matches the backend's
  // requireOrgRole('owner', 'admin', 'hr') on the skill-verifications routes) -
  // unlike role/department/remove below, which stay owner/admin only.
  const canVerifySkills = ["owner", "admin", "hr"].includes(employerAccess.org?.role);
  const isSelf = selected && user && selected.userId === user.id;
  const verifiedDomainNames = new Set((memberVerifications || []).map((v) => v.skillName.toLowerCase()));

  const handleToggleVerify = async (domain, alreadyVerified) => {
    setVerifyingDomain(domain);
    try {
      if (alreadyVerified) {
        await unverifySkillFor({ orgId: employerAccess.org.id, memberId: selected.id, skillName: domain });
      } else {
        await verifySkillFor({ orgId: employerAccess.org.id, memberId: selected.id, skillName: domain });
      }
      refetchVerifications();
    } finally {
      setVerifyingDomain(null);
    }
  };

  const selectMember = (userId) => {
    setSelectedId(userId);
    setConfirmingRemove(false);
  };

  const handleRoleChange = async (event) => {
    await updateRole({ orgId: employerAccess.org.id, memberId: selected.id, role: event.target.value });
    refetch();
  };

  const handleRemove = async () => {
    await removeMember({ orgId: employerAccess.org.id, memberId: selected.id });
    setSelectedId(null);
    setConfirmingRemove(false);
    refetch();
  };

  const handleDepartmentChange = async (event) => {
    await updateDepartment({ orgId: employerAccess.org.id, memberId: selected.id, departmentId: event.target.value || null });
    refetch();
  };

  const departmentName = (departmentId) => departments.find((d) => d.id === departmentId)?.name;

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Team Skills</h1>
        <p style={{ color: T.muted, fontSize: 14.5 }}>Individual assessment and learning progress</p>
      </div>

      <DepartmentsPanel orgId={employerAccess.org?.id} onChanged={refetchDepartments} />
      <InviteMemberPanel orgId={employerAccess.org?.id} departments={departments} />

      {loading && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
      {!loading && team.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No members yet.</p>}

      {team.length > 0 && (
        <div className={`team-split ${selected ? "" : "is-single"}`}>
          <div className="fade-up s1" style={{ display: "grid", gap: 10, alignContent: "start" }}>
            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", fontSize: 12.5, marginBottom: 2 }}
              >
                <option value="">All departments</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                <option value="__none__">No department</option>
              </select>
            )}

            {groupedTeam.every((group) => group.members.length === 0) && (
              <p style={{ fontSize: 13, color: T.muted }}>No members in this department.</p>
            )}

            {groupedTeam.map((group) => (
              <div key={group.id} style={{ display: "grid", gap: 10 }}>
                {group.name && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
                    {group.name} · {group.members.length}
                  </div>
                )}
                {group.members.map((member) => (
                  <GlassCard key={member.userId} style={{ padding: 16, cursor: "pointer", border: selected?.userId === member.userId ? `1px solid ${T.blue}30` : undefined, background: selected?.userId === member.userId ? "rgba(37,99,235,0.04)" : undefined }}
                    onClick={() => selectMember(member.userId)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${T.blue}18, ${T.blue}08)`, border: `1px solid ${T.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.blue, fontFamily: "'General Sans'" }}>{initials(member)}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{displayName(member)}</div><div style={{ fontSize: 11.5, color: T.muted, textTransform: "capitalize" }}>{member.role}{departmentName(member.departmentId) ? ` · ${departmentName(member.departmentId)}` : ""}</div></div>
                      <div className="stat-num" style={{ fontSize: 18, color: T.navy }}>{member.latestAssessment?.score ?? "—"}</div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            ))}
          </div>

          {selected && (
            <div className="fade-up s2">
              <GlassCard style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${T.blue}18, ${T.blue}08)`, border: `1px solid ${T.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: T.blue, fontFamily: "'General Sans'" }}>{initials(selected)}</div>
                  <div><div style={{ fontSize: 22, fontWeight: 700, color: T.navy, fontFamily: "'General Sans'" }}>{displayName(selected)}</div><div style={{ fontSize: 13.5, color: T.muted }}>{selected.email}</div></div>
                </div>
                <div className="grid-3col">
                  {[
                    { v: selected.assessmentsCompleted, l: "Assessments", c: T.blue },
                    { v: selected.coursesCompleted, l: "Courses done", c: T.green },
                    { v: selected.learningPath ? `${selected.learningPath.percentage}%` : "—", l: "Path progress", c: T.amber },
                  ].map((d, i) => (
                    <div key={i} style={{ textAlign: "center", padding: 14, background: "rgba(255,255,255,0.5)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.6)" }}>
                      <div className="stat-num" style={{ fontSize: 24, color: d.c }}>{d.v}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{d.l}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {canManage && !isSelf && (
                <GlassCard style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14, fontFamily: "'General Sans'" }}>Manage member</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <label style={{ fontSize: 12.5, color: T.muted }}>Role</label>
                    <select
                      value={selected.role}
                      onChange={handleRoleChange}
                      disabled={updatingRole}
                      style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", fontSize: 13, fontFamily: "inherit" }}
                    >
                      {MEMBER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>

                    {departments.length > 0 && (
                      <>
                        <label style={{ fontSize: 12.5, color: T.muted }}>Department</label>
                        <select
                          value={selected.departmentId || ""}
                          onChange={handleDepartmentChange}
                          disabled={updatingDepartment}
                          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)", fontSize: 13, fontFamily: "inherit" }}
                        >
                          <option value="">No department</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </>
                    )}

                    <div style={{ flex: 1 }} />

                    {!confirmingRemove && (
                      <button type="button" className="btn-ghost" style={{ fontSize: 12, color: T.rose }} onClick={() => setConfirmingRemove(true)}>
                        Remove from organization
                      </button>
                    )}
                    {confirmingRemove && (
                      <>
                        <span style={{ fontSize: 12.5, color: T.muted }}>Remove {displayName(selected)}?</span>
                        <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setConfirmingRemove(false)} disabled={removing}>Cancel</button>
                        <button type="button" className="btn-primary" style={{ fontSize: 12, background: T.rose }} onClick={handleRemove} disabled={removing}>
                          {removing ? "Removing…" : "Confirm remove"}
                        </button>
                      </>
                    )}
                  </div>
                  {(roleError || departmentError || removeError) && (
                    <p style={{ fontSize: 12, color: T.rose, marginTop: 10 }}>{roleError || departmentError || removeError}</p>
                  )}
                </GlassCard>
              )}

              <GlassCard>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>
                  {selected.latestAssessment ? "Domain Performance" : "No assessment yet"}
                </div>
                {!selected.latestAssessment && (
                  <p style={{ fontSize: 13, color: T.muted }}>This person hasn't completed a skills assessment yet.</p>
                )}
                {(selected.latestAssessment?.domainScores || []).map((d) => {
                  const col = d.score >= 70 ? T.green : d.score >= 40 ? T.amber : T.rose;
                  const isVerified = verifiedDomainNames.has(d.domain.toLowerCase());
                  const isBusy = verifyingDomain === d.domain && (verifyingSkill || unverifyingSkill);
                  return (
                    <div key={d.domain} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                      <div className="domain-label" style={{ fontSize: 13, fontWeight: 500, color: T.slate }}>{d.domain}</div>
                      <div style={{ flex: 1, minWidth: 60, height: 6, background: "rgba(148,163,184,0.08)", borderRadius: 3 }}>
                        <div style={{ height: "100%", width: `${d.score}%`, background: col, borderRadius: 3, transition: "width 0.8s" }} />
                      </div>
                      <span className="stat-num" style={{ fontSize: 12, color: col, width: 36, textAlign: "right" }}>{d.score}%</span>
                      {canVerifySkills && !isSelf ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: 10.5, padding: "4px 9px", color: isVerified ? T.green : T.muted }}
                          disabled={isBusy}
                          onClick={() => handleToggleVerify(d.domain, isVerified)}
                        >
                          {isBusy ? "…" : isVerified ? "Verified ✓" : "Verify"}
                        </button>
                      ) : (
                        isVerified && <span style={{ fontSize: 10.5, fontWeight: 600, color: T.green }}>Verified ✓</span>
                      )}
                    </div>
                  );
                })}
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
