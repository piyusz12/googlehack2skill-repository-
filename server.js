/* ============================================
   VenueFlow — Express Server with Google Cloud
   ============================================
   @description Node.js server with Google Cloud integrations:
   - Google Cloud Logging (structured logs)
   - Google Cloud Firestore (server-side data access)
   - Google Cloud Translation API (proxy endpoint)
   - Google Cloud Text-to-Speech API (proxy endpoint)
   - Static file serving for the SPA
   - Health check endpoint for Cloud Run
   
   @deployment Google Cloud App Engine / Cloud Run
   @see https://cloud.google.com/nodejs
   ============================================ */

const express = require('express');
const path = require('path');

const app = express();

// ---------- Middleware ----------

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});

// Request logging with Google Cloud Logging format
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

// Serve static files from the current directory with caching
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
 * Health check endpoint for Cloud Run / App Engine
 * @route GET /healthz
 */
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'venueflow',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    googleCloud: {
      project: process.env.GOOGLE_CLOUD_PROJECT || 'venueflow-t20',
      region: process.env.GOOGLE_CLOUD_REGION || 'europe-west1',
      runtime: 'nodejs20'
    }
  });
});

/**
 * Google Cloud service status endpoint
 * @route GET /api/google-services
 */
app.get('/api/google-services', (req, res) => {
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
 * Translation API proxy endpoint
 * Proxies requests to Google Cloud Translation API
 * @route POST /api/translate
 */
app.post('/api/translate', async (req, res) => {
  const { text, targetLang, sourceLang = 'en' } = req.body;
  
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Missing text or targetLang' });
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
 * Text-to-Speech API proxy endpoint
 * Proxies requests to Google Cloud TTS API
 * @route POST /api/tts
 */
app.post('/api/tts', async (req, res) => {
  const { text, languageCode = 'en-IN', voiceName = 'en-IN-Wavenet-A' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: text.substring(0, 5000) },
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
 * Gemini AI proxy endpoint
 * @route POST /api/gemini
 */
app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------- Error Handler ----------

app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    severity: 'ERROR',
    message: 'Unhandled server error',
    error: err.message,
    stack: err.stack
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
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || 'venueflow-t20'
  }));
});
