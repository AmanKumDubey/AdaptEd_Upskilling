import { Badge, GlassCard, ProgressRing } from "../../components/UIKit";
import { ASSESSMENTS, COURSES } from "../../data/mockData";
import { T } from "../../theme";

// ─── Dashboard ───────────────────────────────────────────────────────
export function DashboardView({ profile, selectedSkills, selectedGoal, setCurrentView }) {
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
