from geoalchemy2 import Geometry
from app import db
from .base import GeoModelMixin


class NoeudCheminement(GeoModelMixin, db.Model):
    __tablename__ = "noeud_cheminement"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idnoeud = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    bandeeveilvigilance = db.Column(db.String)
    controlebev = db.Column(db.String)
    masquecovisibilite = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class TronconCheminement(GeoModelMixin, db.Model):
    __tablename__ = "troncon_cheminement"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idtroncon = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("LINESTRING", srid=2154))
    id_from = db.Column(db.String, db.ForeignKey("cnig_accessibilite.noeuds.idnoeud"))
    id_to = db.Column(db.String, db.ForeignKey("cnig_accessibilite.noeuds.idnoeud"))
    typetroncon = db.Column(db.String)
    typesol = db.Column(db.String)
    largeur = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    pente = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    accessibiliteglobale = db.Column(db.String)
    statutvoie = db.Column(db.String)
    reperelineaire = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class Obstacle(GeoModelMixin, db.Model):
    __tablename__ = "obstacle"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idobstacle = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    idtroncon = db.Column(db.String, db.ForeignKey("cnig_accessibilite.troncon_cheminement.idtroncon"))
    typeobstacle = db.Column(db.String)
    positionobstacle = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)


class Traversee(GeoModelMixin, db.Model):
    __tablename__ = "traversee"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idtraversee = db.Column(db.String, primary_key=True)
    geom = db.Column(Geometry("POINT", srid=2154))
    etatrevetement = db.Column(db.String)
    date_saisie = db.Column(db.Date)
    date_maj = db.Column(db.Date)
    src_geom = db.Column(db.String)
    src_attr = db.Column(db.String)
    remarque = db.Column(db.Text)
