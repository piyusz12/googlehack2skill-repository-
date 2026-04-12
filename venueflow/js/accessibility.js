/* ============================================
   VenueFlow — Accessibility Manager
   ============================================
   @description Manages accessibility features including
   keyboard navigation, focus trapping, screen reader
   announcements, high contrast mode, and font scaling.
   
   @standards WCAG 2.1 AA compliance
   ============================================ */

const AccessibilityManager = (() => {
  'use strict';

  /** @private {boolean} */
  let highContrastEnabled = false;

  /** @private {number} */
  let fontScale = 1;

  /** @private {boolean} */
  let reducedMotionPreferred = false;

  /**
   * Initialize accessibility features
   */
  function init() {
    // Detect system preferences
    detectSystemPreferences();

    // Setup keyboard navigation
    setupKeyboardNavigation();

    // Setup focus management
    setupFocusManagement();

    // Setup accessibility control buttons
    setupControls();

    // Create live announcer region
    createAnnouncer();

    console.log('♿ Accessibility manager initialized');
  }

  /**
   * Detect and respect system accessibility preferences
   * @private
   */
  function detectSystemPreferences() {
    // Reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionPreferred = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      reducedMotionPreferred = e.matches;
    });

    // High contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    if (contrastQuery.matches) {
      toggleHighContrast(true);
    }

    // Load saved preferences from localStorage (with error handling)
    try {
      const savedContrast = localStorage.getItem('venueflow-high-contrast');
      if (savedContrast === 'true') toggleHighContrast(true);

      const savedScale = localStorage.getItem('venueflow-font-scale');
      if (savedScale) setFontScale(parseFloat(savedScale));
    } catch (e) {
      // localStorage not available (private browsing, etc.)
      console.warn('Could not load accessibility preferences:', e.message);
    }
  }

  /**
   * Setup keyboard navigation handlers
   * @private
   */
  function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Tab trap management is handled per-component

      // Escape key closes modals/overlays
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
      }

      // Number keys 1-6 for quick view navigation
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        const activeEl = document.activeElement;
        const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
        
        if (!isTyping) {
          const viewKeys = {
            '1': 'dashboard',
            '2': 'map',
            '3': 'queues',
            '4': 'order',
            '5': 'feed',
            '6': 'navigate',
            '7': 'assistant',
          };

          if (viewKeys[e.key]) {
            e.preventDefault();
            if (typeof App !== 'undefined' && App.navigateTo) {
              App.navigateTo(viewKeys[e.key]);
              announce(`Navigated to ${viewKeys[e.key]} view`);
            }
          }
        }
      }
    });
  }

  /**
   * Setup focus management to distinguish mouse and keyboard users
   * @private
   */
  function setupFocusManagement() {
    let isKeyboardUser = false;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        isKeyboardUser = true;
        document.body.classList.add('keyboard-user');
      }
    });

    document.addEventListener('mousedown', () => {
      isKeyboardUser = false;
      document.body.classList.remove('keyboard-user');
    });
  }

  /**
   * Setup accessibility control buttons in the header
   * @private
   */
  function setupControls() {
    const contrastBtn = document.getElementById('a11y-contrast');
    const fontUpBtn = document.getElementById('a11y-font-up');
    const fontDownBtn = document.getElementById('a11y-font-down');

    if (contrastBtn) {
      contrastBtn.addEventListener('click', () => {
        toggleHighContrast(!highContrastEnabled);
        announce(highContrastEnabled ? 'High contrast mode enabled' : 'High contrast mode disabled');
      });
    }

    if (fontUpBtn) {
      fontUpBtn.addEventListener('click', () => {
        if (fontScale < 1.5) {
          setFontScale(fontScale + 0.1);
          announce(`Font size increased to ${Math.round(fontScale * 100)}%`);
        }
      });
    }

    if (fontDownBtn) {
      fontDownBtn.addEventListener('click', () => {
        if (fontScale > 0.8) {
          setFontScale(fontScale - 0.1);
          announce(`Font size decreased to ${Math.round(fontScale * 100)}%`);
        }
      });
    }
  }

  /**
   * Toggle high contrast mode
   * @param {boolean} enable
   */
  function toggleHighContrast(enable) {
    highContrastEnabled = enable;
    document.documentElement.setAttribute('data-high-contrast', enable.toString());

    const btn = document.getElementById('a11y-contrast');
    if (btn) btn.setAttribute('aria-pressed', enable.toString());

    try {
      localStorage.setItem('venueflow-high-contrast', enable.toString());
    } catch (e) { /* ignore */ }
  }

  /**
   * Set font scale
   * @param {number} scale - Scale factor (0.8 to 1.5)
   */
  function setFontScale(scale) {
    fontScale = Math.round(scale * 10) / 10;
    document.documentElement.style.setProperty('--font-scale', fontScale.toString());

    try {
      localStorage.setItem('venueflow-font-scale', fontScale.toString());
    } catch (e) { /* ignore */ }
  }

  /**
   * Create ARIA live region for screen reader announcements
   * @private
   */
  function createAnnouncer() {
    if (document.getElementById('a11y-announcer')) return;

    const announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
  }

  /**
   * Announce a message to screen readers
   * @param {string} message
   * @param {string} [priority='polite'] - 'polite' or 'assertive'
   */
  function announce(message, priority = 'polite') {
    const announcer = document.getElementById('a11y-announcer');
    if (!announcer) return;

    announcer.setAttribute('aria-live', priority);
    announcer.textContent = '';
    // Force browser to notice the change
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }

  return { init, announce, toggleHighContrast, setFontScale };
})();
