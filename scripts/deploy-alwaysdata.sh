#!/usr/bin/env bash
# Déploiement sur alwaysdata via git + SSH
# Usage : bash scripts/deploy-alwaysdata.sh <alwaysdata_user> <domaine>
# Exemple : bash scripts/deploy-alwaysdata.sh hermes58 cnigaccessibilitedieppe.com
set -euo pipefail

ALWAYSDATA_USER="${1:?'Usage: deploy-alwaysdata.sh <alwaysdata_user> <domaine>'}"
DOMAIN="${2:?'Usage: deploy-alwaysdata.sh <alwaysdata_user> <domaine>'}"
SSH_HOST="ssh-${ALWAYSDATA_USER}.alwaysdata.net"
REMOTE_DIR="/home/${ALWAYSDATA_USER}/cnig-accessibilite"
REPO_URL="git@github.com:Hermes-bit/Accessibilite_cnig_dieppe.git"

echo "════════════════════════════════════════════════════════════════════"
echo "  Déploiement → ${ALWAYSDATA_USER}@${SSH_HOST}"
echo "════════════════════════════════════════════════════════════════════"

# ── 1. Clone ou mise à jour du repo sur alwaysdata ───────────────────────────
echo ""
echo "── 1/3  Synchronisation du code ────────────────────────────────────"
ssh "${ALWAYSDATA_USER}@${SSH_HOST}" bash << ENDSSH
  set -e
  if [ -d "${REMOTE_DIR}/.git" ]; then
    echo "   → Mise à jour du repo existant..."
    cd "${REMOTE_DIR}"
    git pull origin main
  else
    echo "   → Clonage depuis GitHub..."
    git clone "${REPO_URL}" "${REMOTE_DIR}"
    cd "${REMOTE_DIR}"
  fi
  echo "   ✅  Code à jour."
ENDSSH

# ── 2. Build mviewer-dist sur alwaysdata ─────────────────────────────────────
echo ""
echo "── 2/3  Build mviewer-dist ─────────────────────────────────────────"
ssh "${ALWAYSDATA_USER}@${SSH_HOST}" bash << ENDSSH
  set -e
  cd "${REMOTE_DIR}"
  bash scripts/build-mviewer-dist.sh
ENDSSH

# ── 3. Installation des dépendances Python ────────────────────────────────────
echo ""
echo "── 3/3  Dépendances Python ─────────────────────────────────────────"
ssh "${ALWAYSDATA_USER}@${SSH_HOST}" bash << ENDSSH
  set -e
  cd "${REMOTE_DIR}/backend"
  pip3 install --user -q -r requirements.txt
  echo "   ✅  Dépendances installées."
ENDSSH

# ── Résumé final ──────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  ✅  Déploiement terminé !"
echo ""
echo "  ⚠️  Variables à configurer dans alwaysdata → Sites → Environnement :"
echo ""
echo "    FLASK_ENV      = production"
echo "    SECRET_KEY     = $(python3 -c 'import secrets; print(secrets.token_hex(32))' 2>/dev/null || echo '<générer: python3 -c \"import secrets; print(secrets.token_hex(32))\">')"
echo "    JWT_SECRET_KEY = $(python3 -c 'import secrets; print(secrets.token_hex(32))' 2>/dev/null || echo '<générer>')"
echo "    DATABASE_URL   = postgresql://hermes58:<MOT_DE_PASSE>@postgresql-hermes58.alwaysdata.net:5432/hermes58_a4"
echo "    CORS_ORIGINS   = https://${DOMAIN}"
echo "    MVIEWER_DIR    = ${REMOTE_DIR}/mviewer-dist"
echo ""
echo "  ⚠️  Configuration du site Python dans alwaysdata → Web → Sites :"
echo "    Adresses       : ${DOMAIN}"
echo "    Répertoire     : ${REMOTE_DIR}/backend"
echo "    Commande       : gunicorn -w 2 wsgi:app"
echo "    Python         : 3.11"
echo ""
echo "  URL : https://${DOMAIN}"
echo "════════════════════════════════════════════════════════════════════"
