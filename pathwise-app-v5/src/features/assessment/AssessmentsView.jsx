import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, GlassCard, ProgressRing } from "../../components/UIKit";
import { ASSESSMENTS } from "../../data/mockData";
import { T } from "../../theme";

// ─── Assessments ─────────────────────────────────────────────────────
export function AssessmentsView() {
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
