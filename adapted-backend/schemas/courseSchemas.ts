import { z } from 'zod';

// Phase B2: these routes had zero request validation before this phase - not a
// migration of existing rules, new coverage per the SOW's "Zod-based request
// validation on every route" requirement.

const courseIdParamSchema = z.object({
  courseId: z.string().uuid('Invalid course id'),
});

// /api/courses/:id uses "id", not "courseId" - kept as a separate schema
// rather than renaming the route param and touching unrelated code.
const courseIdRouteParamSchema = z.object({
  id: z.string().uuid('Invalid course id'),
});

const scrapeCourseraSchema = z.object({
  query: z.string().trim().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(20).optional().default(10),
  filters: z.record(z.string(), z.any()).optional().default({}),
  reviewLimit: z.coerce.number().int().min(0).optional().default(0),
  maxPages: z.coerce.number().int().min(1).max(10).optional().default(1),
});

const booleanish = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
});

const toggleWishlistSchema = z.object({
  // Matches the controller's prior Boolean(undefined) === false fallback.
  isWishlist: booleanish.optional().default(false),
});

const completeCourseSchema = z.object({
  certificateKey: z.string({ message: 'certificateKey is required' }).min(1, 'certificateKey is required'),
  fileName: z.string().trim().optional().nullable(),
  contentType: z.string().trim().optional().nullable(),
  sizeBytes: z.union([z.number(), z.string()]).optional().nullable(),
});

const pageParam = z.coerce.number().int().min(1).optional();
const pageSizeParam = z.coerce.number().int().min(1).max(100).optional();

const listCoursesQuerySchema = z.object({
  title: z.string().trim().optional(),
  platform: z.enum(['coursera', 'udemy', 'skillshare']).optional(),
  tags: z.string().optional(),
  topic: z.string().trim().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  level: z.string().optional(),
  page: pageParam,
  pageSize: pageSizeParam,
  sort: z.enum(['relevance', 'rating', 'new']).optional(),
});

const globalCourseSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Missing required query parameter: q'),
  fields: z.string().optional(),
  match: z.enum(['all', 'prefix', 'contains', 'fuzzy']).optional(),
  sort: z.enum(['relevance', 'recent']).optional(),
  platform: z.string().optional(),
  level: z.string().optional(),
  certificationType: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxRating: z.coerce.number().min(0).max(5).optional(),
  page: pageParam,
  pageSize: pageSizeParam,
  ai: z.string().optional(),
});

const userCourseSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Missing required query parameter: q'),
  fields: z.string().optional(),
  match: z.enum(['all', 'prefix', 'contains', 'fuzzy']).optional(),
  sort: z.enum(['relevance', 'recent']).optional(),
  platform: z.string().optional(),
  level: z.string().optional(),
  certificationType: z.string().optional(),
  pageInProgress: pageParam,
  pageCompleted: pageParam,
  pageWishlist: pageParam,
  pageSize: pageSizeParam,
});

module.exports = {
  courseIdParamSchema,
  courseIdRouteParamSchema,
  scrapeCourseraSchema,
  toggleWishlistSchema,
  completeCourseSchema,
  listCoursesQuerySchema,
  globalCourseSearchQuerySchema,
  userCourseSearchQuerySchema,
};
