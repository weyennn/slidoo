import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.mjs';
import { ROOT, loadConfig } from '../src/config.mjs';

// Runs the server in dev mode (no site build) against a scratch workspace
// that has the real themes and upload page but its own empty `slides/`.
const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const quiet = { info() {}, warn() {}, error() {} };
let workspace;
const servers = [];

async function start(env = {}) {
  const config = {
    ...loadConfig({ SLIDOO_MODE: 'dev', OPEN_SLIDE_BASE: '/slidoo/', SLIDOO_AI: 'off', ...env }),
    root: workspace,
  };
  const app = createApp(config, quiet);
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  servers.push(app.server);
  return `http://127.0.0.1:${app.server.address().port}/slidoo/`;
}

function post(base, name, body, { query = '', headers = {} } = {}) {
  return fetch(`${base}api/decks${query}`, {
    method: 'POST',
    body,
    headers: { 'X-Filename': encodeURIComponent(name), 'Content-Type': 'application/octet-stream', ...headers },
  });
}

async function finished(base, jobId) {
  for (let i = 0; i < 100; i++) {
    const job = await (await fetch(`${base}api/jobs/${jobId}`)).json();
    if (job.status === 'done' || job.status === 'error') return job;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('job did not finish');
}

before(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'slidoo-test-'));
  await fs.mkdir(path.join(workspace, 'slides'));
  for (const dir of ['themes', 'web', path.join('assets', 'fonts')]) {
    await fs.cp(path.join(ROOT, dir), path.join(workspace, dir), { recursive: true });
  }
});

after(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await fs.rm(workspace, { recursive: true, force: true });
});

test('serves the upload page, its assets and the public config', async () => {
  const base = await start();
  const page = await fetch(`${base}upload`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await page.text(), /<title>Unggah dokumen — Slidoo<\/title>/);
  assert.equal((await fetch(`${base}upload.js`)).headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal((await fetch(`${base}fonts/Gama-Sans-Bold.otf`)).status, 200);

  const config = await (await fetch(`${base}api/config`)).json();
  assert.equal(config.ai, false);
  assert.equal(config.authRequired, false);
  assert.deepEqual(config.themes.map((t) => t.id), ['ugm-official', 'ugm-midnight', 'ugm-heritage']);
});

test('does not serve files outside its folders', async () => {
  const base = await start();
  for (const probe of ['fonts/..%2f..%2fthemes/ugm-official.md', 'fonts/%2e%2e/%2e%2e/web/upload.js', 'themes/ugm-official.md']) {
    assert.equal((await fetch(`${base}${probe}`)).status, 404, probe);
  }
});

test('turns an uploaded document into a deck on each theme', async () => {
  const base = await start();
  const body = await fs.readFile(path.join(fixtures, 'proposal.docx'));
  for (const theme of ['ugm-official', 'ugm-midnight', 'ugm-heritage']) {
    const response = await post(base, 'Proposal Tesis.docx', body, { query: `?theme=${theme}&pages=8&title=${encodeURIComponent('Judul Uji')}` });
    assert.equal(response.status, 202);
    const job = await finished(base, (await response.json()).jobId);
    assert.equal(job.status, 'done', JSON.stringify(job.error));
    assert.equal(job.pages, 8);
    assert.match(job.deckId, /^judul-uji-[0-9a-f]{6}$/);
    assert.equal(job.deckUrl, `http://localhost:5173/s/${job.deckId}`);
    const source = await fs.readFile(path.join(workspace, 'slides', job.deckId, 'index.tsx'), 'utf8');
    assert.match(source, new RegExp(`theme: '${theme}'`));
    assert.match(source, /title: "Judul Uji"/);
  }
});

test('reports unreadable documents through the job, not as a crash', async () => {
  const base = await start();
  const response = await post(base, 'rusak.pdf', Buffer.from('bukan pdf'));
  const job = await finished(base, (await response.json()).jobId);
  assert.equal(job.status, 'error');
  assert.match(job.error.message, /bukan PDF yang valid/);
});

test('rejects bad requests before reading the upload', async () => {
  const base = await start({ SLIDOO_MAX_UPLOAD_MB: '0.001' });
  const cases = [
    [await post(base, 'a.exe', 'x'), 415, 'unsupported_format'],
    [await post(base, 'a.md', 'x', { query: '?theme=lain' }), 400, 'bad_theme'],
    [await post(base, 'a.md', 'x', { query: '?pages=99' }), 400, 'bad_pages'],
    [await post(base, 'a.md', 'x'.repeat(5000)), 413, 'too_large'],
    [await fetch(`${base}api/decks`, { method: 'POST', body: 'x' }), 400, 'missing_filename'],
    [await fetch(`${base}api/jobs/tidak-ada`), 404, 'not_found'],
  ];
  for (const [response, status, code] of cases) {
    assert.equal(response.status, status, code);
    assert.equal((await response.json()).error.code, code);
  }
});

test('requires the access code when one is configured', async () => {
  const base = await start({ SLIDOO_UPLOAD_TOKEN: 'rahasia' });
  assert.equal((await (await fetch(`${base}api/config`)).json()).authRequired, true);
  assert.equal((await post(base, 'a.md', '# Judul\n\nIsi dokumen yang cukup panjang untuk dibaca.')).status, 401);
  const wrong = await post(base, 'a.md', 'x', { headers: { Authorization: 'Bearer salah' } });
  assert.equal(wrong.status, 401);
  const right = await post(base, 'a.md', '# Judul\n\nIsi dokumen yang cukup panjang untuk dibaca oleh server.', {
    headers: { Authorization: 'Bearer rahasia' },
  });
  assert.equal(right.status, 202);
});

test('limits uploads per client per hour', async () => {
  const base = await start({ SLIDOO_RATE_LIMIT_PER_HOUR: '2' });
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await post(base, 'a.md', '# Judul\n\nIsi dokumen yang cukup panjang untuk dibaca.')).status);
  assert.deepEqual(statuses, [202, 202, 429]);
});
