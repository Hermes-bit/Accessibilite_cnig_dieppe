#!/usr/bin/env bash
# Renouvellement Let's Encrypt via Certbot (standalone)
# À planifier dans un cron : 0 3 * * * /opt/cnig-accessibilite/scripts/renew-certs.sh
set -euo pipefail

DOMAIN="${DOMAIN:?La variable DOMAIN doit être définie}"
EMAIL="${CERTBOT_EMAIL:?La variable CERTBOT_EMAIL doit être définie}"
CERT_DIR="./nginx/certs"

certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN" \
  --deploy-hook "cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${CERT_DIR}/fullchain.pem && \
                 cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem  ${CERT_DIR}/privkey.pem  && \
                 cp /etc/letsencrypt/live/${DOMAIN}/chain.pem    ${CERT_DIR}/chain.pem    && \
                 docker compose kill -s HUP nginx"

echo "Certificats renouvelés pour $DOMAIN"
