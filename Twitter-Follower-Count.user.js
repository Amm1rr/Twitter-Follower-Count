// ==UserScript==
// @name         Twitter Follower Count
// @namespace    amm1rr.com.twitter.follower.count
// @version      0.2.0
// @homepage     https://github.com/Amm1rr/Twitter-Follower-Count/
// @description  Display the number of followers of X users
// @author       Mohammad Khani (Original Author Nabi K.A.Z. <nabikaz@gmail.com> | www.nabi.ir | @NabiKAZ)
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Store user data with follower counts
  var allUsers = [];

  // Keep reference to the original XMLHttpRequest send method
  var originalSend = XMLHttpRequest.prototype.send;

  // Override the send method to intercept responses
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;

    xhr.addEventListener("load", function () {
      var responseData;

      try {
        // Handle different response types
        if (xhr.responseType === "" || xhr.responseType === "text") {
          responseData = xhr.responseText;
        } else if (xhr.responseType === "arraybuffer") {
          responseData = new TextDecoder("utf-8").decode(xhr.response);
        } else {
          return; // Ignore unsupported types
        }
      } catch (e) {
        console.error("Failed to decode response:", e);
        return;
      }

      try {
        var responseJSON = JSON.parse(responseData);
        var users = extractUsers(responseJSON, "screen_name");

        users.forEach(function (user) {
          if (!user.screen_name || !user.followers_count) return;

          var exists = allUsers.some((u) => u.screen_name === user.screen_name);
          if (!exists) {
            allUsers.push({
              name: user.name,
              screen_name: user.screen_name,
              followers_count: user.followers_count,
              formatted_followers_count: formatFollowers(user.followers_count),
                friends_count: user.friends_count,
            });
          }
        });
      } catch (e) {
        // Silently fail if JSON parsing fails
      }
    });

    originalSend.apply(xhr, arguments);
  };

  // Recursively search object properties for user data containing a specific key
  function extractUsers(obj, key, result = []) {
    for (var prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        if (typeof obj[prop] === "object" && obj[prop] !== null) {
          extractUsers(obj[prop], key, result);
        } else if (prop === key) {
          result.push(obj);
        }
      }
    }
    return result;
  }

  // Format large numbers with K/M suffix
  function formatFollowers(number) {
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + "M";
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + "K";
    }
    return number.toString();
  }

  // Update the follower count under profile images
  function updateFollowerCounts() {
    allUsers.forEach(function (user) {
      var profileLinks = document.querySelectorAll(
        'a[href="/' + user.screen_name + '"]'
      );

      profileLinks.forEach(function (link) {
        if (link.querySelector(".count-follower")) return;

        var parent = link.parentNode;
        if (!parent) return;

        var img = parent.querySelector('img[draggable="true"]');
        if (!img) return;

        parent.style.overflow = "inherit";
        parent.style.clipPath = "none";

        var closestUl = parent.closest("ul");
        if (closestUl) {
          closestUl.style.overflow = "inherit";
        }

        var span = document.createElement("span");
        span.className = "count-follower";
        span.innerText = user.formatted_followers_count;
        span.style.position = "absolute";
        span.style.bottom = "-2px";
        span.style.left = "50%";
        span.style.transform = "translate(-50%)";
        span.style.fontSize = "8px";
        span.style.fontWeight = "bold";
        span.style.color = "#ffffff";
        span.style.backgroundColor = "rgb(29, 155, 240)";
        span.style.border = "1px solid #0867d2";
        span.style.borderRadius = "9999px";
        span.style.padding = "0px 4px";
        span.style.whiteSpace = "nowrap";

        link.appendChild(span);
      });
    });
  }

  // Trigger follower count updates on page load and scroll
  window.addEventListener("load", updateFollowerCounts);
  document.addEventListener("scroll", updateFollowerCounts);
})();
