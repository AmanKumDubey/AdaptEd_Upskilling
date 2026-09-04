// ─────────────────────────────────────────────────────────────────────
// src/features/assessment/assessmentBackend.js
// ─────────────────────────────────────────────────────────────────────
// Phase B8: bridges AssessmentExperience.jsx to the real backend
// (adapted-backend's /api/me/assessment/*) when auth is enabled, while
// keeping the original localStorage-only engine (assessmentEngine.js +
// assessmentStorage.js) working unchanged for demo mode (VITE_AUTH_ENABLED
// !== "true") - the same split the rest of the app already uses (see
// router.jsx's LIVE_DASHBOARD_ENABLED). Every function here returns the
// SAME shape regardless of mode, so AssessmentExperience.jsx never branches
// on authEnabled itself.
// ─────────────────────────────────────────────────────────────────────

import { PERSONAS } from "../../SkillsAssessment";
import { assessments as assessmentApi } from "../../api/endpoints";
import {
  calculateAssessmentResult,
  createAssessmentSession,
  getAssessmentQuestions,
  QUESTIONS_PER_ATTEMPT,
} from "./assessmentEngine";
import {
  clearAssessmentSession,
  loadAssessmentSession,
  saveAssessmentSession,
} from "./assessmentStorage";

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";
export { QUESTIONS_PER_ATTEMPT };

// The backend never sends `bloom`/uses `questionText`/`options` field names
// (see adapted-backend/controllers/assessmentController.js's toSafeQuestion)
// - mapped here to the {id, domain, bloom, q, opts} shape the UI already
// renders, so nothing downstream needs to know which mode produced a session.
function toLocalQuestionShape(serverQuestion) {
  return {
    id: serverQuestion.id,
    domain: serverQuestion.domain,
    bloom: serverQuestion.bloom || "",
    q: serverQuestion.questionText,
    opts: serverQuestion.options,
  };
}

function toLocalSessionShape(serverSession) {
  return {
    id: serverSession.id,
    personaId: serverSession.personaId,
    questionIds: serverSession.questionIds,
    currentQuestion: serverSession.currentQuestion || 0,
    answers: serverSession.answers || {},
    updatedAt: serverSession.updatedAt,
    // Embedded because, unlike demo mode, there's no bundled question-bank
    // JSON on the client to look these up from afterwards.
    questions: (serverSession.questions || []).map(toLocalQuestionShape),
  };
}

export async function loadResumableSession() {
  if (!authEnabled) return loadAssessmentSession();
  const data = await assessmentApi.getActiveSession();
  return data.session ? toLocalSessionShape(data.session) : null;
}

export async function startSession(personaId) {
  if (!authEnabled) return createAssessmentSession(personaId);
  const data = await assessmentApi.startSession(personaId);
  return toLocalSessionShape(data.session);
}

// Local mode still writes through to localStorage on every change (unchanged
// behavior, including remembering `currentQuestion` across a refresh). Live
// mode has nothing to write here - the one thing worth persisting
// server-side (an answer) already went out via recordAnswer() below - so
// this just stamps updatedAt on the in-memory object React holds.
export function persistSession(session) {
  if (!authEnabled) return saveAssessmentSession(session);
  return { ...session, updatedAt: new Date().toISOString() };
}

export async function recordAnswer(session, questionId, selectedIndex) {
  if (authEnabled) {
    await assessmentApi.answerQuestion(session.id, questionId, selectedIndex);
  }
  return persistSession({ ...session, answers: { ...session.answers, [questionId]: selectedIndex } });
}

export function clearSession() {
  if (!authEnabled) clearAssessmentSession();
}

export function getQuestionsForSession(session) {
  if (!session) return [];
  if (authEnabled) return session.questions || [];
  return getAssessmentQuestions(session.personaId, session.questionIds);
}

// Result shape matches AssessmentResultsPage.jsx's expectations either way -
// the server's response (adapted-backend's completeSession) already lines up
// field-for-field with the local calculateAssessmentResult() output, aside
// from `personaTitle` (presentation-only, never left the client to begin
// with - PERSONAS is a frontend constant) and `version: 1`, which
// assessmentStorage.js's loadAssessmentResult() requires to accept a cached
// result as valid on the next page load - without it, setAssessmentResult()
// below still writes the result to localStorage, but it silently reads back
// as null afterwards (confirmed live: the Skills Wallet stayed empty right
// after a real completed assessment, purely because of this missing field).
export async function completeAssessment(session) {
  if (!authEnabled) return calculateAssessmentResult(session);

  const data = await assessmentApi.completeSession(session.id);
  return { ...data.result, version: 1, personaTitle: PERSONAS[data.result.personaId]?.title };
}
