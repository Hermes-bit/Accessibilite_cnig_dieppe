/**
 * compass.js — Boussole dynamique (flèche Nord)
 * Se synchronise avec la rotation de la vue OpenLayers.
 */
(function () {
  "use strict";

  function _injectCSS() {
    var link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "apps/compass/compass.css";
    document.head.appendChild(link);
  }

  function _buildCompass() {
    var el = document.createElement("div");
    el.id = "cnig-compass";
    el.title = "Orientation Nord";
    el.innerHTML = [
      '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">',
      '  <!-- Fond blanc avec bordure -->',
      '  <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.95)" stroke="#e2e8f0" stroke-width="1.5"/>',
      '  <!-- Tirets cardinaux -->',
      '  <line x1="50" y1="6"  x2="50" y2="14" stroke="#cbd5e0" stroke-width="1.5" stroke-linecap="round"/>',
      '  <line x1="50" y1="86" x2="50" y2="94" stroke="#cbd5e0" stroke-width="1.5" stroke-linecap="round"/>',
      '  <line x1="6"  y1="50" x2="14" y2="50" stroke="#cbd5e0" stroke-width="1.5" stroke-linecap="round"/>',
      '  <line x1="86" y1="50" x2="94" y2="50" stroke="#cbd5e0" stroke-width="1.5" stroke-linecap="round"/>',
      '  <!-- Lettre N -->',
      '  <text x="50" y="20" text-anchor="middle" font-size="13" font-weight="700"',
      '        fill="#1a3a5c" font-family="system-ui,-apple-system,sans-serif">N</text>',
      '  <!-- Aiguille Nord (rouge) -->',
      '  <polygon points="50,27 44,52 50,47 56,52" fill="#e53e3e"/>',
      '  <!-- Aiguille Sud (gris) -->',
      '  <polygon points="50,73 44,48 50,53 56,48" fill="#a0aec0"/>',
      '  <!-- Centre -->',
      '  <circle cx="50" cy="50" r="4" fill="#1a3a5c"/>',
      '  <circle cx="50" cy="50" r="2" fill="#fff"/>',
      '</svg>',
    ].join("\n");
    document.body.appendChild(el);
    return el;
  }

  function _init() {
    _injectCSS();
    var el  = _buildCompass();
    var svg = el.querySelector("svg");

    var interval = setInterval(function () {
      if (window.mviewer && window.mviewer.getMap && window.mviewer.getMap()) {
        clearInterval(interval);
        var view = window.mviewer.getMap().getView();

        function _update() {
          /* view.getRotation() en radians, CCW positif.
             Le SVG tourne dans le même sens pour que N reste nord. */
          var deg = -(view.getRotation() * 180 / Math.PI);
          svg.style.transform = "rotate(" + deg + "deg)";
        }

        _update();
        view.on("change:rotation", _update);
      }
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _init);
  } else {
    setTimeout(_init, 600);
  }
})();
