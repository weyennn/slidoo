import { MAX_PAGES, MIN_PAGES } from './config.mjs';
import { UserError } from './errors.mjs';

/**
 * The deck is described as data first and rendered to TSX second. A deck is
 * a cover, the `slides` below, and a closing page.
 *
 * @typedef {'agenda' | 'section' | 'bullets' | 'cards' | 'statement'} Layout
 * @typedef {{ heading: string, body: string }} Card
 * @typedef {{ layout: Layout, eyebrow: string, title: string, bullets: string[],
 *   cards: Card[], body: string, notes: string }} Slide
 * @typedef {{ title: string, subtitle: string, slides: Slide[] }} Outline
 */

// Character budgets that keep every layout inside the 1920×1080 canvas at the
// type sizes used in deck.mjs. Raise them only together with those sizes.
export const LIMITS = {
  deckTitle: 110,
  subtitle: 160,
  eyebrow: 40,
  title: 80,
  bullets: 5,
  bullet: 120,
  agendaItems: 8,
  agendaItem: 60,
  cards: 3,
  cardHeading: 44,
  cardBody: 170,
  body: 330,
  notes: 1200,
};

const SKIPPED_SECTION_RE =
  /^(?:daftar\s+(?:isi|pustaka|gambar|tabel|lampiran|rujukan|singkatan)|references?|bibliography|table\s+of\s+contents|contents|lampiran|appendi(?:x|ces)|kata\s+pengantar|acknowledge?ments?|ucapan\s+terima\s+kasih|(?:lembar|halaman)\s+(?:pengesahan|persetujuan|pernyataan))\b/i;
const SMALL_WORDS = new Set(
  'dan di ke dari yang untuk pada dengan atau dalam oleh serta the of and in to for on a an at by'.split(' '),
);

const clean = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');

/** Shorten to `max` characters on a word boundary. */
export function clip(value, max) {
  const text = clean(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—-]+$/, '')}…`;
}

function titleCase(text) {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (!letters || letters !== letters.toUpperCase()) return text;
  return text
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      // Short all-caps words are usually acronyms (UGM, NMF, SDG).
      if (word.length <= 3 && !SMALL_WORDS.has(lower)) return word;
      return lower.replace(/^(\P{L}*)(\p{L})/u, (_, lead, first) => lead + first.toUpperCase());
    })
    .join(' ');
}

/** "BAB II: TINJAUAN PUSTAKA" → { label: "Bab II", title: "Tinjauan Pustaka" } */
function splitHeading(text) {
  const chapter = text.match(/^((?:BAB|CHAPTER|BAGIAN|PART)\s+(?:[IVXLC]+|\d+))[\s.:—-]*(.*)$/i);
  if (chapter) {
    const [kind, number] = chapter[1].split(/\s+/);
    const label = `${kind[0].toUpperCase()}${kind.slice(1).toLowerCase()} ${number.toUpperCase()}`;
    return { label, title: titleCase(chapter[2] || label) };
  }
  const numbered = text.match(/^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(.+)$/);
  if (numbered) return { label: '', title: titleCase(numbered[2]) };
  return { label: '', title: titleCase(text) };
}

export function splitSentences(text) {
  return text
    .split(/(?<=[.!?])["”')\]]*\s+(?=["“(\[]?[\p{Lu}\d])/u)
    .map(clean)
    .filter(Boolean);
}

/** A sentence worth showing as a bullet (not a citation fragment or a stub). */
function usable(sentence) {
  return sentence.length >= 25 && /\p{L}{3,}.*\s.*\p{L}{3,}/u.test(sentence);
}

function toBullet(sentence) {
  return clip(sentence.replace(/[.;]$/, ''), LIMITS.bullet);
}

function emptySlide(layout) {
  return { layout, eyebrow: '', title: '', bullets: [], cards: [], body: '', notes: '' };
}

/**
 * @param {import('./extract.mjs').Block[]} blocks
 * @returns {{ label: string, title: string, items: import('./extract.mjs').Block[], length: number }[]}
 */
function toSections(blocks) {
  const counts = new Map();
  for (const b of blocks) if (b.kind === 'heading') counts.set(b.level, (counts.get(b.level) ?? 0) + 1);
  const levels = [...counts.keys()].sort((a, b) => a - b);
  // The shallowest heading level that actually divides the document.
  const sectionLevel = levels.find((level) => counts.get(level) >= 2) ?? levels[0];

  const sections = [];
  let current = null;
  const open = (label, title) => {
    current = { label, title, items: [], length: 0 };
    sections.push(current);
  };
  for (const block of blocks) {
    if (block.kind === 'heading' && sectionLevel !== undefined && block.level <= sectionLevel) {
      const { label, title } = splitHeading(block.text);
      open(label, title);
      continue;
    }
    if (!current) open('', '');
    current.items.push(block);
    current.length += block.text.length;
  }

  let kept = sections.filter((s) => s.length > 0 && !SKIPPED_SECTION_RE.test(s.title));
  if (kept.length === 0) kept = sections.filter((s) => s.length > 0);

  // No usable headings: cut the text into even parts named after their opening words.
  if (kept.length <= 1 && sectionLevel === undefined) {
    const items = kept[0]?.items ?? [];
    const total = items.reduce((sum, b) => sum + b.text.length, 0);
    const parts = Math.max(1, Math.min(6, Math.round(total / 900)));
    const target = total / parts;
    kept = [];
    let bucket = { label: '', title: '', items: [], length: 0 };
    for (const block of items) {
      bucket.items.push(block);
      bucket.length += block.text.length;
      if (bucket.length >= target && kept.length < parts - 1) {
        kept.push(bucket);
        bucket = { label: '', title: '', items: [], length: 0 };
      }
    }
    if (bucket.items.length) kept.push(bucket);
  }

  for (const section of kept) {
    if (section.title) continue;
    const first = splitSentences(section.items[0]?.text ?? '')[0] ?? '';
    section.title = clip(first.replace(/[.:;]$/, ''), 60);
  }
  return kept;
}

/** Build the slides for one section, spread over `pages` pages. */
function sectionSlides(section, index, pages) {
  const eyebrow = section.label || `Bagian ${index + 1}`;

  // Sub-headings with their own text read best as side-by-side cards.
  const groups = [];
  for (const block of section.items) {
    if (block.kind === 'heading') groups.push({ heading: splitHeading(block.text).title, text: [] });
    else if (groups.length) groups[groups.length - 1].text.push(block.text);
  }
  const cardGroups = groups.filter((g) => g.text.length > 0);
  const leading = section.items.findIndex((b) => b.kind === 'heading');
  if (pages === 1 && leading <= 0 && cardGroups.length >= 2 && cardGroups.length <= LIMITS.cards) {
    const slide = emptySlide('cards');
    slide.eyebrow = eyebrow;
    slide.title = section.title;
    slide.cards = cardGroups.map((g) => ({
      heading: clip(g.heading, LIMITS.cardHeading),
      body: clip(splitSentences(g.text.join(' '))[0] ?? g.text[0], LIMITS.cardBody),
    }));
    slide.notes = clip(section.items.map((b) => b.text).join(' '), LIMITS.notes);
    return [slide];
  }

  // Candidate points in reading order: list items as written, and the opening
  // sentence of each paragraph ahead of the sentences that elaborate on it.
  const lead = [];
  const rest = [];
  let order = 0;
  for (const block of section.items) {
    if (block.kind === 'bullet') lead.push({ text: block.text, source: block.text, order: order++ });
    else if (block.kind === 'heading') continue;
    else {
      const sentences = splitSentences(block.text).filter(usable);
      sentences.forEach((text, i) => (i === 0 ? lead : rest).push({ text, source: block.text, order: order++ }));
    }
  }
  const wanted = pages * 4;
  const picked = lead.length >= wanted ? lead : [...lead, ...rest.slice(0, wanted - lead.length)];
  // Chosen by importance, shown in the order the document makes them.
  const points = picked.sort((a, b) => a.order - b.order);
  if (points.length === 0) {
    const slide = emptySlide('statement');
    slide.eyebrow = eyebrow;
    slide.title = section.title;
    slide.body = clip(section.items.map((b) => b.text).join(' '), LIMITS.body);
    slide.notes = slide.body;
    return slide.body ? [slide] : [];
  }

  const slides = [];
  const count = Math.min(pages, Math.ceil(points.length / 2));
  const perPage = Math.min(LIMITS.bullets, Math.ceil(Math.min(points.length, count * LIMITS.bullets) / count));
  for (let page = 0; page < count; page++) {
    const chunk = points.slice(page * perPage, (page + 1) * perPage);
    if (chunk.length === 0) break;
    const slide = emptySlide(chunk.length === 1 ? 'statement' : 'bullets');
    slide.eyebrow = eyebrow;
    slide.title = page === 0 ? section.title : `${section.title} (lanjutan)`;
    if (chunk.length === 1) slide.body = clip(chunk[0].source, LIMITS.body);
    else slide.bullets = chunk.map((p) => toBullet(p.text));
    slide.notes = clip([...new Set(chunk.map((p) => p.source))].join(' '), LIMITS.notes);
    slides.push(slide);
  }
  return slides;
}

/**
 * Rule-based outline, used when no model is configured or the model call fails.
 * @param {import('./extract.mjs').ExtractedDocument} doc
 * @param {{ pages: number | null, title: string }} options `pages` is the total
 *   page count including cover and closing; null lets the document decide.
 * @returns {Outline}
 */
export function heuristicOutline(doc, { pages, title }) {
  let sections = toSections(doc.blocks);
  if (sections.length === 0) throw new UserError('Dokumen ini tidak punya isi yang bisa dijadikan slide.');

  const total =
    pages ??
    Math.max(5, Math.min(15, 2 + sections.length + (sections.length >= 3 ? 1 : 0) + sections.filter((s) => s.length > 1800).length));
  let budget = total - 2;
  const withAgenda = sections.length >= 3 && budget >= 5;
  if (withAgenda) budget -= 1;

  if (sections.length > budget) {
    // Keep the weightiest sections, in document order.
    const keep = new Set([...sections].sort((a, b) => b.length - a.length).slice(0, budget));
    sections = sections.filter((s) => keep.has(s));
  }
  const share = new Map(sections.map((s) => [s, 1]));
  let spare = budget - sections.length;
  while (spare > 0) {
    // Give spare pages to whichever section is longest per page it already has.
    const next = sections
      .filter((s) => share.get(s) < 3)
      .sort((a, b) => b.length / share.get(b) - a.length / share.get(a))[0];
    if (!next || next.length / share.get(next) < 500) break;
    share.set(next, share.get(next) + 1);
    spare -= 1;
  }

  const slides = [];
  if (withAgenda) {
    const agenda = emptySlide('agenda');
    agenda.eyebrow = 'Agenda';
    agenda.title = 'Yang Akan Dibahas';
    agenda.bullets = sections.slice(0, LIMITS.agendaItems).map((s) => clip(s.title, LIMITS.agendaItem));
    slides.push(agenda);
  }
  sections.forEach((section, index) => slides.push(...sectionSlides(section, index, share.get(section))));

  const firstParagraph = doc.blocks.find((b) => b.kind === 'para');
  const subtitle = firstParagraph ? (splitSentences(firstParagraph.text)[0] ?? '') : '';
  return normalizeOutline(
    { title: title || doc.title, subtitle: subtitle.length <= LIMITS.subtitle ? subtitle : '', slides },
    { pages: total, fallbackTitle: 'Presentasi' },
  );
}

/**
 * Make any outline (model output included) safe to render: known layouts only,
 * every string within its budget, and no more slides than requested.
 * @returns {Outline}
 */
export function normalizeOutline(raw, { pages, fallbackTitle }) {
  const maxSlides = Math.max(MIN_PAGES, Math.min(MAX_PAGES, pages ?? MAX_PAGES)) - 2;
  const slides = [];

  for (const input of Array.isArray(raw?.slides) ? raw.slides : []) {
    if (slides.length >= maxSlides) break;
    const title = clip(input?.title, LIMITS.title);
    if (!title) continue;
    const bullets = (Array.isArray(input.bullets) ? input.bullets : []).map(clean).filter(Boolean);
    const cards = (Array.isArray(input.cards) ? input.cards : [])
      .map((c) => ({ heading: clip(c?.heading, LIMITS.cardHeading), body: clip(c?.body, LIMITS.cardBody) }))
      .filter((c) => c.heading && c.body)
      .slice(0, LIMITS.cards);
    const body = clip(input.body, LIMITS.body);

    let layout = input.layout;
    if (layout === 'agenda' && (slides.some((s) => s.layout === 'agenda') || bullets.length < 2)) layout = 'bullets';
    if (layout === 'cards' && cards.length < 2) layout = 'bullets';
    if (layout === 'bullets' && bullets.length < 2) layout = body || bullets.length ? 'statement' : 'section';
    if (layout === 'statement' && !body && bullets.length === 0) layout = 'section';
    if (!['agenda', 'section', 'bullets', 'cards', 'statement'].includes(layout)) {
      layout = bullets.length >= 2 ? 'bullets' : body ? 'statement' : 'section';
    }

    const slide = emptySlide(layout);
    slide.eyebrow = clip(input.eyebrow, LIMITS.eyebrow);
    slide.title = title;
    slide.notes = clip(input.notes, LIMITS.notes);
    if (layout === 'agenda') slide.bullets = bullets.slice(0, LIMITS.agendaItems).map((b) => clip(b, LIMITS.agendaItem));
    else if (layout === 'bullets') slide.bullets = bullets.slice(0, LIMITS.bullets).map((b) => clip(b, LIMITS.bullet));
    else if (layout === 'cards') slide.cards = cards;
    else if (layout === 'statement') slide.body = body || clip(bullets[0], LIMITS.body);
    else slide.body = clip(body, LIMITS.subtitle);
    slides.push(slide);
  }

  if (slides.length === 0) throw new UserError('Dokumen ini tidak punya isi yang bisa dijadikan slide.');
  return {
    title: clip(raw?.title, LIMITS.deckTitle) || fallbackTitle,
    subtitle: clip(raw?.subtitle, LIMITS.subtitle),
    slides,
  };
}
