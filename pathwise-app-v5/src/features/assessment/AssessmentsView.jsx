import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, GlassCard, ProgressRing } from "../../components/UIKit";
import { ASSESSMENTS } from "../../data/mockData";
import { PERSONAS } from "../../SkillsAssessment";
import { T } from "../../theme";
import { authEnabled, loadHistory } from "./assessmentBackend";
import { useMyAssignments } from "../../hooks";

// ─── Assessments ─────────────────────────────────────────────────────
// Split into two full components (rather than branching mid-component) so
// neither side's hooks can ever collide - authEnabled is fixed at build
// time, so which one renders never changes across a session anyway.
export function AssessmentsView() {
  return authEnabled ? <RealAssessmentHistory /> : <DemoAssessmentsView />;
}

const LEVEL_COLOR = (score) => (score >= 80 ? T.green : score >= 60 ? T.blue : score >= 40 ? T.amber : T.rose);

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

// Phase B8: your real attempt history (adapted-backend's AssessmentResults),
// not a catalog of distinct per-skill assessments the way the demo mock data
// modeled it - the real backend only has the 4 persona-based assessments
// AssessmentExperience.jsx already offers, each retakeable any number of times.
function RealAssessmentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(null);
  const { data: assignments } = useMyAssignments();
  const pendingAssignments = (assignments || []).filter((a) => !a.completed);

  useEffect(() => {
    let cancelled = false;
    loadHistory().then((results) => {
      if (!cancelled) setHistory(results);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Knowledge Assessments</h1>
          <p style={{ color: T.muted, fontSize: 14.5 }}>Your assessment history and available tracks</p>
        </div>
        <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => navigate("/assessment")}>Take an assessment →</button>
      </div>

      <div className="fade-up s1" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 12 }}>Tracks</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {Object.values(PERSONAS).map((persona) => (
            <GlassCard key={persona.id} style={{ padding: 18 }}>
              <span style={{ fontSize: 22, display: "inline-block", marginBottom: 8 }}>{persona.icon}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>{persona.title}</h3>
              <p style={{ fontSize: 12, color: T.muted, marginBottom: 14, lineHeight: 1.5 }}>{persona.subtitle}</p>
              <button className="btn-ghost" style={{ width: "100%", fontSize: 12 }} onClick={() => navigate(`/assessment?persona=${persona.id}&retake=1`)}>
                Start this track →
              </button>
            </GlassCard>
          ))}
        </div>
      </div>

      {pendingAssignments.length > 0 && (
        <div className="fade-up s2" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 12 }}>Assigned to you</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {pendingAssignments.map((assignment) => (
              <GlassCard key={assignment.id} style={{ padding: 18, border: `1px solid ${T.amber}30` }}>
                <Badge variant="amber">Assigned</Badge>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.navy, margin: "10px 0 4px" }}>{PERSONAS[assignment.personaId]?.title || assignment.personaId}</h3>
                {assignment.dueAt && <p style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Due {formatDate(assignment.dueAt)}</p>}
                <button className="btn-primary" style={{ width: "100%", fontSize: 12 }} onClick={() => navigate(`/assessment?persona=${assignment.personaId}`)}>
                  Start assessment →
                </button>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      <div className="fade-up s2">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 12 }}>Past attempts</h2>

        {history === null && (
          <GlassCard style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Loading your history…</p>
          </GlassCard>
        )}

        {history?.length === 0 && (
          <GlassCard style={{ padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
              You haven't completed an assessment yet. Pick a track above to get started.
            </p>
          </GlassCard>
        )}

        {history?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
            {history.map((attempt) => (
              <GlassCard key={attempt.id} style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <Badge variant="muted">{PERSONAS[attempt.personaId]?.title || attempt.personaId}</Badge>
                  <div style={{ position: "relative" }}>
                    <ProgressRing progress={attempt.score} size={48} stroke={4} color={LEVEL_COLOR(attempt.score)} />
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
                      <span className="stat-num" style={{ fontSize: 11, color: LEVEL_COLOR(attempt.score) }}>{attempt.score}</span>
                    </div>
                  </div>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: T.navy, fontFamily: "'General Sans'" }}>{attempt.level}</h3>
                <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: T.muted, marginBottom: 18 }}>
                  <span>{attempt.correctCount}/{attempt.total} correct</span>
                  <span>{formatDate(attempt.completedAt)}</span>
                </div>
                <button className="btn-ghost" style={{ width: "100%" }} onClick={() => navigate(`/assessment/results/${attempt.id}`)}>
                  View result
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoAssessmentsView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? ASSESSMENTS : ASSESSMENTS.filter(a => a.status === tab);

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Knowledge Assessments</h1>
        <p style={{ color: T.muted, fontSize: 14.5 }}>Validate your skills with proctored assessments</p>
      </div>
      <div className="fade-up s1 tab-bar" style={{ marginBottom: 24, width: "fit-content" }}>
        {[["all","All"],["completed","Completed"],["available","Available"],["locked","Locked"]].map(([v,l]) => (
          <button key={v} className={`tab-btn ${tab === v ? "active" : ""}`} onClick={() => setTab(v)} style={{ fontSize: 12.5 }}>{l}</button>
        ))}
      </div>
      <div className="fade-up s2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {filtered.map(a => (
          <GlassCard key={a.id} style={{ position: "relative", overflow: "hidden" }}>
            {a.status === "locked" && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(239,246,255,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, borderRadius: T.radius }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                  <div style={{ fontSize: 12, color: T.muted }}>Complete prerequisites first</div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <Badge variant={a.difficulty === "Advanced" ? "rose" : "amber"}>{a.difficulty}</Badge>
              {a.status === "completed" && (
                <div style={{ position: "relative" }}>
                  <ProgressRing progress={a.score} size={48} stroke={4} color={a.score >= 80 ? T.green : T.amber} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
                    <span className="stat-num" style={{ fontSize: 11, color: a.score >= 80 ? T.green : "#D97706" }}>{a.score}</span>
                  </div>
                </div>
              )}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: T.navy, fontFamily: "'General Sans'" }}>{a.skill}</h3>
            <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: T.muted, marginBottom: 18 }}>
              <span>{a.questions} questions</span><span>{a.duration}</span>
            </div>
            {a.status === "available" && <button className="btn-primary" style={{ width: "100%" }} onClick={() => navigate("/assessment")}>Start Assessment →</button>}
            {a.status === "completed" && <button className="btn-ghost" style={{ width: "100%" }} onClick={() => navigate("/assessment")}>Retake Assessment</button>}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
