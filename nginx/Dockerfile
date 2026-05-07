FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY nginx.conf /etc/nginx/nginx.conf

# Create certs directory (real certs mounted at runtime via volume)
RUN mkdir -p /etc/nginx/certs

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
