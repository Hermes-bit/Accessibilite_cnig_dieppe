#!/usr/bin/env bash
# Génère des certificats auto-signés pour le développement local HTTPS
set -euo pipefail

CERT_DIR="./nginx/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out    "$CERT_DIR/fullchain.pem" \
  -subj   "/C=FR/ST=France/L=Paris/O=CNIG/CN=localhost"

cp "$CERT_DIR/fullchain.pem" "$CERT_DIR/chain.pem"

echo "Certificats auto-signés générés dans $CERT_DIR"
echo "Pour la production, remplacez-les par des certificats Let's Encrypt."
