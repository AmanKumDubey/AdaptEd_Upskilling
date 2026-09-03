import { LEARNING_STAGES, getTrackModules } from "./learningPathData.js";

const LEVEL_ORDER = ["Beginner", "Developing", "Intermediate", "Advanced", "Expert"];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function preferredActivity(profile, fallback) {
  const formats = (profile.learningFormats || []).map(normalize);
  if (formats.some((item) => item.includes("project"))) return `Hands-on project: ${fallback}`;
  if (formats.some((item) => item.includes("video"))) return `Guided video lesson followed by practice: ${fallback}`;
  if (formats.some((item) => item.includes("reading"))) return `Reading brief followed by application: ${fallback}`;
  if (formats.some((item) => item.includes("mentor"))) return `Mentor review activity: ${fallback}`;
  return fallback;
}

export function createLearningPathFingerprint(profile, result) {
  return JSON.stringify({
    profileCompletedAt: profile?.completedAt || "",
    targetRole: profile?.targetRole || "",
    hoursPerWeek: profile?.hoursPerWeek || "",
    formats: profile?.learningFormats || [],
    pace: profile?.learningPace || "",
    assessmentId: result?.id || "",
    score: result?.score ?? null,
  });
}

function matchesGap(module, gaps) {
  const searchable = normalize([module.domain, module.title, ...(module.skills || [])].join(" "));
  return gaps.some((gap) => searchable.includes(gap) || gap.includes(normalize(module.domain)));
}

export function generateLearningPath(profile, result) {
  const personaId = result.personaId || "tech";
  const gaps = (result.gaps || [])
    .map(normalize)
    .filter((gap) => gap && !gap.includes("no priority"));
  const weeklyHours = Math.min(40, Math.max(2, Number(profile.hoursPerWeek) || 6));
  const currentLevelIndex = Math.max(0, LEVEL_ORDER.indexOf(result.level));
  const targetLevel = LEVEL_ORDER[Math.min(currentLevelIndex + 1, LEVEL_ORDER.length - 1)];
  const baseModules = getTrackModules(personaId).map((module, index) => ({
    ...module,
    order: index,
    priority: matchesGap(module, gaps),
    difficulty: module.stage === "foundation" ? result.level : targetLevel,
    activity: preferredActivity(profile, module.activity),
  }));

  const orderedModules = LEARNING_STAGES.flatMap((stage) =>
    baseModules
      .filter((module) => module.stage === stage.id)
      .sort((a, b) => Number(b.priority) - Number(a.priority) || a.order - b.order),
  ).map((module, index, modules) => ({
    ...module,
    prerequisites: index === 0 ? [] : [modules[index - 1].id],
  }));

  let cumulativeHours = 0;
  const stages = LEARNING_STAGES.map((stage) => {
    const modules = orderedModules.filter((module) => module.stage === stage.id);
    const startWeek = Math.floor(cumulativeHours / weeklyHours) + 1;
    cumulativeHours += modules.reduce((total, module) => total + module.hours, 0);
    const endWeek = Math.max(startWeek, Math.ceil(cumulativeHours / weeklyHours));
    return { ...stage, weeks: `Weeks ${startWeek}–${endWeek}`, modules };
  }).filter((stage) => stage.modules.length);

  return {
    version: 1,
    id: `learning-path-${Date.now()}`,
    sourceFingerprint: createLearningPathFingerprint(profile, result),
    personaId,
    targetRole: profile.targetRole || result.recommendedRoles?.[0] || "AI Professional",
    currentLevel: result.level,
    targetLevel,
    assessmentScore: result.score,
    hoursPerWeek: weeklyHours,
    learningPreference: profile.learningFormats?.join(", ") || "Flexible mixed format",
    learningPace: profile.learningPace || "Flexible self-paced",
    estimatedWeeks: Math.max(1, Math.ceil(cumulativeHours / weeklyHours)),
    totalHours: cumulativeHours,
    priorityGaps: gaps.length ? result.gaps : ["Maintain balanced growth across all assessed domains"],
    stages,
    completedModuleIds: [],
    currentModuleId: orderedModules[0]?.id || null,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getAllModules(path) {
  return path?.stages?.flatMap((stage) => stage.modules) || [];
}

export function getModuleById(path, moduleId) {
  return getAllModules(path).find((module) => module.id === moduleId) || null;
}

export function getModuleStatus(path, module) {
  if (path.completedModuleIds.includes(module.id)) return "completed";
  if (path.currentModuleId === module.id) return "current";
  const unlocked = module.prerequisites.every((id) => path.completedModuleIds.includes(id));
  return unlocked ? "available" : "locked";
}

export function getLearningPathProgress(path) {
  const modules = getAllModules(path);
  const completed = path?.completedModuleIds?.length || 0;
  return {
    completed,
    total: modules.length,
    percentage: modules.length ? Math.round((completed / modules.length) * 100) : 0,
  };
}

export function startLearningModule(path, moduleId) {
  const module = getModuleById(path, moduleId);
  if (!module || getModuleStatus(path, module) === "locked") return path;
  return { ...path, currentModuleId: moduleId, updatedAt: new Date().toISOString() };
}

export function completeLearningModule(path, moduleId) {
  const module = getModuleById(path, moduleId);
  if (!module || getModuleStatus(path, module) === "locked") return path;
  const completedModuleIds = Array.from(new Set([...path.completedModuleIds, moduleId]));
  const modules = getAllModules(path);
  const nextModule = modules.find((candidate) =>
    !completedModuleIds.includes(candidate.id) &&
    candidate.prerequisites.every((id) => completedModuleIds.includes(id)),
  );
  return {
    ...path,
    completedModuleIds,
    currentModuleId: nextModule?.id || null,
    updatedAt: new Date().toISOString(),
  };
}

export function resetLearningPathProgress(path) {
  const firstModule = getAllModules(path)[0];
  return {
    ...path,
    completedModuleIds: [],
    currentModuleId: firstModule?.id || null,
    updatedAt: new Date().toISOString(),
  };
}

export function isLearningPathStale(path, profile, result) {
  return Boolean(path && path.sourceFingerprint !== createLearningPathFingerprint(profile, result));
}
