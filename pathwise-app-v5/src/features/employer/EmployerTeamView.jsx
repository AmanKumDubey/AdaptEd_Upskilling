import { useState } from "react";
import { GlassCard } from "../../components/UIKit";
import { EMPLOYEES } from "../../data/mockData";
import { T } from "../../theme";

// ─── Employer Team ───────────────────────────────────────────────────
export function EmployerTeamView() {
  const [sel, setSel] = useState(null);
  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Team Skills</h1>
        <p style={{ color: T.muted, fontSize: 14.5 }}>Individual skill wallets and progress tracking</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: sel !== null ? "300px 1fr" : "1fr", gap: 20 }}>
        <div className="fade-up s1" style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {EMPLOYEES.map((e, i) => (
            <GlassCard key={e.name} style={{ padding: 16, cursor: "pointer", border: sel === i ? `1px solid ${T.blue}30` : undefined, background: sel === i ? "rgba(37,99,235,0.04)" : undefined }}
              onClick={() => setSel(i)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${e.color}18, ${e.color}08)`, border: `1px solid ${e.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: e.color, fontFamily: "'General Sans'" }}>{e.avatar}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{e.name}</div><div style={{ fontSize: 11.5, color: T.muted }}>{e.role}</div></div>
                <div className="stat-num" style={{ fontSize: 18, color: T.navy }}>{e.score}</div>
              </div>
            </GlassCard>
          ))}
        </div>
        {sel !== null && (
          <div className="fade-up s2">
            <GlassCard style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${EMPLOYEES[sel].color}18, ${EMPLOYEES[sel].color}08)`, border: `1px solid ${EMPLOYEES[sel].color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: EMPLOYEES[sel].color, fontFamily: "'General Sans'" }}>{EMPLOYEES[sel].avatar}</div>
                <div><div style={{ fontSize: 22, fontWeight: 700, color: T.navy, fontFamily: "'General Sans'" }}>{EMPLOYEES[sel].name}</div><div style={{ fontSize: 13.5, color: T.muted }}>{EMPLOYEES[sel].role}</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {[{ v: EMPLOYEES[sel].skills, l: "Skills", c: T.blue }, { v: EMPLOYEES[sel].assessments, l: "Assessments", c: T.green }, { v: EMPLOYEES[sel].trend, l: "Trend", c: T.amber }].map((d, i) => (
                  <div key={i} style={{ textAlign: "center", padding: 14, background: "rgba(255,255,255,0.5)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.6)" }}>
                    <div className="stat-num" style={{ fontSize: 24, color: d.c }}>{d.v}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{d.l}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18, fontFamily: "'General Sans'" }}>Skill Breakdown</div>
              {["Python","Machine Learning","TensorFlow","Statistics","Deep Learning","SQL"].map(s => {
                const val = Math.floor(Math.random()*40+55);
                const col = val >= 80 ? T.green : val >= 60 ? T.blue : T.amber;
                return (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 110, fontSize: 13, fontWeight: 500, color: T.slate }}>{s}</div>
                    <div style={{ flex: 1, height: 6, background: "rgba(148,163,184,0.08)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${val}%`, background: col, borderRadius: 3, transition: "width 0.8s" }} />
                    </div>
                    <span className="stat-num" style={{ fontSize: 12, color: col, width: 36, textAlign: "right" }}>{val}%</span>
                  </div>
                );
              })}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
