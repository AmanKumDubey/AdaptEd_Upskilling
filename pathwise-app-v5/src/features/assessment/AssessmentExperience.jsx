import { useEffect, useState } from "react";
import { PERSONAS } from "../../SkillsAssessment";
import { useAssessmentResult } from "../../state/PathwiseDataContext";
import {
  QUESTIONS_PER_ATTEMPT,
  authEnabled,
  clearSession,
  completeAssessment,
  getQuestionsForSession,
  loadResumableSession,
  persistSession,
  recordAnswer,
  startSession,
} from "./assessmentBackend";
import "./assessment.css";

function formatSavedTime(value) {
  if (!value) return "recently";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AssessmentExperience({
  onExit,
  onComplete,
  preferredPersonaId = "tech",
  forceFresh = false,
}) {
  const [, setAssessmentResult] = useAssessmentResult();
  const [storedSession, setStoredSession] = useState(null);
  const [personaId, setPersonaId] = useState(preferredPersonaId);
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState("intro");
  const [message, setMessage] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // In live mode this is a network call (GET .../sessions/active), so it can
  // no longer be a synchronous useMemo the way the localStorage version was.
  useEffect(() => {
    if (forceFresh) return;
    let cancelled = false;
    loadResumableSession().then((found) => {
      if (cancelled || !found) return;
      setStoredSession(found);
      setPersonaId(found.personaId);
    });
    return () => { cancelled = true; };
  }, [forceFresh]);

  const persona = PERSONAS[personaId];
  // Each session randomly samples its own 20 of the persona's 100 questions
  // at creation time (startSession) - questions is only real once a session
  // exists; the intro screen (no session yet) shows the fixed
  // QUESTIONS_PER_ATTEMPT count instead, as a preview.
  const questions = getQuestionsForSession(session);
  const currentIndex = session?.currentQuestion || 0;
  const currentQuestion = questions[currentIndex];
  const answers = session?.answers || {};
  const answeredCount = Object.keys(answers).length;
  const completion = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  async function startNewAssessment() {
    clearSession();
    const nextSession = await startSession(personaId);
    setSession(nextSession);
    setMessage("");
    setScreen("quiz");
  }

  function resumeAssessment() {
    if (!storedSession) return;
    setPersonaId(storedSession.personaId);
    setSession(storedSession);
    setScreen("quiz");
  }

  async function selectAnswer(optionIndex) {
    const nextSession = await recordAnswer(session, currentQuestion.id, optionIndex);
    setSession(nextSession);
    setMessage("");
  }

  function moveTo(questionIndex) {
    setSession(persistSession({ ...session, currentQuestion: questionIndex }));
    setMessage("");
    setScreen("quiz");
  }

  function goNext() {
    if (answers[currentQuestion.id] === undefined) {
      setMessage("Select one answer before continuing.");
      return;
    }

    if (currentIndex === questions.length - 1) {
      setScreen("review");
      return;
    }
    moveTo(currentIndex + 1);
  }

  function openSubmitConfirmation() {
    const firstMissingIndex = questions.findIndex(
      (question) => answers[question.id] === undefined,
    );
    if (firstMissingIndex >= 0) {
      setSession(persistSession({ ...session, currentQuestion: firstMissingIndex }));
      setScreen("quiz");
      setMessage(`Question ${firstMissingIndex + 1} still needs an answer.`);
      return;
    }
    setShowSubmitConfirm(true);
  }

  async function submitAssessment() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await completeAssessment(session);
      setAssessmentResult(result);
      clearSession();
      setShowSubmitConfirm(false);
      onComplete(result);
    } catch {
      setMessage("Couldn't submit your assessment. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="assessment-shell">
      <header className="assessment-header">
        <button type="button" className="assessment-brand" onClick={onExit}>
          <span className="assessment-brand-mark">P</span>
          <span>Pathwise</span>
        </button>
        <div className="assessment-header-copy">
          <span>Skills Assessment</span>
          <small>{authEnabled ? "Progress is saved to your account" : "Frontend demo · saved in this browser"}</small>
        </div>
        <button type="button" className="assessment-exit" onClick={onExit}>
          Save & exit
        </button>
      </header>

      {screen === "intro" && (
        <section className="assessment-intro assessment-page">
          <div className="assessment-eyebrow">Phase 4 · Skills Assessment</div>
          <h1>Find your current AI skill level</h1>
          <p className="assessment-lead">
            Choose the track closest to your goal. {authEnabled
              ? "The correct answers are only revealed once you submit."
              : "Your answers are scored locally and no information is sent to a server."}
          </p>

          {storedSession && !forceFresh && (
            <div className="assessment-resume-card" role="status">
              <div>
                <strong>Assessment in progress</strong>
                <span>
                  {PERSONAS[storedSession.personaId]?.title} · {Object.keys(storedSession.answers || {}).length}/{storedSession.questionIds?.length ?? QUESTIONS_PER_ATTEMPT} answered · saved {formatSavedTime(storedSession.updatedAt)}
                </span>
              </div>
              <button type="button" onClick={resumeAssessment}>Resume</button>
            </div>
          )}

          <div className="assessment-persona-grid" aria-label="Assessment tracks">
            {Object.values(PERSONAS).map((item) => (
              <button
                type="button"
                key={item.id}
                className={`assessment-persona ${personaId === item.id ? "is-selected" : ""}`}
                onClick={() => setPersonaId(item.id)}
                aria-pressed={personaId === item.id}
              >
                <span className="assessment-persona-icon" style={{ background: `${item.color}18`, color: item.color }}>
                  {item.icon}
                </span>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
                <small>{item.domains.slice(0, 3).join(" · ")}</small>
              </button>
            ))}
          </div>

          <div className="assessment-start-card">
            <div>
              <span>Selected track</span>
              <strong>{persona.title}</strong>
            </div>
            <div className="assessment-facts">
              <span><b>{QUESTIONS_PER_ATTEMPT}</b> questions</span>
              <span><b>20–25</b> minutes</span>
              <span><b>1</b> answer each</span>
            </div>
            <button type="button" className="assessment-primary" onClick={startNewAssessment}>
              Start new assessment →
            </button>
          </div>

          <div className="assessment-instructions">
            <strong>Before you start</strong>
            <ul>
              <li>Choose the best answer; there is no negative marking.</li>
              <li>You can go back and change an answer before submitting.</li>
              <li>Refreshing or closing the tab keeps an unfinished attempt.</li>
            </ul>
          </div>
        </section>
      )}

      {screen === "quiz" && session && currentQuestion && (
        <section className="assessment-page assessment-quiz-layout">
          <aside className="assessment-quiz-aside">
            <span className="assessment-track-icon" style={{ background: `${persona.color}18` }}>{persona.icon}</span>
            <div>
              <small>Your track</small>
              <strong>{persona.title}</strong>
            </div>
            <div className="assessment-progress-copy">
              <span>{answeredCount} of {questions.length} answered</span>
              <b>{completion}%</b>
            </div>
            <div className="assessment-progress-track">
              <span style={{ width: `${completion}%`, background: persona.color }} />
            </div>
            <div className="assessment-number-grid" aria-label="Question navigator">
              {questions.map((question, index) => (
                <button
                  type="button"
                  key={question.id}
                  className={`${index === currentIndex ? "is-current" : ""} ${answers[question.id] !== undefined ? "is-answered" : ""}`}
                  onClick={() => moveTo(index)}
                  aria-label={`Question ${index + 1}${answers[question.id] !== undefined ? ", answered" : ""}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </aside>

          <article className="assessment-question-card">
            <div className="assessment-question-meta">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{currentQuestion.domain}</span>
              <span>{currentQuestion.bloom}</span>
            </div>
            <h1>{currentQuestion.q}</h1>
            <div className="assessment-options" role="radiogroup" aria-label="Answer choices">
              {currentQuestion.opts.map((option, optionIndex) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={answers[currentQuestion.id] === optionIndex}
                  className={answers[currentQuestion.id] === optionIndex ? "is-selected" : ""}
                  key={option}
                  onClick={() => selectAnswer(optionIndex)}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <p>{option.replace(/^[A-D]:\s*/, "")}</p>
                </button>
              ))}
            </div>
            {message && <p className="assessment-error" role="alert">{message}</p>}
            <div className="assessment-question-actions">
              <button
                type="button"
                className="assessment-secondary"
                disabled={currentIndex === 0}
                onClick={() => moveTo(currentIndex - 1)}
              >
                ← Previous
              </button>
              <button type="button" className="assessment-primary" onClick={goNext}>
                {currentIndex === questions.length - 1 ? "Review answers" : "Next question →"}
              </button>
            </div>
          </article>
        </section>
      )}

      {screen === "review" && session && (
        <section className="assessment-page assessment-review">
          <div className="assessment-eyebrow">Final check</div>
          <h1>Review your answers</h1>
          <p className="assessment-lead">
            You answered {answeredCount} of {questions.length} questions. Select any
            question to make a change.
          </p>
          <div className="assessment-review-list">
            {questions.map((question, index) => {
              const selected = answers[question.id];
              return (
                <button type="button" key={question.id} onClick={() => moveTo(index)}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{question.q}</strong>
                    <small>{selected === undefined ? "Not answered" : question.opts[selected]}</small>
                  </div>
                  <b className={selected === undefined ? "is-missing" : ""}>
                    {selected === undefined ? "Required" : "Edit"}
                  </b>
                </button>
              );
            })}
          </div>
          {message && <p className="assessment-error" role="alert">{message}</p>}
          <div className="assessment-review-actions">
            <button type="button" className="assessment-secondary" onClick={() => moveTo(questions.length - 1)}>
              ← Back to questions
            </button>
            <button type="button" className="assessment-primary" onClick={openSubmitConfirmation}>
              Submit assessment
            </button>
          </div>
        </section>
      )}

      {showSubmitConfirm && (
        <div className="assessment-modal-backdrop" role="presentation">
          <section className="assessment-modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
            <span className="assessment-modal-icon">✓</span>
            <h2 id="submit-title">Ready to see your result?</h2>
            <p>After submitting, this attempt is locked and your result report is generated.</p>
            <div>
              <button type="button" className="assessment-secondary" disabled={submitting} onClick={() => setShowSubmitConfirm(false)}>
                Keep reviewing
              </button>
              <button type="button" className="assessment-primary" disabled={submitting} onClick={submitAssessment}>
                {submitting ? "Submitting…" : "Confirm & submit"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
