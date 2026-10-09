import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ROOT } from '../src/config.mjs';
import { loadThemePrelude, renderDeck, slugify, themeIds } from '../src/deck.mjs';
import { UserError } from '../src/errors.mjs';
import { extractDocument, linesToBlocks, markdownToBlocks } from '../src/extract.mjs';
import { LIMITS, clip, heuristicOutline, normalizeOutline } from '../src/outline.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (name) => fs.readFile(path.join(fixtures, name));
const headings = (doc) => doc.blocks.filter((b) => b.kind === 'heading').map((b) => b.text);

const TITLE = 'Pemodelan Topik Berita Politik dengan NMF';

test('markdown: title, headings and list items', async () => {
  const doc = await extractDocument(await read('proposal.md'), 'proposal.md');
  assert.equal(doc.title, TITLE);
  assert.deepEqual(headings(doc).slice(0, 3), ['Latar Belakang', 'Rumusan Masalah', 'Metodologi']);
  assert.equal(doc.blocks.filter((b) => b.kind === 'bullet').length, 6);
});

test('markdown keeps text in angle brackets that is not an HTML tag', () => {
  const [block] = markdownToBlocks('Hasil ini <belum> final, lihat <b>tabel</b>.');
  assert.equal(block.text, 'Hasil ini <belum> final, lihat tabel.');
});

test('plain text: headings separated by blank lines', async () => {
  const doc = await extractDocument(await read('proposal.txt'), 'proposal.txt');
  assert.equal(doc.title, TITLE);
  assert.ok(headings(doc).includes('Rumusan Masalah'));
});

test('plain text: chapter lines and numbered headings, but not numbered lists', () => {
  const blocks = linesToBlocks([
    'BAB I',
    'PENDAHULUAN',
    '',
    '1.1 Latar Belakang',
    '',
    'Paragraf pembuka yang cukup panjang untuk dianggap isi.',
    '',
    '1. Langkah pertama dilakukan.',
    '2. Langkah kedua dilakukan.',
  ]);
  assert.deepEqual(blocks[0], { kind: 'heading', level: 1, text: 'BAB I: PENDAHULUAN' });
  assert.deepEqual(blocks[1], { kind: 'heading', level: 2, text: '1.1 Latar Belakang' });
  assert.deepEqual(blocks.slice(3).map((b) => b.kind), ['bullet', 'bullet']);
});

test('docx without heading styles: title-like paragraphs become headings', async () => {
  const doc = await extractDocument(await read('proposal.docx'), 'proposal.docx');
  assert.equal(doc.title, TITLE);
  for (const name of ['Latar Belakang', 'Rumusan Masalah', 'Hasil Awal']) assert.ok(headings(doc).includes(name), name);
});

test('pdf: headings are found without blank lines around them', async () => {
  const doc = await extractDocument(await read('proposal.pdf'), 'proposal.pdf');
  assert.equal(doc.title, TITLE);
  for (const name of ['Latar Belakang', 'Rumusan Masalah', 'Jadwal']) assert.ok(headings(doc).includes(name), name);
});

test('files that do not match their extension are rejected with a readable message', async () => {
  await assert.rejects(extractDocument(Buffer.from('not a pdf'), 'a.pdf'), UserError);
  await assert.rejects(extractDocument(Buffer.from('not a zip'), 'a.docx'), UserError);
  await assert.rejects(extractDocument(Buffer.from('halo'), 'a.txt'), /hampir kosong/);
  await assert.rejects(extractDocument(await read('proposal.md'), 'a.doc'), /tidak didukung/);
});

test('clip shortens on a word boundary', () => {
  assert.equal(clip('satu dua tiga empat lima', 15), 'satu dua tiga…');
  assert.equal(clip('pendek', 15), 'pendek');
});

for (const name of ['proposal.md', 'proposal.docx', 'proposal.pdf']) {
  test(`outline from ${name}: requested page count, limits respected`, async () => {
    const doc = await extractDocument(await read(name), name);
    const outline = heuristicOutline(doc, { pages: 8, title: '' });
    assert.equal(outline.title, TITLE);
    assert.equal(outline.slides.length, 6);
    assert.equal(outline.slides[0].layout, 'agenda');
    const titles = outline.slides.map((s) => s.title);
    assert.ok(titles.includes('Rumusan Masalah'));
    assert.ok(!titles.some((t) => /daftar pustaka/i.test(t)), 'reference list is skipped');
    for (const slide of outline.slides) {
      assert.ok(slide.title.length <= LIMITS.title);
      assert.ok(slide.bullets.length <= Math.max(LIMITS.bullets, LIMITS.agendaItems));
      for (const bullet of slide.bullets) assert.ok(bullet.length <= LIMITS.bullet);
    }
  });
}

test('outline: bullets follow the order of the document', async () => {
  const doc = await extractDocument(await read('proposal.md'), 'proposal.md');
  const slide = heuristicOutline(doc, { pages: 8, title: '' }).slides.find((s) => s.title === 'Latar Belakang');
  assert.match(slide.bullets[0], /^Volume berita/);
  assert.match(slide.bullets[1], /^Penelitian sebelumnya/);
});

test('outline: automatic page count stays between 5 and 15, custom title wins', async () => {
  const doc = await extractDocument(await read('proposal.md'), 'proposal.md');
  const outline = heuristicOutline(doc, { pages: null, title: 'Judul Sendiri' });
  assert.equal(outline.title, 'Judul Sendiri');
  assert.ok(outline.slides.length + 2 >= 5 && outline.slides.length + 2 <= 15);
});

test('normalizeOutline repairs model output', () => {
  const outline = normalizeOutline(
    {
      title: 'x'.repeat(300),
      subtitle: '',
      slides: [
        { layout: 'cards', title: 'Hanya satu kartu', cards: [{ heading: 'A', body: 'B' }], bullets: ['satu', 'dua'] },
        { layout: 'hologram', title: 'Tata letak tak dikenal', body: 'Isi.' },
        { layout: 'bullets', title: '', bullets: ['tanpa judul'] },
        { layout: 'bullets', title: 'Terlalu banyak', bullets: Array.from({ length: 9 }, (_, i) => `poin ${i}`) },
        { layout: 'statement', title: 'Melebihi jatah halaman', body: 'Isi.' },
      ],
    },
    { pages: 5, fallbackTitle: 'Presentasi' },
  );
  assert.ok(outline.title.length <= LIMITS.deckTitle);
  assert.deepEqual(outline.slides.map((s) => s.layout), ['bullets', 'statement', 'bullets']);
  assert.equal(outline.slides[2].bullets.length, LIMITS.bullets);
  assert.throws(() => normalizeOutline({ slides: [] }, { pages: 8, fallbackTitle: 'x' }), UserError);
});

test('every theme renders a deck with document text escaped for JSX', async () => {
  const outline = normalizeOutline(
    {
      title: 'Uji {kurung} & <tag>',
      subtitle: 'Sub',
      slides: [
        { layout: 'agenda', title: 'Agenda', bullets: ['Satu', 'Dua'] },
        { layout: 'section', title: 'Bagian', body: 'Pembuka.' },
        { layout: 'bullets', title: 'Poin', bullets: ['a < b', 'c } d'], notes: 'Catatan "kutip".' },
        { layout: 'cards', title: 'Kartu', cards: [{ heading: 'H "1"', body: 'B1' }, { heading: 'H2', body: 'B2' }] },
        { layout: 'statement', title: 'Pernyataan', body: 'Isi {x}.' },
      ],
    },
    { pages: 8, fallbackTitle: 'x' },
  );
  for (const themeId of themeIds) {
    const prelude = await loadThemePrelude(ROOT, themeId);
    const code = renderDeck(outline, { slideId: 'uji-abc123', themeId, prelude, createdAt: '2026-01-01T00:00:00.000Z', source: 'a.md' });
    assert.ok(code.includes('Uji &#123;kurung&#125; &amp; &lt;tag&gt;'));
    assert.ok(code.includes('<Bullet>a &lt; b</Bullet>'));
    assert.ok(code.includes('<Card heading="H \\"1\\"">B1</Card>'));
    assert.ok(code.includes(`theme: '${themeId}'`));
    assert.ok(code.includes('osd-gama-fonts-uji-abc123'));
    assert.ok(code.includes('export default [Cover, Slide02, Slide03, Slide04, Slide05, Slide06, Closing] satisfies Page[];'));
    assert.ok(!code.includes('Demo pages'), 'demo pages are not copied into the deck');
    // The framework finds `meta` by counting braces.
    const meta = code.slice(code.indexOf('export const meta'));
    assert.ok(!/title: "[^"\n]*[{}]/.test(meta));
  }
});

test('slugify produces ids the framework accepts', () => {
  assert.equal(slugify('Pemodelan Topik: Berita & Politik (2026)'), 'pemodelan-topik-berita-politik-2026');
  assert.equal(slugify('日本語'), '');
});
