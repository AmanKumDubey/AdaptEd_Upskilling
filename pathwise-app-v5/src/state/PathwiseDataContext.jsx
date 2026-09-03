import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  clearOnboardingDraft,
  clearOnboardingProfile,
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../features/onboarding/onboardingStorage";
import {
  clearAssessmentResult,
  clearAssessmentSession,
  loadAssessmentResult,
  saveAssessmentResult,
} from "../features/assessment/assessmentStorage";
import {
  clearLearningPath,
  loadLearningPath,
  saveLearningPath,
} from "../features/learning-path/learningPathStorage";
import {
  clearCourseProgress,
  loadCourseProgress,
} from "../features/courses/courseStorage";

/**
 * Single source of truth for the five Phase 7 data domains: profile, assessment
 * result, learning path, and course progress (skills are derived from these three).
 * Hydrates from localStorage once on mount; every mutation persists through the
 * existing per-feature storage modules and then updates this shared state so all
 * mounted views stay in sync without needing a route change to see fresh data.
 */
const PathwiseDataContext = createContext(null);

export function PathwiseDataProvider({ children }) {
  const [profile, setProfileState] = useState(() => loadOnboardingProfile());
  const [assessmentResult, setAssessmentResultState] = useState(() => loadAssessmentResult());
  const [learningPath, setLearningPathState] = useState(() => loadLearningPath());
  const [courseProgress, setCourseProgressState] = useState(() => loadCourseProgress());

  const setProfile = useCallback((data) => {
    const saved = saveOnboardingProfile(data);
    setProfileState(saved);
    return saved;
  }, []);

  const setAssessmentResult = useCallback((result) => {
    const saved = saveAssessmentResult(result);
    setAssessmentResultState(saved);
    return saved;
  }, []);

  const setLearningPath = useCallback((path) => {
    const saved = saveLearningPath(path);
    setLearningPathState(saved);
    return saved;
  }, []);

  // Course-progress mutators (toggleSavedCourse/startCourse/completeCourse) already
  // persist internally and return the saved shape, so this only needs to sync state.
  const setCourseProgress = useCallback((progress) => {
    setCourseProgressState(progress);
    return progress;
  }, []);

  const resetAllDemoData = useCallback(() => {
    clearOnboardingDraft();
    clearOnboardingProfile();
    clearAssessmentSession();
    clearAssessmentResult();
    clearLearningPath();
    clearCourseProgress();
    setProfileState(null);
    setAssessmentResultState(null);
    setLearningPathState(null);
    setCourseProgressState(loadCourseProgress());
  }, []);

  const value = useMemo(() => ({
    profile,
    setProfile,
    assessmentResult,
    setAssessmentResult,
    learningPath,
    setLearningPath,
    courseProgress,
    setCourseProgress,
    resetAllDemoData,
  }), [
    profile,
    setProfile,
    assessmentResult,
    setAssessmentResult,
    learningPath,
    setLearningPath,
    courseProgress,
    setCourseProgress,
    resetAllDemoData,
  ]);

  return <PathwiseDataContext.Provider value={value}>{children}</PathwiseDataContext.Provider>;
}

function usePathwiseData() {
  const context = useContext(PathwiseDataContext);
  if (!context) throw new Error("usePathwiseData must be used within a PathwiseDataProvider");
  return context;
}

export function useProfile() {
  const { profile, setProfile } = usePathwiseData();
  return [profile, setProfile];
}

export function useAssessmentResult() {
  const { assessmentResult, setAssessmentResult } = usePathwiseData();
  return [assessmentResult, setAssessmentResult];
}

export function useLearningPath() {
  const { learningPath, setLearningPath } = usePathwiseData();
  return [learningPath, setLearningPath];
}

export function useCourseProgress() {
  const { courseProgress, setCourseProgress } = usePathwiseData();
  return [courseProgress, setCourseProgress];
}

export function useResetDemoData() {
  return usePathwiseData().resetAllDemoData;
}
