// ─────────────────────────────────────────────────────────────────────
// src/api/client.js — Core HTTP client
// ─────────────────────────────────────────────────────────────────────
// This is the single point of contact with your backend.
// Change API_BASE_URL to point to your server.
// ─────────────────────────────────────────────────────────────────────

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Token Management ────────────────────────────────────────────────
let accessToken = localStorage.getItem("pathwise_token") || null;

export function setToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem("pathwise_token", token);
  } else {
    localStorage.removeItem("pathwise_token");
  }
}

export function getToken() {
  return accessToken;
}

export function clearToken() {
  setToken(null);
}

// ─── Core Fetch Wrapper ──────────────────────────────────────────────
async function request(endpoint, options = {}) {
  const {
    method = "GET",
    body = null,
    headers = {},
    params = null,       // query parameters as object
    requiresAuth = true,
    retries = 1,
  } = options;

  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== null && val !== undefined) {
        searchParams.append(key, val);
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const finalHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (requiresAuth && accessToken) {
    finalHeaders["Authorization"] = `Bearer ${accessToken}`;
  }

  // Build request config
  const config = {
    method,
    headers: finalHeaders,
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  // Execute with retry
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, config);

      // Handle 401 — token expired
      if (response.status === 401) {
        clearToken();
        window.dispatchEvent(new CustomEvent("auth:expired"));
        throw new ApiError("Session expired. Please log in again.", 401);
      }

      // Handle other errors. The backend always replies
      // { status, message, timestamp, data } - on a 422 validation failure,
      // `data` is an array of { field, message } (see middleware/validate.ts).
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new ApiError(
          errorBody.message || `Request failed (${response.status})`,
          response.status,
          errorBody.data ?? errorBody
        );
      }

      // Handle 204 No Content
      if (response.status === 204) return null;

      // Every success response is wrapped { status, message, timestamp, data }
      // (see utilities/helpers/helper.js's sendResponse) - unwrap to `data` so
      // callers work with the actual payload, not the envelope.
      const body = await response.json();
      return body.data;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError) throw err; // don't retry API errors
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Request failed");
}

// ─── Error Class ─────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ─── HTTP Method Shortcuts ───────────────────────────────────────────
export const api = {
  get: (endpoint, params, opts) =>
    request(endpoint, { method: "GET", params, ...opts }),

  post: (endpoint, body, opts) =>
    request(endpoint, { method: "POST", body, ...opts }),

  put: (endpoint, body, opts) =>
    request(endpoint, { method: "PUT", body, ...opts }),

  patch: (endpoint, body, opts) =>
    request(endpoint, { method: "PATCH", body, ...opts }),

  delete: (endpoint, opts) =>
    request(endpoint, { method: "DELETE", ...opts }),
};

export default api;

