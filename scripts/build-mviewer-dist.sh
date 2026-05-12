#!/usr/bin/env bash
# Construit le dossier mviewer-dist/ prêt au déploiement sur alwaysdata
# Usage : bash scripts/build-mviewer-dist.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/mviewer-dist"

echo "── Téléchargement de mviewer (GitHub) ──────────────────────────────"
rm -rf "$DIST"
git clone --depth 1 --branch master https://github.com/mviewer/mviewer.git "$DIST"
rm -rf "$DIST/.git"

echo "── Injection des fichiers CNIG ─────────────────────────────────────"
cp -r "$ROOT/mviewer/apps/"*  "$DIST/apps/"
cp    "$ROOT/mviewer/config/cnig_accessibilite.xml" "$DIST/apps/cnig_accessibilite.xml"

echo "── Nettoyage des exemples inutiles ─────────────────────────────────"
rm -rf "$DIST/demo" "$DIST/docs"

echo ""
echo "✅  mviewer-dist/ prêt : $(du -sh "$DIST" | cut -f1)"
echo "    → À déposer sur alwaysdata avec le backend"
