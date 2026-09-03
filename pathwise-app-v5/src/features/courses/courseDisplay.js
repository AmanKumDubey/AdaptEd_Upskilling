// Display helpers for REAL backend courses (adapted-backend's Courses
// table - scraped Coursera/Udemy/Skillshare content). Separate from
// courseData.js's curated demo catalog, which Learning Path and Skills
// Wallet still use - the backend catalog has no "linked module" concept.

const PLATFORM_STYLES = {
  coursera: { mark: "CO", accent: "#2563EB", label: "Coursera" },
  udemy: { mark: "UD", accent: "#7C3AED", label: "Udemy" },
  skillshare: { mark: "SS", accent: "#14B8A6", label: "Skillshare" },
};

export function getPlatformStyle(platform) {
  return (
    PLATFORM_STYLES[platform] || {
      mark: (platform || "?").slice(0, 2).toUpperCase(),
      accent: "#64748B",
      label: platform || "Unknown",
    }
  );
}

export const COURSE_LEVELS = ["All", "Beginner", "Intermediate", "Advanced"];
export const COURSE_PLATFORMS = ["All", "coursera", "udemy", "skillshare"];

export function getInstructorNames(instructors) {
  if (!Array.isArray(instructors)) return "";
  return instructors.map((i) => i?.name).filter(Boolean).join(", ");
}
