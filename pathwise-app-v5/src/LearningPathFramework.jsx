import { useState } from "react";

// ═══════════════════════════════════════════════════════════════════
// ADAPTED LEARNING PATH FRAMEWORK — SCALABLE COURSE MATCHING ENGINE
// ═══════════════════════════════════════════════════════════════════

// ─── COMPLETE COMPETENCY TAXONOMY ───────────────────────────────────
const TAXONOMY = {
  "TECH": {
    label: "Tech → AI Upskill",
    domains: {
      "TECH.MLF": {
        label: "ML Fundamentals",
        subdomains: {
          "TECH.MLF.SL": "Supervised Learning",
          "TECH.MLF.UL": "Unsupervised Learning",
          "TECH.MLF.OPT": "Optimization & Loss Functions",
          "TECH.MLF.FE": "Feature Engineering",
          "TECH.MLF.REG": "Regularization & Generalization",
          "TECH.MLF.PEFT": "Parameter-Efficient Methods (LoRA, QLoRA)"
        }
      },
      "TECH.NN": {
        label: "Neural Networks & Deep Learning",
        subdomains: {
          "TECH.NN.CNN": "Convolutional Neural Networks",
          "TECH.NN.RNN": "Recurrent & Sequence Models",
          "TECH.NN.TRF": "Transformer Architecture",
          "TECH.NN.ATT": "Attention Mechanisms",
          "TECH.NN.GAN": "Generative Adversarial Networks",
          "TECH.NN.DIF": "Diffusion Models"
        }
      },
      "TECH.OPS": {
        label: "MLOps & Production",
        subdomains: {
          "TECH.OPS.SRV": "Model Serving & APIs",
          "TECH.OPS.CI": "CI/CD for ML Pipelines",
          "TECH.OPS.MON": "Monitoring & Drift Detection",
          "TECH.OPS.FS": "Feature Stores",
          "TECH.OPS.REG": "Model Registry & Versioning",
          "TECH.OPS.INF": "Infrastructure & Orchestration"
        }
      },
      "TECH.ARC": {
        label: "AI Architecture & Systems",
        subdomains: {
          "TECH.ARC.RAG": "RAG Pipelines",
          "TECH.ARC.AGT": "AI Agents & Tool Use",
          "TECH.ARC.MM": "Multi-modal Systems",
          "TECH.ARC.DIS": "Distributed Training",
          "TECH.ARC.VDB": "Vector Databases & Embeddings",
          "TECH.ARC.SYS": "System Design Patterns"
        }
      },
      "TECH.EVL": {
        label: "Model Evaluation & Validation",
        subdomains: {
          "TECH.EVL.MET": "Metrics (AUC, F1, Precision/Recall)",
          "TECH.EVL.CV": "Cross-Validation Strategies",
          "TECH.EVL.EXP": "Explainability (SHAP, LIME)",
          "TECH.EVL.BIA": "Bias & Fairness Evaluation",
          "TECH.EVL.ABT": "A/B Testing for Models"
        }
      }
    }
  },
  "DATA": {
    label: "Data Science Update",
    domains: {
      "DATA.AML": {
        label: "Advanced ML",
        subdomains: {
          "DATA.AML.ENS": "Ensemble Methods & Boosting",
          "DATA.AML.TRL": "Transfer Learning",
          "DATA.AML.SSL": "Self-Supervised Learning",
          "DATA.AML.EXP": "Explainability & Interpretability",
          "DATA.AML.OPT": "Hyperparameter Optimization",
          "DATA.AML.TSR": "Time Series & Sequential Models"
        }
      },
      "DATA.GEN": {
        label: "GenAI & LLMs",
        subdomains: {
          "DATA.GEN.ARC": "Transformer Architectures (GPT, BERT, T5)",
          "DATA.GEN.FT": "Fine-tuning (LoRA, RLHF, DPO)",
          "DATA.GEN.PRO": "Advanced Prompt Engineering",
          "DATA.GEN.RAG": "RAG Design & Optimization",
          "DATA.GEN.AGT": "Agents, Tool Use & Multi-step Reasoning",
          "DATA.GEN.EVL": "LLM Evaluation & Benchmarking"
        }
      },
      "DATA.OPS": {
        label: "MLOps & Deployment",
        subdomains: {
          "DATA.OPS.PIP": "ML Pipeline Orchestration",
          "DATA.OPS.MON": "Production Monitoring & Alerting",
          "DATA.OPS.DRF": "Data & Concept Drift Management",
          "DATA.OPS.VDB": "Vector Databases",
          "DATA.OPS.FS": "Feature Store Design",
          "DATA.OPS.CT": "Continuous Training Systems"
        }
      },
      "DATA.EXP": {
        label: "Experiment Design",
        subdomains: {
          "DATA.EXP.ABT": "A/B Testing & Causal Inference",
          "DATA.EXP.BAY": "Bayesian Methods",
          "DATA.EXP.PWR": "Power Analysis & Sample Size",
          "DATA.EXP.MBT": "Multi-armed Bandits",
          "DATA.EXP.OBS": "Observational Studies & Confounders"
        }
      },
      "DATA.GOV": {
        label: "AI Ethics & Governance",
        subdomains: {
          "DATA.GOV.FAI": "Fairness & Bias Auditing",
          "DATA.GOV.PRI": "Privacy-Preserving ML",
          "DATA.GOV.DOC": "Model Cards & Documentation",
          "DATA.GOV.REG": "Regulatory Compliance (EU AI Act, NIST)",
          "DATA.GOV.MRM": "Model Risk Management"
        }
      }
    }
  },
  "NONT": {
    label: "Non-Tech AI Literacy",
    domains: {
      "NONT.CON": {
        label: "AI Concepts",
        subdomains: {
          "NONT.CON.DEF": "AI/ML Definitions & Types",
          "NONT.CON.GEN": "Generative vs Predictive AI",
          "NONT.CON.LIM": "Capabilities & Limitations",
          "NONT.CON.HAL": "Hallucination & Trust",
          "NONT.CON.TRN": "How AI Models Learn (High-level)"
        }
      },
      "NONT.PRM": {
        label: "Prompt Engineering",
        subdomains: {
          "NONT.PRM.BAS": "Basic Prompt Construction",
          "NONT.PRM.ADV": "Advanced Techniques (Personas, Constraints)",
          "NONT.PRM.WRK": "Workflow Prompting & Chaining",
          "NONT.PRM.EVL": "Evaluating AI Outputs"
        }
      },
      "NONT.DAT": {
        label: "Data Literacy",
        subdomains: {
          "NONT.DAT.RDG": "Reading Data & Charts",
          "NONT.DAT.MET": "Business Metrics & KPIs",
          "NONT.DAT.QAL": "Data Quality Awareness",
          "NONT.DAT.PRI": "Data Privacy Basics"
        }
      },
      "NONT.TOL": {
        label: "AI Tools & Applications",
        subdomains: {
          "NONT.TOL.AST": "AI Assistants (Claude, ChatGPT, Copilot)",
          "NONT.TOL.DOC": "Document & Content AI",
          "NONT.TOL.ANA": "AI-Powered Analytics",
          "NONT.TOL.AUT": "No-code AI Automation"
        }
      },
      "NONT.ETH": {
        label: "Ethical Awareness",
        subdomains: {
          "NONT.ETH.BIA": "Recognizing Bias in AI Outputs",
          "NONT.ETH.RES": "Responsible Use Policies",
          "NONT.ETH.ESC": "When to Escalate (Human-in-the-Loop)",
          "NONT.ETH.IP": "IP & Copyright Considerations"
        }
      }
    }
  },
  "MGR": {
    label: "AI Management & Governance",
    domains: {
      "MGR.STR": {
        label: "AI Strategy",
        subdomains: {
          "MGR.STR.RDM": "AI Roadmapping & Prioritization",
          "MGR.STR.ORG": "Organizational Models (CoE, Hub-Spoke)",
          "MGR.STR.ADT": "AI Adoption & Change Management",
          "MGR.STR.CMP": "Competitive AI Intelligence",
          "MGR.STR.PRS": "Parsimony Principle (Simplest Viable Model)"
        }
      },
      "MGR.RSK": {
        label: "Risk & Governance",
        subdomains: {
          "MGR.RSK.FRM": "Governance Frameworks (NIST AI RMF, ISO 42001)",
          "MGR.RSK.REG": "Regulatory Landscape (EU AI Act, Sector Rules)",
          "MGR.RSK.AUD": "Bias Audits & Compliance",
          "MGR.RSK.DOC": "Documentation & Model Inventories",
          "MGR.RSK.SEC": "AI Security & Adversarial Risks"
        }
      },
      "MGR.TEM": {
        label: "Team Leadership",
        subdomains: {
          "MGR.TEM.HIR": "AI Team Hiring & Structure",
          "MGR.TEM.AGI": "Agile for ML Projects",
          "MGR.TEM.TDB": "Technical Debt Management",
          "MGR.TEM.CRS": "Cross-functional Collaboration",
          "MGR.TEM.MNT": "Mentoring & Talent Development"
        }
      },
      "MGR.VND": {
        label: "Vendor Evaluation",
        subdomains: {
          "MGR.VND.DUE": "Due Diligence Frameworks",
          "MGR.VND.POC": "POC Design & Evaluation",
          "MGR.VND.CTR": "Contract & SLA Negotiation",
          "MGR.VND.INT": "Integration & Build-vs-Buy",
          "MGR.VND.IP": "IP & Data Rights Assessment"
        }
      },
      "MGR.ROI": {
        label: "ROI & Metrics",
        subdomains: {
          "MGR.ROI.BSC": "AI Balanced Scorecard",
          "MGR.ROI.CBA": "Cost-Benefit Analysis for AI",
          "MGR.ROI.PRI": "Use Case Prioritization Frameworks",
          "MGR.ROI.TTV": "Time-to-Value Measurement",
          "MGR.ROI.BRD": "Board-level AI Reporting"
        }
      }
    }
  }
};

// ─── PROFICIENCY LEVELS ─────────────────────────────────────────────
const LEVELS = [
  { id: 0, code: "L0", name: "Awareness",    sfia: "1-2", ecf: "e-1", digcomp: "Foundation",          bloom_floor: "remember",    bloom_ceiling: "understand", color: "#64748B" },
  { id: 1, code: "L1", name: "Foundation",    sfia: "2-3", ecf: "e-2", digcomp: "Intermediate",        bloom_floor: "understand",  bloom_ceiling: "apply",      color: "#3B82F6" },
  { id: 2, code: "L2", name: "Practitioner",  sfia: "3-4", ecf: "e-3", digcomp: "Advanced",            bloom_floor: "apply",       bloom_ceiling: "analyze",    color: "#8B5CF6" },
  { id: 3, code: "L3", name: "Advanced",      sfia: "5-6", ecf: "e-4", digcomp: "Highly Specialised",  bloom_floor: "analyze",     bloom_ceiling: "evaluate",   color: "#F59E0B" },
  { id: 4, code: "L4", name: "Expert",        sfia: "6-7", ecf: "e-5", digcomp: "Highly Specialised+", bloom_floor: "evaluate",    bloom_ceiling: "create",     color: "#EF4444" }
];

// ─── LEARNING NODE SCHEMA (THE CORE ENGINE) ─────────────────────────
const LEARNING_NODE_SCHEMA = {
  "$schema": "https://adapted.ai/schemas/learning-node/v2",
  "description": "A single node in a learning path. Each node maps to one or more courses in the course database via the match_criteria object.",
  "type": "object",
  "required": ["node_id", "persona", "domain_code", "subdomain_codes", "target_level", "sequence_order", "match_criteria"],
  "properties": {
    "node_id": {
      "type": "string",
      "pattern": "^[A-Z]{3,4}\\.[A-Z]{2,3}\\.L[0-4]\\.[0-9]{2}$",
      "description": "Unique identifier: {PERSONA}.{DOMAIN}.{LEVEL}.{SEQ}",
      "example": "TECH.OPS.L1.03"
    },
    "persona": {
      "type": "string",
      "enum": ["TECH", "DATA", "NONT", "MGR"],
      "description": "Target persona code"
    },
    "domain_code": {
      "type": "string",
      "description": "Primary domain from the taxonomy",
      "example": "TECH.OPS"
    },
    "subdomain_codes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "One or more subdomain codes this node covers",
      "example": ["TECH.OPS.SRV", "TECH.OPS.CI"]
    },
    "current_level": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4,
      "description": "The proficiency level the learner is AT when entering this node"
    },
    "target_level": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4,
      "description": "The proficiency level this node aims to achieve"
    },
    "sequence_order": {
      "type": "integer",
      "description": "Position within the learning path (1-indexed)"
    },
    "title": {
      "type": "string",
      "description": "Human-readable node title",
      "example": "MLOps Foundations: Docker, CI/CD, Model Registry"
    },
    "estimated_hours": {
      "type": "number",
      "description": "Estimated hours to complete"
    },
    "format_tags": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["course", "lab", "workshop", "project", "seminar", "practicum", "capstone", "assessment"]
      },
      "description": "Acceptable delivery formats"
    },
    "bloom_level": {
      "type": "string",
      "enum": ["remember", "understand", "apply", "analyze", "evaluate", "create"],
      "description": "The cognitive level this node targets (Bloom's Taxonomy)"
    },
    "match_criteria": {
      "type": "object",
      "description": "THE COURSE MATCHING ENGINE — defines how to query the course DB",
      "properties": {
        "required_tags": {
          "type": "array",
          "items": { "type": "string" },
          "description": "ALL of these tags must be present on the course (AND logic)",
          "example": ["mlops", "docker", "cicd"]
        },
        "preferred_tags": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Courses with more of these tags rank higher (scoring)",
          "example": ["kubernetes", "aws", "terraform", "model-registry"]
        },
        "excluded_tags": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Courses with ANY of these tags are filtered out",
          "example": ["beginner", "no-code", "business-audience"]
        },
        "difficulty_range": {
          "type": "object",
          "properties": {
            "min": { "type": "integer", "minimum": 0, "maximum": 4 },
            "max": { "type": "integer", "minimum": 0, "maximum": 4 }
          },
          "description": "Acceptable difficulty range (maps to course.difficulty_level)"
        },
        "duration_range_hours": {
          "type": "object",
          "properties": {
            "min": { "type": "number" },
            "max": { "type": "number" }
          },
          "description": "Acceptable course duration"
        },
        "format_preference": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Preferred delivery formats, ordered by priority"
        },
        "certification_alignment": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Optional: match courses aligned to these certs",
          "example": ["aws-ml-specialty", "google-ml-engineer", "azure-ai-engineer"]
        },
        "recency_weight": {
          "type": "string",
          "enum": ["critical", "preferred", "neutral"],
          "description": "How important is course freshness (critical = must be <12 months old)"
        }
      }
    },
    "prerequisites": {
      "type": "array",
      "items": { "type": "string" },
      "description": "node_ids that must be completed before this node",
      "example": ["TECH.MLF.L1.01", "TECH.MLF.L1.02"]
    },
    "corequisites": {
      "type": "array",
      "items": { "type": "string" },
      "description": "node_ids that should be taken concurrently or in any order"
    },
    "assessment_gate": {
      "type": "object",
      "description": "Optional: mini-assessment to validate learning before progression",
      "properties": {
        "type": { "type": "string", "enum": ["quiz", "project", "peer-review", "portfolio"] },
        "pass_threshold": { "type": "number", "minimum": 0, "maximum": 1 },
        "subdomain_codes": { "type": "array", "items": { "type": "string" } }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "sfia_skills": { "type": "array", "items": { "type": "string" }, "description": "SFIA 9 skill codes" },
        "ecf_competences": { "type": "array", "items": { "type": "string" }, "description": "e-CF competence codes" },
        "onet_codes": { "type": "array", "items": { "type": "string" }, "description": "O*NET occupation/skill codes" },
        "nice_work_roles": { "type": "array", "items": { "type": "string" }, "description": "NICE framework work role IDs" }
      }
    }
  }
};

// ─── COURSE SCHEMA (WHAT COURSES IN DB SHOULD LOOK LIKE) ────────────
const COURSE_SCHEMA = {
  "$schema": "https://adapted.ai/schemas/course/v2",
  "description": "Schema for courses in the AdaptEd course database. Courses are matched to learning path nodes via tags, difficulty, and format.",
  "type": "object",
  "required": ["course_id", "title", "tags", "difficulty_level", "format", "duration_hours"],
  "properties": {
    "course_id": { "type": "string", "description": "Unique course identifier" },
    "title": { "type": "string" },
    "provider": { "type": "string", "description": "Course provider (Coursera, internal, etc.)" },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Normalized tags for matching. Use the AdaptEd tag vocabulary."
    },
    "difficulty_level": {
      "type": "integer", "minimum": 0, "maximum": 4,
      "description": "Maps to proficiency levels: 0=Awareness, 1=Foundation, 2=Practitioner, 3=Advanced, 4=Expert"
    },
    "format": {
      "type": "string",
      "enum": ["course", "lab", "workshop", "project", "seminar", "practicum", "capstone", "assessment", "video", "reading"]
    },
    "duration_hours": { "type": "number" },
    "bloom_level": {
      "type": "string",
      "enum": ["remember", "understand", "apply", "analyze", "evaluate", "create"]
    },
    "certification_alignment": { "type": "array", "items": { "type": "string" } },
    "last_updated": { "type": "string", "format": "date", "description": "ISO date of last content update" },
    "subdomain_codes": {
      "type": "array",
      "items": { "type": "string" },
      "description": "AdaptEd taxonomy codes this course covers"
    },
    "persona_fit": {
      "type": "array",
      "items": { "type": "string", "enum": ["TECH", "DATA", "NONT", "MGR"] },
      "description": "Which personas this course is appropriate for"
    },
    "rating": { "type": "number", "minimum": 0, "maximum": 5 },
    "completion_rate": { "type": "number", "minimum": 0, "maximum": 1 }
  }
};

// ─── MATCHING ALGORITHM (PSEUDOCODE AS STRUCTURED DATA) ─────────────
const MATCHING_ALGO = `
// ═══════════════════════════════════════════════════
// AdaptEd Course Matching Algorithm v2
// ═══════════════════════════════════════════════════

function matchCourses(node: LearningNode, courseDB: Course[]): RankedCourse[] {

  // STEP 1: HARD FILTERS (eliminates non-candidates)
  let candidates = courseDB.filter(course => {
    // All required_tags must be present
    const hasRequired = node.match_criteria.required_tags
      .every(tag => course.tags.includes(tag));

    // No excluded_tags may be present
    const noExcluded = !node.match_criteria.excluded_tags
      ?.some(tag => course.tags.includes(tag));

    // Difficulty must be in range
    const inDifficulty =
      course.difficulty_level >= node.match_criteria.difficulty_range.min &&
      course.difficulty_level <= node.match_criteria.difficulty_range.max;

    // Duration must be in range (if specified)
    const inDuration = !node.match_criteria.duration_range_hours || (
      course.duration_hours >= node.match_criteria.duration_range_hours.min &&
      course.duration_hours <= node.match_criteria.duration_range_hours.max
    );

    // Persona must match
    const personaMatch = course.persona_fit.includes(node.persona);

    return hasRequired && noExcluded && inDifficulty && inDuration && personaMatch;
  });

  // STEP 2: RECENCY FILTER
  if (node.match_criteria.recency_weight === "critical") {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    candidates = candidates.filter(c =>
      new Date(c.last_updated) >= cutoff
    );
  }

  // STEP 3: SCORING (ranks remaining candidates)
  const scored = candidates.map(course => {
    let score = 0;

    // Preferred tag overlap (0–10 points)
    const prefMatches = node.match_criteria.preferred_tags
      ?.filter(tag => course.tags.includes(tag)).length || 0;
    const prefTotal = node.match_criteria.preferred_tags?.length || 1;
    score += (prefMatches / prefTotal) * 10;

    // Subdomain alignment (0–10 points)
    const subMatches = node.subdomain_codes
      .filter(sc => course.subdomain_codes?.includes(sc)).length;
    score += (subMatches / node.subdomain_codes.length) * 10;

    // Format preference (0–5 points)
    const formatIdx = node.match_criteria.format_preference
      ?.indexOf(course.format) ?? -1;
    if (formatIdx === 0) score += 5;
    else if (formatIdx === 1) score += 3;
    else if (formatIdx >= 2) score += 1;

    // Bloom level alignment (0–5 points)
    if (course.bloom_level === node.bloom_level) score += 5;
    else if (isAdjacentBloom(course.bloom_level, node.bloom_level)) score += 2;

    // Certification alignment bonus (0–3 points)
    const certMatch = node.match_criteria.certification_alignment
      ?.some(c => course.certification_alignment?.includes(c));
    if (certMatch) score += 3;

    // Recency bonus (0–3 points)
    const monthsOld = getMonthsOld(course.last_updated);
    if (monthsOld < 6) score += 3;
    else if (monthsOld < 12) score += 2;
    else if (monthsOld < 24) score += 1;

    // Quality signals (0–4 points)
    score += (course.rating / 5) * 2;
    score += (course.completion_rate) * 2;

    return { course, score, matchDetails: { prefMatches, subMatches, formatIdx, certMatch } };
  });

  // STEP 4: RANK AND RETURN TOP N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);  // Return top 5 candidates per node
}

// ═══════════════════════════════════════════════════
// PATH ASSEMBLY: Assessment Results → Learning Path
// ═══════════════════════════════════════════════════

function buildLearningPath(assessmentResult: AssessmentResult): LearningPath {

  const { persona, overall_level, domain_scores } = assessmentResult;

  // 1. Identify weak domains (below overall level)
  const weakDomains = domain_scores
    .filter(d => d.level < overall_level)
    .sort((a, b) => a.level - b.level);  // Weakest first

  // 2. Identify growth domains (at overall level, need next-level push)
  const growthDomains = domain_scores
    .filter(d => d.level === overall_level);

  // 3. Build path: remediate weak → strengthen growth → advance
  const path: LearningNode[] = [];
  let seq = 1;

  // Phase 1: Remediation (bring weak domains up to current level)
  for (const domain of weakDomains) {
    const nodes = getNodesForDomain(persona, domain.code, domain.level, overall_level);
    nodes.forEach(n => { n.sequence_order = seq++; path.push(n); });
  }

  // Phase 2: Consolidation (strengthen at current level)
  for (const domain of growthDomains) {
    const nodes = getNodesForDomain(persona, domain.code, overall_level, overall_level);
    nodes.forEach(n => { n.sequence_order = seq++; path.push(n); });
  }

  // Phase 3: Advancement (push to next level)
  const targetLevel = Math.min(overall_level + 1, 4);
  for (const domain of domain_scores) {
    const nodes = getNodesForDomain(persona, domain.code, overall_level, targetLevel);
    nodes.forEach(n => { n.sequence_order = seq++; path.push(n); });
  }

  // Phase 4: Capstone
  path.push(buildCapstoneNode(persona, targetLevel, seq));

  return {
    persona,
    current_level: overall_level,
    target_level: targetLevel,
    total_nodes: path.length,
    estimated_hours: path.reduce((sum, n) => sum + n.estimated_hours, 0),
    nodes: path
  };
}`;

// ─── EXAMPLE LEARNING NODE INSTANCES ────────────────────────────────
const EXAMPLE_NODES = [
  {
    node_id: "TECH.OPS.L1.01",
    persona: "TECH",
    domain_code: "TECH.OPS",
    subdomain_codes: ["TECH.OPS.SRV", "TECH.OPS.CI"],
    current_level: 0,
    target_level: 1,
    sequence_order: 4,
    title: "MLOps Foundations: Docker, CI/CD for ML, Model Registry",
    estimated_hours: 20,
    format_tags: ["course", "lab"],
    bloom_level: "apply",
    match_criteria: {
      required_tags: ["mlops", "cicd", "docker"],
      preferred_tags: ["kubernetes", "github-actions", "model-registry", "aws-sagemaker", "mlflow"],
      excluded_tags: ["beginner", "no-code", "business-audience", "non-technical"],
      difficulty_range: { min: 1, max: 2 },
      duration_range_hours: { min: 10, max: 30 },
      format_preference: ["course", "lab", "workshop"],
      certification_alignment: ["aws-ml-specialty", "google-ml-engineer"],
      recency_weight: "critical"
    },
    prerequisites: ["TECH.MLF.L1.01", "TECH.MLF.L1.02"],
    corequisites: [],
    assessment_gate: {
      type: "project",
      pass_threshold: 0.7,
      subdomain_codes: ["TECH.OPS.SRV", "TECH.OPS.CI"]
    }
  },
  {
    node_id: "NONT.PRM.L1.01",
    persona: "NONT",
    domain_code: "NONT.PRM",
    subdomain_codes: ["NONT.PRM.BAS", "NONT.PRM.ADV"],
    current_level: 0,
    target_level: 1,
    sequence_order: 2,
    title: "Prompt Engineering for Business Professionals",
    estimated_hours: 10,
    format_tags: ["workshop", "lab"],
    bloom_level: "apply",
    match_criteria: {
      required_tags: ["prompt-engineering", "ai-tools"],
      preferred_tags: ["chatgpt", "claude", "copilot", "business-writing", "templates"],
      excluded_tags: ["developer", "api", "fine-tuning", "code-only"],
      difficulty_range: { min: 0, max: 1 },
      duration_range_hours: { min: 4, max: 15 },
      format_preference: ["workshop", "lab", "course"],
      certification_alignment: [],
      recency_weight: "critical"
    },
    prerequisites: ["NONT.CON.L0.01"],
    corequisites: ["NONT.TOL.L1.01"],
    assessment_gate: {
      type: "project",
      pass_threshold: 0.6,
      subdomain_codes: ["NONT.PRM.BAS"]
    }
  },
  {
    node_id: "MGR.RSK.L2.01",
    persona: "MGR",
    domain_code: "MGR.RSK",
    subdomain_codes: ["MGR.RSK.FRM", "MGR.RSK.REG", "MGR.RSK.AUD"],
    current_level: 1,
    target_level: 2,
    sequence_order: 3,
    title: "AI Governance Deep Dive: EU AI Act, NIST AI RMF, ISO 42001",
    estimated_hours: 12,
    format_tags: ["course", "seminar"],
    bloom_level: "analyze",
    match_criteria: {
      required_tags: ["ai-governance", "regulation"],
      preferred_tags: ["eu-ai-act", "nist-ai-rmf", "iso-42001", "risk-management", "compliance"],
      excluded_tags: ["technical-implementation", "coding", "developer"],
      difficulty_range: { min: 2, max: 3 },
      duration_range_hours: { min: 8, max: 20 },
      format_preference: ["course", "seminar", "workshop"],
      certification_alignment: ["cipp-e", "crisc", "iso-42001-la"],
      recency_weight: "critical"
    },
    prerequisites: ["MGR.RSK.L1.01"],
    corequisites: ["MGR.STR.L2.01"],
    assessment_gate: {
      type: "quiz",
      pass_threshold: 0.75,
      subdomain_codes: ["MGR.RSK.FRM", "MGR.RSK.REG"]
    }
  }
];

// ─── ASSESSMENT → PATH MAPPING EXAMPLE ──────────────────────────────
const ASSESSMENT_EXAMPLE = {
  input: {
    persona: "TECH",
    overall_level: 1,
    overall_pct: 38,
    domain_scores: [
      { code: "TECH.MLF", label: "ML Fundamentals", level: 2, pct: 67 },
      { code: "TECH.NN",  label: "Neural Networks", level: 1, pct: 50 },
      { code: "TECH.OPS", label: "MLOps", level: 0, pct: 17 },
      { code: "TECH.ARC", label: "AI Architecture", level: 1, pct: 33 },
      { code: "TECH.EVL", label: "Model Evaluation", level: 1, pct: 50 }
    ]
  },
  output_path: [
    { phase: "Remediation", nodes: [
      { id: "TECH.OPS.L0.01", title: "Intro to ML Deployment & Serving", hours: 8, level: "L0→L1" },
      { id: "TECH.OPS.L1.01", title: "MLOps Foundations: Docker, CI/CD, Registry", hours: 20, level: "L0→L1" }
    ]},
    { phase: "Consolidation", nodes: [
      { id: "TECH.NN.L1.02", title: "Transformer Architecture Deep Dive", hours: 15, level: "L1→L1" },
      { id: "TECH.ARC.L1.01", title: "RAG Pipeline Fundamentals", hours: 12, level: "L1→L1" },
      { id: "TECH.EVL.L1.02", title: "Advanced Metrics & Cross-Validation", hours: 10, level: "L1→L1" }
    ]},
    { phase: "Advancement", nodes: [
      { id: "TECH.MLF.L2.01", title: "Advanced Feature Engineering & Regularization", hours: 15, level: "L1→L2" },
      { id: "TECH.NN.L2.01", title: "Advanced Deep Learning (GANs, Diffusion)", hours: 20, level: "L1→L2" },
      { id: "TECH.OPS.L2.01", title: "Production MLOps (Feature Stores, Orchestration)", hours: 20, level: "L1→L2" },
      { id: "TECH.ARC.L2.01", title: "AI Agents & Multi-modal Systems", hours: 18, level: "L1→L2" },
      { id: "TECH.EVL.L2.01", title: "Explainability, Fairness & A/B Testing", hours: 12, level: "L1→L2" }
    ]},
    { phase: "Capstone", nodes: [
      { id: "TECH.CAP.L2.01", title: "End-to-end ML System: Design, Build, Deploy, Monitor", hours: 20, level: "L2 Gate" }
    ]}
  ]
};

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const typeScale = {
  xs: "0.7rem", sm: "0.8rem", base: "0.92rem", lg: "1.1rem",
  xl: "1.3rem", "2xl": "1.55rem", "3xl": "1.95rem"
};

const TAB_DEFS = [
  { id: "overview", label: "Architecture Overview" },
  { id: "taxonomy", label: "Competency Taxonomy" },
  { id: "node-schema", label: "Learning Node Schema" },
  { id: "course-schema", label: "Course Schema" },
  { id: "matching", label: "Matching Algorithm" },
  { id: "examples", label: "Live Examples" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedDomain, setExpandedDomain] = useState(null);
  const [expandedPersona, setExpandedPersona] = useState("TECH");
  const [copiedField, setCopiedField] = useState(null);

  const copyJSON = (obj, label) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const card = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "18px",
  };

  const codeBg = {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px",
    padding: "16px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: typeScale.xs,
    lineHeight: 1.7,
    color: "#A5B4C4",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const badge = (color, text) => (
    <span style={{ fontSize: typeScale.xs, padding: "2px 8px", borderRadius: "4px", background: color + "18", color, fontWeight: 600, whiteSpace: "nowrap" }}>{text}</span>
  );

  // ─── OVERVIEW TAB ─────────────────────────────
  const OverviewTab = () => (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={card}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.12em", color: "#3B82F6", marginBottom: 10, fontWeight: 600 }}>System Architecture</div>
        <div style={{ fontSize: typeScale.base, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 20 }}>
          The framework has five layers that connect assessment results to actual courses in your database. Each layer is independently scalable — you can add personas, domains, or courses without restructuring the pipeline.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { num: "01", title: "Competency Taxonomy", desc: "Hierarchical skill codes: Persona → Domain → Subdomain. Machine-readable identifiers for every skill.", color: "#3B82F6", arrow: "↓" },
            { num: "02", title: "Proficiency Levels", desc: "5 levels (L0–L4) cross-mapped to SFIA, e-CF, DigComp, and Bloom's Taxonomy. Universal progression scale.", color: "#8B5CF6", arrow: "↓" },
            { num: "03", title: "Assessment Engine", desc: "Quiz results produce per-domain proficiency scores. Identifies current level + domain-level gaps.", color: "#059669", arrow: "↓" },
            { num: "04", title: "Learning Path Builder", desc: "Three-phase path: Remediation (fill gaps) → Consolidation (strengthen) → Advancement (level up) + Capstone.", color: "#F59E0B", arrow: "↓" },
            { num: "05", title: "Course Matching Engine", desc: "Each path node carries match_criteria (required/preferred/excluded tags, difficulty, format, recency). Queries your course DB and ranks results.", color: "#EF4444", arrow: "" }
          ].map(l => (
            <div key={l.num}>
              <div style={{ ...card, borderLeft: `3px solid ${l.color}`, display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "8px", background: l.color + "18", color: l.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: typeScale.sm, flexShrink: 0, fontFamily: "monospace" }}>{l.num}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: typeScale.base, marginBottom: 3 }}>{l.title}</div>
                  <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{l.desc}</div>
                </div>
              </div>
              {l.arrow && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: "18px", lineHeight: 1 }}>{l.arrow}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 10, fontWeight: 600 }}>Key Design Decisions</div>
        <div className="fw-grid-2">
          {[
            { title: "Tag-based matching", desc: "Courses are matched via normalized tags, not rigid category trees. Lets you add new courses without schema changes." },
            { title: "Three-phase path assembly", desc: "Remediate → Consolidate → Advance ensures learners don't skip foundations while still progressing." },
            { title: "Framework-agnostic levels", desc: "Internal L0–L4 scale maps to SFIA, e-CF, DigComp simultaneously. One assessment, multiple certifications." },
            { title: "Recency weighting", desc: "GenAI/LLM nodes flag recency as 'critical' — auto-filters stale content. Stable domains use 'neutral'." },
            { title: "Assessment gates", desc: "Each node can require a gate (quiz, project, peer-review) before progression. Prevents credential inflation." },
            { title: "Subdomain granularity", desc: "~100 subdomain codes across 4 personas. Granular enough for precise matching, coarse enough to maintain." }
          ].map((d, i) => (
            <div key={i} style={{ padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 600, fontSize: typeScale.sm, marginBottom: 4 }}>{d.title}</div>
              <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{d.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── TAXONOMY TAB ─────────────────────────────
  const TaxonomyTab = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: typeScale.lg, fontWeight: 700 }}>Competency Taxonomy</div>
          <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>4 personas · 20 domains · ~100 subdomains</div>
        </div>
        <button onClick={() => copyJSON(TAXONOMY, "taxonomy")} style={{ background: copiedField === "taxonomy" ? "#22C55E" : "rgba(255,255,255,0.06)", color: copiedField === "taxonomy" ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: typeScale.xs, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
          {copiedField === "taxonomy" ? "Copied ✓" : "Copy JSON"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {Object.keys(TAXONOMY).map(k => (
          <button key={k} onClick={() => setExpandedPersona(k)} style={{
            background: expandedPersona === k ? "#3B82F6" : "rgba(255,255,255,0.05)",
            color: expandedPersona === k ? "#fff" : "rgba(255,255,255,0.5)",
            border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: typeScale.sm, cursor: "pointer", fontFamily: "inherit", fontWeight: 600
          }}>
            {k}
          </button>
        ))}
      </div>

      {expandedPersona && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: typeScale.base, fontWeight: 700, color: "#3B82F6" }}>{TAXONOMY[expandedPersona].label}</div>
          {Object.entries(TAXONOMY[expandedPersona].domains).map(([code, domain]) => (
            <div key={code} style={{ ...card, cursor: "pointer" }} onClick={() => setExpandedDomain(expandedDomain === code ? null : code)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <code style={{ fontSize: typeScale.xs, color: "#F59E0B", fontFamily: "monospace" }}>{code}</code>
                  <span style={{ fontWeight: 600, fontSize: typeScale.sm }}>{domain.label}</span>
                  <span style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.3)" }}>{Object.keys(domain.subdomains).length} subdomains</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>{expandedDomain === code ? "▼" : "▶"}</span>
              </div>
              {expandedDomain === code && (
                <div style={{ marginTop: 12, display: "grid", gap: 4 }}>
                  {Object.entries(domain.subdomains).map(([sc, label]) => (
                    <div key={sc} style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <code style={{ fontSize: typeScale.xs, color: "#8B5CF6", fontFamily: "monospace", minWidth: 130 }}>{sc}</code>
                      <span style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.55)" }}>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── NODE SCHEMA TAB ──────────────────────────
  const NodeSchemaTab = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: typeScale.lg, fontWeight: 700 }}>Learning Node Schema</div>
          <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Each node in a learning path — the core unit of the framework</div>
        </div>
        <button onClick={() => copyJSON(LEARNING_NODE_SCHEMA, "node")} style={{ background: copiedField === "node" ? "#22C55E" : "rgba(255,255,255,0.06)", color: copiedField === "node" ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: typeScale.xs, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
          {copiedField === "node" ? "Copied ✓" : "Copy JSON Schema"}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 10, fontWeight: 600 }}>Field Reference</div>
        <div style={{ display: "grid", gap: 6 }}>
          {Object.entries(LEARNING_NODE_SCHEMA.properties).map(([key, val]) => (
            <div key={key} className="fw-kv-row" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <code style={{ fontSize: typeScale.xs, color: "#F59E0B", fontFamily: "monospace" }}>{key}</code>
                {LEARNING_NODE_SCHEMA.required.includes(key) && badge("#EF4444", "req")}
              </div>
              <div>
                <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{val.description || ""}</div>
                {val.type && <span style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>{typeof val.type === 'string' ? val.type : 'object'}</span>}
                {key === "match_criteria" && (
                  <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
                    {Object.entries(val.properties).map(([mk, mv]) => (
                      <div key={mk} style={{ padding: "4px 0", display: "flex", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
                        <code style={{ fontSize: typeScale.xs, color: "#8B5CF6", fontFamily: "monospace", minWidth: 160 }}>{mk}</code>
                        <span style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.4)" }}>{mv.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: typeScale.sm, fontWeight: 600, marginBottom: 8 }}>Raw JSON Schema</div>
        <pre style={codeBg}>{JSON.stringify(LEARNING_NODE_SCHEMA, null, 2)}</pre>
      </div>
    </div>
  );

  // ─── COURSE SCHEMA TAB ────────────────────────
  const CourseSchemaTab = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: typeScale.lg, fontWeight: 700 }}>Course Database Schema</div>
          <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>How courses in your DB must be structured for matching</div>
        </div>
        <button onClick={() => copyJSON(COURSE_SCHEMA, "course")} style={{ background: copiedField === "course" ? "#22C55E" : "rgba(255,255,255,0.06)", color: copiedField === "course" ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: typeScale.xs, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
          {copiedField === "course" ? "Copied ✓" : "Copy JSON Schema"}
        </button>
      </div>

      <div style={card}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 10, fontWeight: 600 }}>Required Fields for Course Ingestion</div>
        <div style={{ display: "grid", gap: 6 }}>
          {Object.entries(COURSE_SCHEMA.properties).map(([key, val]) => (
            <div key={key} className="fw-kv-row-wide" style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <code style={{ fontSize: typeScale.xs, color: "#059669", fontFamily: "monospace" }}>{key}</code>
                {COURSE_SCHEMA.required.includes(key) && badge("#EF4444", "req")}
              </div>
              <div style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.45)" }}>
                {val.description || ""} {val.enum && <span style={{ color: "rgba(255,255,255,0.25)" }}>enum: [{val.enum.join(", ")}]</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 10, fontWeight: 600 }}>Example Course Record</div>
        <pre style={codeBg}>{JSON.stringify({
          course_id: "CRS-2024-MLO-042",
          title: "Production MLOps with Docker, GitHub Actions & MLflow",
          provider: "DataCamp",
          tags: ["mlops", "docker", "cicd", "github-actions", "mlflow", "model-registry", "python"],
          difficulty_level: 1,
          format: "course",
          duration_hours: 18,
          bloom_level: "apply",
          certification_alignment: ["aws-ml-specialty"],
          last_updated: "2026-01-15",
          subdomain_codes: ["TECH.OPS.SRV", "TECH.OPS.CI", "TECH.OPS.REG"],
          persona_fit: ["TECH", "DATA"],
          rating: 4.6,
          completion_rate: 0.72
        }, null, 2)}</pre>
      </div>

      <pre style={codeBg}>{JSON.stringify(COURSE_SCHEMA, null, 2)}</pre>
    </div>
  );

  // ─── MATCHING ALGORITHM TAB ───────────────────
  const MatchingTab = () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <div style={{ fontSize: typeScale.lg, fontWeight: 700 }}>Course Matching Algorithm</div>
        <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>4-step pipeline: Hard Filters → Recency → Scoring → Ranking</div>
      </div>

      <div className="fw-grid-2">
        {[
          { step: "1", title: "Hard Filters", desc: "Required tags (AND), excluded tags (NOT ANY), difficulty range, duration range, persona match. Eliminates non-candidates.", color: "#EF4444", pts: "Pass/Fail" },
          { step: "2", title: "Recency Filter", desc: "If node.recency_weight = 'critical', removes courses older than 12 months. GenAI nodes always use this.", color: "#F59E0B", pts: "Pass/Fail" },
          { step: "3", title: "Multi-signal Scoring", desc: "Preferred tags (0–10), subdomain alignment (0–10), format preference (0–5), Bloom alignment (0–5), cert bonus (0–3), recency (0–3), quality (0–4).", color: "#3B82F6", pts: "0–40 pts" },
          { step: "4", title: "Rank & Return", desc: "Sort by composite score, return top 5 candidates per node. Ties broken by completion_rate, then rating.", color: "#22C55E", pts: "Top 5" }
        ].map(s => (
          <div key={s.step} style={{ ...card, borderTop: `3px solid ${s.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: typeScale.base }}>Step {s.step}: {s.title}</div>
              {badge(s.color, s.pts)}
            </div>
            <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", marginBottom: 10, fontWeight: 600 }}>Scoring Breakdown (40 pts max)</div>
        <div style={{ display: "grid", gap: 6 }}>
          {[
            { signal: "Preferred tag overlap", pts: "0–10", weight: "25%", desc: "% of preferred_tags matched × 10" },
            { signal: "Subdomain alignment", pts: "0–10", weight: "25%", desc: "% of node's subdomain_codes covered × 10" },
            { signal: "Format preference", pts: "0–5", weight: "12.5%", desc: "1st choice = 5, 2nd = 3, 3rd+ = 1" },
            { signal: "Bloom level match", pts: "0–5", weight: "12.5%", desc: "Exact match = 5, adjacent = 2" },
            { signal: "Certification alignment", pts: "0–3", weight: "7.5%", desc: "Any cert overlap = 3" },
            { signal: "Recency bonus", pts: "0–3", weight: "7.5%", desc: "<6mo = 3, <12mo = 2, <24mo = 1" },
            { signal: "Quality signals", pts: "0–4", weight: "10%", desc: "(rating/5)×2 + completion_rate×2" }
          ].map((s, i) => (
            <div key={i} className="fw-scoring-row" style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: typeScale.xs, alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{s.signal}</span>
              <span style={{ color: "#3B82F6", fontFamily: "monospace" }}>{s.pts}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>{s.weight}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: typeScale.sm, fontWeight: 600, marginBottom: 8 }}>Implementation Reference</div>
        <pre style={codeBg}>{MATCHING_ALGO}</pre>
      </div>
    </div>
  );

  // ─── EXAMPLES TAB ─────────────────────────────
  const ExamplesTab = () => (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <div style={{ fontSize: typeScale.lg, fontWeight: 700 }}>End-to-End Example</div>
        <div style={{ fontSize: typeScale.sm, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Assessment result → Path assembly → Node instances</div>
      </div>

      {/* Assessment Input */}
      <div style={{ ...card, borderLeft: "3px solid #3B82F6" }}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "#3B82F6", marginBottom: 10, fontWeight: 600 }}>Assessment Result (Input)</div>
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          <div>{badge("#3B82F6", `Persona: ${ASSESSMENT_EXAMPLE.input.persona}`)}</div>
          <div>{badge("#8B5CF6", `Overall Level: L${ASSESSMENT_EXAMPLE.input.overall_level} (${LEVELS[ASSESSMENT_EXAMPLE.input.overall_level].name})`)}</div>
          <div>{badge("#64748B", `Score: ${ASSESSMENT_EXAMPLE.input.overall_pct}%`)}</div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {ASSESSMENT_EXAMPLE.input.domain_scores.map(d => (
            <div key={d.code} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <code style={{ fontSize: typeScale.xs, color: "#F59E0B", fontFamily: "monospace", minWidth: 90 }}>{d.code}</code>
              <span style={{ fontSize: typeScale.sm, minWidth: 140 }}>{d.label}</span>
              <div style={{ flex: 1, minWidth: 80, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.pct}%`, background: d.level < ASSESSMENT_EXAMPLE.input.overall_level ? "#EF4444" : d.level === ASSESSMENT_EXAMPLE.input.overall_level ? "#3B82F6" : "#22C55E", borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: typeScale.xs, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", minWidth: 30, textAlign: "right" }}>{d.pct}%</span>
              {badge(LEVELS[d.level].color, `L${d.level}`)}
              {d.level < ASSESSMENT_EXAMPLE.input.overall_level && badge("#EF4444", "GAP")}
            </div>
          ))}
        </div>
      </div>

      {/* Generated Path */}
      <div style={{ ...card, borderLeft: "3px solid #22C55E" }}>
        <div style={{ fontSize: typeScale.xs, textTransform: "uppercase", letterSpacing: "0.1em", color: "#22C55E", marginBottom: 16, fontWeight: 600 }}>Generated Learning Path (Output)</div>
        {ASSESSMENT_EXAMPLE.output_path.map((phase, pi) => {
          const phaseColors = { "Remediation": "#EF4444", "Consolidation": "#3B82F6", "Advancement": "#F59E0B", "Capstone": "#22C55E" };
          return (
            <div key={pi} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: phaseColors[phase.phase] }} />
                <span style={{ fontSize: typeScale.sm, fontWeight: 700, color: phaseColors[phase.phase] }}>Phase: {phase.phase}</span>
                <span style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.3)" }}>{phase.nodes.length} node{phase.nodes.length > 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "grid", gap: 6, paddingLeft: 16 }}>
                {phase.nodes.map((n, ni) => (
                  <div key={ni} style={{ display: "flex", gap: 10, padding: "8px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.02)", alignItems: "center", flexWrap: "wrap" }}>
                    <code style={{ fontSize: typeScale.xs, color: phaseColors[phase.phase], fontFamily: "monospace", minWidth: 130 }}>{n.id}</code>
                    <span style={{ flex: 1, minWidth: 120, fontSize: typeScale.sm }}>{n.title}</span>
                    <span style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.3)" }}>{n.hours}h</span>
                    {badge("rgba(255,255,255,0.3)", n.level)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", justifyContent: "space-between", fontSize: typeScale.sm }}>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>Total nodes: {ASSESSMENT_EXAMPLE.output_path.reduce((a, p) => a + p.nodes.length, 0)}</span>
          <span style={{ fontWeight: 700 }}>Total: {ASSESSMENT_EXAMPLE.output_path.reduce((a, p) => a + p.nodes.reduce((b, n) => b + n.hours, 0), 0)} hours</span>
        </div>
      </div>

      {/* Example Node Instances */}
      <div>
        <div style={{ fontSize: typeScale.base, fontWeight: 700, marginBottom: 10 }}>Sample Node Instances (with match_criteria)</div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={() => copyJSON(EXAMPLE_NODES, "examples")} style={{ background: copiedField === "examples" ? "#22C55E" : "rgba(255,255,255,0.06)", color: copiedField === "examples" ? "#fff" : "rgba(255,255,255,0.5)", border: "none", borderRadius: "6px", padding: "6px 14px", fontSize: typeScale.xs, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            {copiedField === "examples" ? "Copied ✓" : "Copy All Examples"}
          </button>
        </div>
        {EXAMPLE_NODES.map((node, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <code style={{ fontSize: typeScale.sm, color: "#F59E0B", fontFamily: "monospace", fontWeight: 600 }}>{node.node_id}</code>
              <span style={{ fontSize: typeScale.sm }}>{node.title}</span>
            </div>
            <pre style={{ ...codeBg, fontSize: "0.65rem" }}>{JSON.stringify(node, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── MAIN RENDER ──────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#0B0B10", color: "#E0DDD8", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        pre::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }

        /* Mobile pass: this page's fixed-column grids (key/value rows, the
           4-column scoring table) don't fit a narrow phone at their built-in
           widths - collapse everything to a single column below 640px. */
        .fw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .fw-kv-row { display: grid; grid-template-columns: 160px 1fr; gap: 8px; }
        .fw-kv-row-wide { display: grid; grid-template-columns: 180px 1fr; gap: 8px; }
        .fw-scoring-row { display: grid; grid-template-columns: 180px 60px 50px 1fr; gap: 8px; }
        @media (max-width: 640px) {
          .fw-grid-2, .fw-kv-row, .fw-kv-row-wide { grid-template-columns: 1fr; }
          .fw-scoring-row { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, background: "rgba(11,11,16,0.94)", backdropFilter: "blur(12px)", zIndex: 100 }}>
        <div style={{ width: 26, height: 26, borderRadius: "5px", background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: "#fff" }}>A</div>
        <span style={{ fontSize: typeScale.lg, fontWeight: 700, letterSpacing: "-0.02em" }}>AdaptEd</span>
        <span style={{ fontSize: typeScale.xs, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Learning Path Framework v2</span>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 24px", display: "flex", gap: 0, overflowX: "auto" }}>
        {TAB_DEFS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: "none", border: "none", borderBottom: activeTab === t.id ? "2px solid #3B82F6" : "2px solid transparent",
            color: activeTab === t.id ? "#E0DDD8" : "rgba(255,255,255,0.35)",
            padding: "12px 16px", fontSize: typeScale.sm, fontWeight: activeTab === t.id ? 600 : 400,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s"
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "taxonomy" && <TaxonomyTab />}
        {activeTab === "node-schema" && <NodeSchemaTab />}
        {activeTab === "course-schema" && <CourseSchemaTab />}
        {activeTab === "matching" && <MatchingTab />}
        {activeTab === "examples" && <ExamplesTab />}
      </div>
    </div>
  );
}
