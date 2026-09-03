const { and, eq, gte, ilike, desc, asc, sql } = require('drizzle-orm');
const { db } = require('../db/client');
const { courses } = require('../db/schema');
const CourseraProvider = require('../services/scrapers/providers/courseraProvider');
const { upsertCourses } = require('../services/courseIngestService');
const { upsertReviews } = require('../services/reviewIngestService');
const { sendSuccess, sendError } = require('../utilities/helpers/helper');
const { HTTP_STATUS, MESSAGES } = require('../utilities/constants');
const pLimit = require('p-limit');

// GET /api/courses
const listCourses = async (req, res, next) => {
    try {
        const {
            title,
            platform,
            minRating,
            level,
            page = 1,
            pageSize = 20,
            sort = 'relevance'
        } = req.query;

        // Phase B3: the previous `tags`/`subjectAreas` filters referenced columns
        // that don't exist on Courses (confirmed against the model and the live
        // DB) - dropped rather than carried forward as dead/broken filters.
        const conditions = [];
        if (platform) conditions.push(eq(courses.platform, platform));
        if (level) conditions.push(eq(courses.level, level));
        if (minRating) conditions.push(gte(courses.rating, parseFloat(minRating)));
        if (title) conditions.push(ilike(courses.title, `%${title}%`));

        const whereClause = conditions.length ? and(...conditions) : undefined;

        // Sorting
        let orderBy;
        if (sort === 'rating') {
            orderBy = [desc(courses.rating)];
        } else if (sort === 'new') {
            orderBy = [desc(courses.createdAt)];
        } else if (sort === 'relevance' && title) {
            // naive relevance sorting = title ILIKE weight + rating fallback
            orderBy = [
                asc(sql`CASE WHEN ${courses.title} ILIKE ${`%${title}%`} THEN 0 ELSE 1 END`),
                desc(courses.rating),
            ];
        } else {
            orderBy = [desc(courses.createdAt)];
        }

        const safePage = parseInt(page, 10) || 1;
        const safePageSize = parseInt(pageSize, 10) || 20;
        const offset = (safePage - 1) * safePageSize;

        let rowsQuery = db.select().from(courses);
        if (whereClause) rowsQuery = rowsQuery.where(whereClause);
        const rows = await rowsQuery.orderBy(...orderBy).offset(offset).limit(safePageSize);

        let countQuery = db.select({ total: sql`count(*)` }).from(courses);
        if (whereClause) countQuery = countQuery.where(whereClause);
        const [{ total }] = await countQuery;
        const totalCount = Number(total);

        // Phase B7 (frontend integration): was a raw res.json() with `data`/`meta`
        // at the top level - every other endpoint in this codebase replies
        // through sendResponse's { status, message, timestamp, data } envelope,
        // and the frontend API client unwraps exactly that shape. Match it.
        return sendSuccess(res, 'Courses retrieved successfully', {
            courses: rows,
            meta: {
                page: safePage,
                pageSize: safePageSize,
                total: totalCount,
                totalPages: Math.ceil(totalCount / safePageSize)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/courses/:id
// Return course by internal UUID
const getCourseById = async (req, res, next) => {
    try {
        const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1);
        if (!course) {
            return sendError(res, HTTP_STATUS.NOT_FOUND, 'Course not found');
        }
        return sendSuccess(res, 'Course retrieved successfully', { course });
    } catch (error) {
        next(error);
    }
};

// POST /api/courses/scrape/coursera
// High-level flow:
// 1. Use CourseraProvider to search the catalog page (list scrape)
// 2. For each card on that page, scrape detailed course info + reviews collected
// 3. Upsert courses and reviews into DB
// 4. Return a clean API response (courses + limited reviews)
const scrapeCoursera = async (req, res, next) => {
    let provider = null;
    let stage = 'scraping';

    try {
        const { 
            query = '',
            page = 1, 
            pageSize = 10, 
            filters = {}, 
            reviewLimit = 0, 
            maxPages = 1 
        } = req.body || {};
        const safePageSize = Math.max(1, Math.min(Number(pageSize) || 10, 20));
        const safeMaxPages = Math.max(1, Math.min(Number(maxPages) || 1, 10)); // hard-cap for safety currently

        provider = new CourseraProvider({ includeReviews: reviewLimit > 0, reviewLimit});
        await provider._launch();

        // Paginate using fetchList
        let allCourseCards = [];
        let currentPage = Number(page) || 1;
        let pagesFetched = 0;
        let nextPageCursor = String(currentPage);
        
        while (nextPageCursor && pagesFetched < safeMaxPages) {
            const { courseData, nextPageCursor: newCursor} = await provider.fetchList({
                page: currentPage,
                pageSize: safePageSize,
                query,
                filters
            });

            if (!courseData || !courseData.length) {
                break; // no more results
            }

            allCourseCards.push(...courseData);
            pagesFetched += 1;

            if (!newCursor) {
                break; // provider says no more pages
            }

            currentPage = Number(newCursor) || (currentPage + 1);
            nextPageCursor = newCursor;
        }

        console.log('[scrapeCoursera] list count (aggregated):',
            allCourseCards.length,
            'across pages:',
            pagesFetched);

        // For each card, fetch details
        // Limit concurrent detail-page scrapes so we don't:
        // - hammer Coursera too hard
        // - blow up memory/CPU in puppeteer
        // Scraper reliability fix: lower concurrency reduces throttling and partial loads
        // on Coursera while still allowing small batches to finish quickly.
        const limit = pLimit(3);
        const detailed = await Promise.all(
            allCourseCards.map(item =>
                limit(async () => {
                    let details;
                    try {
                        details = await provider.fetchDetails(item.externalId);
                    } catch (error) {
                        // Scraper reliability fix: preserve a valid list result even when
                        // an optional detail page fails; future scrapes can enrich it.
                        console.warn(`[scrapeCoursera] details failed for ${item.externalId}: ${error.message}`);
                        details = {
                            externalId: item.externalId,
                            deepLink: item.deepLink,
                            platform: 'coursera',
                            title: item.title,
                            rating: item.rating,
                            certificationType: null,
                            level: null,
                            durationHours: null,
                            skills: [],
                            learningOutcomes: [],
                            instructors: [],
                            shareable: false,
                            enrolledCount: null,
                            assessmentCount: null,
                            reviews: []
                        };
                    }

                    return {
                        externalId: details.externalId,
                        deepLink: details.deepLink,
                        platform: details.platform,
                        // Scraper data-quality fix: prefer canonical detail-page fields;
                        // search-card text can include provider, badges, and trial labels.
                        title: details.title || item.title,
                        imageUrl: item.imageUrl,
                        rating: (details.rating != null ? details.rating : item.rating),
                        level: details.level,
                        durationHours: details.durationHours ?? item.durationHours,
                        skills: details.skills,
                        learningOutcomes: details.learningOutcomes,
                        instructors: Array.isArray(details.instructors) && details.instructors.length
                            ? details.instructors
                            : (item.instructors || []),
                        certificationType: details.certificationType ?? item.certificationType,
                        shareable: details.shareable ?? item.shareable,
                        enrolledCount: details.enrolledCount ?? item.enrolledCount,
                        assessmentCount: details.assessmentCount ?? item.assessmentCount,
                        _reviews: details.reviews || []
                    };
                })
            )
        );

        const coursesForUpsert = detailed.map(d => {
            const  {_reviews, ...course } = d;
            return course;
        });

        const reviewPayloads = detailed
        .filter(d => reviewLimit && Array.isArray(d._reviews) && d._reviews.length)
        .map(d => ({
            externalId: d.externalId,
            platform: d.platform,
            reviews: d._reviews
        }));

        const totalReviewsAttempted = reviewPayloads.reduce(
            (acc, p) => acc + p.reviews.length,
            0
        );

        // Scraper reliability fix: wait for database persistence before returning 200.
        // The previous detached background task could report success before a failed save.
        stage = 'persistence';
        const saved = await upsertCourses(coursesForUpsert);
        const savedIndex = new Map(
            saved.map(course => [`${course.externalId}|${course.platform}`, course])
        );

        if (reviewPayloads.length) {
            const reviewLimitPerCourse = pLimit(4);
            await Promise.all(
                reviewPayloads.map(payload =>
                    reviewLimitPerCourse(async () => {
                        const savedRow = savedIndex.get(`${payload.externalId}|${payload.platform}`);
                        if (!savedRow) return [];
                        return upsertReviews(savedRow.id, payload.platform, payload.reviews);
                    })
                )
            );
        }

        console.log('[scrapeCoursera] saved courses:', saved.length);
        console.log('[scrapeCoursera] review upsert attempted:', totalReviewsAttempted);

        // Map to a clean response shape: internal `_reviews` -> public `reviews`
        const responseData = detailed.map(d => {
            const { _reviews, ...course } = d;

            const savedRow = savedIndex.get(`${course.externalId}|${course.platform}`);
            return {
                ...course,
                id: savedRow?.id || null,
                reviews: _reviews || []
            };
        });

        return res.json({
            message: `Scraped ${detailed.length} Coursera course(s)`,
            data: responseData // change to saved to see DB output instead of Scraper output
        });
    } catch (error) {
        // Scraper reliability fix: distinguish an upstream Coursera/browser failure from
        // a local persistence failure for clearer Postman and monitoring responses.
        if (stage === 'scraping' && !error.status) {
            error.status = 502;
        }

        next(error);
    } finally {
        // Scraper reliability fix: Chrome must close on success, timeout, or DB failure.
        if (provider) {
            await provider._close().catch(closeError => {
                console.warn('[scrapeCoursera] browser cleanup failed:', closeError.message);
            });
        }
    }
};

module.exports = {
    listCourses,
    getCourseById,
    scrapeCoursera
};
