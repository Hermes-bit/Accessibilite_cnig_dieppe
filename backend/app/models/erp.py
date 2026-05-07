from geoalchemy2 import Geometry
from app import db
from .base import GeoModelMixin


class Erp(GeoModelMixin, db.Model):
    __tablename__ = "erp"
    __table_args__ = {"schema": "cnig_accessibilite"}

    iderp = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    nom = db.Column(db.String)
    erpcategorie = db.Column(db.String)
    erptype = db.Column(db.String)
    adresse = db.Column(db.Text)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)

    entrees = db.relationship("Entree", back_populates="erp", lazy="dynamic")


class Entree(GeoModelMixin, db.Model):
    __tablename__ = "entree"
    __table_args__ = {"schema": "cnig_accessibilite"}

    identree = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    iderp = db.Column(db.String, db.ForeignKey("cnig_accessibilite.erp.iderp"))
    bandeeveilvigilance = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)

    erp = db.relationship("Erp", back_populates="entrees")
