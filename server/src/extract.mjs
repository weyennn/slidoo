import { UserError } from './errors.mjs';
import { readZipEntries } from './zip.mjs';

/**
 * @typedef {{ kind: 'heading', level: number, text: string }
 *   | { kind: 'para', text: string }
 *   | { kind: 'bullet', text: string }} Block
 * @typedef {{ title: string, blocks: Block[] }} ExtractedDocument
 */

const BULLET_RE = /^\s*(?:[-*•‣▪◦●○–—]|\(?\d{1,2}[.)]|\(?[a-zA-Z][.)])\s+(\S.*)$/;
const NUMBERED_RE = /^\s*\(?\d{1,2}[.)]\s+\S/;
const NUMBERED_HEADING_RE = /^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s+(\p{Lu}.*)$/u;
const CHAPTER_RE = /^\s*(?:BAB|CHAPTER|BAGIAN|PART)\s+(?:[IVXLC]+|\d+)\b[\s.:—-]*(.*)$/i;
const SENTENCE_END_RE = /[.!?:;,]$/;

const clean = (text) => text.replace(/\s+/g, ' ').trim();

function isAllCaps(line) {
  const letters = line.replace(/[^\p{L}]/gu, '');
  return letters.length >= 3 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

function looksLikeTitleLine(line) {
  if (line.length > 60 || SENTENCE_END_RE.test(line)) return false;
  const words = line.split(/\s+/);
  return words.length <= 8 && /^[\p{Lu}\d]/u.test(line);
}

/**
 * Turn loosely formatted lines (a .txt file or the text layer of a PDF) into
 * blocks. `hardWrapped` marks sources where a line break is only a wrap.
 * @param {string[]} lines
 * @returns {Block[]}
 */
export function linesToBlocks(lines, { hardWrapped = false } = {}) {
  /** @type {Block[]} */
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length === 0) return;
    let text = paragraph[0];
    for (const next of paragraph.slice(1)) text += /[-‐]$/.test(text) ? next : ` ${next}`;
    blocks.push({ kind: 'para', text: clean(text) });
    paragraph = [];
  };

  const lengths = lines.map((l) => l.trim().length).filter((n) => n > 0).sort((a, b) => a - b);
  const typical = lengths.length ? lengths[Math.floor(lengths.length * 0.75)] : 80;
  const at = (i) => (i >= 0 && i < lines.length ? lines[i].trim() : '');

  // A PDF text layer has no blank lines around headings. There a heading is a
  // short title-like line that starts right after a finished sentence and is
  // followed by more text. Tables and lists of names look the same, so the
  // rule is dropped when too many lines match.
  const wrappedHeadings = new Set();
  if (hardWrapped) {
    for (let i = 0; i < lines.length; i++) {
      const line = at(i);
      const previous = at(i - 1);
      const afterBreak = !previous || /[.!?:]["')\]]?$/.test(previous) || wrappedHeadings.has(i - 1);
      if (line && afterBreak && at(i + 1) && line.length < typical * 0.6 && looksLikeTitleLine(line) && !BULLET_RE.test(line)) {
        wrappedHeadings.add(i);
      }
    }
    if (wrappedHeadings.size > lengths.length * 0.3) wrappedHeadings.clear();
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flush();
      continue;
    }

    const chapter = line.match(CHAPTER_RE);
    if (chapter && line.length <= 80) {
      flush();
      let text = clean(line);
      // "BAB I" on one line with its title on the next.
      if (!chapter[1]) {
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        const next = at(j);
        if (next && next.length <= 70 && !SENTENCE_END_RE.test(next)) {
          text = `${text}: ${clean(next)}`;
          i = j;
        }
      }
      blocks.push({ kind: 'heading', level: 1, text });
      continue;
    }

    const isolated = !at(i - 1) && !at(i + 1);
    const inNumberedRun = NUMBERED_RE.test(at(i - 1)) || NUMBERED_RE.test(at(i + 1));
    const numbered = line.match(NUMBERED_HEADING_RE);
    if (numbered && line.length <= 70 && !SENTENCE_END_RE.test(line) && !inNumberedRun) {
      flush();
      blocks.push({ kind: 'heading', level: numbered[1].split('.').length, text: clean(line) });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      flush();
      blocks.push({ kind: 'bullet', text: clean(bullet[1]) });
      continue;
    }

    if (line.length <= 70 && isAllCaps(line) && !SENTENCE_END_RE.test(line)) {
      flush();
      blocks.push({ kind: 'heading', level: 1, text: clean(line) });
      continue;
    }

    if (hardWrapped ? wrappedHeadings.has(i) : isolated && looksLikeTitleLine(line)) {
      flush();
      blocks.push({ kind: 'heading', level: 2, text: clean(line) });
      continue;
    }

    // Continuation of a wrapped bullet.
    const last = blocks[blocks.length - 1];
    if (paragraph.length === 0 && last?.kind === 'bullet' && at(i - 1) && /^\s{2,}/.test(lines[i])) {
      last.text = clean(`${last.text} ${line}`);
      continue;
    }

    paragraph.push(line);
    // In a hard-wrapped source a short line ending a sentence closes the paragraph.
    if (hardWrapped && /[.!?]["')\]]?$/.test(line) && line.length < typical * 0.75) flush();
  }
  flush();
  return blocks;
}

function stripInlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*)[*_](?=$|[\s).,;:!?])/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<\/?(?:a|b|br|code|em|i|img|kbd|mark|small|span|strong|sub|sup|u)\b[^>]*>/gi, '');
}

/** @returns {Block[]} */
export function markdownToBlocks(source) {
  /** @type {Block[]} */
  const blocks = [];
  let paragraph = [];
  let inFence = false;
  let inFrontMatter = false;
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'para', text: clean(stripInlineMarkdown(paragraph.join(' '))) });
    paragraph = [];
  };

  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (i === 0 && line === '---') {
      inFrontMatter = true;
      continue;
    }
    if (inFrontMatter) {
      if (line === '---' || line === '...') inFrontMatter = false;
      continue;
    }
    if (/^(```|~~~)/.test(line)) {
      flush();
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!line) {
      flush();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', level: heading[1].length, text: clean(stripInlineMarkdown(heading[2])) });
      continue;
    }
    // Setext headings: a line underlined with === or ---.
    if (paragraph.length === 1 && /^(=+|-{3,})$/.test(line)) {
      const text = clean(stripInlineMarkdown(paragraph[0]));
      paragraph = [];
      blocks.push({ kind: 'heading', level: line.startsWith('=') ? 1 : 2, text });
      continue;
    }
    if (/^([-*_])(\s*\1){2,}$/.test(line)) {
      flush();
      continue;
    }
    const item = line.match(/^(?:[-*+]|\d{1,3}[.)])\s+(?:\[[ xX]\]\s+)?(.+)$/);
    if (item) {
      flush();
      blocks.push({ kind: 'bullet', text: clean(stripInlineMarkdown(item[1])) });
      continue;
    }
    if (/^\|.*\|$/.test(line)) {
      flush();
      if (/^\|[\s:|-]+\|$/.test(line)) continue;
      const cells = line.slice(1, -1).split('|').map((c) => clean(stripInlineMarkdown(c))).filter(Boolean);
      if (cells.length) blocks.push({ kind: 'para', text: cells.join(' — ') });
      continue;
    }
    paragraph.push(line.replace(/^>\s?/, ''));
  }
  flush();
  return blocks.filter((b) => b.text);
}

const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (whole, entity) => {
    if (entity[0] !== '#') return XML_ENTITIES[entity] ?? whole;
    const code = entity[1] === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}

/** Map each paragraph style id to a heading level (0 = document title). */
function docxHeadingStyles(stylesXml) {
  const levels = new Map();
  if (!stylesXml) return levels;
  for (const match of stylesXml.matchAll(/<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)<\/w:style>/g)) {
    const [, id, body] = match;
    const name = (body.match(/<w:name\b[^>]*w:val="([^"]+)"/)?.[1] ?? '').toLowerCase();
    const outline = body.match(/<w:outlineLvl\b[^>]*w:val="(\d+)"/);
    const named = name.match(/^(?:heading|judul)\s*(\d)$/);
    if (name === 'title') levels.set(id, 0);
    else if (named) levels.set(id, Number(named[1]));
    else if (outline) levels.set(id, Number(outline[1]) + 1);
  }
  return levels;
}

function docxToDocument(buffer) {
  const entries = readZipEntries(buffer, ['word/document.xml', 'word/styles.xml', 'docProps/core.xml']);
  const documentXml = entries.get('word/document.xml')?.toString('utf8');
  if (!documentXml) throw new UserError('File ini bukan dokumen DOCX yang valid.');

  const headingLevels = docxHeadingStyles(entries.get('word/styles.xml')?.toString('utf8'));
  const coreTitle = entries.get('docProps/core.xml')?.toString('utf8').match(/<dc:title>([^<]*)<\/dc:title>/)?.[1];

  /** @type {Block[]} */
  const blocks = [];
  let title = coreTitle ? clean(decodeXml(coreTitle)) : '';

  for (const match of documentXml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)) {
    const body = match[1];
    const text = clean(
      decodeXml(
        body
          // Keep only run text: wrap it in markers, then drop everything
          // outside them. Text deleted with tracked changes is not marked.
          .replace(/<w:(?:tab|br|cr)\b[^>]*\/>/g, '\u0001 \u0002')
          .replace(/<w:delText\b[^>]*>[\s\S]*?<\/w:delText>/g, '')
          .replace(/<w:t(?:\s[^>/]*)?>([^<]*)<\/w:t>/g, '\u0001$1\u0002')
          .replace(/(^|\u0002)[^\u0001]*(\u0001|$)/g, ''),
      ),
    );
    if (!text) continue;

    const properties = body.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? '';
    const styleId = properties.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1];
    const outline = properties.match(/<w:outlineLvl\b[^>]*w:val="(\d+)"/);
    const level = outline ? Number(outline[1]) + 1 : styleId ? headingLevels.get(styleId) : undefined;

    if (level === 0) {
      if (!title) title = text;
    } else if (level !== undefined && level <= 6) {
      blocks.push({ kind: 'heading', level, text });
    } else if (/<w:numPr>/.test(properties)) {
      blocks.push({ kind: 'bullet', text });
    } else if (BULLET_RE.test(text) && text.length > 12) {
      // A list typed by hand ("1. ...", "- ...") rather than with Word's list tool.
      blocks.push({ kind: 'bullet', text: clean(text.match(BULLET_RE)[1]) });
    } else if (text.length <= 70 && isAllCaps(text) && !SENTENCE_END_RE.test(text)) {
      // Documents formatted by hand: bold caps instead of a heading style.
      blocks.push({ kind: 'heading', level: 1, text });
    } else {
      blocks.push({ kind: 'para', text });
    }
  }
  return { title, blocks };
}

async function pdfToDocument(buffer) {
  let pages;
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    ({ text: pages } = await extractText(pdf, { mergePages: false }));
  } catch (error) {
    if (/password/i.test(String(error?.message))) {
      throw new UserError('PDF ini dilindungi kata sandi. Buka kuncinya dulu, lalu unggah lagi.');
    }
    throw new UserError('PDF ini rusak atau tidak bisa dibaca.');
  }

  const pageLines = pages.map((page) => page.split(/\r?\n/));
  // Running headers/footers repeat on most pages; page numbers stand alone.
  const seen = new Map();
  for (const lines of pageLines) {
    for (const line of new Set(lines.map((l) => l.trim().replace(/\d+/g, '#')).filter(Boolean))) {
      seen.set(line, (seen.get(line) ?? 0) + 1);
    }
  }
  const repeated = (line) =>
    pageLines.length >= 4 && (seen.get(line.trim().replace(/\d+/g, '#')) ?? 0) > pageLines.length * 0.5;

  const lines = [];
  for (const page of pageLines) {
    for (const line of page) {
      const trimmed = line.trim();
      if (/^(?:page\s+|halaman\s+|hal\.?\s+)?\d{1,4}(?:\s*(?:\/|of|dari)\s*\d{1,4})?$/i.test(trimmed)) continue;
      if (trimmed && repeated(line)) continue;
      lines.push(line);
    }
    lines.push('');
  }

  const blocks = linesToBlocks(lines, { hardWrapped: true });
  if (blocks.reduce((sum, b) => sum + b.text.length, 0) < 40) {
    throw new UserError(
      'PDF ini tidak punya teks yang bisa dibaca (kemungkinan hasil pindai). Unggah versi yang teksnya bisa disalin.',
    );
  }
  return { title: '', blocks };
}

function decodeText(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le').slice(1);
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Legacy Windows-1252 files decode to replacement characters as UTF-8.
  if ((text.match(/\ufffd/g)?.length ?? 0) > text.length * 0.01) text = buffer.toString('latin1');
  return text;
}

/**
 * Documents formatted by hand have no heading styles: a heading is just a
 * short paragraph. Promote those when the document has no real headings.
 * @param {Block[]} blocks
 * @returns {Block[]}
 */
export function promoteTitleParagraphs(blocks) {
  if (blocks.filter((b) => b.kind === 'heading').length >= 2) return blocks;
  const candidates = new Set();
  blocks.forEach((block, i) => {
    if (block.kind === 'para' && i < blocks.length - 1 && looksLikeTitleLine(block.text)) candidates.add(i);
  });
  // Mostly short lines means a list or a table, not headings over text.
  if (candidates.size === 0 || candidates.size > blocks.length * 0.6) return blocks;
  return blocks.map((block, i) => (candidates.has(i) ? { kind: 'heading', level: 2, text: block.text } : block));
}

export function extensionOf(filename) {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : '';
}

/** Reject files whose bytes do not match their extension. */
export function assertFileSignature(buffer, ext) {
  const head = buffer.subarray(0, 1024);
  if (ext === 'pdf' && !head.includes('%PDF-')) {
    throw new UserError('File berakhiran .pdf ini bukan PDF yang valid.');
  }
  if (ext === 'docx' && !(head[0] === 0x50 && head[1] === 0x4b)) {
    throw new UserError(
      'File berakhiran .docx ini bukan DOCX yang valid. Jika aslinya .doc, simpan ulang sebagai .docx.',
    );
  }
  if ((ext === 'txt' || ext === 'md') && head.includes(0)) {
    throw new UserError('File teks ini berisi data biner dan tidak bisa dibaca.');
  }
}

/**
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<ExtractedDocument>}
 */
export async function extractDocument(buffer, filename) {
  const ext = extensionOf(filename);
  assertFileSignature(buffer, ext);

  /** @type {ExtractedDocument} */
  let doc;
  if (ext === 'pdf') doc = await pdfToDocument(buffer);
  else if (ext === 'docx') doc = docxToDocument(buffer);
  else if (ext === 'md') doc = { title: '', blocks: markdownToBlocks(decodeText(buffer)) };
  else if (ext === 'txt') doc = { title: '', blocks: linesToBlocks(decodeText(buffer).split(/\r?\n/)) };
  else throw new UserError('Format file tidak didukung. Gunakan PDF, DOCX, TXT, atau MD.', { status: 415 });

  const blocks = promoteTitleParagraphs(doc.blocks.filter((b) => b.text));
  if (blocks.reduce((sum, b) => sum + b.text.length, 0) < 40) {
    throw new UserError('Dokumen ini hampir kosong. Unggah dokumen yang berisi teks.');
  }

  let title = doc.title;
  if (!title) {
    const first = blocks[0];
    const topHeading = blocks.find((b) => b.kind === 'heading' && b.level === 1);
    if (first.kind === 'heading') title = first.text;
    else if (first.text.length <= 120 && !/[.!?]$/.test(first.text)) title = first.text;
    else if (topHeading) title = topHeading.text;
  }
  // The title is shown on the cover; don't repeat it as the first section.
  const body = blocks[0].text === title ? blocks.slice(1) : blocks;
  return { title, blocks: body.length ? body : blocks };
}

/** Flatten blocks back to plain text (used as model input). */
export function blocksToText(blocks) {
  return blocks
    .map((b) => (b.kind === 'heading' ? `\n${'#'.repeat(Math.min(b.level, 6))} ${b.text}\n` : b.kind === 'bullet' ? `- ${b.text}` : `${b.text}\n`))
    .join('\n')
    .trim();
}
