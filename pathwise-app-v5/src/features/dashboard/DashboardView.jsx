import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, GlassCard, ProgressRing } from "../../components/UIKit";
import { ASSESSMENTS, COURSES } from "../../data/mockData";
import { PERSONAS } from "../../SkillsAssessment";
import { T } from "../../theme";
import { authEnabled, loadHistory, loadLatestResult } from "../assessment/assessmentBackend";
import { getPlatformStyle } from "../courses/courseDisplay";
import { loadPath } from "../learning-path/learningPathBackend";
import { loadProfile } from "../onboarding/onboardingBackend";
import { useSkillsWallet } from "../skills/skillsEngine";
import { useAssessmentResult, useLearningPath, useProfile } from "../../state/PathwiseDataContext";
import { useMyCoursesDashboard } from "../../hooks";

const LEVEL_COLOR = (score) => (score >= 80 ? T.green : score >= 60 ? T.blue : score >= 40 ? T.amber : T.rose);

// ─── Dashboard ───────────────────────────────────────────────────────
// Split into two full components (rather than branching mid-component) so
// neither side's hooks can ever collide - authEnabled is fixed at build
// time, so which one renders never changes across a session anyway (same
// pattern as AssessmentsView.jsx/EmployerDashboardView.jsx).
export function DashboardView(props) {
  return authEnabled ? <RealDashboardView {...props} /> : <DemoDashboardView {...props} />;
}

// Phase B11: real learners' path %, stats, continue-learning, recent
// assessments, and skill snapshot - composed entirely from data other
// features already fetch (Learning Path context, useMyCoursesDashboard,
// useSkillsWallet, assessment history), rather than a new dashboard-specific
// backend endpoint. There's no real "streak" concept anywhere in the
// backend, so unlike the demo view this omits the streak badge instead of
// fabricating one.
function RealDashboardView({ setCurrentView }) {
  const [profile, setProfile] = useProfile();
  const [learningPath, setLearningPath] = useLearningPath();
  const [, setAssessmentResult] = useAssessmentResult();
  const coursesQuery = useMyCoursesDashboard();
  const skillsWallet = useSkillsWallet();
  const [history, setHistory] = useState(null);
  const navigate = useNavigate();

  // The profile/learningPath/assessmentResult context only hydrates from
  // localStorage on mount (PathwiseDataContext.jsx) - ProfilePage.jsx/
  // LearningPathView.jsx/AssessmentResultsPage.jsx each reconcile their own
  // slice against the server the first time a learner visits them, but the
  // Dashboard is usually the very first page a learner lands on, so it needs
  // the same reconcile-on-mount here too (otherwise a fresh login/browser
  // shows stale or missing data even when the server has it).
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadProfile(), loadPath(), loadLatestResult(), loadHistory()]).then(([fetchedProfile, path, result, results]) => {
      if (cancelled) return;
      setProfile(fetchedProfile || null);
      setLearningPath(path || null);
      setAssessmentResult(result || null);
      setHistory(results);
    });
    return () => { cancelled = true; };
  }, [setProfile, setLearningPath, setAssessmentResult]);

  const learnerName = profile?.firstName?.trim();
  const targetRole = learningPath?.targetRole || profile?.targetRole;

  const allModules = learningPath ? (learningPath.stages || []).flatMap((stage) => stage.modules) : [];
  const completedModules = learningPath ? (learningPath.completedModuleIds || []).length : 0;
  const pathPercent = allModules.length ? Math.round((completedModules / allModules.length) * 100) : 0;

  const continueLearning = coursesQuery.data?.continueLearning || [];
  const completedCourses = coursesQuery.data?.completed || [];
  const learningHours = Math.round(
    [...continueLearning, ...completedCourses].reduce((sum, uc) => sum + (uc.course?.durationHours || 0), 0)
  );
  const recentAssessments = (history || []).slice(0, 3);
  const topSkills = skillsWallet.skills.slice(0, 6);

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Good morning{learnerName ? `, ${learnerName}` : ""} ✦</h1>
        {targetRole && (
          <p style={{ color: T.muted, fontSize: 14.5 }}>You're <span style={{ color: T.blue, fontWeight: 700 }}>{pathPercent}%</span> of the way to <span style={{ color: T.navy, fontWeight: 600 }}>{targetRole}</span></p>
        )}
      </div>

      {/* Hero Progress */}
      {learningPath ? (
        <GlassCard className="fade-up s1" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(139,92,246,0.03), rgba(255,255,255,0.6))", border: "1px solid rgba(37,99,235,0.12)", marginBottom: 20, padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Path to {targetRole}</div>
              <div style={{ display: "flex", gap: 28, marginBottom: 20 }}>
                {[
                  { v: String(skillsWallet.stats.totalSkills), l: "Skills Acquired" },
                  { v: String(completedCourses.length), l: "Courses Done" },
                  { v: String((history || []).length), l: "Assessments" },
                  { v: `${learningHours}h`, l: "Learning Time" },
                ].map(d => (
                  <div key={d.l}><div className="stat-num" style={{ fontSize: 28, color: T.navy }}>{d.v}</div><div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{d.l}</div></div>
                ))}
              </div>
              <div style={{ height: 7, background: "rgba(148,163,184,0.1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pathPercent}%`, background: `linear-gradient(90deg, ${T.blue}, #8B5CF6)`, borderRadius: 4, transition: "width 1.6s cubic-bezier(0.16,1,0.3,1)" }} />
              </div>
            </div>
            <div style={{ marginLeft: 36, position: "relative" }}>
              <ProgressRing progress={pathPercent} size={96} stroke={7} color={T.blue} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                <div className="stat-num" style={{ fontSize: 24, color: T.blue }}>{pathPercent}%</div>
              </div>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="fade-up s1" style={{ marginBottom: 20, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 14.5, color: T.muted, marginBottom: 14 }}>You don't have a learning path yet.</div>
          <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setCurrentView("path")}>Build my learning path →</button>
        </GlassCard>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Continue Learning */}
        <GlassCard className="fade-up s2">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Continue Learning</div>
          {coursesQuery.loading && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
          {!coursesQuery.loading && continueLearning.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No courses in progress yet.</p>}
          {continueLearning.slice(0, 2).map((uc, i) => {
            const { mark, accent } = getPlatformStyle(uc.course?.platform);
            return (
              <div key={uc.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i === 0 && continueLearning.length > 1 ? `1px solid rgba(148,163,184,0.1)` : "none" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${accent}12, ${accent}05)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0, border: `1px solid ${accent}20`, color: accent, fontFamily: "'General Sans'" }}>
                  {mark}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.navy }}>{uc.course?.title}</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>{uc.course?.durationHours ? `${uc.course.durationHours}h` : ""}</div>
                </div>
              </div>
            );
          })}
          <button className="btn-ghost" style={{ width: "100%", marginTop: 14, fontSize: 12.5 }} onClick={() => setCurrentView("courses")}>View All Courses</button>
        </GlassCard>

        {/* Assessments */}
        <GlassCard className="fade-up s3">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Assessments</div>
          {history === null && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
          {history?.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>No assessments completed yet.</p>}
          {recentAssessments.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < recentAssessments.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none", cursor: "pointer" }}
              onClick={() => navigate(`/assessment/results/${a.id}`)}>
              <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", color: T.green }}>✓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, color: T.navy }}>{PERSONAS[a.personaId]?.title || a.personaId}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{a.level}</div>
              </div>
              <div className="stat-num" style={{ fontSize: 17, color: LEVEL_COLOR(a.score) }}>{a.score}%</div>
            </div>
          ))}
          <button className="btn-primary" style={{ width: "100%", marginTop: 14, fontSize: 12.5 }} onClick={() => setCurrentView("assess")}>Start Assessment →</button>
        </GlassCard>
      </div>

      {/* Skills */}
      <GlassCard className="fade-up s4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'General Sans'" }}>Skills Snapshot</div>
          <button className="btn-ghost" style={{ fontSize: 11.5, padding: "6px 14px" }} onClick={() => setCurrentView("wallet")}>View Wallet →</button>
        </div>
        {topSkills.length === 0 && <p style={{ fontSize: 13, color: T.muted }}>Complete an assessment or a course to build your skill profile.</p>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {topSkills.map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
              <div style={{ width: 34, height: 34, position: "relative" }}>
                <ProgressRing progress={s.level} size={34} stroke={3} color={s.level >= 80 ? T.green : s.level >= 60 ? T.blue : T.amber} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.navy }}>{s.name}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{s.level >= 80 ? "Expert" : s.level >= 60 ? "Advanced" : "Intermediate"}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function DemoDashboardView({ profile, selectedSkills, selectedGoal, setCurrentView }) {
  const learnerName = profile?.firstName?.trim();

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Good morning{learnerName ? `, ${learnerName}` : ""} ✦</h1>
            <p style={{ color: T.muted, fontSize: 14.5 }}>You're <span style={{ color: T.blue, fontWeight: 700 }}>68%</span> of the way to <span style={{ color: T.navy, fontWeight: 600 }}>{selectedGoal}</span></p>
          </div>
          <GlassCard hover={false} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.slate }}>7 day streak</span>
          </GlassCard>
        </div>
      </div>

      {/* Hero Progress */}
      <GlassCard className="fade-up s1" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(139,92,246,0.03), rgba(255,255,255,0.6))", border: "1px solid rgba(37,99,235,0.12)", marginBottom: 20, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'General Sans'" }}>Path to {selectedGoal}</div>
            <div style={{ display: "flex", gap: 28, marginBottom: 20 }}>
              {[{ v: "12", l: "Skills Acquired" }, { v: "5", l: "Courses Done" }, { v: "3", l: "Assessments" }, { v: "84h", l: "Learning Time" }].map(d => (
                <div key={d.l}><div className="stat-num" style={{ fontSize: 28, color: T.navy }}>{d.v}</div><div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{d.l}</div></div>
              ))}
            </div>
            <div style={{ height: 7, background: "rgba(148,163,184,0.1)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "68%", background: `linear-gradient(90deg, ${T.blue}, #8B5CF6)`, borderRadius: 4, transition: "width 1.6s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
          </div>
          <div style={{ marginLeft: 36, position: "relative" }}>
            <ProgressRing progress={68} size={96} stroke={7} color={T.blue} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
              <div className="stat-num" style={{ fontSize: 24, color: T.blue }}>68%</div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Continue Learning */}
        <GlassCard className="fade-up s2">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Continue Learning</div>
          {COURSES.slice(0, 2).map((c, i) => (
            <div key={c.id} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: i === 0 ? `1px solid rgba(148,163,184,0.1)` : "none" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${c.accent}12, ${c.accent}05)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0, border: `1px solid ${c.accent}20`, color: c.accent, fontFamily: "'General Sans'" }}>
                {c.providerLogo}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.navy }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: T.muted }}>{c.provider} · {c.duration}</div>
                <div style={{ height: 4, background: "rgba(148,163,184,0.08)", borderRadius: 2, marginTop: 8 }}>
                  <div style={{ height: "100%", width: `${60 - i * 25}%`, background: c.accent, borderRadius: 2, transition: "width 1s" }} />
                </div>
              </div>
            </div>
          ))}
          <button className="btn-ghost" style={{ width: "100%", marginTop: 14, fontSize: 12.5 }} onClick={() => setCurrentView("courses")}>View All Courses</button>
        </GlassCard>

        {/* Assessments */}
        <GlassCard className="fade-up s3">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Assessments</div>
          {ASSESSMENTS.slice(0, 3).map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < 2 ? "1px solid rgba(148,163,184,0.08)" : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                background: a.status === "completed" ? "rgba(16,185,129,0.08)" : "rgba(148,163,184,0.06)",
                border: `1px solid ${a.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.1)"}`,
                color: a.status === "completed" ? T.green : T.faint }}>
                {a.status === "completed" ? "✓" : "?"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, color: T.navy }}>{a.skill}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{a.questions} questions · {a.duration}</div>
              </div>
              {a.score !== null ? (
                <div className="stat-num" style={{ fontSize: 17, color: a.score >= 80 ? T.green : "#D97706" }}>{a.score}%</div>
              ) : (
                <Badge variant={a.status === "available" ? "amber" : "muted"}>{a.status === "available" ? "Take Now" : "Locked"}</Badge>
              )}
            </div>
          ))}
          <button className="btn-primary" style={{ width: "100%", marginTop: 14, fontSize: 12.5 }} onClick={() => setCurrentView("assess")}>Start Assessment →</button>
        </GlassCard>
      </div>

      {/* Skills */}
      <GlassCard className="fade-up s4">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'General Sans'" }}>Skills Snapshot</div>
          <button className="btn-ghost" style={{ fontSize: 11.5, padding: "6px 14px" }} onClick={() => setCurrentView("wallet")}>View Wallet →</button>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {selectedSkills.map((s, i) => {
            const val = [92, 78, 88, 85, 65][i] || 70;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                <div style={{ width: 34, height: 34, position: "relative" }}>
                  <ProgressRing progress={val} size={34} stroke={3} color={val >= 80 ? T.green : val >= 60 ? T.blue : T.amber} />
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.navy }}>{s}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>{val >= 80 ? "Expert" : val >= 60 ? "Advanced" : "Intermediate"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
