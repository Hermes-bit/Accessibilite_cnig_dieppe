from geoalchemy2 import Geometry
from app import db
from .base import GeoModelMixin


class Ascenseur(GeoModelMixin, db.Model):
    __tablename__ = "ascenseur"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idascenseur = db.Column(db.String, primary_key=True)
    idnoeud = db.Column(db.String)
    altitude = db.Column(db.Numeric)
    bandeeveilvigilance = db.Column(db.String)
    hauteurressaut = db.Column(db.Numeric)
    abaissepente = db.Column(db.Numeric)
    abaisselargeur = db.Column(db.Numeric)
    controlebev = db.Column(db.String)
    bandeinterception = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    diammanoeuvrefauteuil = db.Column(db.Numeric)
    largeurcabine = db.Column(db.Numeric)
    longueurcabine = db.Column(db.Numeric)
    boutonsenrelief = db.Column(db.String)
    annoncesonore = db.Column(db.String)
    signaletage = db.Column(db.String)
    boucleinducmagnet = db.Column(db.String)
    miroir = db.Column(db.String)
    eclairage = db.Column(db.String)
    voyantalerte = db.Column(db.Text)
    typeouverture = db.Column(db.String)
    maincourante = db.Column(db.String)
    hauteurmaincourante = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    supervision = db.Column(db.String)
    autreportesortie = db.Column(db.String)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))


class Escalier(GeoModelMixin, db.Model):
    __tablename__ = "escalier"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idescalier = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    maincourante = db.Column(db.String)
    dispositifvigilance = db.Column(db.String)
    contrastevisuel = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    maincourantecontinue = db.Column(db.String)
    prolongmaincourante = db.Column(db.String)
    nbmarches = db.Column(db.Integer)
    nbvoleemarches = db.Column(db.Integer)
    hauteurmarche = db.Column(db.Numeric)
    giron = db.Column(db.Numeric)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("LINESTRING", srid=2154))


class Escalator(GeoModelMixin, db.Model):
    __tablename__ = "escalator"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idescalator = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    transition = db.Column(db.String)
    dispositifvigilance = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    detecteur = db.Column(db.String)
    supervision = db.Column(db.String)
    geom = db.Column(Geometry("LINESTRING", srid=2154))


class Rampe(GeoModelMixin, db.Model):
    __tablename__ = "rampe"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idrampe = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    maincourante = db.Column(db.String)
    distpalierrepos = db.Column(db.Numeric)
    chasseroue = db.Column(db.String)
    airerotation = db.Column(db.String)
    poidssupporte = db.Column(db.Numeric)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("LINESTRING", srid=2154))


class Elevateur(GeoModelMixin, db.Model):
    __tablename__ = "elevateur"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idelevateur = db.Column(db.String, primary_key=True)
    idnoeud = db.Column(db.String)
    altitude = db.Column(db.Numeric)
    bandeeveilvigilance = db.Column(db.String)
    hauteurressaut = db.Column(db.Numeric)
    abaissepente = db.Column(db.Numeric)
    abaisselargeur = db.Column(db.Numeric)
    controlebev = db.Column(db.String)
    bandeinterception = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    boutonsenrelief = db.Column(db.String)
    typeouverture = db.Column(db.String)
    largeurplateforme = db.Column(db.Numeric)
    longueurplateforme = db.Column(db.Numeric)
    utilisableautonomie = db.Column(db.String)
    etatrevetement = db.Column(db.String)
    supervision = db.Column(db.String)
    autreportesortie = db.Column(db.String)
    chargemaximum = db.Column(db.Numeric)
    accompagnateur = db.Column(db.String)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))


class PassageSelectif(GeoModelMixin, db.Model):
    __tablename__ = "passage_selectif"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idpassageselectif = db.Column(db.String, primary_key=True)
    idnoeud = db.Column(db.String)
    altitude = db.Column(db.Numeric)
    bandeeveilvigilance = db.Column(db.String)
    hauteurressaut = db.Column(db.Numeric)
    abaissepente = db.Column(db.Numeric)
    abaisselargeur = db.Column(db.Numeric)
    controlebev = db.Column(db.String)
    bandeinterception = db.Column(db.String)
    passagemecanique = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    profondeur = db.Column(db.Numeric)
    contrastevisuel = db.Column(db.String)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))


class Quai(GeoModelMixin, db.Model):
    __tablename__ = "quai"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idquai = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    etatrevetement = db.Column(db.String)
    hauteur = db.Column(db.Numeric)
    largeurpassage = db.Column(db.Numeric)
    signalisationporte = db.Column(db.String)
    dispositifvigilance = db.Column(db.String)
    diamzonemanoeuvre = db.Column(db.Numeric)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("LINESTRING", srid=2154))


class StationnementPmr(GeoModelMixin, db.Model):
    __tablename__ = "stationnement_pmr"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idstationnement = db.Column(db.String, primary_key=True)
    typestationnement = db.Column(db.String)
    etatrevetement = db.Column(db.String)
    largeurstat = db.Column(db.Numeric)
    longueurstat = db.Column(db.Numeric)
    bandlatsecurite = db.Column(db.String)
    surlongueur = db.Column(db.String)
    signalpmr = db.Column(db.String)
    marquagesol = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    typesol = db.Column(db.String)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POLYGON", srid=2154))


class TapisRoulant(GeoModelMixin, db.Model):
    __tablename__ = "tapis_roulant"
    __table_args__ = {"schema": "cnig_accessibilite"}

    idtapisroulant = db.Column(db.String, primary_key=True)
    idtroncon = db.Column(db.String)
    longueur = db.Column(db.Numeric)
    typetroncon = db.Column(db.String)
    statutvoie = db.Column(db.String)
    pente = db.Column(db.Numeric)
    devers = db.Column(db.Numeric)
    sens = db.Column(db.String)
    dispositifvigilance = db.Column(db.String)
    largeurutile = db.Column(db.Numeric)
    detecteur = db.Column(db.String)
    geom = db.Column(Geometry("LINESTRING", srid=2154))
