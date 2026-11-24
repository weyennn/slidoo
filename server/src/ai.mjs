import { blocksToText } from './extract.mjs';
import { LIMITS, normalizeOutline } from './outline.mjs';

const OUTLINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'subtitle', 'slides'],
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['layout', 'eyebrow', 'title', 'bullets', 'cards', 'body', 'notes'],
        properties: {
          layout: { type: 'string', enum: ['agenda', 'section', 'bullets', 'cards', 'statement'] },
          eyebrow: { type: 'string' },
          title: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
          cards: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['heading', 'body'],
              properties: { heading: { type: 'string' }, body: { type: 'string' } },
            },
          },
          body: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You turn a document into the outline of a presentation deck. The deck is rendered by a program into fixed 1920×1080 slides using an official Universitas Gadjah Mada theme, and a presenter will then edit it, so the outline has to be faithful to the document and fit the slide layouts.

The program adds a cover (from "title" and "subtitle") and a closing page by itself. You write only the slides in between.

Each slide uses one layout, and only the fields that layout reads are shown; leave the others as an empty string or empty array:
- "agenda": title plus "bullets" listing the parts of the talk (at most ${LIMITS.agendaItems}, each under ${LIMITS.agendaItem} characters). Use it at most once, as the first slide, and only when the deck has at least five slides.
- "section": a divider that opens a major part. Reads title and "body" (one optional line under ${LIMITS.subtitle} characters).
- "bullets": title plus 3 to ${LIMITS.bullets} "bullets", each one idea under ${LIMITS.bullet} characters.
- "cards": title plus 2 or 3 "cards" for parallel items such as options, phases or findings. Each card has a "heading" under ${LIMITS.cardHeading} characters and a "body" under ${LIMITS.cardBody} characters.
- "statement": title plus a "body" paragraph under ${LIMITS.body} characters, for a definition, a research question, or one key result.

Every slide also has an "eyebrow" (a short label under ${LIMITS.eyebrow} characters naming the part it belongs to, such as "Metodologi") and a "title" under ${LIMITS.title} characters. Text beyond these limits is cut off by the program, so stay inside them.

"notes" are speaker notes: two to four sentences the presenter can say aloud for that slide, including the specifics (figures, names, citations) that are too detailed for the slide itself.

Write in the language of the document. Take every claim, number and name from the document; when it does not say something, leave it out. Skip front matter and back matter such as approval pages, tables of contents, acknowledgements and reference lists. Vary the layouts where the content supports it, since a deck of nothing but bullet lists is tiring to watch.

Reply with the JSON outline only. No prose, no code fences.`;

function userPrompt({ text, filename, pages, title, truncated }) {
  const count =
    pages === null
      ? 'Choose the number of slides the content needs, between 3 and 13.'
      : `Write exactly ${pages - 2} slides.`;
  const titleLine = title
    ? `Use this deck title exactly: ${title}`
    : 'Take the deck title from the document; "subtitle" is one line of context such as the author, programme or occasion, or an empty string if the document gives none.';
  const note = truncated
    ? '\n\nThe document was longer than what is shown; only its first part is included. Outline what is here.'
    : '';
  return `<document filename=${JSON.stringify(filename)}>\n${text}\n</document>\n\n${count} ${titleLine}${note}`;
}

/** Strip a ```json fence if the model wrapped its answer in one. */
function stripFence(text) {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text;
}

/**
 * Ask the configured OpenAI-compatible router (e.g. 9router) for the outline.
 * Throws on any failure; the caller falls back to the rule-based outline.
 * @returns {Promise<{ outline: import('./outline.mjs').Outline, truncated: boolean }>}
 */
export async function aiOutline(doc, { pages, title, filename, config, signal }) {
  const full = blocksToText(doc.blocks);
  const truncated = full.length > config.ai.maxInputChars;
  const text = truncated ? full.slice(0, config.ai.maxInputChars) : full;

  const url = `${config.ai.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (config.ai.apiKey) headers.Authorization = `Bearer ${config.ai.apiKey}`;

  const body = {
    model: config.ai.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt({ text, filename, pages, title: title || '', truncated }) },
    ],
    temperature: 0.3,
    max_tokens: 8192,
    stream: false,
    // Routers that don't support structured outputs ignore this field; the
    // system prompt also asks for bare JSON as a fallback.
    response_format: { type: 'json_schema', json_schema: { name: 'outline', schema: OUTLINE_SCHEMA, strict: true } },
  };

  let response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  } catch (error) {
    throw new AiError('connection', error.message);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new AiError('http', detail.slice(0, 300), response.status);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'length') throw new AiError('truncated', 'model output was cut off');
  const content = choice?.message?.content;
  if (!content || !content.trim()) throw new AiError('empty', 'model returned no text');

  const outline = normalizeOutline(JSON.parse(stripFence(content)), {
    pages,
    fallbackTitle: title || doc.title || 'Presentasi',
  });
  if (title) outline.title = title;
  return { outline, truncated };
}

class AiError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

/** A short reason for the server log and the job's warning list. */
export function describeAiError(error) {
  if (!(error instanceof AiError)) return 'layanan AI mengembalikan hasil yang tidak bisa dipakai';
  if (error.kind === 'connection') return 'layanan AI tidak bisa dihubungi';
  if (error.kind === 'truncated') return 'jawaban AI terpotong pada batas keluaran';
  if (error.status === 401 || error.status === 403) return 'kunci API tidak valid atau tidak punya akses';
  if (error.status === 404) return 'model tidak ditemukan';
  if (error.status === 429) return 'batas pemakaian API tercapai';
  if (error.status) return `layanan AI bermasalah (HTTP ${error.status})`;
  return 'layanan AI mengembalikan hasil yang tidak bisa dipakai';
}
