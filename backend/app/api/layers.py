from flask import jsonify, request
from flask_jwt_extended import jwt_required
from geoalchemy2.functions import ST_AsGeoJSON, ST_Transform, ST_Within, ST_MakeEnvelope
from sqlalchemy import func, text
import json

from app import db, limiter
from app.models import (
    NoeudCheminement, TronconCheminement, Obstacle, Traversee,
    Ascenseur, Escalier, Rampe, Elevateur,
    PassageSelectif, Quai, StationnementPmr, Circulation,
    Erp, Entree,
)
from . import api_bp


LAYERS = {
    "troncons": TronconCheminement,
    "noeuds": NoeudCheminement,
    "obstacles": Obstacle,
    "traversees": Traversee,
    "ascenseurs": Ascenseur,
    "escaliers": Escalier,
    "rampes": Rampe,
    "elevateurs": Elevateur,
    "passages_selectifs": PassageSelectif,
    "quais": Quai,
    "stationnements_pmr": StationnementPmr,
    "circulations": Circulation,
    "erp": Erp,
    "entrees": Entree,
}


def _bbox_filter(model, bbox_str: str):
    """Returns a spatial filter from a bbox string 'xmin,ymin,xmax,ymax' in WGS84."""
    try:
        xmin, ymin, xmax, ymax = map(float, bbox_str.split(","))
    except ValueError:
        return None
    envelope = ST_Transform(ST_MakeEnvelope(xmin, ymin, xmax, ymax, 4326), 2154)
    return ST_Within(model.geom, envelope)


def _build_geojson(rows, model):
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
@jwt_required()
@limiter.limit("300 per minute")
def get_layer(layer_name: str):
    model = LAYERS.get(layer_name)
    if model is None:
        return jsonify({"error": f"Layer '{layer_name}' not found"}), 404

    query = db.session.query(model)

    bbox = request.args.get("bbox")
    if bbox:
        spatial_filter = _bbox_filter(model, bbox)
        if spatial_filter is not None:
            query = query.filter(spatial_filter)

    limit = min(int(request.args.get("limit", 1000)), 5000)
    offset = int(request.args.get("offset", 0))
    rows = query.limit(limit).offset(offset).all()

    return jsonify(_build_geojson(rows, model))


@api_bp.route("/layers/<string:layer_name>/<string:feature_id>", methods=["GET"])
@jwt_required()
def get_feature(layer_name: str, feature_id: str):
    model = LAYERS.get(layer_name)
    if model is None:
        return jsonify({"error": f"Layer '{layer_name}' not found"}), 404

    pk_col = model.__table__.primary_key.columns.values()[0]
    row = db.session.query(model).filter(pk_col == feature_id).first()
    if row is None:
        return jsonify({"error": "Feature not found"}), 404

    return jsonify(row.as_geojson_feature())


@api_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    stats = {}
    for name, model in LAYERS.items():
        stats[name] = db.session.query(func.count(
            model.__table__.primary_key.columns.values()[0]
        )).scalar()
    return jsonify(stats)
