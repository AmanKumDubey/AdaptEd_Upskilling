// AI Response Parser
//
// Our 'sendChat" gateway may return:
// 1) JSON (content-type: application/json)
// 2) Plain text (content-type: text/plain) where the text is the assistant's message
// 3) Plain text that *contains* JSON (often wrapped in ```json fences)
// 4) OpenAI-like JSON with choices[0].message.content
//
// This helper normalizes all of those into a parsed JS object/array

// Removes ```json ...``` wrappers if present
const stripCodeFences = (text) => {
    if (!text) return '';
    const str = String(text).trim();

    // Matches ```json ...``` OR ``` ... ```
    const fenceMatch = str.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    return fenceMatch ? fenceMatch[1].trim() : str;
};

// Extract the first plausible JSON object/array from a string
// This is intentionally simple + safe for our use case:
// - We only need the FIRST top-level {...} or [...] block
const extractFirstJsonBlock = (text) => {
    if (!text) return null;
    const str = String(text);

    const firstObj = str.indexOf('{');
    const firstArr = str.indexOf('[');

    // Pick whichever appears first (and exists)
    let start = -1;
    let openChar = '';
    let closeChar = '';

    if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
        start = firstObj;
        openChar = '{';
        closeChar = '}';
    } else if (firstArr !== -1) {
        start = firstArr;
        openChar = '[';
        closeChar = ']';
    } else {
        return null;
    }

    // Walk forward and find the matching closing brace/bracket
    // We track nesting depth and ignore braces inside quotes
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < str.length; i++) {
        const char = str[i];

        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;

        if (char === openChar) depth++;
        if (char === closeChar) depth--;

        if (depth === 0) {
            return str.slice(start, i + 1);
        }
    }

    return null;
};

const tryJsonParse = (text) => {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (_) {
        return null;
    }
};

// parseAiResponse(raw, options)
//
// @param {*} raw - value returned by sendChat()
// @param {Object} options
// @param {'object'|'array'|'any'} options.expectTopLevel - optional shape enforcement
//
// @returns parsed JS value or throws an Error with useful context
const parseAiResponse = (raw, { expectTopLevel = 'any' } = {}) => {
    // If sendChat already gave us an object/array, normalize possible Open-AI like shapes
    if (raw && typeof raw === 'object') {
        // OpenAI-like: { choices: [{ message: { content: "..." } }] }
        if (Array.isArray(raw.choices) && raw.choices[0]?.message?.content) {
            const content = raw.choices[0].message.content;
            return parseAiResponse(content, { expectTopLevel });
        }

        // Some gateways return: { text: "..." }
        if (typeof raw.text === 'string') {
            return parseAiResponse(raw.text, { expectTopLevel });
        }

        // Otherwise it's already parsed JSON
        if (expectTopLevel === 'object' && (Array.isArray(raw) || raw === null)) {
            throw new Error('AI response parsed but was not an object');
        }
        if (expectTopLevel === 'array' && !Array.isArray(raw)) {
            throw new Error('AI response parsed but was not an array');
        }
        return raw;
    }

    // Now treat as string
    const asString = stripCodeFences(String(raw ?? '').trim());

    // 1) direct JSON parse
    const direct = tryJsonParse(asString);
    if (direct !== null) {
        if (expectTopLevel === 'object' && (Array.isArray(direct) || direct === null)) {
            throw new Error('AI response JSON was not an object');
        }
        if (expectTopLevel === 'array' && !Array.isArray(direct)) {
            throw new Error('AI response JSON was not ann array');
        }
        return direct;
    }

    // 2) extract JSON block from a longer message
    const extracted = extractFirstJsonBlock(asString);
    const extractedParsed = tryJsonParse(extracted);
    if (extractedParsed !== null) {
        if (expectTopLevel === 'object' && (Array.isArray(extractedParsed) || extractedParsed === null)) {
            throw new Error('AI response JSON block was not an object');
        }
        if (expectTopLevel === 'array' && !Array.isArray(extractedParsed)) {
            throw new Error('AI response JSON block was not an array');
        }
        return extractedParsed;
    }

    // 3) last attempt: if it looks like it contains OpenAI-ish content, try to pull it
    // (Some gateways return a stringified JSON object with choices)
    const maybeChoices = tryJsonParse(extractFirstJsonBlock(asString));
    if (maybeChoices && Array.isArray(maybeChoices.choices) && maybeChoices.choices[0]?.message?.content) {
        return parseAiResponse(maybeChoices.choices[0].message.content, { expectTopLevel });
    }

    const preview = asString.slice(0, 400);
    throw new Error(`AI response could not be parsed as JSON. Preview: ${preview}`);
};

module.exports = { parseAiResponse };