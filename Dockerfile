# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app

# Install Slidoo dependencies from the lockfile reproducibly.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG OPEN_SLIDE_BASE=/
ENV OPEN_SLIDE_BASE=${OPEN_SLIDE_BASE}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
# Temporary upload-page design preview (replaced when the real feature lands).
COPY design/upload-preview.deploy.html /usr/share/nginx/html/upload-preview.html
# Unhashed copies of the Gama fonts so the preview page can reference stable URLs.
COPY assets/fonts/ /usr/share/nginx/html/fonts/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
