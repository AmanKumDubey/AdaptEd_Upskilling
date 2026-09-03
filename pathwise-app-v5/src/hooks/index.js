// ─────────────────────────────────────────────────────────────────────
// src/hooks/index.js — Domain-specific hooks
// ─────────────────────────────────────────────────────────────────────
// Each hook handles one feature area, built on the real backend endpoints
// in api/endpoints.js. Learning Path / Skills Wallet / Assessments /
// Employer have no backend endpoints yet (see the note at the bottom of
// endpoints.js) so there are no hooks for them here - those views keep
// using the local mock data in src/features/ and src/state/ for now.
//
// Usage in components:
//   const { data: courses, loading } = useCourses({ level: "Advanced" });
//   const { execute: enrollIn } = useEnrollCourse();
// ─────────────────────────────────────────────────────────────────────

import { useApi, useMutation } from "./useApi";
import {
  courses as coursesApi,
  myCourses as myCoursesApi,
  certificates as certificatesApi,
  recommendations as recommendationsApi,
  onboarding as onboardingApi,
  organizations as organizationsApi,
} from "../api/endpoints";

// ─── Not implemented on the backend yet ──────────────────────────────
// src/views/DashboardView.jsx (a disabled reference view, gated behind
// VITE_AUTH_ENABLED && VITE_API_ENABLED, both false by default) still
// imports these by name so the production build can resolve them - there is
// no /api/dashboard or /api/assessments route, so these report an
// unimplemented error rather than fabricate data. Real "continue learning"
// data is available today via useMyCoursesDashboard() below.
const notImplemented = (label) => ({
  data: null,
  loading: false,
  error: `${label} is not implemented on the backend yet`,
  refetch: () => {},
});

export function useDashboard() {
  return notImplemented("Dashboard");
}

export function useEnrolledCourses() {
  return notImplemented("Enrolled courses");
}

export function useAssessments() {
  return notImplemented("Assessments");
}

// ─── Onboarding ──────────────────────────────────────────────────────
export function useOnboardingData() {
  return useApi(() => onboardingApi.getData(), {
    initialData: { availableOptions: { goals: [], interests: [], experienceLevels: [], themePreferences: [] } },
  });
}

export function useCompleteOnboarding() {
  return useMutation((data) => onboardingApi.complete(data));
}

// ─── Public course catalog ───────────────────────────────────────────
// Takes `filters` as a plain argument, not internal state - CoursesView.jsx
// owns the search/level/platform/page state itself and just needs a fresh
// request whenever any of that changes. An earlier version stored filters in
// useState(initialFilters), which only ever reads that argument on the FIRST
// render (React ignores it on every render after) - so page/search/filter
// changes recomputed a new object in the caller but never actually reached
// the API call, silently freezing every request at whatever the page loaded
// with first. That's why pagination and filtering both did nothing.
export function useCourses(filters = {}) {
  const query = useApi(() => coursesApi.list(filters), {
    initialData: { courses: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } },
    deps: [JSON.stringify(filters)],
  });

  return {
    ...query,
    courses: query.data?.courses || [],
    meta: query.data?.meta || { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  };
}

export function useCourse(courseId) {
  return useApi(() => coursesApi.getById(courseId), {
    initialData: null,
    enabled: !!courseId,
    deps: [courseId],
    transform: (d) => d?.course || d,
  });
}

// ─── My courses (wishlist / continue learning) ──────────────────────
export function useMyCoursesDashboard() {
  return useApi(() => myCoursesApi.getDashboard(), {
    // Must match the real endpoint's full shape - CourseDetailsPage.jsx reads
    // .completed before the first fetch resolves; missing it here crashed
    // with "Cannot read properties of undefined (reading 'some')".
    initialData: { continueLearning: [], wishlist: [], completed: [], counts: { continueLearning: 0, wishlist: 0, completed: 0 } },
  });
}

export function useToggleWishlist() {
  return useMutation(({ courseId, isWishlist }) => myCoursesApi.toggleWishlist(courseId, isWishlist));
}

export function useEnrollCourse() {
  return useMutation((courseId) => myCoursesApi.enroll(courseId));
}

export function useVerifyCourseEnrollment() {
  return useMutation((courseId) => myCoursesApi.verify(courseId));
}

export function useCompleteCourse() {
  return useMutation(({ courseId, data }) => myCoursesApi.complete(courseId, data));
}

// ─── Certificates ────────────────────────────────────────────────────
export function useCertificates(courseId) {
  return useApi(() => certificatesApi.list(courseId), {
    initialData: [],
    deps: [courseId],
  });
}

export function usePresignCertificateUpload() {
  return useMutation(({ courseId, fileName, contentType }) =>
    certificatesApi.presignUpload(courseId, fileName, contentType)
  );
}

// ─── Recommendations ─────────────────────────────────────────────────
export function useRecommendations() {
  return useApi(() => recommendationsApi.get(), { initialData: null });
}

export function useRefreshRecommendations() {
  return useMutation(() => recommendationsApi.refresh());
}

// ─── Organizations ───────────────────────────────────────────────────
export function useMyOrganizations() {
  return useApi(() => organizationsApi.listMine(), { initialData: [] });
}

export function useOrganization(orgId) {
  return useApi(() => organizationsApi.getById(orgId), {
    initialData: null,
    enabled: !!orgId,
    deps: [orgId],
  });
}

export function useCreateOrganization() {
  return useMutation(({ name, slug }) => organizationsApi.create(name, slug));
}
