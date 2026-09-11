import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GlassCard, ProgressRing } from "../components/UIKit";
import { T } from "../theme";
import { walletShare } from "../api/endpoints";

const LEVEL_COLOR = (level) => (level >= 80 ? T.green : level >= 60 ? T.blue : level >= 40 ? T.amber : T.rose);
const LEVEL_LABEL = (level) => (level >= 80 ? "Expert" : level >= 60 ? "Advanced" : level >= 40 ? "Intermediate" : "Beginner");

// Phase B29: the page a "Share Wallet" link actually opens - no login
// required, reachable by anyone with the link (see app/Root.jsx's exception
// for this path). Hits GET /public/wallet/:token directly rather than
// useApi/hooks, since this page renders outside AuthProvider entirely.
export function PublicWalletPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    walletShare.getPublic(token)
      .then((data) => { if (!cancelled) setState({ loading: false, data, error: null }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, data: null, error: error.message }); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", padding: "48px 20px", display: "flex", justifyContent: "center", background: T.bg }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontFamily: "'General Sans'" }}>P</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: T.navy, fontFamily: "'General Sans'" }}>Pathwise</span>
        </div>

        {state.loading && <p style={{ fontSize: 13.5, color: T.muted }}>Loading…</p>}

        {!state.loading && state.error && (
          <GlassCard style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🔗</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 6 }}>This wallet link isn't valid</div>
            <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>It may have been mistyped, or the link no longer exists.</p>
          </GlassCard>
        )}

        {!state.loading && state.data && (
          <>
            <h1 style={{ fontFamily: "'General Sans'", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
              {state.data.firstName}'s Skills Wallet
            </h1>
            <p style={{ color: T.muted, fontSize: 13.5, marginBottom: 24 }}>Shared read-only view · Pathwise</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Skills", value: state.data.stats.totalSkills },
                { label: "Verified", value: state.data.stats.verified },
                { label: "Avg. Proficiency", value: `${state.data.stats.avgProficiency}%` },
              ].map((s) => (
                <GlassCard key={s.label} hover={false} style={{ textAlign: "center", padding: 16 }}>
                  <div className="stat-num" style={{ fontSize: 22, color: T.navy }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{s.label}</div>
                </GlassCard>
              ))}
            </div>

            <GlassCard hover={false} style={{ padding: 8 }}>
              {state.data.skills.length === 0 && (
                <p style={{ fontSize: 13, color: T.muted, padding: 16, textAlign: "center", margin: 0 }}>No skills to show yet.</p>
              )}
              {state.data.skills.map((skill, i) => (
                <div key={skill.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 10px", borderBottom: i < state.data.skills.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none" }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <ProgressRing progress={skill.level} size={40} stroke={3.5} color={LEVEL_COLOR(skill.level)} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="stat-num" style={{ fontSize: 10.5, color: LEVEL_COLOR(skill.level) }}>{skill.level}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.navy }}>{skill.name}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{LEVEL_LABEL(skill.level)}</div>
                  </div>
                  {skill.verified && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: T.green, background: T.greenBg, padding: "3px 9px", borderRadius: 6 }}>Verified ✓</span>
                  )}
                </div>
              ))}
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
}
