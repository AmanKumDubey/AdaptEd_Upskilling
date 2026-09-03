// ─────────────────────────────────────────────────────────────────────
// src/api/endpoints.js — All API endpoints organized by domain
// ─────────────────────────────────────────────────────────────────────
// Mapped directly against adapted-backend's real routes (not a generic
// template) - see adapted-backend/routes/*.ts for the source of truth.
// Every response here is already unwrapped to `data` by api/client.js.
// ─────────────────────────────────────────────────────────────────────

import api from "./client";

// ─── Auth ────────────────────────────────────────────────────────────
export const auth = {
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

  // PUT /api/orgs/:orgId/members/:memberId/role  { role } (owner/admin only)
  updateMemberRole: (orgId, memberId, role) =>
    api.put(`/orgs/${orgId}/members/${memberId}/role`, { role }),

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

// ─────────────────────────────────────────────────────────────────────
// NOT implemented on the backend yet - calling these will 404. Learning
// path, Skills Wallet, Assessments, and the Employer dashboard/team/reports
// still run entirely on the frontend's local mock data (see src/features/
// and src/state/PathwiseDataContext.jsx). Wiring them up is separate,
// later backend work - not part of B1-B6.
// ─────────────────────────────────────────────────────────────────────
