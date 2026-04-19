/* ============================================
   VenueFlow — A* Navigation System
   ============================================
   @module Navigation
   @description Crowd-optimized pathfinding using A* algorithm.
   Finds the optimal route between any two zones in the stadium,
   accounting for real-time crowd density as edge weights.

   Features:
   - A* pathfinding with Euclidean heuristic
   - Dynamic crowd-density edge costs
   - Custom accessible dropdown selectors
   - ETA calculation with crowd slowdown factor

   @version 2.1.0
   @author VenueFlow Team
   ============================================ */

const Navigation = (() => {
  'use strict';

  // ---------- Constants ----------

  /** @const {number} How much crowd density increases traversal cost (0–100% maps to 1x–3x) */
  const CROWD_COST_MULTIPLIER = 2;

  /** @const {number} Base time in minutes per zone transition */
  const ZONE_TRANSIT_TIME_MIN = 1.5;

  /** @const {number} Crowd slowdown factor for ETA (density/100 * this) */
  const CROWD_SLOWDOWN_FACTOR = 0.5;

  /** @const {number} Heuristic distance scaling divisor */
  const HEURISTIC_SCALE = 100;
  let container = null;

  // Simplified venue graph — adjacency with base costs
  const GRAPH = {
    'gate-1':      { neighbors: ['concourse-N', 'section-A'], baseCost: 1 },
    'gate-2':      { neighbors: ['concourse-N', 'section-C'], baseCost: 1 },
    'gate-3':      { neighbors: ['concourse-E', 'section-D'], baseCost: 1 },
    'gate-4':      { neighbors: ['concourse-E', 'section-F'], baseCost: 1 },
    'gate-5':      { neighbors: ['concourse-S', 'section-G'], baseCost: 1 },
    'gate-6':      { neighbors: ['concourse-S', 'section-I'], baseCost: 1 },
    'gate-7':      { neighbors: ['concourse-W', 'section-J'], baseCost: 1 },
    'gate-8':      { neighbors: ['concourse-W', 'section-L'], baseCost: 1 },

    'concourse-N': { neighbors: ['gate-1', 'gate-2', 'section-A', 'section-B', 'section-C', 'food-1', 'food-2', 'food-9', 'food-10', 'restroom-1', 'restroom-2', 'merch-1', 'concourse-E', 'concourse-W'], baseCost: 2 },
    'concourse-S': { neighbors: ['gate-5', 'gate-6', 'section-G', 'section-H', 'section-I', 'food-5', 'food-6', 'food-11', 'food-12', 'restroom-5', 'restroom-6', 'merch-3', 'concourse-E', 'concourse-W'], baseCost: 2 },
    'concourse-E': { neighbors: ['gate-3', 'gate-4', 'section-D', 'section-E', 'section-F', 'food-3', 'food-4', 'restroom-3', 'restroom-4', 'merch-2', 'concourse-N', 'concourse-S'], baseCost: 2 },
    'concourse-W': { neighbors: ['gate-7', 'gate-8', 'section-J', 'section-K', 'section-L', 'food-7', 'food-8', 'restroom-7', 'restroom-8', 'merch-4', 'concourse-N', 'concourse-S'], baseCost: 2 },

    'section-A': { neighbors: ['concourse-N', 'concourse-W', 'gate-1', 'section-B', 'section-L', 'section-M'], baseCost: 2 },
    'section-B': { neighbors: ['concourse-N', 'section-A', 'section-C', 'section-M'], baseCost: 2 },
    'section-C': { neighbors: ['concourse-N', 'concourse-E', 'gate-2', 'section-B', 'section-D'], baseCost: 2 },
    'section-D': { neighbors: ['concourse-E', 'gate-3', 'section-C', 'section-E'], baseCost: 2 },
    'section-E': { neighbors: ['concourse-E', 'section-D', 'section-F', 'section-N'], baseCost: 2 },
    'section-F': { neighbors: ['concourse-E', 'gate-4', 'section-E', 'section-G', 'section-N'], baseCost: 2 },
    'section-G': { neighbors: ['concourse-S', 'gate-5', 'section-F', 'section-H'], baseCost: 2 },
    'section-H': { neighbors: ['concourse-S', 'section-G', 'section-I'], baseCost: 2 },
    'section-I': { neighbors: ['concourse-S', 'concourse-W', 'gate-6', 'section-H', 'section-J'], baseCost: 2 },
    'section-J': { neighbors: ['concourse-W', 'gate-7', 'section-I', 'section-K'], baseCost: 2 },
    'section-K': { neighbors: ['concourse-W', 'section-J', 'section-L', 'section-M'], baseCost: 2 },
    'section-L': { neighbors: ['concourse-W', 'gate-8', 'section-K', 'section-A'], baseCost: 2 },
    'section-M': { neighbors: ['section-A', 'section-B', 'section-K', 'section-L'], baseCost: 2 },
    'section-N': { neighbors: ['section-E', 'section-F', 'section-G'], baseCost: 2 },

    'food-1':  { neighbors: ['concourse-N'], baseCost: 1 },
    'food-2':  { neighbors: ['concourse-N'], baseCost: 1 },
    'food-3':  { neighbors: ['concourse-E'], baseCost: 1 },
    'food-4':  { neighbors: ['concourse-E'], baseCost: 1 },
    'food-5':  { neighbors: ['concourse-S'], baseCost: 1 },
    'food-6':  { neighbors: ['concourse-S'], baseCost: 1 },
    'food-7':  { neighbors: ['concourse-W'], baseCost: 1 },
    'food-8':  { neighbors: ['concourse-W'], baseCost: 1 },
    'food-9':  { neighbors: ['concourse-N'], baseCost: 1 },
    'food-10': { neighbors: ['concourse-N'], baseCost: 1 },
    'food-11': { neighbors: ['concourse-S'], baseCost: 1 },
    'food-12': { neighbors: ['concourse-S'], baseCost: 1 },

    'restroom-1': { neighbors: ['concourse-N'], baseCost: 1 },
    'restroom-2': { neighbors: ['concourse-N'], baseCost: 1 },
    'restroom-3': { neighbors: ['concourse-E'], baseCost: 1 },
    'restroom-4': { neighbors: ['concourse-E'], baseCost: 1 },
    'restroom-5': { neighbors: ['concourse-S'], baseCost: 1 },
    'restroom-6': { neighbors: ['concourse-S'], baseCost: 1 },
    'restroom-7': { neighbors: ['concourse-W'], baseCost: 1 },
    'restroom-8': { neighbors: ['concourse-W'], baseCost: 1 },

    'merch-1': { neighbors: ['concourse-N'], baseCost: 1 },
    'merch-2': { neighbors: ['concourse-E'], baseCost: 1 },
    'merch-3': { neighbors: ['concourse-S'], baseCost: 1 },
    'merch-4': { neighbors: ['concourse-W'], baseCost: 1 },
  };

  /** @private {string} Selected start zone ID */
  let selectedFrom = '';
  /** @private {string} Selected destination zone ID */
  let selectedTo = '';

  /**
   * Initialize the navigation component.
   * @param {string} containerId - DOM container element ID
   */
  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;
    render();

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-select')) {
        closeAllDropdowns();
      }
    });
  }

  /**
   * Render the navigation UI with dropdowns and route results.
   * @private
   */
  function render() {
    if (!container) return;

    const zones = CrowdSimulator.getZones();
    const fromZone = zones.find(z => z.id === selectedFrom);
    const toZone = zones.find(z => z.id === selectedTo);

    // Group zones by type for organized dropdown
    const groups = {
      'Sections':    zones.filter(z => z.type === 'seating'),
      'Concourses':  zones.filter(z => z.type === 'concourse'),
      'Gates':       zones.filter(z => z.type === 'gate'),
      'Food Stands': zones.filter(z => z.type === 'food'),
      'Restrooms':   zones.filter(z => z.type === 'restroom'),
      'Merchandise': zones.filter(z => z.type === 'merchandise'),
    };

    function buildOptions(selectedId) {
      let html = '';
      Object.entries(groups).forEach(([groupName, groupZones]) => {
        html += `<div class="custom-select__group">${Utils.escapeHTML(groupName)}</div>`;
        groupZones.forEach(z => {
          const isSelected = z.id === selectedId;
          html += `<div class="custom-select__option${isSelected ? ' selected' : ''}" data-value="${z.id}">${Utils.escapeHTML(z.name)}</div>`;
        });
      });
      return html;
    }

    container.innerHTML = `
      <div class="nav-controls">
        <div>
          <label class="custom-select__label" id="from-label">FROM</label>
          <div class="custom-select" id="cs-from" role="listbox" aria-labelledby="from-label">
            <div class="custom-select__trigger" tabindex="0" aria-haspopup="listbox">
              <span class="custom-select__value">${fromZone ? Utils.escapeHTML(fromZone.name) : 'Select start...'}</span>
              <svg class="custom-select__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="custom-select__dropdown" id="dd-from">
              ${buildOptions(selectedFrom)}
            </div>
          </div>
        </div>
        <div>
          <label class="custom-select__label" id="to-label">TO</label>
          <div class="custom-select" id="cs-to" role="listbox" aria-labelledby="to-label">
            <div class="custom-select__trigger" tabindex="0" aria-haspopup="listbox">
              <span class="custom-select__value">${toZone ? Utils.escapeHTML(toZone.name) : 'Select destination...'}</span>
              <svg class="custom-select__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="custom-select__dropdown" id="dd-to">
              ${buildOptions(selectedTo)}
            </div>
          </div>
        </div>
      </div>
      <button class="btn btn--primary btn--block" id="nav-find-btn" style="margin-bottom:var(--space-lg)">
        🧭 Find Optimal Route
      </button>
      <div id="nav-route-result"></div>
    `;

    // Wire up events
    document.getElementById('nav-find-btn').addEventListener('click', findRoute);
    setupDropdown('cs-from', 'dd-from', (val) => { selectedFrom = val; render(); });
    setupDropdown('cs-to', 'dd-to', (val) => { selectedTo = val; render(); });
  }

  /**
   * Wire up a custom dropdown select element.
   * @param {string} selectId - Custom select container ID
   * @param {string} dropdownId - Dropdown panel ID
   * @param {Function} onSelect - Callback when an option is selected
   * @private
   */
  function setupDropdown(selectId, dropdownId, onSelect) {
    const selectEl = document.getElementById(selectId);
    const dropdownEl = document.getElementById(dropdownId);
    if (!selectEl || !dropdownEl) return;

    const trigger = selectEl.querySelector('.custom-select__trigger');

    // Toggle on click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = selectEl.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) selectEl.classList.add('open');
    });

    // Keyboard support
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      } else if (e.key === 'Escape') {
        selectEl.classList.remove('open');
      }
    });

    // Option selection
    dropdownEl.querySelectorAll('.custom-select__option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        onSelect(val);
        closeAllDropdowns();
      });
    });
  }

  /**
   * Close all open custom dropdowns.
   * @private
   */
  function closeAllDropdowns() {
    document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
  }

  /**
   * Find and display the optimal route between selected zones.
   * @private
   */
  function findRoute() {
    const fromId = selectedFrom;
    const toId = selectedTo;
    const resultEl = document.getElementById('nav-route-result');

    if (!fromId || !toId) {
      resultEl.innerHTML = '<div class="empty-state"><p class="empty-state__text">Select start and destination</p></div>';
      return;
    }

    if (fromId === toId) {
      resultEl.innerHTML = '<div class="empty-state"><p class="empty-state__text">You\'re already there!</p></div>';
      return;
    }

    const path = astar(fromId, toId);
    if (!path) {
      resultEl.innerHTML = '<div class="empty-state"><p class="empty-state__text">No route found</p></div>';
      return;
    }

    displayRoute(path, resultEl);
  }

  /**
   * A* pathfinding algorithm with crowd-density edge weights.
   * @param {string} startId - Start zone ID
   * @param {string} goalId - Destination zone ID
   * @returns {string[]|null} Ordered array of zone IDs, or null if no path
   * @private
   */
  function astar(startId, goalId) {
    if (!GRAPH[startId] || !GRAPH[goalId]) return null;

    const zones = CrowdSimulator.getZones();
    const zoneMap = {};
    zones.forEach(z => zoneMap[z.id] = z);

    const openSet = new Set([startId]);
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    Object.keys(GRAPH).forEach(id => {
      gScore[id] = Infinity;
      fScore[id] = Infinity;
    });

    gScore[startId] = 0;
    fScore[startId] = heuristic(startId, goalId, zoneMap);

    while (openSet.size > 0) {
      // Get node with lowest fScore
      let current = null;
      let currentF = Infinity;
      openSet.forEach(id => {
        if (fScore[id] < currentF) {
          currentF = fScore[id];
          current = id;
        }
      });

      if (current === goalId) {
        return reconstructPath(cameFrom, current);
      }

      openSet.delete(current);

      const neighbors = GRAPH[current]?.neighbors || [];
      neighbors.forEach(neighborId => {
        if (!GRAPH[neighborId]) return;

        // Edge cost = base cost * crowd density multiplier
        const zoneData = CrowdSimulator.getZoneData();
        const density = zoneData[neighborId]?.density || 50;
        const crowdMultiplier = 1 + (density / 100) * CROWD_COST_MULTIPLIER; // density increases cost by up to 3x
        const tentativeG = gScore[current] + GRAPH[neighborId].baseCost * crowdMultiplier;

        if (tentativeG < gScore[neighborId]) {
          cameFrom[neighborId] = current;
          gScore[neighborId] = tentativeG;
          fScore[neighborId] = tentativeG + heuristic(neighborId, goalId, zoneMap);
          openSet.add(neighborId);
        }
      });
    }

    return null; // No path found
  }

  /**
   * Euclidean distance heuristic for A*.
   * @param {string} aId - Zone A ID
   * @param {string} bId - Zone B ID
   * @param {Object} zoneMap - Map of zone ID to zone definition
   * @returns {number} Estimated distance cost
   * @private
   */
  function heuristic(aId, bId, zoneMap) {
    const a = zoneMap[aId];
    const b = zoneMap[bId];
    if (!a || !b) return 0;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) / HEURISTIC_SCALE;
  }

  /**
   * Reconstruct path from A* cameFrom map.
   * @param {Object} cameFrom - Map of node to predecessor
   * @param {string} current - Goal node ID
   * @returns {string[]} Ordered path from start to goal
   * @private
   */
  function reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom[current]) {
      current = cameFrom[current];
      path.unshift(current);
    }
    return path;
  }

  /**
   * Display the found route with waypoints, density badges, and ETA.
   * @param {string[]} path - Ordered array of zone IDs
   * @param {HTMLElement} resultEl - DOM element to render into
   * @private
   */
  function displayRoute(path, resultEl) {
    const zoneData = CrowdSimulator.getZoneData();
    const zones = CrowdSimulator.getZones();
    const zoneMap = {};
    zones.forEach(z => zoneMap[z.id] = z);

    // Calculate ETA
    const walkingSpeedMetersPerMin = 80;
    let totalCost = 0;
    for (let i = 1; i < path.length; i++) {
      const density = zoneData[path[i]]?.density || 50;
      const crowdFactor = 1 + (density / 100) * CROWD_SLOWDOWN_FACTOR;
      totalCost += ZONE_TRANSIT_TIME_MIN * crowdFactor;
    }
    const etaMinutes = Math.round(totalCost);

    const waypoints = path.map((id, i) => {
      const zone = zoneMap[id];
      const data = zoneData[id];
      const density = data ? Math.round(data.density) : 0;
      const level = Utils.getDensityLevel(density);
      const isStart = i === 0;
      const isEnd = i === path.length - 1;

      return `
        <div class="nav-waypoint">
          <div class="nav-waypoint__dot" style="${isStart ? 'background:var(--color-accent-emerald);border-color:var(--color-accent-emerald)' : isEnd ? 'background:var(--color-accent-red);border-color:var(--color-accent-red)' : ''}">
            ${isStart ? '▶' : isEnd ? '■' : (i)}
          </div>
          <div class="nav-waypoint__info">
            <div class="nav-waypoint__name">${zone?.name || id}</div>
            <div class="nav-waypoint__detail">
              Crowd: <span class="badge badge--${level} badge--sm">${density}%</span>
            </div>
          </div>
          ${i < path.length - 1 ? '<div class="order-step__connector"></div>' : ''}
        </div>
      `;
    }).join('');

    resultEl.innerHTML = `
      <div class="nav-route">
        <div class="nav-route__header">
          <div>
            <div class="nav-route__eta">${etaMinutes} min</div>
            <div class="nav-route__distance">${path.length} zones · Crowd-optimized route</div>
          </div>
          <span class="badge badge--blue">🧭 Optimal</span>
        </div>
        ${waypoints}
      </div>
    `;
  }

  return { init };
})();
