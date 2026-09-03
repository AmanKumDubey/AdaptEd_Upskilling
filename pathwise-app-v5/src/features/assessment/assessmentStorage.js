export const ASSESSMENT_SESSION_KEY = "pathwise.assessment.session.v1";
export const ASSESSMENT_RESULT_KEY = "pathwise.assessment.result.v1";

function readJson(key) {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The assessment still works in memory when browser storage is unavailable.
  }
}

export function loadAssessmentSession() {
  const session = readJson(ASSESSMENT_SESSION_KEY);
  if (!session || session.version !== 1 || session.status !== "in_progress") return null;
  return session;
}

export function saveAssessmentSession(session) {
  const nextSession = { ...session, updatedAt: new Date().toISOString() };
  writeJson(ASSESSMENT_SESSION_KEY, nextSession);
  return nextSession;
}

export function clearAssessmentSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ASSESSMENT_SESSION_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}

export function loadAssessmentResult() {
  const result = readJson(ASSESSMENT_RESULT_KEY);
  return result?.version === 1 ? result : null;
}

export function saveAssessmentResult(result) {
  writeJson(ASSESSMENT_RESULT_KEY, result);
  return result;
}

export function clearAssessmentResult() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ASSESSMENT_RESULT_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}
