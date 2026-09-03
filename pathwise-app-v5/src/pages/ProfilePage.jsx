import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard } from "../components/UIKit";
import { T } from "../theme";
import { useResetDemoData } from "../state/PathwiseDataContext";
import { LogoutButton } from "../components/LogoutButton";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../api/endpoints";
import { LoadingSpinner } from "../components/LoadingAndError";

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

const COUNTRIES = [
  ["AU", "Australia"], ["BR", "Brazil"], ["CA", "Canada"], ["CN", "China"],
  ["FR", "France"], ["DE", "Germany"], ["IN", "India"], ["ID", "Indonesia"],
  ["IE", "Ireland"], ["IT", "Italy"], ["JP", "Japan"], ["KE", "Kenya"],
  ["MY", "Malaysia"], ["MX", "Mexico"], ["NL", "Netherlands"], ["NG", "Nigeria"],
  ["NZ", "New Zealand"], ["PK", "Pakistan"], ["PH", "Philippines"], ["PL", "Poland"],
  ["RU", "Russia"], ["SA", "Saudi Arabia"], ["SG", "Singapore"], ["ZA", "South Africa"],
  ["KR", "South Korea"], ["ES", "Spain"], ["SE", "Sweden"], ["CH", "Switzerland"],
  ["AE", "United Arab Emirates"], ["GB", "United Kingdom"], ["US", "United States"], ["VN", "Vietnam"],
];

const fieldLabelStyle = { color: T.faint, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, display: "block" };
const fieldInputStyle = { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, padding: "10px 13px", color: T.navy, fontSize: 13.5, fontFamily: "'Outfit'", outline: "none", width: "100%" };

function Field({ label, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label style={fieldLabelStyle}>{label}</label>
      {children}
    </div>
  );
}

function InlineNotice({ tone = "error", children }) {
  const palette = tone === "success"
    ? { bg: T.greenBg, border: "rgba(16,185,129,0.2)", color: T.green }
    : { bg: T.roseBg, border: "rgba(244,63,94,0.12)", color: T.rose };
  return (
    <div style={{ padding: "10px 14px", borderRadius: 12, background: palette.bg, border: `1px solid ${palette.border}`, fontSize: 12.5, color: palette.color, fontWeight: 500, marginBottom: 16 }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ fontFamily: "'General Sans'", fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 3 }}>{children}</h2>
      {subtitle && <p style={{ fontSize: 12.5, color: T.muted }}>{subtitle}</p>}
    </div>
  );
}

// ─── Avatar with upload/remove ────────────────────────────────────────
function AvatarEditor({ user, onChanged }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const initials = `${user?.firstName?.[0] || user?.username?.[0] || "P"}${user?.lastName?.[0] || ""}`.toUpperCase();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setError("");
    setBusy(true);
    try {
      const { uploadUrl, key } = await auth.presignAvatar(file.name, file.type);
      const uploadRes = await auth.uploadAvatarFile(uploadUrl, file);
      if (!uploadRes.ok) throw new Error("Upload to storage failed");
      await auth.confirmAvatar(key);
      await onChanged();
    } catch (err) {
      setError(err.message || "Couldn't update your photo. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setError("");
    setBusy(true);
    try {
      await auth.removeAvatar();
      await onChanged();
    } catch (err) {
      setError(err.message || "Couldn't remove your photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: error ? 12 : 0 }}>
      <div
        onClick={() => !busy && fileInputRef.current?.click()}
        style={{
          width: 76, height: 76, borderRadius: 22, position: "relative", cursor: busy ? "wait" : "pointer",
          background: user?.avatarUrl ? `center/cover no-repeat url(${user.avatarUrl})` : `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
          display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden",
          boxShadow: "0 8px 24px rgba(37,99,235,0.18)", border: "3px solid rgba(255,255,255,0.8)",
        }}
        title="Change photo"
      >
        {!user?.avatarUrl && <span style={{ color: "white", fontFamily: "'General Sans'", fontSize: 24, fontWeight: 700 }}>{initials}</span>}
        <div style={{
          position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700,
          opacity: 0, transition: "opacity 0.2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
        >
          {busy ? <LoadingSpinner size={16} color="white" /> : "CHANGE"}
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleFile} />
      <div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-ghost" disabled={busy} style={{ padding: "8px 14px", fontSize: 12, borderRadius: 10 }} onClick={() => fileInputRef.current?.click()}>
            Change photo
          </button>
          {user?.avatarUrl && (
            <button type="button" className="btn-ghost" disabled={busy} style={{ padding: "8px 14px", fontSize: 12, borderRadius: 10, color: T.rose }} onClick={handleRemove}>
              Remove
            </button>
          )}
        </div>
        <p style={{ fontSize: 11, color: T.faint, marginTop: 6 }}>JPEG, PNG, WEBP, or GIF · up to 5MB</p>
        {error && <p style={{ fontSize: 11.5, color: T.rose, marginTop: 4 }}>{error}</p>}
      </div>
    </div>
  );
}

// ─── Editable account details ─────────────────────────────────────────
function AccountDetailsForm({ user, onUpdated }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || "", lastName: user?.lastName || "",
    email: user?.email || "", phone: user?.phone || "",
    gender: user?.gender || "", country: user?.country || "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await onUpdated(form);
      setNotice({ tone: "success", text: "Profile updated." });
    } catch (err) {
      setNotice({ tone: "error", text: err.message || "Couldn't save your changes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {notice && <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Field label="First name">
          <input style={fieldInputStyle} value={form.firstName} onChange={set("firstName")} maxLength={50} />
        </Field>
        <Field label="Last name">
          <input style={fieldInputStyle} value={form.lastName} onChange={set("lastName")} maxLength={50} />
        </Field>
        <Field label="Email">
          <input type="email" style={fieldInputStyle} value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <input style={fieldInputStyle} value={form.phone} onChange={set("phone")} placeholder="+1 555 123 4567" />
        </Field>
        <Field label="Gender">
          <input style={fieldInputStyle} value={form.gender} onChange={set("gender")} placeholder="Optional" maxLength={20} />
        </Field>
        <Field label="Country">
          <select style={fieldInputStyle} value={form.country} onChange={set("country")}>
            <option value="">Not set</option>
            {COUNTRIES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </Field>
      </div>
      <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "10px 20px", fontSize: 12.5, borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>
        {saving && <LoadingSpinner size={14} color="white" />}
        Save changes
      </button>
    </form>
  );
}

// ─── Change password ──────────────────────────────────────────────────
function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setNotice({ tone: "error", text: "New passwords don't match." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await auth.changePassword(currentPassword, newPassword);
      setNotice({ tone: "success", text: "Password changed." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setNotice({ tone: "error", text: err.message || "Couldn't change your password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {notice && <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Field label="Current password">
          <input type="password" style={fieldInputStyle} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </Field>
        <Field label="New password">
          <input type="password" style={fieldInputStyle} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
        </Field>
        <Field label="Confirm new password">
          <input type="password" style={fieldInputStyle} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
        </Field>
      </div>
      <p style={{ fontSize: 11, color: T.faint, marginTop: -8, marginBottom: 16 }}>
        At least 6 characters, with a lowercase letter, an uppercase letter, and a number.
      </p>
      <button type="submit" disabled={saving} className="btn-primary" style={{ padding: "10px 20px", fontSize: 12.5, borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>
        {saving && <LoadingSpinner size={14} color="white" />}
        Update password
      </button>
    </form>
  );
}

// ─── Danger zone: delete account ──────────────────────────────────────
function DeleteAccountPanel() {
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setBusy(true);
    setError("");
    try {
      await auth.deleteAccount();
      await logout();
    } catch (err) {
      setError(err.message || "Couldn't delete your account.");
      setBusy(false);
    }
  };

  return (
    <GlassCard style={{ border: "1px solid rgba(244,63,94,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.rose, marginBottom: 4 }}>Delete account</h3>
          <p style={{ fontSize: 12.5, color: T.muted, maxWidth: 420 }}>
            This deactivates your account and immediately signs you out everywhere. This cannot be undone from the app.
          </p>
        </div>
        {!confirming ? (
          <button type="button" className="btn-ghost" style={{ color: T.rose, fontSize: 12.5, padding: "9px 16px", borderRadius: 10, whiteSpace: "nowrap" }} onClick={() => setConfirming(true)}>
            Delete account
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <input
              style={{ ...fieldInputStyle, width: 200 }}
              placeholder='Type "DELETE" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: "8px 14px" }} onClick={() => { setConfirming(false); setConfirmText(""); setError(""); }}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={confirmText !== "DELETE" || busy}
                style={{ fontSize: 12, padding: "8px 14px", background: T.rose, opacity: confirmText !== "DELETE" || busy ? 0.5 : 1 }}
                onClick={handleDelete}>
                {busy ? <LoadingSpinner size={14} color="white" /> : "Confirm delete"}
              </button>
            </div>
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: T.rose, marginTop: 10 }}>{error}</p>}
    </GlassCard>
  );
}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Your Profile</h1>
          <p style={{ color: T.muted, fontSize: 14.5 }}>Manage your account, security, and career preferences.</p>
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

      {authEnabled && <AccountSection />}

      <SectionTitle>Career profile</SectionTitle>
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

// Split out so useAuth() (which throws outside AuthProvider) is only ever
// called from a component that's actually mounted inside one - this is only
// ever rendered behind the authEnabled gate above, exactly like LogoutButton.
function AccountSection() {
  const { user, updateUser, refreshUser } = useAuth();

  const handleProfileUpdate = async (fields) => {
    await updateUser(fields);
  };

  return (
    <>
      <SectionTitle subtitle="Your photo, contact details, and sign-in security.">Account</SectionTitle>
      <GlassCard style={{ marginBottom: 20 }}>
        <AvatarEditor user={user} onChanged={refreshUser} />
        <div style={{ height: 1, background: "rgba(148,163,184,0.12)", margin: "20px 0" }} />
        <AccountDetailsForm user={user} onUpdated={handleProfileUpdate} />
      </GlassCard>

      <GlassCard style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 14 }}>Change password</h3>
        <ChangePasswordForm />
      </GlassCard>

      <div style={{ marginBottom: 20 }}>
        <DeleteAccountPanel />
      </div>
    </>
  );
}
