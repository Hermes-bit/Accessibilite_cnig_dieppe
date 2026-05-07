from flask import jsonify, request
from sqlalchemy import text
from app import db, limiter
from . import api_bp

# Expressions de coût selon le profil — injectées dans le SQL pgRouting
_COST_PEDESTRIAN = """
    CASE WHEN pente > 20 THEN 999999
         ELSE base_cost * (1 + GREATEST(0, pente - 10) / 10.0)
    END
"""

_COST_WHEELCHAIR = """
    CASE WHEN accessibiliteglobale = '03' THEN 999999
         WHEN pente > 8               THEN 999999
         WHEN largeurutile < 90       THEN 999999
         WHEN etatrevetement = '03'   THEN base_cost * 5
         ELSE base_cost * (1 + GREATEST(0, pente - 4) / 10.0)
    END
"""

PROFILES = {
    "pedestrian": _COST_PEDESTRIAN,
    "wheelchair": _COST_WHEELCHAIR,
    "both":       _COST_WHEELCHAIR,
}

SPEED_MS = {"pedestrian": 1.2, "wheelchair": 0.7, "both": 0.7}


@api_bp.route("/routing", methods=["POST"])
@limiter.limit("60 per minute")
def compute_route():
    data = request.get_json(silent=True) or {}

    start   = data.get("start")
    end     = data.get("end")
    profile = data.get("profile", "pedestrian")

    if not start or not end or len(start) != 2 or len(end) != 2:
        return jsonify({"error": "Paramètres start/end manquants ou invalides"}), 400
    if profile not in PROFILES:
        return jsonify({"error": f"Profil inconnu : {profile}"}), 400

    try:
        slon, slat = float(start[0]), float(start[1])
        elon, elat = float(end[0]),   float(end[1])
    except (TypeError, ValueError):
        return jsonify({"error": "Coordonnées invalides"}), 400

    cost_expr = PROFILES[profile]

    # Le SQL interne de pgr_dijkstra doit être interpolé (pas paramétrisé)
    # Les seules entrées utilisateur sont les coordonnées validées comme float
    dijkstra_sql = f"""
        SELECT id, source, target,
               {cost_expr} AS cost,
               {cost_expr} AS reverse_cost
        FROM cnig_accessibilite.routing_edges_base
    """.replace("'", "''")          # escape pour dollar-quoting interne

    full_query = text(f"""
        WITH
        start_node AS (
            SELECT node_id
            FROM cnig_accessibilite.routing_nodes
            ORDER BY geom <-> ST_Transform(
                ST_SetSRID(ST_MakePoint({slon}, {slat}), 4326), 2154)
            LIMIT 1
        ),
        end_node AS (
            SELECT node_id
            FROM cnig_accessibilite.routing_nodes
            ORDER BY geom <-> ST_Transform(
                ST_SetSRID(ST_MakePoint({elon}, {elat}), 4326), 2154)
            LIMIT 1
        ),
        route AS (
            SELECT r.seq, r.edge, r.cost, r.agg_cost
            FROM pgr_dijkstra(
                $pgr$
                SELECT id, source, target,
                    {cost_expr} AS cost,
                    {cost_expr} AS reverse_cost
                FROM cnig_accessibilite.routing_edges_base
                $pgr$,
                (SELECT node_id FROM start_node),
                (SELECT node_id FROM end_node),
                directed := false
            ) r
            WHERE r.edge != -1
        )
        SELECT
            r.seq,
            r.agg_cost,
            ST_AsGeoJSON(ST_Transform(e.geom, 4326))::json AS geometry,
            e.idtroncon,
            e.base_cost                                     AS longueur,
            e.pente,
            e.largeurutile,
            e.accessibiliteglobale,
            e.etatrevetement
        FROM route r
        JOIN cnig_accessibilite.routing_edges_base e ON e.id = r.edge
        ORDER BY r.seq
    """)

    try:
        rows = db.session.execute(full_query).fetchall()
    except Exception as exc:
        return jsonify({"error": f"Erreur de routage : {str(exc)}"}), 500

    if not rows:
        return jsonify({"error": "Aucun itinéraire trouvé entre ces deux points"}), 404

    total_distance = sum(float(r.longueur or 0) for r in rows)
    total_duration = total_distance / SPEED_MS[profile]

    features = []
    for r in rows:
        if r.geometry is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": r.geometry,
            "properties": {
                "seq":                  r.seq,
                "idtroncon":            r.idtroncon,
                "longueur":             float(r.longueur or 0),
                "pente":                float(r.pente or 0),
                "largeurutile":         float(r.largeurutile or 0),
                "accessibiliteglobale": r.accessibiliteglobale,
                "etatrevetement":       r.etatrevetement,
            },
        })

    return jsonify({
        "type":           "FeatureCollection",
        "features":       features,
        "profile":        profile,
        "total_distance": round(total_distance),
        "total_duration": round(total_duration),
    })
