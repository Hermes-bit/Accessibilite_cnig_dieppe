from geoalchemy2 import Geometry
from app import db
from .base import GeoModelMixin


class Ascenseur(GeoModelMixin, db.Model):
    __tablename__ = "ascenseur"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idascenseur = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    etatrevetement = db.Column(db.String)
    bandeeveilvigilance = db.Column(db.String)
    voyantalerte = db.Column(db.Text)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class Escalier(GeoModelMixin, db.Model):
    __tablename__ = "escalier"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idescalier = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("LINESTRING", srid=2154))
    etatrevetement = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class Rampe(GeoModelMixin, db.Model):
    __tablename__ = "rampe"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idrampe = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("LINESTRING", srid=2154))
    etatrevetement = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class Elevateur(GeoModelMixin, db.Model):
    __tablename__ = "elevateur"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idelevateur = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    etatrevetement = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class PassageSelectif(GeoModelMixin, db.Model):
    __tablename__ = "passage_selectif"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idpassage = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    bandeeveilvigilance = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class Quai(GeoModelMixin, db.Model):
    __tablename__ = "quai"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idquai = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("LINESTRING", srid=2154))
    etatrevetement = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class StationnementPmr(GeoModelMixin, db.Model):
    __tablename__ = "stationnement_pmr"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idstationnement = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POLYGON", srid=2154))
    etatrevetement = db.Column(db.String)
    typesol = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class Circulation(GeoModelMixin, db.Model):
    __tablename__ = "circulation"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idcirculation = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POLYGON", srid=2154))
    etatrevetement = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)
