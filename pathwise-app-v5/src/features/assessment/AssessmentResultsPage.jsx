import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAssessmentResult } from "../../state/PathwiseDataContext";
import { authEnabled, loadLatestResult, loadResultById } from "./assessmentBackend";
import "./assessment.css";

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AssessmentResultsPage() {
  const { resultId } = useParams();
  const [latestResult, setLatestResult] = useAssessmentResult();
  // Viewing a specific past attempt (from AssessmentsView.jsx's history
  // list) is kept separate from the "latest" cache - overwriting that with
  // an old attempt would wrongly make it look, to the Skills Wallet and
  // Learning Path, like the most recent thing this account did.
  const [viewedResult, setViewedResult] = useState(null);
  const [loadingViewed, setLoadingViewed] = useState(Boolean(resultId));

  useEffect(() => {
    if (!authEnabled) return;
    let cancelled = false;

    if (resultId) {
      setLoadingViewed(true);
      loadResultById(resultId).then((found) => {
        if (!cancelled) { setViewedResult(found); setLoadingViewed(false); }
      });
      return () => { cancelled = true; };
    }

    // localStorage isn't scoped per-account - reconcile against the real
    // backend on mount so a previous login's cached result (or a stale one
    // of this account's own, from before a retake) can't linger on screen
    // for whoever is now logged in.
    loadLatestResult().then((latest) => {
      if (!cancelled && latest?.id !== latestResult?.id) setLatestResult(latest);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  const result = resultId ? viewedResult : latestResult;

  if (resultId && loadingViewed) {
    return (
      <main className="assessment-shell assessment-empty-result">
        <section>
          <span className="assessment-result-icon">◎</span>
          <div className="assessment-eyebrow">Assessment results</div>
          <h1>Loading…</h1>
        </section>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="assessment-shell assessment-empty-result">
        <section>
          <span className="assessment-result-icon">◎</span>
          <div className="assessment-eyebrow">Assessment results</div>
          <h1>{resultId ? "Result not found" : "No result yet"}</h1>
          <p>{resultId ? "That attempt couldn't be found." : "Complete a frontend assessment to generate your skill report."}</p>
          <div>
            <Link className="assessment-link-primary" to="/assessment">Start assessment</Link>
            <Link className="assessment-link-secondary" to="/dashboard">Back to dashboard</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="assessment-shell assessment-results-shell">
      <header className="assessment-header">
        <Link className="assessment-brand" to="/dashboard">
          <span className="assessment-brand-mark">P</span>
          <span>Pathwise</span>
        </Link>
        <div className="assessment-header-copy">
          <span>Assessment report</span>
          <small>{authEnabled ? "Saved to your account" : "Generated locally in your browser"}</small>
        </div>
        <Link className="assessment-result-dashboard-link" to="/dashboard">Dashboard</Link>
      </header>

      <div className="assessment-page assessment-results-page">
        <section className="assessment-result-hero">
          <div>
            <div className="assessment-eyebrow">Assessment complete</div>
            <h1>{result.level} level</h1>
            <p>{result.personaTitle}</p>
            <small>Completed {formatDate(result.completedAt)}</small>
          </div>
          <div className="assessment-score-ring" style={{ "--score": `${result.score * 3.6}deg` }}>
            <div>
              <strong>{result.score}%</strong>
              <span>{result.correctCount}/{result.total} correct</span>
            </div>
          </div>
        </section>

        <section className="assessment-results-grid">
          <article className="assessment-result-card assessment-domain-card">
            <div className="assessment-card-heading">
              <span>01</span>
              <div><h2>Domain performance</h2><p>Your score across each competency area.</p></div>
            </div>
            <div className="assessment-domain-list">
              {result.domainScores.map((domain) => (
                <div key={domain.domain}>
                  <div><strong>{domain.domain}</strong><span>{domain.correct}/{domain.total} · {domain.score}%</span></div>
                  <div className="assessment-domain-track"><span style={{ width: `${domain.score}%` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className="assessment-result-card">
            <div className="assessment-card-heading">
              <span>02</span>
              <div><h2>Skill signals</h2><p>Where to build from here.</p></div>
            </div>
            <div className="assessment-signal-block is-strength">
              <small>Strengths</small>
              <div>{result.strengths.map((item) => <span key={item}>{item}</span>)}</div>
            </div>
            <div className="assessment-signal-block is-gap">
              <small>Growth areas</small>
              <div>{result.gaps.map((item) => <span key={item}>{item}</span>)}</div>
            </div>
          </article>

          <article className="assessment-result-card assessment-roles-card">
            <div className="assessment-card-heading">
              <span>03</span>
              <div><h2>Role direction</h2><p>Example paths aligned with this track.</p></div>
            </div>
            <ol>
              {result.recommendedRoles.map((role, index) => (
                <li key={role}><span>0{index + 1}</span><strong>{role}</strong></li>
              ))}
            </ol>
          </article>
        </section>

        <section className="assessment-next-step">
          <div>
            <div className="assessment-eyebrow">Recommended next step</div>
            <h2>Turn the result into a learning plan</h2>
            <p>Phase 5 will use these strengths and gaps to build your personalized learning path.</p>
          </div>
          <Link className="assessment-link-primary" to="/learning-path">View learning path →</Link>
        </section>

        <section className="assessment-answer-review">
          <div className="assessment-card-heading">
            <span>04</span>
            <div><h2>Answer review</h2><p>Compare your answer with the correct choice.</p></div>
          </div>
          <div>
            {result.answers.map((answer, index) => (
              <details key={answer.questionId}>
                <summary>
                  <span className={answer.isCorrect ? "is-correct" : "is-incorrect"}>{answer.isCorrect ? "✓" : "×"}</span>
                  <strong>{index + 1}. {answer.question}</strong>
                  <small>{answer.domain}</small>
                </summary>
                <div>
                  <p><b>Your answer:</b> {answer.selectedAnswer}</p>
                  {!answer.isCorrect && <p><b>Correct answer:</b> {answer.correctAnswer}</p>}
                  {answer.explanation && <p><b>Why:</b> {answer.explanation}</p>}
                </div>
              </details>
            ))}
          </div>
        </section>

        <div className="assessment-result-actions">
          <Link className="assessment-link-secondary" to="/dashboard">Back to dashboard</Link>
          <Link className="assessment-link-primary" to={`/assessment?persona=${result.personaId}&retake=1`}>Retake assessment</Link>
        </div>
      </div>
    </main>
  );
}
