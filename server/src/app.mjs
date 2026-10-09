import { timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { FORMATS, MAX_PAGES, MIN_PAGES, PAGE_OPTIONS, THEMES } from './config.mjs';
import { UserError } from './errors.mjs';
import { extensionOf } from './extract.mjs';
import { JobRunner } from './jobs.mjs';
import { LIMITS } from './outline.mjs';
import { Publisher } from './publish.mjs';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
};

// The upload page loads only its own script, stylesheet and fonts.
const UPLOAD_CSP = "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
const UPLOAD_FILES = { upload: 'upload.html', 'upload.css': 'upload.css', 'upload.js': 'upload.js' };

function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function sendError(res, error) {
  sendJson(res, error.status, { error: { code: error.code, message: error.message } });
}

async function sendFile(req, res, file, headers = {}) {
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;
  const etag = `W/"${stat.size.toString(16)}-${Math.round(stat.mtimeMs).toString(16)}"`;
  const base = {
    'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    ETag: etag,
    ...headers,
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, base);
    res.end();
    return true;
  }
  res.writeHead(200, { ...base, 'Content-Length': stat.size });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  return true;
}

/** Resolve `relative` inside `root`, or null if it would escape it. */
function resolveInside(root, relative) {
  const file = path.resolve(root, relative);
  return file === root || file.startsWith(root + path.sep) ? file : null;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const tooLarge = () =>
      new UserError(`File terlalu besar. Maksimal ${Math.floor(limit / 1024 / 1024)} MB.`, {
        status: 413,
        code: 'too_large',
      });
    if (Number(req.headers['content-length']) > limit) return reject(tooLarge());
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.removeAllListeners('data');
        req.resume();
        reject(tooLarge());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function tokensMatch(given, expected) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * @param {ReturnType<import('./config.mjs').loadConfig>} config
 */
export function createApp(config, log = console) {
  const publisher = new Publisher(config, log);
  const jobs = new JobRunner(config, publisher, log);
  const webDir = path.join(config.root, 'web');
  const fontsDir = path.join(config.root, 'assets', 'fonts');
  /** @type {Map<string, number[]>} upload times per client */
  const recentUploads = new Map();

  function clientKey(req) {
    const forwarded = config.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() : '';
    return forwarded || req.socket.remoteAddress || 'unknown';
  }

  function checkRateLimit(req) {
    const key = clientKey(req);
    const since = Date.now() - 60 * 60 * 1000;
    const times = (recentUploads.get(key) ?? []).filter((t) => t > since);
    if (times.length >= config.rateLimitPerHour) {
      throw new UserError('Terlalu banyak unggahan dalam satu jam terakhir. Coba lagi nanti.', {
        status: 429,
        code: 'rate_limited',
      });
    }
    times.push(Date.now());
    recentUploads.set(key, times);
    if (recentUploads.size > 5000) {
      for (const [k, v] of recentUploads) if (v.every((t) => t <= since)) recentUploads.delete(k);
    }
  }

  function publicConfig() {
    return {
      maxUploadBytes: config.maxUploadBytes,
      formats: FORMATS,
      themes: THEMES,
      pageOptions: PAGE_OPTIONS,
      minPages: MIN_PAGES,
      maxPages: MAX_PAGES,
      maxTitleLength: LIMITS.deckTitle,
      ai: config.ai.enabled,
      authRequired: Boolean(config.uploadToken),
      homeUrl: config.appUrl,
    };
  }

  async function createDeck(req, res, url) {
    if (config.uploadToken) {
      const given = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '')?.[1] ?? '';
      if (!tokensMatch(given, config.uploadToken)) {
        throw new UserError('Kode akses salah atau belum diisi.', { status: 401, code: 'unauthorized' });
      }
    }

    // Requiring a custom header keeps other sites from posting here: a
    // cross-origin request with it needs a CORS preflight, which is never granted.
    const rawName = req.headers['x-filename'];
    if (typeof rawName !== 'string' || !rawName) {
      throw new UserError('Nama file tidak dikirim.', { code: 'missing_filename' });
    }
    let filename;
    try {
      filename = path.basename(decodeURIComponent(rawName).replace(/\\/g, '/')).slice(-200);
    } catch {
      throw new UserError('Nama file tidak valid.', { code: 'bad_filename' });
    }
    if (!FORMATS.some((f) => f.ext === extensionOf(filename))) {
      throw new UserError(
        `Format file tidak didukung. Gunakan ${FORMATS.map((f) => f.label).join(', ')}.`,
        { status: 415, code: 'unsupported_format' },
      );
    }

    const themeId = url.searchParams.get('theme') ?? THEMES[0].id;
    if (!THEMES.some((t) => t.id === themeId)) throw new UserError('Tema tidak dikenal.', { code: 'bad_theme' });

    const pagesParam = url.searchParams.get('pages') ?? 'auto';
    let pages = null;
    if (pagesParam !== 'auto') {
      pages = Number(pagesParam);
      if (!Number.isInteger(pages) || pages < MIN_PAGES || pages > MAX_PAGES) {
        throw new UserError(`Jumlah halaman harus antara ${MIN_PAGES} dan ${MAX_PAGES}.`, { code: 'bad_pages' });
      }
    }

    const title = (url.searchParams.get('title') ?? '').replace(/\s+/g, ' ').trim();
    if (title.length > LIMITS.deckTitle) {
      throw new UserError(`Judul maksimal ${LIMITS.deckTitle} karakter.`, { code: 'bad_title' });
    }

    if (jobs.full) {
      throw new UserError('Server sedang sibuk menyusun deck lain. Coba lagi sebentar lagi.', {
        status: 503,
        code: 'busy',
      });
    }
    checkRateLimit(req);

    const buffer = await readBody(req, config.maxUploadBytes);
    if (buffer.length === 0) throw new UserError('File kosong.', { code: 'empty_file' });

    const jobId = jobs.submit({ buffer, filename, themeId, pages, title });
    sendJson(res, 202, { jobId });
  }

  async function serveSite(req, res, relative) {
    let decoded;
    try {
      decoded = decodeURIComponent(relative);
    } catch {
      return false;
    }
    for (const root of publisher.roots) {
      const file = decoded ? resolveInside(root, decoded) : null;
      if (!file || file === root) continue;
      // Hashed build output never changes; everything else is revalidated.
      const cache = decoded.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
      if (await sendFile(req, res, file, { 'Cache-Control': cache })) return true;
    }
    // Client-side routes (/s/<deck>) fall back to the app shell; a missing
    // file with an extension is a real 404.
    if (path.extname(decoded) || publisher.roots.length === 0) return false;
    return sendFile(req, res, path.join(publisher.roots[0], 'index.html'), { 'Cache-Control': 'no-cache' });
  }

  async function handle(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');

    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end('ok\n');
    }

    // Accept requests with the base prefix (proxy preserves it) or without
    // (proxy strips it).
    const { base } = config;
    let relative = url.pathname.slice(1);
    if (base !== '/' && `${url.pathname}/`.startsWith(base)) relative = url.pathname.slice(base.length);
    const isRead = req.method === 'GET' || req.method === 'HEAD';

    if (relative === 'api/decks') {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Gunakan POST.' } }, { Allow: 'POST' });
      return createDeck(req, res, url);
    }
    if (!isRead) {
      return sendJson(res, 405, { error: { code: 'method_not_allowed', message: 'Metode tidak didukung.' } }, { Allow: 'GET, HEAD' });
    }
    if (relative === 'api/config') return sendJson(res, 200, publicConfig());
    if (relative.startsWith('api/jobs/')) {
      const job = jobs.get(relative.slice('api/jobs/'.length));
      if (!job) throw new UserError('Pekerjaan tidak ditemukan. Unggah ulang dokumennya.', { status: 404, code: 'not_found' });
      return sendJson(res, 200, job);
    }
    if (relative.startsWith('api/')) throw new UserError('Alamat API tidak dikenal.', { status: 404, code: 'not_found' });

    if (relative === 'upload/') {
      res.writeHead(308, { Location: `${base}upload` });
      return res.end();
    }
    if (Object.hasOwn(UPLOAD_FILES, relative)) {
      const sent = await sendFile(req, res, path.join(webDir, UPLOAD_FILES[relative]), {
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': UPLOAD_CSP,
      });
      if (sent) return;
    }
    if (relative.startsWith('fonts/')) {
      const file = resolveInside(fontsDir, relative.slice('fonts/'.length));
      if (file && (await sendFile(req, res, file, { 'Cache-Control': 'public, max-age=604800' }))) return;
    }

    if (config.mode === 'dev') {
      // Decks are served by `open-slide dev`; this server only adds the upload flow.
      if (relative === '') {
        res.writeHead(302, { Location: `${base}upload` });
        return res.end();
      }
    } else if (await serveSite(req, res, relative)) {
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Tidak ditemukan\n');
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (res.headersSent) return res.destroy();
      if (error instanceof UserError) return sendError(res, error);
      log.error('[http] unhandled error:', error);
      sendJson(res, 500, { error: { code: 'internal', message: 'Terjadi kesalahan di server.' } });
    });
  });
  // Uploads on slow connections take a while; the body size is capped instead.
  server.requestTimeout = 5 * 60 * 1000;

  return {
    server,
    jobs,
    publisher,
    /** Build the site once so there is something to serve (production only). */
    async prepare() {
      if (config.mode !== 'dev') await publisher.publish();
    },
  };
}
