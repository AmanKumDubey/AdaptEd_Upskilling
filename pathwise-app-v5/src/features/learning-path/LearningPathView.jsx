import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssessmentResult, useLearningPath } from "../../state/PathwiseDataContext";
import { authEnabled, loadLatestResult } from "../assessment/assessmentBackend";
import {
  generatePath,
  getLearningPathProgress,
  getModuleStatus,
  isLearningPathStale,
  loadPath,
  resetProgress,
  startModule,
} from "./learningPathBackend";
import "./learningPath.css";

const STATUS_LABELS = {
  completed: "Completed",
  current: "In progress",
  available: "Ready",
  locked: "Locked",
};

export function LearningPathView({ profile }) {
  const navigate = useNavigate();
  const [assessmentResult, setAssessmentResult] = useAssessmentResult();
  const [path, setPath] = useLearningPath();
  const [activeStageId, setActiveStageId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [generateError, setGenerateError] = useState("");
  // In live mode, a path may already exist server-side even though this
  // component's local `path` state hasn't fetched it yet (e.g. a fresh page
  // load) - this gate stops the "generate a new one" effect below from
  // firing before that fetch has had a chance to resolve.
  const [checkedServer, setCheckedServer] = useState(false);

  useEffect(() => {
    if (!authEnabled) {
      setCheckedServer(true);
      return;
    }
    let cancelled = false;
    // Both reconciled together: localStorage isn't scoped per-account, so a
    // path *or* an assessment result cached under a previous login must be
    // cleared, not just left in place, when the server disagrees - otherwise
    // this account could look like it has an assessment (or a path) it
    // never actually completed, from someone else's earlier session on the
    // same browser (confirmed live: this is exactly what happened testing
    // B9 - a leftover test-account path kept showing up under later logins).
    Promise.all([loadPath(), loadLatestResult()]).then(([fetchedPath, fetchedResult]) => {
      if (cancelled) return;
      setPath(fetchedPath || null);
      if (fetchedResult?.id !== assessmentResult?.id) setAssessmentResult(fetchedResult || null);
      setCheckedServer(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkedServer || path || !profile?.onboardingCompleted || !assessmentResult) return;
    setGenerateError("");
    generatePath(profile, assessmentResult).then(setPath).catch((error) => {
      setGenerateError(error.message || "Couldn't build your roadmap. Please try again.");
    });
  }, [checkedServer, assessmentResult, path, profile, setPath]);

  const progress = useMemo(
    () => (path ? getLearningPathProgress(path) : { completed: 0, total: 0, percentage: 0 }),
    [path],
  );
  const activeStage = path?.stages.find((stage) => stage.id === activeStageId) || path?.stages[0];
  const stale = Boolean(path && profile && assessmentResult && isLearningPathStale(path, profile, assessmentResult));

  if (!checkedServer) {
    return (
      <div className="learning-loading" role="status">
        <span />
        <strong>Loading your learning path…</strong>
      </div>
    );
  }

  if (!profile?.onboardingCompleted) {
    return (
      <LearningPathEmptyState
        eyebrow="Profile required"
        title="Complete your learner profile first"
        description="Your role, weekly availability, current skills, and preferred learning format are needed to create a useful roadmap."
        actionLabel="Complete profile"
        actionTo="/onboarding"
      />
    );
  }

  if (!assessmentResult) {
    return (
      <LearningPathEmptyState
        eyebrow="Assessment required"
        title="Complete your skills assessment"
        description="The assessment identifies your current level, strengths, and growth areas so the roadmap starts at the right place."
        actionLabel="Start assessment"
        actionTo="/assessment"
      />
    );
  }

  if (!path) {
    if (generateError) {
      return (
        <LearningPathEmptyState
          eyebrow="Something went wrong"
          title={generateError}
          description="Please try again in a moment."
          actionLabel="Retake assessment"
          actionTo="/assessment"
        />
      );
    }
    return (
      <div className="learning-loading" role="status">
        <span />
        <strong>Building your personalized roadmap…</strong>
      </div>
    );
  }

  function openModule(module) {
    const status = getModuleStatus(path, module);
    if (status === "locked") return;
    if (status === "available") startModule(path, module.id).then(setPath);
    navigate(`/learning-path/module/${module.id}`);
  }

  async function confirmChange() {
    if (confirmAction === "regenerate") {
      const regenerated = await generatePath(profile, assessmentResult);
      setPath(regenerated);
      setActiveStageId(regenerated.stages[0]?.id || null);
    }
    if (confirmAction === "reset") {
      const next = await resetProgress(path);
      setPath(next);
      setActiveStageId(next.stages[0]?.id || null);
    }
    setConfirmAction(null);
  }

  return (
    <div className="learning-path-page">
      <section className="learning-hero fade-up">
        <div className="learning-hero-copy">
          <div className="learning-eyebrow">Personalized learning path</div>
          <h1>{path.targetRole} roadmap</h1>
          <p>
            Built from your <strong>{path.assessmentScore}% assessment</strong>, current profile,
            and <strong>{path.hoursPerWeek} hours/week</strong> availability.
          </p>
          <div className="learning-level-flow">
            <span><small>Current</small>{path.currentLevel}</span>
            <b>→</b>
            <span><small>Next target</small>{path.targetLevel}</span>
          </div>
        </div>
        <div className="learning-progress-orbit" style={{ "--learning-progress": `${progress.percentage * 3.6}deg` }}>
          <div><strong>{progress.percentage}%</strong><span>{progress.completed}/{progress.total} modules</span></div>
        </div>
      </section>

      {stale && (
        <section className="learning-update-banner fade-up" role="status">
          <div><strong>Your profile or assessment has changed</strong><span>Regenerate to apply the latest information. Current progress will be replaced.</span></div>
          <button type="button" onClick={() => setConfirmAction("regenerate")}>Review & regenerate</button>
        </section>
      )}

      <section className="learning-summary-grid fade-up">
        <article><span>◷</span><div><small>Estimated duration</small><strong>{path.estimatedWeeks} weeks</strong></div></article>
        <article><span>◇</span><div><small>Total learning time</small><strong>{path.totalHours} hours</strong></div></article>
        <article><span>▤</span><div><small>Learning format</small><strong>{path.learningPreference}</strong></div></article>
        <article><span>↗</span><div><small>Pace</small><strong>{path.learningPace}</strong></div></article>
      </section>

      <section className="learning-priority-card fade-up">
        <div>
          <div className="learning-eyebrow">Assessment-informed priorities</div>
          <h2>What this roadmap focuses on</h2>
        </div>
        <div className="learning-priority-tags">
          {path.priorityGaps.map((gap) => <span key={gap}>{gap}</span>)}
        </div>
      </section>

      <section className="learning-roadmap-section fade-up">
        <div className="learning-section-heading">
          <div><div className="learning-eyebrow">Your sequence</div><h2>Five-stage roadmap</h2></div>
          <div className="learning-management-actions">
            <Link to="/admin/learning-path-framework">View framework</Link>
            <button type="button" onClick={() => setConfirmAction("reset")}>Reset progress</button>
            <button type="button" onClick={() => setConfirmAction("regenerate")}>Regenerate</button>
          </div>
        </div>

        <div className="learning-stage-tabs" role="tablist" aria-label="Learning path stages">
          {path.stages.map((stage, index) => {
            const stageCompleted = stage.modules.every((module) => path.completedModuleIds.includes(module.id));
            const containsCurrent = stage.modules.some((module) => module.id === path.currentModuleId);
            return (
              <button
                type="button"
                role="tab"
                aria-selected={activeStage.id === stage.id}
                key={stage.id}
                className={`${activeStage.id === stage.id ? "is-active" : ""} ${stageCompleted ? "is-complete" : ""}`}
                onClick={() => setActiveStageId(stage.id)}
              >
                <span>{stageCompleted ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <div><strong>{stage.name}</strong><small>{containsCurrent ? "Current stage" : stage.weeks}</small></div>
              </button>
            );
          })}
        </div>

        <div className="learning-stage-content" role="tabpanel">
          <div className="learning-stage-intro">
            <div><span>{String(path.stages.indexOf(activeStage) + 1).padStart(2, "0")}</span><div><h3>{activeStage.name}</h3><p>{activeStage.description}</p></div></div>
            <b>{activeStage.weeks}</b>
          </div>
          <div className="learning-module-list">
            {activeStage.modules.map((module) => {
              const status = getModuleStatus(path, module);
              return (
                <article className={`learning-module-card is-${status}`} key={module.id}>
                  <div className="learning-module-status-icon">{status === "completed" ? "✓" : status === "locked" ? "⌁" : "→"}</div>
                  <div className="learning-module-main">
                    <div className="learning-module-meta"><span>{module.type}</span><span>{module.difficulty}</span>{module.priority && <span className="is-priority">Priority gap</span>}</div>
                    <h3>{module.title}</h3>
                    <p>{module.description}</p>
                    <div className="learning-module-skills">{module.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                  </div>
                  <div className="learning-module-action">
                    <small>{module.hours} hours</small>
                    <strong>{STATUS_LABELS[status]}</strong>
                    <button type="button" disabled={status === "locked"} onClick={() => openModule(module)}>
                      {status === "completed" ? "Review" : status === "current" ? "Continue" : status === "locked" ? "Locked" : "Start"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {confirmAction && (
        <div className="learning-confirm-backdrop">
          <section className="learning-confirm" role="dialog" aria-modal="true" aria-labelledby="learning-confirm-title">
            <span>!</span>
            <h2 id="learning-confirm-title">{confirmAction === "reset" ? "Reset learning progress?" : "Generate a new roadmap?"}</h2>
            <p>{confirmAction === "reset" ? "All modules will return to their initial state. Your profile and assessment result will stay saved." : "The roadmap will be rebuilt from your latest profile and assessment. Existing module progress will be replaced."}</p>
            <div><button type="button" onClick={() => setConfirmAction(null)}>Cancel</button><button type="button" className="is-danger" onClick={confirmChange}>{confirmAction === "reset" ? "Reset progress" : "Regenerate path"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function LearningPathEmptyState({ eyebrow, title, description, actionLabel, actionTo }) {
  return (
    <section className="learning-empty fade-up">
      <span className="learning-empty-icon">⌁</span>
      <div className="learning-eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link to={actionTo}>{actionLabel} →</Link>
    </section>
  );
}
