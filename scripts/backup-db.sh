#!/usr/bin/env bash
# Sauvegarde du schéma cnig_accessibilite vers un fichier .sql.gz horodaté
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
FILENAME="${BACKUP_DIR}/cnig_accessibilite_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump \
  --schema=cnig_accessibilite \
  --no-owner \
  --no-acl \
  "$DATABASE_URL" \
  | gzip > "$FILENAME"

echo "Sauvegarde créée : $FILENAME"

# Suppression des sauvegardes de plus de 30 jours
find "$BACKUP_DIR" -name "cnig_accessibilite_*.sql.gz" -mtime +30 -delete
echo "Anciennes sauvegardes purgées."
