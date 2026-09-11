import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, GlassCard, ProgressRing } from "../../components/UIKit";
import { PERSONAS } from "../../SkillsAssessment";
import { T } from "../../theme";
import { loadHistory } from "./assessmentBackend";
import { useMyAssignments } from "../../hooks";

const LEVEL_COLOR = (score) => (score >= 80 ? T.green : score >= 60 ? T.blue : score >= 40 ? T.amber : T.rose);

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

// ─── Assessments ─────────────────────────────────────────────────────
// Your real attempt history (adapted-backend's AssessmentResults) - the
// real backend only has the 4 persona-based assessments AssessmentExperience.jsx
// already offers, each retakeable any number of times.
export function AssessmentsView() {
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
