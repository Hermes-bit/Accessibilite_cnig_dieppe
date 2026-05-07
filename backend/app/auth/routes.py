import os
from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from werkzeug.security import generate_password_hash, check_password_hash

from app import db, limiter
from . import auth_bp

# Simple user store — replace with a proper User model + DB table in production.
# Loaded from environment variables: ADMIN_USER / ADMIN_PASSWORD_HASH
_USERS = {
    os.environ.get("ADMIN_USER", "admin"): os.environ.get(
        "ADMIN_PASSWORD_HASH",
        generate_password_hash("changeme"),
    )
}

# In-memory token blocklist — replace with Redis in production.
_TOKEN_BLOCKLIST: set[str] = set()


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Identifiants manquants"}), 400

    stored_hash = _USERS.get(username)
    if not stored_hash or not check_password_hash(stored_hash, password):
        return jsonify({"error": "Identifiants invalides"}), 401

    access_token = create_access_token(identity=username)
    refresh_token = create_refresh_token(identity=username)
    return jsonify(access_token=access_token, refresh_token=refresh_token)


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify(access_token=access_token)


@auth_bp.route("/logout", methods=["DELETE"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    _TOKEN_BLOCKLIST.add(jti)
    return jsonify({"message": "Déconnexion réussie"})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    return jsonify({"username": get_jwt_identity()})
