import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard, ProgressRing } from "../../components/UIKit";
import { PERSONAS } from "../../SkillsAssessment";
import { T } from "../../theme";
import { loadHistory, loadLatestResult } from "../assessment/assessmentBackend";
import { getPlatformStyle } from "../courses/courseDisplay";
import { loadPath } from "../learning-path/learningPathBackend";
import { loadProfile } from "../onboarding/onboardingBackend";
import { useSkillsWallet } from "../skills/skillsEngine";
import { useAssessmentResult, useLearningPath, useProfile } from "../../state/PathwiseDataContext";
import { useMyCoursesDashboard } from "../../hooks";

const LEVEL_COLOR = (score) => (score >= 80 ? T.green : score >= 60 ? T.blue : score >= 40 ? T.amber : T.rose);

// ─── Shared presentational pieces (Phase B28 visual pass) ─────────────
// Both Real and Demo views render identically-shaped data through the same
// small building blocks below, so a learner never sees a visual seam
// between the two modes - only the numbers behind them differ.

function Avatar({ name, size = 52 }) {
  const initial = (name?.[0] || "P").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "white", fontWeight: 700, fontSize: size * 0.36, fontFamily: "'General Sans'",
      boxShadow: `0 8px 20px ${T.blue}30`,
    }}>
      {initial}
    </div>
  );
}

function HeroStat({ icon, color, value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, background: `${color}14`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
      <div>
        <div className="stat-num" style={{ fontSize: 24, color: T.navy, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function HeroCard({ eyebrow, stats, percent, badgeSlot }) {
  return (
    <GlassCard className="fade-up s1" style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg, rgba(37,99,235,0.07), rgba(139,92,246,0.04), rgba(255,255,255,0.6))", border: "1px solid rgba(37,99,235,0.12)", marginBottom: 20, padding: 28 }}>
      <div aria-hidden="true" style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${T.violet}18, transparent 70%)`, filter: "blur(10px)" }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>{eyebrow}</div>
          <div style={{ display: "flex", gap: 26, marginBottom: 22, flexWrap: "wrap" }}>
            {stats.map((s) => <HeroStat key={s.label} icon={s.icon} color={s.color} value={s.value} label={s.label} />)}
          </div>
          <div style={{ height: 8, background: "rgba(148,163,184,0.1)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${percent}%`, background: `linear-gradient(90deg, ${T.blue}, ${T.violet})`, borderRadius: 5, transition: "width 1.6s cubic-bezier(0.16,1,0.3,1)", boxShadow: `0 0 12px ${T.blue}60` }} />
          </div>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ProgressRing progress={percent} size={100} stroke={7} color={T.blue} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
            <div className="stat-num" style={{ fontSize: 25, color: T.blue }}>{percent}%</div>
          </div>
        </div>
      </div>
      {badgeSlot}
    </GlassCard>
  );
}

function ScoreRing({ score, size = 42 }) {
  const color = LEVEL_COLOR(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <ProgressRing progress={score} size={size} stroke={3.5} color={color} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="stat-num" style={{ fontSize: size * 0.27, color }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────
// Real learners' path %, stats, continue-learning, recent assessments, and
// skill snapshot - composed entirely from data other features already fetch
// (Learning Path context, useMyCoursesDashboard, useSkillsWallet, assessment
// history), rather than a new dashboard-specific backend endpoint. There's
// no real "streak" concept anywhere in the backend, so this omits a streak
// badge instead of fabricating one.
export function DashboardView({ setCurrentView }) {
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
      <div className="fade-up" style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar name={learnerName} />
        <div>
          <h1 style={{ fontFamily: "'General Sans'", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 }}>Good morning{learnerName ? `, ${learnerName}` : ""} ✦</h1>
          {targetRole && (
            <p style={{ color: T.muted, fontSize: 14.5 }}>You're <span style={{ color: T.blue, fontWeight: 700 }}>{pathPercent}%</span> of the way to <span style={{ color: T.navy, fontWeight: 600 }}>{targetRole}</span></p>
          )}
        </div>
      </div>

      {/* Hero Progress */}
      {learningPath ? (
        <HeroCard
          eyebrow={`Path to ${targetRole}`}
          percent={pathPercent}
          stats={[
            { icon: "🎯", color: T.blue, value: String(skillsWallet.stats.totalSkills), label: "Skills Acquired" },
            { icon: "📚", color: T.green, value: String(completedCourses.length), label: "Courses Done" },
            { icon: "🧠", color: T.violet, value: String((history || []).length), label: "Assessments" },
            { icon: "⏱", color: T.amber, value: `${learningHours}h`, label: "Learning Time" },
          ]}
        />
      ) : (
        <GlassCard className="fade-up s1" style={{ marginBottom: 20, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>🧭</div>
          <div style={{ fontSize: 14.5, color: T.muted, marginBottom: 14 }}>You don't have a learning path yet.</div>
          <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setCurrentView("path")}>Build my learning path →</button>
        </GlassCard>
      )}

      <div className="grid-2col" style={{ marginBottom: 20 }}>
        {/* Continue Learning */}
        <GlassCard className="fade-up s2">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Continue Learning</div>
          {coursesQuery.loading && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
          {!coursesQuery.loading && continueLearning.length === 0 && (
            <div style={{ textAlign: "center", padding: "18px 0" }}>
              <div style={{ fontSize: 26, marginBottom: 6, opacity: 0.6 }}>📖</div>
              <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No courses in progress yet.</p>
            </div>
          )}
          {continueLearning.slice(0, 2).map((uc, i) => {
            const { mark, accent, label } = getPlatformStyle(uc.course?.platform);
            return (
              <div key={uc.id} className="glass-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 8px", borderRadius: 12, marginBottom: i === 0 && continueLearning.length > 1 ? 2 : 0, cursor: "pointer" }}
                onClick={() => navigate(`/courses/${uc.courseId}`)}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${accent}14, ${accent}05)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, flexShrink: 0, border: `1px solid ${accent}22`, color: accent, fontFamily: "'General Sans'" }}>
                  {mark}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.navy }}>{uc.course?.title}</div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>{label}{uc.course?.durationHours ? ` · ${uc.course.durationHours}h` : ""}</div>
                </div>
                <span style={{ color: T.faint, fontSize: 15, flexShrink: 0 }}>›</span>
              </div>
            );
          })}
          <button className="btn-ghost" style={{ width: "100%", marginTop: 14, fontSize: 12.5 }} onClick={() => setCurrentView("courses")}>View All Courses</button>
        </GlassCard>

        {/* Assessments */}
        <GlassCard className="fade-up s3">
          <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Assessments</div>
          {history === null && <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>}
          {history?.length === 0 && (
            <div style={{ textAlign: "center", padding: "18px 0" }}>
              <div style={{ fontSize: 26, marginBottom: 6, opacity: 0.6 }}>🧠</div>
              <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No assessments completed yet.</p>
            </div>
          )}
          {recentAssessments.map((a, i) => (
            <div key={a.id} className="glass-hover" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 8px", borderRadius: 12, marginBottom: i < recentAssessments.length - 1 ? 2 : 0, cursor: "pointer" }}
              onClick={() => navigate(`/assessment/results/${a.id}`)}>
              <ScoreRing score={a.score} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, color: T.navy }}>{PERSONAS[a.personaId]?.title || a.personaId}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{a.level}</div>
              </div>
              <span style={{ color: T.faint, fontSize: 15, flexShrink: 0 }}>›</span>
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
            <div key={s.name} className="glass-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
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
