/* ============================================
   VenueFlow — Live Event Feed & Scoreboard
   ============================================ */

const LiveFeed = (() => {
  let container = null;
  let feedItems = [];
  let homeRuns = 0;
  let homeWickets = 0;
  let homeOvers = 0;
  let homeBalls = 0;

  let awayRuns = 0;
  let awayWickets = 0;
  let awayOvers = 0;
  let awayBalls = 0;

  let currentStriker = '';
  let currentNonStriker = '';
  let currentBowler = '';

  let feedInterval = null;
  let matchTarget = null;
  let isMatchOver = false;
  
  // Drag state
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const TEAMS = {
    home: { name: 'India', short: 'IND', color: '#0000FF', emoji: '🇮🇳' },
    away: { name: 'Pakistan', short: 'PAK', color: '#006400', emoji: '🇵🇰' },
  };

  const EVENT_TEMPLATES = {
    boundary: [
      { title: '🏏 FOUR!', desc: (team, player, min) => `Great shot by ${player} for ${team}! (Min ${min})` },
      { title: '☄️ SIX!', desc: (team, player, min) => `Massive hit by ${player}! Into the stands! (Min ${min})` },
    ],
    wicket: [
      { title: '☝️ WICKET!', desc: (team, player, min) => `Got him! ${player} departs! Crucial breakthrough! (Min ${min})` },
      { title: '☝️ OUT!', desc: (team, player, min) => `Spectacular catch to dismiss ${player}! (Min ${min})` },
    ],
    review: [
      { title: '📺 DRS Review', desc: (team, player, min) => `${team} has taken a review for lbw against ${player}. (Min ${min})` },
    ],
    fifty: [
      { title: '👏 FIFTY!', desc: (team, player, min) => `Brilliant half-century for ${player}! The crowd erupts! (Min ${min})` },
    ],
  };

  const VENUE_ALERTS = [
    { title: '🚗 Parking Update', desc: 'VIP Lot 1 is full. Overflow parking available at Gate 4.', type: 'alert' },
    { title: '🌡️ Weather Notice', desc: 'Heat index rising. Stay hydrated, free water at Concourse E.', type: 'alert' },
    { title: '🚶 Congestion Alert', desc: 'Gate 2 experiencing high traffic. Consider Gate 5.', type: 'alert' },
    { title: '🏥 Medical Station', desc: 'First aid available at all gate entrances. Dial *811 for assistance.', type: 'info' },
    { title: '📱 Wi-Fi Available', desc: 'Connect to Jio-Stadium-Fi for free high-speed internet.', type: 'info' },
  ];

  const PROMOS = [
    { title: '☕ Happy Hour!', desc: '50% off cutting chai and samosas at Stands 3, 7, and 9 for the next 15 mins!', type: 'promo' },
    { title: '🍔 Snack Deal', desc: 'BOGO on Vada Pav at Stand 12! Limited time.', type: 'promo' },
    { title: '👕 Merch Sale', desc: '20% off all official IP jerseys at the East Team Store. While supplies last!', type: 'promo' },
    { title: '🎁 Fan Cam', desc: 'Look at the giant screen! Dance to win exclusive team merchandise!', type: 'promo' },
  ];

  const PLAYERS = {
    home: [
      { name: 'R. Sharma', role: 'Captain / opening Batter' },
      { name: 'S. Gill', role: 'Opening Batter' },
      { name: 'V. Kohli', role: 'Top order Batter' },
      { name: 'S. Iyer', role: 'Middle order Batter' },
      { name: 'KL. Rahul', role: 'Wicketkeeper Batter' },
      { name: 'H. Pandya', role: 'Allrounder' },
      { name: 'R. Jadeja', role: 'Allrounder' },
      { name: 'R. Ashwin', role: 'Allrounder' },
      { name: 'K. Yadav', role: 'Bowler' },
      { name: 'J. Bumrah', role: 'Bowler' },
      { name: 'M. Siraj', role: 'Bowler' },
    ],
    away: [
      { name: 'F. Zaman', role: 'Opening Batter' },
      { name: 'I. ul-Haq', role: 'Opening Batter' },
      { name: 'B. Azam', role: 'Captain / Top order Batter' },
      { name: 'M. Rizwan', role: 'Wicketkeeper Batter' },
      { name: 'S. Shakeel', role: 'Middle order Batter' },
      { name: 'I. Ahmed', role: 'Allrounder' },
      { name: 'S. Khan', role: 'Allrounder' },
      { name: 'M. Nawaz', role: 'Allrounder' },
      { name: 'S. Afridi', role: 'Bowler' },
      { name: 'H. Rauf', role: 'Bowler' },
      { name: 'N. Shah', role: 'Bowler' },
    ],
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

    // Draggable Functionality
    const floatEl = document.getElementById('floating-scoreboard');
    if (floatEl) {
      floatEl.addEventListener('mousedown', (e) => {
        // Don't start drag if clicking the toggle button
        if (e.target.closest('#fs-toggle-btn')) return;
        
        isDragging = true;
        
        // Get current position
        const rect = floatEl.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        floatEl.style.transition = 'none'; // Disable transition during drag
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        // Use fixed positioning with left/top for easier dragging
        floatEl.style.right = 'auto';
        floatEl.style.bottom = 'auto';
        floatEl.style.left = `${x}px`;
        floatEl.style.top = `${y}px`;
      });

      window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        floatEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      });

      // Toggle functionality (moved inside floatEl check for efficiency)
      floatEl.addEventListener('click', (e) => {
        if (e.target.closest('#fs-toggle-btn')) {
          floatEl.classList.toggle('hidden');
          floatEl.classList.toggle('collapsed-by-user');
        }
      });
    }
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
            <span id="home-score">${homeRuns}/${homeWickets}</span>
            <span class="scoreboard__separator">v</span>
            <span id="away-score">${awayRuns}/${awayWickets}</span>
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
      
      <div class="lineups-section">
        <div class="section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Team Lineups
        </div>
        <div class="lineups-grid">
          <div class="lineup-team">
            <h3 class="lineup-team__title" style="color: ${TEAMS.home.color}">${TEAMS.home.emoji} ${TEAMS.home.name}</h3>
            <div class="lineup-list">
              ${PLAYERS.home.map(p => `
                <div class="lineup-item">
                  <span class="lineup-item__name">${p.name}</span>
                  <span class="lineup-item__role">${p.role}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="lineup-team">
            <h3 class="lineup-team__title" style="color: ${TEAMS.away.color}">${TEAMS.away.emoji} ${TEAMS.away.name}</h3>
            <div class="lineup-list">
              ${PLAYERS.away.map(p => `
                <div class="lineup-item">
                  <span class="lineup-item__name">${p.name}</span>
                  <span class="lineup-item__role">${p.role}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function advanceBall(isHomeBatting) {
    const o = isHomeBatting ? homeOvers : awayOvers;
    const b = isHomeBatting ? homeBalls : awayBalls;
    
    // Hard stop at 20 overs
    if (o >= 20) return;

    if (isHomeBatting) {
      homeBalls++;
      if (homeBalls >= 6) {
        homeOvers++;
        homeBalls = 0;
        const bowlerPool = PLAYERS.away.slice(5, 11);
        currentBowler = Utils.randomChoice(bowlerPool).name;
        let temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    } else {
      awayBalls++;
      if (awayBalls >= 6) {
        awayOvers++;
        awayBalls = 0;
        const bowlerPool = PLAYERS.home.slice(5, 11);
        currentBowler = Utils.randomChoice(bowlerPool).name;
        let temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    }
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
    if (isMatchOver) return;
    
    const currentPhase = CrowdSimulator.getCurrentPhase();
    if (currentPhase.id === 'pre-game' || currentPhase.id === 'post-game') {
      if (Math.random() < 0.5) addFeedItem(Utils.randomChoice(VENUE_ALERTS));
      else addFeedItem(Utils.randomChoice(PROMOS));
      return;
    }
    
    if (currentPhase.id === 'halftime') {
       // Set target if first inning just finished
       if (matchTarget === null) {
         matchTarget = homeRuns + 1;
         addFeedItem({ title: '🎯 TARGET SET', desc: `${TEAMS.away.name} needs ${matchTarget} runs to win in 20 overs!`, type: 'info' });
       }
       return;
    }

    const isHomeBatting = currentPhase.id === 'first-half';
    const team = isHomeBatting ? TEAMS.home : TEAMS.away;
    const matchMin = CrowdSimulator.getMatchMinute();

    // End of 1st Inning check
    if (isHomeBatting && (homeOvers >= 20 || homeWickets >= 10)) {
      return; 
    }
    
    // 2nd Inning victory/end check
    if (!isHomeBatting) {
      if (awayRuns >= matchTarget) {
        isMatchOver = true;
        addFeedItem({ title: '🏆 PAKISTAN WINS!', desc: `${TEAMS.away.name} chased down the target with ${10 - awayWickets} wickets in hand!`, type: 'info' });
        return;
      }
      if (awayOvers >= 20 || awayWickets >= 10) {
        isMatchOver = true;
        addFeedItem({ title: '🏆 INDIA WINS!', desc: `${TEAMS.home.name} defended ${matchTarget-1}! ${TEAMS.away.name} falls short.`, type: 'info' });
        return;
      }
    }

    if (!currentStriker) currentStriker = (isHomeBatting ? PLAYERS.home[0] : PLAYERS.away[0]).name;
    if (!currentBowler) currentBowler = (isHomeBatting ? PLAYERS.away[10] : PLAYERS.home[10]).name;
    if (!currentNonStriker) currentNonStriker = (isHomeBatting ? PLAYERS.home[1] : PLAYERS.away[1]).name;

    const currentOversFloat = isHomeBatting ? (homeOvers + homeBalls/6) : (awayOvers + awayBalls/6);
    const isPowerplay = currentOversFloat < 6;

    advanceBall(isHomeBatting);
    const roll = Math.random();

    // Adjusted probabilities for Powerplay and T20 intensity
    const boundaryProb = isPowerplay ? 0.22 : 0.15;
    const wicketProb = isPowerplay ? 0.08 : 0.07;

    if (roll < boundaryProb) {
      const isSix = Math.random() < 0.4;
      if (isHomeBatting) homeRuns += (isSix ? 6 : 4);
      else awayRuns += (isSix ? 6 : 4);
      const hitType = isSix ? EVENT_TEMPLATES.boundary[1] : EVENT_TEMPLATES.boundary[0];
      
      addFeedItem({ title: hitType.title, desc: hitType.desc(team.name, currentStriker, matchMin), type: 'goal' });
    } else if (roll < boundaryProb + wicketProb) {
      if (isHomeBatting) {
        if (homeWickets < 10) { 
          homeWickets++; 
          if(homeWickets < 10) currentStriker = PLAYERS.home[homeWickets + 1].name; 
        }
      } else {
        if (awayWickets < 10) { 
          awayWickets++; 
          if(awayWickets < 10) currentStriker = PLAYERS.away[awayWickets + 1].name; 
        }
      }
      const template = Utils.randomChoice(EVENT_TEMPLATES.wicket);
      addFeedItem({ title: template.title, desc: template.desc(team.name, currentStriker, matchMin), type: 'alert' });
    } else {
      const runs = Math.random() < 0.5 ? 1 : (Math.random() < 0.4 ? 2 : 0);
      if (isHomeBatting) homeRuns += runs;
      else awayRuns += runs;
      if (runs === 1) {
        let temp = currentStriker;
        currentStriker = currentNonStriker;
        currentNonStriker = temp;
      }
    }
    
    updateScoreboard();
  }

  function addFeedItem(item) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const o = (CrowdSimulator.getCurrentPhase().id === 'first-half') ? homeOvers : awayOvers;
    const b = (CrowdSimulator.getCurrentPhase().id === 'first-half') ? homeBalls : awayBalls;

    feedItems.unshift({
      ...item,
      time: timeStr,
      over: o,
      ball: b,
      striker: currentStriker,
      bowler: currentBowler,
      id: Date.now(),
    });

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
      const cricketContext = item.type === 'goal' || item.type === 'alert' || item.type === 'info' && item.title.includes('TARGET') 
        ? `<div class="feed-item__cricket-meta">
             <span class="feed-item__over-ball">Over ${item.over}.${item.ball}</span>
             ${item.striker ? `<span class="feed-item__players">${item.striker} v ${item.bowler}</span>` : ''}
           </div>` 
        : '';

      return `
        <div class="feed-item">
          <div class="feed-item__icon ${iconClass}">
            ${item.title?.split(' ')[0] || 'ℹ️'}
          </div>
          <div class="feed-item__content">
            <div class="feed-item__title">${item.title}</div>
            <div class="feed-item__desc">${item.desc}</div>
            ${cricketContext}
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
      homeEl.textContent = `${homeRuns}/${homeWickets}`;
      homeEl.style.animation = 'scoreFlash 1s ease';
      setTimeout(() => homeEl.style.animation = '', 1000);
    }
    if (awayEl) {
      awayEl.textContent = `${awayRuns}/${awayWickets}`;
      awayEl.style.animation = 'scoreFlash 1s ease';
      setTimeout(() => awayEl.style.animation = '', 1000);
    }

    const floatEl = document.getElementById('floating-scoreboard');
    if (floatEl) {
      const currentPhase = CrowdSimulator.getCurrentPhase();
      if(currentPhase.id === 'pre-game' || currentPhase.id === 'post-game') {
        floatEl.classList.add('hidden');
        return;
      } else {
        floatEl.classList.remove('hidden');
      }

      const isHomeBatting = currentPhase.id !== 'second-half';
      const btTm = isHomeBatting ? TEAMS.home : TEAMS.away;
      const r = isHomeBatting ? homeRuns : awayRuns;
      const w = isHomeBatting ? homeWickets : awayWickets;
      const o = isHomeBatting ? homeOvers : awayOvers;
      const b = isHomeBatting ? homeBalls : awayBalls;

      const currentOversFloat = isHomeBatting ? (homeOvers + homeBalls/6) : (awayOvers + awayBalls/6);
      const crr = currentOversFloat > 0 ? (r / currentOversFloat).toFixed(2) : '0.00';
      const isPowerplay = currentOversFloat < 6 && currentPhase.id !== 'halftime';
      
      let rrrDisplay = '';
      if (!isHomeBatting && matchTarget !== null && !isMatchOver) {
        const remainingBalls = 120 - (awayOvers * 6 + awayBalls);
        if (remainingBalls > 0) {
           rrrDisplay = `<span><strong>RRR:</strong> ${((matchTarget - awayRuns) / (remainingBalls / 6)).toFixed(2)}</span>`;
        }
      }

      const htmlContent = `
        <div class="floating-scoreboard__header">
          <div style="display:flex; flex-direction:column">
            <span style="font-size:10px; opacity:0.7; text-transform:uppercase; letter-spacing:1px">T20 World Cup 2026</span>
            <span style="font-weight:700">Live Match</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px">
            ${isPowerplay ? '<span class="badge badge--powerplay">Powerplay</span>' : ''}
            <button class="floating-scoreboard__toggle" id="fs-toggle-btn" aria-label="Toggle widget">—</button>
          </div>
        </div>
        <div class="floating-scoreboard__score">
          ${btTm.short} ${r}/${w} <span class="floating-scoreboard__overs">(${o}.${b})</span>
        </div>
        ${!isHomeBatting && matchTarget ? `<div class="floating-scoreboard__target">Target: ${matchTarget}</div>` : ''}
        <div class="floating-scoreboard__players">
          <span><strong>Batting:</strong> ${currentStriker}* & ${currentNonStriker}</span>
          <span><strong>Bowling:</strong> ${currentBowler}</span>
        </div>
        <div class="floating-scoreboard__stats">
          <span><strong>CRR:</strong> ${crr}</span>
          ${rrrDisplay}
        </div>
      `;

      // Prevent rebuilding DOM to allow toggle collapsing to stay active
      if(floatEl.innerHTML !== htmlContent && !floatEl.classList.contains('collapsed-by-user')) {
        floatEl.innerHTML = htmlContent;
      } else if (!floatEl.children.length) {
        floatEl.innerHTML = htmlContent;
      } else {
        const scoreDiv = floatEl.querySelector('.floating-scoreboard__score');
        const playDiv = floatEl.querySelector('.floating-scoreboard__players');
        const statsDiv = floatEl.querySelector('.floating-scoreboard__stats');
        const targetDiv = floatEl.querySelector('.floating-scoreboard__target');
        const headerDiv = floatEl.querySelector('.floating-scoreboard__header');

        if(headerDiv) {
           const ppBadge = isPowerplay ? '<span class="badge badge--powerplay">Powerplay</span>' : '';
           const toggleBtn = '<button class="floating-scoreboard__toggle" id="fs-toggle-btn" aria-label="Toggle widget">—</button>';
           headerDiv.querySelector('div:last-child').innerHTML = `${ppBadge}${toggleBtn}`;
        }

        if(scoreDiv) scoreDiv.innerHTML = `${btTm.short} ${r}/${w} <span class="floating-scoreboard__overs">(${o}.${b})</span>`;
        if(playDiv) playDiv.innerHTML = `<span><strong>Batting:</strong> ${currentStriker}* & ${currentNonStriker}</span><span><strong>Bowling:</strong> ${currentBowler}</span>`;
        if(statsDiv) statsDiv.innerHTML = `<span><strong>CRR:</strong> ${crr}</span>${rrrDisplay}`;
        if(targetDiv) targetDiv.textContent = `Target: ${matchTarget}`;
      }
    }
  }

  return { init };
})();
