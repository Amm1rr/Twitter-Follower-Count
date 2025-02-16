// ==UserScript==
// @name         Twitter Follower Count
// @namespace    amm1rr.com.twitter.follower.count
// @version      0.3.0
// @homepage     https://github.com/Amm1rr/Twitter-Follower-Count/
// @description  Display the number of followers of X users
// @author       Mohammad Khani (Original Author Nabi K.A.Z. <nabikaz@gmail.com> | www.nabi.ir | @NabiKAZ)
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// @updateURL    https://github.com/Amm1rr/Twitter-Follower-Count/raw/main/Twitter-Follower-Count.user.js
// @downloadURL  https://github.com/Amm1rr/Twitter-Follower-Count/raw/main/Twitter-Follower-Count.user.js
// ==/UserScript==

(function () {
  "use strict";

  const userCache = new Map();
  const CSS_CLASS = "x-follower-count";
  let isUpdating = false;

  // Add global styles
  const style = document.createElement("style");
  style.textContent = `
    .${CSS_CLASS} {
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      font: bold 8px/1.2 sans-serif;
      color: #fff !important;
      background: rgb(29, 155, 240);
      border: 1px solid #0867d2;
      border-radius: 9999px;
      padding: 0 4px;
      white-space: nowrap;
      z-index: 999;
      pointer-events: none;
    }
    
    [data-follower-container] {
      position: relative !important;
      overflow: visible !important;
      clip-path: none !important;
    }
  `;
  document.head.appendChild(style);

  // XMLHttpRequest interception
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", handleXhrResponse, { once: true });
    originalSend.apply(this, args);
  };

  function handleXhrResponse() {
    try {
      const response =
        this.responseType === "arraybuffer"
          ? new TextDecoder("utf-8").decode(this.response)
          : this.responseText;

      if (!response) return;

      const data = JSON.parse(response);
      traverseAndCacheUsers(data);
    } catch (e) {
      // Ignore non-JSON responses
    }
  }

  function traverseAndCacheUsers(obj) {
    if (!obj || typeof obj !== "object") return;

    if (obj.screen_name && typeof obj.followers_count === "number") {
      const existing = userCache.get(obj.screen_name);
      if (!existing || existing.followers_count !== obj.followers_count) {
        userCache.set(obj.screen_name, {
          count: obj.followers_count,
          formatted: formatNumber(obj.followers_count),
        });
        scheduleUIUpdate();
      }
      return;
    }

    Object.values(obj).forEach((value) => {
      if (value && typeof value === "object") {
        traverseAndCacheUsers(value);
      }
    });
  }

  function formatNumber(num) {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  }

  // UI Update Logic
  function updateUI() {
    if (isUpdating) return;
    isUpdating = true;

    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      const path = link.getAttribute("href");
      if (!path || path.startsWith("/i/")) return;

      const screenName = path.split("/")[1]?.split("?")[0];
      if (!screenName) return;

      const userData = userCache.get(screenName);
      if (!userData) return;

      const container = link.closest('div[role="link"]');
      if (!container || container.querySelector(`.${CSS_CLASS}`)) return;

      container.setAttribute("data-follower-container", "");
      const badge = document.createElement("span");
      badge.className = CSS_CLASS;
      badge.textContent = userData.formatted;
      link.appendChild(badge);
    });

    isUpdating = false;
  }

  // Optimized update scheduling
  let updateTimer;
  function scheduleUIUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(updateUI, 300);
  }

  // Event Listeners
  new MutationObserver(scheduleUIUpdate).observe(document.body, {
    subtree: true,
    childList: true,
  });

  window.addEventListener("load", updateUI);
  document.addEventListener("scroll", () => requestAnimationFrame(updateUI), {
    passive: true,
  });
})();
