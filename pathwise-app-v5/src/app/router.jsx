import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import LearningPathFramework from "../LearningPathFramework";
import { AssessmentExperience } from "../features/assessment/AssessmentExperience";
import { AssessmentResultsPage } from "../features/assessment/AssessmentResultsPage";
import { AssessmentsView } from "../features/assessment/AssessmentsView";
import { inferPersonaId } from "../features/assessment/assessmentEngine";
import { AcceptInvitationPage } from "../pages/AcceptInvitationPage";
import { LoadingState } from "../components/LoadingAndError";
import { CoursesView } from "../features/courses/CoursesView";
import { CourseDetailsPage } from "../features/courses/CourseDetailsPage";
import { DashboardView } from "../features/dashboard/DashboardView";
import { EmployerAssessmentsView } from "../features/employer/EmployerAssessmentsView";
import { EmployerDashboardView } from "../features/employer/EmployerDashboardView";
import { EmployerTeamView } from "../features/employer/EmployerTeamView";
import { useEmployerAccess } from "../features/employer/employerAccess";
import { LearningModulePage } from "../features/learning-path/LearningModulePage";
import { LearningPathView } from "../features/learning-path/LearningPathView";
import { OnboardingFlow } from "../features/onboarding/OnboardingFlow";
import { authEnabled as onboardingAuthEnabled, loadProfile } from "../features/onboarding/onboardingBackend";
import { loadOnboardingProfile } from "../features/onboarding/onboardingStorage";
import PathwisePlatform from "../features/platform/PathwisePlatform";
import { SkillsWalletView } from "../features/skills/SkillsWalletView";
import { useProfile } from "../state/PathwiseDataContext";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";
import { DashboardView as ApiDashboardView } from "../views/DashboardView";

const LIVE_DASHBOARD_ENABLED =
  import.meta.env.VITE_AUTH_ENABLED === "true" &&
  import.meta.env.VITE_API_ENABLED === "true";

function DashboardRoute() {
  const { profile, selectedSkills, selectedGoal, navigateToView } = useOutletContext();

  return LIVE_DASHBOARD_ENABLED ? (
    <ApiDashboardView setCurrentView={navigateToView} />
  ) : (
    <DashboardView
      profile={profile}
      selectedSkills={selectedSkills}
      selectedGoal={selectedGoal}
      setCurrentView={navigateToView}
    />
  );
}

function LearningPathRoute() {
  const { profile } = useOutletContext();
  return <LearningPathView profile={profile} />;
}

function SkillsRoute() {
  return <SkillsWalletView />;
}

function OnboardingRoute() {
  const navigate = useNavigate();
  const handleComplete = () => navigate("/dashboard", { replace: true });

  return <OnboardingFlow onComplete={handleComplete} />;
}

// Phase B14: a returning owner/admin/hr lands directly on the Employer
// Dashboard instead of the Learner Dashboard - `employerAccess.org` is only
// ever truthy in real (authEnabled) mode for someone who actually manages an
// organization, so demo mode and plain learners keep the exact same
// behavior as before.
//
// Phase B17: the onboarding profile now lives server-side too, so a
// completed-but-cache-empty case (new browser/device, same account) needs a
// one-time server check before deciding /onboarding vs /dashboard - otherwise
// someone who already finished onboarding on another device would be sent
// through the wizard again. Skipped entirely when the local cache already
// says completed (the common case) or in demo mode, so this adds no extra
// latency there.
function StartRoute() {
  const [profile, setProfile] = useProfile();
  const employerAccess = useEmployerAccess();
  const [checkedServer, setCheckedServer] = useState(!onboardingAuthEnabled || Boolean(profile?.onboardingCompleted));

  useEffect(() => {
    if (checkedServer) return undefined;
    let cancelled = false;
    loadProfile().then((fetched) => {
      if (cancelled) return;
      setProfile(fetched || null);
      setCheckedServer(true);
    });
    return () => { cancelled = true; };
  }, [checkedServer, setProfile]);

  if (!checkedServer) {
    return <LoadingState message="Loading Pathwise..." />;
  }

  if (!profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  if (employerAccess.loading) {
    return <LoadingState message="Loading Pathwise..." />;
  }

  return <Navigate to={employerAccess.org ? "/employer" : "/dashboard"} replace />;
}

function ProfileRoute() {
  const { profile } = useOutletContext();
  return <ProfilePage profile={profile} />;
}

function AssessmentRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profile = loadOnboardingProfile();
  const requestedPersona = searchParams.get("persona");
  const preferredPersonaId = ["tech", "data", "nontech", "manager"].includes(requestedPersona)
    ? requestedPersona
    : inferPersonaId(profile);

  return (
    <AssessmentExperience
      preferredPersonaId={preferredPersonaId}
      forceFresh={searchParams.get("retake") === "1"}
      onExit={() => navigate("/dashboard")}
      onComplete={() => navigate("/assessment/results", { replace: true })}
    />
  );
}

function FrameworkRoute() {
  return (
    <div style={{ position: "relative" }}>
      <Link
        to="/learning-path"
        style={{ position: "fixed", right: 20, bottom: 20, zIndex: 200, padding: "10px 16px", borderRadius: 8, background: "#3B82F6", color: "white", textDecoration: "none", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
      >
        Back to learner path
      </Link>
      <LearningPathFramework />
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<StartRoute />} />

      <Route path="/onboarding" element={<OnboardingRoute />} />
      <Route path="/assessment" element={<AssessmentRoute />} />
      <Route path="/assessment/results" element={<AssessmentResultsPage />} />
      <Route path="/assessment/results/:resultId" element={<AssessmentResultsPage />} />
      <Route path="/admin/learning-path-framework" element={<FrameworkRoute />} />
      <Route path="/invitations/accept" element={<AcceptInvitationPage />} />

      <Route element={<PathwisePlatform />}>
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/learning-path" element={<LearningPathRoute />} />
        <Route path="/learning-path/module/:moduleId" element={<LearningModulePage />} />
        <Route path="/courses" element={<CoursesView />} />
        <Route path="/courses/:courseId" element={<CourseDetailsPage />} />
        <Route path="/skills" element={<SkillsRoute />} />
        <Route path="/assessment/library" element={<AssessmentsView />} />
        <Route path="/profile" element={<ProfileRoute />} />
        <Route path="/employer" element={<EmployerDashboardView />} />
        <Route path="/employer/team" element={<EmployerTeamView />} />
        <Route path="/employer/assessments" element={<EmployerAssessmentsView />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
