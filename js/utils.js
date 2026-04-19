/* ============================================
   VenueFlow — Shared Utilities
   ============================================
   @module Utils
   @description Core utility functions for DOM manipulation,
   event management, formatting, and security helpers.
   @version 2.1.0
   @author VenueFlow Team
   ============================================ */

const Utils = (() => {
  'use strict';

  // --- DOM Helpers ---
  /** @param {string} sel - CSS selector @param {Element} ctx */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  /** @param {string} sel - CSS selector @param {Element} ctx */
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /**
   * Create a DOM element with attributes and children
   * @param {string} tag - HTML tag name
   * @param {Object} attrs - Attributes map
   * @param {Array} children - Child elements or text
   * @returns {HTMLElement}
   */
  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') el.className = v;
      else if (k === 'innerHTML') el.innerHTML = v;
      else if (k === 'textContent') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    return el;
  }

  // --- Security: HTML Escaping ---
  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} str - Raw string
   * @returns {string} Escaped string safe for innerHTML
   */
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Event Bus (Pub/Sub) ---
  /** @private */
  const _listeners = {};

  /** Subscribe to an event @returns {Function} unsubscribe */
  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
    return () => off(event, callback);
  }

  /** Unsubscribe from an event */
  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  }

  /** Emit an event to all subscribers */
  function emit(event, data) {
    if (!_listeners[event]) return;
    _listeners[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`Event handler error [${event}]:`, e); }
    });
  }

  // --- Number Formatting ---
  /** @param {number} n @returns {string} */
  function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }

  /** @param {number} n @returns {string} */
  function formatCurrency(n) {
    return '₹' + Math.round(n).toString();
  }

  /** @param {number} n @returns {string} */
  function formatPercent(n) {
    return Math.round(n) + '%';
  }

  // --- Time Formatting ---
  /** @param {number} minutes @returns {string} */
  function formatTime(minutes) {
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return Math.round(minutes) + ' min';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  }

  /** @param {number} minute @returns {string} */
  function formatMatchMinute(minute) {
    return minute + "'";
  }

  // --- Random Helpers ---
  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Clamp a value between min and max @returns {number} */
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // --- Throttle & Debounce ---
  /** @param {Function} fn @param {number} ms @returns {Function} */
  function throttle(fn, ms) {
    let last = 0;
    return function(...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  /** @param {Function} fn @param {number} ms @returns {Function} */
  function debounce(fn, ms) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // --- Toast Notification System ---
  /**
   * Show a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast body
   * @param {'info'|'success'|'warning'|'error'} type
   * @param {number} duration - Auto-dismiss ms
   */
  function showToast(title, message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };

    const toast = createElement('div', {
      className: `toast toast--${type}`,
      role: 'alert',
      'aria-live': 'assertive',
      innerHTML: `
        <span class="toast__icon" aria-hidden="true">${icons[type]}</span>
        <div class="toast__content">
          <div class="toast__title">${escapeHTML(title)}</div>
          <div class="toast__message">${escapeHTML(message)}</div>
        </div>
      `
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --- Density Helpers ---
  /** @param {number} percent @returns {'low'|'medium'|'high'|'critical'} */
  function getDensityLevel(percent) {
    if (percent < 40) return 'low';
    if (percent < 65) return 'medium';
    if (percent < 85) return 'high';
    return 'critical';
  }

  /** @param {number} percent @returns {string} CSS color */
  function getDensityColor(percent) {
    if (percent < 40) return '#34d399';
    if (percent < 65) return '#f7b84d';
    if (percent < 85) return '#fb923c';
    return '#f87171';
  }

  /** @param {number} trend @returns {string} Arrow character */
  function getTrendIcon(trend) {
    if (trend > 2) return '↑';
    if (trend < -2) return '↓';
    return '→';
  }

  /** @param {number} minutes @returns {'low'|'medium'|'high'|'critical'} */
  function getWaitColor(minutes) {
    if (minutes < 5) return 'low';
    if (minutes < 10) return 'medium';
    if (minutes < 15) return 'high';
    return 'critical';
  }

  // --- Lerp (Linear Interpolation) ---
  /** @param {number} start @param {number} end @param {number} t @returns {number} */
  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  return {
    $, $$, createElement, escapeHTML,
    on, off, emit,
    formatNumber, formatCurrency, formatPercent,
    formatTime, formatMatchMinute,
    randomBetween, randomInt, randomChoice, clamp,
    throttle, debounce,
    showToast,
    getDensityLevel, getDensityColor, getTrendIcon, getWaitColor,
    lerp
  };
})();
