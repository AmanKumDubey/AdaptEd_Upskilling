export const LEARNING_PATH_KEY = "pathwise.learning-path.v1";

export function loadLearningPath() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LEARNING_PATH_KEY);
    const path = value ? JSON.parse(value) : null;
    return path?.version === 1 ? path : null;
  } catch {
    return null;
  }
}

export function saveLearningPath(path) {
  // A falsy `path` means "clear it" (e.g. the live backend has no path for
  // whichever account just logged in) - {...null, updatedAt} would otherwise
  // silently produce a truthy {updatedAt} garbage object, which every `if
  // (!path)` check in the UI would then treat as "a path exists".
  if (!path) {
    clearLearningPath();
    return null;
  }
  const nextPath = { ...path, updatedAt: new Date().toISOString() };
  if (typeof window === "undefined") return nextPath;
  try {
    window.localStorage.setItem(LEARNING_PATH_KEY, JSON.stringify(nextPath));
  } catch {
    // The roadmap remains usable in memory when browser storage is unavailable.
  }
  return nextPath;
}

export function clearLearningPath() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEARNING_PATH_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}
