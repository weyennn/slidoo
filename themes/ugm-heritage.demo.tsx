import { type Page, useSlidePageNumber } from '@open-slide/core';
import type { DesignSystem } from '@open-slide/core';

import gamaSansRegular from '@assets/fonts/Gama-Sans-Regular.otf';
import gamaSansLight from '@assets/fonts/Gama-Sans-light.otf';
import gamaSansBold from '@assets/fonts/Gama-Sans-Bold.otf';
import gamaSansItalic from '@assets/fonts/Gama-Sans-Italic.otf';
import wordmarkWhite from '@assets/ugm-wordmark-white.png';

export const design: DesignSystem = {
  palette: { bg: '#00416b', text: '#ffffff', accent: '#fdd402' },
  fonts: {
    display: "'Gama Sans', Arial, sans-serif",
    body: "'Gama Sans', Arial, sans-serif",
  },
  typeScale: { hero: 76, body: 30 },
  radius: 4,
};

const FONT_STYLE_ID = 'osd-gama-fonts-ugm-heritage-demo';
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
const NAVY = '#00416b';
const GOLD = '#fdd402';
const MUTED = '#b8cde0';

// ---------------------------------------------------------------------------
// Frames — geometry from Template 2 variant 1 (classic dark UGM)
// ---------------------------------------------------------------------------
const frame = {
  width: '100%',
  height: '100%',
  position: 'relative',
  fontFamily: GAMA,
  overflow: 'hidden',
} as const;

/** Full-width gold baseline band (0.17in ≈ 24px) — the only ornament. */
const GoldBaseline = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24, background: GOLD }} />
);

const PageNum = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <span>
      {current} / {total}
    </span>
  );
};

/** Classic dark cover: white wordmark top-left, short white hairline accent,
 *  full-width gold baseline. Content flows in the padded area. */
const HeritageCoverFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: NAVY, color: '#ffffff' }}>
    <img
      src={wordmarkWhite}
      alt="Universitas Gadjah Mada"
      style={{ position: 'absolute', top: 80, left: 94, width: 386, height: 'auto' }}
    />
    <div style={{ position: 'relative', padding: '330px 200px 120px', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: 122, height: 6, background: 'rgba(255,255,255,0.85)', marginBottom: 36 }} />
      {children}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 200,
        bottom: 64,
        fontSize: 22,
        color: MUTED,
        letterSpacing: '0.08em',
      }}
    >
      ugm.ac.id
    </div>
    <GoldBaseline />
  </div>
);

/** Classic dark content page: small white wordmark top-right, gold baseline,
 *  motto text above the baseline. */
const HeritageFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: NAVY, color: '#ffffff' }}>
    <img
      src={wordmarkWhite}
      alt="Universitas Gadjah Mada"
      style={{ position: 'absolute', top: 35, right: 84, width: 230, height: 'auto' }}
    />
    <div style={{ position: 'relative', padding: '120px 120px 110px', height: '100%', boxSizing: 'border-box' }}>
      {children}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 24,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 120px',
        fontSize: 22,
        color: '#ffffff',
        fontFamily: GAMA,
      }}
    >
      <span>Merakyat, Mandiri, Berkelanjutan</span>
      <span style={{ opacity: 0.85 }}>Inclusive, Self-Reliant, Sustainable</span>
      <PageNum />
    </div>
    <GoldBaseline />
  </div>
);

/** Classic dark closing: navy, centered content, gold baseline. */
const HeritageClosingFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: NAVY, color: '#ffffff' }}>
    <div
      style={{
        position: 'relative',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 200px',
      }}
    >
      {children}
    </div>
    <GoldBaseline />
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
  <HeritageCoverFrame>
    <Title size={76}>Ini Adalah Judul Presentasi Title Case</Title>
    <p style={{ fontFamily: GAMA, fontSize: 30, color: MUTED, marginTop: 28, lineHeight: 1.5, maxWidth: 1100 }}>
      Sedangkan ini adalah space untuk sub-judul sebagai pelengkap judul utama di atas.
    </p>
  </HeritageCoverFrame>
);

const Content: Page = () => (
  <HeritageFrame>
    <Eyebrow>Bab Dua</Eyebrow>
    <div style={{ marginTop: 24 }}>
      <Title>Halaman Konten Klasik</Title>
    </div>
    <div style={{ width: 122, height: 6, background: GOLD, marginTop: 32 }} />
    <p style={{ fontFamily: GAMA, fontSize: 30, color: MUTED, lineHeight: 1.6, marginTop: 48, maxWidth: 1400 }}>
      Satu bidang navy, satu garis emas, huruf putih besar. Ornamen hanya garis — tidak ada
      panel, tidak ada bayangan. Isi halaman tinggal diletakkan setelah aksen garis.
    </p>
  </HeritageFrame>
);

const Closer: Page = () => (
  <HeritageClosingFrame>
    <div style={{ fontFamily: GAMA, fontSize: 26, fontWeight: 700, letterSpacing: '0.22em', color: GOLD }}>
      UGM.AC.ID
    </div>
    <h2
      style={{
        fontFamily: GAMA,
        fontSize: 80,
        fontWeight: 700,
        margin: '36px 0 0',
        lineHeight: 1.2,
        maxWidth: 1400,
        color: '#ffffff',
      }}
    >
      Locally Rooted, Globally Respected
    </h2>
  </HeritageClosingFrame>
);

export default [Cover, Content, Closer];
