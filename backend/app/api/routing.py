from flask import jsonify, request
from sqlalchemy import text
from app import db, limiter
from . import api_bp

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

# Version assouplie PMR : pas de blocage total, coûts élevés
_COST_WHEELCHAIR_RELAXED = """
    CASE WHEN pente > 20             THEN base_cost * 50
         WHEN accessibiliteglobale = '03' THEN base_cost * 20
         WHEN pente > 8               THEN base_cost * 10
         WHEN largeurutile < 90       THEN base_cost * 8
         WHEN etatrevetement = '03'   THEN base_cost * 5
         ELSE base_cost * (1 + GREATEST(0, pente - 4) / 10.0)
    END
"""

_PROFILES = {
    "pedestrian": {"cost": _COST_PEDESTRIAN,  "speed": 1.2},
    "wheelchair": {"cost": _COST_WHEELCHAIR,   "speed": 0.7},
}


def _snap_node(lon, lat):
    """Retourne le nœud de routage le plus proche avec sa distance réelle."""
    q = text(f"""
        SELECT node_id,
               ST_X(ST_Transform(geom, 4326))  AS snap_lon,
               ST_Y(ST_Transform(geom, 4326))  AS snap_lat,
               ROUND(ST_Distance(geom,
                   ST_Transform(ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326), 2154)
               )::numeric) AS dist_m
        FROM cnig_accessibilite.routing_nodes
        ORDER BY geom <-> ST_Transform(ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326), 2154)
        LIMIT 1
    """)
    row = db.session.execute(q).fetchone()
    if not row:
        return None
    return {
        "node_id": int(row.node_id),
        "lon":     float(row.snap_lon),
        "lat":     float(row.snap_lat),
        "dist_m":  int(row.dist_m),
    }


def _same_component(node_a, node_b):
    """Vérifie si deux nœuds appartiennent à la même composante connexe."""
    q = text(f"""
        WITH components AS (
            SELECT node, component
            FROM pgr_connectedComponents(
                'SELECT id, source, target, 1 AS cost
                 FROM cnig_accessibilite.routing_edges_base'
            )
        )
        SELECT
            (SELECT component FROM components WHERE node = {node_a}) AS ca,
            (SELECT component FROM components WHERE node = {node_b}) AS cb
    """)
    row = db.session.execute(q).fetchone()
    if not row or row[0] is None or row[1] is None:
        return False
    return row[0] == row[1]


def _run_dijkstra(start_node, end_node, profile_key, relaxed=False):
    """Dijkstra entre deux node_id déjà snappés. Retourne GeoJSON ou None."""
    cfg      = _PROFILES[profile_key]
    cost_expr = _COST_WHEELCHAIR_RELAXED if relaxed else cfg["cost"]
    speed_ms  = cfg["speed"]

    query = text(f"""
        WITH route AS (
            SELECT r.seq, r.edge, r.cost, r.agg_cost
            FROM pgr_dijkstra(
                $pgr$
                SELECT id, source, target,
                    {cost_expr} AS cost,
                    {cost_expr} AS reverse_cost
                FROM cnig_accessibilite.routing_edges_base
                $pgr$,
                {start_node},
                {end_node},
                directed := false
            ) r
            WHERE r.edge != -1
        )
        SELECT
            r.seq,
            r.agg_cost,
            ST_AsGeoJSON(ST_Transform(e.geom, 4326))::json AS geometry,
            e.idtroncon,
            e.base_cost        AS longueur,
            e.pente,
            e.largeurutile,
            e.accessibiliteglobale,
            e.etatrevetement
        FROM route r
        JOIN cnig_accessibilite.routing_edges_base e ON e.id = r.edge
        ORDER BY r.seq
    """)

    rows = db.session.execute(query).fetchall()
    if not rows:
        return None

    total_distance = sum(float(r.longueur or 0) for r in rows)
    total_duration = total_distance / speed_ms
    inacc_count    = sum(1 for r in rows if r.accessibiliteglobale == "03")

    features = [
        {
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
        }
        for r in rows if r.geometry is not None
    ]

    return {
        "type":                  "FeatureCollection",
        "features":              features,
        "profile":               profile_key,
        "relaxed":               relaxed,
        "total_distance":        round(total_distance),
        "total_duration":        round(total_duration),
        "inaccessible_segments": inacc_count,
    }


@api_bp.route("/routing", methods=["POST"])
@limiter.limit("60 per minute")
def compute_route():
    data    = request.get_json(silent=True) or {}
    start   = data.get("start")
    end     = data.get("end")
    profile = data.get("profile", "pedestrian")

    if not start or not end or len(start) != 2 or len(end) != 2:
        return jsonify({"error": "Paramètres start/end manquants ou invalides"}), 400
    if profile not in ("pedestrian", "wheelchair", "both"):
        return jsonify({"error": f"Profil inconnu : {profile}"}), 400

    try:
        slon, slat = float(start[0]), float(start[1])
        elon, elat = float(end[0]),   float(end[1])
    except (TypeError, ValueError):
        return jsonify({"error": "Coordonnées invalides"}), 400

    try:
        # Snap vers les nœuds de routage les plus proches
        snap_s = _snap_node(slon, slat)
        snap_e = _snap_node(elon, elat)

        if not snap_s or not snap_e:
            return jsonify({"error": "Aucun nœud de routage trouvé dans le réseau"}), 404

        # Avertissement si le snap est trop éloigné (> 300 m)
        snap_warnings = []
        if snap_s["dist_m"] > 300:
            snap_warnings.append(f"Départ : le point le plus proche du réseau est à {snap_s['dist_m']} m de l'adresse saisie")
        if snap_e["dist_m"] > 300:
            snap_warnings.append(f"Arrivée : le point le plus proche du réseau est à {snap_e['dist_m']} m de l'adresse saisie")

        snap_info = {
            "start": {"lon": snap_s["lon"], "lat": snap_s["lat"], "dist_m": snap_s["dist_m"]},
            "end":   {"lon": snap_e["lon"], "lat": snap_e["lat"], "dist_m": snap_e["dist_m"]},
        }

        sid, eid = snap_s["node_id"], snap_e["node_id"]

        # Message d'erreur adapté selon la cause
        def _no_route_error():
            if not _same_component(sid, eid):
                msg = (
                    "Ces deux points ne sont pas reliés dans le réseau certifié CNIG. "
                    "Le réseau couvre uniquement les voies d'accessibilité enregistrées "
                    f"({712} tronçons). Essayez des points plus proches des zones orange sur la carte."
                )
            else:
                msg = "Aucun itinéraire trouvé — certains tronçons bloquent le passage pour ce profil."
            return jsonify({"error": msg, "snap": snap_info}), 404

        if profile == "both":
            ped = _run_dijkstra(sid, eid, "pedestrian")
            wc  = _run_dijkstra(sid, eid, "wheelchair")
            wc_relaxed = False
            if wc is None:
                wc = _run_dijkstra(sid, eid, "wheelchair", relaxed=True)
                wc_relaxed = True
            if ped is None and wc is None:
                return _no_route_error()
            return jsonify({
                "type":          "both",
                "pedestrian":    ped,
                "wheelchair":    wc,
                "wc_relaxed":    wc_relaxed,
                "snap":          snap_info,
                "snap_warnings": snap_warnings,
            })

        result = _run_dijkstra(sid, eid, profile)
        relaxed = False
        if result is None and profile == "wheelchair":
            result  = _run_dijkstra(sid, eid, "wheelchair", relaxed=True)
            relaxed = True

        if result is None:
            return _no_route_error()

        result["snap"]          = snap_info
        result["snap_warnings"] = snap_warnings
        result["relaxed"]       = relaxed
        return jsonify(result)

    except Exception as exc:
        return jsonify({"error": f"Erreur de routage : {str(exc)}"}), 500
