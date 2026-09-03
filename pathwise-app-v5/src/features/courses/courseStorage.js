import { getCourseById } from "./courseData";

export const COURSE_PROGRESS_KEY = "pathwise.course-progress.v1";

const EMPTY_PROGRESS = { version: 1, savedIds: [], startedIds: [], completedIds: [], certificates: [] };

function readProgress() {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const value = window.localStorage.getItem(COURSE_PROGRESS_KEY);
    const data = value ? JSON.parse(value) : null;
    if (!data || data.version !== 1) return EMPTY_PROGRESS;
    return {
      version: 1,
      savedIds: Array.isArray(data.savedIds) ? data.savedIds : [],
      startedIds: Array.isArray(data.startedIds) ? data.startedIds : [],
      completedIds: Array.isArray(data.completedIds) ? data.completedIds : [],
      certificates: Array.isArray(data.certificates) ? data.certificates : [],
      updatedAt: data.updatedAt || null,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function loadCourseProgress() {
  return readProgress();
}

export function clearCourseProgress() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COURSE_PROGRESS_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}

export function saveCourseProgress(progress) {
  const next = { ...progress, version: 1, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(next)); } catch { /* Keep in-memory state. */ }
  }
  return next;
}

export function getCourseStatus(progress, courseId) {
  if (progress.completedIds.includes(courseId)) return "completed";
  if (progress.startedIds.includes(courseId)) return "started";
  return "not_started";
}

export function toggleSavedCourse(progress, courseId) {
  const savedIds = progress.savedIds.includes(courseId)
    ? progress.savedIds.filter((id) => id !== courseId)
    : [...progress.savedIds, courseId];
  return saveCourseProgress({ ...progress, savedIds });
}

export function startCourse(progress, courseId) {
  const startedIds = progress.startedIds.includes(courseId) ? progress.startedIds : [...progress.startedIds, courseId];
  return saveCourseProgress({ ...progress, startedIds });
}

export function completeCourse(progress, courseId) {
  const alreadyCompleted = progress.completedIds.includes(courseId);
  const startedIds = progress.startedIds.includes(courseId) ? progress.startedIds : [...progress.startedIds, courseId];
  const completedIds = alreadyCompleted ? progress.completedIds : [...progress.completedIds, courseId];
  const existingCertificates = progress.certificates || [];
  const certificates = alreadyCompleted ? existingCertificates : [...existingCertificates, issueCertificate(courseId)];
  return saveCourseProgress({ ...progress, startedIds, completedIds, certificates });
}

function issueCertificate(courseId) {
  const course = getCourseById(courseId);
  return {
    id: `cert-${courseId}-${Date.now()}`,
    courseId,
    courseTitle: course?.title || courseId,
    provider: course?.provider || "Pathwise",
    issuedAt: new Date().toISOString(),
  };
}

export function getCertificates(progress) {
  return [...(progress.certificates || [])].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );
}

export function getCertificateForCourse(progress, courseId) {
  return (progress.certificates || []).find((certificate) => certificate.courseId === courseId) || null;
}
