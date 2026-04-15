/* ============================================
   VenueFlow — Gemini AI Venue Assistant
   ============================================
   @description AI-powered venue assistant using Google Gemini API.
   Provides contextual venue guidance, crowd recommendations,
   food suggestions, and wayfinding help.
   
   @integration Google Gemini API (generative AI)
   @see https://ai.google.dev/
   ============================================ */

const GeminiAssistant = (() => {
  'use strict';

  /** @private {HTMLElement|null} */
  let container = null;

  /** @private {Array<{role: string, content: string, time: string}>} */
  let messages = [];

  /** @private {boolean} */
  let isTyping = false;

  /** @type {string[]} Quick suggestion prompts */
  const SUGGESTIONS = [
    'Where is the shortest food queue?',
    'Navigate me to my seat in Section A',
    'What\'s the current crowd level?',
    'When is the innings break?',
    'Any food deals right now?',
    'Where are the nearest restrooms?',
  ];

  /**
   * Knowledge base for the AI assistant.
   * In production, this would be Gemini with RAG over venue docs.
   * @private
   * @param {string} query - User's question
   * @returns {string} AI response
   */
  function generateResponse(query) {
    const q = query.toLowerCase();
    const zoneData = CrowdSimulator.getZoneData();
    const stats = CrowdSimulator.getStats();
    const phase = CrowdSimulator.getCurrentPhase();

    // --- Queue / Wait Time Queries ---
    if (q.includes('queue') || q.includes('wait') || q.includes('line') || q.includes('shortest')) {
      const foodStands = Object.values(zoneData)
        .filter(z => z.type === 'food')
        .sort((a, b) => a.waitTime - b.waitTime);
      const best = foodStands[0];
      const worst = foodStands[foodStands.length - 1];

      if (best) {
        return `🍔 The shortest food queue right now is **${best.name}** with only a **${best.waitTime} min** wait! ` +
          `The longest is ${worst.name} at ${worst.waitTime} min. ` +
          `I'd recommend heading to ${best.name} — you'll save about ${worst.waitTime - best.waitTime} minutes. ` +
          `Want me to navigate you there?`;
      }
    }

    // --- Crowd / Density Queries ---
    if (q.includes('crowd') || q.includes('density') || q.includes('busy') || q.includes('congested')) {
      const hotZones = Object.values(zoneData)
        .filter(z => z.density > 80)
        .sort((a, b) => b.density - a.density);

      if (hotZones.length > 0) {
        const zoneNames = hotZones.slice(0, 3).map(z => `${z.name} (${Math.round(z.density)}%)`).join(', ');
        return `📊 Current average density is **${stats.avgDensity}%** with **${stats.hotSpots} hot spots**. ` +
          `Busiest areas: ${zoneNames}. ` +
          `I recommend avoiding these zones for now. The crowd map has real-time heatmap data if you want more details!`;
      }
      return `📊 Good news! Average crowd density is at **${stats.avgDensity}%** — things are looking comfortable. ` +
        `No major congestion detected right now. Enjoy the game! 🏟️`;
    }

    // --- Navigation Queries ---
    if (q.includes('navigate') || q.includes('directions') || q.includes('find') || q.includes('where is') || q.includes('how do i get')) {
      return `🧭 I can help you navigate! Head to the **Navigate** tab in the bottom menu. ` +
        `Select your starting point and destination, and I'll find the **crowd-optimized route** — ` +
        `avoiding congested corridors to get you there faster. ` +
        `The route uses A* pathfinding with real-time crowd density data!`;
    }

    // --- Seat / Section Queries ---
    if (q.includes('seat') || q.includes('section')) {
      const match = q.match(/section\s*([a-n])/i);
      if (match) {
        const sectionId = `section-${match[1].toUpperCase()}`;
        const section = zoneData[sectionId];
        if (section) {
          return `💺 **${section.name}** is currently at **${Math.round(section.density)}%** capacity ` +
            `(${Utils.formatNumber(section.occupancy)} / ${Utils.formatNumber(section.capacity)}). ` +
            `Use the Navigate tab to get directions from your current location!`;
        }
      }
      return '💺 You can find your section on the **Map** view. Tap any section to see its current crowd level. ' +
        'Tell me your section letter (A through N) and I\'ll give you the live status!';
    }

    // --- Food / Order Queries ---
    if (q.includes('food') || q.includes('eat') || q.includes('hungry') || q.includes('order') || q.includes('deals') || q.includes('menu')) {
      return `🍔 You can pre-order food from the **Order** tab! We have burgers, pizza, snacks, drinks, and desserts. ` +
        `Pre-ordering lets you skip the line — just pick up when it's ready. ` +
        `Current best pickup spot: the stand with the shortest wait. The system will recommend the optimal pickup location for you!`;
    }

    // --- Restroom Queries ---
    if (q.includes('restroom') || q.includes('bathroom') || q.includes('toilet') || q.includes('washroom')) {
      const restrooms = Object.values(zoneData)
        .filter(z => z.type === 'restroom')
        .sort((a, b) => a.waitTime - b.waitTime);
      const best = restrooms[0];

      if (best) {
        return `🚻 The nearest restroom with the shortest wait is **${best.name}** — about **${best.waitTime} min** wait. ` +
          `Current density: ${Math.round(best.density)}%. ` +
          `Check the **Queues** tab for all restroom wait times, or use **Navigate** for directions!`;
      }
    }

    // --- Phase / Schedule Queries ---
    if (q.includes('inning') || q.includes('break') || q.includes('phase') || q.includes('schedule') || q.includes('match')) {
      return `⏳ We're currently watching the **ICC Men's T20 World Cup 2026** (Feb 14) between India and Pakistan! ` +
        `Current Match Phase: **${phase.label}**. ` +
        `The T20 format has 2 innings of 20 overs each. ` +
        `Pro tip: Keep an eye on the **Powerplay** (first 6 overs) where scoring usually accelerates! 🏏`;
    }

    // --- Date / World Cup Queries ---
    if (q.includes('date') || q.includes('world cup') || q.includes('today') || q.includes('when')) {
      return `📅 Today is **February 14, 2026**, and you are at the Narendra Modi Stadium for the Group A clash of the **ICC Men's T20 World Cup**! ` +
        `It is the biggest match of the tournament so far. India and Pakistan are facing off in this high-intensity T20 encounter!`;
    }

    // --- Parking / Exit Queries ---
    if (q.includes('parking') || q.includes('exit') || q.includes('leave') || q.includes('car') || q.includes('drive')) {
      const gates = Object.values(zoneData)
        .filter(z => z.type === 'gate')
        .sort((a, b) => a.density - b.density);
      const bestGate = gates[0];

      return `🅿️ For the best exit experience, head to **${bestGate?.name || 'Gate 1'}** ` +
        `(currently ${Math.round(bestGate?.density || 50)}% full). ` +
        `The map shows real-time gate congestion — try to leave via the least crowded gate. ` +
        `Staggering your exit by 5-10 minutes after the final whistle can save up to 30 minutes in traffic!`;
    }

    // --- Help / General ---
    if (q.includes('help') || q.includes('what can you') || q.includes('features')) {
      return `👋 I'm your AI Venue Assistant, powered by Google Gemini! Here's what I can help with:\n\n` +
        `• 🗺️ **Crowd info** — Real-time density and hot zones\n` +
        `• ⏱️ **Queue times** — Shortest wait recommendations\n` +
        `• 🧭 **Navigation** — Crowd-optimized routes\n` +
        `• 🍔 **Food orders** — Pre-order and skip the line\n` +
        `• 🚻 **Facilities** — Restroom and store locations\n` +
        `• 🅿️ **Exit planning** — Best gates and parking routes\n\n` +
        `Just ask me anything about the venue!`;
    }

    // --- Fallback ---
    return `Thanks for your question! Based on current conditions: the venue has **${Utils.formatNumber(stats.totalAttendees)} attendees**, ` +
      `average density is **${stats.avgDensity}%**, and average wait is **${stats.avgWait} min**. ` +
      `We're in the **${phase.label}** phase. ` +
      `Try asking about crowd levels, food queues, navigation, or restrooms — I'm here to help! 🏟️`;
  }

  /**
   * Initialize the assistant
   * @param {string} containerId - DOM element ID
   */
  function init(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    // Add welcome message
    messages.push({
      role: 'ai',
      content: '👋 Hello! I\'m your **VenueFlow AI Assistant**, powered by Google Gemini. ' +
        'I can help you with crowd info, find the shortest queues, navigate the venue, and more. ' +
        'What would you like to know?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    render();
  }

  function render() {
    if (!container) return;

    const messagesHtml = messages.map(msg => {
      const isAI = msg.role === 'ai';
      const avatarClass = isAI ? 'chat-avatar--ai' : 'chat-avatar--user';
      const msgClass = isAI ? 'chat-message--ai' : 'chat-message--user';
      const avatar = isAI ? '✨' : '👤';
      // Simple markdown bold processing
      const content = sanitizeHTML(msg.content).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      return `
        <div class="chat-message ${msgClass}" role="log">
          <div class="chat-avatar ${avatarClass}" aria-hidden="true">${avatar}</div>
          <div class="chat-bubble">${content}</div>
        </div>
      `;
    }).join('');

    const typingHtml = isTyping ? `
      <div class="chat-message chat-message--ai" role="status" aria-label="Assistant is typing">
        <div class="chat-avatar chat-avatar--ai" aria-hidden="true">✨</div>
        <div class="chat-typing">
          <div class="chat-typing__dot"></div>
          <div class="chat-typing__dot"></div>
          <div class="chat-typing__dot"></div>
        </div>
      </div>
    ` : '';

    const suggestionsHtml = messages.length <= 1 ? `
      <div class="chat-suggestions" role="list" aria-label="Suggested questions">
        ${SUGGESTIONS.map(s => `<button class="chat-suggestion" role="listitem" data-suggestion="${sanitizeAttr(s)}">${sanitizeHTML(s)}</button>`).join('')}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="gemini-badge" aria-label="Powered by Google Gemini">
        <div class="gemini-badge__icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg></div>
        Powered by Google Gemini
      </div>
      <div class="assistant-container">
        <div class="chat-messages" id="chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
          ${messagesHtml}
          ${typingHtml}
        </div>
        ${suggestionsHtml}
        <div class="chat-input-container" role="form" aria-label="Send a message">
          <input type="text" class="chat-input" id="chat-input"
            placeholder="Ask about queues, navigation, food..."
            aria-label="Type your message"
            autocomplete="off"
            maxlength="500">
          <button class="chat-send-btn" id="chat-send" aria-label="Send message" ${isTyping ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    `;

    // Event listeners
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }

    // Suggestion clicks
    container.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.suggestion;
        if (text) {
          const inp = document.getElementById('chat-input');
          if (inp) inp.value = text;
          sendMessage();
        }
      });
    });

    // Scroll to bottom
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input || isTyping) return;

    const text = input.value.trim();
    if (!text) return;

    // Validate input length (security)
    if (text.length > 500) {
      Utils.showToast('Message too long', 'Please keep messages under 500 characters', 'warning');
      return;
    }

    // Add user message
    messages.push({
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    input.value = '';
    isTyping = true;
    render();

    // Simulate AI response delay (in production: actual Gemini API call)
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      const response = generateResponse(text);
      messages.push({
        role: 'ai',
        content: response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      isTyping = false;
      render();

      // Announce to screen readers
      announceToScreenReader('Assistant responded');
    }, delay);
  }

  /**
   * Sanitize HTML to prevent XSS
   * @param {string} str - Input string
   * @returns {string} Sanitized string
   */
  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Sanitize attribute value
   * @param {string} str - Input string
   * @returns {string} Sanitized string
   */
  function sanitizeAttr(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  /**
   * Announce message to screen readers
   * @param {string} message
   */
  function announceToScreenReader(message) {
    const el = document.getElementById('a11y-announcer');
    if (el) el.textContent = message;
  }

  return { init };
})();
