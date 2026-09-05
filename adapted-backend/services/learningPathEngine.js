// Phase B9: verbatim port of pathwise-app-v5/src/features/learning-path/
// learningPathEngine.js's pure functions - the frontend keeps its own copy
// for the demo/local mode, this is the server-side twin used to (a) build
// the frozen `stages` blob at generation time and (b) validate mutations
// (start/complete/reset) before writing them. getModuleStatus/getAllModules/
// getModuleById are internal helpers only - the client already has its own
// copies and computes module *status* itself; nothing here is exposed
// directly over the API.
const { LEARNING_STAGES, getTrackModules } = require('./learningPathData');

const LEVEL_ORDER = ['Beginner', 'Developing', 'Intermediate', 'Advanced', 'Expert'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function preferredActivity(learningFormats, fallback) {
  const formats = (learningFormats || []).map(normalize);
  if (formats.some((item) => item.includes('project'))) return `Hands-on project: ${fallback}`;
  if (formats.some((item) => item.includes('video'))) return `Guided video lesson followed by practice: ${fallback}`;
  if (formats.some((item) => item.includes('reading'))) return `Reading brief followed by application: ${fallback}`;
  if (formats.some((item) => item.includes('mentor'))) return `Mentor review activity: ${fallback}`;
  return fallback;
}

function matchesGap(module, gaps) {
  const searchable = normalize([module.domain, module.title, ...(module.skills || [])].join(' '));
  return gaps.some((gap) => searchable.includes(gap) || gap.includes(normalize(module.domain)));
}

// `profileInput` is just the handful of onboarding fields the generator
// needs ({ targetRole, hoursPerWeek, learningFormats, learningPace }), sent
// by the client at generate time - see the "why onboarding isn't stored
// server-side yet" note in assessmentController.js's sibling design doc.
// `result` is a real AssessmentResults row (personaId/level/score/gaps/
// recommendedRoles already line up field-for-field with what this expects).
function generateLearningPath(profileInput, result) {
  const personaId = result.personaId || 'tech';
  const gaps = (result.gaps || [])
    .map(normalize)
    .filter((gap) => gap && !gap.includes('no priority'));
  const weeklyHours = Math.min(40, Math.max(2, Number(profileInput.hoursPerWeek) || 6));
  const currentLevelIndex = Math.max(0, LEVEL_ORDER.indexOf(result.level));
  const targetLevel = LEVEL_ORDER[Math.min(currentLevelIndex + 1, LEVEL_ORDER.length - 1)];
  const baseModules = getTrackModules(personaId).map((module, index) => ({
    ...module,
    order: index,
    priority: matchesGap(module, gaps),
    difficulty: module.stage === 'foundation' ? result.level : targetLevel,
    activity: preferredActivity(profileInput.learningFormats, module.activity),
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
    personaId,
    targetRole: profileInput.targetRole || result.recommendedRoles?.[0] || 'AI Professional',
    currentLevel: result.level,
    targetLevel,
    assessmentScore: result.score,
    hoursPerWeek: weeklyHours,
    learningFormats: profileInput.learningFormats || [],
    learningPace: profileInput.learningPace || 'Flexible self-paced',
    estimatedWeeks: Math.max(1, Math.ceil(cumulativeHours / weeklyHours)),
    totalHours: cumulativeHours,
    priorityGaps: gaps.length ? result.gaps : ['Maintain balanced growth across all assessed domains'],
    stages,
    completedModuleIds: [],
    currentModuleId: orderedModules[0]?.id || null,
  };
}

function getAllModules(stages) {
  return (stages || []).flatMap((stage) => stage.modules);
}

function getModuleById(stages, moduleId) {
  return getAllModules(stages).find((module) => module.id === moduleId) || null;
}

function getModuleStatus(stages, completedModuleIds, currentModuleId, module) {
  if (completedModuleIds.includes(module.id)) return 'completed';
  if (currentModuleId === module.id) return 'current';
  const unlocked = module.prerequisites.every((id) => completedModuleIds.includes(id));
  return unlocked ? 'available' : 'locked';
}

// Returns the new { completedModuleIds, currentModuleId }, or null if the
// module doesn't exist or is locked (caller decides how to surface that).
function startModule(stages, completedModuleIds, currentModuleId, moduleId) {
  const module = getModuleById(stages, moduleId);
  if (!module || getModuleStatus(stages, completedModuleIds, currentModuleId, module) === 'locked') return null;
  return { completedModuleIds, currentModuleId: moduleId };
}

function completeModule(stages, completedModuleIds, currentModuleId, moduleId) {
  const module = getModuleById(stages, moduleId);
  if (!module || getModuleStatus(stages, completedModuleIds, currentModuleId, module) === 'locked') return null;
  const nextCompletedIds = Array.from(new Set([...completedModuleIds, moduleId]));
  const modules = getAllModules(stages);
  const nextModule = modules.find((candidate) =>
    !nextCompletedIds.includes(candidate.id) &&
    candidate.prerequisites.every((id) => nextCompletedIds.includes(id)),
  );
  return { completedModuleIds: nextCompletedIds, currentModuleId: nextModule?.id || null };
}

function resetProgress(stages) {
  const firstModule = getAllModules(stages)[0];
  return { completedModuleIds: [], currentModuleId: firstModule?.id || null };
}

module.exports = {
  generateLearningPath,
  getAllModules,
  getModuleById,
  getModuleStatus,
  startModule,
  completeModule,
  resetProgress,
};
