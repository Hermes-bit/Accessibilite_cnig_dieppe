/**
 * Composant calcul d'itinéraire accessible mviewer 4.1
 * Profils : piéton, fauteuil roulant, comparaison des deux
 * Géocodage : Nominatim restreint à la commune de Dieppe
 * Routage   : Flask API → pgRouting (Dijkstra pondéré accessibilité)
 */
const RoutingComponent = (function () {

    const API_URL   = "/api/v1/routing";
    const NOMINATIM = "https://nominatim.openstreetmap.org/search";
    const BBOX_VIEWBOX = "1.028,49.950,1.120,49.870";

    let _map, _layerPed, _layerWC, _markerLayer;
    let _startCoords = null, _endCoords = null;
    let _profile = "pedestrian";
    let _pickingTarget = null;
    let _mapClickHandler = null;

    // ── CSS ──────────────────────────────────────────────────────────────
    function _injectCSS() {
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = "apps/routing/routing.css";
        document.head.appendChild(link);
    }

    // ── HTML Panel ────────────────────────────────────────────────────────
    function _buildPanel() {
        const panel = document.createElement("div");
        panel.id = "routing-panel";
        panel.innerHTML = `
        <div class="rp-header">
            <i class="fas fa-route"></i>
            <div class="rp-header-text">
                <span>Itinéraire accessible</span>
                <small>Calcul personnalisé selon votre profil</small>
            </div>
            <button id="rp-close" title="Fermer" aria-label="Fermer">×</button>
        </div>
        <div class="rp-body">
            <div class="rp-zone"><i class="fas fa-map-marker-alt"></i> Zone : <strong>Dieppe</strong></div>

            <div class="rp-waypoints">
                <div class="rp-waypoint">
                    <div class="rp-field">
                        <label class="rp-field-label">
                            <span class="rp-label-dot start"></span>Départ
                        </label>
                        <div class="rp-input-row">
                            <input id="rp-start-input" type="text" placeholder="Saisir une adresse…" autocomplete="off"/>
                            <button id="rp-pick-start" title="Pointer sur la carte"><i class="fas fa-crosshairs"></i></button>
                        </div>
                        <div class="rp-suggestions" id="rp-start-suggestions"></div>
                    </div>
                </div>

                <div class="rp-swap-row">
                    <div class="rp-connector"></div>
                    <button id="rp-swap" title="Inverser départ et arrivée"><i class="fas fa-exchange-alt"></i></button>
                    <div class="rp-connector"></div>
                </div>

                <div class="rp-waypoint">
                    <div class="rp-field">
                        <label class="rp-field-label">
                            <span class="rp-label-dot end"></span>Arrivée
                        </label>
                        <div class="rp-input-row">
                            <input id="rp-end-input" type="text" placeholder="Saisir une adresse…" autocomplete="off"/>
                            <button id="rp-pick-end" title="Pointer sur la carte"><i class="fas fa-crosshairs"></i></button>
                        </div>
                        <div class="rp-suggestions" id="rp-end-suggestions"></div>
                    </div>
                </div>
            </div>

            <div class="rp-profiles-label">Profil de mobilité</div>
            <div class="rp-profiles">
                <div class="rp-profile-btn active" data-profile="pedestrian">
                    <i class="fas fa-walking"></i>Piéton
                </div>
                <div class="rp-profile-btn" data-profile="wheelchair">
                    <i class="fas fa-wheelchair"></i>PMR
                </div>
                <div class="rp-profile-btn" data-profile="both">
                    <i class="fas fa-balance-scale"></i>Comparer
                </div>
            </div>

            <button id="rp-calculate" disabled>
                <i class="fas fa-route"></i> Calculer l'itinéraire
            </button>

            <button id="rp-clear" style="display:none">
                <i class="fas fa-times"></i> Effacer
            </button>

            <div id="rp-error"></div>

            <div id="rp-result">
                <div id="rp-result-single">
                    <div class="rp-stats">
                        <div class="rp-stat">
                            <span class="rp-stat-val" id="rp-distance">—</span>
                            <span class="rp-stat-lbl">Distance</span>
                        </div>
                        <div class="rp-stat">
                            <span class="rp-stat-val" id="rp-duration">—</span>
                            <span class="rp-stat-lbl">Durée</span>
                        </div>
                    </div>
                    <div class="rp-access-msg" id="rp-access-msg"></div>
                </div>

                <div id="rp-result-both">
                    <table class="rp-compare">
                        <thead>
                            <tr>
                                <th></th>
                                <th><span class="rp-dot rp-dot-ped"></span> Piéton</th>
                                <th><span class="rp-dot rp-dot-wc"></span> PMR</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td>Distance</td><td id="rp-ped-dist">—</td><td id="rp-wc-dist">—</td></tr>
                            <tr><td>Durée</td><td id="rp-ped-dur">—</td><td id="rp-wc-dur">—</td></tr>
                            <tr><td>Accessibilité</td><td id="rp-ped-access">—</td><td id="rp-wc-access">—</td></tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>`;
        document.body.appendChild(panel);
        return panel;
    }

    function _buildToggleBtn() {
        const li = document.createElement("li");
        li.className = "ms-2";
        li.id = "routing-nav-item";
        li.innerHTML = `<button id="routing-fab" class="btn btn-light mv-navbar-btn" title="Calcul d'itinéraire accessible">
            <i class="fas fa-route"></i><span class="mv-btn-label"> Itinéraire</span>
        </button>`;

        const navRight = document.querySelector("ul.nav.navbar-nav.navbar-right") ||
                         document.querySelector("ul.navbar-nav.navbar-right") ||
                         document.querySelector("ul.navbar-nav");
        if (navRight) {
            // Insère juste avant le chip utilisateur si présent, sinon avant le bouton aide
            const chipLi = navRight.querySelector("#ua-user-chip");
            const helpLi = navRight.querySelector("li.ms-3");
            const anchor = chipLi || helpLi || null;
            anchor ? navRight.insertBefore(li, anchor) : navRight.appendChild(li);
        } else {
            document.body.appendChild(li);
        }
        return document.getElementById("routing-fab");
    }

    // ── OpenLayers helpers ─────────────────────────────────────────────────
    function _makeRouteLayer(color) {
        const ol = window.ol;
        return new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({ color, width: 5 }),
            }),
            zIndex: 100,
        });
    }

    function _initLayers() {
        _layerPed = _makeRouteLayer("#27ae60");   // vert piéton
        _layerWC  = _makeRouteLayer("#3498db");   // bleu fauteuil
        _markerLayer = new window.ol.layer.Vector({
            source: new window.ol.source.Vector(),
            zIndex: 101,
        });
        _map.addLayer(_layerPed);
        _map.addLayer(_layerWC);
        _map.addLayer(_markerLayer);
    }

    function _addMarker(lonLat, color, label) {
        const ol = window.ol;
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat(lonLat)),
        });
        feature.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 9,
                fill:   new ol.style.Fill({ color }),
                stroke: new ol.style.Stroke({ color: "#fff", width: 2 }),
            }),
            text: new ol.style.Text({
                text:    label,
                font:    "bold 11px Arial",
                fill:    new ol.style.Fill({ color: "#fff" }),
                offsetY: 1,
            }),
        }));
        _markerLayer.getSource().addFeature(feature);
        return feature;
    }

    function _drawGeojsonOnLayer(geojson, layer) {
        if (!geojson) return;
        const ol   = window.ol;
        const fmt  = new ol.format.GeoJSON();
        const feats = fmt.readFeatures(geojson, {
            dataProjection:    "EPSG:4326",
            featureProjection: _map.getView().getProjection(),
        });
        layer.getSource().clear();
        layer.getSource().addFeatures(feats);
    }

    function _fitToRoutes() {
        const ol   = window.ol;
        const ext  = ol.extent.createEmpty();
        [_layerPed, _layerWC].forEach(lyr => {
            const s = lyr.getSource();
            if (s.getFeatures().length) ol.extent.extend(ext, s.getExtent());
        });
        if (!ol.extent.isEmpty(ext)) {
            _map.getView().fit(ext, { padding: [60, 60, 60, 60], maxZoom: 18, duration: 600 });
        }
    }

    function _clearAll() {
        _startCoords = _endCoords = null;
        _layerPed.getSource().clear();
        _layerWC.getSource().clear();
        _markerLayer.getSource().clear();
        document.getElementById("rp-start-input").value = "";
        document.getElementById("rp-end-input").value   = "";
        document.getElementById("rp-result").classList.remove("show");
        _clearError();
        _updateCalcBtn();
    }

    // ── Nominatim géocodage restreint à Dieppe ────────────────────────────
    function _geocode(query, callback) {
        const q   = /dieppe/i.test(query) ? query : `${query}, Dieppe`;
        const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=5` +
                    `&viewbox=${BBOX_VIEWBOX}&bounded=1&countrycodes=fr&addressdetails=1`;
        fetch(url, { headers: { "Accept-Language": "fr" } })
            .then(r => r.json())
            .then(callback)
            .catch(() => callback([]));
    }

    function _setupAutocomplete(inputId, suggestId, onSelect) {
        const input   = document.getElementById(inputId);
        const suggest = document.getElementById(suggestId);
        let timer;

        input.addEventListener("input", () => {
            clearTimeout(timer);
            suggest.innerHTML = "";
            if (input.value.length < 3) return;
            timer = setTimeout(() => {
                _geocode(input.value, (results) => {
                    suggest.innerHTML = "";
                    results.slice(0, 5).forEach(r => {
                        const div = document.createElement("div");
                        div.textContent = r.display_name;
                        div.addEventListener("click", () => {
                            input.value = r.display_name;
                            suggest.innerHTML = "";
                            onSelect([parseFloat(r.lon), parseFloat(r.lat)]);
                        });
                        suggest.appendChild(div);
                    });
                });
            }, 350);
        });

        document.addEventListener("click", (e) => {
            if (!input.contains(e.target)) suggest.innerHTML = "";
        });
    }

    // ── Sélection sur la carte ────────────────────────────────────────────
    function _startPicking(target) {
        _pickingTarget = target;
        const btnId = target === "start" ? "rp-pick-start" : "rp-pick-end";
        document.querySelectorAll(".rp-input-row button").forEach(b => b.classList.remove("picking"));
        document.getElementById(btnId).classList.add("picking");
        _map.getTargetElement().style.cursor = "crosshair";

        if (_mapClickHandler) _map.un("click", _mapClickHandler);
        _mapClickHandler = function (evt) {
            _map.un("click", _mapClickHandler);
            const lonLat = window.ol.proj.toLonLat(evt.coordinate, _map.getView().getProjection());
            _onCoordPicked(lonLat);
        };
        _map.on("click", _mapClickHandler);
    }

    function _onCoordPicked(lonLat) {
        _map.getTargetElement().style.cursor = "";
        document.querySelectorAll(".rp-input-row button").forEach(b => b.classList.remove("picking"));
        const label = `${lonLat[1].toFixed(5)}, ${lonLat[0].toFixed(5)}`;

        if (_pickingTarget === "start") {
            _startCoords = lonLat;
            document.getElementById("rp-start-input").value = label;
            _markerLayer.getSource().getFeatures()
                .filter(f => f.get("role") === "start")
                .forEach(f => _markerLayer.getSource().removeFeature(f));
            const f = _addMarker(lonLat, "#27ae60", "A");
            f.set("role", "start");
        } else {
            _endCoords = lonLat;
            document.getElementById("rp-end-input").value = label;
            _markerLayer.getSource().getFeatures()
                .filter(f => f.get("role") === "end")
                .forEach(f => _markerLayer.getSource().removeFeature(f));
            const f = _addMarker(lonLat, "#e74c3c", "B");
            f.set("role", "end");
        }
        _pickingTarget = null;
        _updateCalcBtn();
    }

    // ── Helpers UI ────────────────────────────────────────────────────────
    function _updateCalcBtn() {
        document.getElementById("rp-calculate").disabled = !(_startCoords && _endCoords);
        document.getElementById("rp-clear").style.display =
            (_startCoords || _endCoords) ? "flex" : "none";
    }

    function _setStartCoords(lonLat) {
        _startCoords = lonLat;
        _markerLayer.getSource().getFeatures()
            .filter(f => f.get("role") === "start")
            .forEach(f => _markerLayer.getSource().removeFeature(f));
        const f = _addMarker(lonLat, "#27ae60", "A");
        f.set("role", "start");
        _updateCalcBtn();
    }

    function _setEndCoords(lonLat) {
        _endCoords = lonLat;
        _markerLayer.getSource().getFeatures()
            .filter(f => f.get("role") === "end")
            .forEach(f => _markerLayer.getSource().removeFeature(f));
        const f = _addMarker(lonLat, "#e74c3c", "B");
        f.set("role", "end");
        _updateCalcBtn();
    }

    function _accessMsg(inacc, profile) {
        if (profile === "pedestrian") {
            return { cls: "ok", txt: '<i class="fas fa-check-circle"></i> Itinéraire piéton calculé' };
        }
        if (inacc === 0) {
            return { cls: "ok", txt: '<i class="fas fa-check-circle"></i> Itinéraire entièrement accessible PMR' };
        }
        return {
            cls: "warn",
            txt: `<i class="fas fa-exclamation-triangle"></i> ${inacc} tronçon(s) avec difficultés d'accessibilité`,
        };
    }

    function _fmtDist(m) { return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`; }
    function _fmtDur(s)  { const m = Math.ceil(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}`; }

    // ── Calcul ────────────────────────────────────────────────────────────
    function _showError(msg) {
        const el = document.getElementById("rp-error");
        el.innerHTML = `<div class="rp-inline-error"><i class="fas fa-exclamation-circle"></i> ${msg}</div>`;
    }
    function _clearError() {
        document.getElementById("rp-error").innerHTML = "";
    }

    function _applySnap(snap) {
        if (!snap) return;
        // Repositionne les marqueurs sur les nœuds réels utilisés par pgRouting
        if (snap.start) {
            _markerLayer.getSource().getFeatures()
                .filter(f => f.get("role") === "start")
                .forEach(f => _markerLayer.getSource().removeFeature(f));
            const f = _addMarker([snap.start.lon, snap.start.lat], "#27ae60", "A");
            f.set("role", "start");
        }
        if (snap.end) {
            _markerLayer.getSource().getFeatures()
                .filter(f => f.get("role") === "end")
                .forEach(f => _markerLayer.getSource().removeFeature(f));
            const f = _addMarker([snap.end.lon, snap.end.lat], "#e74c3c", "B");
            f.set("role", "end");
        }
    }

    function _calculate() {
        const btn = document.getElementById("rp-calculate");
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calcul en cours…';
        _clearError();
        document.getElementById("rp-result").classList.remove("show");

        fetch(API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ start: _startCoords, end: _endCoords, profile: _profile }),
        })
        .then(r => r.json())
        .then(data => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-route"></i> Calculer l\'itinéraire';

            if (data.error) {
                _showError(data.error);
                // Repositionne quand même les marqueurs si le snap est connu
                if (data.snap) _applySnap(data.snap);
                return;
            }

            // Repositionne les marqueurs sur les nœuds réels
            const snap = data.snap || (data.pedestrian && data.pedestrian.snap) || null;
            _applySnap(data.snap);

            // Avertissements snap
            if (data.snap_warnings && data.snap_warnings.length) {
                _showError(data.snap_warnings.join("<br>"));
            }

            // Avertissement itinéraire PMR assoupli
            if (data.relaxed || data.wc_relaxed) {
                const warn = document.getElementById("rp-error");
                warn.innerHTML += `<div class="rp-inline-warn"><i class="fas fa-exclamation-triangle"></i> Aucun chemin PMR strict trouvé itinéraire avec portions difficiles affiché</div>`;
            }

            const single = document.getElementById("rp-result-single");
            const both   = document.getElementById("rp-result-both");

            if (data.type === "both") {
                _drawGeojsonOnLayer(data.pedestrian, _layerPed);
                _drawGeojsonOnLayer(data.wheelchair, _layerWC);
                _fitToRoutes();

                const ped = data.pedestrian || {};
                const wc  = data.wheelchair || {};
                document.getElementById("rp-ped-dist").textContent = ped.total_distance != null ? _fmtDist(ped.total_distance) : "—";
                document.getElementById("rp-ped-dur").textContent  = ped.total_duration != null ? _fmtDur(ped.total_duration)  : "—";
                document.getElementById("rp-wc-dist").textContent  = wc.total_distance  != null ? _fmtDist(wc.total_distance)  : "—";
                document.getElementById("rp-wc-dur").textContent   = wc.total_duration  != null ? _fmtDur(wc.total_duration)   : "—";

                const pedMsg = _accessMsg(ped.inaccessible_segments || 0, "pedestrian");
                const wcMsg  = _accessMsg(wc.inaccessible_segments  || 0, "wheelchair");
                document.getElementById("rp-ped-access").innerHTML = `<span class="rp-tag ${pedMsg.cls}">${pedMsg.cls === "ok" ? "✓" : "⚠"}</span>`;
                document.getElementById("rp-wc-access").innerHTML  = `<span class="rp-tag ${wcMsg.cls}">${wcMsg.cls === "ok" ? "✓" : "⚠ " + (wc.inaccessible_segments || 0)}</span>`;

                single.style.display = "none";
                both.style.display   = "block";
            } else {
                if (data.profile === "pedestrian") {
                    _drawGeojsonOnLayer(data, _layerPed);
                    _layerWC.getSource().clear();
                } else {
                    _drawGeojsonOnLayer(data, _layerWC);
                    _layerPed.getSource().clear();
                }
                _fitToRoutes();

                document.getElementById("rp-distance").textContent = _fmtDist(data.total_distance);
                document.getElementById("rp-duration").textContent = _fmtDur(data.total_duration);

                const msg = _accessMsg(data.inaccessible_segments || 0, data.profile);
                const el  = document.getElementById("rp-access-msg");
                el.className = `rp-access-msg ${msg.cls}`;
                el.innerHTML = msg.txt;

                single.style.display = "block";
                both.style.display   = "none";
            }

            document.getElementById("rp-result").classList.add("show");
        })
        .catch(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-route"></i> Calculer l\'itinéraire';
            _showError("Impossible de joindre le serveur de routage.");
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────
    function init() {
        const waitMap = setInterval(() => {
            if (window.mviewer && window.mviewer.getMap && window.mviewer.getMap()) {
                clearInterval(waitMap);
                _map = window.mviewer.getMap();
                _injectCSS();
                _initLayers();
                _setup();
            }
        }, 300);
    }

    function _open() {
        // Ferme les panneaux mviewer avant d'ouvrir
        ["right-panel", "bottom-panel"].forEach(id => {
            document.getElementById(id)?.classList.remove("active");
        });
        document.getElementById("routing-panel").classList.add("open");
        document.getElementById("routing-overlay").classList.add("open");
        document.getElementById("routing-fab").classList.add("active");
    }
    function _close() {
        document.getElementById("routing-panel").classList.remove("open");
        document.getElementById("routing-overlay").classList.remove("open");
        document.getElementById("routing-fab").classList.remove("active");
    }

    function _setup() {
        const panel  = _buildPanel();
        const togBtn = _buildToggleBtn();

        // Overlay invisible capture les clics hors du panel
        const overlay = document.createElement("div");
        overlay.id = "routing-overlay";
        document.body.appendChild(overlay);

        togBtn.addEventListener("click", () => {
            panel.classList.contains("open") ? _close() : _open();
        });
        overlay.addEventListener("click", _close);
        document.getElementById("rp-close").addEventListener("click", _close);

        // Fermeture par Échap
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && panel.classList.contains("open")) _close();
        });

        // Ferme le panel routing quand mviewer ouvre un de ses panneaux
        const _observer = new MutationObserver(() => {
            if (!panel.classList.contains("open")) return;
            const rightActive  = document.getElementById("right-panel")?.classList.contains("active");
            const bottomActive = document.getElementById("bottom-panel")?.classList.contains("active");
            if (rightActive || bottomActive) _close();
        });
        ["right-panel", "bottom-panel"].forEach(id => {
            const el = document.getElementById(id);
            if (el) _observer.observe(el, { attributes: true, attributeFilter: ["class"] });
        });

        _setupAutocomplete("rp-start-input", "rp-start-suggestions", _setStartCoords);
        _setupAutocomplete("rp-end-input",   "rp-end-suggestions",   _setEndCoords);

        document.getElementById("rp-pick-start").addEventListener("click", () => _startPicking("start"));
        document.getElementById("rp-pick-end").addEventListener("click",   () => _startPicking("end"));

        // Bouton inverser départ / arrivée
        document.getElementById("rp-swap").addEventListener("click", () => {
            const tmpCoords = _startCoords;
            const tmpVal    = document.getElementById("rp-start-input").value;
            _startCoords = _endCoords;
            document.getElementById("rp-start-input").value = document.getElementById("rp-end-input").value;
            _endCoords = tmpCoords;
            document.getElementById("rp-end-input").value = tmpVal;
            // Mise à jour des marqueurs
            _markerLayer.getSource().clear();
            if (_startCoords) { const f = _addMarker(_startCoords, "#27ae60", "A"); f.set("role", "start"); }
            if (_endCoords)   { const f = _addMarker(_endCoords,   "#e74c3c", "B"); f.set("role", "end"); }
            _updateCalcBtn();
        });

        document.querySelectorAll(".rp-profile-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".rp-profile-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                _profile = btn.dataset.profile;
            });
        });

        document.getElementById("rp-calculate").addEventListener("click", _calculate);
        document.getElementById("rp-clear").addEventListener("click", _clearAll);
    }

    return { init };
})();

RoutingComponent.init();
