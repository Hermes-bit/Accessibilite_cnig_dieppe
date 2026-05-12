# CNIG Accessibilité — Application de mobilité

Application cartographique de mobilité conforme au standard **CNIG Accessibilité**, permettant la consultation et l'analyse des données d'accessibilité piétonne (tronçons, équipements, ERP, stationnements PMR, etc.).

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Visualisation cartographique | [mviewer](https://github.com/mviewer/mviewer) + OpenLayers |
| API REST / GeoJSON | Python · Flask · GeoAlchemy2 |
| Base de données | PostgreSQL + PostGIS (alwaysdata) |
| Reverse proxy / sécurité | Nginx 1.27 |
| Conteneurisation | Docker / Docker Compose |
| CI/CD | GitHub Actions |
| Rate limiting | Flask-Limiter + Redis |

## Architecture

```
Internet
   │
   ▼
Nginx (HTTPS, headers sécurité, rate limiting)
   ├── /            → mviewer  (fichiers statiques)
   ├── /api/v1/     → Flask API (GeoJSON par couche)
   └── /auth/       → JWT login / refresh / logout
                          │
                     PostgreSQL
                  (schéma cnig_accessibilite)
```

## Couches disponibles

| Endpoint | Description |
|----------|-------------|
| `/api/v1/layers/troncons` | Tronçons de cheminement |
| `/api/v1/layers/noeuds` | Nœuds de cheminement |
| `/api/v1/layers/obstacles` | Obstacles |
| `/api/v1/layers/traversees` | Traversées |
| `/api/v1/layers/ascenseurs` | Ascenseurs |
| `/api/v1/layers/escaliers` | Escaliers |
| `/api/v1/layers/rampes` | Rampes |
| `/api/v1/layers/elevateurs` | Élévateurs |
| `/api/v1/layers/passages_selectifs` | Passages sélectifs |
| `/api/v1/layers/quais` | Quais |
| `/api/v1/layers/stationnements_pmr` | Stationnements PMR |
| `/api/v1/layers/erp` | Établissements Recevant du Public |
| `/api/v1/layers/entrees` | Entrées ERP |

Tous les endpoints acceptent les paramètres :
- `?bbox=xmin,ymin,xmax,ymax` (WGS84) — filtre spatial
- `?limit=N&offset=M` — pagination (max 5000)

## Démarrage rapide (développement)

### Prérequis
- Docker Desktop ≥ 24
- Python 3.12 (pour les scripts locaux)
- Git

### 1. Cloner et configurer

```bash
git clone https://github.com/VOTRE_COMPTE/cnig-accessibilite.git
cd cnig-accessibilite
cp .env.example .env
# Éditer .env : renseigner DATABASE_URL et les secrets
```

### 2. Générer un hash de mot de passe admin

```bash
make gen-password
# Copier le résultat dans .env → ADMIN_PASSWORD_HASH
```

### 3. Lancer l'environnement de développement

```bash
make dev
```

L'application est disponible sur **http://localhost:8080**

### 4. Tester l'API

```bash
# Obtenir un token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre_mot_de_passe"}'

# Interroger une couche
curl http://localhost:8080/api/v1/layers/troncons \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -G --data-urlencode "bbox=-1.7,48.1,-1.6,48.15"
```

## Déploiement en production

### 1. Certificats SSL

```bash
# Certificats Let's Encrypt (production)
export DOMAIN=votre-domaine.fr
export CERTBOT_EMAIL=votre@email.fr
bash scripts/renew-certs.sh

# Ou auto-signés pour les tests
bash scripts/generate-certs-dev.sh
```

### 2. Variables d'environnement

Copier `.env.example` → `.env` et renseigner **tous** les champs, notamment :
- `SECRET_KEY` et `JWT_SECRET_KEY` : chaînes aléatoires longues
- `DATABASE_URL` : URL complète de la base alwaysdata
- `ADMIN_PASSWORD_HASH` : généré avec `make gen-password`
- `DOMAIN` : votre nom de domaine

### 3. Démarrer

```bash
make prod
```

### Déploiement automatique via GitHub Actions

Le workflow `.github/workflows/cd.yml` se déclenche sur les tags `v*.*.*` :

```bash
git tag v1.0.0
git push origin v1.0.0
```

Il construit les images, les pousse sur GHCR, puis se connecte au serveur en SSH pour mettre à jour les conteneurs.

**Secrets GitHub à configurer** (`Settings → Secrets → Actions`) :

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | IP/domaine du serveur de production |
| `DEPLOY_USER` | Utilisateur SSH |
| `DEPLOY_SSH_KEY` | Clé SSH privée |
| `DOMAIN` | Nom de domaine |

## Sécurité

| Mesure | Détail |
|--------|--------|
| HTTPS uniquement | TLS 1.2/1.3, HSTS 2 ans |
| En-têtes sécurité | CSP, X-Frame-Options, HSTS, Permissions-Policy |
| Authentification | JWT (access 1h + refresh 30j) |
| Rate limiting | 30 req/min sur l'API, 5 req/min sur l'auth |
| Scan SAST | Bandit à chaque push sur `main` |
| Scan dépendances | Safety + Trivy chaque semaine |
| Mises à jour auto | Dependabot (pip, Docker, Actions) |
| Utilisateur non-root | Conteneur backend tourne en `appuser` |
| Réseau isolé | `internal: true` entre backend et BDD |

## Maintenance

### Sauvegardes

```bash
# Sauvegarde manuelle
export DATABASE_URL=postgresql://...
bash scripts/backup-db.sh

# Automatiser (crontab)
0 3 * * * DATABASE_URL=... /opt/cnig-accessibilite/scripts/backup-db.sh
```

### Renouvellement des certificats

```bash
# Ajouter en crontab
0 3 1 * * DOMAIN=... CERTBOT_EMAIL=... /opt/cnig-accessibilite/scripts/renew-certs.sh
```

### Logs

```bash
make logs services="backend nginx"
```

## Développement

```bash
# Tests
make test

# Lint
make lint

# Audit de sécurité local
make security-scan
```

## Licence

À définir — données sous standard CNIG © IGN.