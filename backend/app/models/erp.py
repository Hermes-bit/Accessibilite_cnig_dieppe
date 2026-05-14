from geoalchemy2 import Geometry
from app import db
from .base import GeoModelMixin


class Erp(GeoModelMixin, db.Model):
    __tablename__ = "erp"
    __table_args__ = {"schema": "cnig_accessibilite"}

    iderp = db.Column(db.String, primary_key=True)
    nom = db.Column(db.String)
    adresse = db.Column(db.Text)
    codepostal = db.Column(db.String)
    erpcategorie = db.Column(db.String)
    erptype = db.Column(db.String)
    datemiseajour = db.Column(db.Date)
    sourcemiseajour = db.Column(db.String)
    stationnementerp = db.Column(db.String)
    stationnementpmr = db.Column(db.String)
    accueilpersonnel = db.Column(db.String)
    accueilbim = db.Column(db.String)
    accueilbimportative = db.Column(db.String)
    accueillsf = db.Column(db.String)
    accueilst = db.Column(db.String)
    accueilaideaudition = db.Column(db.String)
    accueilprestations = db.Column(db.Text)
    sanitaireserp = db.Column(db.String)
    sanitairesadaptes = db.Column(db.String)
    telephone = db.Column(db.String)
    siteweb = db.Column(db.String)
    siret = db.Column(db.String)
    latitude = db.Column(db.Numeric)
    longitude = db.Column(db.Numeric)
    erpactivite = db.Column(db.String)
    commentaire = db.Column(db.Text)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))


class VErp(GeoModelMixin, db.Model):
    """Vue enrichie avec libellés et couleur d'accessibilité."""

    __tablename__ = "v_erp"
    __table_args__ = {"schema": "cnig_accessibilite"}

    iderp = db.Column(db.String, primary_key=True)
    nom = db.Column(db.String)
    adresse = db.Column(db.Text)
    codepostal = db.Column(db.String)
    erpcategorie = db.Column(db.String)
    erptype = db.Column(db.String)
    datemiseajour = db.Column(db.Date)
    latitude = db.Column(db.Numeric)
    longitude = db.Column(db.Numeric)
    commentaire = db.Column(db.Text)
    photo = db.Column(db.Text)
    categorie_libelle = db.Column(db.String)
    type_libelle = db.Column(db.String)
    couleur_accessibilite = db.Column(db.String)
    geom = db.Column(Geometry("POINT", srid=2154))


class Entree(GeoModelMixin, db.Model):
    __tablename__ = "entree"
    __table_args__ = {"schema": "cnig_accessibilite"}

    identree = db.Column(db.String, primary_key=True)
    idnoeud = db.Column(db.String)
    iderp = db.Column(db.String)
    altitude = db.Column(db.Numeric)
    bandeeveilvigilance = db.Column(db.String)
    hauteurressaut = db.Column(db.Numeric)
    abaissepente = db.Column(db.Numeric)
    abaisselargeur = db.Column(db.Numeric)
    controlebev = db.Column(db.String)
    bandeinterception = db.Column(db.String)
    adresse = db.Column(db.Text)
    typeentree = db.Column(db.String)
    rampe = db.Column(db.String)
    rampesonnette = db.Column(db.String)
    ascenseur = db.Column(db.String)
    escaliernbmarche = db.Column(db.Integer)
    escaliermaincourante = db.Column(db.String)
    reperabilite = db.Column(db.String)
    reperageeltsvitres = db.Column(db.String)
    signaletique = db.Column(db.String)
    largeurpassage = db.Column(db.Numeric)
    controleacces = db.Column(db.String)
    entreeaccueilvisible = db.Column(db.String)
    eclairage = db.Column(db.String)
    typeporte = db.Column(db.String)
    typeouverture = db.Column(db.String)
    espacemanoeuvre = db.Column(db.String)
    largmanoeuvreext = db.Column(db.Numeric)
    longmanoeuvreext = db.Column(db.Numeric)
    largmanoeuvreint = db.Column(db.Numeric)
    longmanoeuvreint = db.Column(db.Numeric)
    typepoignee = db.Column(db.String)
    effortouverture = db.Column(db.Numeric)
    photo = db.Column(db.Text)
    geom = db.Column(Geometry("POINT", srid=2154))
