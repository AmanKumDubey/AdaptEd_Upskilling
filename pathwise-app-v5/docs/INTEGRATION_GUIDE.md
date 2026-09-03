# Pathwise — Integration Guide

> Integration status: these files are now merged into `pathwise-app-v5`. The copy/create steps below are retained as reference for rebuilding the project. Use `.env.local` to switch between standalone demo mode and backend API mode.

## Quick Start

```bash
# 1. Create the project
npm create vite@latest pathwise -- --template react
cd pathwise
npm install

# 2. Copy in the files
#    - Replace src/App.jsx with pathwise-frost.jsx
#    - Copy the integration layer files (see structure below)

# 3. Set your backend URL
cp .env.example .env.local
# Edit .env.local → VITE_API_URL=http://your-backend:8000/api

# 4. Run it
npm run dev
```

---

## Project Structure

```
pathwise/
├── .env.example                    # Environment variables template
├── src/
│   ├── main.jsx                    # ← NEW: Entry point with AuthProvider
│   ├── App.jsx                     # ← Your existing pathwise-frost.jsx (rename it)
│   ├── theme.js                    # ← NEW: Shared design tokens
│   │
│   ├── api/
│   │   ├── client.js               # ← NEW: HTTP client (fetch wrapper, auth tokens)
│   │   └── endpoints.js            # ← NEW: All API endpoint definitions
│   │
│   ├── context/
│   │   └── AuthContext.jsx          # ← NEW: Login/logout/user state
│   │
│   ├── hooks/
│   │   ├── useApi.js               # ← NEW: Generic data-fetching hook
│   │   └── index.js                # ← NEW: Domain hooks (useCourses, useSkills, etc.)
│   │
│   ├── components/
│   │   └── LoadingAndError.jsx      # ← NEW: Loading spinners, error states
│   │
│   ├── pages/
│   │   └── Login.jsx                # ← NEW: Login/register page
│   │
│   └── views/
│       └── DashboardView.jsx        # ← NEW: Refactored example (hooks instead of hardcoded data)
```

---

## How the Integration Layer Works

```c
┌─────────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  Component   │────▶│  Hook    │────▶│  Endpoint    │────▶│  API Client │──▶ Your Backend
│ (Dashboard)  │     │(useDash) │     │(dashboard.get│     │(client.js)  │
│              │◀────│          │◀────│              │◀────│             │◀── JSON response
│  DataGuard   │     │ loading  │     │              │     │ auth token  │
│  handles UI  │     │ error    │     │              │     │ retry logic │
│  states      │     │ data     │     │              │     │ error class │
└─────────────┘     └──────────┘     └──────────────┘     └─────────────┘
```

### Layer responsibilities:

| Layer | File | Does what |
|-------|------|-----------|
| **API Client** | `api/client.js` | HTTP fetch wrapper, auth token injection, error handling, retries |
| **Endpoints** | `api/endpoints.js` | Maps every backend route to a JS function |
| **Hooks** | `hooks/index.js` | Manages loading/error/data state per feature area |
| **Auth** | `context/AuthContext.jsx` | Login, logout, session persistence, user state |
| **DataGuard** | `components/LoadingAndError.jsx` | Shows spinners/errors so views stay clean |

---

## Backend API Contract

Your backend needs to implement these endpoints. The shapes below show what the frontend expects — adapt your backend to return data in these shapes (or adjust the `transform` functions in `hooks/index.js`).

### Auth

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| POST | `/api/auth/register` | `{ name, email, password }` | `{ token: "jwt...", user: { id, name, email, onboarded, targetRole } }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token: "jwt...", user: { ... } }` |
| POST | `/api/auth/logout` | — | `204 No Content` |
| GET | `/api/auth/me` | — | `{ user: { id, name, email, onboarded, targetRole, role } }` |
| PUT | `/api/auth/me` | `{ name, ... }` | `{ user: { ... } }` |

### Onboarding (you already have user profiles)

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/onboarding/skills` | `{ categories: { "Data & AI": ["Python", ...], ... } }` |
| GET | `/api/onboarding/roles` | `{ roles: ["Data Scientist", "ML Engineer", ...] }` |
| POST | `/api/onboarding/complete` | Request: `{ skills: [...], targetRole: "...", experience: "..." }` → `{ user, learningPath }` |

### Courses (you already have this)

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/courses?search=&level=&page=&limit=` | `{ courses: [{ id, title, provider, providerLogo, instructor, duration, rating, enrolled, level, skills, price, accent }], total: 42 }` |
| GET | `/api/courses/recommended` | `{ courses: [...] }` |
| GET | `/api/courses/enrolled` | `{ courses: [{ ...course, progress: 60 }] }` |
| POST | `/api/courses/:id/enroll` | `{ enrollment: { courseId, startedAt } }` |
| PATCH | `/api/courses/:id/progress` | Request: `{ progress: 65 }` → `{ enrollment }` |

### Dashboard

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/dashboard` | `{ progress: 68, streak: 7, stats: { skillsAcquired: 12, coursesDone: 5, assessments: 3, learningTime: "84h" }, recentCourses: [...], upcomingAssessments: [...], skillsSnapshot: [{ name: "Python", level: 92 }, ...] }` |

### Learning Path

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/learning-path` | `{ phases: [{ name, status, weeks, items: [{ title, provider, status, progress, skills, score, type }] }], overallProgress: 68 }` |
| POST | `/api/learning-path/generate` | Request: `{ targetRole }` → `{ phases: [...] }` |

### Skills Wallet

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/skills` | `{ skills: [{ id, name, level, verified, category, courses, lastAssessed }], summary: { total, verified, avgProficiency, coursesDone } }` |
| POST | `/api/skills/:id/verify` | `{ skill: { ...updated } }` |
| GET | `/api/skills/share-token` | `{ token, url }` |

### Assessments

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/assessments` | `{ assessments: [{ id, skill, questions, duration, difficulty, status, score }] }` |
| POST | `/api/assessments/:id/start` | `{ session: { id, expiresAt } }` |
| POST | `/api/assessments/:id/submit` | Request: `{ answers: [...] }` → `{ result: { score, passed } }` |

### Employer

| Method | Endpoint | Response |
|--------|----------|----------|
| GET | `/api/employer/dashboard` | `{ stats: { teamMembers, avgScore, coursesActive, assessmentsTaken }, leaderboard: [{ name, role, avatar, score, trend, topSkills }], skillsGap: [{ skill, team, target, gap }] }` |
| GET | `/api/employer/team` | `{ employees: [{ id, name, role, avatar, skills, assessments, score, trend, topSkills, color }] }` |
| GET | `/api/employer/team/:id` | `{ employee: { ... }, skills: [{ name, level }], recentAssessments: [...] }` |
| GET | `/api/employer/assessments` | `{ results: [{ employee, assessment, score, date, status }], pending: [{ employee, assessment, dueDate }] }` |

---

## Step-by-Step: Refactoring a View

Here's how to convert any existing view from hardcoded to live data. Use `src/views/DashboardView.jsx` as a reference.

### 1. Import hooks instead of using constants

```jsx
// BEFORE (hardcoded)
const COURSES = [{ id: 1, title: "..." }, ...];

function CoursesView() {
  const filtered = COURSES.filter(...);
  return <div>{filtered.map(c => ...)}</div>;
}

// AFTER (live data)
import { useCourses, useEnrollCourse } from "../hooks";
import { DataGuard } from "../components/LoadingAndError";

function CoursesView() {
  const { courses, loading, error, refetch, filters, setFilters } = useCourses();
  const { execute: enroll, loading: enrolling } = useEnrollCourse();

  return (
    <DataGuard loading={loading} error={error} data={courses} onRetry={refetch}>
      {(courseList) => (
        <div>{courseList.map(c => (
          <CourseCard key={c.id} course={c}
            onEnroll={() => enroll(c.id).then(refetch)} />
        ))}</div>
      )}
    </DataGuard>
  );
}
```

### 2. Replace user info with auth context

```jsx
// BEFORE
<h1>Good morning ✦</h1>

// AFTER
import { useAuth } from "../context/AuthContext";
const { user } = useAuth();
<h1>Good morning, {user.name.split(" ")[0]} ✦</h1>
```

### 3. Replace hardcoded state with hook state

```jsx
// BEFORE
const [onboarded, setOnboarded] = useState(true);

// AFTER
const { isOnboarded } = useAuth();
```

### 4. Wire up mutations (enroll, verify skill, start assessment)

```jsx
import { useEnrollCourse } from "../hooks";

function CourseCard({ course, onEnrolled }) {
  const { execute: enroll, loading } = useEnrollCourse();

  const handleEnroll = async () => {
    await enroll(course.id);
    onEnrolled(); // trigger parent refetch
  };

  return (
    <button onClick={handleEnroll} disabled={loading}>
      {loading ? "Enrolling..." : "Enroll →"}
    </button>
  );
}
```

---

## Refactoring Checklist

Work through each view one at a time:

- [ ] **DashboardView** → `useDashboard()` + `useEnrolledCourses()` + `useAssessments()`
- [ ] **OnboardingFlow** → `useOnboardingData()` + `useCompleteOnboarding()`
- [ ] **CoursesView** → `useCourses()` + `useEnrollCourse()`
- [ ] **LearningPathView** → `useLearningPath()`
- [ ] **SkillsWalletView** → `useSkills()` + `useVerifySkill()` + `useShareWallet()`
- [ ] **AssessmentsView** → `useAssessments()` + `useStartAssessment()`
- [ ] **EmployerDashboardView** → `useEmployerDashboard()`
- [ ] **EmployerTeamView** → `useTeam()` + `useEmployeeDetail()`
- [ ] **EmployerAssessmentsView** → `useEmployerAssessments()` + `useAssignAssessment()`

---

## Development Tips

### CORS
If your backend runs on a different port, add CORS headers or use Vite's proxy:

```js
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

### Working Without a Backend
The current UI still works standalone with hardcoded data. You can refactor views one at a time — just keep the hardcoded constants as fallbacks until each endpoint is ready.

```jsx
const { data, loading, error } = useCourses();
// Falls back to hardcoded if API isn't ready:
const courseList = data?.courses?.length ? data.courses : HARDCODED_COURSES;
```

### Adding React Router (optional)
If you want URL-based navigation instead of state-based view switching:

```bash
npm install react-router-dom
```

Then wrap views in routes instead of using `currentView` state.

---

## Deployment

```bash
# Build the production bundle
npm run build

# Preview locally
npm run preview

# Deploy to Vercel (recommended for this stack)
npx vercel

# Or deploy to Netlify
npx netlify deploy --prod --dir=dist
```

Set `VITE_API_URL` in your hosting provider's environment variables to point to your production backend.
