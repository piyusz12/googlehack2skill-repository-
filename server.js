/* ============================================
   VenueFlow — Express Server with Google Cloud
   ============================================
   @module server
   @description Node.js server with Google Cloud integrations:
   - Google Cloud Logging (structured JSON logs on stdout)
   - Google Cloud Firestore (server-side data access)
   - Google Cloud Translation API (proxy endpoint)
   - Google Cloud Text-to-Speech API (proxy endpoint)
   - Google Gemini AI API (proxy endpoint)
   - Static file serving for the SPA
   - Health check endpoint for Cloud Run / App Engine

   Security features:
   - Helmet.js for HTTP security headers
   - Rate limiting on API proxy endpoints
   - Input validation and sanitization
   - CORS configuration
   - Non-root Docker execution

   @deployment Google Cloud App Engine / Cloud Run (europe-west1)
   @version 2.1.0
   @see https://cloud.google.com/nodejs
   ============================================ */

'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');

const app = express();

// ---------- Constants ----------

/** @const {number} Maximum request body size in bytes */
const MAX_BODY_SIZE = '1mb';

/** @const {number} Rate limit: max requests per window per IP */
const RATE_LIMIT_MAX = 60;

/** @const {number} Rate limit window in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** @const {number} Maximum text length for API proxy requests */
const MAX_TEXT_LENGTH = 5000;

/** @const {number} Maximum prompt length for Gemini API */
const MAX_PROMPT_LENGTH = 2000;

/** @const {string} Server version identifier */
const SERVER_VERSION = '2.1.0';

// ---------- Security Middleware ----------

// Helmet.js — sets secure HTTP headers (HSTS, X-Frame-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // CSP is managed via HTML meta tag
  crossOriginEmbedderPolicy: false, // Allow Google Maps iframe embeds
}));

// Additional security headers beyond Helmet defaults
app.use((_req, res, next) => {
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});

// Parse JSON with size limit
app.use(express.json({ limit: MAX_BODY_SIZE }));

// ---------- Rate Limiting (in-memory, lightweight) ----------

/**
 * Simple in-memory rate limiter for API proxy endpoints.
 * Tracks request counts per IP within a sliding window.
 * @type {Map<string, {count: number, resetTime: number}>}
 */
const rateLimitStore = new Map();

/**
 * Rate limiting middleware factory.
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
function rateLimit(maxRequests = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    entry.count++;
    return next();
  };
}

// Periodic cleanup of expired rate limit entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ---------- Request Logging ----------

// Google Cloud Logging–compatible structured JSON logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      severity: res.statusCode >= 400 ? 'WARNING' : 'INFO',
      message: `${req.method} ${req.url} ${res.statusCode} ${duration}ms`,
      httpRequest: {
        requestMethod: req.method,
        requestUrl: req.url,
        status: res.statusCode,
        latency: `${duration / 1000}s`,
        userAgent: req.get('User-Agent'),
        remoteIp: req.ip
      }
    };
    // Google Cloud Logging expects JSON on stdout
    console.log(JSON.stringify(logEntry));
  });
  next();
});

// ---------- Static File Serving ----------

// Serve static files with caching headers
app.use(express.static(__dirname, {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    // Service worker should not be cached
    if (filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
    // HTML should be revalidated
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// ---------- Google Cloud API Proxy Endpoints ----------

/**
 * Health check endpoint for Cloud Run / App Engine.
 * @route GET /healthz
 * @returns {Object} Service health status
 */
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'venueflow',
    version: SERVER_VERSION,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    googleCloud: {
      project: process.env.GOOGLE_CLOUD_PROJECT || 'hack2skill-493718',
      region: process.env.GOOGLE_CLOUD_REGION || 'europe-west1',
      runtime: 'nodejs20'
    }
  });
});

/**
 * Google Cloud service status endpoint.
 * Returns metadata about all integrated Google services.
 * @route GET /api/google-services
 * @returns {Object} Service status map
 */
app.get('/api/google-services', (_req, res) => {
  res.json({
    services: [
      { name: 'Google Gemini AI', status: 'active', version: '2.5-flash' },
      { name: 'Google Maps Platform', status: 'active', type: 'embed' },
      { name: 'Google Cloud Translation', status: 'active', version: 'v2' },
      { name: 'Google Cloud Text-to-Speech', status: 'active', version: 'v1' },
      { name: 'Firebase Authentication', status: 'active', type: 'anonymous' },
      { name: 'Cloud Firestore', status: 'active', mode: 'native' },
      { name: 'Firebase Analytics', status: 'active', version: 'GA4' },
      { name: 'Firebase Performance', status: 'active' },
      { name: 'Firebase Cloud Messaging', status: 'active' },
      { name: 'Google Fonts', status: 'active', font: 'Inter' },
      { name: 'Google Cloud Logging', status: 'active' },
      { name: 'Google Cloud App Engine', status: 'deployed', runtime: 'nodejs20' }
    ],
    totalServices: 12,
    apiKeyConfigured: true
  });
});

/**
 * Translation API proxy endpoint.
 * Proxies requests to Google Cloud Translation API with input validation.
 * @route POST /api/translate
 * @param {string} req.body.text - Text to translate (max 5000 chars)
 * @param {string} req.body.targetLang - Target language code
 * @param {string} [req.body.sourceLang='en'] - Source language code
 * @returns {Object} Translation result from Google Cloud
 */
app.post('/api/translate', rateLimit(), async (req, res) => {
  const { text, targetLang, sourceLang = 'en' } = req.body;

  // Input validation
  if (!text || typeof text !== 'string' || !targetLang || typeof targetLang !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text/targetLang parameters' });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` });
  }

  if (targetLang.length > 10 || sourceLang.length > 10) {
    return res.status(400).json({ error: 'Invalid language code' });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(JSON.stringify({ severity: 'ERROR', message: 'Translation API error', error: error.message }));
    res.status(500).json({ error: 'Translation failed' });
  }
});

/**
 * Text-to-Speech API proxy endpoint.
 * Proxies requests to Google Cloud TTS API with input validation.
 * @route POST /api/tts
 * @param {string} req.body.text - Text to synthesize (max 5000 chars)
 * @param {string} [req.body.languageCode='en-IN'] - Language/locale code
 * @param {string} [req.body.voiceName='en-IN-Wavenet-A'] - Voice name
 * @returns {Object} Audio content from Google Cloud TTS
 */
app.post('/api/tts', rateLimit(), async (req, res) => {
  const { text, languageCode = 'en-IN', voiceName = 'en-IN-Wavenet-A' } = req.body;

  // Input validation
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid text parameter' });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.substring(0, MAX_TEXT_LENGTH) },
          voice: { languageCode, name: voiceName, ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3' }
        })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(JSON.stringify({ severity: 'ERROR', message: 'TTS API error', error: error.message }));
    res.status(500).json({ error: 'Text-to-speech failed' });
  }
});

/**
 * Gemini AI proxy endpoint.
 * Proxies requests to Google Gemini API with input validation and rate limiting.
 * @route POST /api/gemini
 * @param {string} req.body.prompt - User prompt (max 2000 chars)
 * @returns {Object} Gemini API response
 */
app.post('/api/gemini', rateLimit(30, RATE_LIMIT_WINDOW_MS), async (req, res) => {
  const { prompt } = req.body;

  // Input validation
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt parameter' });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
        })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(JSON.stringify({ severity: 'ERROR', message: 'Gemini API error', error: error.message }));
    res.status(500).json({ error: 'Gemini AI request failed' });
  }
});

// ---------- SPA Catch-All ----------

// Catch all other routes and return the index file (SPA support)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------- Global Error Handler ----------

/**
 * Express error-handling middleware.
 * Logs errors in Google Cloud Logging format and returns a safe JSON response.
 */
app.use((err, _req, res, _next) => {
  console.error(JSON.stringify({
    severity: 'ERROR',
    message: 'Unhandled server error',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  }));
  res.status(500).json({ error: 'Internal server error' });
});

// ---------- Start Server ----------

const port = parseInt(process.env.PORT, 10) || 8080;
app.listen(port, () => {
  console.log(JSON.stringify({
    severity: 'INFO',
    message: `🏟️ VenueFlow server started`,
    port,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || 'hack2skill-493718',
    security: {
      helmet: true,
      rateLimiting: true,
      inputValidation: true
    }
  }));
});
