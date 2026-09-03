import { Link } from "react-router-dom";
import { T } from "../theme";

export function NotFoundPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: `linear-gradient(160deg, #F0F7FF, ${T.bg}, #F5F0FF)`, color: T.navy, fontFamily: "'Outfit', sans-serif" }}>
      <section style={{ textAlign: "center", maxWidth: 520 }}>
        <div style={{ color: T.blue, fontWeight: 800, letterSpacing: "0.14em", marginBottom: 12 }}>404</div>
        <h1 style={{ fontSize: 40, marginBottom: 12 }}>This path does not exist</h1>
        <p style={{ color: T.muted, lineHeight: 1.7, marginBottom: 24 }}>The page may have moved, or the URL may be incorrect.</p>
        <Link to="/dashboard" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>Return to dashboard</Link>
      </section>
    </main>
  );
}
