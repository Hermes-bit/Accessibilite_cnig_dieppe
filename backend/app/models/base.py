import math
from decimal import Decimal

from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from pyproj import Transformer
from shapely.geometry import mapping
from shapely.ops import transform


# Reprojection EPSG:2154 (Lambert 93) → WGS84
_to_wgs84 = Transformer.from_crs("EPSG:2154", "EPSG:4326", always_xy=True).transform


def _clean_value(v):
    """Rend toute valeur sérialisable en JSON."""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def _clean_coords(obj):
    """Parcourt récursivement les coordonnées GeoJSON et remplace NaN par None.
    Shapely retourne des tuples, d'où le isinstance(obj, (list, tuple))."""
    if isinstance(obj, (list, tuple)):
        cleaned = [_clean_coords(x) for x in obj]
        # Filtre les points entièrement NaN (None, None, ...)
        if cleaned and all(v is None for v in cleaned):
            return None
        return cleaned
    if isinstance(obj, float) and math.isnan(obj):
        return None
    return obj


class GeoModelMixin:

    def _geometry_field(self):
        for col in self.__table__.columns:
            if isinstance(col.type, Geometry):
                return col.name
        return None

    def as_geojson_feature(self) -> dict:
        geom_field = self._geometry_field()
        geom_value = getattr(self, geom_field, None) if geom_field else None

        geometry = None
        if geom_value is not None:
            try:
                shape_2154 = to_shape(geom_value)
                shape_wgs84 = transform(_to_wgs84, shape_2154)
                raw = mapping(shape_wgs84)
                coords = _clean_coords(raw["coordinates"])
                # Pour les LineString/MultiLineString : retire les points None
                if raw["type"] in ("LineString",):
                    coords = [p for p in coords if p is not None]
                elif raw["type"] in ("MultiLineString",):
                    coords = [[p for p in ring if p is not None] for ring in coords]
                geometry = {"type": raw["type"], "coordinates": coords}
            except Exception:
                geometry = None

        properties = {
            col.name: _clean_value(getattr(self, col.name))
            for col in self.__table__.columns
            if col.name != geom_field
        }

        return {"type": "Feature", "geometry": geometry, "properties": properties}
