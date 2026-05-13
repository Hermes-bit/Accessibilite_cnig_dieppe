import json
import re

from flask import jsonify, request
from flask_jwt_extended import jwt_required
from geoalchemy2.functions import ST_Transform, ST_Within, ST_MakeEnvelope
from sqlalchemy import func, text

from app import db, limiter
from app.models import (
    NoeudCheminement, TronconCheminement, VTroncons,
    Obstacle, VObstacles, Traversee, Circulation,
    Ascenseur, Escalier, Escalator, Rampe, Elevateur,
    PassageSelectif, Quai, StationnementPmr, TapisRoulant,
    Erp, VErp, Entree,
)
from app.models.base import _clean_value
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


def _valid_identifier(name: str) -> bool:
    return bool(re.match(r'^[a-z][a-z0-9_]{0,62}$', name))


def _table_exists(table_name: str) -> bool:
    q = text("""
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'cnig_accessibilite'
          AND table_name = :table_name
        LIMIT 1
    """)
    return bool(db.session.execute(q, {"table_name": table_name}).fetchone())


def _get_geometry_column(table_name: str):
    q = text("""
        SELECT f_geometry_column
        FROM public.geometry_columns
        WHERE f_table_schema = 'cnig_accessibilite'
          AND f_table_name = :table_name
        LIMIT 1
    """)
    row = db.session.execute(q, {"table_name": table_name}).fetchone()
    return row[0] if row else None


def _build_generic_geojson(layer_name: str, bbox: str, limit: int, offset: int):
    geom_col = _get_geometry_column(layer_name)
    if not geom_col:
        return None, f"Aucune colonne géométrique trouvée pour la table '{layer_name}'"

    bbox_filter = ""
    params = {"limit": limit, "offset": offset}
    if bbox:
        try:
            xmin, ymin, xmax, ymax = map(float, bbox.split(","))
            bbox_filter = (
                "WHERE ST_Within(" \
                f"{geom_col}, ST_MakeEnvelope(:xmin, :ymin, :xmax, :ymax, 4326))"
            )
            params.update({"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax})
        except ValueError:
            return None, "Bbox invalide"

    sql = text(
        f"SELECT *, ST_AsGeoJSON(ST_Transform({geom_col}, 4326))::json AS _geojson "
        f"FROM cnig_accessibilite.{layer_name} "
        f"{bbox_filter} LIMIT :limit OFFSET :offset"
    )
    result = db.session.execute(sql, params)
    col_names = list(result.keys())
    rows = result.fetchall()

    features = []
    for row in rows:
        props = {}
        geom = None
        for i, col in enumerate(col_names):
            v = row[i]
            if col == "_geojson":
                geom = v
            elif col != geom_col:
                props[col] = None if v is None else (v if isinstance(v, (bool, int, float)) else str(v))
        features.append({"type": "Feature", "geometry": geom, "properties": props})

    return {"type": "FeatureCollection", "features": features}, None


def _bbox_filter(model, bbox_str: str):
    """Filtre spatial depuis un bbox 'xmin,ymin,xmax,ymax' en WGS84."""
    try:
        xmin, ymin, xmax, ymax = map(float, bbox_str.split(","))
    except ValueError:
        return None
    envelope = ST_Transform(ST_MakeEnvelope(xmin, ymin, xmax, ymax, 4326), 2154)
    return ST_Within(model.geom, envelope)


def _build_geojson_from_orm(rows):
    """Construit un FeatureCollection depuis des tuples (modèle, geojson_str)."""
    features = []
    for obj, geojson_str in rows:
        geom_field = obj._geometry_field()
        properties = {
            col.name: _clean_value(getattr(obj, col.name))
            for col in obj.__table__.columns
            if col.name != geom_field
        }
        geometry = json.loads(geojson_str) if geojson_str else None
        features.append({"type": "Feature", "geometry": geometry, "properties": properties})
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
    bbox = request.args.get("bbox")
    limit  = min(int(request.args.get("limit", 1000)), 10000)
    offset = int(request.args.get("offset", 0))

    if model is not None:
        query = db.session.query(
            model,
            func.ST_AsGeoJSON(func.ST_Transform(model.geom, 4326)).label("_geojson"),
        )
        if bbox:
            sf = _bbox_filter(model, bbox)
            if sf is not None:
                query = query.filter(sf)
        rows = query.limit(limit).offset(offset).all()
        return jsonify(_build_geojson_from_orm(rows))

    if not _valid_identifier(layer_name):
        return jsonify({"error": f"Couche '{layer_name}' introuvable"}), 404
    if not _table_exists(layer_name):
        return jsonify({"error": f"Couche '{layer_name}' introuvable"}), 404

    geojson, error = _build_generic_geojson(layer_name, bbox, limit, offset)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(geojson)


@api_bp.route("/layers/<string:layer_name>/<string:feature_id>", methods=["GET"])
def get_feature(layer_name: str, feature_id: str):
    model = LAYERS.get(layer_name)
    if model is None:
        return jsonify({"error": f"Couche '{layer_name}' introuvable"}), 404

    pk_col = model.__table__.primary_key.columns.values()[0]
    row = db.session.query(
        model,
        func.ST_AsGeoJSON(func.ST_Transform(model.geom, 4326)).label("_geojson"),
    ).filter(pk_col == feature_id).first()

    if row is None:
        return jsonify({"error": "Entité introuvable"}), 404

    obj, geojson_str = row
    geom_field = obj._geometry_field()
    properties = {
        col.name: _clean_value(getattr(obj, col.name))
        for col in obj.__table__.columns
        if col.name != geom_field
    }
    geometry = json.loads(geojson_str) if geojson_str else None
    return jsonify({"type": "Feature", "geometry": geometry, "properties": properties})


@api_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    stats = {}
    for name, model in LAYERS.items():
        pk = model.__table__.primary_key.columns.values()[0]
        stats[name] = db.session.query(func.count(pk)).scalar()
    return jsonify(stats)
