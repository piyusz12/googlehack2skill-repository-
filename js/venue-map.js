/* ============================================
   VenueFlow — Interactive SVG Venue Map
   ============================================
   @module VenueMap
   @description Interactive SVG heatmap of the Narendra Modi Stadium.
   Renders all 50+ zones with density-based color coding, hover
   tooltips, click selection, and a real-time legend/phase indicator.

   @version 2.1.0
   @author VenueFlow Team
   ============================================ */

const VenueMap = (() => {
  'use strict';

  // ---------- State ----------

  /** @private {SVGElement|null} */
  let svgEl = null;

  /** @private {HTMLElement|null} */
  let tooltipEl = null;

  /** @private {string|null} Currently selected zone ID */
  let selectedZone = null;

  /** @private {HTMLElement|null} */
  let mapContainer = null;

  /**
   * Initialize the venue map.
   * @param {string} containerId - DOM container element ID
   */
  function init(containerId) {
    mapContainer = document.getElementById(containerId);
    if (!mapContainer) return;

    mapContainer.innerHTML = '';

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 840 480');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.id = 'venue-svg';
    mapContainer.appendChild(svg);
    svgEl = svg;

    // Draw stadium
    drawStadium();

    // Create tooltip
    tooltipEl = Utils.createElement('div', { className: 'map-tooltip', id: 'map-tooltip' });
    mapContainer.appendChild(tooltipEl);

    // Create legend
    const legend = Utils.createElement('div', {
      className: 'map-legend',
      innerHTML: `
        <div class="map-legend__item"><div class="map-legend__color map-legend__color--low"></div>Low</div>
        <div class="map-legend__item"><div class="map-legend__color map-legend__color--medium"></div>Medium</div>
        <div class="map-legend__item"><div class="map-legend__color map-legend__color--high"></div>High</div>
        <div class="map-legend__item"><div class="map-legend__color map-legend__color--critical"></div>Critical</div>
      `
    });
    mapContainer.appendChild(legend);

    // Create phase indicator
    const phaseIndicator = Utils.createElement('div', {
      className: 'map-phase-indicator',
      id: 'map-phase',
      innerHTML: `<div class="map-phase-indicator__dot"></div><span id="map-phase-text">Pre-Game</span>`
    });
    mapContainer.appendChild(phaseIndicator);

    // Listen for crowd updates
    Utils.on('crowdUpdate', updateHeatmap);
  }

  /**
   * Draw the full stadium SVG including field, pitch, and all zones.
   * @private
   */
  function drawStadium() {
    if (!svgEl) return;

    // Background
    const bg = createSVGElement('rect', { x: 0, y: 0, width: 840, height: 480, fill: '#0d1130', rx: 12 });
    svgEl.appendChild(bg);

    // Stadium outline (ellipse)
    const outline = createSVGElement('ellipse', {
      cx: 420, cy: 230, rx: 310, ry: 215,
      fill: 'none', stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 2
    });
    svgEl.appendChild(outline);

    // Inner field (Cricket Oval)
    const field = createSVGElement('ellipse', {
      cx: 420, cy: 230, rx: 170, ry: 130,
      fill: '#0f4d2a', stroke: 'rgba(255,255,255,0.1)', 'stroke-width': 1
    });
    svgEl.appendChild(field);

    // 30-yard circle
    const thirtyYard = createSVGElement('ellipse', {
      cx: 420, cy: 230, rx: 90, ry: 60,
      fill: 'none', stroke: 'rgba(255,255,255,0.3)', 'stroke-width': 1,
      'stroke-dasharray': '5,5'
    });
    svgEl.appendChild(thirtyYard);

    // Cricket Pitch
    const pitch = createSVGElement('rect', {
      x: 412, y: 190, width: 16, height: 80,
      fill: '#a68c69', stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1
    });
    svgEl.appendChild(pitch);
    
    // Creases
    const topCrease = createSVGElement('line', {
      x1: 410, y1: 196, x2: 430, y2: 196,
      stroke: '#ffffff', 'stroke-width': 1
    });
    svgEl.appendChild(topCrease);
    
    const bottomCrease = createSVGElement('line', {
      x1: 410, y1: 264, x2: 430, y2: 264,
      stroke: '#ffffff', 'stroke-width': 1
    });
    svgEl.appendChild(bottomCrease);

    // "VENUEFLOW" text
    const titleText = createSVGElement('text', {
      x: 420, y: 230,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: 'rgba(255,255,255,0.1)',
      'font-family': 'Inter, sans-serif',
      'font-size': '14',
      'font-weight': '800',
      'letter-spacing': '0.3em'
    });
    titleText.textContent = 'VENUEFLOW';
    svgEl.appendChild(titleText);

    // Draw zones
    const zones = CrowdSimulator.getZones();
    zones.forEach(zone => drawZone(zone));
  }

  /**
   * Draw a single zone shape on the SVG map.
   * @param {Object} zone - Zone definition with id, type, x, y, capacity
   * @private
   */
  function drawZone(zone) {
    let shape;
    const group = createSVGElement('g', {
      'data-zone-id': zone.id,
      class: 'map-zone',
    });

    switch (zone.type) {
      case 'seating':
        shape = createSVGElement('rect', {
          x: zone.x - 30, y: zone.y - 18,
          width: 60, height: 36,
          rx: 6,
          fill: 'rgba(16, 185, 129, 0.4)',
        });
        break;
      case 'concourse':
        shape = createSVGElement('rect', {
          x: zone.x - 50, y: zone.y - 10,
          width: 100, height: 20,
          rx: 4,
          fill: 'rgba(59, 130, 246, 0.3)',
        });
        break;
      case 'gate':
        shape = createSVGElement('rect', {
          x: zone.x - 16, y: zone.y - 10,
          width: 32, height: 20,
          rx: 4,
          fill: 'rgba(139, 92, 246, 0.4)',
        });
        break;
      case 'food':
        shape = createSVGElement('circle', {
          cx: zone.x, cy: zone.y, r: 10,
          fill: 'rgba(245, 158, 11, 0.4)',
        });
        break;
      case 'restroom':
        shape = createSVGElement('rect', {
          x: zone.x - 8, y: zone.y - 8,
          width: 16, height: 16,
          rx: 3,
          fill: 'rgba(99, 102, 241, 0.4)',
        });
        break;
      case 'merchandise':
        shape = createSVGElement('polygon', {
          points: `${zone.x},${zone.y - 12} ${zone.x + 12},${zone.y + 8} ${zone.x - 12},${zone.y + 8}`,
          fill: 'rgba(236, 72, 153, 0.4)',
        });
        break;
    }

    if (shape) {
      shape.setAttribute('data-zone-id', zone.id);
      group.appendChild(shape);
    }

    // Label
    const label = createSVGElement('text', {
      x: zone.x, y: zone.y,
      class: zone.type === 'food' || zone.type === 'restroom' ? 'map-label map-label--small' : 'map-label',
    });

    const shortLabels = {
      seating: zone.name.split(' ').map(w => w[0]).join(''),
      concourse: zone.name.replace(' Concourse', ''),
      gate: zone.name.replace('Gate ', 'G'),
      food: '🍔',
      restroom: '🚻',
      merchandise: '🛍️',
    };
    label.textContent = shortLabels[zone.type] || zone.id;
    group.appendChild(label);

    // Click handler
    group.addEventListener('click', (e) => handleZoneClick(zone, e));
    group.addEventListener('mouseenter', (e) => showTooltip(zone, e));
    group.addEventListener('mouseleave', hideTooltip);

    svgEl.appendChild(group);
  }

  /**
   * Handle zone click — select zone and emit event.
   * @param {Object} zone - Zone definition
   * @param {Event} e - Click event
   * @private
   */
  function handleZoneClick(zone, e) {
    // Deselect previous
    if (selectedZone) {
      const prev = svgEl.querySelector(`[data-zone-id="${selectedZone}"].map-zone`);
      if (prev) prev.classList.remove('selected');
    }

    selectedZone = zone.id;
    const group = svgEl.querySelector(`g[data-zone-id="${zone.id}"]`);
    if (group) group.classList.add('selected');

    Utils.emit('zoneSelected', zone);
  }

  /**
   * Show tooltip with zone details near the cursor.
   * @param {Object} zone - Zone definition
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  function showTooltip(zone, e) {
    if (!tooltipEl) return;
    const data = CrowdSimulator.getZoneData()[zone.id];
    if (!data) return;

    const level = Utils.getDensityLevel(data.density);
    const trend = Utils.getTrendIcon(data.trend);

    tooltipEl.innerHTML = `
      <div class="map-tooltip__name">${zone.name}</div>
      <div class="map-tooltip__type">${zone.type}</div>
      <div class="map-tooltip__stats">
        <div class="map-tooltip__stat">
          <span class="map-tooltip__stat-label">Density</span>
          <span class="map-tooltip__stat-value" style="color:${Utils.getDensityColor(data.density)}">${Math.round(data.density)}% ${trend}</span>
        </div>
        <div class="map-tooltip__stat">
          <span class="map-tooltip__stat-label">Occupancy</span>
          <span class="map-tooltip__stat-value">${Utils.formatNumber(data.occupancy)} / ${Utils.formatNumber(zone.capacity)}</span>
        </div>
        ${data.waitTime > 0 ? `
        <div class="map-tooltip__stat">
          <span class="map-tooltip__stat-label">Wait Time</span>
          <span class="map-tooltip__stat-value">${data.waitTime} min</span>
        </div>` : ''}
      </div>
    `;

    // Position tooltip
    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    tooltipEl.style.left = (mouseX + 15) + 'px';
    tooltipEl.style.top = (mouseY - 10) + 'px';
    tooltipEl.classList.add('visible');
  }

  /**
   * Hide the zone tooltip.
   * @private
   */
  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }

  /**
   * Update zone heatmap colors based on latest crowd data.
   * @param {Object} data - Crowd update data with zones map
   * @private
   */
  function updateHeatmap(data) {
    if (!svgEl) return;

    const zones = data.zones;
    Object.entries(zones).forEach(([id, zoneData]) => {
      const group = svgEl.querySelector(`g[data-zone-id="${id}"]`);
      if (!group) return;

      const shape = group.querySelector('rect, circle, polygon');
      if (!shape) return;

      const level = Utils.getDensityLevel(zoneData.density);
      const color = Utils.getDensityColor(zoneData.density);
      const alpha = 0.3 + (zoneData.density / 100) * 0.5;

      // Remove old density classes
      shape.classList.remove('density-low', 'density-medium', 'density-high', 'density-critical');
      shape.classList.add(`density-${level}`);
    });

    // Update phase indicator
    const phaseText = document.getElementById('map-phase-text');
    if (phaseText) {
      phaseText.textContent = data.phase.label + ' — ' + Utils.formatMatchMinute(data.matchMinute);
    }
  }

  /**
   * Create an SVG element with attributes.
   * @param {string} tag - SVG tag name
   * @param {Object} attrs - Attribute key-value pairs
   * @returns {SVGElement}
   * @private
   */
  function createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  return { init };
})();
