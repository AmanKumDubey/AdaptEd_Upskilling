// ─────────────────────────────────────────────────────────────────────
// src/features/learning-path/learningPathBackend.js
// ─────────────────────────────────────────────────────────────────────
// Phase B9: bridges LearningPathView.jsx / LearningModulePage.jsx to the
// real backend (adapted-backend's /api/me/learning-path/*) when auth is
// enabled, while keeping the original localStorage-only engine
// (learningPathEngine.js) working unchanged for demo mode - the same split
// assessmentBackend.js already uses.
//
// This module never touches storage itself, in either mode - exactly like
// the original code, callers are expected to hand the returned path to
// useLearningPath()'s setPath() (PathwiseDataContext), which already
// persists to localStorage on every call. In live mode that's a same-page
// cache of server-authoritative data (mirrors how assessmentBackend.js's
// completeAssessment() result still flows through setAssessmentResult());
// in demo mode it's the actual source of truth, unchanged.
//
// Only the *mutating* operations (generate/start/complete/reset) need a
// mode branch here - getModuleStatus/getLearningPathProgress/getAllModules/
// getModuleById/isLearningPathStale are pure functions over the `path`
// object's shape and work identically no matter which mode produced it, so
// they're re-exported below unchanged rather than duplicated.
// ─────────────────────────────────────────────────────────────────────

import { learningPath as learningPathApi } from "../../api/endpoints";
import {
  createLearningPathFingerprint,
  generateLearningPath,
  getAllModules,
  getLearningPathProgress,
  getModuleById,
  getModuleStatus,
  isLearningPathStale,
  resetLearningPathProgress,
  startLearningModule,
  completeLearningModule,
} from "./learningPathEngine";
import { loadLearningPath } from "./learningPathStorage";

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

export {
  getAllModules,
  getLearningPathProgress,
  getModuleById,
  getModuleStatus,
  isLearningPathStale,
  createLearningPathFingerprint,
};

export function loadPath() {
  if (!authEnabled) return Promise.resolve(loadLearningPath());
  return learningPathApi.getPath().then((data) => data.path);
}

// `profile`/`result` are the same objects the local engine already takes -
// the live call only sends the handful of fields the backend's generator
// needs (adapted-backend/services/learningPathEngine.js); the assessment
// result itself is read server-side from the real AssessmentResults table,
// not trusted from the client.
export async function generatePath(profile, result) {
  if (!authEnabled) return generateLearningPath(profile, result);

  const data = await learningPathApi.generate({
    targetRole: profile?.targetRole,
    hoursPerWeek: profile?.hoursPerWeek,
    learningFormats: profile?.learningFormats,
    learningPace: profile?.learningPace,
    sourceFingerprint: createLearningPathFingerprint(profile, result),
  });
  return data.path;
}

export async function startModule(path, moduleId) {
  if (!authEnabled) return startLearningModule(path, moduleId);
  const data = await learningPathApi.startModule(moduleId);
  return data.path;
}

export async function completeModule(path, moduleId) {
  if (!authEnabled) return completeLearningModule(path, moduleId);
  const data = await learningPathApi.completeModule(moduleId);
  return data.path;
}

export async function resetProgress(path) {
  if (!authEnabled) return resetLearningPathProgress(path);
  const data = await learningPathApi.resetProgress();
  return data.path;
}
