import { randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { aiOutline, describeAiError } from './ai.mjs';
import { removeDeck, writeDeck } from './deck.mjs';
import { UserError } from './errors.mjs';
import { extractDocument } from './extract.mjs';
import { heuristicOutline } from './outline.mjs';

const JOB_TTL_MS = 60 * 60 * 1000;

/**
 * Runs upload → deck jobs one at a time and remembers their state so the
 * upload page can poll it. State lives in memory: a restart forgets running
 * jobs, but never a finished deck (those are files under `slides/`).
 */
export class JobRunner {
  constructor(config, publisher, log = console) {
    this.config = config;
    this.publisher = publisher;
    this.log = log;
    /** @type {Map<string, object>} */
    this.jobs = new Map();
    this.pending = 0;
    this.queue = Promise.resolve();
    this.sweeper = setInterval(() => this.#sweep(), 5 * 60 * 1000);
    this.sweeper.unref();
  }

  get full() {
    return this.pending >= this.config.maxQueuedJobs;
  }

  /** @returns {object | undefined} the public view of a job */
  get(id) {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const { id: jobId, status, stage, deckId, deckUrl, pages, usedAi, warnings, error } = job;
    return { id: jobId, status, stage, deckId, deckUrl, pages, usedAi, warnings, error };
  }

  /** Queue a job; returns its id straight away. */
  submit({ buffer, filename, themeId, pages, title }) {
    const job = {
      id: randomBytes(16).toString('hex'),
      status: 'queued',
      stage: 'queued',
      deckId: null,
      deckUrl: null,
      pages: null,
      usedAi: false,
      warnings: [],
      error: null,
      createdAt: Date.now(),
    };
    this.jobs.set(job.id, job);
    this.pending += 1;
    this.queue = this.queue
      .then(() => this.#run(job, { buffer, filename, themeId, pages, title }))
      .finally(() => {
        this.pending -= 1;
      });
    return job.id;
  }

  async #run(job, { buffer, filename, themeId, pages, title }) {
    const { config } = this;
    job.status = 'running';
    try {
      job.stage = 'extracting';
      const doc = await extractDocument(buffer, filename);

      job.stage = 'outlining';
      let outline;
      if (config.ai.enabled) {
        try {
          const result = await aiOutline(doc, { pages, title, filename, config });
          outline = result.outline;
          job.usedAi = true;
          if (result.truncated) {
            job.warnings.push(
              `Dokumen sangat panjang; hanya ${config.ai.maxInputChars.toLocaleString('id-ID')} karakter pertama yang dipakai untuk menyusun slide.`,
            );
          }
        } catch (error) {
          const reason = describeAiError(error);
          this.log.warn(`[job ${job.id}] AI outline failed (${reason}): ${error?.message}`);
          job.warnings.push(`Penyusunan dengan AI gagal (${reason}), jadi draf disusun dengan aturan otomatis.`);
        }
      }
      outline ??= heuristicOutline(doc, { pages, title });
      job.pages = outline.slides.length + 2;

      job.stage = 'writing';
      job.deckId = await writeDeck(config.root, outline, { themeId, source: filename });

      job.stage = 'building';
      if (config.mode === 'dev') {
        // `open-slide dev` picks the new folder up through its file watcher.
        await sleep(900);
      } else {
        try {
          await this.publisher.publish();
        } catch (error) {
          // Leave the site as it was rather than keep a deck that breaks the build.
          await removeDeck(config.root, job.deckId);
          job.deckId = null;
          throw error;
        }
      }

      job.deckUrl = `${config.appUrl}s/${job.deckId}`;
      job.stage = 'done';
      job.status = 'done';
      this.log.info(`[job ${job.id}] ${filename} → slides/${job.deckId} (${job.pages} pages, ai=${job.usedAi})`);
    } catch (error) {
      job.status = 'error';
      if (error instanceof UserError) {
        job.error = { code: error.code, message: error.message };
      } else {
        this.log.error(`[job ${job.id}] failed at ${job.stage}:`, error);
        job.error = {
          code: 'internal',
          message: 'Terjadi kesalahan di server saat menyusun slide. Coba lagi sebentar lagi.',
        };
      }
    }
  }

  #sweep() {
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs) {
      if (job.createdAt < cutoff && job.status !== 'running' && job.status !== 'queued') this.jobs.delete(id);
    }
  }
}
