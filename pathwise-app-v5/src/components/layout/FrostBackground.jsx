export const FrostBackground = () => (
  <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div style={{ position: "absolute", top: -120, right: -80, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.08), rgba(37,99,235,0.02) 50%, transparent 70%)", filter: "blur(40px)" }} />
    <div style={{ position: "absolute", top: "40%", left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(103,232,249,0.07), transparent 65%)", filter: "blur(50px)" }} />
    <div style={{ position: "absolute", bottom: -80, right: "30%", width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.05), transparent 60%)", filter: "blur(45px)" }} />
    <div style={{ position: "absolute", top: "20%", right: "20%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.05), transparent 65%)", filter: "blur(30px)" }} />
    {/* Noise texture overlay */}
    <div style={{ position: "absolute", inset: 0, opacity: 0.3, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")` }} />
  </div>
);
