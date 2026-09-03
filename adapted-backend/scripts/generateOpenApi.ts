require('dotenv').config({ path: '.env' });

// Phase B6: OpenAPI 3.1 spec generated straight from the B2 Zod schemas -
// zod@4 ships a native toJSONSchema(), and OpenAPI 3.1's schema objects ARE
// JSON Schema 2020-12, so no separate schema-conversion library is needed.
// The route/method/path list below is the one thing not derivable from the
// schemas alone (Express route trees don't carry enough metadata to recover
// it reliably), so it's maintained by hand alongside the route files - but
// every request shape it points at is the actual runtime validator, not a
// hand-copied description of it.
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const authSchemas = require('../schemas/authSchemas');
const passwordResetSchemas = require('../schemas/passwordResetSchemas');
const onboardingSchemas = require('../schemas/onboardingSchemas');
const courseSchemas = require('../schemas/courseSchemas');
const certificateSchemas = require('../schemas/certificateSchemas');
const organizationSchemas = require('../schemas/organizationSchemas');

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

interface RouteDef {
  method: HttpMethod;
  path: string; // OpenAPI-style, e.g. /api/orgs/{orgId}
  summary: string;
  tags: string[];
  auth: boolean;
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

const toJsonSchema = (schema: z.ZodTypeAny) => z.toJSONSchema(schema, { unrepresentable: 'any' });

const paramsFromSchema = (schema: z.ZodTypeAny, location: 'query' | 'path') => {
  const jsonSchema: any = toJsonSchema(schema);
  const required = new Set<string>(jsonSchema.required || []);
  return Object.entries(jsonSchema.properties || {}).map(([name, propSchema]) => ({
    name,
    in: location,
    required: location === 'path' ? true : required.has(name),
    schema: propSchema,
  }));
};

const ROUTES: RouteDef[] = [
  // --- Auth ---
  { method: 'post', path: '/api/auth/register', summary: 'Register a new user', tags: ['Auth'], auth: false, body: authSchemas.registerSchema },
  { method: 'post', path: '/api/auth/login', summary: 'Log in with email/password', tags: ['Auth'], auth: false, body: authSchemas.loginSchema },
  { method: 'get', path: '/api/auth/google/start', summary: 'Start Google OAuth flow', tags: ['Auth'], auth: false },
  { method: 'get', path: '/api/auth/google/callback', summary: 'Google OAuth callback', tags: ['Auth'], auth: false },
  { method: 'get', path: '/api/auth/linkedin/start', summary: 'Start LinkedIn OAuth flow', tags: ['Auth'], auth: false },
  { method: 'get', path: '/api/auth/linkedin/callback', summary: 'LinkedIn OAuth callback', tags: ['Auth'], auth: false },
  { method: 'post', path: '/api/auth/password/forgot', summary: 'Request a password reset OTP', tags: ['Auth'], auth: false, body: passwordResetSchemas.passwordForgotSchema },
  { method: 'post', path: '/api/auth/password/verify-otp', summary: 'Verify a password reset OTP', tags: ['Auth'], auth: false, body: passwordResetSchemas.passwordVerifyOtpSchema },
  { method: 'post', path: '/api/auth/password/reset', summary: 'Reset password with a verified reset token', tags: ['Auth'], auth: false, body: passwordResetSchemas.passwordResetSchema },
  { method: 'get', path: '/api/auth/profile', summary: 'Get the current user profile', tags: ['Auth'], auth: true },
  { method: 'put', path: '/api/auth/profile', summary: 'Update the current user profile', tags: ['Auth'], auth: true, body: authSchemas.profileUpdateSchema },
  { method: 'put', path: '/api/auth/change-password', summary: 'Change the current user password', tags: ['Auth'], auth: true, body: authSchemas.passwordChangeSchema },
  { method: 'post', path: '/api/auth/logout', summary: 'Log out (revokes the current session)', tags: ['Auth'], auth: true },

  // --- Onboarding ---
  { method: 'post', path: '/api/onboarding/complete', summary: 'Complete onboarding in a single request', tags: ['Onboarding'], auth: false, body: onboardingSchemas.completeOnboardingSchema },
  { method: 'get', path: '/api/onboarding', summary: 'Get onboarding data and available options', tags: ['Onboarding'], auth: false },

  // --- Public course catalog ---
  { method: 'get', path: '/api/courses/search', summary: 'Global course search (public, personalized if authenticated)', tags: ['Courses'], auth: false, query: courseSchemas.globalCourseSearchQuerySchema },
  { method: 'get', path: '/api/courses/global-search', summary: 'Global course search (authenticated)', tags: ['Courses'], auth: true, query: courseSchemas.globalCourseSearchQuerySchema },
  { method: 'get', path: '/api/courses', summary: 'List courses in the public catalog', tags: ['Courses'], auth: false, query: courseSchemas.listCoursesQuerySchema },
  { method: 'get', path: '/api/courses/{id}', summary: 'Get a course by id', tags: ['Courses'], auth: false, params: courseSchemas.courseIdRouteParamSchema },
  { method: 'post', path: '/api/courses/scrape/coursera', summary: 'Trigger a Coursera scrape (admin/moderator only)', tags: ['Courses'], auth: true, body: courseSchemas.scrapeCourseraSchema },

  // --- My courses (wishlist / enroll / progress) ---
  { method: 'get', path: '/api/me/courses/dashboard', summary: "Get the current user's course dashboard", tags: ['My Courses'], auth: true },
  { method: 'get', path: '/api/me/courses/search', summary: "Search the current user's courses", tags: ['My Courses'], auth: true, query: courseSchemas.userCourseSearchQuerySchema },
  { method: 'post', path: '/api/me/courses/{courseId}/wishlist', summary: 'Add/remove a course from the wishlist', tags: ['My Courses'], auth: true, params: courseSchemas.courseIdParamSchema, body: courseSchemas.toggleWishlistSchema },
  { method: 'post', path: '/api/me/courses/{courseId}/enroll', summary: 'Mark a course as pending verification', tags: ['My Courses'], auth: true, params: courseSchemas.courseIdParamSchema },
  { method: 'post', path: '/api/me/courses/{courseId}/verify', summary: 'Mark a course as in progress', tags: ['My Courses'], auth: true, params: courseSchemas.courseIdParamSchema },
  { method: 'post', path: '/api/me/courses/{courseId}/complete', summary: 'Mark a course as completed', tags: ['My Courses'], auth: true, params: courseSchemas.courseIdParamSchema, body: courseSchemas.completeCourseSchema },

  // --- Certificates ---
  { method: 'post', path: '/api/me/courses/{courseId}/certificates/presign', summary: 'Presign a certificate upload URL', tags: ['Certificates'], auth: true, params: courseSchemas.courseIdParamSchema, body: certificateSchemas.presignCertificateSchema },
  { method: 'get', path: '/api/me/certificates', summary: "List the current user's certificates", tags: ['Certificates'], auth: true, query: certificateSchemas.listCertificatesQuerySchema },

  // --- Recommendations ---
  { method: 'get', path: '/api/me/dashboard/recommendations', summary: "Get the current user's course recommendations", tags: ['Recommendations'], auth: true },
  { method: 'post', path: '/api/me/dashboard/recommendations/refresh', summary: 'Force-refresh course recommendations', tags: ['Recommendations'], auth: true },

  // --- Organizations / RBAC (Phase B5) ---
  { method: 'post', path: '/api/orgs', summary: 'Create an organization (caller becomes owner)', tags: ['Organizations'], auth: true, body: organizationSchemas.createOrganizationSchema },
  { method: 'get', path: '/api/orgs', summary: "List the current user's organizations", tags: ['Organizations'], auth: true },
  { method: 'get', path: '/api/orgs/{orgId}', summary: 'Get an organization (requires membership)', tags: ['Organizations'], auth: true, params: organizationSchemas.orgIdParamSchema },
  { method: 'post', path: '/api/orgs/{orgId}/departments', summary: 'Create a department (owner/admin only)', tags: ['Organizations'], auth: true, params: organizationSchemas.orgIdParamSchema, body: organizationSchemas.createDepartmentSchema },
  { method: 'get', path: '/api/orgs/{orgId}/departments', summary: 'List departments', tags: ['Organizations'], auth: true, params: organizationSchemas.orgIdParamSchema },
  { method: 'get', path: '/api/orgs/{orgId}/members', summary: 'List organization members', tags: ['Organizations'], auth: true, params: organizationSchemas.orgIdParamSchema },
  { method: 'put', path: '/api/orgs/{orgId}/members/{memberId}/role', summary: "Update a member's role (owner/admin only)", tags: ['Organizations'], auth: true, params: organizationSchemas.memberIdParamSchema, body: organizationSchemas.updateMemberRoleSchema },
  { method: 'delete', path: '/api/orgs/{orgId}/members/{memberId}', summary: 'Remove a member (owner/admin only)', tags: ['Organizations'], auth: true, params: organizationSchemas.memberIdParamSchema },
  { method: 'post', path: '/api/orgs/{orgId}/invitations', summary: 'Invite a member by email (owner/admin/hr only)', tags: ['Organizations'], auth: true, params: organizationSchemas.orgIdParamSchema, body: organizationSchemas.inviteMemberSchema },
  { method: 'get', path: '/api/orgs/{orgId}/invitations', summary: 'List pending invitations (owner/admin/hr only)', tags: ['Organizations'], auth: true, params: organizationSchemas.orgIdParamSchema },
  { method: 'delete', path: '/api/orgs/{orgId}/invitations/{invitationId}', summary: 'Revoke a pending invitation (owner/admin/hr only)', tags: ['Organizations'], auth: true, params: organizationSchemas.invitationIdParamSchema },
  { method: 'post', path: '/api/invitations/accept', summary: 'Accept an invitation using its token', tags: ['Organizations'], auth: true, body: organizationSchemas.acceptInvitationSchema },

  // --- Health ---
  { method: 'get', path: '/api/health', summary: 'Health check (API + database)', tags: ['System'], auth: false },
];

const genericResponse = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['success', 'error'] },
    message: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    data: {},
  },
  required: ['status', 'message', 'timestamp'],
};

const buildOperation = (route: RouteDef) => {
  const parameters = [
    ...(route.params ? paramsFromSchema(route.params, 'path') : []),
    ...(route.query ? paramsFromSchema(route.query, 'query') : []),
  ];

  const operation: Record<string, any> = {
    summary: route.summary,
    tags: route.tags,
    parameters: parameters.length ? parameters : undefined,
    responses: {
      '200': { description: 'Success', content: { 'application/json': { schema: genericResponse } } },
      '422': { description: 'Validation failed', content: { 'application/json': { schema: genericResponse } } },
    },
  };

  if (route.auth) {
    operation.security = [{ bearerAuth: [] }];
    operation.responses['401'] = { description: 'Unauthorized', content: { 'application/json': { schema: genericResponse } } };
  }

  if (route.body) {
    operation.requestBody = {
      required: true,
      content: { 'application/json': { schema: toJsonSchema(route.body) } },
    };
  }

  return operation;
};

const buildSpec = () => {
  const paths: Record<string, any> = {};

  for (const route of ROUTES) {
    paths[route.path] = paths[route.path] || {};
    paths[route.path][route.method] = buildOperation(route);
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'AdaptED Backend API',
      version: '1.0.0',
      description: 'Generated from the Zod schemas in schemas/ - run `npm run openapi:generate` after changing a schema or a route.',
    },
    servers: [{ url: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', description: 'better-auth session token, e.g. from /api/auth/login' },
      },
    },
    paths,
  };
};

const outputPath = path.join(__dirname, '..', 'openapi.json');
fs.writeFileSync(outputPath, JSON.stringify(buildSpec(), null, 2));
console.log(`OpenAPI spec written to ${outputPath} (${ROUTES.length} operations).`);
