FROM nginx:1.29-alpine

RUN apk add --no-cache openssl

# Stocker comme template — envsubst remplacera ${DOMAIN} au démarrage
COPY nginx.conf /etc/nginx/nginx.conf.template

# Create certs directory (real certs mounted at runtime via volume)
RUN mkdir -p /etc/nginx/certs

EXPOSE 80 443
# Substitue uniquement ${DOMAIN} pour ne pas toucher les variables nginx ($host, $remote_addr…)
CMD ["/bin/sh", "-c", "envsubst '${DOMAIN}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
