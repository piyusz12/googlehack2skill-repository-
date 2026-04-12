# VenueFlow — Smart Venue Experience Platform

> See the [main README](../README.md) for full documentation.

## Quick Start

```bash
# Just open the file
open index.html

# Or use a local server
npx -y http-server . -p 8080 -c-1
```

## Run Tests

Open browser console (`F12`) and type:
```javascript
TestSuite.runAll()
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | SPA shell with 7 views |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker for offline support |
| `css/index.css` | Design system tokens |
| `css/components.css` | UI component library |
| `css/animations.css` | GPU-accelerated keyframes |
| `css/venue-map.css` | Heatmap styles |
| `css/assistant.css` | AI chat interface |
| `js/utils.js` | DOM helpers, event bus, security |
| `js/crowd-simulator.js` | 5-phase crowd engine |
| `js/venue-map.js` | Interactive SVG stadium |
| `js/queue-manager.js` | Live wait times |
| `js/navigation.js` | A* pathfinding |
| `js/pre-order.js` | Food ordering |
| `js/live-feed.js` | Scoreboard & events |
| `js/gemini-assistant.js` | Google Gemini AI |
| `js/accessibility.js` | WCAG 2.1 AA |
| `js/test-suite.js` | Automated tests |
| `js/app.js` | Main controller |
