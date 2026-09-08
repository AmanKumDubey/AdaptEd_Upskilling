export const ONBOARDING_DRAFT_KEY = "pathwise.onboarding.draft.v1";
export const ONBOARDING_PROFILE_KEY = "pathwise.profile.v1";

export const EMPTY_ONBOARDING_PROFILE = {
  firstName: "",
  lastName: "",
  location: "",
  language: "English",
  educationLevel: "",
  fieldOfStudy: "",
  employmentStatus: "",
  experienceYears: "",
  graduationYear: "",
  skills: [],
  interests: [],
  targetRole: "",
  careerGoal: "",
  hoursPerWeek: "",
  timeline: "",
  constraints: "",
  learningFormats: [],
  learningPace: "",
};

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
    // The form remains usable if browser storage is blocked or full.
  }
}

function normalizeProfile(value) {
  if (!value || typeof value !== "object") return null;

  return {
    ...EMPTY_ONBOARDING_PROFILE,
    ...value,
    skills: Array.isArray(value.skills) ? value.skills : [],
    interests: Array.isArray(value.interests) ? value.interests : [],
    learningFormats: Array.isArray(value.learningFormats) ? value.learningFormats : [],
  };
}

export function loadOnboardingDraft() {
  const stored = readJson(ONBOARDING_DRAFT_KEY);
  const data = normalizeProfile(stored?.data);

  if (!data) return null;

  return {
    data,
    step: Number.isInteger(stored.step) ? Math.min(Math.max(stored.step, 0), 6) : 0,
    savedAt: stored.savedAt ?? null,
  };
}

export function saveOnboardingDraft(data, step) {
  writeJson(ONBOARDING_DRAFT_KEY, {
    version: 1,
    data: normalizeProfile(data),
    step,
    savedAt: new Date().toISOString(),
  });
}

export function clearOnboardingDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

export function loadOnboardingProfile() {
  return normalizeProfile(readJson(ONBOARDING_PROFILE_KEY));
}

export function clearOnboardingProfile() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ONBOARDING_PROFILE_KEY);
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

export function saveOnboardingProfile(data) {
  // A falsy `data` means "no profile" (e.g. reconciling against a server
  // that has none yet) - spreading normalizeProfile(null) (itself null)
  // would otherwise still produce a truthy { onboardingCompleted: true }
  // object, the same landmine learningPathStorage.js's saveLearningPath()
  // had before it was fixed.
  if (!data) {
    clearOnboardingProfile();
    return null;
  }

  const profile = {
    ...normalizeProfile(data),
    onboardingCompleted: true,
    completedAt: new Date().toISOString(),
  };

  writeJson(ONBOARDING_PROFILE_KEY, profile);
  return profile;
}
