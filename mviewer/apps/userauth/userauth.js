/**
 * userauth.js Authentification CNIG Accessibilité (mviewer extension)
 * IIFE auto-exécuté, chargé en premier dans les extensions mviewer.
 * Gère : login par e-mail, JWT, changement de mot de passe, restrictions
 * par rôle, chip utilisateur, panneau admin.
 */
(function () {
  "use strict";

  /* ── Configuration ───────────────────────────────────────── */
  var API_BASE = "/auth";
  var LS_ACCESS  = "ua_access_token";
  var LS_REFRESH = "ua_refresh_token";

  /* ── CSS injection ───────────────────────────────────────── */
  (function _injectCss() {
    var link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "apps/userauth/userauth.css";
    document.head.appendChild(link);
  })();

  /* ================================================================
     TOKEN MANAGEMENT
  ================================================================ */
  function _getToken() {
    return localStorage.getItem(LS_ACCESS) || null;
  }

  function _getRefreshToken() {
    return localStorage.getItem(LS_REFRESH) || null;
  }

  function _setToken(access, refresh) {
    localStorage.setItem(LS_ACCESS, access);
    if (refresh) localStorage.setItem(LS_REFRESH, refresh);
  }

  function _clearToken() {
    localStorage.removeItem(LS_ACCESS);
    localStorage.removeItem(LS_REFRESH);
  }

  /**
   * fetch wrapper adds Authorization header, redirects to login on 401.
   */
  function _fetchWithAuth(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    var token = _getToken();
    if (token) {
      opts.headers["Authorization"] = "Bearer " + token;
    }
    opts.headers["Content-Type"] = opts.headers["Content-Type"] || "application/json";
    return fetch(url, opts).then(function (resp) {
      if (resp.status === 401 || resp.status === 422) {
        _logout();
        return Promise.reject(new Error("Session expirée"));
      }
      return resp;
    });
  }

  /* ================================================================
     STATE
  ================================================================ */
  var _currentUser = null;

  /* ================================================================
     DOM BUILDERS
  ================================================================ */

  /** Build the login modal (overlay + 3-step form) and inject into body. */
  function _buildModal() {
    if (document.getElementById("ua-overlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "ua-overlay";
    overlay.className = "ua-hidden";

    overlay.innerHTML = '<div id="ua-modal">'
      + '<div id="ua-modal-header">'
      + '<button id="ua-modal-close" class="ua-modal-close" title="Fermer">&times;</button>'
      + '<div class="ua-logo-icon"><i class="fas fa-universal-access"></i></div>'
      + '<h2>Accessibilité CNIG Dieppe</h2>'
      + '<p>Plateforme de gestion d&#39;accessibilité</p>'
      + '</div>'
      + '<div id="ua-modal-body">'
      /* Step 1 email, pas d appel API */
      + '<div class="ua-step" id="ua-step-1">'
      + '<h3>Connexion</h3>'
      + '<div class="ua-error" id="ua-err-1"></div>'
      + '<div class="ua-success" id="ua-ok-1"></div>'
      + '<div class="ua-form-group">'
      + '<label for="ua-email">Adresse e-mail</label>'
      + '<input type="email" id="ua-email" placeholder="prenom.nom@exemple.fr" autocomplete="email" />'
      + '</div>'
      + '<button class="ua-btn ua-btn-primary" id="ua-btn-next">Continuer</button>'
      + '<div class="ua-link-row">'
      + '<button class="ua-btn-link" id="ua-btn-request">Première connexion ? Recevoir un mot de passe</button>'
      + '</div>'
      + '</div>'
      /* Step 2 mot de passe + oublie */
      + '<div class="ua-step" id="ua-step-2">'
      + '<h3>Connexion</h3>'
      + '<div class="ua-email-display" id="ua-email-display"></div>'
      + '<div class="ua-error" id="ua-err-2"></div>'
      + '<div class="ua-success" id="ua-ok-2"></div>'
      + '<div class="ua-form-group">'
      + '<label for="ua-password">Mot de passe</label>'
      + '<input type="password" id="ua-password" placeholder="••••••" autocomplete="current-password" />'
      + '</div>'
      + '<button class="ua-btn ua-btn-primary" id="ua-btn-login">Se connecter</button>'
      + '<div class="ua-link-row">'
      + '<button class="ua-btn-link" id="ua-btn-forgot">Mot de passe oublié ?</button>'
      + '</div>'
      + '<button class="ua-btn ua-btn-secondary" id="ua-btn-back">← Retour</button>'
      + '</div>'
      /* Step 3 nouveau mot de passe */
      + '<div class="ua-step" id="ua-step-3">'
      + '<h3>Nouveau mot de passe</h3>'
      + '<p class="ua-hint">Choisissez un mot de passe personnel (6 caractères minimum).</p>'
      + '<div class="ua-error" id="ua-err-3"></div>'
      + '<div class="ua-form-group">'
      + '<label for="ua-newpwd">Nouveau mot de passe</label>'
      + '<input type="password" id="ua-newpwd" placeholder="Minimum 6 caractères" autocomplete="new-password" />'
      + '</div>'
      + '<div class="ua-form-group">'
      + '<label for="ua-newpwd2">Confirmer le mot de passe</label>'
      + '<input type="password" id="ua-newpwd2" placeholder="Répétez le mot de passe" autocomplete="new-password" />'
      + '</div>'
      + '<button class="ua-btn ua-btn-primary" id="ua-btn-change">Valider</button>'
      + '</div>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    _bindModalEvents();
  }

  /** Build the user chip and inject it into the mviewer navbar (with retry). */
  function _buildUserChip(user) {
    var existing = document.getElementById("ua-user-chip");
    if (existing) existing.parentNode.removeChild(existing);

    var initial = (user.display_name || user.email || "?").charAt(0).toUpperCase();
    var label   = user.display_name || user.email.split("@")[0];
    var type    = user.user_type || "association_pmr";
    var _ROLE_LABELS = {
      admin: "Admin",
      agent_sig: "Agent SIG",
      agent_voirie: "Agent voirie",
      agent_collectivite: "Collectivité",
      prestataire: "Prestataire",
      association_pmr: "Asso. PMR",
    };
    var typeLabel = _ROLE_LABELS[type] || type;

    var li = document.createElement("li");
    li.id = "ua-user-chip";
    li.className = "ms-2";

    li.innerHTML = [
      '<a href="#" class="ua-chip-toggle" id="ua-chip-toggle" title="' + _escHtml(user.email) + '">',
      '  <span class="ua-avatar">' + _escHtml(initial) + '</span>',
      '  <span class="ua-badge ua-badge-' + type + '">' + _escHtml(typeLabel) + '</span>',
      '</a>',
      '<div class="ua-chip-menu" id="ua-chip-menu">',
      (type === "admin"
        ? '<button class="ua-chip-menu-item" id="ua-admin-btn"><i class="fas fa-users"></i> Gestion utilisateurs</button>'
        : ""),
      '<button class="ua-chip-menu-item" id="ua-changepwd-btn"><i class="fas fa-key"></i> Changer de mot de passe</button>',
      '<button class="ua-chip-menu-item" id="ua-tour-btn"><i class="fas fa-map-signs"></i> Visite guidée</button>',
      '<button class="ua-chip-menu-item ua-danger" id="ua-logout-btn"><i class="fas fa-sign-out-alt"></i> Déconnexion</button>',
      '</div>'
    ].join("\n");

    function _tryInject(attempts) {
      var navRight = document.querySelector("ul.nav.navbar-nav.navbar-right")
                  || document.querySelector("ul.navbar-nav.navbar-right")
                  || document.querySelector("ul.navbar-nav");
      if (navRight) {
        // Séparateur vertical entre boutons et chip
        var oldSep = document.getElementById("ua-nav-sep");
        if (oldSep) oldSep.parentNode.removeChild(oldSep);
        var sep = document.createElement("li");
        sep.id = "ua-nav-sep";
        sep.className = "ua-nav-sep";

        var helpLi = navRight.querySelector("li.ms-3");
        if (helpLi) {
          navRight.insertBefore(sep, helpLi);
          navRight.insertBefore(li, helpLi);
        } else {
          navRight.appendChild(sep);
          navRight.appendChild(li);
        }
        _bindChipEvents(type);
      } else if (attempts > 0) {
        setTimeout(function () { _tryInject(attempts - 1); }, 200);
      }
    }
    _tryInject(20);
  }

  /** Build and inject the admin users panel. */
  function _buildAdminPanel() {
    if (document.getElementById("ua-admin-panel")) return;

    var panel = document.createElement("div");
    panel.id = "ua-admin-panel";
    panel.className = "ua-hidden";

    panel.innerHTML = [
      '<div id="ua-admin-inner">',
      '  <div id="ua-admin-header">',
      '    <h2><i class="fas fa-users" style="margin-right:10px;"></i>Gestion des utilisateurs</h2>',
      '    <button id="ua-admin-close">&times;</button>',
      '  </div>',
      '  <div id="ua-admin-tabs">',
      '    <button class="ua-atab active" data-view="users"><i class="fas fa-users"></i> Utilisateurs</button>',
      '    <button class="ua-atab" data-view="permissions"><i class="fas fa-key"></i> Permissions des rôles</button>',
      '  </div>',
      '  <div id="ua-admin-body">',
      '    <div id="ua-view-users">',
      '      <p id="ua-admin-loading" style="color:#888;font-size:13px;">Chargement…</p>',
      '      <table id="ua-admin-table" style="display:none;">',
      '        <thead>',
      '          <tr>',
      '            <th>E-mail</th>',
      '            <th>Nom</th>',
      '            <th>Rôle</th>',
      '            <th>Actif</th>',
      '            <th>Dernière connexion</th>',
      '            <th>Créé le</th>',
      '          </tr>',
      '        </thead>',
      '        <tbody id="ua-admin-tbody"></tbody>',
      '      </table>',
      '    </div>',
      '    <div id="ua-view-permissions" style="display:none;">',
      '      <div id="ua-perms-content"><p style="color:#888;font-size:13px;">Chargement…</p></div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("\n");

    document.body.appendChild(panel);

    document.getElementById("ua-admin-close").addEventListener("click", function () {
      _closeAdminPanel();
    });

    panel.addEventListener("click", function (e) {
      if (e.target === panel) _closeAdminPanel();
    });

    panel.querySelectorAll(".ua-atab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        panel.querySelectorAll(".ua-atab").forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
        var view = this.dataset.view;
        document.getElementById("ua-view-users").style.display = view === "users" ? "" : "none";
        document.getElementById("ua-view-permissions").style.display = view === "permissions" ? "" : "none";
        if (view === "permissions") _loadRolePermissions();
      });
    });
  }

  /* ── Permissions des rôles ────────────────────────────── */
  var _PERM_LABELS = {
    backoffice:        "Backoffice",
    gestion_comptes:   "Gestion comptes",
    edition_donnees:   "Édition données",
    generation_carto:  "Génération carto",
    consultation_carto:"Consultation carto",
    mode_presentation: "Mode présentation",
    controle_qualite:  "Contrôle qualité",
  };

  function _loadRolePermissions() {
    var container = document.getElementById("ua-perms-content");
    if (!container) return;
    container.innerHTML = '<p style="color:#888;font-size:13px;">Chargement…</p>';

    _fetchWithAuth(API_BASE + "/admin/role-permissions")
      .then(function (resp) { return resp.json(); })
      .then(function (data) { _renderPermissionsMatrix(container, data.roles, data.all_permissions); })
      .catch(function () {
        container.innerHTML = '<p style="color:#e53e3e;font-size:13px;">Erreur lors du chargement.</p>';
      });
  }

  function _renderPermissionsMatrix(container, roles, allPerms) {
    var _RL = {
      admin: "Administrateur", agent_sig: "Agent SIG",
      agent_voirie: "Agent voirie", agent_collectivite: "Agent collectivité",
      prestataire: "Prestataire", association_pmr: "Association PMR",
    };

    var html = ['<div class="ua-perms-wrap">'];
    html.push('<p class="ua-perms-hint">Cochez les permissions pour chaque rôle puis sauvegardez.</p>');

    Object.keys(roles).forEach(function (role) {
      var perms = roles[role];
      html.push('<div class="ua-perm-row">');
      html.push('<div class="ua-perm-role">' + (_RL[role] || role) + '</div>');
      html.push('<div class="ua-perm-checks">');
      allPerms.forEach(function (perm) {
        var checked = perms.indexOf(perm) !== -1 ? " checked" : "";
        html.push(
          '<label class="ua-perm-check">' +
          '<input type="checkbox" data-role="' + role + '" data-perm="' + perm + '"' + checked + '>' +
          '<span>' + (_PERM_LABELS[perm] || perm) + '</span>' +
          '</label>'
        );
      });
      html.push('</div>');
      html.push('<button class="ua-perm-save-btn" data-role="' + role + '">Sauvegarder</button>');
      html.push('</div>');
    });

    html.push('</div>');
    container.innerHTML = html.join('');

    container.querySelectorAll('.ua-perm-save-btn').forEach(function (btn) {
      btn.addEventListener("click", function () {
        var role = this.dataset.role;
        var checked = [];
        container.querySelectorAll('input[data-role="' + role + '"]:checked').forEach(function (cb) {
          checked.push(cb.dataset.perm);
        });
        _saveRolePermission(role, checked, btn);
      });
    });
  }

  function _saveRolePermission(role, permissions, btn) {
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = "…";

    _fetchWithAuth(API_BASE + "/admin/role-permissions/" + role, {
      method: "PATCH",
      body: JSON.stringify({ permissions: permissions }),
    })
    .then(function (resp) {
      btn.disabled = false;
      btn.textContent = resp.ok ? "✓ Sauvegardé" : "Erreur";
      setTimeout(function () { btn.textContent = orig; }, 2000);
    })
    .catch(function () {
      btn.disabled = false;
      btn.textContent = "Erreur";
      setTimeout(function () { btn.textContent = orig; }, 2000);
    });
  }

  /* ================================================================
     EVENT BINDING
  ================================================================ */

  function _bindModalEvents() {
    /* Step 1 continuer (email → step 2 sans appel API) */
    document.getElementById("ua-btn-next").addEventListener("click", _onNextStep);
    document.getElementById("ua-email").addEventListener("keydown", function (e) {
      if (e.key === "Enter") _onNextStep();
    });

    /* Step 1 première connexion (génère un mot de passe temporaire) */
    document.getElementById("ua-btn-request").addEventListener("click", function () {
      _onRequestAccess(1);
    });

    /* Step 2 connexion */
    document.getElementById("ua-btn-login").addEventListener("click", _onLogin);
    document.getElementById("ua-password").addEventListener("keydown", function (e) {
      if (e.key === "Enter") _onLogin();
    });
    document.getElementById("ua-btn-back").addEventListener("click", function () {
      _showStep(1);
    });

    /* Step 2 mot de passe oublié */
    document.getElementById("ua-btn-forgot").addEventListener("click", function () {
      _onRequestAccess(2);
    });

    /* Step 3 définir nouveau mot de passe */
    document.getElementById("ua-btn-change").addEventListener("click", _onChangePassword);
    document.getElementById("ua-newpwd2").addEventListener("keydown", function (e) {
      if (e.key === "Enter") _onChangePassword();
    });

    /* Bouton fermer le modal — uniquement si déjà connecté (changement mdp) */
    document.getElementById("ua-modal-close").addEventListener("click", function () {
      if (_currentUser) {
        _hideOverlay();
        _showStep(1);
      }
    });
  }

  function _bindChipEvents(type) {
    /* Toggle dropdown */
    document.getElementById("ua-chip-toggle").addEventListener("click", function (e) {
      e.preventDefault();
      var menu = document.getElementById("ua-chip-menu");
      menu.classList.toggle("ua-open");
    });

    /* Close on outside click */
    document.addEventListener("click", function (e) {
      var chip = document.getElementById("ua-user-chip");
      var menu = document.getElementById("ua-chip-menu");
      if (chip && menu && !chip.contains(e.target)) {
        menu.classList.remove("ua-open");
      }
    });

    /* Logout */
    document.getElementById("ua-logout-btn").addEventListener("click", function () {
      _logout();
    });

    /* Change password */
    document.getElementById("ua-changepwd-btn").addEventListener("click", function () {
      document.getElementById("ua-chip-menu").classList.remove("ua-open");
      _showStep(3);
      _showOverlay();
    });

    /* Visite guidée */
    var tourBtn = document.getElementById("ua-tour-btn");
    if (tourBtn) {
      tourBtn.addEventListener("click", function () {
        document.getElementById("ua-chip-menu").classList.remove("ua-open");
        if (window.CnigTour && typeof window.CnigTour.start === "function") {
          window.CnigTour.start();
        }
      });
    }

    /* Admin panel */
    if (type === "admin") {
      var adminBtn = document.getElementById("ua-admin-btn");
      if (adminBtn) {
        adminBtn.addEventListener("click", function () {
          document.getElementById("ua-chip-menu").classList.remove("ua-open");
          _openAdminPanel();
        });
      }
    }
  }

  /* ================================================================
     STEP NAVIGATION
  ================================================================ */

  function _showStep(n) {
    [1, 2, 3].forEach(function (i) {
      var el = document.getElementById("ua-step-" + i);
      if (el) el.classList.toggle("ua-active", i === n);
    });
    _clearErrors();
  }

  function _showOverlay() {
    var overlay = document.getElementById("ua-overlay");
    if (overlay) overlay.classList.remove("ua-hidden");
  }

  function _hideOverlay() {
    var overlay = document.getElementById("ua-overlay");
    if (overlay) overlay.classList.add("ua-hidden");
  }

  function _clearErrors() {
    document.querySelectorAll(".ua-error, .ua-success").forEach(function (el) {
      el.textContent = "";
      el.classList.remove("ua-visible");
    });
  }

  function _showError(stepN, msg) {
    var el = document.getElementById("ua-err-" + stepN);
    if (el) {
      el.textContent = msg;
      el.classList.add("ua-visible");
    }
  }

  function _showSuccess(stepN, msg) {
    var el = document.getElementById("ua-ok-" + stepN);
    if (el) {
      el.innerHTML = msg;
      el.classList.add("ua-visible");
    }
  }

  function _setBtnLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn._origText = btn.innerHTML;
      btn.innerHTML = '<span class="ua-spinner"></span>Chargement…';
    } else if (btn._origText) {
      btn.innerHTML = btn._origText;
    }
  }

  /* ================================================================
     AUTH FLOWS
  ================================================================ */

  /* Étape 1 : valide l'email et avance vers l'étape 2 (sans appel API) */
  function _onNextStep() {
    _clearErrors();
    var email = (document.getElementById("ua-email").value || "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      _showError(1, "Veuillez saisir une adresse e-mail valide.");
      return;
    }
    var display = document.getElementById("ua-email-display");
    if (display) display.textContent = email;
    document.getElementById("ua-password").value = "";
    _showStep(2);
    setTimeout(function () { document.getElementById("ua-password").focus(); }, 100);
  }

  /* Demande un mot de passe temporaire (première connexion ou oublié) */
  function _onRequestAccess(fromStep) {
    _clearErrors();
    var email = (document.getElementById("ua-email").value || "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      _showError(fromStep || 1, "Veuillez d'abord saisir votre adresse e-mail.");
      if (fromStep === 2) _showStep(1);
      return;
    }

    var btnId = fromStep === 2 ? "ua-btn-forgot" : "ua-btn-request";
    _setBtnLoading(btnId, true);

    fetch(API_BASE + "/request-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    })
    .then(function (resp) { return resp.json(); })
    .then(function (data) {
      _setBtnLoading(btnId, false);
      if (data.error) {
        _showError(fromStep || 1, data.error);
        return;
      }
      if (data.dev_password) {
        _showSuccess(fromStep || 1, data.message || "Un mot de passe temporaire a été généré et placé dans le champ mot de passe.");
        document.getElementById("ua-password").value = data.dev_password;
      } else {
        _showSuccess(fromStep || 1, data.message || "Un mot de passe temporaire vous a été envoyé par e-mail.");
      }
      if (fromStep !== 2) {
        var display = document.getElementById("ua-email-display");
        if (display) display.textContent = email;
        setTimeout(function () { _showStep(2); }, 2800);
      }
    })
    .catch(function () {
      _setBtnLoading(btnId, false);
      _showError(fromStep || 1, "Erreur réseau. Veuillez réessayer.");
    });
  }

  function _onLogin() {
    _clearErrors();
    var email    = (document.getElementById("ua-email").value || "").trim();
    var password = document.getElementById("ua-password").value || "";

    if (!email || !password) {
      _showError(2, "Veuillez saisir votre mot de passe.");
      return;
    }

    _setBtnLoading("ua-btn-login", true);

    fetch(API_BASE + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(function (resp) { return resp.json().then(function (d) { return { status: resp.status, data: d }; }); })
    .then(function (r) {
      _setBtnLoading("ua-btn-login", false);
      if (r.status !== 200) {
        _showError(2, r.data.error || "Identifiants invalides.");
        return;
      }
      _setToken(r.data.access_token, r.data.refresh_token);
      _currentUser = r.data.user;
      if (_currentUser && _currentUser.first_login) {
        _showStep(3);
      } else {
        _finishLogin();
      }
    })
    .catch(function () {
      _setBtnLoading("ua-btn-login", false);
      _showError(2, "Erreur réseau. Veuillez réessayer.");
    });
  }

  function _onChangePassword() {
    _clearErrors();
    var pwd  = document.getElementById("ua-newpwd").value  || "";
    var pwd2 = document.getElementById("ua-newpwd2").value || "";

    if (pwd.length < 6) {
      _showError(3, "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (pwd !== pwd2) {
      _showError(3, "Les mots de passe ne correspondent pas.");
      return;
    }

    _setBtnLoading("ua-btn-change", true);

    _fetchWithAuth(API_BASE + "/change-password", {
      method: "POST",
      body: JSON.stringify({ password: pwd })
    })
    .then(function (resp) { return resp.json().then(function (d) { return { status: resp.status, data: d }; }); })
    .then(function (r) {
      _setBtnLoading("ua-btn-change", false);
      if (r.status !== 200) {
        _showError(3, r.data.error || "Erreur lors du changement de mot de passe.");
        return;
      }
      if (_currentUser) _currentUser.first_login = false;
      _finishLogin();
    })
    .catch(function () {
      _setBtnLoading("ua-btn-change", false);
      _showError(3, "Erreur réseau. Veuillez réessayer.");
    });
  }

  function _finishLogin() {
    _hideOverlay();
    if (_currentUser) {
      _buildUserChip(_currentUser);
      _applyRoleRestrictions(_currentUser);
      document.dispatchEvent(new CustomEvent("cnig:login", { detail: _currentUser }));
    }
  }

  var _loggingOut = false;
  function _logout() {
    if (_loggingOut) return;
    _loggingOut = true;

    var token = _getToken();
    _clearToken(); // Efface d'abord pour couper toute récursion
    if (token) {
      fetch(API_BASE + "/logout", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
      }).catch(function () {});
    }
    _currentUser = null;

    // Remove chip + separator
    var chip = document.getElementById("ua-user-chip");
    if (chip) chip.parentNode.removeChild(chip);
    var sep = document.getElementById("ua-nav-sep");
    if (sep) sep.parentNode.removeChild(sep);

    // Close admin panel if open
    _closeAdminPanel();

    // Restore all hidden nav items
    _restoreNavItems();

    // Show login modal
    _showStep(1);
    _showOverlay();
    _loggingOut = false;
  }

  /* ================================================================
     ROLE-BASED RESTRICTIONS
  ================================================================ */
  var _hiddenNavItems = [];

  function _applyRoleRestrictions(user) {
    _restoreNavItems();
    var perms = (user && user.permissions) || [];
    if (perms.indexOf("edition_donnees") === -1) {
      _hideNavItem("dbe-nav-item");
    }
  }

  function _hideNavItem(id) {
    var el = document.getElementById(id);
    if (el) {
      el.style.display = "none";
      if (_hiddenNavItems.indexOf(id) === -1) _hiddenNavItems.push(id);
    }
  }

  function _restoreNavItems() {
    _hiddenNavItems.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = "";
    });
    _hiddenNavItems = [];
  }

  /* ================================================================
     ADMIN PANEL
  ================================================================ */

  function _openAdminPanel() {
    _buildAdminPanel();
    var panel = document.getElementById("ua-admin-panel");
    if (panel) {
      panel.classList.remove("ua-hidden");
      _loadAdminUsers();
    }
  }

  function _closeAdminPanel() {
    var panel = document.getElementById("ua-admin-panel");
    if (panel) panel.classList.add("ua-hidden");
  }

  function _loadAdminUsers() {
    var loading = document.getElementById("ua-admin-loading");
    var table   = document.getElementById("ua-admin-table");
    if (loading) { loading.style.display = "block"; loading.textContent = "Chargement…"; }
    if (table)   table.style.display = "none";

    _fetchWithAuth(API_BASE + "/admin/users")
    .then(function (resp) { return resp.json(); })
    .then(function (users) {
      if (loading) loading.style.display = "none";
      if (table)   table.style.display = "table";
      _renderAdminTable(users);
    })
    .catch(function () {
      if (loading) loading.textContent = "Erreur lors du chargement des utilisateurs.";
    });
  }

  function _renderAdminTable(users) {
    var tbody = document.getElementById("ua-admin-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    users.forEach(function (user) {
      var tr = document.createElement("tr");

      var lastLogin = user.last_login
        ? new Date(user.last_login).toLocaleString("fr-FR")
        : "—";
      var createdAt = user.created_at
        ? new Date(user.created_at).toLocaleDateString("fr-FR")
        : "—";

      tr.innerHTML = [
        "<td>" + _escHtml(user.email) + "</td>",
        "<td>" + _escHtml(user.display_name || "—") + "</td>",
        "<td>",
        '  <select class="ua-type-select" data-uid="' + user.id + '" data-field="user_type">',
        '    <option value="admin"'              + (user.user_type === "admin"              ? " selected" : "") + ">Administrateur</option>",
        '    <option value="agent_sig"'          + (user.user_type === "agent_sig"          ? " selected" : "") + ">Agent SIG</option>",
        '    <option value="agent_voirie"'       + (user.user_type === "agent_voirie"       ? " selected" : "") + ">Agent voirie</option>",
        '    <option value="agent_collectivite"' + (user.user_type === "agent_collectivite" ? " selected" : "") + ">Agent collectivité</option>",
        '    <option value="prestataire"'        + (user.user_type === "prestataire"        ? " selected" : "") + ">Prestataire</option>",
        '    <option value="association_pmr"'    + (user.user_type === "association_pmr"    ? " selected" : "") + ">Association PMR</option>",
        "  </select>",
        "</td>",
        "<td>",
        '  <input type="checkbox" class="ua-active-toggle" data-uid="' + user.id + '" data-field="is_active"' + (user.is_active ? " checked" : "") + " />",
        "</td>",
        "<td>" + _escHtml(lastLogin) + "</td>",
        "<td>" + _escHtml(createdAt) + "</td>"
      ].join("");

      tbody.appendChild(tr);
    });

    /* Bind change events */
    tbody.querySelectorAll("select[data-field='user_type']").forEach(function (sel) {
      sel.addEventListener("change", function () {
        _patchUser(this.dataset.uid, { user_type: this.value });
      });
    });

    tbody.querySelectorAll("input[data-field='is_active']").forEach(function (chk) {
      chk.addEventListener("change", function () {
        _patchUser(this.dataset.uid, { is_active: this.checked });
      });
    });
  }

  function _patchUser(userId, payload) {
    _fetchWithAuth(API_BASE + "/admin/users/" + userId, {
      method: "PATCH",
      body: JSON.stringify(payload)
    })
    .then(function (resp) {
      if (!resp.ok) {
        resp.json().then(function (d) {
          alert(d.error || "Erreur lors de la mise à jour.");
        });
      }
    })
    .catch(function () {
      alert("Erreur réseau lors de la mise à jour.");
    });
  }

  /* ================================================================
     UTILITIES
  ================================================================ */

  function _escHtml(str) {
    return String(str)
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;")
      .replace(/>/g,  "&gt;")
      .replace(/"/g,  "&quot;")
      .replace(/'/g,  "&#39;");
  }

  /* ================================================================
     INIT called after DOM ready
  ================================================================ */

  function _init() {
    _buildModal();
    _buildAdminPanel();

    var token = _getToken();
    if (!token) {
      _showStep(1);
      _showOverlay();
      return;
    }

    /* Validate existing token */
    _fetchWithAuth(API_BASE + "/me")
    .then(function (resp) {
      if (!resp.ok) throw new Error("invalid");
      return resp.json();
    })
    .then(function (user) {
      _currentUser = user;
      _buildUserChip(user);
      _applyRoleRestrictions(user);
      if (user.first_login) {
        _showStep(3);
        _showOverlay();
      }
    })
    .catch(function () {
      _clearToken();
      _showStep(1);
      _showOverlay();
    });
  }

  /* ── Wait for DOM ready ───────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _init);
  } else {
    _init();
  }

})();
