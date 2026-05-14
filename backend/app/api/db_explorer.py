import csv
import io
import json
import re
import time
import zipfile

from flask import jsonify, request, Response
from sqlalchemy import text

from app import db, limiter
from . import api_bp

_PROTECTED_TABLES = {
    "v_troncons",
    "v_obstacles",
    "v_erp",
    "troncon_cheminement",
    "noeud_cheminement",
    "obstacle",
    "traversee",
    "circulation",
    "ascenseur",
    "escalier",
    "escalator",
    "rampe",
    "elevateur",
    "passage_selectif",
    "quai",
    "stationnement_pmr",
    "tapis_roulant",
    "erp",
    "entree",
}

_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|EXECUTE|COPY)\b",
    re.IGNORECASE,
)


def _is_safe(sql: str) -> bool:
    cleaned = re.sub(r"--[^\n]*", "", sql)
    cleaned = re.sub(r"/\*.*?\*/", "", cleaned, flags=re.DOTALL).strip()
    if not cleaned.upper().startswith("SELECT"):
        return False
    return not _FORBIDDEN.search(cleaned)


def _valid_identifier(name: str) -> bool:
    return bool(re.match(r"^[a-z][a-z0-9_]{0,62}$", name))


# ── Tables ──────────────────────────────────────────────────────────────────


@api_bp.route("/db/tables", methods=["GET"])
def db_tables():
    """Retourne toutes les tables/vues du schéma cnig_accessibilite avec leurs colonnes."""
    q = text(
        """
        SELECT t.table_name,
               t.table_type,
               c.column_name,
               c.data_type,
               c.ordinal_position
        FROM information_schema.tables  t
        JOIN information_schema.columns c
          ON c.table_schema = t.table_schema
         AND c.table_name   = t.table_name
        WHERE t.table_schema = 'cnig_accessibilite'
        ORDER BY t.table_name, c.ordinal_position
    """
    )
    rows = db.session.execute(q).fetchall()

    tables = {}
    for row in rows:
        name = row[0]
        if name not in tables:
            tables[name] = {
                "name": name,
                "kind": "view" if row[1] == "VIEW" else "table",
                "columns": [],
            }
        tables[name]["columns"].append({"name": row[2], "type": row[3]})

    return jsonify({"tables": list(tables.values())})


# ── Query ────────────────────────────────────────────────────────────────────


@api_bp.route("/db/query", methods=["POST"])
@limiter.limit("60 per minute")
def db_query():
    """Exécute une requête SELECT (read-only) et retourne colonnes + lignes."""
    data = request.get_json(silent=True) or {}
    sql = data.get("sql", "").strip()
    limit = min(int(data.get("limit", 500)), 2000)

    if not sql:
        return jsonify({"error": "Requête vide"}), 400
    if not _is_safe(sql):
        return jsonify({"error": "Seules les requêtes SELECT sont autorisées."}), 403

    try:
        t0 = time.time()
        sql_clean = sql.rstrip().rstrip(";").rstrip()
        wrapped = f"SELECT * FROM ({sql_clean}) _explorer LIMIT {limit + 1}"
        result = db.session.execute(text(wrapped))
        col_names = list(result.keys())
        all_rows = result.fetchall()
        elapsed = time.time() - t0

        has_more = len(all_rows) > limit
        rows = all_rows[:limit]

        def _cell(v):
            if v is None:
                return None
            if isinstance(v, bool):
                return v
            return str(v)

        return jsonify(
            {
                "columns": col_names,
                "rows": [[_cell(c) for c in row] for row in rows],
                "count": len(rows),
                "has_more": has_more,
                "elapsed_ms": round(elapsed * 1000),
            }
        )

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


# ── Export ───────────────────────────────────────────────────────────────────


@api_bp.route("/db/export", methods=["POST"])
@limiter.limit("30 per minute")
def db_export():
    """Export query result as CSV or GeoJSON file download."""
    data = request.get_json(silent=True) or {}
    fmt = data.get("format", "csv").lower()
    table = (data.get("table") or "").strip()
    sql = data.get("sql", "").strip()

    if fmt not in ("csv", "geojson"):
        return jsonify({"error": "Format non supporté (csv ou geojson)"}), 400

    geom_col = None

    if fmt == "geojson":
        if not table or not _valid_identifier(table):
            return (
                jsonify(
                    {"error": "Le nom de la table est requis pour l'export GeoJSON"}
                ),
                400,
            )
        # Find geometry column
        q = text(
            """
            SELECT f_geometry_column
            FROM public.geometry_columns
            WHERE f_table_schema = 'cnig_accessibilite'
              AND f_table_name   = :tname
            LIMIT 1
        """
        )
        row = db.session.execute(q, {"tname": table}).fetchone()
        if not row:
            return (
                jsonify(
                    {"error": "Aucune colonne géométrique trouvée pour cette table"}
                ),
                400,
            )
        geom_col = row[0]
        sql_run = (
            f"SELECT *, ST_AsGeoJSON(ST_Transform({geom_col}, 4326))::json AS _geojson"
            f" FROM cnig_accessibilite.{table}"
        )
    else:
        # CSV: use provided SQL or build from table name
        if sql:
            if not _is_safe(sql):
                return (
                    jsonify({"error": "Seules les requêtes SELECT sont autorisées"}),
                    403,
                )
            sql_run = sql.rstrip().rstrip(";").rstrip()
        elif table and _valid_identifier(table):
            sql_run = f"SELECT * FROM cnig_accessibilite.{table}"
        else:
            return jsonify({"error": "SQL ou nom de table requis"}), 400

    try:
        result = db.session.execute(text(sql_run))
        col_names = list(result.keys())
        rows = result.fetchall()
        filename = table or "export"

        if fmt == "csv":
            out = io.StringIO()
            w = csv.writer(out)
            w.writerow(col_names)
            for row in rows:
                w.writerow(["" if v is None else str(v) for v in row])
            return Response(
                "﻿" + out.getvalue(),  # UTF-8 BOM for Excel compatibility
                mimetype="text/csv; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}.csv"'
                },
            )

        else:  # geojson
            features = []
            for row in rows:
                props = {}
                geom = None
                for i, col in enumerate(col_names):
                    v = row[i]
                    if col == "_geojson":
                        geom = v
                    elif col != geom_col:
                        props[col] = (
                            None
                            if v is None
                            else v if isinstance(v, (bool, int, float)) else str(v)
                        )
                features.append(
                    {"type": "Feature", "geometry": geom, "properties": props}
                )
            fc = json.dumps(
                {"type": "FeatureCollection", "features": features},
                ensure_ascii=False,
                indent=2,
            )
            return Response(
                fc,
                mimetype="application/geo+json; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}.geojson"'
                },
            )

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


@api_bp.route("/db/drop_table", methods=["POST"])
@limiter.limit("10 per minute")
def db_drop_table():
    """Drop a table from the cnig_accessibilite schema."""
    data = request.get_json(silent=True) or {}
    table = (data.get("table_name") or "").strip().lower()
    if not table or not _valid_identifier(table):
        return jsonify({"error": "Nom de table invalide."}), 400

    q = text(
        """
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'cnig_accessibilite'
          AND table_name = :table_name
        LIMIT 1
    """
    )
    if not db.session.execute(q, {"table_name": table}).fetchone():
        return jsonify({"error": "Table introuvable."}), 404
    if table in _PROTECTED_TABLES:
        return jsonify({"error": "Suppression interdite pour cette table."}), 403

    try:
        db.session.execute(
            text(f"DROP TABLE IF EXISTS cnig_accessibilite.{table} CASCADE")
        )
        db.session.commit()
        return jsonify({"success": True, "table": table})
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500


# ── Import ───────────────────────────────────────────────────────────────────


@api_bp.route("/db/import", methods=["POST"])
@limiter.limit("10 per minute")
def db_import():
    """Import GeoJSON file or Shapefile ZIP into cnig_accessibilite schema."""
    file = request.files.get("file")
    table_name = (request.form.get("table_name") or "").strip().lower()
    mode = request.form.get("mode", "create")  # "create" | "append"

    if not file or not file.filename:
        return jsonify({"error": "Aucun fichier reçu"}), 400
    if not table_name or not _valid_identifier(table_name):
        return (
            jsonify(
                {
                    "error": "Nom de table invalide (lettres minuscules, chiffres, underscores, commençant par une lettre)"
                }
            ),
            400,
        )
    if mode not in ("create", "append"):
        return jsonify({"error": "Mode invalide (create ou append)"}), 400

    fname = file.filename.lower()
    try:
        if fname.endswith(".geojson") or fname.endswith(".json"):
            return _import_geojson(file, table_name, mode)
        elif fname.endswith(".zip"):
            return _import_shapefile_zip(file, table_name, mode)
        else:
            return (
                jsonify(
                    {
                        "error": "Format non supporté. Fournissez un fichier .geojson ou un .zip contenant les fichiers Shapefile."
                    }
                ),
                400,
            )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Erreur lors de l'import : {exc}"}), 500


def _safe_col(name: str) -> str:
    """Sanitise un nom de colonne en identifiant SQL valide."""
    s = re.sub(r"[^a-zA-Z0-9]", "_", name).lower()[:63]
    if not s or s[0].isdigit():
        s = "col_" + s
    return s


def _safe_prop_col(name: str) -> str:
    """Sanitise un nom de propriété et ajoute un préfixe stable pour les colonnes importées."""
    safe = _safe_col(name)
    if not safe.startswith("p_"):
        safe = f"p_{safe}"
    return safe


def _create_table(full_table: str, prop_cols: list, mode: str) -> None:
    """Drop (if create mode) and create a table with TEXT property columns + geom."""
    if mode == "create":
        db.session.execute(text(f"DROP TABLE IF EXISTS {full_table}"))
    cols_ddl = (", ".join(f'"{c}" TEXT' for c in prop_cols) + ", ") if prop_cols else ""
    db.session.execute(
        text(
            f"CREATE TABLE IF NOT EXISTS {full_table} "
            f"(id SERIAL PRIMARY KEY, {cols_ddl}geom GEOMETRY(Geometry, 4326))"
        )
    )
    safe_index = re.sub(r"[^a-zA-Z0-9_]", "_", full_table).replace("__", "_")
    db.session.execute(
        text(
            f"CREATE INDEX IF NOT EXISTS {safe_index}_geom_idx ON {full_table} USING GIST(geom)"
        )
    )
    db.session.commit()


def _import_geojson(file, table_name: str, mode: str):
    """Parse and insert a GeoJSON FeatureCollection."""
    try:
        gj = json.loads(file.read())
    except json.JSONDecodeError as exc:
        return jsonify({"error": f"Fichier GeoJSON invalide : {exc}"}), 400

    if gj.get("type") != "FeatureCollection":
        return (
            jsonify({"error": "Le fichier doit être un GeoJSON FeatureCollection"}),
            400,
        )

    features = gj.get("features") or []
    if not features:
        return jsonify({"error": "Le fichier ne contient aucune feature"}), 400

    # Collect all property keys (preserve order, deduplicate)
    all_keys: list[str] = []
    seen: set[str] = set()
    for feat in features:
        for k in feat.get("properties") or {}:
            sk = _safe_prop_col(k)
            if sk not in seen:
                all_keys.append(sk)
                seen.add(sk)
    # Map original key → safe key
    key_map: dict[str, str] = {}
    for feat in features:
        for k in feat.get("properties") or {}:
            key_map[k] = _safe_prop_col(k)

    full_table = f"cnig_accessibilite.{table_name}"
    _create_table(full_table, all_keys, mode)

    inserted = skipped = 0
    for feat in features:
        geom_json = feat.get("geometry")
        if not geom_json:
            skipped += 1
            continue

        props = feat.get("properties") or {}
        params: dict = {"geom_json": json.dumps(geom_json)}
        cols: list = []
        vals: list = []

        for orig_k, safe_k in key_map.items():
            if orig_k in props and safe_k in all_keys:
                v = props[orig_k]
                pk = safe_k
                params[pk] = str(v) if v is not None else None
                cols.append(f'"{safe_k}"')
                vals.append(f":{pk}")

        col_str = (", ".join(cols) + ", ") if cols else ""
        val_str = (", ".join(vals) + ", ") if vals else ""
        ins = (
            f"INSERT INTO {full_table} ({col_str}geom)"
            f" VALUES ({val_str}ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326))"
        )
        db.session.execute(text(ins), params)
        inserted += 1

    db.session.commit()
    return jsonify(
        {
            "success": True,
            "table": f"cnig_accessibilite.{table_name}",
            "inserted": inserted,
            "skipped": skipped,
        }
    )


def _import_shapefile_zip(file, table_name: str, mode: str):
    """Extract and insert a Shapefile ZIP (requires pyshp)."""
    try:
        import shapefile  # noqa: PLC0415 — pyshp
    except ImportError:
        return (
            jsonify({"error": "Le module pyshp n'est pas installé sur le serveur."}),
            500,
        )

    raw = file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        return jsonify({"error": "Le fichier ZIP est corrompu"}), 400

    with zf:
        names = zf.namelist()
        shp_n = next((n for n in names if n.lower().endswith(".shp")), None)
        dbf_n = next((n for n in names if n.lower().endswith(".dbf")), None)
        shx_n = next((n for n in names if n.lower().endswith(".shx")), None)
        prj_n = next((n for n in names if n.lower().endswith(".prj")), None)

        if not shp_n or not dbf_n:
            return (
                jsonify(
                    {
                        "error": "Le ZIP doit contenir au minimum les fichiers .shp et .dbf"
                    }
                ),
                400,
            )

        shp_data = io.BytesIO(zf.read(shp_n))
        dbf_data = io.BytesIO(zf.read(dbf_n))
        shx_data = io.BytesIO(zf.read(shx_n)) if shx_n else None
        prj_wkt = zf.read(prj_n).decode("utf-8", errors="ignore") if prj_n else None

    # Detect source SRID from .prj
    src_srid = 4326
    if prj_wkt:
        try:
            from pyproj import CRS  # noqa: PLC0415

            epsg = CRS.from_wkt(prj_wkt).to_epsg()
            if epsg:
                src_srid = int(epsg)
        except Exception:
            pass

    try:
        reader = shapefile.Reader(shp=shp_data, dbf=dbf_data, shx=shx_data)
    except Exception as exc:
        return jsonify({"error": f"Impossible de lire le Shapefile : {exc}"}), 400

    raw_fields = [f[0] for f in reader.fields[1:]]  # skip DeletionFlag
    safe_fields = [_safe_prop_col(f) for f in raw_fields]

    full_table = f"cnig_accessibilite.{table_name}"
    _create_table(full_table, safe_fields, mode)

    inserted = skipped = 0
    for sr in reader.iterShapeRecords():
        try:
            geo_iface = sr.shape.__geo_interface__
            geom_json_str = json.dumps(geo_iface)
        except Exception:
            skipped += 1
            continue

        record = list(sr.record)
        params: dict = {"geom_json": geom_json_str}
        cols: list = []
        vals: list = []

        for i, (safe_k, val) in enumerate(zip(safe_fields, record)):
            pk = f"p{i}"
            params[pk] = str(val) if val is not None else None
            cols.append(f'"{safe_k}"')
            vals.append(f":{pk}")

        col_str = (", ".join(cols) + ", ") if cols else ""
        val_str = (", ".join(vals) + ", ") if vals else ""
        ins = (
            f"INSERT INTO {full_table} ({col_str}geom)"
            f" VALUES ({val_str}"
            f"ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), {src_srid}), 4326))"
        )
        db.session.execute(text(ins), params)
        inserted += 1

    db.session.commit()
    return jsonify(
        {
            "success": True,
            "table": f"cnig_accessibilite.{table_name}",
            "inserted": inserted,
            "skipped": skipped,
            "src_srid": src_srid,
        }
    )
