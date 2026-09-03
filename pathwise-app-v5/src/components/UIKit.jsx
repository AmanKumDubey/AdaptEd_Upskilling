import { T } from "../theme";

export function GlassCard({ children, style, hover = true, className = "" }) {
  return (
    <div
      className={`glass-card ${hover ? "glass-hover" : ""} ${className}`}
      style={{
        background: T.surface,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        boxShadow: T.shadow,
        padding: 24,
        transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ProgressRing({
  progress,
  size = 56,
  stroke = 4.5,
  color = T.blue,
  bg = "rgba(148,163,184,0.12)",
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  const offset = circumference - (safeProgress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`${safeProgress}% complete`}
      role="img"
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bg} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}

export function Badge({ children, variant = "blue" }) {
  const styles = {
    blue: { background: T.bluePale, color: T.blue, border: "1px solid rgba(37,99,235,0.15)" },
    green: { background: T.greenBg, color: T.green, border: "1px solid rgba(16,185,129,0.15)" },
    amber: { background: T.amberBg, color: "#D97706", border: "1px solid rgba(245,158,11,0.15)" },
    rose: { background: T.roseBg, color: T.rose, border: "1px solid rgba(244,63,94,0.12)" },
    violet: { background: T.violetBg, color: T.violet, border: "1px solid rgba(139,92,246,0.12)" },
    muted: { background: "rgba(148,163,184,0.08)", color: T.muted, border: "1px solid rgba(148,163,184,0.12)" },
  };

  return (
    <span
      style={{
        ...styles[variant],
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.01em",
        fontFamily: "'Outfit'",
      }}
    >
      {children}
    </span>
  );
}

export function Star({ filled = true }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={filled ? "#F59E0B" : "none"}
      stroke="#F59E0B"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
