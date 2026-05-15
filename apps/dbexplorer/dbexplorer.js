/**
 * DB Explorer interface pgAdmin-like intégrée dans mviewer
 * Parcourir, interroger, exporter (CSV/GeoJSON) et importer (GeoJSON/Shapefile).
 */
const DbExplorer = (function () {

    const TABLES_URL = "https://hermes58.alwaysdata.net/api/v1/db/tables";
    const QUERY_URL  = "https://hermes58.alwaysdata.net/api/v1/db/query";
    const EXPORT_URL = "https://hermes58.alwaysdata.net/api/v1/db/export";
    const IMPORT_URL = "https://hermes58.alwaysdata.net/api/v1/db/import";
    const DROP_TABLE_URL = "https://hermes58.alwaysdata.net/api/v1/db/drop_table";

    let _tables         = [];
    let _activeTable    = null;
    const _mapLayers    = {};
    const _styleConfigs = {};
    let _importGroupLayer = null;
    const _protectedTables = new Set([
        "v_troncons", "v_obstacles", "v_erp",
        "troncon_cheminement", "noeud_cheminement", "obstacle",
        "traversee", "circulation", "ascenseur", "escalier", "escalator",
        "rampe", "elevateur", "passage_selectif", "quai", "stationnement_pmr",
        "tapis_roulant", "erp", "entree",
    ]);
    let _contextTarget  = null;

    // ── CSS ───────────────────────────────────────────────────────────────
    function _injectCSS() {
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = "apps/dbexplorer/dbexplorer.css";
        document.head.appendChild(link);
    }

    // ── Formatage du temps ────────────────────────────────────────────────
    function _fmtTime(ms) {
        const total_s = Math.floor(ms / 1000);
        const h = Math.floor(total_s / 3600);
        const m = Math.floor((total_s % 3600) / 60);
        const s = total_s % 60;
        const frac = String(ms % 1000).padStart(3, "0");
        return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${frac}`;
    }

    // ── Panel principal ───────────────────────────────────────────────────
    function _buildPanel() {
        const el = document.createElement("div");
        el.id = "dbe-panel";
        el.innerHTML = `
        <div id="dbe-toolbar">
            <span class="dbe-title">
                <i class="fas fa-database"></i>
                Explorateur de base de données cnig_accessibilite
            </span>
            <button id="dbe-close-btn" title="Fermer">×</button>
        </div>
        <div id="dbe-body">
            <div id="dbe-sidebar">
                <div id="dbe-sidebar-header">
                    <i class="fas fa-table"></i> Tables &amp; Vues
                </div>
                <div id="dbe-table-list">
                    <div class="dbe-loading">Chargement…</div>
                </div>
            </div>
            <div id="dbe-main">
                <div id="dbe-editor-area">
                    <textarea id="dbe-sql-editor" spellcheck="false"
                        placeholder="-- Saisir une requête SELECT…&#10;SELECT * FROM cnig_accessibilite.entree LIMIT 100;"></textarea>
                    <div id="dbe-editor-btns">

                        <!-- Action principale -->
                        <button id="dbe-run-btn" class="dbe-btn dbe-btn-run">
                            <i class="fas fa-play"></i>
                            Exécuter
                            <kbd>Ctrl+↵</kbd>
                        </button>

                        <!-- Section Import/Export -->
                        <span class="dbe-section-tag">Import/Export</span>

                        <button id="dbe-export-btn" class="dbe-btn dbe-btn-outlined" title="Exporter les données">
                            <i class="fas fa-file-export"></i>
                            Exporter
                            <i class="fas fa-chevron-down dbe-caret"></i>
                        </button>

                        <button id="dbe-import-btn" class="dbe-btn dbe-btn-outlined" title="Importer des données">
                            <i class="fas fa-file-import"></i>
                            Importer
                        </button>

                        <!-- Danger -->
                        <button id="dbe-clear-btn" class="dbe-btn dbe-btn-danger">
                            <i class="fas fa-eraser"></i>
                            Effacer
                        </button>

                        <!-- Limite poussée à droite -->
                        <div class="dbe-limit-wrap">
                            <label class="dbe-limit-label" for="dbe-limit-select">Limite :</label>
                            <select id="dbe-limit-select" class="dbe-select">
                                <option value="100">100</option>
                                <option value="500" selected>500</option>
                                <option value="1000">1 000</option>
                                <option value="2000">2 000</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="dbe-results-area">
                    <div id="dbe-results-msg">
                        <div>
                            <i class="fas fa-database" style="font-size:28px;margin-bottom:10px;display:block;opacity:.2"></i>
                            Sélectionnez une table ou saisissez une requête
                        </div>
                    </div>
                    <div id="dbe-grid-wrapper">
                        <table id="dbe-grid"><thead></thead><tbody></tbody></table>
                    </div>
                </div>

                <div id="dbe-status"></div>
            </div>
        </div>`;
        document.body.appendChild(el);
        return el;
    }

    // ── Dropdown Export (body-level pour échapper overflow:hidden) ────────
    function _buildExportDropdown() {
        const menu = document.createElement("div");
        menu.id = "dbe-export-menu";
        menu.className = "dbe-export-dropdown";
        menu.style.display = "none";
        menu.innerHTML = `
            <button class="dbe-dd-item" id="dbe-export-csv">
                <span class="dbe-dd-icon"><i class="fas fa-file-csv"></i></span>
                <span class="dbe-dd-text">
                    <strong>CSV</strong>
                    <em>Compatible Excel toute requête</em>
                </span>
            </button>
            <div class="dbe-dd-sep"></div>
            <button class="dbe-dd-item" id="dbe-export-geojson">
                <span class="dbe-dd-icon"><i class="fas fa-globe-europe"></i></span>
                <span class="dbe-dd-text">
                    <strong>GeoJSON</strong>
                    <em>Tables avec colonne géométrique</em>
                </span>
            </button>`;
        document.body.appendChild(menu);
        return menu;
    }

    function _getMap() {
        return window.mviewer && window.mviewer.getMap && window.mviewer.getMap();
    }

    function _getImportGroup(map) {
        if (_importGroupLayer) return _importGroupLayer;
        const group = new window.ol.layer.Group({
            layers: [],
        });
        group.set("title", "Couches importées");
        group.set("dbeImportGroup", true);
        group.setVisible(true);
        map.addLayer(group);
        _importGroupLayer = group;
        return _importGroupLayer;
    }

    function _buildMapStyle(tableName) {
        const cfg = _styleConfigs[tableName] || { type: "auto", color: "#ff5722", width: 3, size: 6, fill: "rgba(255,87,34,0.25)" };
        const color = cfg.color || "#ff5722";
        const stroke = new window.ol.style.Stroke({ color: color, width: cfg.width });
        const fill = new window.ol.style.Fill({ color: cfg.fill || "rgba(255,87,34,0.25)" });

        return function (feature) {
            const geom = feature.getGeometry && feature.getGeometry();
            if (!geom) return null;
            const type = cfg.type === "auto"
                ? geom.getType().includes("Point") ? "point"
                    : geom.getType().includes("Line") ? "line"
                    : "polygon"
                : cfg.type;

            if (type === "point") {
                return new window.ol.style.Style({
                    image: new window.ol.style.Circle({
                        radius: cfg.size,
                        fill: new window.ol.style.Fill({ color }),
                        stroke: new window.ol.style.Stroke({ color: "#ffffff", width: 1.5 }),
                    }),
                });
            }
            if (type === "line") {
                return new window.ol.style.Style({
                    stroke: stroke,
                });
            }
            return new window.ol.style.Style({
                stroke: stroke,
                fill: fill,
            });
        };
    }

    function _buildClusterStyle(feature) {
        const size = feature.get('features') ? feature.get('features').length : 1;
        if (size > 1) {
            return new window.ol.style.Style({
                image: new window.ol.style.Circle({
                    radius: 12,
                    fill: new window.ol.style.Fill({ color: '#1f77b4' }),
                    stroke: new window.ol.style.Stroke({ color: '#ffffff', width: 2 }),
                }),
                text: new window.ol.style.Text({
                    text: String(size),
                    fill: new window.ol.style.Fill({ color: '#ffffff' }),
                    stroke: new window.ol.style.Stroke({ color: '#1f77b4', width: 3 }),
                    font: 'bold 12px sans-serif',
                }),
            });
        }
        return new window.ol.style.Style({
            image: new window.ol.style.Circle({
                radius: 6,
                fill: new window.ol.style.Fill({ color: '#1f77b4' }),
                stroke: new window.ol.style.Stroke({ color: '#ffffff', width: 1.5 }),
            }),
        });
    }

    function _addLayerToMap(tableName) {
        const map = _getMap();
        if (!map || !window.ol) {
            _showStatusMsg("Impossible d'accéder à la carte OpenLayers.", "err");
            return;
        }

        if (_mapLayers[tableName]) {
            _showStatusMsg(`La couche ${tableName} est déjà ajoutée.`, "warn");
            return;
        }

        const importGroup = _getImportGroup(map);

        const source = new window.ol.source.Vector({
            format: new window.ol.format.GeoJSON(),
            loader: function (extent, resolution, projection) {
                fetch(`https://hermes58.alwaysdata.net/api/v1/layers/${tableName}`)
                    .then(r => r.json())
                    .then(data => {
                        const features = source.getFormat().readFeatures(data, {
                            dataProjection: "EPSG:4326",
                            featureProjection: projection,
                        });
                        source.addFeatures(features);
                        const extent = source.getExtent();
                        if (extent && !window.ol.extent.isEmpty(extent)) {
                            map.getView().fit(extent, { duration: 400, padding: [40, 40, 40, 40], maxZoom: 16 });
                        }
                        _applyClusterIfNeeded(tableName, source, importGroup);
                    })
                    .catch(() => _showStatusMsg(`Impossible de charger la couche ${tableName}.`, "err"));
            },
        });

        const vectorLayer = new window.ol.layer.Vector({
            source: source,
            style: _buildMapStyle(tableName),
        });
        vectorLayer.set("dbeTableName", tableName);
        vectorLayer.set("title", tableName);
        vectorLayer.set("mviewerid", `import_${tableName}`);

        importGroup.getLayers().push(vectorLayer);
        _mapLayers[tableName] = vectorLayer;
        _showStatusMsg(`Couche importée ${tableName} ajoutée au groupe d'import.`, "ok");

        function _applyClusterIfNeeded(tableName, source, groupLayer) {
            const features = source.getFeatures();
            if (!features.length) return;
            const geometry = features[0].getGeometry();
            if (!geometry || geometry.getType() !== 'Point') return;

            const clusterSource = new window.ol.source.Cluster({
                distance: 32,
                source: source,
            });
            const clusterLayer = new window.ol.layer.Vector({
                source: clusterSource,
                style: _buildClusterStyle,
            });
            clusterLayer.set("dbeTableName", tableName);
            clusterLayer.set("title", tableName);
            clusterLayer.set("mviewerid", `import_${tableName}`);

            const layers = groupLayer.getLayers();
            for (let i = 0; i < layers.getLength(); i++) {
                const layer = layers.item(i);
                if (layer.get("dbeTableName") === tableName) {
                    layers.removeAt(i);
                    layers.insertAt(i, clusterLayer);
                    break;
                }
            }
            _mapLayers[tableName] = clusterLayer;
        }
    }

    function _removeLayerFromMap(tableName) {
        const map = _getMap();
        const layer = _mapLayers[tableName];
        if (!map || !layer) return;

        const importGroup = _importGroupLayer;
        if (importGroup && importGroup.getLayers().getArray().includes(layer)) {
            importGroup.getLayers().remove(layer);
            if (importGroup.getLayers().getLength() === 0) {
                map.removeLayer(importGroup);
                _importGroupLayer = null;
            }
        } else {
            map.removeLayer(layer);
        }

        delete _mapLayers[tableName];
        _showStatusMsg(`Couche ${tableName} retirée de la carte.`, "info");
    }

    function _isLayerOnMap(tableName) {
        return Boolean(_mapLayers[tableName]);
    }

    function _findTableDef(tableName) {
        return _tables.find(t => t.name === tableName);
    }

    function _buildContextMenu() {
        const menu = document.createElement("div");
        menu.id = "dbe-context-menu";
        menu.className = "dbe-context-menu";
        menu.style.display = "none";
        menu.innerHTML = `
            <button class="dbe-context-item" data-action="add">Ajouter à la carte</button>
            <button class="dbe-context-item" data-action="style">Choisir le style</button>
            <button class="dbe-context-item" data-action="remove">Retirer de la carte</button>
            <div class="dbe-context-sep"></div>
            <button class="dbe-context-item dbe-context-danger" data-action="delete">Supprimer la table</button>
        `;
        document.body.appendChild(menu);

        menu.addEventListener("click", event => {
            const button = event.target.closest("[data-action]");
            if (!button || !_contextTarget) return;
            const action = button.dataset.action;
            event.stopPropagation();
            _hideContextMenu();
            if (action === "add") return _addLayerToMap(_contextTarget);
            if (action === "remove") return _removeLayerFromMap(_contextTarget);
            if (action === "style") return _openStyleModal(_contextTarget);
            if (action === "delete") return _confirmDropTable(_contextTarget);
        });

        menu.addEventListener("contextmenu", event => {
            event.preventDefault();
            event.stopPropagation();
        });

        document.addEventListener("click", _hideContextMenu);
        document.addEventListener("contextmenu", event => {
            const menu = document.getElementById("dbe-context-menu");
            if (menu && !menu.contains(event.target)) {
                _hideContextMenu();
            }
        });
        return menu;
    }

    function _showContextMenu(event, tableName) {
        const menu = document.getElementById("dbe-context-menu");
        if (!menu) return;
        event.preventDefault();
        _contextTarget = tableName;

        const isOnMap = _isLayerOnMap(tableName);
        menu.querySelector("[data-action='add']").style.display = isOnMap ? "none" : "block";
        menu.querySelector("[data-action='remove']").style.display = isOnMap ? "block" : "none";

        const tableDef = _findTableDef(tableName);
        const canDelete = tableDef && tableDef.kind === "table" && !_protectedTables.has(tableName);
        menu.querySelector("[data-action='delete']").style.display = canDelete ? "block" : "none";

        menu.style.top = `${event.clientY}px`;
        menu.style.left = `${event.clientX}px`;
        menu.style.display = "flex";
    }

    function _hideContextMenu() {
        const menu = document.getElementById("dbe-context-menu");
        if (menu) menu.style.display = "none";
    }

    function _buildStyleModal() {
        const modal = document.createElement("div");
        modal.id = "dbe-style-modal";
        modal.className = "dbe-modal-overlay";
        modal.style.display = "none";
        modal.innerHTML = `
            <div class="dbe-modal-box" id="dbe-style-modal-inner">
                <div class="dbe-modal-head">
                    <div class="dbe-modal-title">
                        <span class="dbe-modal-icon"><i class="fas fa-palette"></i></span>
                        Style de la couche
                    </div>
                    <button class="dbe-modal-x" id="dbe-style-close">&times;</button>
                </div>
                <div class="dbe-modal-body">
                    <p id="dbe-style-title" class="dbe-modal-desc"></p>
                    <div class="dbe-modal-fields">
                        <div class="dbe-field">
                            <label class="dbe-field-label" for="dbe-style-type">Type de style</label>
                            <select id="dbe-style-type" class="dbe-input">
                                <option value="auto">Automatique (géométrie)</option>
                                <option value="point">Point</option>
                                <option value="line">Ligne</option>
                                <option value="polygon">Surface</option>
                            </select>
                        </div>
                        <div class="dbe-field">
                            <label class="dbe-field-label" for="dbe-style-color">Couleur</label>
                            <input type="color" id="dbe-style-color" class="dbe-input" value="#ff5722">
                        </div>
                        <div class="dbe-field">
                            <label class="dbe-field-label" for="dbe-style-width">Epaisseur / taille</label>
                            <input type="number" id="dbe-style-width" class="dbe-input" min="1" max="20" value="3">
                        </div>
                    </div>
                    <div id="dbe-style-note" class="dbe-modal-note"></div>
                </div>
                <div class="dbe-modal-foot">
                    <button id="dbe-style-cancel" class="dbe-btn dbe-btn-ghost">Annuler</button>
                    <button id="dbe-style-save" class="dbe-btn dbe-btn-import-submit">Appliquer</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        return modal;
    }

    function _openStyleModal(tableName) {
        const modal = document.getElementById("dbe-style-modal");
        if (!modal) return;
        const title = document.getElementById("dbe-style-title");
        const type = document.getElementById("dbe-style-type");
        const color = document.getElementById("dbe-style-color");
        const width = document.getElementById("dbe-style-width");
        const note = document.getElementById("dbe-style-note");

        const cfg = _styleConfigs[tableName] || { type: "auto", color: "#ff5722", width: 3, size: 6, fill: "rgba(255,87,34,0.25)" };
        title.textContent = `Style pour ${tableName}`;
        type.value = cfg.type;
        color.value = cfg.color;
        width.value = cfg.width;
        note.textContent = "Ce style sera appliqué à la géométrie chargée dans la carte.";

        modal.style.display = "flex";

        const saveBtn = document.getElementById("dbe-style-save");
        const cancelBtn = document.getElementById("dbe-style-cancel");
        const closeBtn = document.getElementById("dbe-style-close");

        function _close() {
            modal.style.display = "none";
            saveBtn.removeEventListener("click", _onSave);
            cancelBtn.removeEventListener("click", _close);
            closeBtn.removeEventListener("click", _close);
        }

        function _onSave() {
            _styleConfigs[tableName] = {
                type: type.value,
                color: color.value,
                width: parseInt(width.value, 10) || 3,
                size: parseInt(width.value, 10) || 6,
                fill: color.value + "40",
            };
            if (_mapLayers[tableName]) {
                _mapLayers[tableName].setStyle(_buildMapStyle(tableName));
            }
            _showStatusMsg(`Style appliqué à ${tableName}.`, "ok");
            _close();
        }

        cancelBtn.addEventListener("click", _close);
        closeBtn.addEventListener("click", _close);
        saveBtn.addEventListener("click", _onSave);
    }

    function _confirmDropTable(tableName) {
        if (!confirm(`Supprimer la table ${tableName} de la base ? Cette opération est irréversible.`)) {
            return;
        }
        fetch(DROP_TABLE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ table_name: tableName }),
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                _showStatusMsg(`Erreur suppression : ${data.error}`, "err");
            } else {
                _removeLayerFromMap(tableName);
                _showStatusMsg(`Table ${tableName} supprimée.`, "ok");
                _loadTables();
            }
        })
        .catch(() => _showStatusMsg("Erreur réseau lors de la suppression.", "err"));
    }

    // ── Modal Import (body-level pour overlay correct) ────────────────────
    function _buildImportModal() {
        const modal = document.createElement("div");
        modal.id = "dbe-import-modal";
        modal.className = "dbe-modal-overlay";
        modal.style.display = "none";
        modal.innerHTML = `
            <div class="dbe-modal-box" id="dbe-modal-inner">
                <div class="dbe-modal-head">
                    <div class="dbe-modal-title">
                        <span class="dbe-modal-icon"><i class="fas fa-file-import"></i></span>
                        Importer des données
                    </div>
                    <button class="dbe-modal-x" id="dbe-modal-close">&times;</button>
                </div>

                <div class="dbe-modal-body">
                    <p class="dbe-modal-desc">
                        Importez un fichier <strong>GeoJSON</strong> <code>.geojson</code>
                        ou un <strong>Shapefile</strong> <code>.zip</code> (.shp + .dbf + .shx + .prj).
                        Les données seront insérées dans le schéma
                        <span class="dbe-code-chip">cnig_accessibilite</span>.
                    </p>

                    <div id="dbe-drop-zone" class="dbe-drop-zone">
                        <div class="dbe-drop-inner">
                            <i class="fas fa-cloud-upload-alt dbe-drop-icon"></i>
                            <p class="dbe-drop-title">Glissez-déposez votre fichier</p>
                            <p class="dbe-drop-sub">
                                ou <label for="dbe-file-input" class="dbe-browse-link">parcourir sur votre ordinateur</label>
                            </p>
                            <p class="dbe-drop-types">GeoJSON &nbsp;·&nbsp; Shapefile ZIP</p>
                        </div>
                        <input type="file" id="dbe-file-input" accept=".geojson,.json,.zip" style="display:none">
                    </div>

                    <div id="dbe-file-badge" class="dbe-file-badge" style="display:none">
                        <i class="fas fa-file-alt"></i>
                        <span id="dbe-file-name-text"></span>
                        <button id="dbe-file-clear" class="dbe-file-clear" title="Retirer">×</button>
                    </div>

                    <div class="dbe-modal-fields">
                        <div class="dbe-field">
                            <label class="dbe-field-label" for="dbe-table-name">
                                <i class="fas fa-table"></i> Nom de la table cible
                            </label>
                            <input type="text" id="dbe-table-name"
                                placeholder="ex: voirie_import"
                                pattern="[a-z][a-z0-9_]*" maxlength="63" autocomplete="off"/>
                            <span class="dbe-field-hint">Minuscules, chiffres et underscores uniquement</span>
                        </div>

                        <div class="dbe-field">
                            <label class="dbe-field-label">
                                <i class="fas fa-layer-group"></i> Mode d'import
                            </label>
                            <div class="dbe-radio-row">
                                <label class="dbe-radio">
                                    <input type="radio" name="dbe-mode" value="create" checked>
                                    <span class="dbe-radio-mark"></span>
                                    <span>Créer / remplacer la table</span>
                                </label>
                                <label class="dbe-radio">
                                    <input type="radio" name="dbe-mode" value="append">
                                    <span class="dbe-radio-mark"></span>
                                    <span>Ajouter à une table existante</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div id="dbe-import-msg" class="dbe-import-msg" style="display:none"></div>
                </div>

                <div class="dbe-modal-foot">
                    <button id="dbe-import-cancel" class="dbe-btn dbe-btn-ghost">
                        Annuler
                    </button>
                    <button id="dbe-import-submit" class="dbe-btn dbe-btn-import-submit" disabled>
                        <i class="fas fa-upload"></i> Lancer l'import
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        return modal;
    }

    // ── Bouton navbar ─────────────────────────────────────────────────────
    function _buildNavBtn() {
        const li = document.createElement("li");
        li.className = "ms-2";
        li.id = "dbe-nav-item";
        li.innerHTML = `<button id="dbe-nav-btn" class="btn btn-light mv-navbar-btn" title="Explorateur de base de données">
            <i class="fas fa-database"></i><span class="mv-btn-label"> Base de données</span>
        </button>`;
        const navRight = document.querySelector("ul.nav.navbar-nav.navbar-right") ||
                         document.querySelector("ul.navbar-nav.navbar-right") ||
                         document.querySelector("ul.navbar-nav");
        if (navRight) {
            const chipLi = navRight.querySelector("#ua-user-chip");
            const helpLi = navRight.querySelector("li.ms-3");
            const anchor = chipLi || helpLi || null;
            anchor ? navRight.insertBefore(li, anchor) : navRight.appendChild(li);
        } else {
            document.body.appendChild(li);
        }
        return document.getElementById("dbe-nav-btn");
    }

    // ── Chargement des tables ─────────────────────────────────────────────
    function _loadTables() {
        fetch(TABLES_URL, { credentials: 'same-origin' })
            .then(r => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status} ${r.statusText}`);
                }
                return r.text();
            })
            .then(text => {
                try {
                    const data = JSON.parse(text);
                    _tables = data.tables || [];
                    _renderTableList();
                } catch (err) {
                    throw new Error(`Réponse invalide : ${err.message}\n${text}`);
                }
            })
            .catch(error => {
                console.error("DB Explorer loadTables error:", error);
                document.getElementById("dbe-table-list").innerHTML =
                    `<div class="dbe-loading" style="color:#e06c75">Erreur de chargement : ${error.message}</div>`;
            });
    }

    function _renderTableList() {
        const list = document.getElementById("dbe-table-list");
        if (!_tables.length) {
            list.innerHTML = '<div class="dbe-loading">Aucune table trouvée</div>';
            return;
        }

        const tables = _tables.filter(t => t.kind === "table");
        const views  = _tables.filter(t => t.kind === "view");

        function renderGroup(title, items, icon) {
            if (!items.length) return "";
            return `<div class="dbe-group-label">${title}</div>` +
                items.map(t => `
                    <div class="dbe-table-item" data-table="${t.name}" data-kind="${t.kind}">
                        <i class="${icon}"></i>
                        <span class="dbe-tname">${t.name}</span>
                    </div>`).join("");
        }

        list.innerHTML =
            renderGroup("Tables", tables, "fas fa-table") +
            renderGroup("Vues", views, "fas fa-eye");

        list.addEventListener("click", event => {
            const item = event.target.closest(".dbe-table-item");
            if (!item) return;
            list.querySelectorAll(".dbe-table-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            _activeTable = item.dataset.table;
            const sql = `SELECT * FROM cnig_accessibilite.${_activeTable} LIMIT 100;`;
            document.getElementById("dbe-sql-editor").value = sql;
            _runQuery(sql);
        });

        list.addEventListener("contextmenu", event => {
            const item = event.target.closest(".dbe-table-item");
            if (!item) return;
            event.preventDefault();
            event.stopPropagation();
            _showContextMenu(event, item.dataset.table);
        });
    }

    // ── Requête SQL ───────────────────────────────────────────────────────
    function _runQuery(sql) {
        if (!sql || !sql.trim()) return;
        const runBtn   = document.getElementById("dbe-run-btn");
        const limit    = parseInt(document.getElementById("dbe-limit-select").value);
        const gridWrap = document.getElementById("dbe-grid-wrapper");
        const msg      = document.getElementById("dbe-results-msg");
        const status   = document.getElementById("dbe-status");

        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Exécution…</span>';
        msg.className = "";
        msg.style.display = "flex";
        msg.innerHTML = '<div><i class="fas fa-spinner fa-spin" style="font-size:20px;margin-bottom:10px;display:block;opacity:.4"></i>Exécution en cours…</div>';
        gridWrap.style.display = "none";
        status.innerHTML = "";

        fetch(QUERY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql, limit }),
        })
        .then(r => r.json())
        .then(data => {
            runBtn.disabled = false;
            runBtn.innerHTML = '<i class="fas fa-play"></i><span>Exécuter</span><kbd>Ctrl+↵</kbd>';

            if (data.error) {
                msg.className = "error";
                msg.style.display = "flex";
                msg.innerHTML = `<div><i class="fas fa-exclamation-circle" style="font-size:20px;margin-bottom:8px;display:block"></i>${data.error}</div>`;
                gridWrap.style.display = "none";
                status.innerHTML = `<span style="color:#e06c75">Erreur SQL</span>`;
                return;
            }

            _renderGrid(data);

            const rowTxt = data.has_more
                ? `<span class="dbe-status-rows">${data.count} lignes affichées (limite ${limit})</span>`
                : `<span class="dbe-status-rows">${data.count} ligne${data.count > 1 ? "s" : ""}</span>`;
            status.innerHTML = `${rowTxt}<span class="dbe-status-time">Terminé en ${_fmtTime(data.elapsed_ms)}</span>`;
        })
        .catch(() => {
            runBtn.disabled = false;
            runBtn.innerHTML = '<i class="fas fa-play"></i><span>Exécuter</span><kbd>Ctrl+↵</kbd>';
            msg.className = "error";
            msg.style.display = "flex";
            msg.innerHTML = '<div><i class="fas fa-wifi" style="font-size:20px;margin-bottom:8px;display:block"></i>Impossible de joindre le serveur.</div>';
        });
    }

    // ── Grille résultats ──────────────────────────────────────────────────
    function _renderGrid(data) {
        const gridWrap = document.getElementById("dbe-grid-wrapper");
        const msg      = document.getElementById("dbe-results-msg");
        const thead    = document.querySelector("#dbe-grid thead");
        const tbody    = document.querySelector("#dbe-grid tbody");

        const colTypes = {};
        if (_activeTable) {
            const tDef = _tables.find(t => t.name === _activeTable);
            if (tDef) tDef.columns.forEach(c => { colTypes[c.name] = c.type; });
        }

        const headerRow = document.createElement("tr");
        const rownumTh  = document.createElement("th");
        rownumTh.className = "dbe-rownum-h";
        headerRow.appendChild(rownumTh);

        data.columns.forEach(colName => {
            const th    = document.createElement("th");
            const inner = document.createElement("div");
            inner.className = "dbe-th-inner";
            const nameEl = document.createElement("span");
            nameEl.className = "dbe-col-name";
            nameEl.textContent = colName;
            const typeEl = document.createElement("span");
            typeEl.className = "dbe-col-type";
            typeEl.textContent = colTypes[colName] || "";
            inner.appendChild(nameEl);
            inner.appendChild(typeEl);
            th.appendChild(inner);
            headerRow.appendChild(th);
        });

        thead.innerHTML = "";
        thead.appendChild(headerRow);
        tbody.innerHTML = "";

        data.rows.forEach((row, idx) => {
            const tr = document.createElement("tr");
            const tdNum = document.createElement("td");
            tdNum.className = "dbe-rownum";
            tdNum.textContent = idx + 1;
            tr.appendChild(tdNum);

            row.forEach(cell => {
                const td = document.createElement("td");
                if (cell === null) {
                    td.innerHTML = '<span class="dbe-null">[null]</span>';
                } else if (cell === true || cell === "true") {
                    td.innerHTML = '<span class="dbe-true">true</span>';
                } else if (cell === false || cell === "false") {
                    td.innerHTML = '<span class="dbe-false">false</span>';
                } else {
                    td.textContent = cell;
                    td.title = cell.length > 40 ? cell : "";
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        msg.style.display = "none";
        gridWrap.style.display = "block";
    }

    // ── Export ────────────────────────────────────────────────────────────
    function _initExport(exportMenu) {
        const exportBtn = document.getElementById("dbe-export-btn");
        let _menuOpen = false;

        function _openMenu() {
            const rect = exportBtn.getBoundingClientRect();
            exportMenu.style.display = "block";
            exportMenu.style.top  = (rect.bottom + 6) + "px";
            exportMenu.style.left = rect.left + "px";
            // Flip left if overflows right edge
            const mw = exportMenu.offsetWidth || 220;
            if (rect.left + mw > window.innerWidth - 8) {
                exportMenu.style.left = (rect.right - mw) + "px";
            }
            _menuOpen = true;
        }

        function _closeMenu() {
            exportMenu.style.display = "none";
            _menuOpen = false;
        }

        exportBtn.addEventListener("click", e => {
            e.stopPropagation();
            _menuOpen ? _closeMenu() : _openMenu();
        });

        document.addEventListener("click", _closeMenu);

        document.getElementById("dbe-export-csv").addEventListener("click", () => {
            _closeMenu();
            _doExport("csv");
        });

        document.getElementById("dbe-export-geojson").addEventListener("click", () => {
            _closeMenu();
            if (!_activeTable) {
                _showStatusMsg("Sélectionnez d'abord une table pour exporter en GeoJSON.", "warn");
                return;
            }
            _doExport("geojson");
        });
    }

    function _doExport(format) {
        const sql = document.getElementById("dbe-sql-editor").value.trim();

        const body = { format };
        if (format === "geojson" && _activeTable) {
            body.table = _activeTable;
        } else if (sql) {
            body.sql = sql;
            if (_activeTable) body.table = _activeTable;
        } else if (_activeTable) {
            body.table = _activeTable;
        } else {
            _showStatusMsg("Aucune requête ou table sélectionnée.", "warn");
            return;
        }

        _showStatusMsg('<i class="fas fa-spinner fa-spin"></i> Export en cours…', "info");

        fetch(EXPORT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
        .then(resp => {
            if (!resp.ok) return resp.json().then(d => { throw new Error(d.error || "Erreur export"); });
            const cd    = resp.headers.get("Content-Disposition") || "";
            const match = cd.match(/filename="([^"]+)"/);
            const fname = match ? match[1] : `export.${format}`;
            return resp.blob().then(blob => ({ blob, fname }));
        })
        .then(({ blob, fname }) => {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement("a");
            a.href = url; a.download = fname; a.click();
            URL.revokeObjectURL(url);
            _showStatusMsg(`<i class="fas fa-check-circle"></i> Téléchargé : ${fname}`, "ok");
        })
        .catch(err => _showStatusMsg(`<i class="fas fa-times-circle"></i> ${err.message}`, "err"));
    }

    // ── Import ────────────────────────────────────────────────────────────
    function _initImport(modal) {
        const closeBtn   = document.getElementById("dbe-modal-close");
        const cancelBtn  = document.getElementById("dbe-import-cancel");
        const submitBtn  = document.getElementById("dbe-import-submit");
        const fileInput  = document.getElementById("dbe-file-input");
        const dropZone   = document.getElementById("dbe-drop-zone");
        const fileBadge  = document.getElementById("dbe-file-badge");
        const fileNameTx = document.getElementById("dbe-file-name-text");
        const fileClear  = document.getElementById("dbe-file-clear");
        const tableInput = document.getElementById("dbe-table-name");
        const importMsg  = document.getElementById("dbe-import-msg");

        let _file = null;

        function _openModal() {
            modal.style.display = "flex";
            _file = null;
            fileBadge.style.display = "none";
            tableInput.value = "";
            importMsg.style.display = "none";
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Lancer l\'import';
        }
        function _closeModal() { modal.style.display = "none"; }

        function _canSubmit() {
            return _file && /^[a-z][a-z0-9_]*$/.test(tableInput.value.trim());
        }
        function _refreshSubmit() { submitBtn.disabled = !_canSubmit(); }

        function _setFile(f) {
            _file = f;
            fileNameTx.textContent = f.name;
            fileBadge.style.display = "flex";
            dropZone.classList.add("dbe-has-file");
            if (!tableInput.value.trim()) {
                const base = f.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]/g, "_");
                tableInput.value = /^[a-z]/.test(base) ? base : "imp_" + base;
            }
            _refreshSubmit();
        }

        document.getElementById("dbe-import-btn").addEventListener("click", _openModal);
        closeBtn.addEventListener("click", _closeModal);
        cancelBtn.addEventListener("click", _closeModal);
        modal.addEventListener("click", e => { if (e.target === modal) _closeModal(); });

        fileClear.addEventListener("click", () => {
            _file = null;
            fileBadge.style.display = "none";
            dropZone.classList.remove("dbe-has-file");
            fileInput.value = "";
            _refreshSubmit();
        });

        fileInput.addEventListener("change", () => {
            if (fileInput.files.length) _setFile(fileInput.files[0]);
        });

        ["dragover","dragenter"].forEach(ev => dropZone.addEventListener(ev, e => {
            e.preventDefault(); dropZone.classList.add("dbe-drop-active");
        }));
        ["dragleave","dragend"].forEach(ev => dropZone.addEventListener(ev, () =>
            dropZone.classList.remove("dbe-drop-active")));
        dropZone.addEventListener("drop", e => {
            e.preventDefault();
            dropZone.classList.remove("dbe-drop-active");
            if (e.dataTransfer.files.length) _setFile(e.dataTransfer.files[0]);
        });

        tableInput.addEventListener("input", _refreshSubmit);

        submitBtn.addEventListener("click", () => {
            if (!_file || !_canSubmit()) return;
            const tableName = tableInput.value.trim().toLowerCase();
            const mode = document.querySelector('input[name="dbe-mode"]:checked').value;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Import en cours…';
            importMsg.style.display = "none";

            const fd = new FormData();
            fd.append("file", _file);
            fd.append("table_name", tableName);
            fd.append("mode", mode);

            fetch(IMPORT_URL, { method: "POST", body: fd })
            .then(r => r.json())
            .then(data => {
                submitBtn.innerHTML = '<i class="fas fa-upload"></i> Lancer l\'import';
                if (data.error) {
                    _showImportMsg("error", `<i class="fas fa-times-circle"></i> ${data.error}`);
                    submitBtn.disabled = false;
                } else {
                    _showImportMsg("success",
                        `<i class="fas fa-check-circle"></i> Import terminé ` +
                        `<strong>${data.inserted}</strong> enregistrement(s) insérés` +
                        (data.skipped ? `, <strong>${data.skipped}</strong> ignorés` : "") +
                        `. Table : <code>${data.table}</code>`);
                    _loadTables();
                    setTimeout(() => {
                        _activeTable = tableName;
                        document.getElementById("dbe-sql-editor").value =
                            `SELECT * FROM cnig_accessibilite.${tableName} LIMIT 100;`;
                    }, 500);
                }
            })
            .catch(() => {
                submitBtn.innerHTML = '<i class="fas fa-upload"></i> Lancer l\'import';
                submitBtn.disabled = false;
                _showImportMsg("error", '<i class="fas fa-times-circle"></i> Erreur réseau. Veuillez réessayer.');
            });
        });

        function _showImportMsg(type, html) {
            importMsg.className = "dbe-import-msg dbe-import-" + type;
            importMsg.innerHTML = html;
            importMsg.style.display = "flex";
        }
    }

    // ── Helpers statut ────────────────────────────────────────────────────
    function _showStatusMsg(html, type) {
        const status = document.getElementById("dbe-status");
        if (!status) return;
        const color = { ok: "#98c379", err: "#e06c75", warn: "#e5c07b", info: "#4a90d9" }[type] || "#ced4da";
        status.innerHTML = `<span style="color:${color}">${html}</span>`;
    }

    // ── Ouverture / Fermeture ─────────────────────────────────────────────
    function _open() {
        document.getElementById("dbe-panel").classList.add("open");
        document.getElementById("dbe-nav-btn").classList.add("active");
    }
    function _close() {
        document.getElementById("dbe-panel").classList.remove("open");
        document.getElementById("dbe-nav-btn").classList.remove("active");
    }

    // ── Init ──────────────────────────────────────────────────────────────
    function init() {
        _injectCSS();
        const panel       = _buildPanel();
        const exportMenu  = _buildExportDropdown();
        const contextMenu = _buildContextMenu();
        const styleModal  = _buildStyleModal();
        const importModal = _buildImportModal();
        const navBtn      = _buildNavBtn();

        navBtn.addEventListener("click", () =>
            panel.classList.contains("open") ? _close() : _open());
        document.getElementById("dbe-close-btn").addEventListener("click", _close);

        document.getElementById("dbe-sql-editor").addEventListener("keydown", e => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                _runQuery(document.getElementById("dbe-sql-editor").value);
            }
        });
        document.getElementById("dbe-run-btn").addEventListener("click", () =>
            _runQuery(document.getElementById("dbe-sql-editor").value));
        document.getElementById("dbe-clear-btn").addEventListener("click", () => {
            document.getElementById("dbe-sql-editor").value = "";
            document.getElementById("dbe-grid-wrapper").style.display = "none";
            const msg = document.getElementById("dbe-results-msg");
            msg.style.display = "flex";
            msg.className = "";
            msg.innerHTML = '<div><i class="fas fa-database" style="font-size:28px;margin-bottom:10px;display:block;opacity:.2"></i>Saisir une requête</div>';
            document.getElementById("dbe-status").innerHTML = "";
            _activeTable = null;
            document.querySelectorAll(".dbe-table-item").forEach(i => i.classList.remove("active"));
        });

        _initExport(exportMenu);
        _initImport(importModal);
        _loadTables();
    }

    return { init };
})();

DbExplorer.init();
