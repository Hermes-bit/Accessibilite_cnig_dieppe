FROM nginx:1.27-alpine
COPY config/ /usr/share/nginx/html/apps/cnig/
COPY nginx-mviewer.conf /etc/nginx/conf.d/default.conf

# mviewer is served as static files via a dedicated nginx instance
# The main nginx container handles HTTPS and proxying to this service
