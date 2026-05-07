from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from app import db


class GeoModelMixin:
    """Adds as_geojson_feature() to any model that has a geometry column."""

    def _geometry_field(self):
        for col in self.__table__.columns:
            if isinstance(col.type, Geometry):
                return col.name
        return None

    def as_geojson_feature(self) -> dict:
        geom_field = self._geometry_field()
        geom_value = getattr(self, geom_field, None) if geom_field else None
        geometry = mapping(to_shape(geom_value)) if geom_value else None

        properties = {
            col.name: getattr(self, col.name)
            for col in self.__table__.columns
            if col.name != geom_field
        }
        return {"type": "Feature", "geometry": geometry, "properties": properties}
