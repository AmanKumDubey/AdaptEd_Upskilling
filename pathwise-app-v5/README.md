# Pathwise Frontend

Pathwise is an AI-assisted career guidance and personalized learning application. This repository currently contains the React frontend prototypes for the main Pathwise dashboard, skills assessment, and learning-path framework.

## Phase 0 status

The frontend foundation is ready:

- React 18 application created with Vite 5
- Development, lint, build, preview, and combined health-check commands configured
- Main Pathwise application connected through `src/main.jsx`
- Skills assessment and learning-path prototype files available in `src/`
- Project page title, description, theme color, and favicon configured

The assessment and learning-path prototypes are now connected through the Phase 2 route layer.

## Phase 1 status

The frontend architecture and cleanup phase is complete:

- `src/App.jsx` is now a compatibility entry and `src/app/App.jsx` is the canonical application shell
- learner and employer navigation moved to `src/components/navigation`
- decorative layout background moved to `src/components/layout`
- dashboard, onboarding, courses, skills, assessment, learning-path, and employer views live in separate feature folders
- shared colors and reusable UI primitives use `src/theme.js` and `src/components/UIKit.jsx`
- top-level demo data moved to `src/data/mockData.js`, ready to be replaced feature by feature by APIs
- the duplicate `Pathwise.jsx` implementation was replaced with a compatibility re-export
- obsolete Vite starter styles and logos were removed
- lint completes with zero errors and the production bundle builds successfully

## Phase 2 status

URL routing and module integration are complete:

- React Router is installed and the application uses browser-history URLs
- dashboard navigation and sidebar buttons now update the URL
- direct URLs, refresh, browser back, and browser forward retain the selected screen
- the Phase 4 skills-assessment experience runs at `/assessment`
- the learner-facing generated path runs at `/learning-path`
- the supplied technical learning-path framework runs at `/admin/learning-path-framework`
- onboarding, learner, profile, and employer routes are registered
- unknown URLs render a dedicated 404 page
- `/assessment/results` displays the latest locally persisted assessment report

Implemented routes:

```text
/                              -> redirects to /dashboard
/onboarding                    -> learner onboarding
/dashboard                     -> learner dashboard
/assessment                    -> start, resume, quiz, and review flow
/assessment/results            -> scored frontend assessment report
/assessment/library            -> assessment catalog
/learning-path                 -> learner-facing generated path
/courses                       -> course discovery
/skills                        -> skills wallet
/profile                       -> learner profile
/employer                      -> employer overview
/employer/team                 -> employer team skills
/employer/assessments          -> employer assessments
/admin/learning-path-framework -> technical framework viewer
```

## Phase 3 status

The frontend onboarding and intake flow is complete:

- new visitors opening `/` are sent to `/onboarding` until a profile is completed
- seven accessible steps collect profile, education, experience, skills, interests, career goals, availability, and learning preferences
- required fields and conditional student/employment questions are validated before continuing
- Back, Save & continue, completed-step navigation, progress percentage, review, and Edit actions are implemented
- incomplete answers are automatically stored in browser `localStorage` and restored after refresh
- completing the review stores `pathwise.profile.v1`, clears the draft, and opens `/dashboard`
- the saved learner name, target role, and selected skills are displayed on the dashboard and profile page
- the profile page links back to onboarding so answers can be updated
- the feature remains frontend-only and does not require authentication, an API, or a database

Phase 3 browser storage keys:

```text
pathwise.onboarding.draft.v1 -> incomplete form, current step, saved time
pathwise.profile.v1          -> confirmed frontend demo profile
```

## Phase 4 status

The frontend skills assessment is complete:

- four assessment tracks reuse the supplied 40-question bank
- one-question-at-a-time quiz UI includes progress, previous/next controls, a question navigator, and answer validation
- an unfinished attempt is restored after refresh or reopening the assessment route
- a review screen and explicit submit confirmation run before scoring
- scoring, proficiency level, domain performance, strengths, growth areas, and role suggestions are calculated in the browser
- `/assessment/results` displays the saved report and correct/incorrect answer review
- retake and next-learning-path actions are connected through frontend routes
- no backend, API, authentication, or database is required

Phase 4 browser storage keys:

```text
pathwise.assessment.session.v1 -> unfinished answers, track, position, saved time
pathwise.assessment.result.v1  -> latest score and detailed result report
```

## Phase 5 status

The frontend personalized learning path is complete:

- the saved learner profile and latest assessment result generate an eight-module roadmap
- four assessment tracks have role-specific module catalogs and five consistent stages
- assessment growth areas are highlighted as roadmap priorities
- weekly availability determines the estimated schedule and week ranges
- the preferred learning format adapts each recommended activity
- module prerequisites, locked states, start, completion, and automatic next-module unlocking are implemented
- `/learning-path/module/:moduleId` provides objectives, topics, activity, skills, prerequisites, and progress actions
- refresh restores the generated roadmap and completed-module progress
- profile changes or a new assessment show a regenerate notice instead of silently replacing progress
- reset and regenerate actions require explicit confirmation
- missing-profile and missing-assessment states guide the learner to the required step
- no backend, API, authentication, or database is required

Phase 5 browser storage key:

```text
pathwise.learning-path.v1 -> generated roadmap, source inputs, current module, completion progress
```

## Phase 6 status

The frontend course discovery and learning-resource feature is complete:

- a curated catalog provides twelve role-relevant learning resources
- learners can search by title, skill, provider, and instructor
- level, format, provider, and saved-resource filters are available
- course detail pages include outcomes, syllabus, skills, provider details, and linked roadmap modules
- learners can save a course, start it, and mark it complete
- course state survives refresh in browser storage
- Phase 5 module pages display their recommended resources and course-completion count
- no external provider account, payment flow, course API, or backend is used

Phase 6 browser storage key:

```text
pathwise.course-progress.v1 -> saved, started, and completed catalog courses
```

## Integration layer

The files supplied in `files(1).zip` are integrated into this project under `src/api`, `src/context`, `src/hooks`, `src/components`, `src/pages`, and `src/views`.

The application runs in standalone demo mode by default, so a backend is not required for the existing UI:

```env
VITE_AUTH_ENABLED=false
VITE_API_ENABLED=false
```

To connect authentication and the API-backed dashboard, create `.env.local` from `.env.example` and set:

```env
VITE_API_URL=http://localhost:8000/api
VITE_AUTH_ENABLED=true
VITE_API_ENABLED=true
```

Both switches should be enabled together. API mode requires a backend implementing the contract documented in `docs/INTEGRATION_GUIDE.md`.

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer

The project can run with the currently installed Node.js `v21.7.3`. For long-term development, use a supported even-numbered Node.js LTS release when convenient.

Check the installed versions:

```powershell
node --version
npm --version
```

## Install and run

Open PowerShell in this project folder:

```powershell
Set-Location -LiteralPath 'C:\Users\Aman Kumar Dubey\OneDrive\Desktop\AdaptDoc\pathwise-app-v5'
npm install
npm run dev
```

Vite will print the local URL, normally:

```text
http://localhost:5173/
```

Press `Ctrl+C` in the same terminal to stop the development server.

## Quality commands

```powershell
# Check JavaScript and JSX quality
npm run lint

# Create the production bundle in dist/
npm run build

# Run lint and build together
npm run check

# Preview the production bundle locally
npm run preview
```

## Current source files

```text
src/
├── main.jsx                       # React entry point
├── App.jsx                        # Compatibility entry to the canonical app shell
├── app/                            # Canonical application shell and route configuration
├── api/                            # HTTP client and endpoint functions
├── context/                        # Authentication provider
├── hooks/                          # API query and mutation hooks
├── components/                     # Layout, navigation, loading/error states, UIKit
├── data/                            # Replaceable demo-data boundary
├── features/                        # Feature-owned screens and application platform
├── pages/                          # Login/register page
├── views/                          # API-driven dashboard example
├── styles/                          # Platform-level shared styles
├── Pathwise.jsx                   # Backward-compatible re-export; no duplicate UI
├── SkillsAssessment.jsx           # Supplied assessment question bank and legacy prototype
├── LearningPathFramework.jsx      # Standalone learning-path prototype
└── index.css                      # Global styles
```

## Current limitations

- Most feature views still use hardcoded demo data
- Authentication and API infrastructure are integrated but disabled until a compatible backend is running
- Only the dashboard has an API-backed view ready for activation
- No automated tests yet

These items belong to Phases 7–10 and are intentionally outside the completed course-discovery phase.
