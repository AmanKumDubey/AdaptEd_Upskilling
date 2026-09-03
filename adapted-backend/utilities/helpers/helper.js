const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const crypto = require('crypto');
const { HTTP_STATUS, MESSAGES, PAGINATION, VALIDATION, OAUTH_PROVIDERS, RESET } = require('../constants');

const {
  RESET_OTP_LENGTH = '6',
  RESET_OTP_TTL_MINUTES = '5', 
  RESET_MAX_ATTEMPTS = '3',
  RESET_SESSION_TTL = '15m',
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME,
  NODE_ENV,
  JWT_SECRET
} = process.env;

// Password utilities
const hashPassword = async (password) => {
  try {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// JWT utilities
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });
  } catch (error) {
    throw new Error('Error generating token');
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Response utilities
const sendResponse = (res, statusCode, message, data = null) => {
  const response = {
    status: statusCode < 400 ? 'success' : 'error',
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, message = MESSAGES.INTERNAL_ERROR, data = null) => {
  return sendResponse(res, statusCode, message, data);
};

const sendSuccess = (res, message = MESSAGES.SUCCESS, data = null, statusCode = HTTP_STATUS.OK) => {
  return sendResponse(res, statusCode, message, data);
};

// Validation utilities
const validateEmail = (email) => {
  return VALIDATION.EMAIL_REGEX.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= VALIDATION.PASSWORD_MIN_LENGTH;
};

const validateUsername = (username) => {
  return username && 
         username.length >= VALIDATION.USERNAME_MIN_LENGTH && 
         username.length <= VALIDATION.USERNAME_MAX_LENGTH;
};

// Pagination utilities
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev
  };
};

// String utilities
const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

// Date utilities
const formatDate = (date) => {
  return new Date(date).toISOString();
};

const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};

// Object utilities
const removeEmptyFields = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

const sanitizeUser = (user) => {
  // Sequelize instances expose toJSON() (Mongoose's toObject() does not apply here).
  // Once a model migrates to Drizzle its query results are already plain objects,
  // so this falls through to the `: user` branch unchanged.
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : user;
  const { password, __v, ...sanitizedUser } = plain;
  return sanitizedUser;
};

// Error handling utilities
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const createError = (message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
  const error = new Error(message);
  error.status = statusCode;
  return error;
};

// HTTPS utilities
const httpsGetJson = (url, headers = {}) => new Promise((resolve, reject) => {
  const req = https.get(url, { headers }, (res) => {
    let data = '';
    res.on('data', (d) => (data += d));
    res.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
  });
  req.on('error', reject);
});

const httpsPostForm = (url, form, headers = {}) => new Promise((resolve, reject) => {
  const body = new URLSearchParams(form).toString(); // replaces querystring.stringify
  const u = new URL(url);

  const opts = {
    method: 'POST',
    hostname: u.hostname,
    path: u.pathname + (u.search || ''),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      ...headers
    }
  };

  const req = https.request(opts, (res) => {
    let data = '';
    res.on('data', (d) => (data += d));
    res.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

// Crypto utilities
const base64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const randomString = (bytes = 24) => base64url(crypto.randomBytes(bytes));
const sha256 = (input) => crypto.createHash('sha256').update(input).digest();
const pkceChallenge = (verifier) => base64url(sha256(verifier));

// Social Login Provider utilities
const getProviderConfig = (provider) => {
  const p = OAUTH_PROVIDERS[provider];
  if (!p) throw new Error('Unsupported provider');
  return p;
};

const oauthEnv = (provider) => {
  if (provider === 'google') {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    };
  }
  if (provider === 'linkedin') {
    return {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      redirectUri: process.env.LINKEDIN_REDIRECT_URI
    };
  }
  throw new Error('Unsupported provider');
};

const buildOAuthAuthorizeUrl = (provider, { state, nonce, codeChallenge }) => {
  const p = getProviderConfig(provider);
  const { clientId, redirectUri } = oauthEnv(provider);
  const scopes = p.defaultScopes.join(' ');

  const u = new URL(p.authUrl);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', scopes);
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  if (p.usePkce) {
    u.searchParams.set('code_challenge', codeChallenge);
    u.searchParams.set('code_challenge_method', 'S256');
  }
  
  return u.toString();
};

// OIDC + JWKS utilities
const _discoveryCache = new Map(); // provider -> { data, fetchedAt }
const _jwksCache = new Map();      // provider -> { keysByKid, fetchedAt }
const _CACHE_MS = 60 * 60 * 1000;  // 1 hour

const getDiscovery = async (provider) => {
  const p = getProviderConfig(provider);
  const cached = _discoveryCache.get(provider);
  if (cached && (Date.now() - cached.fetchedAt) < _CACHE_MS) return cached.data;
  const data = await httpsGetJson(p.discoveryUrl);
  _discoveryCache.set(provider, { data, fetchedAt: Date.now() });
  return data;
};

const getJwksByKid = async (provider) => {
  const cached = _jwksCache.get(provider);
  if (cached && (Date.now() - cached.fetchedAt) < _CACHE_MS) return cached.keysByKid;
  const discovery = await getDiscovery(provider);
  const jwksUri = discovery.jwks_uri;
  if (!jwksUri) throw new Error('Missing jwks_uri');
  const { keys } = await httpsGetJson(jwksUri);
  const map = new Map();
  for (const k of keys) map.set(k.kid, k);
  _jwksCache.set(provider, { keysByKid: map, fetchedAt: Date.now() });
  return map;
};

// Prefer Node's JWK -> KeyObject path; fallback throws with a helpful message if too old.
const jwkToPem = (jwk) => {
  try {
    const keyObj = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return keyObj.export({ format: 'pem', type: 'spki' });
  } catch (e) {
    const err = new Error('Failed to convert JWK to PEM. Please run Node >= 16.17 (recommended Node 18+).');
    err.cause = e;
    throw err;
  }
};

const verifyProviderIdToken = async ({ provider, idToken, expectedNonce, clientId }) => {
  const p = getProviderConfig(provider);

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('Invalid ID token header');
  }
  const kid = decoded.header.kid;

  const keysByKid = await getJwksByKid(provider);
  const jwk = keysByKid.get(kid);
  if (!jwk) throw new Error('JWKS key not found');

  const pem = jwkToPem(jwk);

  const raw = jwt.decode(idToken);
  console.log('[LI] iss from token:', raw && raw.iss);


  const payload = jwt.verify(idToken, pem, {
    algorithms: ['RS256'],
    audience: clientId,
    issuer: p.issuers
  });

  if (provider === 'google') {
    if (!payload.nonce) throw new Error('Nonce missing')
  }
  // LinkedIn currently does no use nonce
  if (expectedNonce && payload.nonce !== expectedNonce) {
    console.warn('[LI] ID token nonce mismatch; continuing without nonce enforcement');
  }

  return payload; // sub, email (google), name, picture, etc.
};

const exchangeCodeForTokens = async (provider, code, codeVerifier) => {
  const { clientId, clientSecret, redirectUri } = oauthEnv(provider);
  const p = getProviderConfig(provider);

  const form = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  };

  if (provider === 'linkedin') {
    // Confidential Client + No PKCE for linkedin
    return httpsPostForm(p.tokenUrl, form);
  }

  if (p.usePkce && codeVerifier) form.code_verifier = codeVerifier;

  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  return httpsPostForm(p.tokenUrl, form);
};

const fetchLinkedInEmail = async (accessToken) => {
  const url = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
  const data = await httpsGetJson(url, { Authorization: `Bearer ${accessToken}` });
  const elem = Array.isArray(data.elements) && data.elements[0];
  const handle = elem && elem['handle~'];
  return handle && handle.emailAddress ? handle.emailAddress : null;
};

// OTP utilities
const generateOTP = (length = 6) => {
  const digits = [];
  for (let i = 0; i < length; i++) {
    let n;
    // digits 0 - 249 divisible into 25 buckets of 10; reject 250 - 255
    do {
      n = crypto.randomBytes(1)[0];
    } while (n > 249);
    digits.push((n % 10).toString());
  }
  return digits.join('');
};

const hashOTP = async (plain) => {
  const saltRounds = 10;
  return await bcrypt.hash(plain, saltRounds);
};

const verifyOTP = async (plain, hash) => {
  if (!hash) return false;
  return await bcrypt.compare(plain, hash);
};

const expiresAtInMinutes = (minutes) => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date;
};

// Password Reset Session JWT utilities 
const signPasswordResetToken = async(payload, ttl = '15m') => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  const body = { ...payload, purpose: 'pwd_reset' };
  return await jwt.sign(body, process.env.JWT_SECRET, { expiresIn: ttl });
}

const verifyPasswordResetToken = async(token) => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return await jwt.verify(token, process.env.JWT_SECRET);
}



module.exports = {
  // Password utilities
  hashPassword,
  comparePassword,
  
  // JWT utilities
  generateToken,
  verifyToken,
  
  // Response utilities
  sendResponse,
  sendError,
  sendSuccess,
  
  // Validation utilities
  validateEmail,
  validatePassword,
  validateUsername,
  
  // Pagination utilities
  getPaginationParams,
  getPaginationMeta,
  
  // String utilities
  capitalizeFirst,
  generateSlug,
  
  // Date utilities
  formatDate,
  isValidDate,
  
  // Object utilities
  removeEmptyFields,
  sanitizeUser,
  
  // Error handling utilities
  asyncHandler,
  createError,

  // HTTPS utilities
  httpsGetJson,
  httpsPostForm,

  // Crypto utilities
  base64url,
  randomString,
  sha256,
  pkceChallenge,

  // Social Login Provider utilities
  getProviderConfig,
  oauthEnv,
  buildOAuthAuthorizeUrl,

  // OIDC + JWKS utilities
  getDiscovery,
  getJwksByKid,
  jwkToPem,
  verifyProviderIdToken,
  exchangeCodeForTokens,
  fetchLinkedInEmail,

  // OTP utilities
  generateOTP,
  hashOTP,
  verifyOTP,
  expiresAtInMinutes,

  // Password Recovery Session JWT utilities
  signPasswordResetToken,
  verifyPasswordResetToken
};
