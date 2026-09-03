require('dotenv').config({ path: '.env' });

const os = require('os');
const { eq, and, or, isNull, isNotNull, lt, lte } = require('drizzle-orm');
const { connectDB } = require('../config/database');
const { validateEnvironment } = require('../config/environment');
const { db } = require('../db/client');
const { userRecommendations } = require('../db/schema');
const { touch } = require('../db/helpers');

const { generateRecommendationForUser } = require('../services/recommendationService');

// Worker identity (helps debugging locks)
// Eg: "recs-worker-myhost-12345"
const WORKER_ID = process.env.RECS_WORKER_ID || `reco-worker-${os.hostname()}-${process.pid}`;

// Worker Loop settings
const POLL_INTERVAL_MS = Number(process.env.RECS_WORKER_POLL_MS || 25000); // 25s default
const LOCK_MS = Number(process.env.RECS_WORKER_LOCK_MS || 2 * 60 * 1000); // 2 min lock

// Backoff strategy for failed jobs
// (very simple: 1m, 5m, 15m, 60m ....)
const backoffMs = (attempts) => {
    if (attempts <= 0) return 60 * 1000;
    if (attempts === 1) return 5 * 60 * 1000;
    if (attempts === 2) return 15 * 60 * 1000;
    return 60 * 60 * 1000;
};

// Error Logging Helpers

// normalizeError(err)
//
// Safely converts unknown thrown values (string, object, Error) into an Error-like shape
// This prevents "can't read .stack" issues and ensures logs always include something useful
const normalizeError = (err) => {
    if (err instanceof Error) return err;

    // Some libs throw strings or plain objects.
    const e = new Error(typeof err === 'string' ? err : 'Non-Error thrown');
    // Attach the original for debugging
    e.original = err;
    return e;
};

// getErrorMeta(err)
//
// Creates a compact but helpful error metadata object for logging
const getErrorMeta = (err) => {
    const e = normalizeError(err);

    return {
        name: e.name,
        message: e.message,
        // common fields you might see from OpenAI/http/pg errors
        code: e.code,
        status: e.status,
        statusCode: e.statusCode,
        // if someone threw { cause: ... } or Error.cause exists
        cause: e.cause ? (e.cause.message || String(e.cause)) : undefined,
    };
};

// logErrorWithStack(prefix, err)
//
// Prints the full stack trace (and nested causes when present)
const logErrorWithStack = (prefix, err) => {
    const e = normalizeError(err);
    const meta = getErrorMeta(e);

    console.warn(`${prefix} ${meta.name || 'Error'}: ${meta.message || '(no message)'}`);
    console.warn(`${prefix} meta:`, meta);

    if (e.stack) {
        console.warn(`${prefix} stack:\n${e.stack}`);
    } else {
        console.warn(`${prefix} stack: (no stack available)`);
    }

    // If the error has a cause chain, log it too (Node 16+ often uses Error.cause)
    if (e.cause instanceof Error) {
        console.warn(`${prefix} cause stack:\n${e.cause.stack || e.cause.message}`);
    }

    // If we normalized a non-Error thrown value, show it
    if (e.original) {
        console.warn(`${prefix} original thrown value:`, e.original);
    }
};

// log stack traces for any crash-level errors too
process.on('unhandledRejection', (reason) => {
    logErrorWithStack(`[${WORKER_ID}] [unhandledRejection]`, reason);
});

process.on('uncaughtException', (err) => {
    logErrorWithStack(`[${WORKER_ID}] [uncaughtException]`, err);
    // NOTE: For now we keep existing behavior (worker will die)
    // we can later decide whether to exit or attempt graceful shutdown.
});

// Helper
async function promoteExpiredRecommendations() {
    const now = new Date();

    try {
        const updated = await db.update(userRecommendations).set(touch({
            status: 'generating',
            nextRunAt: now,
            attempts: 0,
            lastError: null,
        })).where(and(
            eq(userRecommendations.status, 'ready'),
            isNotNull(userRecommendations.expiresAt),
            lte(userRecommendations.expiresAt, now),
            or(isNull(userRecommendations.lockUntil), lt(userRecommendations.lockUntil, now)),
        )).returning({ id: userRecommendations.id });

        if (updated.length > 0) {
            logErrorWithStack(`Promoted ${updated.length} expired recommendation job(s) -> status='generating'`);
        }
    } catch (err) {
        // Don't kill the loop if promotion fails; just log.
        logErrorWithStack('Failed to promote expired recommendations', err);
    }
};

// Promote expired recommendations into a scheduled generation
// Why this is needed:
//  - The worker only processes rows that are already in `status = 'generating'` (or retriable 'failed')
//  - If nothing calls `scheduleRecommendationGeneration()` (no API traffic), expired rows in 'ready' would never run

// claimNextJob()
//
// Finds the next job that should run and tries to lock it
//
// Why lock?
//  - If you later run multiple workers, locks prevent duplicate generation
const claimNextJob = async () => {
    const now = new Date();

    // Find job that is ready to run:
    //  - status=generating or failed
    //  - nextRunAt is now or earlier (or null)
    //  - lock is free or expired
    const [job] = await db.select().from(userRecommendations).where(and(
        or(eq(userRecommendations.status, 'generating'), eq(userRecommendations.status, 'failed')),
        or(isNull(userRecommendations.nextRunAt), lte(userRecommendations.nextRunAt, now)),
        or(isNull(userRecommendations.lockUntil), lt(userRecommendations.lockUntil, now)),
    )).orderBy(userRecommendations.updatedAt).limit(1);

    if (!job) return null;

    // Attempt to claim it by updating the lock fields
    // We include lockUntil condition again to reduce race
    const lockUntil = new Date(Date.now() + LOCK_MS);

    const claimed = await db.update(userRecommendations).set({
        lockedBy: WORKER_ID,
        lockUntil,
    }).where(and(
        eq(userRecommendations.id, job.id),
        or(isNull(userRecommendations.lockUntil), lt(userRecommendations.lockUntil, now)),
    )).returning();

    if (!claimed.length) return null; // lost race

    return claimed[0];
};

// processJob(job)
//
// Generates recommendations and updates DB
const processJob = async (job) => {
    const userId = job.userId;

    console.log(`[${WORKER_ID}] Processing recommendations for userId=${userId}`);

    // Lock ticker/heartbeat so long AI calls don't let lock expire mid-job
    // If generation takes longer than LOCK_MS, we keep extending lockUntil while processing
    const startLockTicker = () => {
        const tickEveryMs = Math.max(15000, Math.floor(LOCK_MS / 2));
        const timer = setInterval(async () => {
            try {
                const newLockUntil = new Date(Date.now() + LOCK_MS);

                await db.update(userRecommendations).set({ lockUntil: newLockUntil })
                  .where(and(eq(userRecommendations.id, job.id), eq(userRecommendations.lockedBy, WORKER_ID)));
            } catch (error) {
                // Don't crash the job if ticker fails; just log it.
                logErrorWithStack(`[${WORKER_ID}] Lock heartbeat error userId=${userId}:`, error);
            }
        }, tickEveryMs);

        return () => clearInterval(timer);
    }

    const stopTicker = startLockTicker();

    try {
        // 1) Generate batch (SQL candidates + AI shortlist + badges)
        const { batch, generatedAt, expiresAt } = await generateRecommendationForUser({ userId });

        // 2) Shift current -> previous, store new current; release lock
        await db.update(userRecommendations).set(touch({
            previousBatch: job.current || null,
            current: batch,
            generatedAt,
            expiresAt,
            status: 'ready',
            lastError: null,
            attempts: 0,
            lockedBy: null,
            lockUntil: null,
            nextRunAt: null,
        })).where(eq(userRecommendations.id, job.id));

        console.log(`[${WORKER_ID}] Done userId=${userId} items=${batch.items.length}`);
    } catch (error) {
        const e = normalizeError(error);
        const meta = getErrorMeta(e);

        // This log now includes full stack trace
        logErrorWithStack(`[${WORKER_ID}] Failed userId=${userId}:`, e);

        // Mark failed, keep old current visible, schedule retry
        // Keep lastError short-ish and informative (avoid dumping huge stacks into DB)
        // You can increase this limit if your DB column supports more.
        const compactLastError = `${meta.name || 'Error'}: ${meta.message || 'Unknown error'}`.slice(0, 900);
        const nextAttempts = Number(job.attempts || 0) + 1;

        try {
            await db.update(userRecommendations).set(touch({
                status: 'failed',
                lastError: compactLastError,
                attempts: nextAttempts,
                nextRunAt: new Date(Date.now() + backoffMs(nextAttempts)),
                // Release lock so another run can happen later
                lockedBy: null,
                lockUntil: null,
            })).where(eq(userRecommendations.id, job.id));
        } catch (saveError) {
            logErrorWithStack(`[${WORKER_ID}] Failed to persist job failure state userId=${userId}:`, saveError);
        }
    } finally {
        stopTicker();
    }
};

let IS_RUNNING_LOOP = false; // this variable is to prevent overlapping runs from setInterval

// Worker main loop
const runLoop = async () => {
    if (IS_RUNNING_LOOP) return;
    IS_RUNNING_LOOP = true;
    try {
        await promoteExpiredRecommendations();
        const job = await claimNextJob();
        if (!job) return;

        await processJob(job);
    } finally {
        IS_RUNNING_LOOP = false;
    }
};

(async () => {
    // Phase 1 stabilization: apply the same environment validation as the API before
    // starting the polling loop, then connect without schema mutation or index work.
    validateEnvironment();
    await connectDB({ sync: false, ensureIndexes: false});

    console.log(`[${WORKER_ID}] Recommendation worker started`);
    console.log(`[${WORKER_ID}] Poll interval: ${POLL_INTERVAL_MS}ms`);

    // Run immediately once so you don't have to wait 25s for the first poll
    runLoop().catch(error => {
        logErrorWithStack(`[${WORKER_ID}] Loop error:`, error);
    });

    // Poll forever
    setInterval(() => {
        runLoop().catch(error => {
            logErrorWithStack(`[${WORKER_ID}] Loop error:`, error);
        });
    }, POLL_INTERVAL_MS);
})().catch(error => {
    // Phase 1 stabilization: startup failures now produce a clear error and non-zero exit.
    logErrorWithStack(`[${WORKER_ID}] Failed to start worker:`, error);
    process.exitCode = 1;
});
