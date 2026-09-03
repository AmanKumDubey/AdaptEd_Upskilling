import { useState } from "react";
// Real 400-question bank (AdaptEd_Question_Bank.xlsx), curated down to 20
// well-distributed questions per persona (4 per domain, spread across
// difficulty) - see features/assessment/questionBank.json. Replaces the
// previous 10-per-persona hardcoded placeholder set.
import questionBankData from "./features/assessment/questionBank.json";

// ─── FRAMEWORKS DATA ────────────────────────────────────────────────
const FRAMEWORKS = [
  {
    name: "SFIA 9",
    full: "Skills Framework for the Information Age",
    origin: "UK / Global",
    levels: "7 levels of responsibility",
    relevance: "Industry standard for IT/digital skills across 120+ countries. Maps AI, data, and digital skills to professional competency levels.",
    url: "sfia-online.org",
    color: "#2563EB"
  },
  {
    name: "e-CF 4.0",
    full: "European e-Competence Framework",
    origin: "EU / CEN",
    levels: "5 proficiency levels (e-1 to e-5)",
    relevance: "EN 16234-1 standard. Covers 41 competences including AI, data analytics, and technology management across European enterprises.",
    url: "ecompetences.eu",
    color: "#7C3AED"
  },
  {
    name: "DigComp 2.2",
    full: "Digital Competence Framework",
    origin: "EU / JRC",
    levels: "8 proficiency levels (Foundation → Highly Specialised)",
    relevance: "Ideal for non-technical personas. Covers digital literacy, data literacy, problem-solving, and AI interaction skills.",
    url: "ec.europa.eu",
    color: "#059669"
  },
  {
    name: "NICE / NIST",
    full: "National Initiative for Cybersecurity Education",
    origin: "USA / NIST",
    levels: "Task-based with KSA mapping",
    relevance: "Critical for AI governance, security, and risk management competencies. Maps to manager oversight roles.",
    url: "nist.gov/nice",
    color: "#DC2626"
  },
  {
    name: "Bloom's Taxonomy",
    full: "Revised Bloom's Taxonomy of Learning",
    origin: "Academic / Global",
    levels: "6 cognitive levels (Remember → Create)",
    relevance: "Pedagogical backbone for structuring assessment questions and learning progressions across all personas.",
    url: "Academic standard",
    color: "#D97706"
  },
  {
    name: "O*NET",
    full: "Occupational Information Network",
    origin: "USA / DOL",
    levels: "Skill-level scales (1–7)",
    relevance: "US labor market standard. Maps emerging AI/ML job roles, knowledge domains, and skill adjacencies for upskilling paths.",
    url: "onetonline.org",
    color: "#0891B2"
  }
];

// ─── SKILL LEVELS ───────────────────────────────────────────────────
const SKILL_LEVELS = [
  { level: 0, name: "Awareness", sfia: "SFIA 1–2", ecf: "e-1", digcomp: "Foundation", bloom: "Remember / Understand", color: "#94A3B8", description: "Can define basic concepts and recognize terminology. Understands what AI/ML is at a conceptual level." },
  { level: 1, name: "Foundation", sfia: "SFIA 2–3", ecf: "e-2", digcomp: "Intermediate", bloom: "Understand / Apply", color: "#3B82F6", description: "Can explain core principles, use existing AI tools, and follow established workflows. Understands data fundamentals." },
  { level: 2, name: "Practitioner", sfia: "SFIA 3–4", ecf: "e-3", digcomp: "Advanced", bloom: "Apply / Analyze", color: "#8B5CF6", description: "Can independently apply AI/ML techniques, build models, evaluate results, and make data-driven recommendations." },
  { level: 3, name: "Advanced", sfia: "SFIA 5–6", ecf: "e-4", digcomp: "Highly Specialised", bloom: "Analyze / Evaluate", color: "#F59E0B", description: "Can architect AI solutions, lead technical teams, evaluate complex trade-offs, and drive organizational AI strategy." },
  { level: 4, name: "Expert", sfia: "SFIA 6–7", ecf: "e-5", digcomp: "Highly Specialised+", bloom: "Evaluate / Create", color: "#EF4444", description: "Can innovate new approaches, set industry standards, mentor others, and drive transformational AI initiatives." }
];

// ─── PERSONAS ────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const PERSONAS = {
  tech: {
    id: "tech",
    title: "Tech → AI Upskill",
    subtitle: "Software engineers & developers moving into AI/ML",
    icon: "⚡",
    color: "#3B82F6",
    gradient: "linear-gradient(135deg, #1E40AF, #3B82F6)",
    frameworks: ["SFIA 9", "e-CF 4.0", "Bloom's Taxonomy"],
    domains: ["ML Fundamentals", "Neural Networks & Deep Learning", "MLOps & Production", "AI Architecture & Systems", "Model Evaluation & Validation"]
  },
  data: {
    id: "data",
    title: "Data Science Update",
    subtitle: "Data professionals updating to modern AI/ML stack",
    icon: "📊",
    color: "#8B5CF6",
    gradient: "linear-gradient(135deg, #5B21B6, #8B5CF6)",
    frameworks: ["SFIA 9", "e-CF 4.0", "O*NET"],
    domains: ["Advanced ML", "GenAI & LLMs", "MLOps & Deployment", "Experiment Design", "AI Ethics & Governance"]
  },
  nontech: {
    id: "nontech",
    title: "Non-Tech AI Literacy",
    subtitle: "Business professionals building foundational AI skills",
    icon: "🌱",
    color: "#059669",
    gradient: "linear-gradient(135deg, #047857, #059669)",
    frameworks: ["DigComp 2.2", "Bloom's Taxonomy", "O*NET"],
    domains: ["AI Concepts", "Prompt Engineering", "Data Literacy", "AI Tools & Applications", "Ethical Awareness"]
  },
  manager: {
    id: "manager",
    title: "AI Management",
    subtitle: "Leaders overseeing AI teams, budgets, and governance",
    icon: "🎯",
    color: "#DC2626",
    gradient: "linear-gradient(135deg, #991B1B, #DC2626)",
    frameworks: ["SFIA 9", "NICE/NIST", "e-CF 4.0"],
    domains: ["AI Strategy", "Risk & Governance", "Team Leadership", "Vendor Evaluation", "ROI & Metrics"]
  }
};

// ─── QUIZ DATA ──────────────────────────────────────────────────────
// 20 questions per persona (4 per domain, spread across difficulty),
// sourced from AdaptEd_Question_Bank.xlsx's real 400-question bank -
// see features/assessment/questionBank.json for the curated selection
// and the script that produced it.
export const QUIZZES = questionBankData;

// ─── LEARNING PATHS ─────────────────────────────────────────────────
const LEARNING_PATHS = {
  tech: {
    0: { current: "Awareness", next: "Foundation", duration: "8–10 weeks", modules: [
      { name: "Python for ML Foundations", hours: 20, type: "Course" },
      { name: "Mathematics for ML (Linear Algebra, Calculus, Probability)", hours: 30, type: "Course" },
      { name: "Intro to Scikit-learn & Pandas", hours: 15, type: "Lab" },
      { name: "Supervised Learning: Regression & Classification", hours: 20, type: "Course + Project" },
      { name: "Capstone: Build a prediction model on a public dataset", hours: 10, type: "Project" }
    ]},
    1: { current: "Foundation", next: "Practitioner", duration: "10–12 weeks", modules: [
      { name: "Deep Learning Fundamentals (CNNs, RNNs, Transformers)", hours: 30, type: "Course" },
      { name: "PyTorch / TensorFlow Hands-on", hours: 25, type: "Lab" },
      { name: "Feature Engineering & Model Selection", hours: 15, type: "Workshop" },
      { name: "MLOps Foundations (Docker, CI/CD for ML, Model Registry)", hours: 20, type: "Course + Lab" },
      { name: "Capstone: End-to-end ML pipeline with deployment", hours: 15, type: "Project" }
    ]},
    2: { current: "Practitioner", next: "Advanced", duration: "12–16 weeks", modules: [
      { name: "Advanced NLP & Large Language Models", hours: 25, type: "Course" },
      { name: "RAG Architecture & Vector Databases", hours: 20, type: "Lab" },
      { name: "Distributed Training & Model Optimization", hours: 20, type: "Workshop" },
      { name: "ML System Design Patterns", hours: 20, type: "Course" },
      { name: "Capstone: Design and build a production AI system", hours: 20, type: "Project" }
    ]},
    3: { current: "Advanced", next: "Expert", duration: "16–20 weeks", modules: [
      { name: "Research Paper Reading & Implementation", hours: 30, type: "Seminar" },
      { name: "Multi-modal AI Systems", hours: 25, type: "Course + Lab" },
      { name: "AI Architecture for Enterprise Scale", hours: 20, type: "Workshop" },
      { name: "Mentoring & Technical Leadership", hours: 15, type: "Practicum" },
      { name: "Capstone: Novel contribution or open-source project", hours: 25, type: "Project" }
    ]},
    4: { current: "Expert", next: "Continued Mastery", duration: "Ongoing", modules: [
      { name: "Conference Presentations & Thought Leadership", hours: 20, type: "Practicum" },
      { name: "Cross-domain AI Innovation (Biotech, Climate, Finance)", hours: 25, type: "Seminar" },
      { name: "Organizational AI Strategy & Transformation", hours: 15, type: "Executive Workshop" },
      { name: "Patent & IP Development for AI Innovations", hours: 10, type: "Workshop" },
      { name: "Ongoing: Mentor emerging AI practitioners", hours: 10, type: "Practicum" }
    ]}
  },
  data: {
    0: { current: "Awareness", next: "Foundation", duration: "6–8 weeks", modules: [
      { name: "Modern ML Stack Overview (2024–2026)", hours: 15, type: "Course" },
      { name: "LLM Fundamentals: Architecture, Tokenization, Prompting", hours: 20, type: "Course" },
      { name: "Intro to Generative AI Applications", hours: 15, type: "Lab" },
      { name: "Refresher: Statistical Foundations for Modern ML", hours: 15, type: "Workshop" },
      { name: "Capstone: Compare traditional ML vs LLM approach on a task", hours: 10, type: "Project" }
    ]},
    1: { current: "Foundation", next: "Practitioner", duration: "10–12 weeks", modules: [
      { name: "Advanced Prompt Engineering & Chain-of-Thought", hours: 15, type: "Lab" },
      { name: "Fine-tuning LLMs (LoRA, QLoRA, RLHF)", hours: 25, type: "Course + Lab" },
      { name: "RAG Pipelines: Design, Chunking, Retrieval Strategies", hours: 20, type: "Lab" },
      { name: "MLOps for LLMs (Evaluation, Monitoring, Deployment)", hours: 20, type: "Course" },
      { name: "Capstone: Build a domain-specific RAG application", hours: 15, type: "Project" }
    ]},
    2: { current: "Practitioner", next: "Advanced", duration: "12–14 weeks", modules: [
      { name: "Advanced GenAI: Agents, Tool Use, Multi-step Reasoning", hours: 25, type: "Course" },
      { name: "Fairness, Bias Auditing & Model Governance", hours: 20, type: "Workshop" },
      { name: "Experiment Design for AI Systems (A/B, Bayesian)", hours: 20, type: "Course" },
      { name: "Scalable ML Infrastructure (Feature Stores, Orchestration)", hours: 20, type: "Lab" },
      { name: "Capstone: Implement AI governance for a production model", hours: 15, type: "Project" }
    ]},
    3: { current: "Advanced", next: "Expert", duration: "14–18 weeks", modules: [
      { name: "Multi-modal Models & Cross-domain Transfer", hours: 25, type: "Course" },
      { name: "AI Safety, Alignment & Regulatory Landscape", hours: 20, type: "Seminar" },
      { name: "Leading Data Science Teams & AI Product Strategy", hours: 15, type: "Executive Workshop" },
      { name: "Publishing & Contributing to AI Research", hours: 20, type: "Practicum" },
      { name: "Capstone: Lead an enterprise AI transformation initiative", hours: 20, type: "Project" }
    ]},
    4: { current: "Expert", next: "Continued Mastery", duration: "Ongoing", modules: [
      { name: "Frontier Research Engagement", hours: 20, type: "Seminar" },
      { name: "Industry Standards Development & Advisory Roles", hours: 15, type: "Practicum" },
      { name: "Cross-functional AI Strategy for C-suite", hours: 15, type: "Executive Workshop" },
      { name: "Open-source Contributions & Community Leadership", hours: 15, type: "Practicum" },
      { name: "Ongoing: Peer review, mentoring, speaking", hours: 10, type: "Practicum" }
    ]}
  },
  nontech: {
    0: { current: "Awareness", next: "Foundation", duration: "4–6 weeks", modules: [
      { name: "What is AI? Core Concepts Demystified", hours: 8, type: "Course" },
      { name: "AI in Your Industry: Real-world Use Cases", hours: 6, type: "Workshop" },
      { name: "Data Literacy 101: Reading Charts, Understanding Metrics", hours: 8, type: "Course" },
      { name: "Hands-on: Your First AI Tool (ChatGPT / Claude)", hours: 5, type: "Lab" },
      { name: "Capstone: Identify 3 AI opportunities in your workflow", hours: 3, type: "Project" }
    ]},
    1: { current: "Foundation", next: "Practitioner", duration: "6–8 weeks", modules: [
      { name: "Prompt Engineering for Business Professionals", hours: 10, type: "Workshop" },
      { name: "AI-Powered Productivity (Document Analysis, Summarization)", hours: 10, type: "Lab" },
      { name: "Data-Driven Decision Making", hours: 10, type: "Course" },
      { name: "AI Ethics & Responsible Use in the Workplace", hours: 8, type: "Course" },
      { name: "Capstone: Automate a business process using AI tools", hours: 5, type: "Project" }
    ]},
    2: { current: "Practitioner", next: "Advanced", duration: "8–10 weeks", modules: [
      { name: "Advanced AI Tools: Workflows, Integrations, Automation", hours: 12, type: "Lab" },
      { name: "Understanding AI Outputs: Confidence, Limitations, Bias", hours: 10, type: "Course" },
      { name: "AI Project Scoping for Business Stakeholders", hours: 8, type: "Workshop" },
      { name: "Communicating with Technical AI Teams", hours: 8, type: "Workshop" },
      { name: "Capstone: Write a business case for an AI initiative", hours: 5, type: "Project" }
    ]},
    3: { current: "Advanced", next: "Expert", duration: "10–12 weeks", modules: [
      { name: "AI Strategy & Competitive Intelligence", hours: 12, type: "Course" },
      { name: "Evaluating AI Vendors & Solutions", hours: 8, type: "Workshop" },
      { name: "Leading AI-Augmented Teams", hours: 10, type: "Workshop" },
      { name: "Regulatory Awareness (EU AI Act, NIST AI RMF)", hours: 8, type: "Course" },
      { name: "Capstone: Present AI transformation roadmap to leadership", hours: 5, type: "Project" }
    ]},
    4: { current: "Expert", next: "Continued Mastery", duration: "Ongoing", modules: [
      { name: "AI Evangelist: Training & Mentoring Colleagues", hours: 10, type: "Practicum" },
      { name: "Cross-functional AI Innovation Workshops", hours: 8, type: "Workshop" },
      { name: "Staying Current: AI Trends & Emerging Tools", hours: 8, type: "Seminar" },
      { name: "Ongoing: Champion AI literacy across the organization", hours: 5, type: "Practicum" }
    ]}
  },
  manager: {
    0: { current: "Awareness", next: "Foundation", duration: "6–8 weeks", modules: [
      { name: "AI for Executives: Capabilities, Limitations & Opportunities", hours: 10, type: "Course" },
      { name: "The AI Project Lifecycle: From Ideation to Production", hours: 8, type: "Course" },
      { name: "Data Governance Fundamentals", hours: 8, type: "Course" },
      { name: "AI Risk 101: Bias, Privacy, Security", hours: 8, type: "Workshop" },
      { name: "Capstone: Evaluate an AI vendor pitch critically", hours: 5, type: "Project" }
    ]},
    1: { current: "Foundation", next: "Practitioner", duration: "8–10 weeks", modules: [
      { name: "Building & Structuring AI Teams", hours: 12, type: "Course" },
      { name: "AI Project Management: Agile for ML", hours: 10, type: "Workshop" },
      { name: "AI Governance Frameworks (NIST AI RMF, ISO 42001)", hours: 12, type: "Course" },
      { name: "Measuring AI ROI: Metrics That Matter", hours: 10, type: "Workshop" },
      { name: "Capstone: Create an AI governance policy for your org", hours: 8, type: "Project" }
    ]},
    2: { current: "Practitioner", next: "Advanced", duration: "10–12 weeks", modules: [
      { name: "Enterprise AI Strategy & Roadmapping", hours: 15, type: "Course" },
      { name: "Regulatory Deep Dive: EU AI Act, Sector-specific Rules", hours: 12, type: "Course" },
      { name: "AI Vendor Due Diligence & Contract Negotiation", hours: 10, type: "Workshop" },
      { name: "Change Management for AI Transformation", hours: 10, type: "Workshop" },
      { name: "Capstone: Present a board-level AI strategy", hours: 8, type: "Project" }
    ]},
    3: { current: "Advanced", next: "Expert", duration: "12–16 weeks", modules: [
      { name: "AI Ethics Board Design & Operation", hours: 12, type: "Seminar" },
      { name: "AI M&A Due Diligence & IP Valuation", hours: 10, type: "Workshop" },
      { name: "Cross-industry AI Benchmarking", hours: 10, type: "Course" },
      { name: "Executive AI Communication & Stakeholder Management", hours: 8, type: "Practicum" },
      { name: "Capstone: Lead an enterprise-wide AI transformation program", hours: 12, type: "Project" }
    ]},
    4: { current: "Expert", next: "Continued Mastery", duration: "Ongoing", modules: [
      { name: "Industry Advisory & Standards Contribution", hours: 12, type: "Practicum" },
      { name: "AI Policy Advocacy & Regulatory Engagement", hours: 10, type: "Seminar" },
      { name: "Board-level AI Governance", hours: 8, type: "Executive Workshop" },
      { name: "Ongoing: Thought leadership, speaking, mentoring", hours: 10, type: "Practicum" }
    ]}
  }
};

// ─── STYLES ─────────────────────────────────────────────────────────
const typeScale = {
  xs: "0.72rem", sm: "0.83rem", base: "0.95rem", lg: "1.12rem",
  xl: "1.35rem", "2xl": "1.6rem", "3xl": "2rem", "4xl": "2.7rem"
};

// ─── MAIN APP ───────────────────────────────────────────────────────
export default function App({ onExit }) {
  const [screen, setScreen] = useState("home"); // home, frameworks, persona-select, quiz, results
  const [persona, setPersona] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [fadeIn, setFadeIn] = useState(true);

  const transition = (nextScreen) => {
    setFadeIn(false);
    setTimeout(() => { setScreen(nextScreen); setFadeIn(true); }, 250);
  };

  const startQuiz = (p) => {
    setPersona(p);
    setCurrentQ(0);
    setAnswers([]);
    transition("quiz");
  };

  const answerQuestion = (idx) => {
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    if (currentQ < QUIZZES[persona].length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      transition("results");
    }
  };

  const calcScore = () => {
    if (!persona || answers.length === 0) return { score: 0, level: 0, pct: 0 };
    const quiz = QUIZZES[persona];
    let weighted = 0, maxWeighted = 0;
    quiz.forEach((q, i) => {
      const w = q.difficulty + 1;
      maxWeighted += w;
      if (answers[i] === q.correct) weighted += w;
    });
    const pct = Math.round((weighted / maxWeighted) * 100);
    let level;
    if (pct < 20) level = 0;
    else if (pct < 40) level = 1;
    else if (pct < 60) level = 2;
    else if (pct < 80) level = 3;
    else level = 4;
    return { score: weighted, maxScore: maxWeighted, pct, level };
  };

  const domainScores = () => {
    if (!persona) return [];
    const quiz = QUIZZES[persona];
    const domains = {};
    quiz.forEach((q, i) => {
      if (!domains[q.domain]) domains[q.domain] = { correct: 0, total: 0 };
      domains[q.domain].total++;
      if (answers[i] === q.correct) domains[q.domain].correct++;
    });
    return Object.entries(domains).map(([name, d]) => ({
      name, correct: d.correct, total: d.total, pct: Math.round((d.correct / d.total) * 100)
    }));
  };

  // ─── SHARED STYLES ─────────────────
  const containerStyle = {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "var(--background, #0F0F14)",
    color: "var(--text-primary, #E8E6E3)",
    minHeight: "100vh",
    padding: "0",
    margin: "0",
    overflowX: "hidden",
    transition: "opacity 0.25s ease",
    opacity: fadeIn ? 1 : 0
  };

  const cardBase = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "20px",
    transition: "all 0.2s ease"
  };

  const btnPrimary = (color = "#3B82F6") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: typeScale.base,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "inherit"
  });

  const btnSecondary = {
    background: "transparent",
    color: "var(--text-primary, #E8E6E3)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    padding: "10px 20px",
    fontSize: typeScale.sm,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "inherit"
  };

  const sectionPad = { maxWidth: "900px", margin: "0 auto", padding: "32px 24px" };

  // ─── NAV BAR ──────────────────────
  const NavBar = () => (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(15,15,20,0.92)", backdropFilter: "blur(12px)", zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }} onClick={() => transition("home")}>
        <div style={{ width: 28, height: 28, borderRadius: "6px", background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}>A</div>
        <span style={{ fontSize: typeScale.lg, fontWeight: 700, letterSpacing: "-0.02em" }}>AdaptEd</span>
        <span style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.35)", marginLeft: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Skills Platform</span>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        {onExit && <button style={btnSecondary} onClick={onExit}>Pathwise Dashboard</button>}
        {screen !== "home" && <button style={btnSecondary} onClick={() => transition("home")}>Home</button>}
        <button style={btnSecondary} onClick={() => transition("frameworks")}>Frameworks</button>
        <button style={{...btnPrimary("#3B82F6"), padding: "10px 20px", fontSize: typeScale.sm}} onClick={() => transition("persona-select")}>Take Assessment</button>
      </div>
    </div>
  );

  // ─── HOME SCREEN ──────────────────
  const HomeScreen = () => (
    <div>
      <div style={{ textAlign: "center", padding: "72px 24px 48px", background: "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, transparent 100%)" }}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.2em", color: "#3B82F6", marginBottom: 16, fontWeight: 600 }}>Enterprise AI Upskilling</div>
        <h1 style={{ fontSize: typeScale["4xl"], fontWeight: 800, lineHeight: 1.1, margin: "0 0 16px", letterSpacing: "-0.03em", maxWidth: 700, marginLeft: "auto", marginRight: "auto" }}>
          Assess. Map. <span style={{ color: "#3B82F6" }}>Upskill.</span>
        </h1>
        <p style={{ fontSize: typeScale.lg, color: "rgba(255,255,255,0.5)", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Skills assessment mapped to globally recognized frameworks — SFIA, e-CF, DigComp, NIST — with personalized learning paths for every role.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button style={btnPrimary()} onClick={() => transition("persona-select")}>Start Assessment →</button>
          <button style={btnSecondary} onClick={() => transition("frameworks")}>View Frameworks</button>
        </div>
      </div>

      <div style={sectionPad}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginBottom: 20, fontWeight: 600 }}>Four Personas</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {Object.values(PERSONAS).map(p => (
            <div key={p.id} style={{ ...cardBase, cursor: "pointer", borderColor: hoveredCard === p.id ? p.color + "60" : "rgba(255,255,255,0.08)" }}
              onClick={() => startQuiz(p.id)}
              onMouseEnter={() => setHoveredCard(p.id)}
              onMouseLeave={() => setHoveredCard(null)}>
              <div style={{ fontSize: "28px", marginBottom: 8 }}>{p.icon}</div>
              <div style={{ fontSize: typeScale.base, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{p.subtitle}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sectionPad}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", marginBottom: 20, fontWeight: 600 }}>How It Works</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { step: "01", title: "Assess", desc: "10-question quiz calibrated to Bloom's Taxonomy levels, domain-specific for your role." },
            { step: "02", title: "Map", desc: "Scores mapped to SFIA / e-CF / DigComp levels with domain-by-domain breakdown." },
            { step: "03", title: "Upskill", desc: "Curated learning path to reach the next competency level with hours, formats, and milestones." }
          ].map(s => (
            <div key={s.step} style={cardBase}>
              <div style={{ fontSize: typeScale["2xl"], fontWeight: 800, color: "#3B82F6", marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>{s.step}</div>
              <div style={{ fontSize: typeScale.base, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── FRAMEWORKS SCREEN ────────────
  const FrameworksScreen = () => (
    <div style={sectionPad}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.15em", color: "#3B82F6", marginBottom: 8, fontWeight: 600 }}>Reference</div>
        <h2 style={{ fontSize: typeScale["2xl"], fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Skills Assessment Frameworks</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", marginTop: 8, fontSize: typeScale.base, lineHeight: 1.6 }}>
          Globally recognized frameworks used to define, assess, and benchmark AI and digital competency levels across enterprise roles.
        </p>
      </div>
      <div style={{ display: "grid", gap: "12px" }}>
        {FRAMEWORKS.map(f => (
          <div key={f.name} style={{ ...cardBase, borderLeft: `3px solid ${f.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: typeScale.lg, fontWeight: 700 }}>{f.name}</div>
                <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.45)" }}>{f.full}</div>
              </div>
              <div style={{ fontSize: typeScale.xs, padding: "4px 10px", borderRadius: "4px", background: f.color + "20", color: f.color, fontWeight: 600 }}>{f.origin}</div>
            </div>
            <div style={{ marginTop: 10, fontSize: typeScale.sm, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{f.relevance}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 16, fontSize: typeScale.xs, color: "rgba(255,255,255,0.35)" }}>
              <span>Levels: {f.levels}</span>
              <span>{f.url}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, marginBottom: 20 }}>
        <h3 style={{ fontSize: typeScale.xl, fontWeight: 700, marginBottom: 12 }}>Unified Skill Level Mapping</h3>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: typeScale.sm, lineHeight: 1.6, marginBottom: 16 }}>
          How assessment results map across frameworks:
        </p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: typeScale.sm }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              {["Level", "Name", "SFIA", "e-CF", "DigComp", "Bloom's"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SKILL_LEVELS.map(s => (
              <tr key={s.level} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "10px 12px" }}><span style={{ display: "inline-block", width: 24, height: 24, borderRadius: "50%", background: s.color, color: "#fff", textAlign: "center", lineHeight: "24px", fontSize: typeScale.xs, fontWeight: 700 }}>{s.level}</span></td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{s.sfia}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{s.ecf}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{s.digcomp}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{s.bloom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── PERSONA SELECT ───────────────
  const PersonaSelect = () => (
    <div style={sectionPad}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.15em", color: "#3B82F6", marginBottom: 8, fontWeight: 600 }}>Step 1</div>
        <h2 style={{ fontSize: typeScale["2xl"], fontWeight: 800, margin: 0 }}>Select Your Profile</h2>
        <p style={{ color: "rgba(255,255,255,0.45)", marginTop: 8, fontSize: typeScale.base }}>Choose the persona that best matches your current role and learning goals.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {Object.values(PERSONAS).map(p => (
          <div key={p.id}
            style={{ ...cardBase, cursor: "pointer", borderColor: hoveredCard === p.id ? p.color + "60" : "rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}
            onClick={() => startQuiz(p.id)}
            onMouseEnter={() => setHoveredCard(p.id)}
            onMouseLeave={() => setHoveredCard(null)}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: p.gradient, opacity: 0.1, borderRadius: "0 12px 0 80px" }} />
            <div style={{ fontSize: "36px", marginBottom: 12 }}>{p.icon}</div>
            <div style={{ fontSize: typeScale.lg, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.45)", marginBottom: 12, lineHeight: 1.5 }}>{p.subtitle}</div>
            <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.3)" }}>
              Frameworks: {p.frameworks.join(" · ")}
            </div>
            <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              Domains: {p.domains.join(" · ")}
            </div>
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: typeScale.sm, color: p.color, fontWeight: 600 }}>Start Quiz →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── QUIZ SCREEN ──────────────────
  const QuizScreen = () => {
    const quiz = QUIZZES[persona];
    const q = quiz[currentQ];
    const p = PERSONAS[persona];
    const progress = ((currentQ) / quiz.length) * 100;

    return (
      <div style={sectionPad}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: "24px" }}>{p.icon}</span>
          <div>
            <div style={{ fontSize: typeScale.base, fontWeight: 700 }}>{p.title}</div>
            <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.4)" }}>Question {currentQ + 1} of {quiz.length}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 32, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: p.color, borderRadius: 2, transition: "width 0.3s ease" }} />
        </div>

        {/* Domain + Bloom badge */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: typeScale.xs, padding: "3px 8px", borderRadius: "4px", background: p.color + "20", color: p.color, fontWeight: 600 }}>{q.domain}</span>
          <span style={{ fontSize: typeScale.xs, padding: "3px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Bloom: {q.bloom}</span>
          <span style={{ fontSize: typeScale.xs, padding: "3px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Difficulty: {"●".repeat(q.difficulty + 1)}{"○".repeat(3 - q.difficulty)}</span>
        </div>

        {/* Question */}
        <h3 style={{ fontSize: typeScale.lg, fontWeight: 600, lineHeight: 1.5, marginBottom: 24, letterSpacing: "-0.01em" }}>{q.q}</h3>

        {/* Options */}
        <div style={{ display: "grid", gap: "10px" }}>
          {q.opts.map((opt, i) => (
            <button key={i}
              style={{ ...cardBase, textAlign: "left", cursor: "pointer", fontSize: typeScale.base, lineHeight: 1.5, fontFamily: "inherit", color: "var(--text-primary, #E8E6E3)", display: "flex", alignItems: "flex-start", gap: 12 }}
              onMouseEnter={e => { e.target.style.borderColor = p.color + "50"; e.target.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
              onClick={() => answerQuestion(i)}>
              <span style={{ minWidth: 24, height: 24, borderRadius: "50%", border: `2px solid ${p.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: typeScale.xs, fontWeight: 600, color: p.color, flexShrink: 0, marginTop: 2 }}>{String.fromCharCode(65 + i)}</span>
              <span>{opt.substring(3)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ─── RESULTS SCREEN ───────────────
  const ResultsScreen = () => {
    const { pct, level } = calcScore();
    const p = PERSONAS[persona];
    const sl = SKILL_LEVELS[level];
    const domains = domainScores();
    const path = LEARNING_PATHS[persona][level];

    return (
      <div style={sectionPad}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40, padding: "32px 0" }}>
          <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.15em", color: p.color, marginBottom: 12, fontWeight: 600 }}>{p.title} — Assessment Complete</div>

          {/* Score ring */}
          <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 20px" }}>
            <svg viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="70" cy="70" r="60" fill="none" stroke={sl.color} strokeWidth="8"
                strokeDasharray={`${pct * 3.77} ${377 - pct * 3.77}`}
                strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: typeScale["2xl"], fontWeight: 800 }}>{pct}%</div>
              <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.4)" }}>Score</div>
            </div>
          </div>

          <h2 style={{ fontSize: typeScale["2xl"], fontWeight: 800, margin: "0 0 4px" }}>
            Level {level}: <span style={{ color: sl.color }}>{sl.name}</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: typeScale.base, maxWidth: 560, margin: "8px auto 0", lineHeight: 1.5 }}>{sl.description}</p>
        </div>

        {/* Framework mapping */}
        <div style={{ ...cardBase, marginBottom: 16 }}>
          <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", marginBottom: 12, fontWeight: 600 }}>Framework Mapping</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "SFIA 9", value: sl.sfia },
              { label: "e-CF 4.0", value: sl.ecf },
              { label: "DigComp", value: sl.digcomp },
              { label: "Bloom's", value: sl.bloom }
            ].map(m => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: typeScale.sm, fontWeight: 600 }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Domain breakdown */}
        <div style={{ ...cardBase, marginBottom: 16 }}>
          <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", marginBottom: 16, fontWeight: 600 }}>Domain Breakdown</div>
          <div style={{ display: "grid", gap: 12 }}>
            {domains.map(d => (
              <div key={d.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: typeScale.sm, fontWeight: 500 }}>{d.name}</span>
                  <span style={{ fontSize: typeScale.sm, color: d.pct >= 60 ? "#22C55E" : d.pct >= 40 ? "#F59E0B" : "#EF4444", fontWeight: 600 }}>{d.correct}/{d.total} ({d.pct}%)</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.pct}%`, background: d.pct >= 60 ? "#22C55E" : d.pct >= 40 ? "#F59E0B" : "#EF4444", borderRadius: 3, transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Path */}
        <div style={{ ...cardBase, borderLeft: `3px solid ${p.color}`, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: p.color, marginBottom: 4, fontWeight: 600 }}>Learning Path</div>
              <div style={{ fontSize: typeScale.lg, fontWeight: 700 }}>{path.current} → {path.next}</div>
            </div>
            <div style={{ fontSize: typeScale.sm, padding: "4px 12px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
              Est. {path.duration}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {path.modules.map((m, i) => {
              return (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: p.color + "20", color: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: typeScale.xs, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: typeScale.base, fontWeight: 600, marginBottom: 4 }}>{m.name}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: typeScale.xs, color: "rgba(255,255,255,0.4)" }}>
                      <span>{m.hours} hours</span>
                      <span>·</span>
                      <span style={{ color: p.color }}>{m.type}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between", fontSize: typeScale.sm }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Total estimated effort:</span>
            <span style={{ fontWeight: 700 }}>{path.modules.reduce((a, b) => a + b.hours, 0)} hours</span>
          </div>
        </div>

        {/* Skill level ladder */}
        <div style={{ ...cardBase, marginBottom: 16 }}>
          <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", marginBottom: 16, fontWeight: 600 }}>Competency Ladder</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120 }}>
            {SKILL_LEVELS.map((s, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: typeScale.xs, color: i === level ? s.color : "rgba(255,255,255,0.25)", fontWeight: i === level ? 700 : 400, textAlign: "center" }}>{s.name}</div>
                <div style={{
                  width: "100%",
                  height: `${20 + i * 20}px`,
                  borderRadius: "4px 4px 0 0",
                  background: i === level ? s.color : i < level ? s.color + "40" : "rgba(255,255,255,0.06)",
                  border: i === level ? `2px solid ${s.color}` : "none",
                  position: "relative"
                }}>
                  {i === level && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `6px solid ${s.color}` }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button style={btnPrimary(p.color)} onClick={() => startQuiz(persona)}>Retake Quiz</button>
          <button style={btnSecondary} onClick={() => transition("persona-select")}>Try Another Persona</button>
          <button style={btnSecondary} onClick={() => transition("home")}>Home</button>
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────
  return (
    <div style={containerStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --background: #0F0F14; --text-primary: #E8E6E3; }
        button:hover { opacity: 0.9; }
        ::selection { background: #3B82F640; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
      <NavBar />
      {screen === "home" && <HomeScreen />}
      {screen === "frameworks" && <FrameworksScreen />}
      {screen === "persona-select" && <PersonaSelect />}
      {screen === "quiz" && <QuizScreen />}
      {screen === "results" && <ResultsScreen />}
    </div>
  );
}
