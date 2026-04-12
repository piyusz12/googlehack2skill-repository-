/* ============================================
   VenueFlow — Smart Queue Manager
   ============================================ */

const QueueManager = (() => {
  let container = null;
  let currentTab = 'all';

  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    render();
    Utils.on('crowdUpdate', update);
  }

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
      const fillPercent = Math.min(100, (f.waitTime / 20) * 100);

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

    if (savings > 3) {
      recEl.style.display = 'flex';
      recText.textContent = `Save ~${savings} min! ${shortest.name} has ${shortest.waitTime} min wait vs ${longest.waitTime} min at ${longest.name}`;
    } else {
      recEl.style.display = 'none';
    }
  }

  return { init };
})();
