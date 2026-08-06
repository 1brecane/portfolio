FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_HCAPTCHA_SITE_KEY
ARG VITE_API_BASE_URL

RUN npm run build

# ---

FROM nginx:stable-alpine

# Rendered by the image's envsubst-on-templates entrypoint at container start,
# not at build time: HOMELAB_API_ORIGIN/HOMELAB_API_TOKEN are runtime env
# (see deploy.yml), never build ARGs, so the token never lands in an image
# layer or the frontend bundle. The filter restricts substitution to just
# these two vars, so nginx.conf's own `$host`/`$upstream_cache_status`/etc.
# stay literal.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER="HOMELAB_API_ORIGIN|HOMELAB_API_TOKEN"
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
