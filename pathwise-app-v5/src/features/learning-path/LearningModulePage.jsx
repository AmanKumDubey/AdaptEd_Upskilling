import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCourseProgress, useLearningPath } from "../../state/PathwiseDataContext";
import {
  authEnabled,
  completeModule as completeModuleRequest,
  getAllModules,
  getModuleById,
  getModuleStatus,
  startModule as startModuleRequest,
} from "./learningPathBackend";
import { getCoursesForModule } from "../courses/courseData";
import { getCourseStatus } from "../courses/courseStorage";
import "./learningPath.css";

export function LearningModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [path, setPath] = useLearningPath();
  const [courseProgress] = useCourseProgress();
  const [justCompleted, setJustCompleted] = useState(false);
  const module = getModuleById(path, moduleId);

  if (!path || !module) {
    return (
      <section className="learning-empty fade-up">
        <span className="learning-empty-icon">?</span>
        <div className="learning-eyebrow">Module unavailable</div>
        <h1>Open your learning path first</h1>
        <p>Generate a roadmap or select a valid module from your saved learning path.</p>
        <Link to="/learning-path">Open learning path →</Link>
      </section>
    );
  }

  const status = getModuleStatus(path, module);
  const allModules = getAllModules(path);
  const moduleIndex = allModules.findIndex((item) => item.id === module.id);
  const previousModule = allModules[moduleIndex - 1];
  const nextModule = allModules[moduleIndex + 1];
  const prerequisiteModules = module.prerequisites.map((id) => getModuleById(path, id)).filter(Boolean);
  const recommendedCourses = getCoursesForModule(module.id, module.skills).slice(0, 3);
  const completedResources = recommendedCourses.filter((course) => getCourseStatus(courseProgress, course.id) === "completed").length;

  function startModule() {
    startModuleRequest(path, module.id).then(setPath);
  }

  function completeModule() {
    completeModuleRequest(path, module.id).then((next) => {
      setPath(next);
      setJustCompleted(true);
    });
  }

  return (
    <div className="learning-module-page fade-up">
      <nav className="learning-breadcrumb" aria-label="Breadcrumb">
        <Link to="/learning-path">Learning path</Link><span>›</span><span>{module.title}</span>
      </nav>

      <section className={`learning-module-hero is-${status}`}>
        <div>
          <div className="learning-module-meta"><span>{module.type}</span><span>{module.difficulty}</span>{module.priority && <span className="is-priority">Priority gap</span>}</div>
          <h1>{module.title}</h1>
          <p>{module.description}</p>
          <div className="learning-module-hero-facts"><span><small>Time</small>{module.hours} hours</span><span><small>Stage</small>{path.stages.find((stage) => stage.id === module.stage)?.name}</span><span><small>Status</small>{status === "current" ? "In progress" : status}</span></div>
        </div>
        <div className="learning-module-number">{String(moduleIndex + 1).padStart(2, "0")}</div>
      </section>

      {status === "locked" && (
        <section className="learning-locked-notice" role="status">
          <span>⌁</span><div><strong>This module is locked</strong><p>Complete {prerequisiteModules.map((item) => item.title).join(", ")} first.</p></div>
        </section>
      )}

      {justCompleted && (
        <section className="learning-complete-notice" role="status">
          <span>✓</span><div><strong>Module completed</strong><p>{authEnabled ? "Your progress is saved to your account." : "Your progress is saved in this browser."} The next module is now unlocked.</p></div>
          {nextModule && <button type="button" onClick={() => navigate(`/learning-path/module/${nextModule.id}`)}>Open next module →</button>}
        </section>
      )}

      <div className="learning-module-detail-grid">
        <section className="learning-detail-card">
          <div className="learning-card-number">01</div><h2>Learning objectives</h2>
          <ul>{module.objectives.map((objective) => <li key={objective}><span>✓</span>{objective}</li>)}</ul>
        </section>
        <section className="learning-detail-card">
          <div className="learning-card-number">02</div><h2>Topics covered</h2>
          <div className="learning-topic-grid">{module.topics.map((topic, index) => <span key={topic}><b>{String(index + 1).padStart(2, "0")}</b>{topic}</span>)}</div>
        </section>
        <section className="learning-detail-card learning-activity-card">
          <div className="learning-card-number">03</div><h2>Recommended activity</h2>
          <p>{module.activity}</p>
          <div><small>Adapted to your preference</small><strong>{path.learningPreference}</strong></div>
        </section>
        <aside className="learning-module-side-card">
          <h3>Skills you will build</h3>
          <div>{module.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          <hr />
          <h3>Prerequisites</h3>
          {prerequisiteModules.length ? prerequisiteModules.map((item) => <p key={item.id}>✓ {item.title}</p>) : <p>No prerequisites</p>}
          <hr />
          {status === "available" && <button type="button" onClick={startModule}>Start this module</button>}
          {status === "current" && <button type="button" onClick={completeModule}>Mark module complete</button>}
          {status === "completed" && <button type="button" disabled>✓ Module completed</button>}
          {status === "locked" && <button type="button" disabled>Complete prerequisite first</button>}
          <small>{authEnabled ? "Progress is saved to your account." : "Progress is stored locally. No backend connection is used."}</small>
        </aside>
      </div>

      <section className="learning-resources-section">
        <div className="learning-section-heading">
          <div><div className="learning-eyebrow">Phase 6 resources</div><h2>Recommended learning resources</h2><p>{completedResources}/{recommendedCourses.length} recommended resources completed for this module.</p></div>
          <Link to={`/courses?module=${module.id}`}>Explore all resources →</Link>
        </div>
        <div className="learning-resource-grid">
          {recommendedCourses.map((course) => {
            const courseStatus = getCourseStatus(courseProgress, course.id);
            return <Link key={course.id} to={`/courses/${course.id}`} className="learning-resource-card"><span style={{ color: course.accent }}>{course.mark}</span><div><small>{course.provider} · {course.format}</small><strong>{course.title}</strong><p>{course.duration} · {course.matchScore}% match · {courseStatus === "completed" ? "Completed" : courseStatus === "started" ? "In progress" : "Ready to start"}</p></div><b>→</b></Link>;
          })}
        </div>
      </section>

      <nav className="learning-module-pagination" aria-label="Module navigation">
        {previousModule ? <Link to={`/learning-path/module/${previousModule.id}`}>← {previousModule.title}</Link> : <span />}
        {nextModule ? <Link className={getModuleStatus(path, nextModule) === "locked" ? "is-locked" : ""} to={getModuleStatus(path, nextModule) === "locked" ? "#" : `/learning-path/module/${nextModule.id}`}>{nextModule.title} →</Link> : <Link to="/learning-path">Back to roadmap →</Link>}
      </nav>
    </div>
  );
}
