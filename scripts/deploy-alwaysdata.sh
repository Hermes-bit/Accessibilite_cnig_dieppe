#!/usr/bin/env bash
# Déploiement du backend Flask sur alwaysdata (mviewer → GitHub Pages)
# Usage : bash scripts/deploy-alwaysdata.sh <alwaysdata_user>
# Exemple : bash scripts/deploy-alwaysdata.sh hermes58
set -euo pipefail

ALWAYSDATA_USER="${1:?'Usage: deploy-alwaysdata.sh <alwaysdata_user>'}"
SSH_HOST="ssh-${ALWAYSDATA_USER}.alwaysdata.net"
REMOTE_DIR="/home/${ALWAYSDATA_USER}/cnig-accessibilite"
REPO_URL="https://github.com/Hermes-bit/Accessibilite_cnig_dieppe.git"

echo "════════════════════════════════════════════════════════════════════"
echo "  Déploiement Flask → ${ALWAYSDATA_USER}@${SSH_HOST}"
echo "════════════════════════════════════════════════════════════════════"

# ── 1. Clone ou mise à jour du repo ──────────────────────────────────────────
echo ""
echo "── 1/2  Synchronisation du code ────────────────────────────────────"
ssh "${ALWAYSDATA_USER}@${SSH_HOST}" bash << ENDSSH
  set -e
  if [ -d "${REMOTE_DIR}/.git" ]; then
    echo "   → Mise à jour du repo..."
    cd "${REMOTE_DIR}"
    git pull origin main
  else
    echo "   → Clonage depuis GitHub..."
    git clone "${REPO_URL}" "${REMOTE_DIR}"
  fi
  echo "   ✅  Code à jour."
ENDSSH

# ── 2. Installation des dépendances Python ────────────────────────────────────
echo ""
echo "── 2/2  Dépendances Python ─────────────────────────────────────────"
ssh "${ALWAYSDATA_USER}@${SSH_HOST}" bash << ENDSSH
  set -e
  cd "${REMOTE_DIR}/backend"
  pip3 install --user -q -r requirements.txt
  echo "   ✅  Dépendances installées."
ENDSSH

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "  ✅  Backend déployé !"
echo ""
echo "  ⚠️  Variables à configurer dans alwaysdata → Sites → Environnement :"
echo ""
echo "    FLASK_ENV      = production"
echo "    SECRET_KEY     = $(python3 -c 'import secrets; print(secrets.token_hex(32))')"
echo "    JWT_SECRET_KEY = $(python3 -c 'import secrets; print(secrets.token_hex(32))')"
echo "    DATABASE_URL   = postgresql://hermes58:<MOT_DE_PASSE>@postgresql-hermes58.alwaysdata.net:5432/hermes58_a4"
echo "    CORS_ORIGINS   = https://hermes-bit.github.io,https://cnigaccessibilitedieppe.com"
echo ""
echo "  ⚠️  Configuration du site Python dans alwaysdata → Web → Sites :"
echo "    Répertoire  : ${REMOTE_DIR}/backend"
echo "    Commande    : gunicorn -w 2 wsgi:app"
echo "    Python      : 3.11"
echo ""
echo "  mviewer → https://hermes-bit.github.io/Accessibilite_cnig_dieppe"
echo "════════════════════════════════════════════════════════════════════"
