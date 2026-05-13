import math
from decimal import Decimal

from geoalchemy2 import Geometry


def _clean_value(v):
    """Rend toute valeur sérialisable en JSON."""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


class GeoModelMixin:

    def _geometry_field(self):
        for col in self.__table__.columns:
            if isinstance(col.type, Geometry):
                return col.name
        return None
