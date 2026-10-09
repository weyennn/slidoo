import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const KEPT_BUILDS = 3;

const UPLOAD_LINK = (base) => `
<a id="slidoo-upload-link" href="${base}upload" hidden>+ Unggah dokumen</a>
<style>
  #slidoo-upload-link {
    position: fixed; right: 24px; bottom: 24px; z-index: 50;
    padding: 12px 20px; border-radius: 999px;
    background: #01416b; color: #fff; text-decoration: none;
    font: 700 14px/1 'Gama Sans', Arial, sans-serif;
    box-shadow: 0 8px 24px rgba(1, 65, 107, 0.28);
  }
  #slidoo-upload-link:hover { background: #0e2841; }
  #slidoo-upload-link:focus-visible { outline: 3px solid #fdd402; outline-offset: 3px; }
</style>
<script>
  (() => {
    // Shown on the deck list only, never over a slide or in presenter view.
    const link = document.getElementById('slidoo-upload-link');
    const home = ${JSON.stringify(base)};
    const sync = () => { link.hidden = location.pathname.replace(/\\/?$/, '/') !== home; };
    for (const method of ['pushState', 'replaceState']) {
      const original = history[method];
      history[method] = function (...args) { const result = original.apply(this, args); sync(); return result; };
    }
    addEventListener('popstate', sync);
    sync();
  })();
</script>
`;

/**
 * Builds the static site and keeps track of which build is live. Builds go to
 * `.slidoo/builds/<n>`; the previous one is kept so pages already open in a
 * browser can still load their hashed assets.
 */
export class Publisher {
  constructor(config, log = console) {
    this.config = config;
    this.log = log;
    this.buildsDir = path.join(config.root, '.slidoo', 'builds');
    /** @type {string[]} newest first */
    this.builds = [];
    this.queue = Promise.resolve();
  }

  /** Directories to look a static file up in, newest build first. */
  get roots() {
    return this.builds;
  }

  /** Rebuild the site. Calls are serialised; each resolves when its build is live. */
  publish() {
    const run = this.queue.then(() => this.#build());
    this.queue = run.catch(() => {});
    return run;
  }

  async #build() {
    await fs.mkdir(this.buildsDir, { recursive: true });
    const outDir = path.join(this.buildsDir, String(Date.now()));
    const started = Date.now();
    try {
      await this.#run(outDir);
      await this.#brand(outDir);
    } catch (error) {
      await fs.rm(outDir, { recursive: true, force: true });
      throw error;
    }
    this.builds.unshift(outDir);
    this.log.info(`[build] live in ${Date.now() - started} ms → ${path.relative(this.config.root, outDir)}`);
    await this.#prune();
  }

  #run(outDir) {
    const bin = path.join(this.config.root, 'node_modules', '@open-slide', 'core', 'bin.js');
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [bin, 'build', '--out-dir', outDir], {
        cwd: this.config.root,
        env: { ...process.env, OPEN_SLIDE_BASE: this.config.base, NO_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      const collect = (chunk) => {
        output = (output + chunk).slice(-4000);
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`open-slide build exited with code ${code}\n${output}`));
      });
    });
  }

  async #brand(outDir) {
    const file = path.join(outDir, 'index.html');
    let html = await fs.readFile(file, 'utf8');
    html = html.replace('<title>open-slide</title>', '<title>Slidoo</title>');
    html = html.replace('</body>', `${UPLOAD_LINK(this.config.base)}</body>`);
    await fs.writeFile(file, html, 'utf8');
  }

  /** Delete builds from earlier runs and all but the newest few of this one. */
  async #prune() {
    const live = new Set(this.builds.slice(0, KEPT_BUILDS));
    this.builds = this.builds.filter((dir) => live.has(dir));
    for (const entry of await fs.readdir(this.buildsDir, { withFileTypes: true })) {
      const dir = path.join(this.buildsDir, entry.name);
      if (entry.isDirectory() && /^\d+$/.test(entry.name) && !live.has(dir)) {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
  }
}
