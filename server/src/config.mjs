import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Workspace root: the folder that holds `slides/`, `themes/` and `assets/`. */
export const ROOT = path.resolve(process.env.SLIDOO_ROOT || path.join(here, '..', '..'));

function normalizeBase(value) {
  let base = (value || '/').trim();
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(env = process.env) {
  const mode = env.SLIDOO_MODE === 'dev' ? 'dev' : 'prod';
  const base = normalizeBase(env.OPEN_SLIDE_BASE);
  const aiSetting = (env.SLIDOO_AI || 'auto').toLowerCase();
  const hasCredentials = Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);
  return {
    mode,
    root: ROOT,
    host: env.HOST || '127.0.0.1',
    port: positiveNumber(env.PORT, 8080),
    // Must match the prefix the site is served under; also passed to the build.
    base,
    // In dev the decks are served by `open-slide dev`, on its own origin.
    appUrl: mode === 'dev' ? (env.SLIDOO_APP_URL || 'http://localhost:5173/').trim().replace(/\/*$/, '/') : base,
    maxUploadBytes: Math.round(positiveNumber(env.SLIDOO_MAX_UPLOAD_MB, 20) * 1024 * 1024),
    // Optional shared secret. When set, uploads need `Authorization: Bearer <token>`.
    uploadToken: env.SLIDOO_UPLOAD_TOKEN || '',
    rateLimitPerHour: positiveNumber(env.SLIDOO_RATE_LIMIT_PER_HOUR, 20),
    maxQueuedJobs: positiveNumber(env.SLIDOO_MAX_QUEUE, 8),
    trustProxy: env.SLIDOO_TRUST_PROXY === '1',
    ai: {
      enabled: aiSetting === 'on' || (aiSetting !== 'off' && hasCredentials),
      model: env.SLIDOO_MODEL || 'claude-opus-5-5',
      // Longer documents are still accepted; the job reports that only this
      // much text was sent to the model.
      maxInputChars: positiveNumber(env.SLIDOO_AI_MAX_CHARS, 400_000),
    },
  };
}

export const THEMES = [
  { id: 'ugm-official', label: 'Official', mode: 'light' },
  { id: 'ugm-midnight', label: 'Midnight', mode: 'dark' },
  { id: 'ugm-heritage', label: 'Heritage', mode: 'dark' },
];

export const PAGE_OPTIONS = [5, 8, 12, 15];
export const MIN_PAGES = 4;
export const MAX_PAGES = 20;

export const FORMATS = [
  { ext: 'pdf', label: 'PDF' },
  { ext: 'docx', label: 'DOCX' },
  { ext: 'txt', label: 'TXT' },
  { ext: 'md', label: 'MD' },
];
