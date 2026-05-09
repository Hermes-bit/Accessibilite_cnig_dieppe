# Guide utilisateur Plateforme CNIG Accessibilité Dieppe

> **Version** 1.1 Mai 2026  
> **Public** : tous les utilisateurs de la plateforme (viewer, editor, creator, admin)

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Authentification](#2-authentification)
3. [La carte interactive](#3-la-carte-interactive)
4. [Calcul d'itinéraire accessible](#4-calcul-ditinéraire-accessible)
5. [Explorateur de base de données](#5-explorateur-de-base-de-données)
   - 5.1 [Parcourir les tables](#51-parcourir-les-tables)
   - 5.2 [Requêtes SQL personnalisées](#52-requêtes-sql-personnalisées)
   - 5.3 [Exporter les données](#53-exporter-les-données)
   - 5.4 [Importer des données](#54-importer-des-données)
6. [Gestion de votre profil](#6-gestion-de-votre-profil)
7. [Panneau d'administration](#7-panneau-dadministration)
8. [Rôles et permissions](#8-rôles-et-permissions)
9. [Visite guidée (onboarding)](#9-visite-guidée-onboarding)
10. [FAQ et dépannage](#10-faq-et-dépannage)

---

## 1. Présentation générale

La plateforme **CNIG Accessibilité Dieppe** est un outil de gestion et de visualisation des données d'accessibilité de la voirie et des espaces publics, conformément aux spécifications du **Conseil National de l'Information Géographique (CNIG)**.

Elle permet de :
- **Visualiser** les voies piétonnes et leur niveau d'accessibilité sur une carte interactive
- **Calculer des itinéraires** adaptés aux personnes à mobilité réduite (fauteuil roulant, piéton)
- **Explorer et interroger** la base de données PostGIS via une interface SQL intégrée
- **Exporter** les données en CSV ou GeoJSON
- **Importer** de nouvelles données géographiques (GeoJSON, Shapefile)

### Architecture technique

| Composant | Technologie |
|-----------|-------------|
| Carte | mviewer + OpenLayers |
| Backend | Flask (Python) + PostGIS |
| Routage | pgRouting (algorithme Dijkstra) |
| Base de données | PostgreSQL 15 + PostGIS 3 |
| Authentification | JWT (JSON Web Tokens) |

---

## 2. Authentification

### 2.1 Connexion

1. Ouvrez la plateforme dans votre navigateur. La fenêtre de connexion s'affiche automatiquement.
2. **Étape 1** Saisissez votre adresse e-mail et cliquez sur **Continuer**.
3. **Étape 2** Saisissez votre mot de passe et cliquez sur **Se connecter**.

> **Astuce** : Appuyez sur `Entrée` dans chaque champ pour valider sans cliquer.

### 2.2 Première connexion

Si vous n'avez jamais utilisé la plateforme :

1. À l'étape 1 (saisie de l'e-mail), cliquez sur le lien **"Première connexion ? Recevoir un mot de passe"**.
2. Un mot de passe temporaire vous est envoyé par e-mail *(en mode développement, il s'affiche directement à l'écran)*.
3. Ce mot de passe est automatiquement pré-rempli dans le champ mot de passe.
4. À la connexion, vous serez invité à **définir un mot de passe personnel** (minimum 6 caractères).

### 2.3 Mot de passe oublié

1. À l'étape 2 (saisie du mot de passe), cliquez sur **"Mot de passe oublié ?"**.
2. Un nouveau mot de passe temporaire vous est envoyé par e-mail.
3. Utilisez-le pour vous connecter, puis définissez un nouveau mot de passe personnel.

### 2.4 Déconnexion

Cliquez sur votre avatar dans la barre de navigation → **Déconnexion**.

> Votre session est invalidée côté serveur. Il n'est **pas** nécessaire de créer un nouveau mot de passe à la reconnexion.

---

## 3. La carte interactive

### 3.1 Navigation

| Action | Résultat |
|--------|----------|
| Molette souris / pinch | Zoom avant/arrière |
| Clic + glisser | Déplacer la carte |
| Double-clic | Zoom avant |
| Clic sur un tronçon | Affiche les informations d'accessibilité |

### 3.2 Fonds de plan

Trois fonds de plan sont disponibles via le panneau en bas à droite de la carte :

| Fond | Description |
|------|-------------|
| **OpenStreetMap** | Fond standard, recommandé pour la navigation |
| **Fond clair** | CartoDB Positron meilleure lisibilité des données |
| **Satellite** | Esri World Imagery vue aérienne |

### 3.3 Couches de données

Les couches CNIG sont accessibles depuis le panneau des thématiques. Chaque couche peut être :
- **Activée / désactivée** via la case à cocher
- **Interrogée** en cliquant sur un élément de la carte

### 3.4 Signification des couleurs (tronçons)

| Couleur | Signification |
|---------|---------------|
| Vert | Tronçon accessible (critères CNIG respectés) |
| Orange | Accessibilité partielle ou contraintes mineures |
| Rouge | Tronçon non accessible ou très contraint |
| Gris | Information manquante |

---

## 4. Calcul d'itinéraire accessible

### 4.1 Ouvrir le panneau d'itinéraire

Cliquez sur le bouton **Itinéraire** dans la barre de navigation en haut.

### 4.2 Saisir les points de départ et d'arrivée

1. Tapez une adresse dans le champ **Départ** des suggestions apparaissent automatiquement via la géocodification.
2. Tapez une adresse dans le champ **Arrivée**.
3. Vous pouvez aussi cliquer sur l'icône 📍 à droite d'un champ pour **choisir un point sur la carte**.
4. Le bouton ⇅ permet d'**inverser départ et arrivée**.

### 4.3 Choisir un profil de mobilité

| Profil | Description |
|--------|-------------|
| 🚶 **Piéton** | Itinéraire standard pour piétons valides |
| ♿ **Fauteuil roulant** | Évite les obstacles : pente > 8%, largeur < 90 cm, revêtement dégradé |
| **Les deux** | Affiche un tableau comparatif des deux itinéraires |

### 4.4 Lancer le calcul

Cliquez sur **Calculer l'itinéraire**. Le résultat affiche :
- **Distance** totale en mètres
- **Durée** estimée en minutes
- Un message sur le **niveau d'accessibilité** de l'itinéraire calculé
- Les segments problématiques si l'itinéraire PMR est contraint

> **Note** : Si aucun itinéraire n'est trouvé en mode strict PMR, le calcul tente automatiquement un mode "assoupli" avec des coûts élevés plutôt que des blocages totaux.

### 4.5 Réinitialiser

Cliquez sur **Effacer** pour réinitialiser le formulaire et supprimer le tracé de la carte.

---

## 5. Explorateur de base de données

L'explorateur de base de données est une interface de type pgAdmin intégrée à la plateforme. Il permet d'interroger directement la base PostGIS.

**Accès** : Bouton **Base de données** dans la barre de navigation.

> **Rôles requis** : creator ou admin. Les viewers et editors n'ont pas accès à cet outil.

### 5.1 Parcourir les tables

Le panneau de gauche liste toutes les **tables** et **vues** du schéma `cnig_accessibilite`.

- Cliquez sur une table pour charger automatiquement `SELECT * FROM ... LIMIT 100`
- Les colonnes sont affichées avec leur **type de données** (text, integer, geometry, etc.)
- La colonne numérique à gauche indique le **numéro de ligne**

### 5.2 Requêtes SQL personnalisées

La zone d'édition SQL en haut permet de saisir des requêtes `SELECT` personnalisées.

**Exemples :**
```sql
-- Tous les tronçons avec une pente supérieure à 8%
SELECT idtroncon, pente, largeurutile, accessibiliteglobale
FROM cnig_accessibilite.routing_edges_base
WHERE pente > 8
ORDER BY pente DESC;

-- Nombre de tronçons par niveau d'accessibilité
SELECT accessibiliteglobale, COUNT(*) as nb
FROM cnig_accessibilite.routing_edges_base
GROUP BY accessibiliteglobale;
```

> **Sécurité** : Seules les requêtes `SELECT` sont autorisées. Les modifications (INSERT, UPDATE, DELETE, DROP…) sont bloquées.

**Raccourcis :**
- `Ctrl + Entrée` Exécuter la requête
- Le sélecteur **Limite** contrôle le nombre maximum de lignes retournées (100 à 2 000)

### 5.3 Exporter les données

Cliquez sur **Exporter ▾** pour choisir le format d'export :

#### Export CSV

Disponible pour toute requête SQL ou table sélectionnée.

1. Cliquez sur **Exporter ▾** → **CSV (tous formats)**
2. Le fichier est téléchargé automatiquement avec un BOM UTF-8 (compatible Excel)

> Si une requête SQL est saisie dans l'éditeur, elle est utilisée pour l'export.  
> Sinon, la table actuellement sélectionnée est exportée intégralement.

#### Export GeoJSON

Disponible uniquement pour les **tables avec une colonne géométrique**.

1. **Sélectionnez d'abord une table** dans la liste de gauche
2. Cliquez sur **Exporter ▾** → **GeoJSON (table avec géométrie)**
3. Le fichier `.geojson` est téléchargé, prêt à être ouvert dans QGIS, ArcGIS ou autre SIG

> La géométrie est automatiquement reprojetée en **WGS84 (EPSG:4326)** pour la conformité GeoJSON (RFC 7946).

### 5.4 Importer des données

Cliquez sur **Importer** pour ouvrir le dialogue d'import.

#### Formats supportés

| Format | Extension | Prérequis |
|--------|-----------|-----------|
| **GeoJSON** | `.geojson` ou `.json` | Doit être un `FeatureCollection` en WGS84 |
| **Shapefile** | `.zip` | Le ZIP doit contenir `.shp` + `.dbf` + `.shx` + `.prj` |

#### Procédure d'import

1. **Glissez-déposez** votre fichier sur la zone ou cliquez sur **parcourir**
2. Saisissez le **nom de la table cible** (minuscules, chiffres, underscores, commençant par une lettre)
   - Le nom est pré-rempli automatiquement depuis le nom du fichier
3. Choisissez le **mode d'import** :
   - **Créer/remplacer** supprime la table existante et en crée une nouvelle
   - **Ajouter** insère les données dans une table existante (les colonnes doivent correspondre)
4. Cliquez sur **Importer**

#### Résultat

Après l'import, un message affiche :
- Le nombre d'enregistrements **insérés**
- Le nombre d'enregistrements **ignorés** (géométrie invalide ou absente)
- Le nom de la table créée dans `cnig_accessibilite`

> La nouvelle table apparaît automatiquement dans la liste de gauche et une requête `SELECT` est pré-remplie.

#### Notes techniques

- Les propriétés GeoJSON sont importées comme colonnes **TEXT**
- Les champs Shapefile sont nettoyés (caractères spéciaux → underscores)
- La projection source du Shapefile est détectée via le fichier `.prj` conversion automatique vers **WGS84**
- Un **index spatial GIST** est créé automatiquement sur la colonne géométrique

---

## 6. Gestion de votre profil

Cliquez sur votre **avatar** dans la barre de navigation pour accéder au menu :

| Option | Description |
|--------|-------------|
| **Changer de mot de passe** | Définir un nouveau mot de passe personnel |
| **Visite guidée** | Relancer le tutoriel interactif |
| **Gestion utilisateurs** | *(admin uniquement)* Ouvrir le panneau d'administration |
| **Déconnexion** | Terminer la session |

---

## 7. Panneau d'administration

*Accessible uniquement aux utilisateurs avec le rôle **admin**.*

### 7.1 Accéder au panneau

Cliquez sur votre avatar → **Gestion utilisateurs**.

### 7.2 Fonctionnalités

Le tableau liste tous les utilisateurs avec :
- **E-mail** et **Nom d'affichage**
- **Rôle** modifiable via le menu déroulant (viewer / editor / creator / admin)
- **Statut actif** activé/désactivé via le toggle
- **Dernière connexion** et **Date de création**

Toute modification est **sauvegardée immédiatement** sans bouton valider.

---

## 8. Rôles et permissions

| Rôle | Carte | Itinéraire | Base de données | Admin |
|------|-------|------------|-----------------|-------|
| **viewer** | ✅ | ❌ | ❌ | ❌ |
| **editor** | ✅ | ❌ | ✅ | ❌ |
| **creator** | ✅ | ✅ | ✅ | ❌ |
| **admin** | ✅ | ✅ | ✅ | ✅ |

> Les boutons non accessibles sont masqués dans l'interface ils ne s'affichent pas du tout selon votre rôle.

---

## 9. Visite guidée (onboarding)

### Déclenchement automatique

La visite guidée se lance **automatiquement** lors de votre **première connexion** à la plateforme.  
Elle présente les 6 zones clés de l'interface avec des infobulles positionnées.

### Relancer la visite

À tout moment, relancez-la via : **Avatar → Visite guidée**

### Réinitialiser la visite

La visite ne se relance automatiquement qu'une fois. Pour la réinitialiser manuellement sur votre navigateur, ouvrez la console JavaScript (`F12`) et tapez :
```javascript
localStorage.removeItem('cnig_tour_done');
```
Puis rechargez la page.

---

## 10. FAQ et dépannage

### Je ne reçois pas l'e-mail avec mon mot de passe temporaire

En **mode développement** (sans serveur SMTP configuré), le mot de passe temporaire s'affiche directement à l'écran, en grand, dans la fenêtre de connexion. Il est aussi pré-rempli dans le champ mot de passe.

### Le calcul d'itinéraire retourne "Ces deux points ne sont pas reliés"

Le réseau de routage couvre uniquement les voies certifiées CNIG. Si vos points sont trop éloignés du réseau ou dans des zones non couvertes, essayez des adresses plus proches des voies représentées sur la carte (les tronçons orange/rouge/vert).

### L'explorateur de base de données n'apparaît pas dans la navbar

Vérifiez votre rôle d'utilisateur les rôles **viewer** et **editor** n'ont pas accès à cet outil. Contactez un administrateur pour changer votre rôle.

### L'import Shapefile échoue avec "Le ZIP doit contenir .shp et .dbf"

Vérifiez que votre fichier ZIP contient bien :
- `nom_fichier.shp` les géométries
- `nom_fichier.dbf` les attributs
- `nom_fichier.shx` l'index (recommandé)
- `nom_fichier.prj` la projection (recommandé pour la reprojection automatique)

Tous ces fichiers doivent être à la **racine** du ZIP, pas dans un sous-dossier.

### Mon token de session expire trop vite

La durée de vie du token d'accès est configurée dans les variables d'environnement du backend (`JWT_ACCESS_TOKEN_EXPIRES`). Contactez l'administrateur système pour ajuster cette valeur.

### Comment signaler un bug ?

Contactez l'administrateur de la plateforme ou ouvrez un ticket sur le dépôt Git du projet.

---

*Document généré automatiquement CNIG Accessibilité Dieppe 2026*
