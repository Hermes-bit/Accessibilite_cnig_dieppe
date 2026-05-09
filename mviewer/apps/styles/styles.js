/**
 * Styles des couches CNIG Accessibilité
 * Reproduit fidèlement le rendu QGIS du CNIG.
 *
 * Accès aux couches via layer.get('mviewerid') propriété posée par mviewer
 * sur chaque ol.layer.Vector lors du _processLayer().
 */

(function () {

    // ── Configurations des styles par id de couche (= id dans le XML) ─────────
    var CFG = {
        // LIGNES couleur fixe
        traversees:         { type: 'line',   color: '#e74c3c', width: 3 },   // rouge
        rampes:             { type: 'line',   color: '#27ae60', width: 3 },   // vert
        escaliers:          { type: 'line',   color: '#8e44ad', width: 3 },   // violet
        quais:              { type: 'line',   color: '#2980b9', width: 3 },   // bleu
        circulation:        { type: 'line',   color: '#f39c12', width: 3 },   // orange

        // LIGNES couleur dynamique (propriété couleur_acces sur la feature)
        //   #2ecc71 = accessible | #f39c12 = intermédiaire | #e74c3c = inaccessible
        troncons: { type: 'dynamic-line', prop: 'couleur_acces', fallback: '#f39c12', width: 4 },

        // POINTS cercles
        noeuds:           { type: 'circle', color: '#2c3e50', radius: 4 },
        entrees:          { type: 'circle', color: '#e67e22', radius: 6 },
        passage_selectif: { type: 'circle', color: '#d35400', radius: 6 },

        // POINTS carrés
        obstacles:          { type: 'square', color: '#e74c3c', size: 5 },
        stationnements_pmr: { type: 'square', color: '#1565c0', size: 7 },
    };

    // ── Fabrique un style OL à partir d'une config ────────────────────────────
    function buildStyle(cfg) {
        var ol = window.ol;

        if (cfg.type === 'line') {
            return new ol.style.Style({
                stroke: new ol.style.Stroke({ color: cfg.color, width: cfg.width })
            });
        }

        if (cfg.type === 'dynamic-line') {
            return function (feature) {
                var color = feature.get(cfg.prop) || cfg.fallback;
                return new ol.style.Style({
                    stroke: new ol.style.Stroke({ color: color, width: cfg.width })
                });
            };
        }

        if (cfg.type === 'circle') {
            return new ol.style.Style({
                image: new ol.style.Circle({
                    radius: cfg.radius,
                    fill:   new ol.style.Fill({ color: cfg.color }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 1.5 })
                })
            });
        }

        if (cfg.type === 'square') {
            return new ol.style.Style({
                image: new ol.style.RegularShape({
                    fill:   new ol.style.Fill({ color: cfg.color }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 1.5 }),
                    points: 4,
                    radius: cfg.size,
                    angle:  Math.PI / 4
                })
            });
        }

        return null;
    }

    // ── Applique les styles à toutes les couches OL de la carte ───────────────
    // Accès direct via layer.get('mviewerid') évite mviewer.getLayer()
    function applyAll() {
        var map = window.mviewer && window.mviewer.getMap && window.mviewer.getMap();
        if (!map) return;

        map.getLayers().forEach(function (layer) {
            var id = layer.get && layer.get('mviewerid');
            if (!id || !CFG[id]) return;
            if (typeof layer.setStyle !== 'function') return;

            var style = buildStyle(CFG[id]);
            if (style) {
                layer.setStyle(style);
            }
        });
    }

    // ── Démarrage : poll toutes les 500 ms jusqu'à ce que la carte soit prête,
    //   puis relance après chaque ajout de couche ─────────────────────────────
    var _attempts = 0;
    var _interval = setInterval(function () {
        _attempts++;
        var map = window.mviewer && window.mviewer.getMap && window.mviewer.getMap();
        if (map) {
            clearInterval(_interval);
            applyAll();
            // Réapplique quand une nouvelle couche est ajoutée (couche rendue visible)
            map.getLayers().on('add', function () {
                setTimeout(applyAll, 100);
            });
        }
        // Abandon après 15 secondes
        if (_attempts > 30) clearInterval(_interval);
    }, 500);

})();
