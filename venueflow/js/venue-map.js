/* ============================================
   VenueFlow — Interactive SVG Venue Map
   ============================================ */

const VenueMap = (() => {
  let svgEl = null;
  let tooltipEl = null;
  let selectedZone = null;
  let mapContainer = null;

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

    // Inner field
    const field = createSVGElement('ellipse', {
      cx: 420, cy: 230, rx: 160, ry: 110,
      fill: '#0f4d2a', stroke: 'rgba(255,255,255,0.1)', 'stroke-width': 1
    });
    svgEl.appendChild(field);

    // Field lines
    const midLine = createSVGElement('line', {
      x1: 420, y1: 120, x2: 420, y2: 340,
      stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1
    });
    svgEl.appendChild(midLine);

    const centerCircle = createSVGElement('circle', {
      cx: 420, cy: 230, r: 30,
      fill: 'none', stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1
    });
    svgEl.appendChild(centerCircle);

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
      seating: zone.name.replace('Section ', ''),
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

  function hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }

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

  function createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  return { init };
})();
