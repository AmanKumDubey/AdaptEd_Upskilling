// ─────────────────────────────────────────────────────────────────────
// src/api/endpoints.js — All API endpoints organized by domain
// ─────────────────────────────────────────────────────────────────────
// Mapped directly against adapted-backend's real routes (not a generic
// template) - see adapted-backend/routes/*.ts for the source of truth.
// Every response here is already unwrapped to `data` by api/client.js.
// ─────────────────────────────────────────────────────────────────────

import api, { API_BASE_URL } from "./client";

// ─── Auth ────────────────────────────────────────────────────────────
export const auth = {
  // POST /api/auth/sign-in/social - one of better-auth's own routes (see
  // adapted-backend/server.ts's catch-all mount), not our own controller, so
  // its response isn't wrapped in the { status, message, data } envelope -
  // call fetch directly rather than through api.post. -> { url, redirect }
  //
  // `credentials: "include"` is required here, not optional: this response
  // sets a signed `state` cookie that the callback step later re-checks
  // against the `state` query param Google sends back (a CSRF guard, on top
  // of the DB-stored verification row) - without it the browser never stores
  // that cookie, and the callback fails with state_mismatch even though the
  // rest of the flow is otherwise correct (confirmed against better-auth's
  // own source: node_modules/better-auth/dist/state.mjs's parseGenericState).
  signInWithSocial: (provider, callbackURL) =>
    fetch(`${API_BASE_URL}/auth/sign-in/social`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, callbackURL }),
    }).then((res) => res.json()),

  // GET /api/auth/get-session - another better-auth-native route. After the
  // OAuth redirect completes, better-auth has set its session as an HttpOnly
  // cookie on the backend's own origin (not this app's) - `credentials:
  // "include"` is what actually sends that cookie cross-origin here.
  // -> { session: { token, ... }, user } | null
  getBetterAuthSession: () =>
    fetch(`${API_BASE_URL}/auth/get-session`, { credentials: "include" }).then((res) =>
      res.ok ? res.json() : null
    ),

  // POST /api/auth/register  { username?, email, password, firstName?,
  // lastName?, phone?, goals?, interests?, experienceLevel?, themePreference? }
  // -> { user, token }
  register: (fields) =>
    api.post("/auth/register", fields, { requiresAuth: false }),

  // POST /api/auth/login  { email, password } -> { user, token }
  login: (email, password) =>
    api.post("/auth/login", { email, password }, { requiresAuth: false }),

  // POST /api/auth/logout - revokes the session server-side
  logout: () => api.post("/auth/logout"),

  // GET /api/auth/profile -> { user }
  getProfile: () => api.get("/auth/profile"),

  // PUT /api/auth/profile  { firstName?, lastName?, phone?, gender?,
  // country?, goals?, interests?, email? } -> { user }
  updateProfile: (data) => api.put("/auth/profile", data),

  // PUT /api/auth/change-password  { currentPassword, newPassword }
  changePassword: (currentPassword, newPassword) =>
    api.put("/auth/change-password", { currentPassword, newPassword }),

  // Password reset is a 3-step OTP flow, not a single "forgot password" call:
  // 1) request an OTP by email, 2) verify it -> short-lived resetToken,
  // 3) use that resetToken to actually set the new password.
  requestPasswordReset: (email) =>
    api.post("/auth/password/forgot", { email }, { requiresAuth: false }),
  verifyPasswordResetOtp: (email, otp) =>
    api.post("/auth/password/verify-otp", { email, otp }, { requiresAuth: false }),
  resetPassword: (resetToken, newPassword) =>
    api.post("/auth/password/reset", { resetToken, newPassword }, { requiresAuth: false }),

  // Avatar upload is 3 steps: 1) ask the backend for a presigned S3 PUT url,
  // 2) PUT the actual file bytes straight to S3 (not through our backend),
  // 3) tell the backend the upload succeeded so it attaches that key to the
  // profile. -> { uploadUrl, key, bucket, expiresInSeconds }
  presignAvatar: (fileName, contentType) =>
    api.post("/auth/avatar/presign", { fileName, contentType }),

  // Step 2 above - a raw PUT of the file itself to S3, not our backend, so it
  // isn't wrapped in the { status, message, data } envelope and doesn't go
  // through the api client at all.
  uploadAvatarFile: (uploadUrl, file) =>
    fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file }),

  // PUT /api/auth/avatar  { key } -> { user }
  confirmAvatar: (key) => api.put("/auth/avatar", { key }),

  // DELETE /api/auth/avatar -> { user }
  removeAvatar: () => api.delete("/auth/avatar"),

  // DELETE /api/auth/account  { confirmation: "DELETE" } - deactivates the
  // account (see adapted-backend/controllers/authController.js's deleteAccount).
  deleteAccount: () => api.delete("/auth/account", { body: { confirmation: "DELETE" } }),
};

// ─── Onboarding ──────────────────────────────────────────────────────
export const onboarding = {
  // GET /api/onboarding -> { user?, onboardingCompleted?, availableOptions:
  // { goals, interests, experienceLevels, themePreferences } }
  getData: () => api.get("/onboarding", null, { requiresAuth: false }),

  // POST /api/onboarding/complete  { username, email, password,
  // confirmPassword, goals, interests, experienceLevel, themePreference }
  // -> { user, token }
  complete: (data) =>
    api.post("/onboarding/complete", data, { requiresAuth: false }),
};

// ─── Public course catalog ──────────────────────────────────────────
export const courses = {
  // GET /api/courses?title=&platform=&level=&minRating=&page=&pageSize=&sort=
  // -> { courses, meta: { page, pageSize, total, totalPages } }
  list: (filters = {}) => api.get("/courses", filters, { requiresAuth: false }),

  // GET /api/courses/:id -> { course }
  getById: (id) => api.get(`/courses/${id}`, null, { requiresAuth: false }),

  // GET /api/courses/search?q=&fields=&match=&sort=&platform=&level=&...
  // public global search, personalized if a token is present
  search: (query) => api.get("/courses/search", query, { requiresAuth: false }),
};

// ─── My courses (wishlist / enroll / progress) ──────────────────────
export const myCourses = {
  // GET /api/me/courses/dashboard -> "continue learning" + wishlist sections
  getDashboard: () => api.get("/me/courses/dashboard"),

  // GET /api/me/courses/search?q=...
  search: (query) => api.get("/me/courses/search", query),

  // POST /api/me/courses/:courseId/wishlist  { isWishlist }
  toggleWishlist: (courseId, isWishlist) =>
    api.post(`/me/courses/${courseId}/wishlist`, { isWishlist }),

  // POST /api/me/courses/:courseId/enroll
  enroll: (courseId) => api.post(`/me/courses/${courseId}/enroll`),

  // POST /api/me/courses/:courseId/verify
  verify: (courseId) => api.post(`/me/courses/${courseId}/verify`),

  // POST /api/me/courses/:courseId/complete  { certificateKey, fileName?,
  // contentType?, sizeBytes? }
  complete: (courseId, data) =>
    api.post(`/me/courses/${courseId}/complete`, data),
};

// ─── Certificates ────────────────────────────────────────────────────
export const certificates = {
  // POST /api/me/courses/:courseId/certificates/presign  { fileName,
  // contentType } -> { uploadUrl, key, bucket, expiresInSeconds }
  presignUpload: (courseId, fileName, contentType) =>
    api.post(`/me/courses/${courseId}/certificates/presign`, { fileName, contentType }),

  // GET /api/me/certificates?courseId= -> [{ ...certificate, course, downloadUrl }]
  list: (courseId) => api.get("/me/certificates", courseId ? { courseId } : null),
};

// ─── Recommendations ─────────────────────────────────────────────────
export const recommendations = {
  // GET /api/me/dashboard/recommendations
  get: () => api.get("/me/dashboard/recommendations"),

  // POST /api/me/dashboard/recommendations/refresh
  refresh: () => api.post("/me/dashboard/recommendations/refresh"),
};

// ─── Organizations / RBAC ────────────────────────────────────────────
export const organizations = {
  // POST /api/orgs  { name, slug? } -> { organization } (caller becomes owner)
  create: (name, slug) => api.post("/orgs", { name, slug }),

  // GET /api/orgs -> [{ ...organization, role, departmentId }]
  listMine: () => api.get("/orgs"),

  // GET /api/orgs/:orgId -> { ...organization, role }
  getById: (orgId) => api.get(`/orgs/${orgId}`),

  // POST /api/orgs/:orgId/departments  { name } (owner/admin only)
  createDepartment: (orgId, name) => api.post(`/orgs/${orgId}/departments`, { name }),

  // GET /api/orgs/:orgId/departments
  listDepartments: (orgId) => api.get(`/orgs/${orgId}/departments`),

  // GET /api/orgs/:orgId/members
  listMembers: (orgId) => api.get(`/orgs/${orgId}/members`),

  // GET /api/orgs/:orgId/team-progress (owner/admin/hr only) -> [{ ...member,
  // latestAssessment, learningPath, assessmentsCompleted, coursesCompleted }]
  // - real per-person performance data, unlike listMembers' plain roster above.
  getTeamProgress: (orgId) => api.get(`/orgs/${orgId}/team-progress`),

  // PUT /api/orgs/:orgId/members/:memberId/role  { role } (owner/admin only)
  updateMemberRole: (orgId, memberId, role) =>
    api.put(`/orgs/${orgId}/members/${memberId}/role`, { role }),

  // PUT /api/orgs/:orgId/members/:memberId/department  { departmentId } (owner/admin only, null unassigns)
  updateMemberDepartment: (orgId, memberId, departmentId) =>
    api.put(`/orgs/${orgId}/members/${memberId}/department`, { departmentId }),

  // DELETE /api/orgs/:orgId/members/:memberId (owner/admin only)
  removeMember: (orgId, memberId) => api.delete(`/orgs/${orgId}/members/${memberId}`),

  // POST /api/orgs/:orgId/invitations  { email, role?, departmentId? }
  // (owner/admin/hr only)
  invite: (orgId, email, role, departmentId) =>
    api.post(`/orgs/${orgId}/invitations`, { email, role, departmentId }),

  // GET /api/orgs/:orgId/invitations (owner/admin/hr only)
  listInvitations: (orgId) => api.get(`/orgs/${orgId}/invitations`),

  // DELETE /api/orgs/:orgId/invitations/:invitationId (owner/admin/hr only)
  revokeInvitation: (orgId, invitationId) =>
    api.delete(`/orgs/${orgId}/invitations/${invitationId}`),
};

// POST /api/invitations/accept  { token } -> { membership }
export const invitations = {
  accept: (token) => api.post("/invitations/accept", { token }),
};

// ─── Notifications (Phase B13) ────────────────────────────────────────
export const notifications = {
  // GET /api/me/notifications -> [{ id, type, title, message, data, readAt, createdAt }]
  list: () => api.get("/me/notifications"),

  // GET /api/me/notifications/unread-count -> { count }
  unreadCount: () => api.get("/me/notifications/unread-count"),

  // PUT /api/me/notifications/:notificationId/read -> { ...notification, readAt }
  markRead: (notificationId) => api.put(`/me/notifications/${notificationId}/read`),

  // PUT /api/me/notifications/read-all
  markAllRead: () => api.put("/me/notifications/read-all"),
};

// ─── Assessments (Phase B8) ────────────────────────────────────────────
// Draws a fresh random 20-question sample server-side per attempt - the
// answer key never reaches the client until completeSession() is called.
// See src/features/assessment/assessmentBackend.js for how this is bridged
// into the existing (still-supported, demo-mode) local/localStorage engine.
export const assessments = {
  // POST /api/me/assessment/sessions  { personaId } -> { session }
  startSession: (personaId) => api.post("/me/assessment/sessions", { personaId }),

  // GET /api/me/assessment/sessions/active -> { session: {...} | null }
  getActiveSession: () => api.get("/me/assessment/sessions/active"),

  // PUT /api/me/assessment/sessions/:sessionId/answer  { questionId, selectedIndex }
  answerQuestion: (sessionId, questionId, selectedIndex) =>
    api.put(`/me/assessment/sessions/${sessionId}/answer`, { questionId, selectedIndex }),

  // POST /api/me/assessment/sessions/:sessionId/complete -> { result }
  completeSession: (sessionId) => api.post(`/me/assessment/sessions/${sessionId}/complete`),

  // GET /api/me/assessment/results -> { results: [...] } (history, no per-question review)
  listResults: () => api.get("/me/assessment/results"),

  // GET /api/me/assessment/results/latest -> { result: {...} | null }
  getLatestResult: () => api.get("/me/assessment/results/latest"),

  // GET /api/me/assessment/results/:resultId -> { result } (full per-question review)
  getResult: (resultId) => api.get(`/me/assessment/results/${resultId}`),
};

// ─── Learning Path (Phase B9) ──────────────────────────────────────────
// The backend doesn't store the onboarding wizard's answers (that stays
// local/frontend-driven for now) - generate() sends just the handful of
// fields the roadmap actually needs; the assessment result it's built from
// is read server-side (real AssessmentResults row, not client-trusted).
// See src/features/learning-path/learningPathBackend.js for how this is
// bridged into the existing (still-supported, demo-mode) local engine.
export const learningPath = {
  // GET /api/me/learning-path -> { path: {...} | null }
  getPath: () => api.get("/me/learning-path"),

  // POST /api/me/learning-path/generate  { targetRole?, hoursPerWeek?,
  // learningFormats?, learningPace?, sourceFingerprint? } -> { path }
  generate: (fields) => api.post("/me/learning-path/generate", fields),

  // PUT /api/me/learning-path/modules/:moduleId/start -> { path }
  startModule: (moduleId) => api.put(`/me/learning-path/modules/${moduleId}/start`),

  // PUT /api/me/learning-path/modules/:moduleId/complete -> { path }
  completeModule: (moduleId) => api.put(`/me/learning-path/modules/${moduleId}/complete`),

  // POST /api/me/learning-path/reset -> { path }
  resetProgress: () => api.post("/me/learning-path/reset"),
};

// ─────────────────────────────────────────────────────────────────────
// NOT implemented on the backend yet - calling these will 404. Skills
// Wallet still runs entirely on the frontend's local mock data (see
// src/features/ and src/state/PathwiseDataContext.jsx), as does the
// Employer dashboard/team/reports. Assessments and Learning Path (above)
// are the first two of these to get a real backend.
// ─────────────────────────────────────────────────────────────────────
