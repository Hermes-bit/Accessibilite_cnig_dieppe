import re
from datetime import datetime, timezone
from functools import wraps

from flask import request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)

from app import db, limiter
from app.models.user import AppUser
from app.utils.email_service import (
    generate_temp_password,
    send_temp_password,
    send_welcome_survey,
)
from app.utils.permissions import VALID_ROLES, ALL_PERMISSIONS
from app.models.role_permission import RolePermission
from . import auth_bp

# ─── In-memory token blocklist (fallback when Redis is unavailable) ───────────
_TOKEN_BLOCKLIST: set[str] = set()

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _is_token_revoked(jwt_header, jwt_payload) -> bool:
    jti = jwt_payload["jti"]
    try:
        from app import jwt as jwt_manager  # noqa: F401

        redis_client = _get_redis()
        if redis_client:
            return redis_client.get(f"jwt_blocklist:{jti}") is not None
    except Exception:
        pass
    return jti in _TOKEN_BLOCKLIST


def _get_redis():
    """Return a Redis client if REDIS_URL is configured, else None."""
    redis_url = current_app.config.get("RATELIMIT_STORAGE_URL", "memory://")
    if redis_url.startswith("redis://"):
        try:
            import redis

            return redis.from_url(redis_url)
        except Exception:
            pass
    return None


def _revoke_token(jti: str) -> None:
    redis_client = _get_redis()
    if redis_client:
        try:
            redis_client.set(f"jwt_blocklist:{jti}", "1", ex=60 * 60 * 24 * 31)
            return
        except Exception:
            pass
    _TOKEN_BLOCKLIST.add(jti)


def _require_admin(fn):
    """Decorator that ensures the JWT identity belongs to an active admin user."""

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()
        user = AppUser.query.filter_by(email=identity).first()
        if not user or not user.is_active or user.user_type != "admin":
            return jsonify({"error": "Accès réservé aux administrateurs"}), 403
        return fn(*args, **kwargs)

    return wrapper


# ─── Routes ───────────────────────────────────────────────────────────────────


@auth_bp.route("/request-access", methods=["POST"])
@limiter.limit("5 per minute")
def request_access():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email or not _EMAIL_RE.match(email):
        return jsonify({"error": "Adresse e-mail invalide"}), 400

    temp_password = generate_temp_password()

    user = AppUser.query.filter_by(email=email).first()
    if user:
        # Re-generate password and reset first_login flag regardless of is_active
        user.set_password(temp_password)
        user.first_login = True
    else:
        user = AppUser(email=email)
        user.set_password(temp_password)
        db.session.add(user)

    db.session.commit()

    import os

    mail_configured = bool(os.environ.get("MAIL_SERVER", "").strip())

    try:
        send_temp_password(email, temp_password)
    except Exception:
        current_app.logger.exception("Impossible d'envoyer l'e-mail à %s", email)

    if not mail_configured:
        # Dev mode : retourne le mot de passe directement (pas d'e-mail réel)
        return (
            jsonify(
                {
                    "message": "Aucun serveur mail configuré — voici votre mot de passe temporaire :",
                    "dev_password": temp_password,
                }
            ),
            200,
        )

    return jsonify({"message": "Un mot de passe a été envoyé à votre adresse"}), 200


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Identifiants manquants"}), 400

    user = AppUser.query.filter_by(email=email).first()
    if not user or not user.is_active or not user.check_password(password):
        return jsonify({"error": "Identifiants invalides"}), 401

    is_first_ever_login = user.last_login is None
    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    if is_first_ever_login:
        try:
            send_welcome_survey(user.email, user.display_name)
        except Exception:
            current_app.logger.exception("Échec email bienvenue pour %s", email)

    access_token = create_access_token(identity=email)
    refresh_token = create_refresh_token(identity=email)

    return (
        jsonify(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user.to_dict(),
        ),
        200,
    )


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    identity = get_jwt_identity()
    user = AppUser.query.filter_by(email=identity).first()
    if not user or not user.is_active:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    data = request.get_json(silent=True) or {}
    new_password = data.get("password") or ""

    if len(new_password) < 6:
        return (
            jsonify({"error": "Le mot de passe doit contenir au moins 6 caractères"}),
            400,
        )

    user.set_password(new_password)
    user.first_login = False
    db.session.commit()

    return jsonify({"message": "Mot de passe modifié"}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    identity = get_jwt_identity()
    user = AppUser.query.filter_by(email=identity).first()
    if not user or not user.is_active:
        return jsonify({"error": "Utilisateur introuvable"}), 404
    data = user.to_dict()
    data["permissions"] = RolePermission.get(user.user_type)
    return jsonify(data), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    _revoke_token(jti)
    return jsonify({"message": "Déconnexion réussie"}), 200


@auth_bp.route("/admin/users", methods=["GET"])
@_require_admin
def admin_list_users():
    users = AppUser.query.order_by(AppUser.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@auth_bp.route("/admin/users/<int:user_id>", methods=["PATCH"])
@_require_admin
def admin_update_user(user_id: int):
    user = AppUser.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    data = request.get_json(silent=True) or {}

    if "user_type" in data:
        if data["user_type"] not in VALID_ROLES:
            return jsonify({"error": "Rôle invalide"}), 400
        user.user_type = data["user_type"]

    if "is_active" in data:
        user.is_active = bool(data["is_active"])

    if "display_name" in data:
        user.display_name = (data["display_name"] or "").strip() or None

    db.session.commit()
    return jsonify(user.to_dict()), 200


@auth_bp.route("/admin/role-permissions", methods=["GET"])
@_require_admin
def admin_get_role_permissions():
    result = {role: RolePermission.get(role) for role in VALID_ROLES}
    return jsonify({"roles": result, "all_permissions": ALL_PERMISSIONS})


@auth_bp.route("/admin/role-permissions/<role>", methods=["PATCH"])
@_require_admin
def admin_update_role_permissions(role: str):
    if role not in VALID_ROLES:
        return jsonify({"error": "Rôle invalide"}), 400

    data = request.get_json(silent=True) or {}
    perms = [p for p in (data.get("permissions") or []) if p in ALL_PERMISSIONS]

    rp = RolePermission.query.get(role)
    if rp:
        rp.permissions = perms
    else:
        rp = RolePermission(role=role, permissions=perms)
        db.session.add(rp)

    db.session.commit()
    return jsonify({"role": role, "permissions": perms})
