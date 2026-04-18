# 🏟️ VenueFlow — Smart Venue Experience Platform

### _Solving the chaos of 132,000 fans in one stadium — with real-time AI and Google Cloud._

[![Google Cloud](https://img.shields.io/badge/Google_Cloud-12_Services-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)](https://cloud.google.com)
[![Firebase](https://img.shields.io/badge/Firebase-6_Services-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Google Gemini](https://img.shields.io/badge/Gemini_AI-2.0_Flash-EA4335?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-green?style=for-the-badge)](https://www.w3.org/WAI/WCAG21/quickref/)
[![PWA](https://img.shields.io/badge/PWA-Installable-blueviolet?style=for-the-badge)](https://web.dev/progressive-web-apps/)

---

## 📖 Table of Contents

1. [What is VenueFlow?](#-what-is-venueflow)
2. [The Problem We Solve](#-the-problem-we-solve)
3. [How It Works](#-how-it-works)
4. [Features](#-features)
5. [Google Cloud Services Integration](#-google-cloud-services-integration-12-services)
6. [How to Run](#-how-to-run)
7. [Project Structure](#-project-structure)
8. [Architecture](#-architecture)
9. [Accessibility](#-accessibility-wcag-21-aa)
10. [Security](#-security)
11. [Testing](#-testing)
12. [Tech Stack](#-tech-stack)

---

## 🤔 What is VenueFlow?

**VenueFlow** is a web app that makes attending a sports match at a large stadium stress-free, powered entirely by **Google Cloud Platform** and **Firebase**.

Imagine you're at the ICC T20 World Cup 2026 (India vs Pakistan) with 132,000 other fans. You want to:
- Grab a burger, but every food stand has a 20-minute line.
- Find the bathroom, but you don't know which direction to go.
- Get back to your seat, but the corridors are packed.

**VenueFlow solves all of this** using Google Cloud AI, real-time data, and smart crowd analytics.

---

## 🔥 The Problem We Solve

| Pain Point | What Happens Today | With VenueFlow |
|---|---|---|
| 🚶 **Crowd Congestion** | Fans pile up at gates, corridors become dangerous bottlenecks | Live heatmap shows exactly where crowds are — fans avoid congested areas |
| ⏱️ **Long Food Lines** | Average wait: 15-20 min. Fans miss the game | Smart queue shows shortest wait. Pre-order to skip the line entirely |
| 🗺️ **Getting Lost** | Massive venues with no indoor GPS | A* pathfinding gives turn-by-turn directions, avoiding crowded routes |
| 📢 **No Information** | Fans make blind decisions — "Is this line shorter?" | Real-time crowd data, match events, and venue alerts in your pocket |
| 🌐 **Language Barriers** | Stadium announcements only in one language | Google Cloud Translation API provides instant Hindi/Urdu/Gujarati translation |
| ♿ **Accessibility** | Poor support for visually impaired attendees | Google Cloud Text-to-Speech reads venue info aloud |

---

## ⚙️ How It Works

VenueFlow runs a hybrid architecture — **client-side simulation** + **Google Cloud backend**.

```
┌─────────────────────────────────────────────────────────┐
│                    Your Browser                          │
│                                                          │
│  ┌──────────────────┐    Drives    ┌──────────────────┐ │
│  │   Crowd            │───────────►│  7 Interactive   │ │
│  │   Simulation       │  real-time │  Views            │ │
│  │   Engine           │   data    │  (Dashboard, Map, │ │
│  │   (50 zones)       │           │   Queues, Order,  │ │
│  │   (3s updates)     │           │   Feed, Navigate, │ │
│  │                    │           │   AI Assistant)    │ │
│  └─────────┬──────────┘           └──────────────────┘ │
│            │                                            │
│            │  Event Bus (pub/sub)                       │
│            ▼                                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Google Cloud Services (12 integrations)          │  │
│  │                                                    │  │
│  │  CLIENT-SIDE:                                     │  │
│  │  ├── Firebase Authentication (anonymous sign-in)  │  │
│  │  ├── Cloud Firestore (real-time data persistence) │  │
│  │  ├── Firebase Analytics (GA4 event tracking)      │  │
│  │  ├── Firebase Performance Monitoring              │  │
│  │  ├── Firebase Cloud Messaging (push notifications)│  │
│  │  ├── Google Gemini AI (venue assistant chatbot)   │  │
│  │  ├── Google Cloud Translation API (multilingual)  │  │
│  │  ├── Google Cloud Text-to-Speech API (accessibility│  │
│  │  ├── Google Maps Embed API (venue location)       │  │
│  │  └── Google Fonts (Inter typography)              │  │
│  │                                                    │  │
│  │  SERVER-SIDE:                                     │  │
│  │  ├── Google Cloud App Engine (hosting)            │  │
│  │  └── Google Cloud Logging (structured logs)       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 1. 🗺️ Live Crowd Heatmap
Interactive SVG stadium map with real-time color-coded density (Green → Yellow → Orange → Red).

### 2. ⏱️ Smart Queue Management
See wait times for all 24 facilities with AI recommendations.

### 3. 🍔 Concession Pre-Ordering
Order food from your seat with cart, GST calculation, and smart pickup location. Orders saved to **Cloud Firestore**.

### 4. 🧭 Crowd-Optimized Navigation
**A\* pathfinding algorithm** with real-time crowd density as edge weights. Route searches logged to **Firebase Analytics**.

### 5. 📡 Live Event Feed & Scoreboard
Animated T20 cricket scoreboard with India vs Pakistan simulation.

### 6. 🤖 AI Venue Assistant (Google Gemini 2.5 Flash)
Conversational chatbot powered by **Google Gemini API** with:
- Real-time venue context injection (crowd data, queue times, phase)
- **Google Cloud Text-to-Speech** for reading responses aloud
- **Google Cloud Translation** for Hindi/Urdu translation
- Graceful local fallback when API is unavailable

### 7. 🏠 Dashboard
One-glance overview with stats, hot zones, event timeline, and **Google Maps** embed.

---

## 🌐 Google Cloud Services Integration (12 Services)

VenueFlow deeply integrates **12 Google Cloud and Firebase services**:

### Firebase Services (6)

| # | Service | What We Use It For | File |
|---|---------|-------------------|------|
| 1 | **Firebase Authentication** | Anonymous sign-in for user sessions. Enables per-user data in Firestore without requiring login. | `firebase-config.js` |
| 2 | **Cloud Firestore** | Real-time NoSQL database. Stores crowd snapshots (every 30s), food orders, user preferences. Supports offline persistence for PWA. | `firebase-config.js` |
| 3 | **Firebase Analytics (GA4)** | Custom event tracking: `page_view`, `food_order`, `route_search`, `ai_assistant_query`, `translation_used`, `tts_used`. User properties set for venue/event context. | `firebase-config.js` |
| 4 | **Firebase Performance Monitoring** | Custom traces for: Gemini AI response time, crowd simulation tick latency, view rendering speed. | `firebase-config.js` |
| 5 | **Firebase Cloud Messaging** | Push notification registration for: crowd congestion alerts, order ready notifications, match events. Service Worker handles `push` events. | `firebase-config.js`, `sw.js` |
| 6 | **Firebase Hosting / App Engine** | Deployed via `app.yaml` on Google Cloud App Engine (Node.js 20 runtime). Alternative: Cloud Run via `Dockerfile`. | `app.yaml`, `Dockerfile` |

### Google Cloud APIs (4)

| # | Service | What We Use It For | File |
|---|---------|-------------------|------|
| 7 | **Google Gemini AI (2.0 Flash)** | Generative AI for venue assistant chatbot. Receives real-time crowd context (density, queues, phase). Returns contextual guidance using `generateContent` REST API. | `google-cloud-services.js`, `gemini-assistant.js` |
| 8 | **Google Cloud Translation API** | Translates AI assistant responses and venue alerts to Hindi (हिन्दी), Urdu (اردو), and Gujarati (ગુજરાતી). Uses `translate/v2` REST API with batch support. | `google-cloud-services.js` |
| 9 | **Google Cloud Text-to-Speech API** | Converts AI responses to speech using WaveNet voices (en-IN). Enhances accessibility for visually impaired attendees. Falls back to browser `speechSynthesis`. | `google-cloud-services.js` |
| 10 | **Google Maps Platform** | Embedded map showing Narendra Modi Stadium, parking lots, transit info. Static Maps API for venue imagery. | `index.html`, `google-cloud-services.js` |

### Google Web Services (2)

| # | Service | What We Use It For | File |
|---|---------|-------------------|------|
| 11 | **Google Fonts** | Inter font family (300-900 weights) with `preconnect` for performance. | `index.html`, `index.css` |
| 12 | **Google Cloud Logging** | Server-side structured JSON logging in Cloud Logging format. Every HTTP request logged with method, URL, status, latency, and user agent. | `server.js` |

### Google Cloud Deployment Configuration

| File | Purpose |
|------|---------|
| `app.yaml` | App Engine config: `nodejs20` runtime, auto-scaling (0-10 instances), environment variables for API keys |
| `Dockerfile` | Cloud Run container: multi-stage build, health checks, port 8080 |
| `cloudbuild.yaml` | Cloud Build CI/CD: build → push to GCR → deploy to Cloud Run (europe-west1) |
| `.gcloudignore` | Excludes `.git`, `node_modules`, tests from deployment |

---

## 🚀 How to Run

### Prerequisites
- Node.js 18+ (for the Express server)
- A modern web browser

### Quick Start
```bash
# Clone the repository
git clone https://github.com/piyusz12/googlehack2skill-repository-.git
cd googlehack2skill-repository-

# Install dependencies
npm install

# Start the server
npm start

# Open in browser
# http://localhost:8080
```

### Deploy to Google Cloud
```bash
# Deploy to App Engine
gcloud app deploy app.yaml

# OR deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml
```

### What you'll see:
1. **Splash screen** (2 seconds) → App loads with Firebase initialization
2. **Dashboard** with live stats updating every 3 seconds
3. **Console logs** showing Firebase Auth, Firestore, Analytics, and Performance init
4. Use the **bottom navigation bar** to switch between 7 views
5. **AI Assistant** uses Google Gemini API for responses

---

## 📁 Project Structure

```
googlehack2skill-repository-/
├── index.html                  ← SPA shell with Firebase SDK + 7 views
├── server.js                   ← Express server with Google Cloud API proxies
├── package.json                ← Dependencies and Google Cloud metadata
├── app.yaml                    ← Google Cloud App Engine config (nodejs20)
├── Dockerfile                  ← Google Cloud Run container config
├── cloudbuild.yaml             ← Google Cloud Build CI/CD pipeline
├── manifest.json               ← PWA manifest (installable web app)
├── sw.js                       ← Service Worker with FCM push handlers
├── .gcloudignore               ← Google Cloud deployment exclusions
├── README.md                   ← This file
│
├── css/
│   ├── index.css               ← Design system: colors, typography, layout
│   ├── components.css          ← UI library: cards, buttons, badges, nav
│   ├── animations.css          ← 60fps GPU-only keyframe animations
│   ├── venue-map.css           ← SVG heatmap & tooltip styles
│   └── assistant.css           ← AI chat + Google Services panel styles
│
└── js/
    ├── utils.js                ← DOM helpers, event bus, formatters, XSS protection
    ├── firebase-config.js      ← 🔥 Firebase SDK init (Auth, Firestore, Analytics, Performance, FCM)
    ├── google-cloud-services.js← ☁️ Google Cloud APIs (Gemini, Translation, TTS, Maps)
    ├── crowd-simulator.js      ← 5-phase crowd engine (~50 zones, 3s updates)
    ├── venue-map.js            ← Interactive SVG stadium with heatmap overlay
    ├── queue-manager.js        ← Live wait times & smart recommendations
    ├── navigation.js           ← A* pathfinding with crowd-aware edge costs
    ├── pre-order.js            ← Food menu, cart, checkout & order tracking
    ├── live-feed.js            ← Scoreboard, match events & venue alerts
    ├── gemini-assistant.js     ← 🤖 Google Gemini AI chatbot with live data + TTS + Translation
    ├── accessibility.js        ← WCAG 2.1 AA: keyboard nav, contrast, focus
    ├── test-suite.js           ← 🧪 60+ automated tests including Google Services
    └── app.js                  ← Main controller: routing, Firebase init, error handling
```

**Total: 21 files • ~7,000 lines of code • 12 Google Cloud services**

---

## 🏗️ Architecture

```
                        ┌─────────────┐
                        │  index.html │
                        │  (SPA Shell)│
                        └──────┬──────┘
                               │
                  ┌────────────▼────────────┐
                  │        app.js           │
                  │     (Controller)        │
                  │ Orchestrates all init   │
                  └────────────┬────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
│  Firebase       │  │  Google Cloud   │  │  Accessibility  │
│  Services       │  │  APIs           │  │  Manager        │
│                 │  │                 │  │                 │
│ • Auth          │  │ • Gemini AI     │  │ • keyboard nav  │
│ • Firestore     │  │ • Translation   │  │ • screen reader │
│ • Analytics     │  │ • TTS           │  │ • high contrast │
│ • Performance   │  │ • Maps          │  │ • font scaling  │
│ • Messaging     │  │ • Logging       │  │ • reduced motion│
└────────┬────────┘  └────────┬────────┘  └─────────────────┘
         │                    │
         └────────┬───────────┘
                  │
         ┌────────▼────────┐
         │  Simulation     │
         │  Engine (50z)   │
         └────────┬────────┘
                  │ Event Bus (pub/sub)
    ┌─────────────┼──────────┬──────────┬──────────┐
    │             │          │          │          │
┌───▼──┐   ┌──▼───┐   ┌──▼──┐   ┌──▼───┐   ┌──▼───┐
│ Map  │   │Queue │   │ Nav │   │Order │   │ Feed │
│(SVG) │   │Mgr   │   │(A*) │   │(Cart)│   │(Live)│
└──────┘   └──────┘   └─────┘   └──────┘   └──────┘
```

---

## ♿ Accessibility (WCAG 2.1 AA)

| Feature | How | Google Service Used |
|---------|-----|-------------------|
| **Text-to-Speech** | AI responses read aloud via WaveNet voices | Google Cloud TTS API |
| **Multilingual** | Instant translation to Hindi, Urdu, Gujarati | Google Cloud Translation API |
| **Skip Navigation** | "Skip to main content" link on Tab focus | — |
| **Screen Reader** | ARIA live regions for stat changes/view transitions | — |
| **Keyboard Nav** | Full Tab support + number keys `1`-`7` | — |
| **Focus Indicators** | Blue glow ring on keyboard-focused elements | — |
| **High Contrast** | Toggle button in header | — |
| **Font Scaling** | A+/A- buttons (0.8x to 1.5x) | — |
| **Reduced Motion** | Respects `prefers-reduced-motion` | — |
| **Noscript Fallback** | Message shown if JS is disabled | — |

---

## 🔒 Security

| Protection | Implementation |
|-----------|---------------|
| **Content Security Policy** | Updated CSP allows Firebase and Google Cloud API domains only |
| **XSS Prevention** | `Utils.escapeHTML()` sanitizes all user input |
| **Input Validation** | Chat input limited to 500 characters |
| **No Inline Handlers** | Zero `onclick`/`onload` — all events via `addEventListener` |
| **Secure Embeds** | Google Maps iframe uses `referrerpolicy` |
| **Privacy-First Analytics** | Firebase Analytics with `anonymize_ip: true` |
| **Security Headers** | Server adds `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection` |
| **Anonymous Auth** | Firebase Auth — no PII collected |

---

## 🧪 Testing

### Run the Built-in Test Suite

Open the app in your browser, then open **DevTools Console** (`F12` → Console):

```javascript
TestSuite.runAll()
```

This runs **60+ automated tests** across **7 categories**:

| Category | What It Checks |
|----------|---------------|
| 🎨 **Rendering** | All 7 views, stat cards, navigation, header |
| 📊 **Simulation** | 50+ zones, density ranges, phase system, stats |
| ♿ **Accessibility** | Skip link, ARIA, landmarks, labels, noscript |
| 🔒 **Security** | CSP, Google domains in CSP, XSS, maxlength |
| 🔧 **Utilities** | formatNumber, formatCurrency, clamp, lerp |
| ⚡ **Performance** | DOM count, script count, page load state |
| ☁️ **Google Services** | Firebase SDK, Firestore, Auth, Analytics, Performance, Gemini, Translation, TTS, Maps, Fonts |

Expected output:
```
🏟️ VenueFlow Test Suite
==================================================
🎨 Testing Rendering...
📊 Testing Simulation...
♿ Testing Accessibility...
🔒 Testing Security...
🔧 Testing Utilities...
⚡ Testing Performance...
☁️ Testing Google Cloud Services...
==================================================
✅ 62 passed   ❌ 0 failed   📊 Total: 62
```

---

## 🛠️ Tech Stack

| What | Technology | Google Service? |
|------|-----------|:-:|
| **AI** | Google Gemini 2.5 Flash | ✅ |
| **Database** | Cloud Firestore | ✅ |
| **Auth** | Firebase Authentication | ✅ |
| **Analytics** | Firebase Analytics (GA4) | ✅ |
| **Performance** | Firebase Performance Monitoring | ✅ |
| **Push** | Firebase Cloud Messaging | ✅ |
| **Translation** | Google Cloud Translation API | ✅ |
| **TTS** | Google Cloud Text-to-Speech API | ✅ |
| **Maps** | Google Maps Embed API | ✅ |
| **Fonts** | Google Fonts (Inter) | ✅ |
| **Logging** | Google Cloud Logging | ✅ |
| **Hosting** | Google Cloud App Engine / Cloud Run | ✅ |
| **Structure** | HTML5 | — |
| **Styling** | Vanilla CSS3 (Glassmorphism dark theme) | — |
| **Logic** | Vanilla ES6+ JavaScript | — |
| **Map** | SVG Vector Graphics | — |
| **Pathfinding** | A* Algorithm | — |
| **PWA** | Service Worker + Manifest | — |

---

<div align="center">

**Built with ❤️ for Google Hack2Skill**

_Powered by 12 Google Cloud Services:_
_Gemini AI · Firebase Auth · Cloud Firestore · Firebase Analytics · Performance Monitoring · Cloud Messaging · Cloud Translation · Cloud TTS · Google Maps · Google Fonts · Cloud Logging · App Engine_

**21 files • 7,000+ lines • Zero framework dependencies**

</div>
