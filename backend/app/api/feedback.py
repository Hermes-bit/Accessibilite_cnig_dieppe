from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

from app import db, limiter
from app.models.feedback import Feedback
from app.models.user import AppUser
from . import api_bp

_SEVERITIES = {"bloquant", "majeur", "mineur", "amelioration"}
_AREAS = {
    "carte",
    "couches",
    "connexion",
    "itineraire",
    "explorateur",
    "responsive",
    "autre",
}


@api_bp.route("/feedback", methods=["POST"])
@limiter.limit("20 per hour")
def submit_feedback():
    data = request.get_json(silent=True) or {}

    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "La description est obligatoire"}), 400

    severity = data.get("severity", "mineur")
    if severity not in _SEVERITIES:
        severity = "mineur"

    feature_area = data.get("feature_area", "autre")
    if feature_area not in _AREAS:
        feature_area = "autre"

    # Determine reporter: use JWT identity if authenticated, else provided name
    reporter = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            reporter = identity
    except Exception:
        pass

    if not reporter:
        reporter = (data.get("reporter") or "Anonyme").strip()[:100]

    fb = Feedback(
        reporter=reporter,
        severity=severity,
        feature_area=feature_area,
        description=description,
        browser=str(data.get("browser", ""))[:300],
        screen_size=str(data.get("screen_size", ""))[:30],
        os_info=str(data.get("os_info", ""))[:100],
    )
    db.session.add(fb)
    db.session.commit()

    return jsonify({"message": "Retour enregistré, merci !", "id": fb.id}), 201


@api_bp.route("/feedback", methods=["GET"])
@jwt_required()
def list_feedback():
    identity = get_jwt_identity()
    user = AppUser.query.filter_by(email=identity).first()
    if not user or user.user_type != "admin":
        return jsonify({"error": "Accès réservé aux administrateurs"}), 403

    status_filter = request.args.get("status")
    query = Feedback.query.order_by(Feedback.created_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)

    items = query.limit(200).all()
    return jsonify({"feedback": [f.to_dict() for f in items], "total": len(items)})


@api_bp.route("/feedback/<int:fb_id>", methods=["PATCH"])
@jwt_required()
def update_feedback(fb_id):
    identity = get_jwt_identity()
    user = AppUser.query.filter_by(email=identity).first()
    if not user or user.user_type != "admin":
        return jsonify({"error": "Accès réservé aux administrateurs"}), 403

    fb = Feedback.query.get(fb_id)
    if not fb:
        return jsonify({"error": "Retour introuvable"}), 404

    data = request.get_json(silent=True) or {}
    if "status" in data and data["status"] in (
        "nouveau",
        "en_cours",
        "resolu",
        "ignore",
    ):
        fb.status = data["status"]
    db.session.commit()
    return jsonify(fb.to_dict())
