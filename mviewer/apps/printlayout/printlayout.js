/**
 * printlayout.js — Mise en page & rapports terrain
 * CNIG Accessibilité Dieppe
 * Onglets : Impression | Rapport terrain | Fiche de zone
 */
(function () {
  "use strict";

  var LS_RAPPORTS = "cnig_rapports_terrain";
  var LS_ZONES    = "cnig_fiches_zone";
  var LS_ACCESS   = "ua_access_token";

  /* ── Stockage local ──────────────────────────────────────── */
  function _load(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; }
  }
  function _save(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
  function _getToken() { return localStorage.getItem(LS_ACCESS) || null; }

  /* ── CSS ─────────────────────────────────────────────────── */
  (function () {
    var link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "apps/printlayout/printlayout.css";
    document.head.appendChild(link);
  })();

  /* ── Panel HTML ──────────────────────────────────────────── */
  function _buildPanel() {
    if (document.getElementById("pl-overlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "pl-overlay";

    overlay.innerHTML = [
      '<div id="pl-panel">',

      /* Header */
      '  <div id="pl-header">',
      '    <i class="fas fa-print"></i>',
      '    <h2>Mise en page terrain</h2>',
      '    <button id="pl-close" title="Fermer">&times;</button>',
      '  </div>',

      /* Tabs */
      '  <div id="pl-tabs">',
      '    <button class="pl-tab active" data-tab="print"><i class="fas fa-print"></i> Impression</button>',
      '    <button class="pl-tab" data-tab="rapport"><i class="fas fa-clipboard-check"></i> Rapport</button>',
      '    <button class="pl-tab" data-tab="zone"><i class="fas fa-draw-polygon"></i> Zone</button>',
      '  </div>',

      '  <div id="pl-body">',

      /* ── TAB IMPRESSION ── */
      '    <div id="pl-tab-print" class="pl-tab-content active">',
      '      <div class="pl-group"><label>Titre de la fiche</label>',
      '        <input id="pl-title" type="text" value="Accessibilité CNIG — Dieppe"/>',
      '      </div>',
      '      <div class="pl-group"><label>Nom de l\'agent</label>',
      '        <input id="pl-agent" type="text" placeholder="Prénom Nom"/>',
      '      </div>',
      '      <div class="pl-group"><label>Notes / objectifs du jour</label>',
      '        <textarea id="pl-notes" placeholder="Zones à contrôler, points d\'attention…"></textarea>',
      '      </div>',
      '      <div class="pl-group"><label>Format</label>',
      '        <div class="pl-orient-row">',
      '          <button class="pl-orient-btn active" data-orient="portrait"><i class="fas fa-file"></i> Portrait A4</button>',
      '          <button class="pl-orient-btn" data-orient="landscape"><i class="fas fa-file" style="transform:rotate(-90deg)"></i> Paysage A4</button>',
      '        </div>',
      '      </div>',
      '      <div class="pl-group"><label>Éléments à inclure</label>',
      '        <div class="pl-checks">',
      '          <label class="pl-check"><input type="checkbox" id="pl-inc-north" checked> Flèche Nord</label>',
      '          <label class="pl-check"><input type="checkbox" id="pl-inc-scale" checked> Échelle</label>',
      '          <label class="pl-check"><input type="checkbox" id="pl-inc-date"  checked> Date</label>',
      '          <label class="pl-check"><input type="checkbox" id="pl-inc-logo"  checked> Logo CNIG</label>',
      '        </div>',
      '      </div>',
      '      <button id="pl-print-btn" class="pl-btn"><i class="fas fa-print"></i> Imprimer / Exporter PDF</button>',
      '    </div>',

      /* ── TAB RAPPORT TERRAIN ── */
      '    <div id="pl-tab-rapport" class="pl-tab-content">',
      '      <div class="pl-group"><label>Date et heure</label>',
      '        <input id="pl-rdate" type="datetime-local"/>',
      '      </div>',
      '      <div class="pl-group"><label>Agent</label>',
      '        <input id="pl-ragent" type="text" placeholder="Prénom Nom"/>',
      '      </div>',
      '      <div class="pl-group"><label>Type d\'observation</label>',
      '        <select id="pl-rtype">',
      '          <option value="cheminement">Cheminement / tronçon</option>',
      '          <option value="obstacle">Obstacle</option>',
      '          <option value="equipement">Équipement (rampe, escalier…)</option>',
      '          <option value="traversee">Traversée piétonne</option>',
      '          <option value="stationnement">Stationnement PMR</option>',
      '          <option value="autre">Autre</option>',
      '        </select>',
      '      </div>',
      '      <div class="pl-group">',
      '        <label>Localisation <button id="pl-gps-btn" class="pl-micro-btn" title="Ma position GPS"><i class="fas fa-crosshairs"></i></button></label>',
      '        <input id="pl-rloc" type="text" placeholder="ex: Rue Jean Ribaut n°12"/>',
      '      </div>',
      '      <div class="pl-group"><label>Sévérité</label>',
      '        <div class="pl-sev-row">',
      '          <button class="pl-sev" data-sev="bloquant">🔴 Bloquant</button>',
      '          <button class="pl-sev" data-sev="majeur">🟠 Majeur</button>',
      '          <button class="pl-sev active" data-sev="mineur">🔵 Mineur</button>',
      '          <button class="pl-sev" data-sev="amelioration">🟢 Amélioration</button>',
      '        </div>',
      '      </div>',
      '      <div class="pl-group"><label>Description *</label>',
      '        <textarea id="pl-rdesc" placeholder="Décrivez l\'anomalie, les mesures relevées, les conditions…"></textarea>',
      '      </div>',
      '      <div class="pl-group"><label>Photo(s) <span style="font-size:10px;color:#94a3b8;font-weight:400">(optionnel)</span></label>',
      '        <input id="pl-rphoto" type="file" accept="image/*" multiple capture="environment" class="pl-file-input"/>',
      '        <div id="pl-photo-preview" class="pl-photo-row"></div>',
      '      </div>',
      '      <div id="pl-msg-rapport" class="pl-msg"></div>',
      '      <button id="pl-save-rapport" class="pl-btn"><i class="fas fa-save"></i> Enregistrer l\'observation</button>',
      '      <div class="pl-list-wrap">',
      '        <div class="pl-list-title">Observations enregistrées</div>',
      '        <div id="pl-rapport-items"></div>',
      '      </div>',
      '    </div>',

      /* ── TAB FICHE DE ZONE ── */
      '    <div id="pl-tab-zone" class="pl-tab-content">',
      '      <div class="pl-group"><label>Nom de la zone / secteur</label>',
      '        <input id="pl-zname" type="text" placeholder="ex: Secteur Nord — Place du Puits-Salé"/>',
      '      </div>',
      '      <div class="pl-group"><label>Agent responsable</label>',
      '        <input id="pl-zagent" type="text" placeholder="Prénom Nom"/>',
      '      </div>',
      '      <div class="pl-group"><label>Date de contrôle</label>',
      '        <input id="pl-zdate" type="date"/>',
      '      </div>',
      '      <div class="pl-group"><label>Délimiter la zone sur la carte</label>',
      '        <div>',
      '          <button id="pl-draw-zone" class="pl-btn-outline"><i class="fas fa-draw-polygon"></i> Tracer la zone</button>',
      '          <button id="pl-clear-zone" class="pl-btn-outline pl-btn-danger" style="display:none"><i class="fas fa-times"></i> Effacer</button>',
      '        </div>',
      '        <div id="pl-zone-hint" class="pl-zone-hint">Cliquez sur le bouton puis tracez un polygone sur la carte</div>',
      '      </div>',
      '      <div class="pl-group"><label>Tâches à effectuer</label>',
      '        <div class="pl-checks" style="flex-direction:column;gap:5px">',
      '          <label class="pl-check"><input type="checkbox" name="ztask" value="cheminements"> Vérifier les cheminements</label>',
      '          <label class="pl-check"><input type="checkbox" name="ztask" value="traversees"> Vérifier les traversées</label>',
      '          <label class="pl-check"><input type="checkbox" name="ztask" value="stationnements"> Vérifier les stationnements PMR</label>',
      '          <label class="pl-check"><input type="checkbox" name="ztask" value="equipements"> Vérifier les équipements</label>',
      '          <label class="pl-check"><input type="checkbox" name="ztask" value="photos"> Prendre des photos</label>',
      '          <label class="pl-check"><input type="checkbox" name="ztask" value="mesures"> Effectuer des mesures</label>',
      '        </div>',
      '      </div>',
      '      <div class="pl-group"><label>Observations / priorités</label>',
      '        <textarea id="pl-znotes" placeholder="Points d\'attention, contexte, historique…"></textarea>',
      '      </div>',
      '      <div id="pl-msg-zone" class="pl-msg"></div>',
      '      <button id="pl-save-zone" class="pl-btn"><i class="fas fa-save"></i> Enregistrer la fiche</button>',
      '      <div class="pl-list-wrap">',
      '        <div class="pl-list-title">Fiches de zone</div>',
      '        <div id="pl-zone-items"></div>',
      '      </div>',
      '    </div>',

      '  </div>', /* #pl-body */
      '</div>',   /* #pl-panel */
    ].join("\n");

    document.body.appendChild(overlay);
    _bindEvents();
  }

  /* ── État interne ────────────────────────────────────────── */
  var _currentSev    = "mineur";
  var _printOrient   = "portrait";
  var _map           = null;
  var _drawInteract  = null;
  var _drawSource    = null;
  var _drawLayer     = null;
  var _zoneFeature   = null;

  /* ── Bind events ─────────────────────────────────────────── */
  function _bindEvents() {
    document.getElementById("pl-close").addEventListener("click", _close);
    document.getElementById("pl-overlay").addEventListener("click", function (e) {
      if (e.target === this) _close();
    });

    /* Onglets */
    document.querySelectorAll(".pl-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pl-tab").forEach(function (b) { b.classList.remove("active"); });
        document.querySelectorAll(".pl-tab-content").forEach(function (c) { c.classList.remove("active"); });
        btn.classList.add("active");
        document.getElementById("pl-tab-" + btn.dataset.tab).classList.add("active");
      });
    });

    /* Orientation */
    document.querySelectorAll(".pl-orient-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pl-orient-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        _printOrient = btn.dataset.orient;
      });
    });

    /* Sévérité */
    document.querySelectorAll(".pl-sev").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".pl-sev").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        _currentSev = btn.dataset.sev;
      });
    });

    /* GPS */
    document.getElementById("pl-gps-btn").addEventListener("click", _getGPS);

    /* Aperçu photos */
    document.getElementById("pl-rphoto").addEventListener("change", _previewPhotos);

    /* Impression */
    document.getElementById("pl-print-btn").addEventListener("click", _doPrint);

    /* Rapport */
    document.getElementById("pl-save-rapport").addEventListener("click", _saveRapport);

    /* Zone */
    document.getElementById("pl-draw-zone").addEventListener("click", _startDraw);
    document.getElementById("pl-clear-zone").addEventListener("click", _clearZone);
    document.getElementById("pl-save-zone").addEventListener("click", _saveZone);

    /* Pré-remplissage date/heure */
    var now = new Date();
    var p   = function (n) { return String(n).padStart(2, "0"); };
    document.getElementById("pl-rdate").value =
      now.getFullYear() + "-" + p(now.getMonth() + 1) + "-" + p(now.getDate()) +
      "T" + p(now.getHours()) + ":" + p(now.getMinutes());
    document.getElementById("pl-zdate").value =
      now.getFullYear() + "-" + p(now.getMonth() + 1) + "-" + p(now.getDate());

    _renderRapports();
    _renderZones();
  }

  /* ── GPS ─────────────────────────────────────────────────── */
  function _getGPS() {
    if (!navigator.geolocation) return;
    var btn = document.getElementById("pl-gps-btn");
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition(function (pos) {
      document.getElementById("pl-rloc").value =
        "GPS : " + pos.coords.latitude.toFixed(5) + ", " + pos.coords.longitude.toFixed(5);
      btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
    }, function () {
      btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
    });
  }

  /* ── Aperçu photos ───────────────────────────────────────── */
  function _previewPhotos() {
    var preview = document.getElementById("pl-photo-preview");
    preview.innerHTML = "";
    var files = document.getElementById("pl-rphoto").files;
    for (var i = 0; i < files.length; i++) {
      (function (file) {
        var reader = new FileReader();
        reader.onload = function (e) {
          var img = document.createElement("img");
          img.src = e.target.result;
          img.className = "pl-photo-thumb";
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
  }

  /* ── Impression ──────────────────────────────────────────── */
  function _doPrint() {
    var title    = document.getElementById("pl-title").value  || "Accessibilité CNIG — Dieppe";
    var agent    = document.getElementById("pl-agent").value  || "";
    var notes    = document.getElementById("pl-notes").value  || "";
    var incNorth = document.getElementById("pl-inc-north").checked;
    var incScale = document.getElementById("pl-inc-scale").checked;
    var incDate  = document.getElementById("pl-inc-date").checked;
    var incLogo  = document.getElementById("pl-inc-logo").checked;

    var now = new Date().toLocaleDateString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    /* Capture du canvas OL */
    var mapSrc = "";
    try {
      var canvas = document.querySelector(".ol-viewport canvas");
      if (canvas) mapSrc = canvas.toDataURL("image/png");
    } catch (e) { /* canvas tainted (tiles CORS) */ }

    var scaleText = "";
    var scaleEl = document.querySelector(".ol-scale-bar-inner, .ol-scale-line-inner");
    if (incScale && scaleEl) scaleText = scaleEl.textContent.trim();

    var northSVG = incNorth ? [
      '<svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">',
      '<circle cx="50" cy="50" r="48" fill="none" stroke="#e2e8f0" stroke-width="2"/>',
      '<text x="50" y="20" text-anchor="middle" font-size="13" font-weight="700" fill="#1a3a5c" font-family="Arial">N</text>',
      '<polygon points="50,27 44,52 50,47 56,52" fill="#e53e3e"/>',
      '<polygon points="50,73 44,48 50,53 56,48" fill="#a0aec0"/>',
      '<circle cx="50" cy="50" r="4" fill="#1a3a5c"/>',
      '</svg>',
    ].join("") : "";

    var html = [
      '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">',
      '<title>' + _esc(title) + '</title>',
      '<style>',
      '  @page { size: A4 ' + _printOrient + '; margin: 16mm; }',
      '  * { box-sizing: border-box; font-family: system-ui, Arial, sans-serif; }',
      '  body { margin: 0; padding: 0; color: #1e293b; }',
      '  .pf-header { display: flex; justify-content: space-between; align-items: flex-start;',
      '    border-bottom: 3px solid #1a3a5c; padding-bottom: 10px; margin-bottom: 14px; }',
      '  .pf-title { font-size: 20px; font-weight: 700; color: #1a3a5c; }',
      '  .pf-meta  { font-size: 12px; color: #718096; text-align: right; line-height: 1.6; }',
      '  .pf-map   { width: 100%; border: 1px solid #e2e8f0; display: block; margin-bottom: 10px; }',
      '  .pf-footer { display: flex; align-items: center; justify-content: space-between;',
      '    font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px; }',
      '  .pf-notes-lbl { font-size: 10px; text-transform: uppercase; color: #a0aec0;',
      '    font-weight: 700; letter-spacing: .05em; margin-bottom: 4px; margin-top: 12px; }',
      '  .pf-notes { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;',
      '    padding: 10px 14px; font-size: 12px; white-space: pre-wrap; min-height: 48px; }',
      '  .pf-logo { font-size: 13px; font-weight: 700; color: #1a3a5c; }',
      '</style></head><body>',
      '<div class="pf-header">',
      '  <div>',
      '    <div class="pf-title">' + _esc(title) + '</div>',
      (agent ? '    <div style="margin-top:4px;font-size:13px;color:#4a5568">Agent : <strong>' + _esc(agent) + '</strong></div>' : ''),
      '  </div>',
      '  <div class="pf-meta">',
      (incDate ? '    <div>' + now + '</div>' : ''),
      (incLogo ? '    <div class="pf-logo">CNIG Accessibilité</div>' : ''),
      '  </div>',
      '</div>',
      (mapSrc
        ? '<img class="pf-map" src="' + mapSrc + '" alt="Carte"/>'
        : '<div style="height:320px;border:1px solid #e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;margin-bottom:10px;">Carte non disponible (tuiles CORS)</div>'
      ),
      '<div class="pf-footer">',
      '  ' + northSVG,
      (scaleText ? '  <span>Échelle : ' + _esc(scaleText) + '</span>' : '<span></span>'),
      '  <span>Imprimé le ' + new Date().toLocaleDateString("fr-FR") + '</span>',
      '</div>',
      (notes ? '<div class="pf-notes-lbl">Notes de terrain</div><div class="pf-notes">' + _esc(notes) + '</div>' : ''),
      '</body></html>',
    ].join("\n");

    var win = window.open("", "_blank", "width=800,height=600");
    if (!win) { alert("Autorisez les popups pour imprimer."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 400);
  }

  /* ── Rapport terrain ─────────────────────────────────────── */
  function _saveRapport() {
    var desc = (document.getElementById("pl-rdesc").value || "").trim();
    if (!desc) { _msg("pl-msg-rapport", "La description est obligatoire.", "error"); return; }

    var rapports = _load(LS_RAPPORTS);
    rapports.unshift({
      id:           Date.now(),
      date:         document.getElementById("pl-rdate").value,
      agent:        document.getElementById("pl-ragent").value || "Anonyme",
      type:         document.getElementById("pl-rtype").value,
      localisation: document.getElementById("pl-rloc").value,
      severity:     _currentSev,
      description:  desc,
    });
    _save(LS_RAPPORTS, rapports);
    _msg("pl-msg-rapport", "✅ Observation enregistrée.", "success");
    document.getElementById("pl-rdesc").value = "";
    document.getElementById("pl-rloc").value  = "";
    document.getElementById("pl-photo-preview").innerHTML = "";
    _renderRapports();
  }

  function _renderRapports() {
    var items = _load(LS_RAPPORTS);
    var el = document.getElementById("pl-rapport-items");
    if (!items.length) { el.innerHTML = '<p class="pl-list-empty">Aucune observation</p>'; return; }
    el.innerHTML = items.slice(0, 6).map(function (r) {
      var d = r.date ? new Date(r.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
      return '<div class="pl-list-item">' +
        '<div class="pl-li-top">' +
          '<span class="pl-sev-badge ' + r.severity + '">' + r.severity + '</span>' +
          '<span class="pl-li-type">' + _esc(r.type) + '</span>' +
          '<span class="pl-li-date">' + d + '</span>' +
        '</div>' +
        '<div class="pl-li-desc">' + _esc((r.description || "").substring(0, 90)) + (r.description.length > 90 ? "…" : "") + '</div>' +
        (r.localisation ? '<div class="pl-li-loc">📍 ' + _esc(r.localisation) + '</div>' : '') +
        '</div>';
    }).join("");
  }

  /* ── Zone terrain ────────────────────────────────────────── */
  function _startDraw() {
    if (!_map) { _msg("pl-msg-zone", "Carte non disponible.", "error"); return; }
    var ol = window.ol;
    if (!ol) { _msg("pl-msg-zone", "OpenLayers non disponible.", "error"); return; }

    /* Créer la couche de dessin si besoin */
    if (!_drawSource) {
      _drawSource = new ol.source.Vector();
      _drawLayer  = new ol.layer.Vector({
        source: _drawSource,
        style:  new ol.style.Style({
          fill:   new ol.style.Fill({ color: "rgba(26,58,92,0.12)" }),
          stroke: new ol.style.Stroke({ color: "#1a3a5c", width: 2.5, lineDash: [6, 3] }),
        }),
        zIndex: 998,
      });
      _map.addLayer(_drawLayer);
    } else {
      _drawSource.clear();
    }

    /* Supprimer l'interaction précédente */
    if (_drawInteract) _map.removeInteraction(_drawInteract);

    _drawInteract = new ol.interaction.Draw({ source: _drawSource, type: "Polygon" });
    _drawInteract.on("drawend", function (e) {
      _zoneFeature = e.feature;
      _map.removeInteraction(_drawInteract);
      _drawInteract = null;
      _open(); /* rouvre le panel */
      document.getElementById("pl-zone-hint").textContent = "✅ Zone délimitée — remplissez la fiche ci-dessous";
      document.getElementById("pl-clear-zone").style.display = "inline-flex";
      document.getElementById("pl-draw-zone").innerHTML = '<i class="fas fa-draw-polygon"></i> Modifier la zone';
    });

    _map.addInteraction(_drawInteract);
    document.getElementById("pl-zone-hint").textContent = "🖊 Cliquez pour tracer — double-clic pour terminer";
    _close(); /* ferme pour laisser interagir avec la carte */
  }

  function _clearZone() {
    if (_drawSource) _drawSource.clear();
    _zoneFeature = null;
    document.getElementById("pl-zone-hint").textContent = "Cliquez sur le bouton puis tracez un polygone sur la carte";
    document.getElementById("pl-clear-zone").style.display = "none";
    document.getElementById("pl-draw-zone").innerHTML = '<i class="fas fa-draw-polygon"></i> Tracer la zone';
  }

  function _saveZone() {
    var name = (document.getElementById("pl-zname").value || "").trim();
    if (!name) { _msg("pl-msg-zone", "Le nom de la zone est obligatoire.", "error"); return; }

    var tasks = [];
    document.querySelectorAll("input[name='ztask']:checked").forEach(function (cb) { tasks.push(cb.value); });

    var zones = _load(LS_ZONES);
    zones.unshift({
      id:      Date.now(),
      name:    name,
      agent:   document.getElementById("pl-zagent").value || "Anonyme",
      date:    document.getElementById("pl-zdate").value,
      tasks:   tasks,
      notes:   document.getElementById("pl-znotes").value || "",
      hasGeom: !!_zoneFeature,
    });
    _save(LS_ZONES, zones);
    _msg("pl-msg-zone", "✅ Fiche de zone enregistrée.", "success");
    _renderZones();
  }

  function _renderZones() {
    var items = _load(LS_ZONES);
    var el = document.getElementById("pl-zone-items");
    if (!items.length) { el.innerHTML = '<p class="pl-list-empty">Aucune fiche de zone</p>'; return; }
    el.innerHTML = items.slice(0, 5).map(function (z) {
      return '<div class="pl-list-item">' +
        '<div class="pl-li-top"><strong>' + _esc(z.name) + '</strong><span class="pl-li-date">' + (z.date || "—") + '</span></div>' +
        '<div class="pl-li-desc">👤 ' + _esc(z.agent) +
          (z.tasks.length ? ' · ' + z.tasks.length + ' tâche(s)' : '') +
          (z.hasGeom ? ' · 🗺 Zone tracée' : '') +
        '</div>' +
        '</div>';
    }).join("");
  }

  /* ── Messages ────────────────────────────────────────────── */
  function _msg(id, text, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = "pl-msg " + type;
    setTimeout(function () { el.className = "pl-msg"; }, 4000);
  }

  function _esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ── Ouvrir / Fermer ─────────────────────────────────────── */
  function _open() {
    var overlay = document.getElementById("pl-overlay");
    var panel   = document.getElementById("pl-panel");
    if (overlay) overlay.classList.add("open");
    if (panel)   panel.classList.add("open");
  }
  function _close() {
    var overlay = document.getElementById("pl-overlay");
    var panel   = document.getElementById("pl-panel");
    if (overlay) overlay.classList.remove("open");
    if (panel)   panel.classList.remove("open");
  }

  /* ── Bouton navbar ───────────────────────────────────────── */
  function _injectNav() {
    function _try(n) {
      var nav = document.querySelector("ul.nav.navbar-nav.navbar-right") ||
                document.querySelector("ul.navbar-nav");
      if (nav) {
        var li = document.createElement("li");
        li.id = "pl-nav-item";
        li.className = "ms-2";
        li.innerHTML = '<button id="pl-nav-btn" class="btn btn-light mv-navbar-btn" title="Mise en page terrain">' +
          '<i class="fas fa-print"></i>' +
          '<span class="mv-btn-label"> Terrain</span>' +
          '</button>';
        li.style.setProperty("border-left", "none", "important");
        var chip = document.getElementById("ua-user-chip");
        chip ? nav.insertBefore(li, chip) : nav.appendChild(li);
        document.getElementById("pl-nav-btn").addEventListener("click", function () {
          document.getElementById("pl-panel").classList.contains("open") ? _close() : _open();
        });
      } else if (n > 0) {
        setTimeout(function () { _try(n - 1); }, 300);
      }
    }
    _try(20);
  }

  /* ── Init ────────────────────────────────────────────────── */
  function _applyUser(user) {
    if (!user) return;
    var DEFAULTS = {
      admin:        ["edition_donnees", "mode_presentation"],
      agent_sig:    ["edition_donnees", "mode_presentation"],
      agent_voirie: ["edition_donnees"],
      prestataire:  ["edition_donnees"],
    };
    var perms = (user.permissions && user.permissions.length)
      ? user.permissions
      : (DEFAULTS[user.user_type] || []);

    var authorized = perms.indexOf("edition_donnees") !== -1 ||
                     perms.indexOf("mode_presentation") !== -1;
    if (!authorized) return;

    if (!document.getElementById("pl-overlay")) _buildPanel();
    if (!document.getElementById("pl-nav-item")) _injectNav();
  }

  function _init() {
    /* Récupération de la carte OL */
    var interval = setInterval(function () {
      if (window.mviewer && window.mviewer.getMap && window.mviewer.getMap()) {
        clearInterval(interval);
        _map = window.mviewer.getMap();
      }
    }, 300);

    /* Auth initiale */
    var token = _getToken();
    if (token) {
      fetch("/auth/me", { headers: { Authorization: "Bearer " + token } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(_applyUser)
        .catch(function () {});
    }

    /* Auth après connexion */
    document.addEventListener("cnig:login", function (e) { _applyUser(e.detail); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _init);
  } else {
    setTimeout(_init, 900);
  }
})();
