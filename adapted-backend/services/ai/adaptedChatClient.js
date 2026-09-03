const https = require('https');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// withExponentialBackoff(fn, options)
//
// Why this exists:
//  - Our AI gateway can temporarily fail (rate limits, transient 5xx, brief network blips)
//  - Global search is latency-sensitive (we want fast-fail/small timeout)
//  - Recommendations are NOT latency-sensitive, so we can retry more aggressively
//
// options:
//  - maxRetries: total retries before giving up
//  - baseDelayMs: first backoff delay
//  - maxDelayMs: cap for backoff delay
//  - retryStatuses: which HTTP statuses we consider transient
const withExponentialBackoff = async (
    fn,
    {
        maxRetries = 2,
        baseDelayMs = 750,
        maxDelayMs = 15000,
        retryStatuses = [429],
    } = {}
) => {
    let retries = 0;

    while (true) {
        try {
            return await fn();
        } catch (error) {
            retries++;

            const status = error?.status;
            const isRetryableStatus = status && retryStatuses.includes(status);

            // Treat "no status" as a network error (timeout/DNS/etc) and retry
            const isNetworkish = !status;

            // If it's not retryable, throw immediately (don't hide real bugs)
            if (!isRetryableStatus && !isNetworkish) {
                throw error;
            }

            if (retries > maxRetries) {
                throw error;
            }

            // Exponential backoff with jitter
            // jitter prevents too many requests at one go when multiple workers retry at once
            const exp = Math.pow(2, retries - 1);
            const jitter = Math.floor(Math.random() * 250);
            const delay = Math.min(baseDelayMs * exp + jitter, maxDelayMs);

            await sleep(delay);
        }
    }
};

// Minimal JSON POST helper
const postJson = (url, payload, { timeoutMs = 30000 } = {}) =>
    new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);

        const req = https.request(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                },
            },
            (res) => {
                const chunks = [];

                res.on('data', (d) => chunks.push(d));
                res.on('end', () => {
                    const body = Buffer.concat(chunks).toString('utf8');
                    const contentType = res.headers['content-type'] || '';

                    // Non-2xx => throw an Error that includes status so backoff can decide to retry.
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        const err = new Error(`AI endpoint failed (${res.statusCode})`);
                        err.status = res.statusCode;
                        err.body = body;
                        return reject(err);
                    }

                    // If JSON, parse it. Otherwise return as string.
                    if (contentType.includes('application/json')) {
                        try {
                            return resolve(JSON.parse(body));
                        } catch (e) {
                            // If gateway lies about content-type, still return raw body.
                            return resolve(body);
                        }
                    }

                    return resolve(body);
                });
            }
        );

        // Important: timeout -> reject (counts as network-ish => retryable)
        req.setTimeout(timeoutMs, () => {
            req.destroy(new Error(`AI request timed out after ${timeoutMs}ms`));
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });

// sendChat(messages, options) calls the AI gateway: https://adapted.quantana.top/api/chat
// 
// The API gateway expects:
//  POST /api/chat { messages: [...] }
// 

// We keep this function compatible with existing callers (for global search):
//  - sendChat(messages) still works (fast fail defaults)
//
// For recommendation (worker), you should pass options to allow longer retries/timeouts
const sendChat = async ( messages, options = {}) => {
    // Allows changing endpoint per environment without code changes
    const endpoint = process.env.AI_CHAT_ENDPOINT || 'https://adapted.quantana.top/api/chat';
    if (!endpoint) {
        throw new Error('Missing AI_CHAT_ENDPOINT');
    }

    const {
        maxRetries = 2,
        timeoutMs = 30000,
        retryStatuses = [429],
        baseDelayMs = 750,
        maxDelayMs = 15000,
    } = options;

    return withExponentialBackoff(
        async () => postJson(endpoint, { messages }, { timeoutMs }),
        { maxRetries, baseDelayMs, maxDelayMs, retryStatuses }
    );
};

module.exports = { sendChat };