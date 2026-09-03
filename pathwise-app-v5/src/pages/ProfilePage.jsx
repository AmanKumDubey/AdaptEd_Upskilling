import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard } from "../components/UIKit";
import { T } from "../theme";
import { useResetDemoData } from "../state/PathwiseDataContext";
import { LogoutButton } from "../components/LogoutButton";

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

function ProfileItem({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: T.faint, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <div style={{ color: T.slate, fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{value || "Not provided"}</div>
    </div>
  );
}

export function ProfilePage({ profile }) {
  const navigate = useNavigate();
  const resetAllDemoData = useResetDemoData();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Pathwise Learner";
  const background = profile
    ? [profile.educationLevel, profile.fieldOfStudy, profile.employmentStatus].filter(Boolean).join(" · ")
    : "Demo profile";

  function handleReset() {
    resetAllDemoData();
    navigate("/onboarding", { replace: true });
  }

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Your Profile</h1>
          <p style={{ color: T.muted, fontSize: 14.5 }}>Your Phase 3 onboarding answers are saved in this browser.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn-primary" to="/onboarding" style={{ padding: "11px 18px", borderRadius: 12, textDecoration: "none", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }}>
            Edit onboarding answers
          </Link>
          <button type="button" className="btn-ghost" style={{ padding: "11px 18px", borderRadius: 12, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }} onClick={() => setConfirmingReset(true)}>
            Reset demo data
          </button>
          {authEnabled && (
            <LogoutButton style={{ padding: "11px 18px", borderRadius: 12, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" }} />
          )}
        </div>
      </div>

      {confirmingReset && (
        <GlassCard style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, border: "1px solid rgba(244,63,94,0.25)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Clear all demo data?</div>
            <p style={{ fontSize: 12.5, color: T.muted, margin: 0 }}>This removes your onboarding profile, assessment result, learning path, and course progress from this browser. This cannot be undone.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button type="button" className="btn-ghost" style={{ fontSize: 12.5, padding: "8px 14px" }} onClick={() => setConfirmingReset(false)}>Cancel</button>
            <button type="button" className="btn-primary" style={{ fontSize: 12.5, padding: "8px 14px", background: T.rose }} onClick={handleReset}>Reset everything</button>
          </div>
        </GlassCard>
      )}

      <GlassCard style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 54, height: 54, display: "grid", placeItems: "center", borderRadius: 17, color: "white", background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`, fontFamily: "'General Sans'", fontSize: 18, fontWeight: 700 }}>
            {(profile?.firstName?.[0] || "P").toUpperCase()}{(profile?.lastName?.[0] || "").toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontFamily: "'General Sans'", fontSize: 20, marginBottom: 3 }}>{fullName}</h2>
            <span style={{ color: profile?.onboardingCompleted ? T.green : T.amber, fontSize: 12, fontWeight: 650 }}>
              {profile?.onboardingCompleted ? "Onboarding complete" : "Demo profile active"}
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 22 }}>
          <ProfileItem label="Location" value={profile?.location} />
          <ProfileItem label="Preferred language" value={profile?.language} />
          <ProfileItem label="Background" value={background} />
          <ProfileItem label="Experience" value={profile?.employmentStatus === "Student" ? `Graduating ${profile.graduationYear}` : profile?.experienceYears} />
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <GlassCard>
          <ProfileItem label="Target role" value={profile?.targetRole || "ML Engineer"} />
          <div style={{ height: 1, background: "rgba(148,163,184,0.12)", margin: "18px 0" }} />
          <ProfileItem label="Career goal" value={profile?.careerGoal} />
          <div style={{ height: 1, background: "rgba(148,163,184,0.12)", margin: "18px 0" }} />
          <ProfileItem label="Availability" value={profile ? `${profile.hoursPerWeek} hours/week · ${profile.timeline}` : "Not provided"} />
        </GlassCard>
        <GlassCard>
          <ProfileItem label="Current skills" value={profile?.skills?.join(", ")} />
          <div style={{ height: 1, background: "rgba(148,163,184,0.12)", margin: "18px 0" }} />
          <ProfileItem label="Career interests" value={profile?.interests?.join(", ")} />
          <div style={{ height: 1, background: "rgba(148,163,184,0.12)", margin: "18px 0" }} />
          <ProfileItem label="Learning style" value={profile ? `${profile.learningFormats.join(", ")} · ${profile.learningPace}` : "Not provided"} />
        </GlassCard>
      </div>
    </div>
  );
}
