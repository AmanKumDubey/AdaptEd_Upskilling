import { useEffect, useMemo, useState } from "react";
import { FrostBackground } from "../../components/layout/FrostBackground";
import { ROLES, SKILL_CATEGORIES } from "../../data/mockData";
import { useProfile } from "../../state/PathwiseDataContext";
import { auth } from "../../api/endpoints";
import { saveProfile } from "./onboardingBackend";
import {
  EMPTY_ONBOARDING_PROFILE,
  clearOnboardingDraft,
  loadOnboardingDraft,
  loadOnboardingProfile,
  saveOnboardingDraft,
} from "./onboardingStorage";
import "./onboarding.css";

const STEPS = [
  { title: "About you", short: "Profile" },
  { title: "Education & experience", short: "Background" },
  { title: "Your current skills", short: "Skills" },
  { title: "Career interests", short: "Interests" },
  { title: "Goals & availability", short: "Goals" },
  { title: "Learning preferences", short: "Learning" },
  { title: "Review your profile", short: "Review" },
];

const EDUCATION_LEVELS = ["High school", "Diploma", "Bachelor's degree", "Master's degree", "Doctorate", "Self-taught / Other"];
const EMPLOYMENT_OPTIONS = ["Student", "Looking for work", "Employed", "Freelancer", "Career break"];
const EXPERIENCE_OPTIONS = ["No professional experience", "0-2 years", "3-5 years", "6-10 years", "10+ years"];
const INTEREST_OPTIONS = ["Artificial Intelligence", "Data", "Software Engineering", "Product", "Design", "Cloud & DevOps", "Cybersecurity", "Leadership"];
const TIMELINE_OPTIONS = ["Within 3 months", "3-6 months", "6-12 months", "Exploring for now"];
const LEARNING_FORMATS = ["Hands-on projects", "Short videos", "Reading", "Live classes", "Practice quizzes", "Mentorship"];
const PACE_OPTIONS = ["Structured weekly plan", "Flexible self-paced", "Intensive fast-track"];

function initialState() {
  const draft = loadOnboardingDraft();
  const profile = loadOnboardingProfile();

  return {
    data: draft?.data ?? profile ?? EMPTY_ONBOARDING_PROFILE,
    step: draft?.step ?? 0,
    resumed: Boolean(draft),
  };
}

function validateStep(step, data, confirmed) {
  const errors = {};

  if (step === 0) {
    if (!data.firstName.trim()) errors.firstName = "Please enter your first name.";
    if (!data.location.trim()) errors.location = "Please enter your city or location.";
    if (!data.language) errors.language = "Please choose a preferred language.";
  }

  if (step === 1) {
    if (!data.educationLevel) errors.educationLevel = "Please choose your education level.";
    if (!data.employmentStatus) errors.employmentStatus = "Please choose your current status.";
    if (data.employmentStatus === "Student" && !data.graduationYear) errors.graduationYear = "Please select your expected graduation year.";
    if (data.employmentStatus && data.employmentStatus !== "Student" && !data.experienceYears) errors.experienceYears = "Please choose your experience level.";
  }

  if (step === 2 && data.skills.length === 0) errors.skills = "Select at least one skill.";
  if (step === 3 && data.interests.length === 0) errors.interests = "Select at least one career interest.";

  if (step === 4) {
    if (!data.targetRole) errors.targetRole = "Please choose a target role.";
    const weeklyHours = Number(data.hoursPerWeek);
    if (!Number.isFinite(weeklyHours) || weeklyHours < 1 || weeklyHours > 80) errors.hoursPerWeek = "Enter a weekly value between 1 and 80 hours.";
    if (!data.timeline) errors.timeline = "Please choose a target timeline.";
  }

  if (step === 5) {
    if (data.learningFormats.length === 0) errors.learningFormats = "Select at least one learning format.";
    if (!data.learningPace) errors.learningPace = "Please choose a learning pace.";
  }

  if (step === 6 && !confirmed) errors.confirmed = "Please confirm that your answers are correct.";

  return errors;
}

function FieldError({ id, children }) {
  if (!children) return null;
  return <p className="onboarding-error" id={id} role="alert">{children}</p>;
}

function ChoiceButton({ active, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      className={`onboarding-choice ${active ? "is-selected" : ""} ${className}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ReviewRow({ label, value, onEdit }) {
  return (
    <div className="onboarding-review-row">
      <div>
        <span>{label}</span>
        <strong>{value || "Not provided"}</strong>
      </div>
      <button type="button" onClick={onEdit} aria-label={`Edit ${label}`}>Edit</button>
    </div>
  );
}

export function OnboardingFlow({ onComplete }) {
  const [, setProfile] = useProfile();
  const initial = useMemo(initialState, []);
  const [step, setStep] = useState(initial.step);
  const [data, setData] = useState(initial.data);
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [saveLabel, setSaveLabel] = useState(initial.resumed ? "Draft restored" : "Draft saves automatically");
  const [showResumeNotice, setShowResumeNotice] = useState(initial.resumed);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveOnboardingDraft(data, step);
      setSaveLabel("Draft saved");
    }, 250);

    return () => window.clearTimeout(timer);
  }, [data, step]);

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  const updateField = (field, value) => {
    setData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveLabel("Saving...");
  };

  const toggleListValue = (field, value) => {
    setData((current) => {
      const values = current[field];
      return {
        ...current,
        [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaveLabel("Saving...");
  };

  const goToStep = (nextStep) => {
    setErrors({});
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    const nextErrors = validateStep(step, data, confirmed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) goToStep(Math.min(step + 1, STEPS.length - 1));
  };

  const handleBack = () => goToStep(Math.max(step - 1, 0));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateStep(step, data, confirmed);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Phase B17: saveProfile() persists the full wizard answers server-side
    // in live mode (adapted-backend's OnboardingProfiles table) - previously
    // only firstName/lastName/interests had anywhere to go (see the
    // auth.updateProfile() call below), so everything else vanished on a
    // fresh browser/device. setProfile() below just caches the result
    // locally, same as completeAssessment()/generatePath() elsewhere.
    const saved = await saveProfile(data);
    setProfile(saved);
    clearOnboardingDraft();

    // Best-effort, separate from the save above: the Account section
    // (ProfilePage.jsx) reads name/interests off the Users table directly,
    // not off the onboarding profile, so this keeps that in sync too.
    auth.updateProfile({
      firstName: data.firstName,
      lastName: data.lastName,
      interests: data.interests,
    }).catch(() => {});

    onComplete(saved);
  };

  const handleStartAgain = () => {
    clearOnboardingDraft();
    setData({ ...EMPTY_ONBOARDING_PROFILE, skills: [], interests: [], learningFormats: [] });
    setStep(0);
    setErrors({});
    setConfirmed(false);
    setShowResumeNotice(false);
  };

  return (
    <main className="onboarding-shell">
      <FrostBackground />
      <div className="onboarding-layout">
        <aside className="onboarding-sidebar" aria-label="Onboarding progress">
          <div className="onboarding-brand">
            <div className="onboarding-brand-mark">P</div>
            <div><strong>Pathwise</strong><span>Career profile setup</span></div>
          </div>

          <div className="onboarding-progress-copy">
            <span>Step {step + 1} of {STEPS.length}</span>
            <strong>{progress}% complete</strong>
          </div>
          <div className="onboarding-progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

          <ol className="onboarding-step-list">
            {STEPS.map((item, index) => (
              <li key={item.short} className={`${index === step ? "is-current" : ""} ${index < step ? "is-complete" : ""}`}>
                <button type="button" onClick={() => index < step && goToStep(index)} disabled={index > step} aria-current={index === step ? "step" : undefined}>
                  <span className="onboarding-step-number">{index < step ? "✓" : index + 1}</span>
                  <span><strong>{item.short}</strong><small>{item.title}</small></span>
                </button>
              </li>
            ))}
          </ol>

          <p className="onboarding-save-status" aria-live="polite"><span>●</span> {saveLabel}</p>
        </aside>

        <section className="onboarding-card">
          {showResumeNotice && (
            <div className="onboarding-resume-notice" role="status">
              <div><strong>Welcome back</strong><span>Your saved answers have been restored.</span></div>
              <button type="button" onClick={handleStartAgain}>Start again</button>
              <button type="button" className="onboarding-notice-close" aria-label="Dismiss restored draft message" onClick={() => setShowResumeNotice(false)}>×</button>
            </div>
          )}

          <header className="onboarding-header">
            <span className="onboarding-eyebrow">{STEPS[step].short}</span>
            <h1>{STEPS[step].title}</h1>
            <p>{[
              "Tell us the basics so your experience feels personal.",
              "Your background helps us recommend the right starting level.",
              "Choose what you already know. Your assessment will measure proficiency later.",
              "Select the areas you would enjoy exploring or working in.",
              "Define where you want to go and how much time you can invest.",
              "Tell us how you learn best so recommendations match your style.",
              "Check your answers before we create your frontend demo profile.",
            ][step]}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            {step === 0 && (
              <div className="onboarding-form-grid">
                <label className="onboarding-field">
                  <span>First name <em>*</em></span>
                  <input autoFocus type="text" value={data.firstName} onChange={(event) => updateField("firstName", event.target.value)} aria-invalid={Boolean(errors.firstName)} aria-describedby={errors.firstName ? "first-name-error" : undefined} placeholder="Aman" autoComplete="given-name" />
                  <FieldError id="first-name-error">{errors.firstName}</FieldError>
                </label>
                <label className="onboarding-field">
                  <span>Last name</span>
                  <input type="text" value={data.lastName} onChange={(event) => updateField("lastName", event.target.value)} placeholder="Dubey" autoComplete="family-name" />
                </label>
                <label className="onboarding-field onboarding-field-wide">
                  <span>City or location <em>*</em></span>
                  <input type="text" value={data.location} onChange={(event) => updateField("location", event.target.value)} aria-invalid={Boolean(errors.location)} aria-describedby={errors.location ? "location-error" : undefined} placeholder="Delhi, India" autoComplete="address-level2" />
                  <FieldError id="location-error">{errors.location}</FieldError>
                </label>
                <label className="onboarding-field onboarding-field-wide">
                  <span>Preferred language <em>*</em></span>
                  <select value={data.language} onChange={(event) => updateField("language", event.target.value)}>
                    {['English', 'Hindi', 'English + Hindi'].map((language) => <option key={language}>{language}</option>)}
                  </select>
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="onboarding-form-grid">
                <label className="onboarding-field onboarding-field-wide">
                  <span>Highest education level <em>*</em></span>
                  <select value={data.educationLevel} onChange={(event) => updateField("educationLevel", event.target.value)} aria-invalid={Boolean(errors.educationLevel)}>
                    <option value="">Choose an option</option>
                    {EDUCATION_LEVELS.map((level) => <option key={level}>{level}</option>)}
                  </select>
                  <FieldError>{errors.educationLevel}</FieldError>
                </label>
                <label className="onboarding-field onboarding-field-wide">
                  <span>Field of study</span>
                  <input type="text" value={data.fieldOfStudy} onChange={(event) => updateField("fieldOfStudy", event.target.value)} placeholder="Computer Science, Commerce, Design..." />
                </label>
                <fieldset className="onboarding-field onboarding-field-wide">
                  <legend>Current status <em>*</em></legend>
                  <div className="onboarding-choice-grid onboarding-choice-grid-compact">
                    {EMPLOYMENT_OPTIONS.map((status) => <ChoiceButton key={status} active={data.employmentStatus === status} onClick={() => updateField("employmentStatus", status)}>{status}</ChoiceButton>)}
                  </div>
                  <FieldError>{errors.employmentStatus}</FieldError>
                </fieldset>
                {data.employmentStatus === "Student" ? (
                  <label className="onboarding-field onboarding-field-wide">
                    <span>Expected graduation year <em>*</em></span>
                    <select value={data.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)}>
                      <option value="">Choose a year</option>
                      {[2026, 2027, 2028, 2029, 2030, 2031].map((year) => <option key={year}>{year}</option>)}
                    </select>
                    <FieldError>{errors.graduationYear}</FieldError>
                  </label>
                ) : data.employmentStatus ? (
                  <label className="onboarding-field onboarding-field-wide">
                    <span>Professional experience <em>*</em></span>
                    <select value={data.experienceYears} onChange={(event) => updateField("experienceYears", event.target.value)}>
                      <option value="">Choose experience</option>
                      {EXPERIENCE_OPTIONS.map((experience) => <option key={experience}>{experience}</option>)}
                    </select>
                    <FieldError>{errors.experienceYears}</FieldError>
                  </label>
                ) : null}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="onboarding-category-list">
                  {Object.entries(SKILL_CATEGORIES).map(([category, skills]) => (
                    <fieldset key={category} className="onboarding-category">
                      <legend>{category}</legend>
                      <div className="onboarding-chip-list">
                        {skills.map((skill) => <ChoiceButton key={skill} className="onboarding-chip" active={data.skills.includes(skill)} onClick={() => toggleListValue("skills", skill)}>{skill}</ChoiceButton>)}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className="onboarding-selection-summary"><span>{data.skills.length} selected</span><button type="button" onClick={() => updateField("skills", [])} disabled={data.skills.length === 0}>Clear all</button></div>
                <FieldError>{errors.skills}</FieldError>
              </div>
            )}

            {step === 3 && (
              <fieldset className="onboarding-field">
                <legend>What areas interest you? <em>*</em></legend>
                <div className="onboarding-choice-grid onboarding-interest-grid">
                  {INTEREST_OPTIONS.map((interest) => <ChoiceButton key={interest} active={data.interests.includes(interest)} onClick={() => toggleListValue("interests", interest)}><span className="onboarding-choice-icon" aria-hidden="true">{interest.slice(0, 2).toUpperCase()}</span>{interest}</ChoiceButton>)}
                </div>
                <FieldError>{errors.interests}</FieldError>
              </fieldset>
            )}

            {step === 4 && (
              <div className="onboarding-form-grid">
                <label className="onboarding-field onboarding-field-wide">
                  <span>Target role <em>*</em></span>
                  <select value={data.targetRole} onChange={(event) => updateField("targetRole", event.target.value)}>
                    <option value="">Choose a target role</option>
                    {ROLES.map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <FieldError>{errors.targetRole}</FieldError>
                </label>
                <label className="onboarding-field onboarding-field-wide">
                  <span>Describe your career goal</span>
                  <textarea value={data.careerGoal} onChange={(event) => updateField("careerGoal", event.target.value)} rows="3" placeholder="Example: Move from frontend development to an ML engineering role." />
                </label>
                <label className="onboarding-field">
                  <span>Hours per week <em>*</em></span>
                  <input type="number" min="1" max="80" value={data.hoursPerWeek} onChange={(event) => updateField("hoursPerWeek", event.target.value)} placeholder="8" />
                  <FieldError>{errors.hoursPerWeek}</FieldError>
                </label>
                <label className="onboarding-field">
                  <span>Target timeline <em>*</em></span>
                  <select value={data.timeline} onChange={(event) => updateField("timeline", event.target.value)}>
                    <option value="">Choose timeline</option>
                    {TIMELINE_OPTIONS.map((timeline) => <option key={timeline}>{timeline}</option>)}
                  </select>
                  <FieldError>{errors.timeline}</FieldError>
                </label>
                <label className="onboarding-field onboarding-field-wide">
                  <span>Constraints or support needs</span>
                  <textarea value={data.constraints} onChange={(event) => updateField("constraints", event.target.value)} rows="3" placeholder="Example: Weekends only, low-cost courses, captions required..." />
                </label>
              </div>
            )}

            {step === 5 && (
              <div className="onboarding-form-stack">
                <fieldset className="onboarding-field">
                  <legend>Preferred learning formats <em>*</em></legend>
                  <div className="onboarding-choice-grid onboarding-choice-grid-compact">
                    {LEARNING_FORMATS.map((format) => <ChoiceButton key={format} active={data.learningFormats.includes(format)} onClick={() => toggleListValue("learningFormats", format)}>{format}</ChoiceButton>)}
                  </div>
                  <FieldError>{errors.learningFormats}</FieldError>
                </fieldset>
                <fieldset className="onboarding-field">
                  <legend>Preferred pace <em>*</em></legend>
                  <div className="onboarding-choice-grid">
                    {PACE_OPTIONS.map((pace) => <ChoiceButton key={pace} active={data.learningPace === pace} onClick={() => updateField("learningPace", pace)}>{pace}</ChoiceButton>)}
                  </div>
                  <FieldError>{errors.learningPace}</FieldError>
                </fieldset>
              </div>
            )}

            {step === 6 && (
              <div className="onboarding-review">
                <ReviewRow label="Name" value={`${data.firstName} ${data.lastName}`.trim()} onEdit={() => goToStep(0)} />
                <ReviewRow label="Location & language" value={`${data.location} · ${data.language}`} onEdit={() => goToStep(0)} />
                <ReviewRow label="Background" value={`${data.educationLevel}${data.fieldOfStudy ? ` · ${data.fieldOfStudy}` : ""} · ${data.employmentStatus}`} onEdit={() => goToStep(1)} />
                <ReviewRow label="Current skills" value={data.skills.join(", ")} onEdit={() => goToStep(2)} />
                <ReviewRow label="Career interests" value={data.interests.join(", ")} onEdit={() => goToStep(3)} />
                <ReviewRow label="Target" value={`${data.targetRole} · ${data.hoursPerWeek} hours/week · ${data.timeline}`} onEdit={() => goToStep(4)} />
                <ReviewRow label="Learning style" value={`${data.learningFormats.join(", ")} · ${data.learningPace}`} onEdit={() => goToStep(5)} />
                <label className="onboarding-confirmation">
                  <input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setErrors((current) => ({ ...current, confirmed: undefined })); }} />
                  <span>I confirm these answers are correct. Pathwise may use them to personalize this frontend demo.</span>
                </label>
                <FieldError>{errors.confirmed}</FieldError>
              </div>
            )}

            <footer className="onboarding-actions">
              <button type="button" className="onboarding-button onboarding-button-secondary" onClick={handleBack} disabled={step === 0}>← Back</button>
              {step < STEPS.length - 1 ? (
                <button type="button" className="onboarding-button onboarding-button-primary" onClick={handleNext}>Save & continue →</button>
              ) : (
                <button type="submit" className="onboarding-button onboarding-button-primary">Complete profile ✦</button>
              )}
            </footer>
          </form>
        </section>
      </div>
    </main>
  );
}
