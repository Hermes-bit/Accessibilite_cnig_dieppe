FROM alpine:3.20 AS fetch
RUN apk add --no-cache git
# Récupère la dernière version stable de mviewer
RUN git clone --depth 1 --branch master https://github.com/mviewer/mviewer.git /mviewer

FROM nginx:1.27-alpine
# Copie le code source de mviewer
COPY --from=fetch /mviewer /usr/share/nginx/html

# Injecte notre configuration CNIG par-dessus
COPY config/cnig_accessibilite.xml /usr/share/nginx/html/apps/cnig_accessibilite.xml

# Configuration nginx minimaliste pour servir les fichiers statiques
COPY nginx-mviewer.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
