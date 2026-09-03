import { useMemo } from "react";
import { getCourseById } from "../courses/courseData";
import { formatRelativeTime } from "../../utils/time";
import { useAssessmentResult, useCourseProgress, useProfile } from "../../state/PathwiseDataContext";

const CATEGORY_RULES = [
  { category: "Data & AI", keywords: ["python", "sql", "machine learning", "ml fundamentals", "advanced ml", "statistics", "deep learning", "tensorflow", "pytorch", "data", "neural", "nlp", "transformers", "llm", "genai", "rag", "model", "ai concepts", "prompt", "feature engineering"] },
  { category: "Engineering", keywords: ["docker", "aws", "react", "ci/cd", "cloud", "mlops", "deployment", "vector search", "architecture"] },
  { category: "Strategy & Governance", keywords: ["governance", "risk", "strategy", "roi", "vendor", "ethics", "fairness", "leadership", "economics"] },
  { category: "Communication", keywords: ["communication", "interview", "portfolio", "presentation", "storytelling"] },
];

function categorize(name) {
  const normalized = name.toLowerCase();
  const match = CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.category || "General";
}

function blankEntry(name) {
  return { name, category: categorize(name), level: 0, verified: false, courses: 0, assessed: null };
}

function upsert(registry, name, patch) {
  if (!name) return;
  const key = name.toLowerCase();
  const existing = registry.get(key) || blankEntry(name);
  registry.set(key, { ...existing, ...patch });
}

/**
 * Builds the learner's real skill portfolio from three independent sources:
 * self-reported onboarding skills, assessed domain scores, and completed course skills.
 */
export function buildSkillsWallet({ profile, result, courseProgress }) {
  const registry = new Map();

  (profile?.skills || []).forEach((skill) => {
    const existing = registry.get(skill.toLowerCase());
    upsert(registry, skill, { level: Math.max(existing?.level || 0, 35) });
  });

  (result?.domainScores || []).forEach(({ domain, score }) => {
    const existing = registry.get(domain.toLowerCase());
    upsert(registry, domain, {
      level: Math.max(existing?.level || 0, score),
      verified: Boolean(existing?.verified) || score >= 70,
      assessed: formatRelativeTime(result.completedAt),
    });
  });

  const completedCourses = (courseProgress?.completedIds || []).map(getCourseById).filter(Boolean);
  completedCourses.forEach((course) => {
    course.skills.forEach((skill) => {
      const existing = registry.get(skill.toLowerCase());
      const courseCount = (existing?.courses || 0) + 1;
      upsert(registry, skill, {
        courses: courseCount,
        level: Math.min(95, Math.max(existing?.level || 0, (existing?.level || 30) + 15)),
        verified: Boolean(existing?.verified) || courseCount >= 2,
      });
    });
  });

  const skills = Array.from(registry.values()).sort((a, b) => b.level - a.level);
  const totalSkills = skills.length;

  return {
    skills,
    stats: {
      totalSkills,
      verified: skills.filter((skill) => skill.verified).length,
      avgProficiency: totalSkills
        ? Math.round(skills.reduce((sum, skill) => sum + skill.level, 0) / totalSkills)
        : 0,
      coursesCompleted: courseProgress?.completedIds?.length || 0,
    },
    isEmpty: totalSkills === 0,
  };
}

// Composes the shared profile/assessment/course-progress state into a memoized wallet.
export function useSkillsWallet() {
  const [profile] = useProfile();
  const [result] = useAssessmentResult();
  const [courseProgress] = useCourseProgress();
  return useMemo(
    () => buildSkillsWallet({ profile, result, courseProgress }),
    [profile, result, courseProgress],
  );
}
