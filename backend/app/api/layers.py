from flask import jsonify, request
from flask_jwt_extended import jwt_required
from geoalchemy2.functions import ST_Transform, ST_Within, ST_MakeEnvelope
from sqlalchemy import func

from app import db, limiter
from app.models import (
    NoeudCheminement, TronconCheminement, VTroncons,
    Obstacle, VObstacles, Traversee, Circulation,
    Ascenseur, Escalier, Escalator, Rampe, Elevateur,
    PassageSelectif, Quai, StationnementPmr, TapisRoulant,
    Erp, VErp, Entree,
)
from . import api_bp


LAYERS = {
    # Vues enrichies (libellés + couleurs) — à préférer pour mviewer
    "v_troncons":  VTroncons,
    "v_obstacles": VObstacles,
    "v_erp":       VErp,
    # Tables brutes
    "troncon_cheminement": TronconCheminement,
    "noeud_cheminement":   NoeudCheminement,
    "obstacle":            Obstacle,
    "traversee":           Traversee,
    "circulation":         Circulation,
    "ascenseur":           Ascenseur,
    "escalier":            Escalier,
    "escalator":           Escalator,
    "rampe":               Rampe,
    "elevateur":           Elevateur,
    "passage_selectif":    PassageSelectif,
    "quai":                Quai,
    "stationnement_pmr":   StationnementPmr,
    "tapis_roulant":       TapisRoulant,
    "erp":                 Erp,
    "entree":              Entree,
}


def _bbox_filter(model, bbox_str: str):
    """Filtre spatial depuis un bbox 'xmin,ymin,xmax,ymax' en WGS84."""
    try:
        xmin, ymin, xmax, ymax = map(float, bbox_str.split(","))
    except ValueError:
        return None
    envelope = ST_Transform(ST_MakeEnvelope(xmin, ymin, xmax, ymax, 4326), 2154)
    return ST_Within(model.geom, envelope)


def _build_geojson(rows):
    features = [row.as_geojson_feature() for row in rows]
    return {
        "type": "FeatureCollection",
        "features": features,
        "totalFeatures": len(features),
    }


@api_bp.route("/layers", methods=["GET"])
def list_layers():
    return jsonify({"layers": list(LAYERS.keys())})


@api_bp.route("/layers/<string:layer_name>", methods=["GET"])
@limiter.limit("300 per minute")
def get_layer(layer_name: str):
    model = LAYERS.get(layer_name)
    if model is None:
        return jsonify({"error": f"Couche '{layer_name}' introuvable"}), 404

    query = db.session.query(model)

    bbox = request.args.get("bbox")
    if bbox:
        sf = _bbox_filter(model, bbox)
        if sf is not None:
            query = query.filter(sf)

    limit  = min(int(request.args.get("limit", 1000)), 5000)
    offset = int(request.args.get("offset", 0))
    rows = query.limit(limit).offset(offset).all()

    return jsonify(_build_geojson(rows))


@api_bp.route("/layers/<string:layer_name>/<string:feature_id>", methods=["GET"])
def get_feature(layer_name: str, feature_id: str):
    model = LAYERS.get(layer_name)
    if model is None:
        return jsonify({"error": f"Couche '{layer_name}' introuvable"}), 404

    pk_col = model.__table__.primary_key.columns.values()[0]
    row = db.session.query(model).filter(pk_col == feature_id).first()
    if row is None:
        return jsonify({"error": "Entité introuvable"}), 404

    return jsonify(row.as_geojson_feature())


@api_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    stats = {}
    for name, model in LAYERS.items():
        pk = model.__table__.primary_key.columns.values()[0]
        stats[name] = db.session.query(func.count(pk)).scalar()
    return jsonify(stats)
