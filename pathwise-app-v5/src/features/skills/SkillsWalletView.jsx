import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, GlassCard, ProgressRing } from "../../components/UIKit";
import { T } from "../../theme";
import { useProfile, useAssessmentResult, useCourseProgress } from "../../state/PathwiseDataContext";
import { getCertificates } from "../courses/courseStorage";
import { useCertificates, useMyWalletShare } from "../../hooks";
import { useSkillsWallet } from "./skillsEngine";

const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

const LEVEL_COLOR = (level) => (level >= 80 ? T.green : level >= 60 ? T.blue : level >= 40 ? T.amber : T.rose);
const LEVEL_LABEL = (level) => (level >= 80 ? "Expert" : level >= 60 ? "Advanced" : level >= 40 ? "Intermediate" : "Beginner");

// Real certificates (uploaded via the actual course-completion flow, see
// certificateController.js) have a different shape than the mock ones this
// wallet used to show exclusively - normalized here so CertificatesSection
// doesn't need to know which mode produced them.
function toWalletCertificate(realCertificate) {
  const platform = realCertificate.course?.platform || "coursera";
  return {
    id: realCertificate.id,
    courseTitle: realCertificate.course?.title || "Course",
    provider: platform.charAt(0).toUpperCase() + platform.slice(1),
    issuedAt: realCertificate.uploadedAt,
  };
}

// ─── Skills Wallet ───────────────────────────────────────────────────
export function SkillsWalletView() {
  const [profile] = useProfile();
  const [result] = useAssessmentResult();
  const [courseProgress] = useCourseProgress();
  const [shared, setShared] = useState(false);

  const wallet = useSkillsWallet();
  // Always called (not conditionally) - authEnabled is a fixed build-time
  // value, so hook-call order never actually varies between renders.
  const realCertificates = useCertificates();
  // Phase B29: a real, public, read-only wallet page (GET /public/wallet/:token) -
  // replaces the old clipboard-text-summary "share", which wasn't actually
  // shareable to anyone without the raw text being pasted somewhere.
  const walletShare = useMyWalletShare();
  const certificates = useMemo(
    () => (authEnabled
      ? (realCertificates.data || []).map(toWalletCertificate)
      : getCertificates(courseProgress)),
    [realCertificates.data, courseProgress],
  );

  async function shareWallet() {
    const linkText = authEnabled && walletShare.data?.token
      ? `${window.location.origin}/wallet/${walletShare.data.token}`
      : [
          `${profile?.firstName || "Learner"}'s Pathwise Skills Wallet`,
          `${wallet.stats.totalSkills} skills · ${wallet.stats.verified} verified · ${wallet.stats.avgProficiency}% avg. proficiency`,
          ...wallet.skills.slice(0, 5).map((skill) => `- ${skill.name}: ${skill.level}% (${LEVEL_LABEL(skill.level)})`),
        ].join("\n");
    try {
      await navigator.clipboard.writeText(linkText);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Clipboard access can be blocked; the wallet itself still renders correctly.
    }
  }

  return (
    <div>
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'General Sans'", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>Skills Wallet</h1>
            <p style={{ color: T.muted, fontSize: 14.5 }}>Your verified credentials & skill portfolio</p>
          </div>
          <button className="btn-primary" style={{ fontSize: 13 }} onClick={shareWallet}>{shared ? "Copied ✓" : "Share Wallet ↗"}</button>
        </div>
      </div>

      {wallet.isEmpty ? (
        <SkillsWalletEmptyState profile={profile} result={result} />
      ) : (
        <>
          <div className="fade-up s1 grid-4col" style={{ marginBottom: 28 }}>
            {[
              { label: "Total Skills", value: String(wallet.stats.totalSkills), icon: "❖", color: T.blue },
              { label: "Verified", value: String(wallet.stats.verified), icon: "✓", color: T.green },
              { label: "Avg. Proficiency", value: `${wallet.stats.avgProficiency}%`, icon: "◈", color: T.amber },
              { label: "Courses Done", value: String(wallet.stats.coursesCompleted), icon: "◉", color: T.violet },
            ].map((s, i) => (
              <GlassCard key={i} style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.7 }}>{s.icon}</div>
                <div className="stat-num" style={{ fontSize: 26, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>{s.label}</div>
              </GlassCard>
            ))}
          </div>

          <div className="fade-up s2" style={{ display: "grid", gap: 10, marginBottom: 28 }}>
            {wallet.skills.map((s) => (
              <GlassCard key={s.name} style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <ProgressRing progress={s.level} size={50} stroke={4} color={LEVEL_COLOR(s.level)} />
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
                      <span className="stat-num" style={{ fontSize: 12, color: LEVEL_COLOR(s.level) }}>{s.level}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{s.name}</span>
                      {s.verified && <Badge variant="green">Verified ✓</Badge>}
                      <Badge variant="muted">{s.category}</Badge>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.muted }}>
                      <span>{s.courses} course{s.courses === 1 ? "" : "s"}</span>
                      {s.assessed && <span>Assessed {s.assessed}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", marginRight: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: LEVEL_COLOR(s.level), marginBottom: 6 }}>{LEVEL_LABEL(s.level)}</div>
                    <div style={{ width: 110, height: 5, background: "rgba(148,163,184,0.08)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${s.level}%`, background: LEVEL_COLOR(s.level), borderRadius: 3, transition: "width 1s" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {!s.verified && <Link to="/assessment" className="btn-primary" style={{ fontSize: 11.5, padding: "6px 14px" }}>Verify</Link>}
                    <Link to="/courses" className="btn-ghost" style={{ fontSize: 11.5, padding: "6px 14px" }}>Details</Link>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <CertificatesSection certificates={certificates} />
        </>
      )}
    </div>
  );
}

function CertificatesSection({ certificates }) {
  return (
    <div className="fade-up s3">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'General Sans'", fontSize: 19, fontWeight: 700, color: T.navy }}>Certificates</h2>
        <span style={{ fontSize: 12, color: T.muted }}>{certificates.length} earned</span>
      </div>

      {certificates.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {certificates.map((certificate) => (
            <GlassCard key={certificate.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>🎓</span>
                {/* Phase B23: "Verified" overstated what this is - the
                    backend only checks the upload belongs to this user and
                    course, not that the document is authentic (see
                    userCourseController.js's completeCourse comment). */}
                <Badge variant="green">Submitted ✓</Badge>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, marginBottom: 4, lineHeight: 1.35 }}>{certificate.courseTitle}</div>
              <div style={{ fontSize: 12, color: T.muted }}>{certificate.provider}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
                Issued {new Date(certificate.issuedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <GlassCard style={{ padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
            Complete a course to earn your first certificate. <Link to="/courses" style={{ color: T.blue, fontWeight: 600 }}>Explore courses →</Link>
          </p>
        </GlassCard>
      )}
    </div>
  );
}

function SkillsWalletEmptyState({ profile, result }) {
  const guidance = !profile?.onboardingCompleted
    ? { title: "Complete your profile first", message: "Onboarding captures the skills you already have, so your wallet has something to start from.", actionLabel: "Start onboarding", actionTo: "/onboarding" }
    : !result
      ? { title: "Take your skills assessment", message: "An assessment verifies your skill levels and unlocks proficiency scoring for your wallet.", actionLabel: "Start assessment", actionTo: "/assessment" }
      : { title: "No skills tracked yet", message: "Enroll in and complete a course to start building verified skill evidence.", actionLabel: "Explore courses", actionTo: "/courses" };

  return (
    <GlassCard className="fade-up s1" style={{ padding: 48, textAlign: "center", maxWidth: 480, margin: "40px auto" }}>
      <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>❖</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.navy, marginBottom: 8 }}>{guidance.title}</div>
      <p style={{ fontSize: 13.5, color: T.muted, marginBottom: 18, lineHeight: 1.55 }}>{guidance.message}</p>
      <Link to={guidance.actionTo} className="btn-primary" style={{ fontSize: 13 }}>{guidance.actionLabel} →</Link>
    </GlassCard>
  );
}
