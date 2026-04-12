/* ============================================
   VenueFlow — Live Event Feed & Scoreboard
   ============================================ */

const LiveFeed = (() => {
  let container = null;
  let feedItems = [];
  let homeScore = 0;
  let awayScore = 0;
  let feedInterval = null;

  const TEAMS = {
    home: { name: 'Thunder FC', short: 'THU', color: '#3b82f6', emoji: '⚡' },
    away: { name: 'Red Hawks', short: 'RHK', color: '#ef4444', emoji: '🦅' },
  };

  const EVENT_TEMPLATES = {
    goal: [
      { title: '⚽ GOAL!', desc: (team, player, min) => `${player} scores for ${team}! (${min}')` },
      { title: '⚽ GOAL!', desc: (team, player, min) => `Brilliant finish by ${player}! ${team} celebrates! (${min}')` },
    ],
    save: [
      { title: '🧤 Great Save!', desc: (team, player, min) => `${player} denies the shot! (${min}')` },
    ],
    foul: [
      { title: '🟡 Yellow Card', desc: (team, player, min) => `${player} (${team}) receives a yellow card (${min}')` },
    ],
    substitution: [
      { title: '🔄 Substitution', desc: (team, player, min) => `${team} makes a substitution (${min}')` },
    ],
  };

  const VENUE_ALERTS = [
    { title: '🚗 Parking Update', desc: 'Lot B is now full. Overflow parking available at Lot F.', type: 'alert' },
    { title: '🌧️ Weather Notice', desc: 'Light rain expected in 30 minutes. Covered seating recommended.', type: 'alert' },
    { title: '🚶 Congestion Alert', desc: 'North Concourse experiencing high traffic. Consider South route.', type: 'alert' },
    { title: '🏥 Medical Station', desc: 'First aid available at all gate entrances. Dial *811 for assistance.', type: 'info' },
    { title: '📱 Wi-Fi Available', desc: 'Connect to VenueFlow-Guest for free high-speed internet.', type: 'info' },
  ];

  const PROMOS = [
    { title: '🎉 Happy Hour!', desc: '50% off craft beers at Stands 3, 7, and 9 for the next 15 minutes!', type: 'promo' },
    { title: '🍕 Pizza Deal', desc: 'Buy one, get one free on all pizza slices! Limited time.', type: 'promo' },
    { title: '👕 Merch Sale', desc: '20% off all jerseys at the East Team Store. While supplies last!', type: 'promo' },
    { title: '🎁 Fan Giveaway', desc: 'Section E row 12 — check under your seat for a special prize!', type: 'promo' },
  ];

  const PLAYERS = {
    home: ['Rodriguez', 'Martinez', 'Chen', 'Williams', 'Okafor', 'Kim', 'De Silva', 'Johansson'],
    away: ['Schmidt', 'Tanaka', 'Petrov', 'Dubois', 'Andersen', 'Costa', 'Ahmad', 'O\'Brien'],
  };

  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;
    render();
    startFeed();

    Utils.on('phaseChange', (phase) => {
      addFeedItem({
        title: `📢 ${phase.label}`,
        desc: `The match enters ${phase.label.toLowerCase()}`,
        type: 'info'
      });
    });
  }

  function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="scoreboard" id="scoreboard">
        <div class="scoreboard__teams">
          <div class="scoreboard__team">
            <div class="scoreboard__team-logo" style="background:${TEAMS.home.color}">${TEAMS.home.emoji}</div>
            <div class="scoreboard__team-name">${TEAMS.home.name}</div>
          </div>
          <div class="scoreboard__score">
            <span id="home-score">${homeScore}</span>
            <span class="scoreboard__separator">:</span>
            <span id="away-score">${awayScore}</span>
          </div>
          <div class="scoreboard__team">
            <div class="scoreboard__team-logo" style="background:${TEAMS.away.color}">${TEAMS.away.emoji}</div>
            <div class="scoreboard__team-name">${TEAMS.away.name}</div>
          </div>
        </div>
        <div class="scoreboard__info">
          <span class="scoreboard__minute">
            <span class="badge__dot"></span>
            <span id="match-minute">0'</span>
          </span>
            — <span id="match-phase">Pre-Game</span>
        </div>
      </div>
      <div class="section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        Live Feed
      </div>
      <div id="feed-list"></div>
    `;
  }

  function startFeed() {
    // Generate initial items
    addFeedItem({ title: '🏟️ Welcome!', desc: 'Welcome to the stadium! VenueFlow is tracking live conditions for you.', type: 'info' });

    // Add events periodically
    feedInterval = setInterval(() => {
      generateRandomEvent();
    }, 6000);

    // Update scoreboard with crowd data
    Utils.on('crowdUpdate', (data) => {
      const minuteEl = document.getElementById('match-minute');
      const phaseEl = document.getElementById('match-phase');
      if (minuteEl) minuteEl.textContent = Utils.formatMatchMinute(data.matchMinute);
      if (phaseEl) phaseEl.textContent = data.phase.label;
    });
  }

  function generateRandomEvent() {
    const currentPhase = CrowdSimulator.getCurrentPhase();
    if (currentPhase.id === 'pre-game' || currentPhase.id === 'post-game') {
      // More venue alerts during pre/post game
      if (Math.random() < 0.5) {
        addFeedItem(Utils.randomChoice(VENUE_ALERTS));
      } else {
        addFeedItem(Utils.randomChoice(PROMOS));
      }
      return;
    }

    const roll = Math.random();
    const matchMin = CrowdSimulator.getMatchMinute();

    if (roll < 0.12) {
      // Goal
      const isHome = Math.random() < 0.5;
      const team = isHome ? TEAMS.home : TEAMS.away;
      const player = Utils.randomChoice(isHome ? PLAYERS.home : PLAYERS.away);
      if (isHome) homeScore++; else awayScore++;

      const template = Utils.randomChoice(EVENT_TEMPLATES.goal);
      addFeedItem({
        title: template.title,
        desc: template.desc(team.name, player, matchMin),
        type: 'goal'
      });

      // Update scores
      updateScoreboard();

    } else if (roll < 0.25) {
      // Save
      const isHome = Math.random() < 0.5;
      const team = isHome ? TEAMS.home : TEAMS.away;
      const player = Utils.randomChoice(isHome ? PLAYERS.home : PLAYERS.away);
      const template = Utils.randomChoice(EVENT_TEMPLATES.save);
      addFeedItem({
        title: template.title,
        desc: template.desc(team.name, player, matchMin),
        type: 'info'
      });

    } else if (roll < 0.35) {
      // Foul
      const isHome = Math.random() < 0.5;
      const team = isHome ? TEAMS.home : TEAMS.away;
      const player = Utils.randomChoice(isHome ? PLAYERS.home : PLAYERS.away);
      const template = Utils.randomChoice(EVENT_TEMPLATES.foul);
      addFeedItem({
        title: template.title,
        desc: template.desc(team.short, player, matchMin),
        type: 'alert'
      });

    } else if (roll < 0.45) {
      // Substitution
      const isHome = Math.random() < 0.5;
      const team = isHome ? TEAMS.home : TEAMS.away;
      const template = Utils.randomChoice(EVENT_TEMPLATES.substitution);
      addFeedItem({
        title: template.title,
        desc: template.desc(team.name, '', matchMin),
        type: 'info'
      });

    } else if (roll < 0.65) {
      // Venue alert
      addFeedItem(Utils.randomChoice(VENUE_ALERTS));

    } else {
      // Promo
      addFeedItem(Utils.randomChoice(PROMOS));
    }
  }

  function addFeedItem(item) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    feedItems.unshift({
      ...item,
      time: timeStr,
      id: Date.now(),
    });

    // Keep feed to last 20 items
    if (feedItems.length > 20) feedItems = feedItems.slice(0, 20);

    renderFeedList();
  }

  function renderFeedList() {
    const listEl = document.getElementById('feed-list');
    if (!listEl) return;

    listEl.innerHTML = feedItems.map(item => {
      const iconClass = item.type === 'goal' ? 'feed-item__icon--goal' :
                        item.type === 'alert' ? 'feed-item__icon--alert' :
                        item.type === 'promo' ? 'feed-item__icon--promo' :
                        'feed-item__icon--info';
      return `
        <div class="feed-item">
          <div class="feed-item__icon ${iconClass}">
            ${item.title?.split(' ')[0] || 'ℹ️'}
          </div>
          <div class="feed-item__content">
            <div class="feed-item__title">${item.title}</div>
            <div class="feed-item__desc">${item.desc}</div>
          </div>
          <div class="feed-item__time">${item.time}</div>
        </div>
      `;
    }).join('');
  }

  function updateScoreboard() {
    const homeEl = document.getElementById('home-score');
    const awayEl = document.getElementById('away-score');
    if (homeEl) {
      homeEl.textContent = homeScore;
      homeEl.style.animation = 'scoreFlash 1s ease';
      setTimeout(() => homeEl.style.animation = '', 1000);
    }
    if (awayEl) {
      awayEl.textContent = awayScore;
      awayEl.style.animation = 'scoreFlash 1s ease';
      setTimeout(() => awayEl.style.animation = '', 1000);
    }
  }

  return { init };
})();
