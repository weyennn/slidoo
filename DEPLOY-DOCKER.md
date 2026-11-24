# Slidoo Docker deployment

Slidoo runs as one Node process (`server/src/index.mjs`). It builds the deck site at start-up, then serves the decks, the upload page at `/upload`, and its API. No database is required. Uploaded documents become files under `slides/`, so the container needs a writable workspace, and that is lost when the container is recreated unless you mount it.

## Build and run with Docker Compose

1. Copy `.env.example` to `.env`. The default serves Slidoo at the `/slidoo/` subpath; set `OPEN_SLIDE_BASE=/` only if the site is published at the root.
2. Choose a free local port in `.env`. The default binds to `127.0.0.1:8080`, suitable when a host reverse proxy routes to it.
3. On a host with Docker Compose v2, run:

   ```sh
   docker compose up -d --build
   docker compose ps
   ```

4. Check `http://127.0.0.1:8080/healthz` locally. The first start builds the site, so allow up to a minute. Route the `/slidoo/` prefix to this origin while preserving the prefix; the server accepts requests with or without it. Confirm deep links and asset URLs through the public reverse proxy before announcing availability.
5. To update, pull/release the intended source and run `docker compose up -d --build`. To stop, use `docker compose down` (there is no persistent application volume).

`OPEN_SLIDE_BASE` is a build argument passed to `open-slide.config.ts` and must match the externally served prefix. It is not a runtime-only setting: changing it requires rebuilding the image. Use `/slidoo/` when the reverse proxy preserves the prefix (the default); use `/` if the proxy strips the prefix before forwarding.

## Manual Docker build

```sh
docker build --build-arg OPEN_SLIDE_BASE=/slidoo/ -t slidoo:local .
docker run -d --name slidoo --restart unless-stopped \
  -p 127.0.0.1:8080:8080 slidoo:local
```

The example above serves the app at `/slidoo/`; use the build argument `/` for root hosting.

## Release checks

- Confirm the image build succeeds from a clean checkout.
- Verify `/healthz`, the `/slidoo/` entry route, `/slidoo/upload`, hashed JS/CSS/font/image assets, and a client-side deep link through the actual reverse proxy.
- If the upload page is public, set `SLIDOO_UPLOAD_TOKEN` in `.env`, or anyone who can reach the site can create decks.
- Set `SLIDOO_AI=on` and `ANTHROPIC_API_KEY` in `.env` to draft with Claude; without them the upload page uses the rule-based outline.
- Check that requests under `/slidoo/` use the prefix in emitted asset URLs and browser navigation.
- Do not mount the repository over `/app` in production: the image's `node_modules` and build would be hidden.
