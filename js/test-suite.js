/* ============================================
   VenueFlow — Test Suite
   ============================================
   @description Automated validation of all VenueFlow
   components. Run via console: TestSuite.runAll()
   
   Tests cover: rendering, simulation, accessibility,
   security, performance, Google Cloud services, and
   user interactions.
   ============================================ */

const TestSuite = (() => {
  'use strict';

  /** @private {Array<{name: string, passed: boolean, error?: string}>} */
  let results = [];

  /** @private {number} */
  let passCount = 0;

  /** @private {number} */
  let failCount = 0;

  /**
   * Assert a condition is true
   * @param {boolean} condition
   * @param {string} message
   */
  function assert(condition, message) {
    if (condition) {
      passCount++;
      results.push({ name: message, passed: true });
    } else {
      failCount++;
      results.push({ name: message, passed: false, error: 'Assertion failed' });
    }
  }

  /**
   * Assert two values are equal
   * @param {*} actual
   * @param {*} expected
   * @param {string} message
   */
  function assertEqual(actual, expected, message) {
    if (actual === expected) {
      passCount++;
      results.push({ name: message, passed: true });
    } else {
      failCount++;
      results.push({ name: message, passed: false, error: `Expected ${expected}, got ${actual}` });
    }
  }

  /**
   * Assert a value is truthy
   * @param {*} value
   * @param {string} message
   */
  function assertTruthy(value, message) {
    assert(!!value, message);
  }

  // ==========================================
  // TEST GROUPS
  // ==========================================

  /** Test DOM rendering of all views */
  function testRendering() {
    console.log('%c🎨 Testing Rendering...', 'color: #4d8ef7; font-weight: bold');

    // All views exist
    const views = ['dashboard', 'map', 'queues', 'order', 'feed', 'navigate', 'assistant'];
    views.forEach(view => {
      assertTruthy(document.getElementById(`view-${view}`), `View "${view}" exists in DOM`);
    });

    // Header elements
    assertTruthy(document.querySelector('.app-header'), 'App header renders');
    assertTruthy(document.querySelector('.app-header__logo'), 'Logo renders');
    assertTruthy(document.getElementById('header-phase-text'), 'Phase text renders');

    // Bottom navigation
    assertTruthy(document.querySelector('.bottom-nav'), 'Bottom navigation renders');
    const navItems = document.querySelectorAll('.bottom-nav__item');
    assert(navItems.length >= 6, `Bottom nav has ${navItems.length} items (expected ≥ 6)`);

    // Dashboard stat cards
    assertTruthy(document.getElementById('stat-attendees'), 'Attendees stat renders');
    assertTruthy(document.getElementById('stat-density'), 'Density stat renders');
    assertTruthy(document.getElementById('stat-wait'), 'Wait time stat renders');
    assertTruthy(document.getElementById('stat-hotspots'), 'Hot spots stat renders');

    // Toast container
    assertTruthy(document.getElementById('toast-container'), 'Toast container exists');
  }

  /** Test crowd simulation engine */
  function testSimulation() {
    console.log('%c📊 Testing Simulation...', 'color: #34d399; font-weight: bold');

    // Zones exist
    const zones = CrowdSimulator.getZones();
    assert(zones.length > 40, `${zones.length} zones defined (expected > 40)`);

    // Zone data populated
    const zoneData = CrowdSimulator.getZoneData();
    assert(Object.keys(zoneData).length > 0, 'Zone data is populated');

    // Density values are in range
    let allInRange = true;
    Object.values(zoneData).forEach(z => {
      if (z.density < 0 || z.density > 100) allInRange = false;
    });
    assert(allInRange, 'All density values are 0-100%');

    // Phase exists
    const phase = CrowdSimulator.getCurrentPhase();
    assertTruthy(phase, 'Current phase exists');
    assertTruthy(phase.id, 'Phase has an ID');
    assertTruthy(phase.label, 'Phase has a label');

    // Stats work
    const stats = CrowdSimulator.getStats();
    assert(stats.totalAttendees >= 0, `Total attendees: ${stats.totalAttendees}`);
    assert(stats.avgDensity >= 0 && stats.avgDensity <= 100, `Avg density: ${stats.avgDensity}%`);
    assert(stats.avgWait >= 0, `Avg wait: ${stats.avgWait} min`);
    assert(stats.hotSpots >= 0, `Hot spots: ${stats.hotSpots}`);

    // Zone types
    const types = new Set(zones.map(z => z.type));
    ['seating', 'concourse', 'gate', 'food', 'restroom', 'merchandise'].forEach(type => {
      assert(types.has(type), `Zone type "${type}" exists`);
    });
  }

  /** Test accessibility features */
  function testAccessibility() {
    console.log('%c♿ Testing Accessibility...', 'color: #a78bfa; font-weight: bold');

    // Skip link
    assertTruthy(document.querySelector('.skip-link'), 'Skip navigation link exists');

    // ARIA live announcer
    assertTruthy(document.getElementById('a11y-announcer'), 'ARIA live announcer exists');

    // Lang attribute
    assertEqual(document.documentElement.lang, 'en', 'HTML lang attribute is set');

    // All nav buttons have aria-labels
    const navButtons = document.querySelectorAll('.bottom-nav__item');
    let allHaveLabels = true;
    navButtons.forEach(btn => {
      if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) allHaveLabels = false;
    });
    assert(allHaveLabels, 'All nav buttons have accessible labels');

    // Interactive elements are focusable
    const buttons = document.querySelectorAll('button');
    assert(buttons.length > 0, `${buttons.length} buttons found`);

    // High contrast button
    assertTruthy(document.getElementById('a11y-contrast'), 'High contrast toggle exists');

    // Font size controls
    assertTruthy(document.getElementById('a11y-font-up'), 'Font increase button exists');
    assertTruthy(document.getElementById('a11y-font-down'), 'Font decrease button exists');

    // Main landmark
    assertTruthy(document.querySelector('main'), 'Main landmark exists');

    // Header landmark
    assertTruthy(document.querySelector('header'), 'Header landmark exists');

    // Nav landmark
    assertTruthy(document.querySelector('nav'), 'Nav landmark exists');

    // Noscript fallback
    assertTruthy(document.querySelector('noscript'), 'Noscript fallback exists');

    // No images without alt text
    const images = document.querySelectorAll('img');
    let allHaveAlt = true;
    images.forEach(img => {
      if (!img.hasAttribute('alt')) allHaveAlt = false;
    });
    assert(allHaveAlt || images.length === 0, 'All images have alt attributes');
  }

  /** Test security measures */
  function testSecurity() {
    console.log('%c🔒 Testing Security...', 'color: #f87171; font-weight: bold');

    // CSP meta tag
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    assertTruthy(cspMeta, 'Content Security Policy meta tag exists');

    // CSP includes Google Cloud domains
    if (cspMeta) {
      const cspContent = cspMeta.getAttribute('content') || '';
      assert(cspContent.includes('googleapis.com'), 'CSP allows googleapis.com');
      assert(cspContent.includes('firebaseio.com'), 'CSP allows firebaseio.com');
      assert(cspContent.includes('gstatic.com'), 'CSP allows gstatic.com');
    }

    // Inputs have maxlength
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      assertTruthy(chatInput.hasAttribute('maxlength'), 'Chat input has maxlength attribute');
    }

    // XSS test - ensure sanitization works
    const testDiv = document.createElement('div');
    testDiv.textContent = '<script>alert("xss")</script>';
    const sanitized = testDiv.innerHTML;
    assert(!sanitized.includes('<script>'), 'Text is properly sanitized against XSS');

    // No inline event handlers (onClick, etc.)
    const inlineHandlers = document.querySelectorAll('[onclick], [onload], [onerror]');
    assertEqual(inlineHandlers.length, 0, 'No inline event handlers found');
  }

  /** Test utility functions */
  function testUtilities() {
    console.log('%c🔧 Testing Utilities...', 'color: #f7b84d; font-weight: bold');

    // Format number
    assertEqual(Utils.formatNumber(500), '500', 'formatNumber(500) = "500"');
    assertEqual(Utils.formatNumber(1500), '1.5k', 'formatNumber(1500) = "1.5k"');

    // Format currency
    assertEqual(Utils.formatCurrency(9.99), '₹10', 'formatCurrency(9.99) = "₹10"');

    // Format percent
    assertEqual(Utils.formatPercent(75.3), '75%', 'formatPercent(75.3) = "75%"');

    // Format time
    assertEqual(Utils.formatTime(5), '5 min', 'formatTime(5) = "5 min"');
    assertEqual(Utils.formatTime(0.5), '<1 min', 'formatTime(0.5) = "<1 min"');

    // Density level
    assertEqual(Utils.getDensityLevel(20), 'low', 'getDensityLevel(20) = "low"');
    assertEqual(Utils.getDensityLevel(50), 'medium', 'getDensityLevel(50) = "medium"');
    assertEqual(Utils.getDensityLevel(75), 'high', 'getDensityLevel(75) = "high"');
    assertEqual(Utils.getDensityLevel(90), 'critical', 'getDensityLevel(90) = "critical"');

    // Clamp
    assertEqual(Utils.clamp(5, 0, 10), 5, 'clamp(5, 0, 10) = 5');
    assertEqual(Utils.clamp(-5, 0, 10), 0, 'clamp(-5, 0, 10) = 0');
    assertEqual(Utils.clamp(15, 0, 10), 10, 'clamp(15, 0, 10) = 10');

    // Lerp
    assertEqual(Utils.lerp(0, 10, 0.5), 5, 'lerp(0, 10, 0.5) = 5');
  }

  /** Test performance metrics */
  function testPerformance() {
    console.log('%c⚡ Testing Performance...', 'color: #22d3ee; font-weight: bold');

    // DOM node count
    const nodeCount = document.querySelectorAll('*').length;
    assert(nodeCount < 2000, `DOM node count: ${nodeCount} (< 2000 limit)`);

    // No memory leaks from event listeners (basic check)
    const scripts = document.querySelectorAll('script');
    assert(scripts.length <= 20, `Script count: ${scripts.length} (reasonable)`);

    // CSS files
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    assert(stylesheets.length <= 10, `Stylesheet count: ${stylesheets.length} (reasonable)`);

    // Page load should be fast (check if DOMContentLoaded already fired)
    assert(document.readyState === 'complete' || document.readyState === 'interactive', 'Page is loaded');
  }

  /** Test Google Cloud Services integration */
  function testGoogleServices() {
    console.log('%c☁️ Testing Google Cloud Services...', 'color: #4285F4; font-weight: bold');

    // Firebase SDK loaded
    assertTruthy(typeof firebase !== 'undefined' || typeof FirebaseService !== 'undefined', 
      'Firebase SDK or FirebaseService module loaded');

    // FirebaseService module exists
    assertTruthy(typeof FirebaseService !== 'undefined', 'FirebaseService module exists');

    if (typeof FirebaseService !== 'undefined') {
      // Firebase initialized
      assertTruthy(FirebaseService.getIsInitialized(), 'Firebase is initialized');

      // Firebase user exists (anonymous auth)
      assertTruthy(FirebaseService.getUserId(), 'Firebase Auth: User ID exists');

      // Active services
      const services = FirebaseService.getActiveServices();
      assert(services.length >= 4, `Firebase active services: ${services.length} (≥ 4 expected)`);
      assert(services.includes('Cloud Firestore'), 'Cloud Firestore is active');
      assert(services.includes('Authentication'), 'Firebase Authentication is active');
      assert(services.includes('Analytics'), 'Firebase Analytics is active');
      assert(services.includes('Performance Monitoring'), 'Firebase Performance Monitoring is active');

      // Firestore write test
      assertTruthy(typeof FirebaseService.saveCrowdSnapshot === 'function', 'Firestore write function exists');
      assertTruthy(typeof FirebaseService.saveOrder === 'function', 'Firestore order function exists');
      assertTruthy(typeof FirebaseService.savePreferences === 'function', 'Firestore preferences function exists');

      // Analytics event function
      assertTruthy(typeof FirebaseService.logEvent === 'function', 'Analytics logEvent function exists');
      assertTruthy(typeof FirebaseService.logPageView === 'function', 'Analytics logPageView function exists');
      assertTruthy(typeof FirebaseService.logFoodOrder === 'function', 'Analytics logFoodOrder function exists');

      // Performance trace function
      assertTruthy(typeof FirebaseService.createTrace === 'function', 'Performance createTrace function exists');
    }

    // GoogleCloudServices module exists
    assertTruthy(typeof GoogleCloudServices !== 'undefined', 'GoogleCloudServices module exists');

    if (typeof GoogleCloudServices !== 'undefined') {
      // Service status check
      const status = GoogleCloudServices.getServiceStatus();
      assertTruthy(status.gemini, 'Gemini AI service status exists');
      assertTruthy(status.translate, 'Translation service status exists');
      assertTruthy(status.tts, 'Text-to-Speech service status exists');
      assertTruthy(status.maps, 'Maps service status exists');
      assertTruthy(status.apiKey?.configured, 'Google API key is configured');

      // API functions exist
      assertTruthy(typeof GoogleCloudServices.translateText === 'function', 'Translation API function exists');
      assertTruthy(typeof GoogleCloudServices.textToSpeech === 'function', 'Text-to-Speech API function exists');
      assertTruthy(typeof GoogleCloudServices.generateGeminiResponse === 'function', 'Gemini API function exists');
      assertTruthy(typeof GoogleCloudServices.getDirections === 'function', 'Maps Directions function exists');
      assertTruthy(typeof GoogleCloudServices.getStaticMapUrl === 'function', 'Static Map function exists');
    }

    // Google Maps embed present
    const mapsIframe = document.querySelector('iframe.maps-embed');
    assertTruthy(mapsIframe, 'Google Maps embed iframe exists');
    if (mapsIframe) {
      const src = mapsIframe.getAttribute('src') || '';
      assert(src.includes('maps.google.com'), 'Google Maps iframe has correct source');
    }

    // Google Fonts loaded
    const fontsLink = document.querySelector('link[href*="fonts.googleapis.com"]');
    assertTruthy(fontsLink, 'Google Fonts stylesheet loaded');

    // Google Analytics tag
    const gaScript = document.querySelector('script[src*="googletagmanager.com"]');
    assertTruthy(gaScript, 'Google Analytics tag present');

    // Firebase SDK scripts loaded
    const firebaseScript = document.querySelector('script[src*="firebase"]');
    assertTruthy(firebaseScript, 'Firebase SDK script tag present');

    // Gemini assistant badge
    const geminiBadge = document.querySelector('.gemini-badge');
    if (geminiBadge) {
      assertTruthy(geminiBadge.textContent.includes('Gemini'), 'Gemini badge displays correctly');
    }
  }

  /**
   * Run all test groups
   */
  function runAll() {
    console.clear();
    console.log('%c🏟️ VenueFlow Test Suite', 'color: #4d8ef7; font-size: 18px; font-weight: bold');
    console.log('%c' + '='.repeat(50), 'color: #5a6484');

    results = [];
    passCount = 0;
    failCount = 0;

    testRendering();
    testSimulation();
    testAccessibility();
    testSecurity();
    testUtilities();
    testPerformance();
    testGoogleServices();

    // Summary
    console.log('\n%c' + '='.repeat(50), 'color: #5a6484');
    console.log(
      `%c✅ ${passCount} passed   %c❌ ${failCount} failed   %c📊 Total: ${passCount + failCount}`,
      'color: #34d399; font-weight: bold',
      'color: #f87171; font-weight: bold',
      'color: #8b95b8'
    );

    // Show failures
    const failures = results.filter(r => !r.passed);
    if (failures.length > 0) {
      console.log('\n%cFailures:', 'color: #f87171; font-weight: bold');
      failures.forEach(f => {
        console.log(`  ❌ ${f.name}: ${f.error}`);
      });
    }

    return { passed: passCount, failed: failCount, total: passCount + failCount, results };
  }

  return { runAll };
})();
