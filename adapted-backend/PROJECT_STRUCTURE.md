# AdaptED Backend - Project Structure and Change Guide

This document explains the supplied backend and the current updated working tree. For each application file, it describes what the file contains, why it exists, how it affects the system, and whether it was part of the original Git baseline.

## Status legend

- **Original**: present in the untouched Git baseline supplied with the project.
- **Updated**: present originally, but changed during setup or implementation.
- **Added**: created after the original project was received.
- **Local/generated**: machine-specific or generated content; it should not be treated as source code.

The original code has not been deleted or rewritten in Git history. `HEAD` represents the original committed baseline, while the working tree contains the current updates.

## How the backend works

1. `server.js` loads configuration, models, middleware, and routes.
2. Routes map HTTP URLs to controller functions.
3. Controllers validate the request and coordinate the business operation.
4. Services contain reusable logic such as scraping, course ingestion, recommendations, AI calls, and S3 operations.
5. Sequelize models read and write PostgreSQL tables.
6. Migrations create or change the database structure in a controlled way.
7. The recommendation worker processes background recommendation jobs separately from the web server.

## Root files and generated folders

| Path | Status | What it contains and why it exists | Effect on the project |
|---|---|---|---|
| `.gitignore` | Original | Rules excluding secrets, dependencies, logs, and generated files from Git. | Prevents accidental commits of `.env`, `node_modules`, and machine-specific output. |
| `.env` | Local | Real database, JWT, CORS, AI, AWS, and scraper configuration for this machine. | Directly controls runtime connections and behavior. It contains secrets and must not be committed. |
| `.env.example` | Added | Safe variable names and example values. | Documents required configuration without exposing credentials. |
| `package.json` | Updated | Project metadata, npm commands, dependencies, and development dependencies. | Defines how the API, worker, migrations, and tests are started. |
| `package-lock.json` | Original | Exact dependency versions resolved by npm. | Makes dependency installation reproducible. |
| `server.js` | Updated | Express application entry point, middleware, model loading, route mounting, and startup. | Starts the API using validated configuration and database-first startup. |
| `README.md` | Updated | Setup, environment, migration, endpoint, role, scraper, and reporting instructions. | Main operational guide for developers. |
| `PROJECT_STRUCTURE.md` | Added | This original-versus-updated file guide. | Makes ownership and impact of every source file easier to understand. |
| `node_modules/` | Local/generated | Installed npm packages. | Required at runtime but regenerated with `npm install`; never edit it as project source. |
| `.git/` | Local/generated | Git history and repository metadata. | Stores the original baseline and current change tracking. |

## Configuration

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `config/database.js` | Updated | Sequelize PostgreSQL connection, pool configuration, model registration, associations, and search-index setup. | All persistent data access depends on it. The update avoids uncontrolled schema alteration during normal startup. |
| `config/environment.js` | Added | Centralized loading, validation, and normalization of environment variables. | Fails early when critical configuration is missing or invalid, instead of producing unclear runtime errors. |

## Controllers

Controllers receive API requests and return responses. They should coordinate services and models rather than contain unrelated infrastructure code.

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `controllers/authController.js` | Original | User registration, login, profile retrieval/update, and password operations. | Provides the primary email/password authentication flow and JWT responses. |
| `controllers/certificateController.js` | Original | Certificate upload URL generation and certificate listing. | Connects authenticated users to certificate storage through S3. |
| `controllers/coursesController.js` | Updated | Course catalogue endpoints and the administrator scraping operation, including safer pagination, detail-page fallbacks, awaited database persistence, and browser cleanup. | Scraped courses are saved to PostgreSQL before success is returned. |
| `controllers/globalCourseSearchController.js` | Original | HTTP handling for global course search. | Exposes search results produced by the corresponding service. |
| `controllers/healthController.js` | Added | Liveness and database-readiness checks. | Allows Postman, deployment systems, and monitoring tools to distinguish an active process from a working database connection. |
| `controllers/onboardingController.js` | Original | The multi-step employee onboarding flow and stored learning preferences. | Captures information used for personalization and recommendations. |
| `controllers/passwordResetController.js` | Original | Password-reset request and completion logic. | Supports account recovery. |
| `controllers/recommendationController.js` | Original | Recommendation request and retrieval handlers. | Exposes the existing recommendation pipeline. |
| `controllers/socialAuthController.js` | Original | Social sign-in and OAuth session handling. | Supports identity providers in addition to email/password login. |
| `controllers/userCourseController.js` | Original | Employee course saving, progress, and user-specific course operations. | Maintains an employee's relationship with catalogue courses. |

## Middleware

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `middleware/auth.js` | Original | JWT authentication, optional authentication, and role authorization. | Protects private endpoints and limits administrative scraping/reporting to `admin` or `moderator` users. |
| `middleware/validation.js` | Original | Shared `express-validator` rules and validation-error handling. | Rejects invalid request bodies before controller logic runs. |

## Models and PostgreSQL tables

| File | Status | Data represented and purpose | Effect |
|---|---|---|---|
| `models/User.js` | Original | Accounts, credentials, roles, onboarding data, interests, and learning preferences. | Central identity record used by authentication and personalization. |
| `models/UserIdentity.js` | Original | External/social identity links for a user. | Allows one account to be associated with an OAuth provider identity. |
| `models/OAuthSession.js` | Original | Temporary OAuth state/session data. | Secures and completes social login handshakes. |
| `models/PasswordReset.js` | Original | Password-reset tokens and their lifecycle. | Enables expiring account-recovery links. |
| `models/Course.js` | Original | Curated course catalogue fields: provider ID, URL, platform, title, image, rating, level, duration, skills, outcomes, instructors, and certification metadata. | This is where scraped course records remain available after the browser closes; recommendations query saved catalogue data. |
| `models/Review.js` | Original | Reviews associated with courses. | Supplies social proof and evaluation data for course quality. |
| `models/UserCourse.js` | Original | User-to-course status, progress, and saved/enrolled relationships. | Supports employee learning tracking. |
| `models/Certificate.js` | Original | Certificate metadata belonging to a user. | Records evidence of completed learning. |
| `models/UserRecommendation.js` | Original | Generated/saved course recommendations per user. | Preserves recommendation results for dashboards and background processing. |

## Routes

| File | Status | URLs grouped by the file | Effect |
|---|---|---|---|
| `routes/authRoutes.js` | Original | Registration, login, profile, password reset, and social-auth URLs. | Makes authentication controllers available under the API. |
| `routes/onboardingRoutes.js` | Original | Employee onboarding URLs. | Exposes the multi-step preference collection process. |
| `routes/courseRoutes.js` | Updated | Course list/detail/search URLs and the protected administrator scraping URL. | This is the HTTP entry point for the catalogue and scraper trigger. |
| `routes/userCourseRoutes.js` | Original | User-specific saved/enrolled/progress course URLs. | Connects the dashboard to employee learning records. |
| `routes/certificateRoutes.js` | Original | Certificate endpoints. | Connects certificate controllers to HTTP requests. |
| `routes/recommendationRoutes.js` | Original | Recommendation endpoints. | Connects recommendation controllers to HTTP requests. |

## Services

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `services/courseIngestService.js` | Original | Normalizes and upserts scraped courses using provider ID and platform as the match. | Prevents duplicate catalogue rows across repeated scrapes. |
| `services/reviewIngestService.js` | Original | Normalizes/upserts reviews and uses checksums for deduplication. | Keeps review storage consistent across repeated scrapes. |
| `services/globalCourseSearchService.js` | Original | Searches courses across the backend's available sources. | Powers global course search independently of direct controller logic. |
| `services/userCourseSearchService.js` | Original | Searches or filters courses in a user-specific context. | Helps match catalogue data to employee actions/preferences. |
| `services/recommendationService.js` | Original | Builds and stores recommendations using employee data and saved catalogue courses. | Implements the learning recommendation workflow; it does not need to live-scrape every request. |
| `services/s3Service.js` | Original | AWS S3 signing/storage helpers. | Supports certificate or related file uploads without sending file bytes through the API server. |
| `services/startupService.js` | Added | Coordinates database authentication, migrations/schema checks, and server startup failure handling. | Prevents the API from reporting itself ready when PostgreSQL is unavailable. |

### AI services

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `services/ai/adaptedChatClient.js` | Original | Client wrapper for the configured AI/chat provider. | Provides the external AI connection used by recommendation logic. |
| `services/ai/aiCourseRankingService.js` | Original | Sends candidate courses for AI-supported ranking. | Reorders shortlisted courses using employee context. |
| `services/ai/aiResponseParser.js` | Original | Validates and converts AI output into application data. | Reduces failures caused by malformed model responses. |
| `services/ai/recommendationShortlistService.js` | Original | Produces a smaller candidate set before AI ranking. | Controls AI cost and keeps ranking relevant. |

### Scraper providers

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `services/scrapers/providers/baseProvider.js` | Original | Shared provider interface and common scraper behavior. | Makes additional platforms implementable with a consistent contract. |
| `services/scrapers/providers/courseraProvider.js` | Updated | Puppeteer-based Coursera search/detail extraction, normalization, pagination, filtering, and safer parsing. | Supplies course metadata to the ingestion service. Scraping is used because AdaptED evaluates third-party courses rather than owning course content. |

## Worker

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `workers/recommendationWorker.js` | Updated | Separate background process for pending user recommendations, with validated startup/database handling. | Allows recommendation work to run independently through `npm run worker`; it is not the scraper process. |

## Utilities

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `utilities/constants.js` | Original | Shared enumerations and constant values. | Avoids inconsistent string values across controllers and services. |
| `utilities/helpers/email.js` | Original | Email helper functions/templates or transport integration. | Supports password reset and other account emails. |
| `utilities/helpers/helper.js` | Original | General reusable helper functions. | Prevents repeated utility logic. |

## Migrations and scripts

| File | Status | Contents and purpose | Effect |
|---|---|---|---|
| `migrations/202608180001-initial-schema.js` | Added | Repeatable baseline creation for the tables represented by the original models. | Replaces implicit startup schema mutation with an auditable database setup. |
| `scripts/migrate.js` | Added | Runs pending Sequelize migrations and reports their status. | `npm run db:migrate` safely brings a database schema up to date. |

## Tests

All test files below were added; the supplied project did not originally contain automated tests.

| File | What it verifies |
|---|---|
| `tests/environment.test.js` | Environment normalization and required-value checks. |
| `tests/healthController.test.js` | Liveness/readiness response behavior. |
| `tests/startupService.test.js` | Successful startup and database failure handling. |
| `tests/initialMigration.test.js` | Baseline migration structure and required tables. |
| `tests/courseRoutes.test.js` | Course and protected administrator route registration. |
| `tests/coursesController.scrape.test.js` | Awaited persistence, detail-page fallback, upstream failure behavior, and browser cleanup. |

## How to see saved courses

Run the migration once per database, then restart the API:

```powershell
npm run db:migrate
npm run dev
```

Use `GET /api/courses?page=1&pageSize=20` in Postman to retrieve saved course records. The response metadata contains the total saved count and total pages.

### Direct pgAdmin queries

Open pgAdmin's Query Tool for the `adapted` database and run:

```sql
-- Total catalogue records currently saved.
SELECT COUNT(*) AS total_courses FROM "Courses";

-- Saved records grouped by source platform.
SELECT platform, COUNT(*) AS total
FROM "Courses"
GROUP BY platform
ORDER BY total DESC;

```

The `Courses` table answers how many course records currently exist. The backend does not maintain a separate persistent history for individual scraper runs.

## Original baseline versus current implementation

The original backend already contained authentication, onboarding, course models, reviews, user-course progress, certificates, AI-assisted recommendations, a Coursera scraper, and a recommendation worker. The current updates improve environment validation, controlled migrations, readiness checks, scraper robustness, and automated tests without replacing the original business modules.
