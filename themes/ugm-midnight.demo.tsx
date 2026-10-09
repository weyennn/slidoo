import { type Page, useSlidePageNumber } from '@open-slide/core';
import type { DesignSystem } from '@open-slide/core';

import gamaSansRegular from '@assets/fonts/Gama-Sans-Regular.otf';
import gamaSansLight from '@assets/fonts/Gama-Sans-light.otf';
import gamaSansBold from '@assets/fonts/Gama-Sans-Bold.otf';
import gamaSansItalic from '@assets/fonts/Gama-Sans-Italic.otf';
import wordmarkWhite from '@assets/ugm-wordmark-white.png';

export const design: DesignSystem = {
  palette: { bg: '#01416b', text: '#ffffff', accent: '#fdd402' },
  fonts: {
    display: "'Gama Sans', Arial, sans-serif",
    body: "'Gama Sans', Arial, sans-serif",
  },
  typeScale: { hero: 72, body: 32 },
  radius: 8,
};

const FONT_STYLE_ID = 'osd-gama-fonts-ugm-midnight-demo';
const FONT_CSS = `
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansRegular}'); font-weight: 400; }
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansLight}'); font-weight: 300; }
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansBold}'); font-weight: 700; }
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansItalic}'); font-weight: 400; font-style: italic; }
`;
if (typeof document !== 'undefined') {
  let style = document.getElementById(FONT_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = FONT_STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== FONT_CSS) style.textContent = FONT_CSS;
}

const GAMA = "'Gama Sans', Arial, sans-serif";
const NAVY = '#01416b';
const GOLD = '#fdd402';
const STEEL = '#1d4f80';
const MUTED = '#bcd0e2';

// ---------------------------------------------------------------------------
// Frames — geometry from Template PPT 2026 Opt-1 (dark official variant)
// ---------------------------------------------------------------------------
const frame = {
  width: '100%',
  height: '100%',
  position: 'relative',
  fontFamily: GAMA,
  overflow: 'hidden',
} as const;

const PageNum = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <span>
      {current} / {total}
    </span>
  );
};

/** Bottom motto strip on dark: gold hairline on top, white text. */
const MottoStripLight = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 56,
      borderTop: `6px solid ${GOLD}`,
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 120px',
      fontSize: 24,
      fontFamily: GAMA,
      background: 'rgba(0,0,0,0.18)',
    }}
  >
    <span>Merakyat, Mandiri, Berkelanjutan</span>
    <span style={{ opacity: 0.85 }}>Inclusive, Self-Reliant, Sustainable</span>
    <PageNum />
  </div>
);

/** Dark content background: full navy, small white wordmark top-right, motto strip. */
const MidnightFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: NAVY, color: '#ffffff' }}>
    <img
      src={wordmarkWhite}
      alt="Universitas Gadjah Mada"
      style={{ position: 'absolute', top: 35, right: 84, width: 230, height: 'auto' }}
    />
    <div style={{ position: 'relative', padding: '120px 120px 110px', height: '100%', boxSizing: 'border-box' }}>
      {children}
    </div>
    <MottoStripLight />
  </div>
);

/** Dark cover — Opt-1 slide 1 geometry:
 *  thick gold vertical band at right edge (1.79in ≈ 258px), steel block top-right,
 *  white wordmark top-left, gold accent line above the title, ugm.ac.id badge. */
const MidnightCoverFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: NAVY, color: '#ffffff' }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 258, height: '100%', background: GOLD }} />
    <div style={{ position: 'absolute', top: 29, right: 320, width: 227, height: 236, background: STEEL, opacity: 0.9 }} />
    <img
      src={wordmarkWhite}
      alt="Universitas Gadjah Mada"
      style={{ position: 'absolute', top: 80, left: 94, width: 386, height: 'auto' }}
    />
    <div style={{ position: 'relative', padding: '320px 420px 120px 200px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: 122, height: 6, background: GOLD, marginBottom: 36 }} />
      {children}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 94,
        bottom: 100,
        border: '2px solid rgba(255,255,255,0.65)',
        color: '#ffffff',
        fontSize: 22,
        padding: '8px 20px',
      }}
    >
      ugm.ac.id
    </div>
    <MottoStripLight />
  </div>
);

/** Dark closing — Opt-1 slide 4 geometry: full navy, thin gold band at the very bottom. */
const MidnightClosingFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: NAVY, color: '#ffffff' }}>
    <div style={{ position: 'absolute', top: -100, right: -60, width: 227, height: 236, background: STEEL, opacity: 0.7 }} />
    <div
      style={{
        position: 'relative',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 200px',
      }}
    >
      {children}
    </div>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 27, background: GOLD }} />
  </div>
);

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontFamily: GAMA,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: GOLD,
    }}
  >
    {children}
  </div>
);

const Title = ({ children, size = 56 }: { children: React.ReactNode; size?: number }) => (
  <h1
    style={{
      fontFamily: GAMA,
      fontSize: size,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      margin: 0,
      color: '#ffffff',
    }}
  >
    {children}
  </h1>
);

// ---------------------------------------------------------------------------
// Demo pages
// ---------------------------------------------------------------------------
const Cover: Page = () => (
  <MidnightCoverFrame>
    <Eyebrow>Proposal Tesis</Eyebrow>
    <div style={{ marginTop: 24 }}>
      <Title size={68}>Judul Presentasi di Atas Navy UGM</Title>
    </div>
    <p style={{ fontFamily: GAMA, fontSize: 30, color: MUTED, marginTop: 28, lineHeight: 1.5, maxWidth: 1050 }}>
      Sub-judul dengan teks sekunder kebiruan. Pita emas dan blok baja mengikuti geometri resmi Opt-1.
    </p>
  </MidnightCoverFrame>
);

const Content: Page = () => (
  <MidnightFrame>
    <Eyebrow>Bab Satu</Eyebrow>
    <div style={{ marginTop: 24 }}>
      <Title>Halaman Konten Gelap</Title>
    </div>
    <div style={{ display: 'flex', gap: 48, marginTop: 56 }}>
      <div style={{ flex: 1, background: 'rgba(29,79,128,0.55)', borderRadius: 8, padding: '40px 36px' }}>
        <div style={{ fontFamily: GAMA, fontSize: 30, fontWeight: 700, color: GOLD }}>Poin pertama</div>
        <p style={{ fontFamily: GAMA, fontSize: 26, color: MUTED, lineHeight: 1.5, marginTop: 14, marginBottom: 0 }}>
          Panel baja transparan menjaga keterbacaan di atas navy.
        </p>
      </div>
      <div style={{ flex: 1, background: 'rgba(29,79,128,0.55)', borderRadius: 8, padding: '40px 36px' }}>
        <div style={{ fontFamily: GAMA, fontSize: 30, fontWeight: 700, color: GOLD }}>Poin kedua</div>
        <p style={{ fontFamily: GAMA, fontSize: 26, color: MUTED, lineHeight: 1.5, marginTop: 14, marginBottom: 0 }}>
          Hanya tiga warna: navy, emas, putih. Tidak ada warna keempat.
        </p>
      </div>
    </div>
  </MidnightFrame>
);

const Closer: Page = () => (
  <MidnightClosingFrame>
    <Eyebrow>Terima Kasih</Eyebrow>
    <h2
      style={{
        fontFamily: GAMA,
        fontSize: 84,
        fontWeight: 700,
        margin: '36px 0 0',
        lineHeight: 1.2,
        maxWidth: 1300,
        color: '#ffffff',
      }}
    >
      Locally Rooted, Globally Respected
    </h2>
    <p style={{ fontFamily: GAMA, fontSize: 30, lineHeight: 1.5, marginTop: 32, color: MUTED }}>
      ugm.ac.id
    </p>
  </MidnightClosingFrame>
);

export default [Cover, Content, Closer];
