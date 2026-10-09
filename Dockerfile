# syntax=docker/dockerfile:1
# One Node process serves everything: the deck site, the upload page and its
# API. It builds the static site at start-up, so the image has no separate
# build stage and no nginx.
FROM node:22-alpine
WORKDIR /app

# Install dependencies from the lockfiles first so this layer is cached
# until a dependency changes.
COPY package.json package-lock.json ./
RUN npm ci
COPY server/package.json server/package-lock.json server/
RUN npm ci --prefix server

COPY . .
ARG OPEN_SLIDE_BASE=/
ENV OPEN_SLIDE_BASE=${OPEN_SLIDE_BASE} \
    HOST=0.0.0.0 \
    PORT=8080
EXPOSE 8080
# The first start builds the site, which can take a while on a small host.
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server/src/index.mjs"]
