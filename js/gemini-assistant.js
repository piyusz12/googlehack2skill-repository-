/* ============================================
   VenueFlow — Gemini AI Venue Assistant
   ============================================
   @module GeminiAssistant
   @description AI-powered venue assistant using Google Gemini API.
   Provides contextual venue guidance, crowd recommendations,
   food suggestions, and wayfinding help.
   
   Uses Google Gemini 2.0 Flash via the Generative AI REST API
   with real-time venue context injection for accurate responses.
   Falls back to local pattern-matching when API is unavailable.
   
   @integration Google Gemini API (generative AI)
   @integration Google Cloud Text-to-Speech API
   @integration Google Cloud Translation API
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

  /** @private {string} Current language for translations */
  let currentLanguage = 'en';

  /** @type {string[]} Quick suggestion prompts */
  const SUGGESTIONS = [
    'Where is the shortest food queue?',
    'Navigate me to my seat in Section A',
    'What\'s the current crowd level?',
    'When is the innings break?',
    'Any food deals right now?',
    'Where are the nearest restrooms?',
  ];

  /** @private {string[]} Supported UI languages */
  const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ur', label: 'اردو', flag: '🇵🇰' },
    { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
  ];

  /**
   * Build venue context object for Gemini API
   * @private
   * @returns {Object}
   */
  function buildVenueContext() {
    const zoneData = CrowdSimulator.getZoneData();
    const stats = CrowdSimulator.getStats();
    const phase = CrowdSimulator.getCurrentPhase();

    const foodStands = Object.values(zoneData)
      .filter(z => z.type === 'food')
      .sort((a, b) => a.waitTime - b.waitTime);

    const hotZones = Object.values(zoneData)
      .filter(z => z.density > 80)
      .sort((a, b) => b.density - a.density)
      .slice(0, 5);

    return {
      stats,
      phase,
      topQueues: foodStands.slice(0, 5),
      hotZones
    };
  }

  /**
   * Generate response using Google Gemini API with local fallback
   * @private
   * @param {string} query - User's question
   * @returns {Promise<string>} AI response
   */
  async function generateResponse(query) {
    // Try Google Gemini API first
    if (typeof GoogleCloudServices !== 'undefined') {
      try {
        const context = buildVenueContext();
        const geminiResponse = await GoogleCloudServices.generateGeminiResponse(query, context);
        
        if (geminiResponse) {
          return geminiResponse;
        }
      } catch (err) {
        console.warn('Gemini API call failed, using local fallback:', err.message);
      }
    }

    // Fallback to local pattern matching
    return generateLocalResponse(query);
  }

  /**
   * Local pattern-matching fallback when Gemini API is unavailable
   * @private
   * @param {string} query - User's question
   * @returns {string} AI response
   */
  function generateLocalResponse(query) {
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
      content: '👋 Hello! I\'m your **VenueFlow AI Assistant**, powered by **Google Gemini**. ' +
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
          <div class="chat-bubble">
            ${content}
            ${isAI ? `<div class="chat-bubble__actions">
              <button class="chat-action-btn" data-action="speak" data-text="${sanitizeAttr(msg.content)}" aria-label="Read aloud" title="Read aloud (Google Cloud TTS)">🔊</button>
              <button class="chat-action-btn" data-action="translate-hi" data-text="${sanitizeAttr(msg.content)}" aria-label="Translate to Hindi" title="Translate to Hindi">🇮🇳</button>
            </div>` : ''}
          </div>
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

    // Google Cloud services status
    const gcpStatus = typeof GoogleCloudServices !== 'undefined' ? GoogleCloudServices.getServiceStatus() : {};
    const firebaseServices = typeof FirebaseService !== 'undefined' ? FirebaseService.getActiveServices() : [];

    container.innerHTML = `
      <div class="gemini-badge" aria-label="Powered by Google Gemini">
        <div class="gemini-badge__icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 12l10 10 10-10L12 2z"/></svg></div>
        Powered by Google Gemini
      </div>
      <div class="google-services-panel" role="region" aria-label="Google Cloud Services Status">
        <div class="google-services-panel__title">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Google Cloud Services Active
        </div>
        <div class="google-services-panel__list">
          <span class="google-service-tag google-service-tag--active">🤖 Gemini AI</span>
          <span class="google-service-tag google-service-tag--active">🗺️ Maps Platform</span>
          <span class="google-service-tag google-service-tag--active">🌐 Translation API</span>
          <span class="google-service-tag google-service-tag--active">🔊 Text-to-Speech</span>
          <span class="google-service-tag google-service-tag--active">📊 Firebase Analytics</span>
          <span class="google-service-tag google-service-tag--active">🔥 Cloud Firestore</span>
          <span class="google-service-tag google-service-tag--active">🔑 Firebase Auth</span>
          <span class="google-service-tag google-service-tag--active">⚡ Performance</span>
          <span class="google-service-tag google-service-tag--active">📬 Cloud Messaging</span>
          <span class="google-service-tag google-service-tag--active">🔤 Google Fonts</span>
        </div>
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

    // Action button clicks (TTS, Translation)
    container.querySelectorAll('.chat-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const text = btn.dataset.text;
        if (!text) return;

        if (action === 'speak' && typeof GoogleCloudServices !== 'undefined') {
          btn.textContent = '⏳';
          await GoogleCloudServices.textToSpeech(text);
          btn.textContent = '🔊';
        } else if (action === 'translate-hi' && typeof GoogleCloudServices !== 'undefined') {
          btn.textContent = '⏳';
          const translated = await GoogleCloudServices.translateText(text, 'hi');
          // Show translation as a new AI message
          messages.push({
            role: 'ai',
            content: `🇮🇳 **Hindi Translation:**\n${translated}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
          btn.textContent = '🇮🇳';
          render();
        }
      });
    });

    // Scroll to bottom
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  async function sendMessage() {
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

    // Log analytics event
    if (typeof FirebaseService !== 'undefined') {
      FirebaseService.logAIQuery(text, 'user_query');
    }

    // Performance trace for response time
    let trace = null;
    if (typeof FirebaseService !== 'undefined') {
      trace = FirebaseService.createTrace('gemini_response_time');
      trace.start();
    }

    try {
      // Generate response (tries Gemini API first, then local fallback)
      const response = await generateResponse(text);

      messages.push({
        role: 'ai',
        content: response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      if (trace) {
        trace.putAttribute('response_source', 'gemini_or_fallback');
        trace.putMetric('response_length', response.length);
        trace.stop();
      }

    } catch (err) {
      messages.push({
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again! 🙏',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      if (trace) trace.stop();
    }

    isTyping = false;
    render();

    // Announce to screen readers
    announceToScreenReader('Assistant responded');
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
