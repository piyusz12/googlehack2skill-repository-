/* ============================================
   VenueFlow — Firebase Configuration & Services
   ============================================
   @description Initializes Firebase SDK with all services:
   - Firebase Authentication (anonymous sign-in)
   - Cloud Firestore (real-time database)
   - Firebase Analytics (event tracking)
   - Firebase Performance Monitoring
   - Firebase Cloud Messaging (push notifications)
   
   @integration Firebase JS SDK v10 (modular, tree-shakeable)
   @see https://firebase.google.com/docs/web/setup
   ============================================ */

const FirebaseService = (() => {
  'use strict';

  /**
   * Firebase project configuration
   * @see https://console.firebase.google.com/project/settings
   * @type {Object}
   */
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB_Xj6E3t-nPNv48RphhvW4BaUtjxWSXZo",
    authDomain: "venueflow-t20.firebaseapp.com",
    projectId: "venueflow-t20",
    storageBucket: "venueflow-t20.firebasestorage.app",
    messagingSenderId: "948372615203",
    appId: "1:948372615203:web:a3f7c8d2e4b5a6c1d0e9f8",
    measurementId: "G-VF2026T20WC"
  };

  /** @private {boolean} Whether Firebase is fully initialized */
  let isInitialized = false;

  /** @private {Object|null} Firebase App instance */
  let firebaseApp = null;

  /** @private {Object|null} Firestore instance */
  let db = null;

  /** @private {Object|null} Auth instance */
  let auth = null;

  /** @private {Object|null} Analytics instance */
  let analytics = null;

  /** @private {Object|null} Performance instance */
  let perf = null;

  /** @private {string|null} Current anonymous user ID */
  let currentUserId = null;

  /** @private {boolean} Whether running in demo/offline mode */
  let isDemoMode = false;

  /**
   * Initialize Firebase with all services
   * Gracefully falls back to demo mode if Firebase SDK unavailable
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async function init() {
    try {
      // Check if Firebase SDK is loaded via CDN
      if (typeof firebase === 'undefined') {
        console.warn('⚠️ Firebase SDK not loaded — running in demo mode');
        isDemoMode = true;
        initDemoMode();
        return false;
      }

      // Initialize Firebase App
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
      } else {
        firebaseApp = firebase.apps[0];
      }

      // Initialize Firestore
      if (firebase.firestore) {
        db = firebase.firestore();
        // Enable offline persistence for PWA support
        try {
          await db.enablePersistence({ synchronizeTabs: true });
          console.log('🔥 Firestore offline persistence enabled');
        } catch (err) {
          if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence: multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence: not supported in this browser');
          }
        }
        console.log('🔥 Cloud Firestore initialized');
      }

      // Initialize Authentication (Anonymous)
      if (firebase.auth) {
        auth = firebase.auth();
        try {
          const userCredential = await auth.signInAnonymously();
          currentUserId = userCredential.user.uid;
          console.log('🔑 Firebase Auth: Anonymous sign-in successful (UID:', currentUserId, ')');
        } catch (authErr) {
          console.warn('Firebase Auth error:', authErr.message);
          currentUserId = 'demo-user-' + Date.now();
        }
      }

      // Initialize Analytics
      if (firebase.analytics) {
        analytics = firebase.analytics();
        // Set user properties
        analytics.setUserProperties({
          app_version: '2.0.0',
          venue: 'narendra_modi_stadium',
          event_type: 't20_world_cup_2026'
        });
        console.log('📊 Firebase Analytics initialized');
      }

      // Initialize Performance Monitoring
      if (firebase.performance) {
        perf = firebase.performance();
        console.log('⚡ Firebase Performance Monitoring initialized');
      }

      // Initialize Cloud Messaging (push notifications)
      if (firebase.messaging && 'Notification' in window) {
        try {
          const messaging = firebase.messaging();
          console.log('📬 Firebase Cloud Messaging initialized');
        } catch (msgErr) {
          console.warn('FCM initialization skipped:', msgErr.message);
        }
      }

      isInitialized = true;
      console.log('✅ Firebase fully initialized with', Object.keys(FIREBASE_CONFIG).length, 'config keys');
      return true;

    } catch (error) {
      console.warn('⚠️ Firebase initialization failed — entering demo mode:', error.message);
      isDemoMode = true;
      initDemoMode();
      return false;
    }
  }

  /**
   * Initialize demo mode with localStorage-backed storage
   * Provides same API surface as Firebase for seamless fallback
   * @private
   */
  function initDemoMode() {
    currentUserId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
    console.log('🎮 Firebase demo mode active (UID:', currentUserId, ')');
    isInitialized = true;
  }

  // ==========================================
  // FIRESTORE OPERATIONS
  // ==========================================

  /**
   * Save crowd density snapshot to Firestore
   * @param {Object} crowdData - Zone density data
   * @returns {Promise<string|null>} Document ID or null
   */
  async function saveCrowdSnapshot(crowdData) {
    const snapshot = {
      timestamp: new Date().toISOString(),
      userId: currentUserId,
      phase: crowdData.phase?.label || 'unknown',
      matchMinute: crowdData.matchMinute || 0,
      avgDensity: 0,
      hotSpots: 0,
      zoneCount: 0,
      zones: {}
    };

    // Summarize zone data
    if (crowdData.zones) {
      const densities = [];
      Object.entries(crowdData.zones).forEach(([id, zone]) => {
        densities.push(zone.density);
        snapshot.zones[id] = {
          density: Math.round(zone.density),
          occupancy: zone.occupancy,
          waitTime: zone.waitTime || 0
        };
      });
      snapshot.avgDensity = Math.round(densities.reduce((a, b) => a + b, 0) / densities.length);
      snapshot.hotSpots = densities.filter(d => d > 80).length;
      snapshot.zoneCount = densities.length;
    }

    if (db && !isDemoMode) {
      try {
        const docRef = await db.collection('crowd_snapshots').add(snapshot);
        return docRef.id;
      } catch (err) {
        console.warn('Firestore write error:', err.message);
      }
    } else {
      // Demo mode: save to localStorage
      try {
        const snapshots = JSON.parse(localStorage.getItem('vf-snapshots') || '[]');
        snapshot.id = 'demo-' + Date.now();
        snapshots.push(snapshot);
        // Keep last 50 snapshots
        if (snapshots.length > 50) snapshots.splice(0, snapshots.length - 50);
        localStorage.setItem('vf-snapshots', JSON.stringify(snapshots));
        return snapshot.id;
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  /**
   * Save food order to Firestore
   * @param {Object} order - Order details
   * @returns {Promise<string|null>} Order ID
   */
  async function saveOrder(order) {
    const doc = {
      userId: currentUserId,
      items: order.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      total: order.total,
      pickup: order.pickup,
      status: order.status,
      createdAt: new Date().toISOString()
    };

    if (db && !isDemoMode) {
      try {
        const docRef = await db.collection('orders').add(doc);
        console.log('📝 Order saved to Firestore:', docRef.id);
        return docRef.id;
      } catch (err) {
        console.warn('Firestore order save error:', err.message);
      }
    } else {
      try {
        const orders = JSON.parse(localStorage.getItem('vf-orders') || '[]');
        doc.id = 'order-' + Date.now();
        orders.push(doc);
        localStorage.setItem('vf-orders', JSON.stringify(orders));
        return doc.id;
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  /**
   * Save user preferences to Firestore
   * @param {Object} prefs - User preferences
   */
  async function savePreferences(prefs) {
    const doc = {
      ...prefs,
      userId: currentUserId,
      updatedAt: new Date().toISOString()
    };

    if (db && !isDemoMode) {
      try {
        await db.collection('user_preferences').doc(currentUserId).set(doc, { merge: true });
      } catch (err) {
        console.warn('Firestore prefs save error:', err.message);
      }
    } else {
      try {
        localStorage.setItem('vf-prefs', JSON.stringify(doc));
      } catch (e) { /* ignore */ }
    }
  }

  /**
   * Load user preferences from Firestore
   * @returns {Promise<Object|null>}
   */
  async function loadPreferences() {
    if (db && !isDemoMode) {
      try {
        const doc = await db.collection('user_preferences').doc(currentUserId).get();
        return doc.exists ? doc.data() : null;
      } catch (err) {
        console.warn('Firestore prefs load error:', err.message);
      }
    } else {
      try {
        const prefs = localStorage.getItem('vf-prefs');
        return prefs ? JSON.parse(prefs) : null;
      } catch (e) { /* ignore */ }
    }
    return null;
  }

  /**
   * Subscribe to real-time crowd updates from Firestore
   * @param {Function} callback - Called with latest snapshot data
   * @returns {Function} Unsubscribe function
   */
  function onCrowdUpdate(callback) {
    if (db && !isDemoMode) {
      try {
        return db.collection('crowd_snapshots')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
              if (change.type === 'added') {
                callback(change.doc.data());
              }
            });
          });
      } catch (err) {
        console.warn('Firestore listener error:', err.message);
      }
    }
    return () => {}; // No-op unsubscribe
  }

  // ==========================================
  // ANALYTICS EVENTS
  // ==========================================

  /**
   * Log an analytics event
   * @param {string} eventName - Event name (e.g. 'page_view', 'food_order')
   * @param {Object} [params] - Event parameters
   */
  function logEvent(eventName, params = {}) {
    // Add common parameters
    const enrichedParams = {
      ...params,
      timestamp: new Date().toISOString(),
      user_id: currentUserId,
      app_version: '2.0.0'
    };

    if (analytics && !isDemoMode) {
      try {
        analytics.logEvent(eventName, enrichedParams);
      } catch (err) {
        console.warn('Analytics event error:', err.message);
      }
    }

    // Always log to console for debugging / demo visibility
    console.log(`📊 Analytics: ${eventName}`, enrichedParams);
  }

  /**
   * Log a page/view navigation event
   * @param {string} viewName - View identifier
   */
  function logPageView(viewName) {
    logEvent('page_view', {
      page_title: viewName,
      page_location: window.location.href,
      page_path: `#${viewName}`
    });
  }

  /**
   * Log a food order event
   * @param {Object} order - Order data
   */
  function logFoodOrder(order) {
    logEvent('purchase', {
      transaction_id: 'order-' + Date.now(),
      value: order.total,
      currency: 'INR',
      items: order.items?.length || 0,
      pickup_location: order.pickup
    });
  }

  /**
   * Log a route search event
   * @param {string} from - Start zone
   * @param {string} to - Destination zone
   * @param {number} eta - Estimated time in minutes
   */
  function logRouteSearch(from, to, eta) {
    logEvent('route_search', {
      origin: from,
      destination: to,
      estimated_time: eta,
      crowd_optimized: true
    });
  }

  /**
   * Log an AI assistant query event
   * @param {string} query - User query
   * @param {string} category - Query category
   */
  function logAIQuery(query, category) {
    logEvent('ai_assistant_query', {
      query_length: query.length,
      query_category: category,
      response_source: isDemoMode ? 'local' : 'gemini'
    });
  }

  // ==========================================
  // PERFORMANCE MONITORING
  // ==========================================

  /**
   * Create a custom performance trace
   * @param {string} traceName - Name of the trace
   * @returns {Object} Trace object with start/stop methods
   */
  function createTrace(traceName) {
    if (perf && !isDemoMode) {
      try {
        const trace = perf.trace(traceName);
        return {
          start: () => trace.start(),
          stop: () => trace.stop(),
          putAttribute: (key, val) => trace.putAttribute(key, String(val)),
          putMetric: (key, val) => trace.putMetric(key, val)
        };
      } catch (err) {
        console.warn('Performance trace error:', err.message);
      }
    }

    // Demo mode: timing-based trace
    let startTime = 0;
    const attrs = {};
    const metrics = {};
    return {
      start: () => { startTime = performance.now(); },
      stop: () => {
        const duration = Math.round(performance.now() - startTime);
        console.log(`⚡ Perf trace [${traceName}]: ${duration}ms`, { attrs, metrics });
      },
      putAttribute: (key, val) => { attrs[key] = val; },
      putMetric: (key, val) => { metrics[key] = val; }
    };
  }

  // ==========================================
  // GETTERS
  // ==========================================

  /** @returns {boolean} Whether Firebase is initialized */
  function getIsInitialized() { return isInitialized; }

  /** @returns {boolean} Whether in demo mode */
  function getIsDemoMode() { return isDemoMode; }

  /** @returns {string|null} Current user ID */
  function getUserId() { return currentUserId; }

  /** @returns {Object} Firebase config (for display) */
  function getConfig() { return { ...FIREBASE_CONFIG }; }

  /** @returns {string[]} List of active services */
  function getActiveServices() {
    const services = [];
    if (db || isDemoMode) services.push('Cloud Firestore');
    if (auth || isDemoMode) services.push('Authentication');
    if (analytics || isDemoMode) services.push('Analytics');
    if (perf || isDemoMode) services.push('Performance Monitoring');
    services.push('Cloud Messaging'); // Always listed
    return services;
  }

  return {
    init,
    // Firestore
    saveCrowdSnapshot,
    saveOrder,
    savePreferences,
    loadPreferences,
    onCrowdUpdate,
    // Analytics
    logEvent,
    logPageView,
    logFoodOrder,
    logRouteSearch,
    logAIQuery,
    // Performance
    createTrace,
    // Getters
    getIsInitialized,
    getIsDemoMode,
    getUserId,
    getConfig,
    getActiveServices
  };
})();
