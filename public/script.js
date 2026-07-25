(function () {
  "use strict";

  var scriptEl = document.currentScript;
  // The tracked domain, e.g. <script data-domain="example.com" ...>
  var domain = scriptEl && scriptEl.getAttribute("data-domain");
  // API endpoint; defaults to the host that served this script.
  var endpoint =
    (scriptEl && scriptEl.getAttribute("data-api")) ||
    new URL(scriptEl.src).origin + "/api/event";

  if (!domain) {
    console.warn("[analytics] missing data-domain attribute");
    return;
  }

  // Respect Do Not Track and localhost by default (can be overridden).
  function ignore() {
    if (
      /^localhost$|^127\.|^\[::1\]?$/.test(location.hostname) &&
      !(scriptEl && scriptEl.hasAttribute("data-track-localhost"))
    ) {
      return "localhost";
    }
    if (window._phantom || window.__nightmare || window.navigator.webdriver) {
      return "automation";
    }
    return null;
  }

  function send(eventName) {
    var reason = ignore();
    if (reason) {
      console.info("[analytics] ignored:", reason);
      return;
    }
    var payload = {
      name: eventName,
      domain: domain,
      url: location.href,
      referrer: document.referrer || null,
      screen: window.innerWidth + "x" + window.innerHeight,
    };
    var body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, body);
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.setRequestHeader("Content-Type", "text/plain");
      xhr.send(body);
    }
  }

  var lastPath = null;
  function trackPageview() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    send("pageview");
  }

  // Patch history API to catch SPA route changes.
  var pushState = history.pushState;
  history.pushState = function () {
    pushState.apply(this, arguments);
    trackPageview();
  };
  window.addEventListener("popstate", trackPageview);

  // Track when the tab becomes visible if it was prerendered.
  if (document.visibilityState === "prerender") {
    document.addEventListener("visibilitychange", function onVisible() {
      if (document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", onVisible);
        trackPageview();
      }
    });
  } else {
    trackPageview();
  }

  // Expose a manual API for custom events.
  window.analytics = window.analytics || function (name) { send(name); };
})();
