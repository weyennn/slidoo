import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * How each theme's frames (defined in `themes/<id>.demo.tsx`) are used, and
 * the colours the generated components take from `themes/<id>.md`.
 */
const THEME_SPECS = {
  'ugm-official': {
    frames: { cover: 'CoverFrame', content: 'ContentFrame', section: 'SeparatorFrame', closing: 'ClosingFrame' },
    ink: {
      title: '#0e2841',
      eyebrow: '#01416b',
      body: '#0e2841',
      muted: '#5a6b7d',
      marker: '#01416b',
      rule: '#fdd402',
      cardBg: '#eef3f8',
      cardHeading: '#01416b',
      closingMuted: 'rgba(255,255,255,0.9)',
    },
    coverTitle: [68, 56],
    // The official cover sits on a photo, so its text needs a backing panel.
    coverPanel: 'rgba(255,255,255,0.88)',
    // SeparatorFrame already positions its content; the dark themes reuse the
    // content frame and centre the divider themselves.
    sectionCentered: false,
    cardRule: false,
  },
  'ugm-midnight': {
    frames: { cover: 'MidnightCoverFrame', content: 'MidnightFrame', section: 'MidnightFrame', closing: 'MidnightClosingFrame' },
    ink: {
      title: '#ffffff',
      eyebrow: '#fdd402',
      body: '#ffffff',
      muted: '#bcd0e2',
      marker: '#fdd402',
      rule: '#fdd402',
      cardBg: 'rgba(29,79,128,0.55)',
      cardHeading: '#fdd402',
      closingMuted: '#bcd0e2',
    },
    coverTitle: [68, 56],
    coverPanel: null,
    sectionCentered: true,
    cardRule: false,
  },
  'ugm-heritage': {
    frames: { cover: 'HeritageCoverFrame', content: 'HeritageFrame', section: 'HeritageFrame', closing: 'HeritageClosingFrame' },
    ink: {
      title: '#ffffff',
      eyebrow: '#fdd402',
      body: '#ffffff',
      muted: '#b8cde0',
      marker: '#fdd402',
      rule: '#fdd402',
      // Heritage allows lines as its only ornament: no filled panels.
      cardBg: 'transparent',
      cardHeading: '#fdd402',
      closingMuted: '#b8cde0',
    },
    coverTitle: [76, 60],
    coverPanel: null,
    sectionCentered: true,
    cardRule: true,
  },
};

export const themeIds = Object.keys(THEME_SPECS);

/** Text placed between JSX tags. */
function jsxText(value) {
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
    .trim();
}

export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

export function newSlideId(title) {
  return `${slugify(title) || 'deck'}-${randomBytes(3).toString('hex')}`;
}

/**
 * The part of a theme demo that every deck on that theme needs: imports, the
 * `design` const, the font loader and the background frames.
 */
export async function loadThemePrelude(root, themeId) {
  const spec = THEME_SPECS[themeId];
  if (!spec) throw new Error(`Unknown theme: ${themeId}`);
  const source = await fs.readFile(path.join(root, 'themes', `${themeId}.demo.tsx`), 'utf8');

  const markers = ['// Components', '// Demo pages'].map((m) => source.indexOf(m)).filter((i) => i !== -1);
  if (markers.length === 0) throw new Error(`themes/${themeId}.demo.tsx has no "// Demo pages" section`);
  const marker = Math.min(...markers);
  // Cut at the divider line that opens that section.
  const divider = source.lastIndexOf('\n// ---', marker);
  const prelude = source.slice(0, divider === -1 ? marker : divider).trimEnd();

  for (const frame of new Set(Object.values(spec.frames))) {
    if (!new RegExp(`\\bconst ${frame}\\b`).test(prelude)) {
      throw new Error(`themes/${themeId}.demo.tsx no longer defines <${frame}>`);
    }
  }
  if (!/\bconst GAMA\b/.test(prelude)) throw new Error(`themes/${themeId}.demo.tsx no longer defines GAMA`);
  return prelude;
}

function components(spec) {
  const ink = Object.entries(spec.ink)
    .map(([key, value]) => `  ${key}: '${value}',`)
    .join('\n');
  const cardStyle = spec.cardRule
    ? `{ flex: 1, borderTop: \`6px solid \${INK.rule}\`, padding: '32px 0 0' }`
    : `{ flex: 1, background: INK.cardBg, borderRadius: 8, padding: '40px 36px' }`;

  return `// ---------------------------------------------------------------------------
// Deck components
// ---------------------------------------------------------------------------
const INK = {
${ink}
} as const;

const SlideEyebrow = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontFamily: GAMA,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: INK.eyebrow,
    }}
  >
    {children}
  </div>
);

const SlideTitle = ({ children, size = 56 }: { children: React.ReactNode; size?: number }) => (
  <h1
    style={{
      fontFamily: GAMA,
      fontSize: size,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      margin: '24px 0 0',
      maxWidth: 1500,
      color: INK.title,
    }}
  >
    {children}
  </h1>
);

const Rule = () => <div style={{ width: 122, height: 6, background: INK.rule, marginTop: 36 }} />;

const BulletList = ({ children }: { children: React.ReactNode }) => (
  <ul
    style={{
      listStyle: 'none',
      margin: '52px 0 0',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 26,
      maxWidth: 1560,
    }}
  >
    {children}
  </ul>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li style={{ display: 'flex', gap: 28, fontFamily: GAMA, fontSize: 32, lineHeight: 1.4, color: INK.body }}>
    <span style={{ flex: 'none', width: 14, height: 14, marginTop: 16, background: INK.marker }} />
    <span>{children}</span>
  </li>
);

const AgendaList = ({ children }: { children: React.ReactNode }) => (
  <ol
    style={{
      listStyle: 'none',
      margin: '56px 0 0',
      padding: 0,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      columnGap: 80,
      rowGap: 30,
    }}
  >
    {children}
  </ol>
);

const AgendaItem = ({ n, children }: { n: string; children: React.ReactNode }) => (
  <li style={{ display: 'flex', gap: 28, alignItems: 'baseline', fontFamily: GAMA, fontSize: 32, lineHeight: 1.4, color: INK.body }}>
    <span style={{ flex: 'none', width: 56, fontWeight: 700, color: INK.eyebrow }}>{n}</span>
    <span>{children}</span>
  </li>
);

const CardRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 48, marginTop: 56 }}>{children}</div>
);

const Card = ({ heading, children }: { heading: string; children: React.ReactNode }) => (
  <div style={${cardStyle}}>
    <div style={{ fontFamily: GAMA, fontSize: 30, fontWeight: 700, lineHeight: 1.25, color: INK.cardHeading }}>
      {heading}
    </div>
    <p style={{ fontFamily: GAMA, fontSize: 26, lineHeight: 1.5, color: INK.muted, margin: '14px 0 0' }}>
      {children}
    </p>
  </div>
);

const Statement = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontFamily: GAMA, fontSize: 38, lineHeight: 1.5, color: INK.body, margin: '44px 0 0', maxWidth: 1400 }}>
    {children}
  </p>
);`;
}

function coverPage(outline, spec) {
  const { cover } = spec.frames;
  const size = spec.coverTitle[outline.title.length > 60 ? 1 : 0];
  const panel = spec.coverPanel;
  const titleStyle = panel
    ? `fontFamily: GAMA, fontSize: ${size}, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', margin: 0, color: INK.title, maxWidth: 1300, background: '${panel}', padding: '28px 36px'`
    : `fontFamily: GAMA, fontSize: ${size}, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', margin: 0, color: INK.title, maxWidth: 1300`;
  const subtitleStyle = panel
    ? `fontFamily: GAMA, fontSize: 30, lineHeight: 1.5, color: INK.title, margin: '28px 0 0', maxWidth: 1100, background: '${panel}', padding: '18px 36px'`
    : `fontFamily: GAMA, fontSize: 30, lineHeight: 1.5, color: INK.muted, margin: '28px 0 0', maxWidth: 1100`;
  const subtitle = outline.subtitle
    ? `\n    <p style={{ ${subtitleStyle} }}>\n      ${jsxText(outline.subtitle)}\n    </p>`
    : '';
  return `const Cover: Page = () => (
  <${cover}>
    <h1 style={{ ${titleStyle} }}>
      ${jsxText(outline.title)}
    </h1>${subtitle}
  </${cover}>
);`;
}

function closingPage(outline, spec) {
  const { closing } = spec.frames;
  return `const Closing: Page = () => (
  <${closing}>
    <h2 style={{ fontFamily: GAMA, fontSize: 96, fontWeight: 700, lineHeight: 1.2, margin: 0, color: '#ffffff' }}>
      Terima Kasih
    </h2>
    <p style={{ fontFamily: GAMA, fontSize: 30, lineHeight: 1.5, margin: '32px 0 0', maxWidth: 1300, color: INK.closingMuted }}>
      ${jsxText(outline.title)}
    </p>
  </${closing}>
);`;
}

function contentPage(name, slide, spec) {
  const { content, section } = spec.frames;
  const eyebrow = slide.eyebrow ? `<SlideEyebrow>${jsxText(slide.eyebrow)}</SlideEyebrow>` : '';
  const head = (indent) =>
    [eyebrow, `<SlideTitle>${jsxText(slide.title)}</SlideTitle>`]
      .filter(Boolean)
      .map((line) => indent + line)
      .join('\n');

  if (slide.layout === 'section') {
    const body = slide.body
      ? `\n      <p style={{ fontFamily: GAMA, fontSize: 30, lineHeight: 1.5, color: INK.muted, margin: '28px 0 0', maxWidth: 900 }}>\n        ${jsxText(slide.body)}\n      </p>`
      : '';
    const inner = [eyebrow, `<SlideTitle size={84}>${jsxText(slide.title)}</SlideTitle>`]
      .filter(Boolean)
      .map((line) => `      ${line}`)
      .join('\n');
    const wrapper = spec.sectionCentered
      ? `<div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 1300 }}>`
      : `<div style={{ maxWidth: 1200 }}>`;
    return `const ${name}: Page = () => (
  <${section}>
    ${wrapper}
${inner}${body}
    </div>
  </${section}>
);`;
  }

  let body;
  if (slide.layout === 'agenda') {
    const items = slide.bullets
      .map((text, i) => `      <AgendaItem n="${String(i + 1).padStart(2, '0')}">${jsxText(text)}</AgendaItem>`)
      .join('\n');
    body = `    <AgendaList>\n${items}\n    </AgendaList>`;
  } else if (slide.layout === 'cards') {
    const cards = slide.cards
      .map((card) => `      <Card heading=${JSON.stringify(card.heading)}>${jsxText(card.body)}</Card>`)
      .join('\n');
    body = `    <CardRow>\n${cards}\n    </CardRow>`;
  } else if (slide.layout === 'statement') {
    body = `    <Rule />\n    <Statement>${jsxText(slide.body)}</Statement>`;
  } else {
    const bullets = slide.bullets.map((text) => `      <Bullet>${jsxText(text)}</Bullet>`).join('\n');
    body = `    <BulletList>\n${bullets}\n    </BulletList>`;
  }
  return `const ${name}: Page = () => (
  <${content}>
${head('    ')}
${body}
  </${content}>
);`;
}

/**
 * Render an outline as the source of `slides/<id>/index.tsx`.
 * @param {import('./outline.mjs').Outline} outline
 */
export function renderDeck(outline, { slideId, themeId, prelude, createdAt, source }) {
  const spec = THEME_SPECS[themeId];
  const names = outline.slides.map((_, i) => `Slide${String(i + 2).padStart(2, '0')}`);
  const pages = outline.slides.map((slide, i) => contentPage(names[i], slide, spec));
  const order = ['Cover', ...names, 'Closing'];

  const notes = [undefined, ...outline.slides.map((s) => s.notes || undefined), undefined];
  while (notes.length && notes[notes.length - 1] === undefined) notes.pop();
  const notesExport = notes.length
    ? `\nexport const notes: (string | undefined)[] = [\n${notes.map((n) => `  ${n === undefined ? 'undefined' : JSON.stringify(n)},`).join('\n')}\n];\n`
    : '';

  // The framework reads `meta` with a brace-counting scan, so keep braces out.
  const metaTitle = JSON.stringify(outline.title.replace(/[{}]/g, ''));
  const origin = source ? `// Draft generated by Slidoo from ${JSON.stringify(source)}. Edit freely.\n` : '';

  return `${origin}import type { SlideMeta } from '@open-slide/core';
${prelude.replace(/osd-gama-fonts-[a-z0-9-]+/i, `osd-gama-fonts-${slideId}`)}

${components(spec)}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------
${coverPage(outline, spec)}

${pages.join('\n\n')}

${closingPage(outline, spec)}

export const meta: SlideMeta = {
  title: ${metaTitle},
  theme: '${themeId}',
  createdAt: '${createdAt}',
};
${notesExport}
export default [${order.join(', ')}] satisfies Page[];
`;
}

/** Write the deck into `slides/<id>/index.tsx` and return its id. */
export async function writeDeck(root, outline, { themeId, source }) {
  const prelude = await loadThemePrelude(root, themeId);
  const slidesRoot = path.join(root, 'slides');
  let slideId = newSlideId(outline.title);
  // `mkdir` without `recursive` fails if the folder exists, so an id is never reused.
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.mkdir(path.join(slidesRoot, slideId));
      break;
    } catch (error) {
      if (error.code !== 'EEXIST' || attempt >= 4) throw error;
      slideId = newSlideId(outline.title);
    }
  }
  const code = renderDeck(outline, { slideId, themeId, prelude, createdAt: new Date().toISOString(), source });
  await fs.writeFile(path.join(slidesRoot, slideId, 'index.tsx'), code, 'utf8');
  return slideId;
}

/** Remove a deck that could not be published. */
export async function removeDeck(root, slideId) {
  if (!/^[a-z0-9-]+$/.test(slideId)) return;
  await fs.rm(path.join(root, 'slides', slideId), { recursive: true, force: true });
}
