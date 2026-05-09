/**
 * tour.js Visite guidée "onboarding" pour les nouveaux utilisateurs
 * Déclenché automatiquement à la première connexion (cnig:login event).
 * Peut être relancé via le menu utilisateur (chip dropdown).
 * Stocke l'état dans localStorage['cnig_tour_done'].
 */
(function () {
    "use strict";

    var STORAGE_KEY = "cnig_tour_done";

    /* ── Définition des étapes ───────────────────────────────────────────── */
    var STEPS = [
        {
            title:    "Bienvenue sur la plateforme CNIG Accessibilité !",
            text:     "Cette visite rapide vous présente les fonctionnalités principales. Vous pouvez la passer à tout moment et la relancer depuis votre profil.",
            target:   null,
            position: "center"
        },
        {
            title:    "La carte interactive",
            text:     "Naviguez sur la carte pour visualiser les voies d'accessibilité certifiées CNIG de Dieppe. Les tronçons sont colorés selon leur niveau d'accessibilité. Zoomez, déplacez-vous, cliquez sur un tronçon pour ses détails.",
            target:   ".ol-viewport, #map, #mapcontainer, #map-div",
            position: "right"
        },
        {
            title:    "Calculer un itinéraire accessible",
            text:     "Cliquez ici pour calculer un itinéraire entre deux adresses. Choisissez le profil Piéton ou Fauteuil roulant l'algorithme évite automatiquement les obstacles inaccessibles.",
            target:   "#routing-nav-item",
            position: "bottom"
        },
        {
            title:    "Explorateur de base de données",
            text:     "Parcourez les tables CNIG, exécutez des requêtes SQL personnalisées, exportez les résultats en CSV ou GeoJSON, et importez vos propres données géographiques (GeoJSON ou Shapefile).",
            target:   "#dbe-nav-item",
            position: "bottom"
        },
        {
            title:    "Votre profil utilisateur",
            text:     "Cliquez sur votre avatar pour accéder à votre profil : changer de mot de passe, consulter votre rôle, ou gérer les utilisateurs si vous êtes administrateur.",
            target:   "#ua-user-chip",
            position: "bottom-left"
        },
        {
            title:    "C'est parti !",
            text:     "Vous êtes prêt à utiliser la plateforme. Si vous souhaitez revoir cette visite, rendez-vous dans le menu de votre profil utilisateur → <strong>Visite guidée</strong>.",
            target:   null,
            position: "center"
        }
    ];

    /* ── État interne ────────────────────────────────────────────────────── */
    var _step      = 0;
    var _overlay   = null;
    var _highlight = null;
    var _tooltip   = null;

    /* ── Init ────────────────────────────────────────────────────────────── */
    function _init() {
        // Inject CSS
        var link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = "apps/tour/tour.css";
        document.head.appendChild(link);

        // Listen for login event dispatched by userauth.js
        document.addEventListener("cnig:login", function () {
            if (!localStorage.getItem(STORAGE_KEY)) {
                setTimeout(_start, 900);
            }
        });

        // Expose start function globally so the user chip can call it
        window.CnigTour = { start: _start };
    }

    /* ── Démarrer / Arrêter ──────────────────────────────────────────────── */
    function _start() {
        if (_overlay) _destroy(); // clean up if already running
        _step = 0;
        _buildDOM();
        _showStep(0);
    }

    function _destroy() {
        if (_overlay)   { document.body.removeChild(_overlay);   _overlay   = null; }
        if (_highlight) { document.body.removeChild(_highlight); _highlight = null; }
        if (_tooltip)   { document.body.removeChild(_tooltip);   _tooltip   = null; }
        window.removeEventListener("resize", _onResize);
    }

    function _end() {
        localStorage.setItem(STORAGE_KEY, "1");
        _destroy();
    }

    /* ── DOM ─────────────────────────────────────────────────────────────── */
    function _buildDOM() {
        _overlay = document.createElement("div");
        _overlay.id = "tour-overlay";
        document.body.appendChild(_overlay);

        _highlight = document.createElement("div");
        _highlight.id = "tour-highlight";
        document.body.appendChild(_highlight);

        _tooltip = document.createElement("div");
        _tooltip.id = "tour-tooltip";
        document.body.appendChild(_tooltip);

        window.addEventListener("resize", _onResize);
    }

    function _onResize() {
        _positionStep(STEPS[_step]);
    }

    /* ── Afficher une étape ──────────────────────────────────────────────── */
    function _showStep(index) {
        _step = index;
        var step   = STEPS[index];
        var isLast = index === STEPS.length - 1;

        // Build tooltip HTML
        _tooltip.innerHTML = [
            '<div class="tour-header">',
            '  <span class="tour-counter">' + (index + 1) + ' / ' + STEPS.length + '</span>',
            '  <button class="tour-skip" id="tour-skip-btn">Passer la visite ×</button>',
            '</div>',
            '<div class="tour-title">' + step.title + '</div>',
            '<div class="tour-text">'  + step.text  + '</div>',
            '<div class="tour-actions">',
            (index > 0 ? '<button class="tour-btn tour-prev" id="tour-prev-btn">&#8592; Précédent</button>' : '<span></span>'),
            '<button class="tour-btn tour-next" id="tour-next-btn">' +
                (isLast ? 'Terminer &#10003;' : 'Suivant &#8594;') + '</button>',
            '</div>',
            /* Step dots */
            '<div class="tour-dots">' +
            STEPS.map(function (_, i) {
                return '<span class="tour-dot' + (i === index ? ' active' : '') + '"></span>';
            }).join("") +
            '</div>'
        ].join("");

        document.getElementById("tour-skip-btn").addEventListener("click", _end);
        document.getElementById("tour-next-btn").addEventListener("click", function () {
            isLast ? _end() : _showStep(index + 1);
        });
        var prevBtn = document.getElementById("tour-prev-btn");
        if (prevBtn) prevBtn.addEventListener("click", function () { _showStep(index - 1); });

        _positionStep(step);
    }

    /* ── Positionnement ──────────────────────────────────────────────────── */
    function _positionStep(step) {
        if (!step.target) {
            _highlight.style.display = "none";
            _overlay.className = "tour-dimmed";
            _tooltip.className = "tour-tooltip tour-centered";
            _tooltip.style.cssText = "";
            return;
        }

        // Try multiple selectors (comma-separated)
        var el = null;
        var selectors = step.target.split(",");
        for (var i = 0; i < selectors.length; i++) {
            el = document.querySelector(selectors[i].trim());
            if (el) break;
        }

        if (!el) {
            // Element not found skip to next step
            _showStep(_step + 1 < STEPS.length ? _step + 1 : _step);
            return;
        }

        var rect = el.getBoundingClientRect();
        var pad  = 6;

        // Position highlight box
        _highlight.style.display = "block";
        _highlight.style.top     = (rect.top    - pad) + "px";
        _highlight.style.left    = (rect.left   - pad) + "px";
        _highlight.style.width   = (rect.width  + pad * 2) + "px";
        _highlight.style.height  = (rect.height + pad * 2) + "px";

        _overlay.className = "tour-dimmed";
        _tooltip.className = "tour-tooltip";
        _tooltip.style.cssText = "";

        _placeTooltip(rect, step.position || "bottom");
    }

    function _placeTooltip(rect, pos) {
        var TW   = 300;
        var gap  = 14;
        var vpW  = window.innerWidth;
        var vpH  = window.innerHeight;

        _tooltip.style.width = TW + "px";
        _tooltip.style.position = "fixed";

        var left, top;

        if (pos === "bottom" || pos === "bottom-left") {
            top  = rect.bottom + gap;
            left = pos === "bottom-left" ? rect.right - TW : rect.left;
        } else if (pos === "top") {
            top  = rect.top - gap - 200; // approximate height
            left = rect.left;
        } else if (pos === "right") {
            top  = rect.top + (rect.height / 2) - 80;
            left = rect.right + gap;
        } else {
            top  = rect.bottom + gap;
            left = rect.left;
        }

        // Clamp to viewport
        left = Math.max(10, Math.min(left, vpW - TW - 10));
        top  = Math.max(10, Math.min(top,  vpH - 220));

        _tooltip.style.top  = top  + "px";
        _tooltip.style.left = left + "px";
    }

    /* ── Boot ────────────────────────────────────────────────────────────── */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", _init);
    } else {
        _init();
    }

})();
