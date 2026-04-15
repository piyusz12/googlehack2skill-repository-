/* ============================================
   VenueFlow — Main App Controller
   ============================================
   @description Controls view routing, component lifecycle,
   global state management, and Google services integration.
   
   @author VenueFlow Team
   @version 2.0.0
   ============================================ */

const App = (() => {
  'use strict';

  /** @type {string[]} Available view identifiers */
  const VIEWS = ['dashboard', 'map', 'queues', 'order', 'feed', 'navigate', 'assistant'];

  /** @private {string} Currently active view */
  let currentView = 'dashboard';

  /**
   * Initialize the application
   * Orchestrates all component initialization in correct order.
   */
  function init() {
    try {
      // 1. Initialize accessibility first (must be ready before other components)
      if (typeof AccessibilityManager !== 'undefined') {
        AccessibilityManager.init();
      }

      // 2. Setup navigation
      setupNavigation();

      // 3. Start crowd simulation engine
      CrowdSimulator.start();

      // 4. Initialize UI components
      VenueMap.init('map-container');
      QueueManager.init('queue-container');
      Navigation.init('nav-container');
      PreOrder.init('order-container');
      LiveFeed.init('feed-container');

      // 5. Initialize Google Services
      if (typeof GeminiAssistant !== 'undefined') {
        GeminiAssistant.init('assistant-container');
      }

      // 6. Setup dashboard
      setupDashboard();

      // 7. Event listeners
      Utils.on('crowdUpdate', updateDashboard);
      Utils.on('phaseChange', updatePhaseTimeline);
      window.addEventListener('hashchange', handleRouteChange);

      // 8. Initial route
      handleRouteChange();

      // 9. Dismiss splash screen
      dismissSplash();

      // 10. Register service worker for PWA
      registerServiceWorker();

      console.log('🏟️ VenueFlow v2.0 initialized successfully');

      // 11. Run tests in development (if available)
      if (typeof TestSuite !== 'undefined') {
        setTimeout(() => TestSuite.runAll(), 2000);
      }

    } catch (error) {
      console.error('❌ VenueFlow initialization error:', error);
      handleFatalError(error);
    }
  }

  /**
   * Setup bottom navigation and keyboard shortcuts
   * @private
   */
  function setupNavigation() {
    document.querySelectorAll('.bottom-nav__item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        navigateTo(view);
      });
    });
  }

  /**
   * Navigate to a specific view
   * @param {string} view - View identifier
   */
  function navigateTo(view) {
    if (!VIEWS.includes(view)) return;

    currentView = view;
    window.location.hash = view;

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${view}`);
    if (target) {
      target.classList.add('active');
      // Move focus to view for screen readers
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }

    // Update nav state
    document.querySelectorAll('.bottom-nav__item').forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Announce to screen readers
    if (typeof AccessibilityManager !== 'undefined') {
      const viewNames = {
        dashboard: 'Dashboard',
        map: 'Venue Map',
        queues: 'Smart Queues',
        order: 'Food Ordering',
        feed: 'Live Feed',
        navigate: 'Navigation',
        assistant: 'AI Assistant',
      };
      AccessibilityManager.announce(`${viewNames[view] || view} view loaded`);
    }
  }

  /**
   * Handle URL hash changes
   * @private
   */
  function handleRouteChange() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    navigateTo(hash);
  }

  /**
   * Setup dashboard quick actions
   * @private
   */
  function setupDashboard() {
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.navigate;
        if (view) navigateTo(view);
      });
    });
  }

  /**
   * Update dashboard with latest simulation data
   * @param {Object} data - Crowd update data
   * @private
   */
  function updateDashboard(data) {
    const stats = CrowdSimulator.getStats();

    // Update stat cards (use textContent for security)
    const updates = {
      'stat-attendees': Utils.formatNumber(stats.totalAttendees),
      'stat-density': stats.avgDensity + '%',
      'stat-wait': stats.avgWait + ' min',
      'stat-hotspots': stats.hotSpots.toString(),
    };

    Object.entries(updates).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== value) {
        el.textContent = value;
        el.style.animation = 'countPop 0.3s ease';
        setTimeout(() => { el.style.animation = ''; }, 300);
      }
    });

    // Update hot zones
    updateHotZones(data);

    // Update phase timeline
    updatePhaseTimeline(data);

    // Update header phase
    const headerPhase = document.getElementById('header-phase-text');
    if (headerPhase) {
      headerPhase.textContent = data.phase.label + ' — ' + Utils.formatMatchMinute(data.matchMinute);
    }
  }

  /**
   * Update hot zones panel
   * @param {Object} data - Crowd data
   * @private
   */
  function updateHotZones(data) {
    const hotZonesEl = document.getElementById('hot-zones-list');
    if (!hotZonesEl) return;

    const hotZones = Object.values(data.zones)
      .filter(z => z.density > 75)
      .sort((a, b) => b.density - a.density)
      .slice(0, 5);

    if (hotZones.length === 0) {
      hotZonesEl.innerHTML = '<div style="padding:var(--space-md);color:var(--color-text-muted);font-size:var(--font-size-sm)" role="status">No hot zones detected ✅</div>';
      return;
    }

    hotZonesEl.innerHTML = hotZones.map(z => {
      const level = Utils.getDensityLevel(z.density);
      const density = Math.round(z.density);
      return `
        <div class="hot-zone-item" role="listitem">
          <span class="hot-zone-item__name">${Utils.escapeHTML(z.name)}</span>
          <span class="hot-zone-item__density badge badge--${level}" aria-label="${density}% density">${density}%</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Update event phase timeline
   * @param {Object} data - Crowd data
   * @private
   */
  function updatePhaseTimeline(data) {
    const phases = CrowdSimulator.getPhases();
    const currentPhaseIndex = data?.phaseIndex ?? 0;

    phases.forEach((phase, i) => {
      const barEl = document.getElementById(`phase-bar-${i}`);
      const phaseEl = document.getElementById(`phase-item-${i}`);

      if (barEl) {
        barEl.classList.remove('active', 'completed');
        if (i < currentPhaseIndex) barEl.classList.add('completed');
        else if (i === currentPhaseIndex) barEl.classList.add('active');
      }

      if (phaseEl) {
        phaseEl.classList.remove('active');
        if (i === currentPhaseIndex) phaseEl.classList.add('active');
      }
    });
  }

  /**
   * Dismiss the splash screen with animation
   * @private
   */
  function dismissSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('hidden');
        setTimeout(() => splash.remove(), 600);
      }, 2000);
    }
  }

  /**
   * Register service worker for PWA offline support
   * @private
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('📦 Service Worker registered:', reg.scope))
        .catch(err => console.warn('Service Worker registration failed:', err));
    }
  }

  /**
   * Handle fatal initialization errors gracefully
   * @param {Error} error
   * @private
   */
  function handleFatalError(error) {
    const main = document.querySelector('.app-main');
    if (main) {
      main.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;">
          <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
          <h2 style="margin-bottom:0.5rem;">Something went wrong</h2>
          <p style="color:var(--color-text-secondary);margin-bottom:1rem;">${Utils.escapeHTML(error.message)}</p>
          <button class="btn btn--primary" onclick="location.reload()">Reload App</button>
        </div>
      `;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { navigateTo };
})();
