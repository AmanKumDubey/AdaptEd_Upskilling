// ─────────────────────────────────────────────────────────────────────
// src/views/DashboardView.jsx — REFACTORED example
// ─────────────────────────────────────────────────────────────────────
// This shows exactly how to convert a hardcoded view to use hooks.
// Follow this pattern for every other view (CoursesView, SkillsWalletView, etc.)
//
//   BEFORE (hardcoded):  const stats = { skillsAcquired: 12, ... };
//   AFTER  (live data):  const { data, loading, error, refetch } = useDashboard();
// ─────────────────────────────────────────────────────────────────────

import { useDashboard, useEnrolledCourses, useAssessments } from "../hooks";
import { useAuth } from "../hooks/useAuth";
import { DataGuard } from "../components/LoadingAndError";
import { GlassCard, ProgressRing, Badge } from "../components/UIKit";
import { T } from "../theme";

export function DashboardView({ setCurrentView }) {
  const { user } = useAuth();

  // ─── Fetch all dashboard data in parallel ────────────────────────
  const dashQuery = useDashboard();
  const coursesQuery = useEnrolledCourses();
  const assessQuery = useAssessments();

  // Combine loading states
  const loading = dashQuery.loading || coursesQuery.loading || assessQuery.loading;
  const error = dashQuery.error || coursesQuery.error || assessQuery.error;
  const refetch = () => {
    dashQuery.refetch();
    coursesQuery.refetch();
    assessQuery.refetch();
  };

  return (
    <DataGuard loading={loading} error={error} data={dashQuery.data} onRetry={refetch}>
      {(dashboard) => {
        // Destructure what the API returns
        const { progress, streak, stats, skillsSnapshot } = dashboard;
        const enrolledCourses = coursesQuery.data || [];
        const assessments = assessQuery.data || [];

        return (
          <div>
            {/* ─── Header ─── */}
            <div className="fade-up" style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1 style={{
                    fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700,
                    letterSpacing: "-0.03em", marginBottom: 6,
                  }}>
                    Good morning, {user?.name?.split(" ")[0] || "there"} ✦
                  </h1>
                  <p style={{ color: T.muted, fontSize: 14.5 }}>
                    You're <span style={{ color: T.blue, fontWeight: 700 }}>{progress}%</span> of
                    the way to <span style={{ color: T.navy, fontWeight: 600 }}>{user?.targetRole}</span>
                  </p>
                </div>
                {streak > 0 && (
                  <GlassCard hover={false} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🔥</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.slate }}>{streak} day streak</span>
                  </GlassCard>
                )}
              </div>
            </div>

            {/* ─── Progress Hero Card ─── */}
            <GlassCard className="fade-up s1" style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(139,92,246,0.03), rgba(255,255,255,0.6))",
              border: "1px solid rgba(37,99,235,0.12)", marginBottom: 20, padding: 28,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>
                    Path to {user?.targetRole}
                  </div>
                  <div style={{ display: "flex", gap: 28, marginBottom: 20 }}>
                    {[
                      { v: stats.skillsAcquired, l: "Skills Acquired" },
                      { v: stats.coursesDone, l: "Courses Done" },
                      { v: stats.assessments, l: "Assessments" },
                      { v: stats.learningTime, l: "Learning Time" },
                    ].map((d) => (
                      <div key={d.l}>
                        <div className="stat-num" style={{ fontSize: 28, color: T.navy }}>{d.v}</div>
                        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{d.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 7, background: "rgba(148,163,184,0.1)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${progress}%`,
                      background: `linear-gradient(90deg, ${T.blue}, #8B5CF6)`,
                      borderRadius: 4, transition: "width 1.6s cubic-bezier(0.16,1,0.3,1)",
                    }} />
                  </div>
                </div>
                <div style={{ marginLeft: 36, position: "relative" }}>
                  <ProgressRing progress={progress} size={96} stroke={7} color={T.blue} />
                  <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)", textAlign: "center",
                  }}>
                    <div className="stat-num" style={{ fontSize: 24, color: T.blue }}>{progress}%</div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              {/* ─── Continue Learning ─── */}
              <GlassCard className="fade-up s2">
                <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>
                  Continue Learning
                </div>
                {enrolledCourses.slice(0, 2).map((course, i) => (
                  <div key={course.id} style={{
                    display: "flex", gap: 14, padding: "14px 0",
                    borderBottom: i === 0 ? "1px solid rgba(148,163,184,0.1)" : "none",
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: `linear-gradient(135deg, ${course.accent || T.blue}12, ${course.accent || T.blue}05)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 700, flexShrink: 0,
                      border: `1px solid ${course.accent || T.blue}20`,
                      color: course.accent || T.blue, fontFamily: "'General Sans'",
                    }}>
                      {course.providerLogo || course.provider?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13.5, fontWeight: 600, marginBottom: 4, color: T.navy,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{course.title}</div>
                      <div style={{ fontSize: 11.5, color: T.muted }}>
                        {course.provider} · {course.duration}
                      </div>
                      <div style={{ height: 4, background: "rgba(148,163,184,0.08)", borderRadius: 2, marginTop: 8 }}>
                        <div style={{
                          height: "100%", width: `${course.progress || 0}%`,
                          background: course.accent || T.blue, borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button className="btn-ghost" style={{ width: "100%", marginTop: 14, fontSize: 12.5 }}
                  onClick={() => setCurrentView("courses")}>
                  View All Courses
                </button>
              </GlassCard>

              {/* ─── Assessments ─── */}
              <GlassCard className="fade-up s3">
                <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>
                  Assessments
                </div>
                {assessments.slice(0, 3).map((a, i) => (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
                    borderBottom: i < 2 ? "1px solid rgba(148,163,184,0.08)" : "none",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 15,
                      background: a.status === "completed" ? "rgba(16,185,129,0.08)" : "rgba(148,163,184,0.06)",
                      border: `1px solid ${a.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.1)"}`,
                      color: a.status === "completed" ? T.green : T.faint,
                    }}>
                      {a.status === "completed" ? "✓" : "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, color: T.navy }}>{a.skill}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{a.questions} questions · {a.duration}</div>
                    </div>
                    {a.score !== null ? (
                      <div className="stat-num" style={{ fontSize: 17, color: a.score >= 80 ? T.green : "#D97706" }}>
                        {a.score}%
                      </div>
                    ) : (
                      <Badge variant={a.status === "available" ? "amber" : "muted"}>
                        {a.status === "available" ? "Take Now" : "Locked"}
                      </Badge>
                    )}
                  </div>
                ))}
                <button className="btn-ghost" style={{ width: "100%", marginTop: 14, fontSize: 12.5 }}
                  onClick={() => setCurrentView("assess")}>
                  Start Assessment →
                </button>
              </GlassCard>
            </div>

            {/* ─── Skills Snapshot ─── */}
            <GlassCard className="fade-up s4">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'General Sans'" }}>
                  Skills Snapshot
                </div>
                <button className="btn-ghost" style={{ fontSize: 11.5, padding: "6px 14px" }}
                  onClick={() => setCurrentView("wallet")}>View Wallet →</button>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {(skillsSnapshot || []).map((s) => (
                  <div key={s.name} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                    borderRadius: 14, background: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.7)", backdropFilter: "blur(8px)",
                  }}>
                    <div style={{ width: 34, height: 34, position: "relative" }}>
                      <ProgressRing progress={s.level} size={34} stroke={3}
                        color={s.level >= 80 ? T.green : s.level >= 60 ? T.blue : T.amber} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.navy }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>
                        {s.level >= 80 ? "Expert" : s.level >= 60 ? "Advanced" : "Intermediate"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        );
      }}
    </DataGuard>
  );
}
