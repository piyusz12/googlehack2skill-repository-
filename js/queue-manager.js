/* ============================================
   VenueFlow — Smart Queue Manager
   ============================================
   @module QueueManager
   @description Real-time queue wait time display for food stands,
   restrooms, and merchandise areas. Provides smart AI-like
   recommendations by comparing wait times across facilities.

   @version 2.1.0
   @author VenueFlow Team
   ============================================ */

const QueueManager = (() => {
  'use strict';

  // ---------- Constants ----------

  /** @const {number} Minimum savings (minutes) to show a recommendation */
  const MIN_SAVINGS_MINUTES = 3;

  /** @const {number} Maximum wait time for progress bar scaling (minutes) */
  const MAX_WAIT_SCALE = 20;

  // ---------- State ----------

  /** @private {HTMLElement|null} */
  let container = null;

  /** @private {string} Currently active tab filter */
  let currentTab = 'all';

  /**
   * Initialize the queue manager.
   * @param {string} containerId - DOM container element ID
   */
  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    render();
    Utils.on('crowdUpdate', update);
  }

  /**
   * Render the tab bar and initial queue list.
   * @private
   */
  function render() {
    if (!container) return;
    container.innerHTML = `
      <div class="tabs" id="queue-tabs">
        <button class="tabs__item active" data-tab="all">All</button>
        <button class="tabs__item" data-tab="food">🍔 Food</button>
        <button class="tabs__item" data-tab="restroom">🚻 Restrooms</button>
        <button class="tabs__item" data-tab="merchandise">🛍️ Merch</button>
      </div>
      <div id="queue-recommendation" class="pickup-recommendation" style="display:none">
        <span class="pickup-recommendation__icon">💡</span>
        <span id="queue-rec-text"></span>
      </div>
      <div id="queue-list"></div>
    `;

    // Tab click handlers
    container.querySelectorAll('.tabs__item').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tabs__item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        update();
      });
    });
  }

  /**
   * Update the queue list with latest crowd data.
   * Sorts facilities by wait time and renders progress bars.
   * @private
   */
  function update() {
    const listEl = document.getElementById('queue-list');
    if (!listEl) return;

    const zoneData = CrowdSimulator.getZoneData();
    const facilityTypes = ['food', 'restroom', 'merchandise'];

    let facilities = Object.values(zoneData)
      .filter(z => facilityTypes.includes(z.type))
      .filter(z => currentTab === 'all' || z.type === currentTab)
      .sort((a, b) => a.waitTime - b.waitTime);

    // Smart recommendation
    updateRecommendation(facilities);

    // Render list
    listEl.innerHTML = facilities.map(f => {
      const level = Utils.getWaitColor(f.waitTime);
      const trend = Utils.getTrendIcon(f.trend);
      const icon = { food: '🍔', restroom: '🚻', merchandise: '🛍️' }[f.type] || '📍';
      const fillPercent = Math.min(100, (f.waitTime / MAX_WAIT_SCALE) * 100);

      return `
        <div class="list-item" data-zone-id="${f.id}">
          <div class="list-item__icon" style="background:rgba(${level === 'low' ? '16,185,129' : level === 'medium' ? '245,158,11' : level === 'high' ? '249,115,22' : '239,68,68'},0.15)">
            ${icon}
          </div>
          <div class="list-item__content">
            <div class="list-item__title">${f.name}</div>
            <div class="list-item__subtitle">
              Density: ${Math.round(f.density)}% ${trend}
            </div>
            <div class="progress" style="margin-top:6px">
              <div class="progress__bar progress__bar--${level}" style="width:${fillPercent}%"></div>
            </div>
          </div>
          <div class="list-item__action">
            <span class="badge badge--${level}">${f.waitTime} min</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Update the smart recommendation banner.
   * Shows time savings when difference exceeds MIN_SAVINGS_MINUTES.
   * @param {Array<Object>} facilities - Sorted facility data
   * @private
   */
  function updateRecommendation(facilities) {
    const recEl = document.getElementById('queue-recommendation');
    const recText = document.getElementById('queue-rec-text');
    if (!recEl || !recText) return;

    const foodStands = facilities.filter(f => f.type === 'food');
    if (foodStands.length < 2) {
      recEl.style.display = 'none';
      return;
    }

    const sorted = [...foodStands].sort((a, b) => a.waitTime - b.waitTime);
    const shortest = sorted[0];
    const longest = sorted[sorted.length - 1];
    const savings = longest.waitTime - shortest.waitTime;

    if (savings > MIN_SAVINGS_MINUTES) {
      recEl.style.display = 'flex';
      recText.textContent = `Save ~${savings} min! ${shortest.name} has ${shortest.waitTime} min wait vs ${longest.waitTime} min at ${longest.name}`;
    } else {
      recEl.style.display = 'none';
    }
  }

  return { init };
})();
