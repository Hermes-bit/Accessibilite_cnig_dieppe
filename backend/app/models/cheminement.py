from geoalchemy2 import Geometry
from app import db
from .base import GeoModelMixin


class NoeudCheminement(GeoModelMixin, db.Model):
    __tablename__ = "noeud_cheminement"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idnoeud = db.Column(db.String, primary_key=True)
    altitude = db.Column(db.Numeric)
    bandeeveilvigilance = db.Column(db.String)
    hauteurressaut = db.Column(db.Numeric)
    abaissepente = db.Column(db.Numeric)
    abaisselargeur = db.Column(db.Numeric)
    controlebev = db.Column(db.String)
    bandeinterception = db.Column(db.String)
    masquecovisibilite = db.Column(db.String)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))


class TronconCheminement(GeoModelMixin, db.Model):
    __tablename__ = "troncon_cheminement"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idtroncon = db.Column(db.String, primary_key=True)
    id_from = db.Column(db.String)
    id_to = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    typesol = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    reperelineaire = db.Column(db.String)
    accessibiliteglobale = db.Column(db.String)
    type = db.Column(db.String)
    geom = db.Column(Geometry("LINESTRING", srid=2154))


class VTroncons(GeoModelMixin, db.Model):
    """Vue enrichie avec libellés et couleur d'accessibilité."""

    __tablename__ = "v_troncons"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idtroncon = db.Column(db.String, primary_key=True)
    id_from = db.Column(db.String)
    id_to = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    typesol = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    reperelineaire = db.Column(db.String)
    accessibiliteglobale = db.Column(db.String)
    type = db.Column(db.String)
    typesol_libelle = db.Column(db.String)
    etat_libelle = db.Column(db.String)
    typetroncon_libelle = db.Column(db.String)
    statutvoie_libelle = db.Column(db.String)
    couleur_acces = db.Column(db.String)
    niveau_acces_calcule = db.Column(db.String)
    nb_obstacles = db.Column(db.Integer)
    geom = db.Column(Geometry("LINESTRING", srid=2154))


class Obstacle(GeoModelMixin, db.Model):
    __tablename__ = "obstacle"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idobstacle = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    distance_troncon_m = db.Column(db.Numeric)
    source_couche = db.Column(db.String)
    typeobstacle = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    positionobstacle = db.Column(db.String)
    longueurobstacle = db.Column(db.Numeric)
    rappelobstacle = db.Column(db.String)
    reperabilitevisuelle = db.Column(db.String)
    largeurobstacle = db.Column(db.Numeric)
    hauteurobsposesol = db.Column(db.Numeric)
    hauteursousobs = db.Column(db.Numeric)
    photo = db.Column(db.Text)
    date_saisie = db.Column(db.Date)
    commentaire = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))


class VObstacles(GeoModelMixin, db.Model):
    """Vue enrichie avec libellés et couleur."""

    __tablename__ = "v_obstacles"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idobstacle = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    distance_troncon_m = db.Column(db.Numeric)
    source_couche = db.Column(db.String)
    typeobstacle = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    positionobstacle = db.Column(db.String)
    longueurobstacle = db.Column(db.Numeric)
    rappelobstacle = db.Column(db.String)
    reperabilitevisuelle = db.Column(db.String)
    largeurobstacle = db.Column(db.Numeric)
    hauteurobsposesol = db.Column(db.Numeric)
    hauteursousobs = db.Column(db.Numeric)
    photo = db.Column(db.Text)
    date_saisie = db.Column(db.Date)
    commentaire = db.Column(db.Text)
    type_libelle = db.Column(db.String)
    position_libelle = db.Column(db.String)
    couleur_marker = db.Column(db.String)
    geom = db.Column(Geometry("POINT", srid=2154))


class Traversee(GeoModelMixin, db.Model):
    __tablename__ = "traversee"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idtraversee = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    bandesblanches = db.Column(db.String)
    etatmarquage = db.Column(db.String)
    eclairage = db.Column(db.String)
    feupietons = db.Column(db.String)
    aidesonore = db.Column(db.String)
    reperelineaire = db.Column(db.String)
    presenceilot = db.Column(db.String)
    chausseebombee = db.Column(db.String)
    voiestraversees = db.Column(db.Integer)
    masquecovisibilite = db.Column(db.String)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))


class Circulation(GeoModelMixin, db.Model):
    __tablename__ = "circulation"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idcirculation = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    id_from = db.Column(db.String)
    id_to = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    typesol = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    eclairage = db.Column(db.String)
    transition = db.Column(db.String)
    typepassage = db.Column(db.String)
    reperelineaire = db.Column(db.String)
    couvert = db.Column(db.String)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POLYGON", srid=2154))
