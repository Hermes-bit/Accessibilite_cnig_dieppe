/**
 * Composant de calcul d'itinéraire accessible — mviewer 4.1
 * Profils : piéton, fauteuil roulant, les deux
 * Géocodage : Nominatim (OpenStreetMap)
 * Routage   : Flask API → pgRouting (Dijkstra pondéré accessibilité)
 */
const RoutingComponent = (function () {

    const API_URL   = "http://localhost:5000/api/v1/routing";
    const NOMINATIM = "https://nominatim.openstreetmap.org/search";
    // Boîte englobante de la zone de données (Normandie)
    const BBOX_VIEWBOX = "1.0,49.85,1.15,49.97";

    let _map, _routeLayer, _markerLayer;
    let _startCoords = null, _endCoords = null;
    let _profile = "pedestrian";
    let _pickingTarget = null; // "start" | "end"
    let _mapClickHandler = null;

    // ── CSS ────────────────────────────────────────────────────────────
    function _injectCSS() {
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = "apps/routing/routing.css";
        document.head.appendChild(link);
    }

    // ── HTML Panel ─────────────────────────────────────────────────────
    function _buildPanel() {
        const panel = document.createElement("div");
        panel.id = "routing-panel";
        panel.innerHTML = `
        <div class="rp-header">
            <span><i class="fas fa-route"></i> Calcul d'itinéraire</span>
            <button id="rp-close" title="Fermer">×</button>
        </div>
        <div class="rp-body">

            <!-- Départ -->
            <div class="rp-field" id="rp-start-field">
                <label><i class="fas fa-map-marker-alt" style="color:#27ae60"></i> Départ</label>
                <div class="rp-input-row">
                    <input id="rp-start-input" type="text" placeholder="Adresse ou cliquez sur la carte…"/>
                    <button id="rp-pick-start" title="Cliquer sur la carte">
                        <i class="fas fa-crosshairs"></i>
                    </button>
                </div>
                <div class="rp-suggestions" id="rp-start-suggestions"></div>
            </div>

            <!-- Arrivée -->
            <div class="rp-field" id="rp-end-field">
                <label><i class="fas fa-flag-checkered" style="color:#e74c3c"></i> Arrivée</label>
                <div class="rp-input-row">
                    <input id="rp-end-input" type="text" placeholder="Adresse ou cliquez sur la carte…"/>
                    <button id="rp-pick-end" title="Cliquer sur la carte">
                        <i class="fas fa-crosshairs"></i>
                    </button>
                </div>
                <div class="rp-suggestions" id="rp-end-suggestions"></div>
            </div>

            <!-- Profil -->
            <label style="font-weight:bold;color:#333;margin-bottom:6px;display:block">
                <i class="fas fa-user-cog"></i> Profil de mobilité
            </label>
            <div class="rp-profiles">
                <div class="rp-profile-btn active" data-profile="pedestrian">
                    <i class="fas fa-walking"></i>Piéton
                </div>
                <div class="rp-profile-btn" data-profile="wheelchair">
                    <i class="fas fa-wheelchair"></i>Fauteuil
                </div>
                <div class="rp-profile-btn" data-profile="both">
                    <i class="fas fa-people-carry"></i>Les deux
                </div>
            </div>

            <button id="rp-calculate" disabled>
                <i class="fas fa-play-circle"></i> Calculer l'itinéraire
            </button>

            <!-- Résultat -->
            <div id="rp-result">
                <div class="rp-stats">
                    <div class="rp-stat">
                        <div class="val" id="rp-distance">—</div>
                        <div class="lbl">Distance (m)</div>
                    </div>
                    <div class="rp-stat">
                        <div class="val" id="rp-duration">—</div>
                        <div class="lbl">Durée (min)</div>
                    </div>
                </div>
                <div class="rp-accessibility" id="rp-access-msg"></div>
                <button id="rp-clear">
                    <i class="fas fa-trash-alt"></i> Effacer l'itinéraire
                </button>
            </div>
        </div>`;
        document.body.appendChild(panel);
        return panel;
    }

    function _buildToggleBtn() {
        const btn = document.createElement("button");
        btn.id = "routing-btn";
        btn.title = "Calcul d'itinéraire";
        btn.innerHTML = '<i class="fas fa-route"></i>';
        document.body.appendChild(btn);
        return btn;
    }

    // ── OpenLayers helpers ─────────────────────────────────────────────
    function _initLayers() {
        const ol = window.ol;
        _routeLayer = new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: (feature) => {
                const profile = feature.get("profile");
                const color = profile === "wheelchair" || profile === "both"
                    ? "#3498db" : "#27ae60";
                return new ol.style.Style({
                    stroke: new ol.style.Stroke({ color, width: 5 }),
                });
            },
            zIndex: 100,
        });
        _markerLayer = new ol.layer.Vector({
            source: new ol.source.Vector(),
            zIndex: 101,
        });
        _map.addLayer(_routeLayer);
        _map.addLayer(_markerLayer);
    }

    function _addMarker(lonLat, color, label) {
        const ol = window.ol;
        const coord = ol.proj.fromLonLat(lonLat);
        const feature = new ol.Feature({ geometry: new ol.geom.Point(coord) });
        feature.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 9,
                fill:   new ol.style.Fill({ color }),
                stroke: new ol.style.Stroke({ color: "#fff", width: 2 }),
            }),
            text: new ol.style.Text({
                text: label,
                font: "bold 11px Arial",
                fill: new ol.style.Fill({ color: "#fff" }),
                offsetY: 1,
            }),
        }));
        _markerLayer.getSource().addFeature(feature);
    }

    function _drawRoute(geojson) {
        const ol   = window.ol;
        const fmt  = new ol.format.GeoJSON();
        const feats = fmt.readFeatures(geojson, {
            dataProjection:    "EPSG:4326",
            featureProjection: _map.getView().getProjection(),
        });
        feats.forEach(f => f.set("profile", geojson.profile));
        _routeLayer.getSource().clear();
        _routeLayer.getSource().addFeatures(feats);

        // Zoom sur l'itinéraire
        const extent = _routeLayer.getSource().getExtent();
        _map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 18, duration: 600 });
    }

    function _clearAll() {
        _startCoords = _endCoords = null;
        _markerLayer.getSource().clear();
        _routeLayer.getSource().clear();
        document.getElementById("rp-start-input").value = "";
        document.getElementById("rp-end-input").value   = "";
        document.getElementById("rp-result").classList.remove("show");
        _updateCalcBtn();
    }

    // ── Nominatim geocoding ────────────────────────────────────────────
    function _geocode(query, callback) {
        const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=5` +
                    `&viewbox=${BBOX_VIEWBOX}&bounded=0&countrycodes=fr&addressdetails=1`;
        fetch(url, { headers: { "Accept-Language": "fr" } })
            .then(r => r.json())
            .then(callback)
            .catch(() => callback([]));
    }

    function _setupAutocomplete(inputId, suggestId, onSelect) {
        const input   = document.getElementById(inputId);
        const suggest = document.getElementById(suggestId);
        let _timer;

        input.addEventListener("input", () => {
            clearTimeout(_timer);
            suggest.innerHTML = "";
            if (input.value.length < 3) return;
            _timer = setTimeout(() => {
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

    // ── Map click picking ──────────────────────────────────────────────
    function _startPicking(target) {
        _pickingTarget = target;
        const btnId = target === "start" ? "rp-pick-start" : "rp-pick-end";
        document.querySelectorAll(".rp-input-row button").forEach(b => b.classList.remove("picking"));
        document.getElementById(btnId).classList.add("picking");
        _map.getTargetElement().style.cursor = "crosshair";

        if (_mapClickHandler) _map.un("click", _mapClickHandler);
        _mapClickHandler = function (evt) {
            const lonLat = window.ol.proj.toLonLat(evt.coordinate, _map.getView().getProjection());
            _onCoordPicked(lonLat);
        };
        _map.once("click", _mapClickHandler);
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
            if (f) f.set("role", "start");
        } else {
            _endCoords = lonLat;
            document.getElementById("rp-end-input").value = label;
            _markerLayer.getSource().getFeatures()
                .filter(f => f.get("role") === "end")
                .forEach(f => _markerLayer.getSource().removeFeature(f));
            const f = _addMarker(lonLat, "#e74c3c", "B");
            if (f) f.set("role", "end");
        }
        _pickingTarget = null;
        _updateCalcBtn();
    }

    // ── UI helpers ─────────────────────────────────────────────────────
    function _updateCalcBtn() {
        document.getElementById("rp-calculate").disabled =
            !(_startCoords && _endCoords);
    }

    function _setStartCoords(lonLat) {
        _startCoords = lonLat;
        _markerLayer.getSource().getFeatures()
            .filter(f => f.get("role") === "start")
            .forEach(f => _markerLayer.getSource().removeFeature(f));
        _addMarker(lonLat, "#27ae60", "A");
        _updateCalcBtn();
    }

    function _setEndCoords(lonLat) {
        _endCoords = lonLat;
        _markerLayer.getSource().getFeatures()
            .filter(f => f.get("role") === "end")
            .forEach(f => _markerLayer.getSource().removeFeature(f));
        _addMarker(lonLat, "#e74c3c", "B");
        _updateCalcBtn();
    }

    // ── Route calculation ──────────────────────────────────────────────
    function _calculate() {
        const btn = document.getElementById("rp-calculate");
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calcul en cours…';

        fetch(API_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                start:   _startCoords,
                end:     _endCoords,
                profile: _profile,
            }),
        })
        .then(r => r.json())
        .then(data => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play-circle"></i> Calculer l\'itinéraire';

            if (data.error) {
                alert("Itinéraire introuvable : " + data.error);
                return;
            }

            _drawRoute(data);

            // Stats
            document.getElementById("rp-distance").textContent = data.total_distance;
            document.getElementById("rp-duration").textContent =
                Math.ceil(data.total_duration / 60);

            // Message accessibilité
            const msgEl = document.getElementById("rp-access-msg");
            const inacc = data.features.filter(
                f => f.properties.accessibiliteglobale === "03"
            ).length;
            if (_profile === "wheelchair" || _profile === "both") {
                if (inacc === 0) {
                    msgEl.className = "rp-accessibility ok";
                    msgEl.innerHTML = '<i class="fas fa-check-circle"></i> Itinéraire entièrement accessible PMR';
                } else {
                    msgEl.className = "rp-accessibility warn";
                    msgEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${inacc} tronçon(s) avec difficultés d'accessibilité`;
                }
            } else {
                msgEl.className = "rp-accessibility ok";
                msgEl.innerHTML = '<i class="fas fa-walking"></i> Itinéraire piéton calculé';
            }
            document.getElementById("rp-result").classList.add("show");
        })
        .catch(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-play-circle"></i> Calculer l\'itinéraire';
            alert("Erreur de connexion au serveur. Vérifiez que le backend Flask est démarré.");
        });
    }

    // ── Init ───────────────────────────────────────────────────────────
    function init() {
        // Attendre que mviewer et OpenLayers soient prêts
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

    function _setup() {
        const panel  = _buildPanel();
        const togBtn = _buildToggleBtn();

        // Toggle panel
        togBtn.addEventListener("click", () => panel.classList.toggle("open"));
        document.getElementById("rp-close").addEventListener("click", () =>
            panel.classList.remove("open")
        );

        // Géocodage
        _setupAutocomplete("rp-start-input", "rp-start-suggestions", (coords) => {
            _setStartCoords(coords);
        });
        _setupAutocomplete("rp-end-input", "rp-end-suggestions", (coords) => {
            _setEndCoords(coords);
        });

        // Boutons cliquer sur carte
        document.getElementById("rp-pick-start").addEventListener("click", () =>
            _startPicking("start")
        );
        document.getElementById("rp-pick-end").addEventListener("click", () =>
            _startPicking("end")
        );

        // Profil
        document.querySelectorAll(".rp-profile-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".rp-profile-btn").forEach(b =>
                    b.classList.remove("active")
                );
                btn.classList.add("active");
                _profile = btn.dataset.profile;
            });
        });

        // Calculer
        document.getElementById("rp-calculate").addEventListener("click", _calculate);

        // Effacer
        document.getElementById("rp-clear").addEventListener("click", _clearAll);
    }

    return { init };
})();

// Lancement automatique
RoutingComponent.init();
