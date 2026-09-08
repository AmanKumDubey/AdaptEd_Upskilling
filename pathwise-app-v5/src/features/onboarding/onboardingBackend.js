// ─────────────────────────────────────────────────────────────────────
// src/features/onboarding/onboardingBackend.js
// ─────────────────────────────────────────────────────────────────────
// Phase B17: bridges OnboardingFlow.jsx to the real backend
// (adapted-backend's /api/me/onboarding-profile) when auth is enabled, while
// demo mode keeps using the original localStorage-only storage - the same
// split assessmentBackend.js/learningPathBackend.js already use. Callers
// still hand the result to PathwiseDataContext's setProfile() to cache it
// locally either way, exactly like completeAssessment()/generatePath() do.
// ─────────────────────────────────────────────────────────────────────

import { onboardingProfile as onboardingProfileApi } from "../../api/endpoints";
import { loadOnboardingProfile, saveOnboardingProfile } from "./onboardingStorage";

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true";

export async function loadProfile() {
  if (!authEnabled) return loadOnboardingProfile();
  const data = await onboardingProfileApi.get();
  return data.profile || null;
}

export async function saveProfile(profileData) {
  if (!authEnabled) return saveOnboardingProfile(profileData);
  const data = await onboardingProfileApi.save(profileData);
  return data.profile;
}
