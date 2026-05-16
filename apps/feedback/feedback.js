/**
 * feedback.js — Extension mviewer CNIG Accessibilité
 * Permet à chaque testeur de soumettre des retours directement depuis la carte.
 * Les admins peuvent consulter et gérer tous les retours.
 */
(function () {
  "use strict";

  var API_BASE = "https://hermes58.alwaysdata.net/api/v1";
  var LS_ACCESS = "ua_access_token";

  /* ── CSS ─────────────────────────────────────────────────── */
  (function () {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "apps/feedback/feedback.css";
    document.head.appendChild(link);
  })();

  /* ── Helpers ─────────────────────────────────────────────── */
  function _getToken() {
    return localStorage.getItem(LS_ACCESS) || null;
  }

  function _detectDevice() {
    var ua = navigator.userAgent;
    var screen_size = screen.width + "x" + screen.height;
    var os = "Inconnu";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Mac/.test(ua)) os = "macOS";
    else if (/iPhone/.test(ua)) os = "iPhone";
    else if (/iPad/.test(ua)) os = "iPad";
    else if (/Android/.test(ua)) os = "Android";
    else if (/Linux/.test(ua)) os = "Linux";

    var browser = "Inconnu";
    if (/Edg/.test(ua)) browser = "Edge";
    else if (/Chrome/.test(ua)) browser = "Chrome";
    else if (/Firefox/.test(ua)) browser = "Firefox";
    else if (/Safari/.test(ua)) browser = "Safari";

    return { os: os, browser: browser, screen_size: screen_size, ua: ua };
  }

  function _getCurrentUser(cb) {
    var token = _getToken();
    if (!token) return cb(null);
    fetch(API_BASE.replace("/api/v1", "/auth") + "/me", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(cb)
      .catch(function () {
        cb(null);
      });
  }

  /* ── DOM Builder ─────────────────────────────────────────── */
  function _buildPanel() {
    if (document.getElementById("fb-overlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "fb-overlay";
    overlay.className = "fb-hidden";

    overlay.innerHTML = [
      '<div id="fb-panel">',
      "  <div id=\"fb-header\">",
      "    <i class=\"fas fa-clipboard-list\"></i>",
      "    <h2 id=\"fb-title\">Recettage — Signaler un retour</h2>",
      "    <button id=\"fb-close\" title=\"Fermer\">&times;</button>",
      "  </div>",
      '  <div id="fb-tabs" style="display:none">',
      '    <button class="fb-tab active" id="fb-tab-submit">Soumettre</button>',
      '    <button class="fb-tab" id="fb-tab-list">Tous les retours <span id="fb-count-total"></span></button>',
      "  </div>",
      '  <div id="fb-body">',
      /* ── Submit form ── */
      '    <div id="fb-form-view">',
      '      <div class="fb-msg" id="fb-msg"></div>',
      '      <div class="fb-group" id="fb-reporter-group">',
      '        <label>Votre nom / e-mail</label>',
      '        <input type="text" id="fb-reporter" placeholder="ex: Prénom ou nomprenom@exemple.com" />',
      "      </div>",
      '      <div class="fb-group">',
      "        <label>Sévérité</label>",
      '        <div class="fb-severity-row">',
      '          <button class="fb-sev" data-sev="bloquant">🔴 Bloquant</button>',
      '          <button class="fb-sev" data-sev="majeur">🟠 Majeur</button>',
      '          <button class="fb-sev selected" data-sev="mineur">🔵 Mineur</button>',
      '          <button class="fb-sev" data-sev="amelioration">🟢 Amélioration</button>',
      "        </div>",
      "      </div>",
      '      <div class="fb-group">',
      "        <label>Zone concernée</label>",
      '        <select id="fb-area">',
      '          <option value="carte">Carte / fond de plan</option>',
      '          <option value="couches">Couches de données</option>',
      '          <option value="connexion">Connexion / authentification</option>',
      '          <option value="itineraire">Calcul d\'itinéraire</option>',
      '          <option value="explorateur">Explorateur de données</option>',
      '          <option value="responsive">Affichage mobile</option>',
      '          <option value="autre">Autre</option>',
      "        </select>",
      "      </div>",
      '      <div class="fb-group">',
      "        <label>Description du problème *</label>",
      '        <textarea id="fb-desc" placeholder="Décrivez ce que vous avez observé, les étapes pour reproduire le problème, ce que vous attendiez..."></textarea>',
      "      </div>",
      '      <div class="fb-device-info" id="fb-device-info"></div>',
      '      <button class="fb-btn" id="fb-submit">Envoyer le retour</button>',
      "    </div>",
      /* ── Admin list ── */
      '    <div id="fb-list-view">',
      '      <div id="fb-list-content"><p class="fb-list-empty">Chargement…</p></div>',
      "    </div>",
      "  </div>",
      "</div>",
    ].join("\n");

    document.body.appendChild(overlay);
    _bindPanelEvents();
  }

  /* ── Events ─────────────────────────────────────────────── */
  var _selectedSeverity = "mineur";
  var _isAdmin = false;

  function _bindPanelEvents() {
    document.getElementById("fb-close").addEventListener("click", _closePanel);
    document.getElementById("fb-overlay").addEventListener("click", function (e) {
      if (e.target === this) _closePanel();
    });

    /* Severity pills */
    document.querySelectorAll(".fb-sev").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".fb-sev").forEach(function (b) {
          b.classList.remove("selected");
        });
        this.classList.add("selected");
        _selectedSeverity = this.dataset.sev;
      });
    });

    /* Submit */
    document.getElementById("fb-submit").addEventListener("click", _onSubmit);

    /* Admin tabs */
    document.getElementById("fb-tab-submit").addEventListener("click", function () {
      _switchTab("submit");
    });
    document.getElementById("fb-tab-list").addEventListener("click", function () {
      _switchTab("list");
      _loadFeedbackList();
    });
  }

  function _switchTab(tab) {
    document.getElementById("fb-tab-submit").classList.toggle("active", tab === "submit");
    document.getElementById("fb-tab-list").classList.toggle("active", tab === "list");
    document.getElementById("fb-form-view").classList.toggle("hidden", tab === "list");
    document.getElementById("fb-list-view").classList.toggle("active", tab === "list");
  }

  function _onSubmit() {
    var desc = (document.getElementById("fb-desc").value || "").trim();
    if (!desc) {
      _showMsg("La description est obligatoire.", "error");
      return;
    }

    var device = _detectDevice();
    var reporter = (document.getElementById("fb-reporter").value || "").trim();

    var btn = document.getElementById("fb-submit");
    btn.disabled = true;
    btn.textContent = "Envoi…";

    var headers = { "Content-Type": "application/json" };
    var token = _getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    fetch(API_BASE + "/feedback", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        reporter: reporter || "Anonyme",
        severity: _selectedSeverity,
        feature_area: document.getElementById("fb-area").value,
        description: desc,
        browser: device.browser + " — " + device.ua.substring(0, 100),
        screen_size: device.screen_size,
        os_info: device.os,
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, data: d };
        });
      })
      .then(function (res) {
        if (res.ok) {
          _showMsg("✅ " + res.data.message, "success");
          document.getElementById("fb-desc").value = "";
          _selectedSeverity = "mineur";
          document.querySelectorAll(".fb-sev").forEach(function (b) {
            b.classList.toggle("selected", b.dataset.sev === "mineur");
          });
        } else {
          _showMsg("❌ " + (res.data.error || "Erreur serveur"), "error");
        }
      })
      .catch(function () {
        _showMsg("❌ Erreur réseau, réessayez.", "error");
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Envoyer le retour";
      });
  }

  function _showMsg(text, type) {
    var el = document.getElementById("fb-msg");
    el.textContent = text;
    el.className = "fb-msg visible " + type;
    setTimeout(function () {
      el.classList.remove("visible");
    }, 5000);
  }

  /* ── Admin: feedback list ───────────────────────────────── */
  function _loadFeedbackList() {
    var token = _getToken();
    if (!token) return;

    fetch(API_BASE + "/feedback", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (!data) return;
        _feedbackCache = data.feedback;
        var nouveau = data.feedback.filter(function (f) { return f.status === "nouveau"; });
        document.getElementById("fb-count-total").textContent = " (" + nouveau.length + ")";
        _renderList(data.feedback);
        _loadBadgeCount();
      });
  }

  var _SEVERITY_LABELS = {
    bloquant: "Bloquant",
    majeur: "Majeur",
    mineur: "Mineur",
    amelioration: "Amélioration",
  };
  var _STATUS_LABELS = {
    nouveau: "Nouveau",
    en_cours: "En cours",
    resolu: "Résolu",
    ignore: "Ignoré",
  };

  function _renderList(items) {
    var container = document.getElementById("fb-list-content");
    var active = items.filter(function (f) { return f.status === "nouveau"; });
    var hiddenCount = items.length - active.length;

    if (!active.length) {
      container.innerHTML = '<p class="fb-list-empty">Aucun nouveau retour.' +
        (hiddenCount ? ' <span style="color:#94a3b8">(' + hiddenCount + ' traité' + (hiddenCount > 1 ? 's' : '') + ')</span>' : '') +
        '</p>';
      return;
    }

    container.innerHTML = active.map(function (f) {
      var d = new Date(f.created_at).toLocaleString("fr-FR");
      return [
        '<div class="fb-item" data-id="' + f.id + '">',
        '  <div class="fb-item-top">',
        '    <span class="fb-badge ' + f.severity + '">' + (_SEVERITY_LABELS[f.severity] || f.severity) + "</span>",
        "    <strong style=\"font-size:12px;color:#475569\">" + _esc(f.feature_area || "") + "</strong>",
        '    <span class="fb-badge-status">' + (_STATUS_LABELS[f.status] || f.status) + "</span>",
        "  </div>",
        '  <div class="fb-item-desc fb-item-desc-click" onclick="window._fbDetail(' + f.id + ')" title="Voir le détail" style="cursor:pointer">' + _esc(f.description) + '</div>',
        '  <div class="fb-item-meta">',
        "    👤 " + _esc(f.reporter || "Anonyme") + " &nbsp;·&nbsp; 🖥 " + _esc(f.os_info || "") + " / " + _esc(f.browser ? f.browser.split(" — ")[0] : "") + " &nbsp;·&nbsp; 📺 " + _esc(f.screen_size || "") + " &nbsp;·&nbsp; 🕐 " + d,
        "  </div>",
        '  <div class="fb-item-actions">',
        '    <button class="fb-action-btn" onclick="window._fbDetail(' + f.id + ')">👁 Voir</button>',
        '<button class="fb-action-btn" onclick="window._fbResolve(' + f.id + ')">✓ Résoudre</button>',
        '<button class="fb-action-btn" onclick="window._fbIgnore(' + f.id + ')">✕ Ignorer</button>',
        "  </div>",
        "</div>",
      ].join("\n");
    }).join("") +
    (hiddenCount ? '<p class="fb-ignored-count">' + hiddenCount + ' retour' + (hiddenCount > 1 ? 's' : '') + ' traité' + (hiddenCount > 1 ? 's' : '') + ' (masqué' + (hiddenCount > 1 ? 's' : '') + ')</p>' : "");
  }

  /* ── Détail complet d'un retour ─────────────────────────── */
  var _feedbackCache = [];

  window._fbDetail = function (id) {
    var f = _feedbackCache.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    /* Marquer comme lu : disparaît de la liste comme un mail lu */
    var el = document.querySelector(".fb-item[data-id='" + id + "']");
    if (el && !el.dataset.read) {
      el.dataset.read = "1";
      el.style.transition = "opacity 0.25s";
      el.style.opacity = "0";
      setTimeout(function () { if (el.parentNode) el.remove(); }, 260);
      _patchStatus(id, "en_cours", false);
    }
    var d = new Date(f.created_at).toLocaleString("fr-FR");
    var modal = document.getElementById("fb-detail-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "fb-detail-modal";
      modal.className = "fb-detail-backdrop";
      document.body.appendChild(modal);
    }
    modal.innerHTML = [
      '<div class="fb-detail-box">',
      '  <div class="fb-detail-header">',
      '    <span>Détail du retour #' + f.id + '</span>',
      '    <button onclick="document.getElementById(\'fb-detail-modal\').style.display=\'none\'">&times;</button>',
      '  </div>',
      '  <div class="fb-detail-body">',
      '    <div class="fb-detail-row"><label>Rapporteur</label><span>' + _esc(f.reporter || "Anonyme") + "</span></div>",
      '    <div class="fb-detail-row"><label>Sévérité</label><span class="fb-badge ' + f.severity + '">' + (_SEVERITY_LABELS[f.severity] || f.severity) + "</span></div>",
      '    <div class="fb-detail-row"><label>Zone</label><span>' + _esc(f.feature_area || "—") + "</span></div>",
      '    <div class="fb-detail-row"><label>Statut</label><span>' + (_STATUS_LABELS[f.status] || f.status) + "</span></div>",
      '    <div class="fb-detail-row"><label>Date</label><span>' + d + "</span></div>",
      '    <div class="fb-detail-row"><label>Système</label><span>' + _esc((f.os_info || "") + " / " + (f.browser || "") + " / " + (f.screen_size || "")) + "</span></div>",
      '    <div class="fb-detail-desc"><label>Description</label><p>' + _esc(f.description) + "</p></div>",
      "  </div>",
      '  <div class="fb-detail-footer">',
      (f.status !== "resolu" ? '<button class="fb-action-btn" onclick="window._fbResolve(' + f.id + ');document.getElementById(\'fb-detail-modal\').style.display=\'none\'">✓ Résoudre</button>' : ""),
      (f.status !== "ignore" ? '<button class="fb-action-btn" onclick="window._fbIgnore(' + f.id + ');document.getElementById(\'fb-detail-modal\').style.display=\'none\'">✕ Ignorer</button>' : ""),
      '    <button class="fb-action-btn" onclick="document.getElementById(\'fb-detail-modal\').style.display=\'none\'">Fermer</button>',
      "  </div>",
      "</div>",
    ].join("\n");
    modal.style.display = "flex";
  };

  function _esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function _fadeOutItem(id) {
    var el = document.querySelector(".fb-item[data-id='" + id + "']");
    if (el) {
      el.style.transition = "opacity 0.25s";
      el.style.opacity = "0";
      setTimeout(function () { if (el.parentNode) el.remove(); }, 260);
    }
  }

  window._fbResolve = function (id) {
    _fadeOutItem(id);
    _patchStatus(id, "resolu", false);
  };
  window._fbIgnore = function (id) {
    _fadeOutItem(id);
    _patchStatus(id, "ignore", false);
  };

  function _patchStatus(id, status, reload) {
    var token = _getToken();
    fetch(API_BASE + "/feedback/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ status: status }),
    }).then(function () { if (reload !== false) _loadFeedbackList(); });
  }

  /* ── Open / Close ───────────────────────────────────────── */
  function _openPanel() {
    var device = _detectDevice();
    document.getElementById("fb-device-info").textContent =
      "💻 " + device.os + " · " + device.browser + " · " + device.screen_size;
    document.getElementById("fb-overlay").classList.remove("fb-hidden");
    _switchTab("submit");
  }

  function _closePanel() {
    document.getElementById("fb-overlay").classList.add("fb-hidden");
  }

  /* ── Navbar injection ───────────────────────────────────── */
  function _injectNavButton(isAdmin, hasQC) {
    _isAdmin = isAdmin;

    var li = document.createElement("li");
    li.id = "fb-nav-item";
    li.className = "ms-2";

    li.innerHTML =
      '<button id="fb-nav-btn" class="btn btn-light mv-navbar-btn" title="Signaler un retour de test">' +
      '<i class="fas fa-clipboard-list"></i>' +
      '<span class="mv-btn-label"> Recettage</span>' +
      '<span id="fb-count-badge"></span>' +
      "</button>";

    function _tryInject(attempts) {
      var navRight =
        document.querySelector("ul.nav.navbar-nav.navbar-right") ||
        document.querySelector("ul.navbar-nav.navbar-right") ||
        document.querySelector("ul.navbar-nav");
      if (navRight) {
        var chip = document.getElementById("ua-user-chip");
        if (chip) {
          navRight.insertBefore(li, chip);
        } else {
          navRight.appendChild(li);
        }
        document.getElementById("fb-nav-btn").addEventListener("click", _openPanel);

        /* Badge pour tous les utilisateurs avec controle_qualite */
        if (hasQC) {
          _loadBadgeCount();
          setInterval(_loadBadgeCount, 15000);
        }
      } else if (attempts > 0) {
        setTimeout(function () {
          _tryInject(attempts - 1);
        }, 300);
      }
    }
    _tryInject(20);
  }

  function _loadBadgeCount() {
    var token = _getToken();
    if (!token) return;
    fetch(API_BASE + "/feedback?status=nouveau", {
      headers: { Authorization: "Bearer " + token },
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (!data) return;
        var badge = document.getElementById("fb-count-badge");
        if (!badge) return;
        if (data.total > 0) {
          badge.textContent = data.total;
          badge.style.cssText =
            "display:inline-flex;position:absolute;top:-4px;right:-4px;" +
            "background:#ef4444;color:#fff;font-size:9px;font-weight:700;" +
            "width:16px;height:16px;border-radius:50%;align-items:center;justify-content:center;";
        } else {
          badge.style.display = "none";
        }
      });
  }

  /* ── Admin tab injection (if admin) ───────────────────── */
  function _enableAdminTab() {
    var tabs = document.getElementById("fb-tabs");
    if (tabs) tabs.style.display = "flex";
  }

  /* ── Sidebar mobile (boutons plugin à gauche) ──────────── */
  function _setupMobileSidebar(perms) {
    if (window.innerWidth > 767) return;

    var tablerLink = document.createElement("link");
    tablerLink.rel = "stylesheet";
    tablerLink.href =
      "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css";
    document.head.appendChild(tablerLink);

    var hasEdit = perms.indexOf("edition_donnees") !== -1;
    var hasQC   = perms.indexOf("controle_qualite") !== -1;

    var BTNS = [];
    if (hasEdit) {
      BTNS.push({ targetId: "dbe-nav-btn", icon: "ti-database", label: "Base de données" });
    }
    BTNS.push({ targetId: "routing-fab", icon: "ti-route", label: "Itinéraire" });
    if (hasQC) {
      BTNS.push({ targetId: "fb-nav-btn", icon: "ti-clipboard-check", label: "Recettage", badgeId: "fb-count-badge" });
    }

    var sidebar = document.createElement("div");
    sidebar.id = "mv-plugin-sidebar";
    document.body.appendChild(sidebar);

    BTNS.forEach(function (cfg) {
      var btn = document.createElement("button");
      btn.className = "mv-sidebar-btn";
      btn.setAttribute("aria-label", cfg.label);
      btn.innerHTML = '<i class="ti ' + cfg.icon + '" aria-hidden="true"></i>';

      if (cfg.badgeId) {
        var badge = document.createElement("span");
        badge.className = "mv-sidebar-badge";
        btn.appendChild(badge);
        var obs = new MutationObserver(function () {
          var src = document.getElementById(cfg.badgeId);
          if (!src) return;
          badge.textContent = src.textContent;
          badge.style.display = src.style.display === "none" ? "none" : "flex";
        });
        setTimeout(function () {
          var src = document.getElementById(cfg.badgeId);
          if (src) obs.observe(src, { attributes: true, childList: true });
        }, 3000);
      }

      btn.addEventListener("click", function () {
        var orig = document.getElementById(cfg.targetId);
        if (orig) orig.click();
      });

      sidebar.appendChild(btn);
    });

    /* Aligner verticalement avec les boutons zoom OL */
    function _alignWithZoom() {
      var zoom = document.querySelector(".ol-zoom");
      var sb = document.getElementById("mv-plugin-sidebar");
      if (zoom && sb) {
        var rect = zoom.getBoundingClientRect();
        sb.style.top = rect.top + "px";
      }
    }
    setTimeout(_alignWithZoom, 2500);
    window.addEventListener("resize", _alignWithZoom);
  }

  /* ── Init ───────────────────────────────────────────────── */
  var _DEFAULT_PERMS_FB = {
    admin:              ["backoffice","gestion_comptes","edition_donnees","generation_carto","consultation_carto","mode_presentation","controle_qualite"],
    agent_sig:          ["edition_donnees","generation_carto","consultation_carto","mode_presentation","controle_qualite"],
    agent_voirie:       ["edition_donnees","consultation_carto","mode_presentation","controle_qualite"],
    agent_collectivite: ["consultation_carto","mode_presentation"],
    prestataire:        ["edition_donnees","consultation_carto"],
    association_pmr:    ["consultation_carto","mode_presentation"],
  };

  function _applyUser(user) {
    var raw = (user && user.permissions && user.permissions.length > 0)
      ? user.permissions
      : (_DEFAULT_PERMS_FB[user && user.user_type] || []);
    var isAdmin = user && user.user_type === "admin";
    var hasQC = raw.indexOf("controle_qualite") !== -1;

    /* Bouton visible pour tous (connectés ou non) */
    if (!document.getElementById("fb-nav-item")) {
      _injectNavButton(isAdmin, hasQC);
    }
    /* Onglet liste + badge uniquement pour les rôles controle_qualite */
    if (hasQC) {
      _enableAdminTab();
    }
    if (!document.getElementById("mv-plugin-sidebar")) {
      _setupMobileSidebar(raw);
    }
  }

  function _init() {
    _buildPanel();
    _getCurrentUser(function (user) {
      _applyUser(user);
    });
    document.addEventListener("cnig:login", function (e) {
      _applyUser(e.detail);
    });
  }

  /* Start after mviewer is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _init);
  } else {
    setTimeout(_init, 800);
  }
})();
