import { PERSONAS, QUIZZES } from "../../SkillsAssessment";

const RECOMMENDED_ROLES = {
  tech: ["AI Engineer", "Machine Learning Engineer", "MLOps Engineer"],
  data: ["Data Scientist", "Applied Scientist", "Analytics Lead"],
  nontech: ["AI-enabled Business Professional", "Business Analyst", "AI Product Specialist"],
  manager: ["AI Program Manager", "Head of AI", "Digital Transformation Lead"],
};

// Each persona's full bank is 100 questions (questionBank.json) - one
// attempt samples this many at random rather than showing all of them.
export const QUESTIONS_PER_ATTEMPT = 20;

// Unbiased shuffle (Fisher-Yates) - `sort(() => Math.random() - 0.5)` is a
// well-known non-uniform shuffle and was deliberately avoided here.
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Ids are derived from each question's fixed position in the FULL bank
// (questionBank.json's array order never changes), not from its position in
// a sampled subset - so answers keyed by id stay correct no matter which
// random subset a given session picked or what order they're shown in.
function getFullBank(personaId) {
  return (QUIZZES[personaId] || []).map((question, index) => ({
    ...question,
    id: `${personaId}-${index + 1}`,
  }));
}

// A session's `questionIds` (set once, at creation, in createAssessmentSession)
// is the actual source of truth for "which questions is this attempt made
// of" - personaId alone is no longer enough now that each attempt draws a
// fresh random sample from the persona's full 100-question pool.
export function getAssessmentQuestions(personaId, questionIds) {
  if (!questionIds) return [];
  const byId = new Map(getFullBank(personaId).map((q) => [q.id, q]));
  return questionIds.map((id) => byId.get(id)).filter(Boolean);
}

export function createAssessmentSession(personaId) {
  const now = new Date().toISOString();
  const questionIds = shuffle(getFullBank(personaId))
    .slice(0, QUESTIONS_PER_ATTEMPT)
    .map((q) => q.id);

  return {
    version: 1,
    status: "in_progress",
    personaId,
    questionIds,
    currentQuestion: 0,
    answers: {},
    startedAt: now,
    updatedAt: now,
  };
}

export function getProficiencyLevel(score) {
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Intermediate";
  if (score >= 40) return "Developing";
  return "Beginner";
}

export function calculateAssessmentResult(session) {
  const questions = getAssessmentQuestions(session.personaId, session.questionIds);
  const persona = PERSONAS[session.personaId];
  const review = questions.map((question) => {
    const selectedIndex = session.answers[question.id];
    return {
      questionId: question.id,
      question: question.q,
      domain: question.domain,
      selectedIndex,
      selectedAnswer: question.opts[selectedIndex] || "Not answered",
      correctIndex: question.correct,
      correctAnswer: question.opts[question.correct],
      isCorrect: selectedIndex === question.correct,
      explanation: question.explanation,
    };
  });
  const correctCount = review.filter((answer) => answer.isCorrect).length;
  const score = Math.round((correctCount / questions.length) * 100);

  const domainGroups = review.reduce((groups, answer) => {
    const current = groups[answer.domain] || { correct: 0, total: 0 };
    current.total += 1;
    if (answer.isCorrect) current.correct += 1;
    groups[answer.domain] = current;
    return groups;
  }, {});

  const domainScores = Object.entries(domainGroups)
    .map(([domain, values]) => ({
      domain,
      correct: values.correct,
      total: values.total,
      score: Math.round((values.correct / values.total) * 100),
    }))
    .sort((a, b) => b.score - a.score);

  const strengths = domainScores.filter((domain) => domain.score >= 70).map((domain) => domain.domain);
  const gaps = domainScores.filter((domain) => domain.score < 60).map((domain) => domain.domain);

  return {
    version: 1,
    id: `assessment-${Date.now()}`,
    personaId: session.personaId,
    personaTitle: persona.title,
    score,
    correctCount,
    total: questions.length,
    level: getProficiencyLevel(score),
    domainScores,
    strengths: strengths.length ? strengths : [domainScores[0]?.domain].filter(Boolean),
    gaps: gaps.length ? gaps : ["No priority gaps detected"],
    recommendedRoles: RECOMMENDED_ROLES[session.personaId],
    answers: review,
    completedAt: new Date().toISOString(),
  };
}

export function inferPersonaId(profile) {
  const role = `${profile?.targetRole || ""} ${profile?.currentRole || ""}`.toLowerCase();
  if (role.includes("data") || role.includes("analyst")) return "data";
  if (role.includes("manager") || role.includes("lead") || role.includes("cto") || role.includes("director")) return "manager";
  if (role.includes("business") || role.includes("marketing") || role.includes("sales")) return "nontech";
  return "tech";
}
