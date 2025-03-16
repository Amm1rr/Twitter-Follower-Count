// ==UserScript==
// @name         Twitter Follower Count
// @namespace    amm1rr.com.twitter.follower.count
// @version      0.3.2
// @homepage     https://github.com/Amm1rr/Twitter-Follower-Count/
// @description  Display the number of followers for Twitter accounts
// @author       Mohammad Khani (@m_khani65)
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// @license      MIT
// @downloadURL  https://update.greasyfork.org/scripts/527217/Twitter%20Follower%20Count.user.js
// @updateURL    https://update.greasyfork.org/scripts/527217/Twitter%20Follower%20Count.meta.js
// ==/UserScript==

(function () {
  "use strict";

  /**
   * Cache to store user data to prevent redundant processing.
   * Key: screen_name, Value: user details object.
   * @type {Map<string, Object>}
   */
  const userCache = new Map();
  /**
   * Store reference to the original XMLHttpRequest.send method.
   */

  const originalSend = XMLHttpRequest.prototype.send;
  /**
   * Override XMLHttpRequest.send to intercept API responses.
   * Filters for responses from Twitter API endpoints and extracts user data,
   * caching the data if it's not already present.
   *
   * @param {...any} args - Arguments passed to the original send method.
   */

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      // Process only API responses relevant to Twitter data.
      if (!this.responseURL || !this.responseURL.includes("/i/api/")) return;

      let responseData;
      try {
        responseData = decodeResponse(this);
        if (!responseData) return;
      } catch (e) {
        console.error("Failed to decode response:", e);
        return;
      }

      try {
        const responseJSON = JSON.parse(responseData);
        const users = extractUsers(responseJSON, "screen_name");
        users.forEach((user) => {
          if (!user.screen_name || !user.followers_count) return; // Cache the user data if not already present.
          if (!userCache.has(user.screen_name)) {
            cacheUserData(user);
          }
        });
      } catch (e) {
        // Fail silently if JSON parsing fails.
      }
    });
    originalSend.apply(this, args);
  };
  /**
   * Decodes the XMLHttpRequest response based on its type.
   *
   * @param {XMLHttpRequest} xhr - The XMLHttpRequest object.
   * @returns {string|null} The decoded response data or null if decoding fails.
   */

  const decodeResponse = (xhr) => {
    if (xhr.responseType === "" || xhr.responseType === "text") {
      return xhr.responseText;
    } else if (xhr.responseType === "arraybuffer") {
      return new TextDecoder("utf-8").decode(xhr.response);
    }
    return null;
  };
  /**
   * Caches user data.
   *
   * @param {Object} user - The user data object from the API.
   */

  const cacheUserData = (user) => {
    userCache.set(user.screen_name, {
      name: user.name,
      screen_name: user.screen_name,
      followers_count: user.followers_count,
      formatted_followers_count: formatFollowers(user.followers_count),
      friends_count: user.friends_count,
    });
  };
  /**
   * Recursively traverse an object to extract all sub-objects containing a specific key.
   *
   * @param {Object} obj - The object to traverse.
   * @param {string} key - The key to search for (e.g., "screen_name").
   * @param {Array<Object>} [result=[]] - Array to accumulate found objects.
   * @returns {Array<Object>} Array of objects that contain the specified key.
   */

  const extractUsers = (obj, key, result = []) => {
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        if (value.hasOwnProperty(key)) {
          result.push(value);
        }
        extractUsers(value, key, result);
      }
    }
    return result;
  };
  /**
   * Format a number into a human-readable string with K/M suffix.
   *
   * @param {number} number - The number of followers.
   * @returns {string} Formatted number string.
   */

  const formatFollowers = (number) => {
    if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
    return number.toString();
  };
  /**
   * Create a DOM element (span) to display the formatted follower count.
   *
   * @param {string} formattedCount - The formatted follower count string.
   * @returns {HTMLElement} The created span element.
   */

  const createFollowerCountElement = (formattedCount) => {
    const span = document.createElement("span");
    span.className = "count-follower";
    span.innerText = formattedCount;
    Object.assign(span.style, {
      position: "absolute",
      bottom: "-2px",
      left: "50%",
      transform: "translate(-50%)",
      fontSize: "8px",
      fontWeight: "bold",
      color: "#ffffff",
      backgroundColor: "rgb(29, 155, 240)",
      border: "1px solid #0867d2",
      borderRadius: "9999px",
      padding: "0px 4px",
      whiteSpace: "nowrap",
    });
    return span;
  };
  /**
   * Update the DOM to display follower counts for all cached users.
   * It searches for profile links in the document and appends the follower count
   * element next to the profile image.
   */

  const updateFollowerCounts = () => {
    userCache.forEach((user, screen_name) => {
      const profileLinks = document.querySelectorAll(
        `a[href*="/${screen_name}"]` // Modified selector to be more robust
      );
      profileLinks.forEach((link) => {
        // Skip if follower count is already appended.
        if (link.querySelector(".count-follower")) return;
        const parent = link.parentNode;
        if (!parent) return;
        const img = parent.querySelector('img[draggable="true"]');
        if (!img) return; // Adjust styles for proper display.

        parent.style.overflow = "inherit";
        parent.style.clipPath = "none";
        const closestUl = parent.closest("ul");
        if (closestUl) {
          closestUl.style.overflow = "inherit";
        }

        const span = createFollowerCountElement(user.formatted_followers_count);
        link.appendChild(span);
      });
    });
  };
  /**
   * Debounce function to limit the rate at which a function is executed.
   *
   * @param {Function} func - The function to debounce.
   * @param {number} delay - The delay in milliseconds.
   * @returns {Function} A debounced version of the given function.
   */

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }; // Debounced version of updateFollowerCounts to reduce excessive calls.

  const debouncedUpdateFollowerCounts = debounce(updateFollowerCounts, 100); // Update follower counts on initial page load and during scroll events.

  window.addEventListener("load", debouncedUpdateFollowerCounts);
  document.addEventListener("scroll", debouncedUpdateFollowerCounts);
  /**
   * Use MutationObserver to monitor changes in the DOM.
   * This helps in detecting dynamically added elements (e.g., new user profiles)
   * and triggers an update to append follower counts accordingly.
   */

  const observer = new MutationObserver(debouncedUpdateFollowerCounts);
  observer.observe(document.body, { childList: true, subtree: true });
})();
