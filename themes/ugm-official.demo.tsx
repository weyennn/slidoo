import { type Page, useSlidePageNumber } from '@open-slide/core';
import type { DesignSystem } from '@open-slide/core';

import gamaSansRegular from '@assets/fonts/Gama-Sans-Regular.otf';
import gamaSansLight from '@assets/fonts/Gama-Sans-light.otf';
import gamaSansBold from '@assets/fonts/Gama-Sans-Bold.otf';
import gamaSansItalic from '@assets/fonts/Gama-Sans-Italic.otf';
import gamaSerifRegular from '@assets/fonts/Gama-Serif-Regular.otf';
import gamaSerifBold from '@assets/fonts/Gama-Serif-Bold.otf';
import wordmark from '@assets/ugm-wordmark.png';
import coverPhoto from '@assets/ugm-cover-photo.jpg';

export const design: DesignSystem = {
  palette: { bg: '#ffffff', text: '#0e2841', accent: '#01416b' },
  fonts: {
    display: "'Gama Sans', Arial, sans-serif",
    body: "'Gama Sans', Arial, sans-serif",
  },
  typeScale: { hero: 72, body: 32 },
  radius: 8,
};

// ---------------------------------------------------------------------------
// Font loader — inject @font-face once (create-or-update pattern, webfonts.md)
// ---------------------------------------------------------------------------
const FONT_STYLE_ID = 'osd-gama-fonts-ugm-official-demo';
const FONT_CSS = `
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansRegular}'); font-weight: 400; }
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansLight}'); font-weight: 300; }
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansBold}'); font-weight: 700; }
@font-face { font-family: 'Gama Sans'; src: url('${gamaSansItalic}'); font-weight: 400; font-style: italic; }
@font-face { font-family: 'Gama Serif'; src: url('${gamaSerifRegular}'); font-weight: 400; }
@font-face { font-family: 'Gama Serif'; src: url('${gamaSerifBold}'); font-weight: 700; }
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
const NAVY_DEEP = '#0e426b';
const GOLD = '#fdd402';
const TEXT = '#0e2841';
const MUTED = '#5a6b7d';

// ---------------------------------------------------------------------------
// Official background frames — copied from the UGM template geometry.
// Usage: wrap page content, e.g.
//   const MyCover: Page = () => (
//     <CoverFrame>
//       <h1 ...>Judul</h1>
//     </CoverFrame>
//   );
// ---------------------------------------------------------------------------

const frame = {
  width: '100%',
  height: '100%',
  position: 'relative',
  fontFamily: GAMA,
  overflow: 'hidden',
} as const;

/** Chrome shared by every frame: gold/navy vertical accent at the right edge
 *  (slide 1 official: 0.22 in ≈ 32 px wide) and the navy motto strip. */
const RightEdge = () => (
  <>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 32, height: '58%', background: GOLD }} />
    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: '42%', background: NAVY }} />
  </>
);

const MottoStrip = ({ dark }: { dark?: boolean }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 56,
      background: NAVY,
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 120px',
      fontSize: 24,
      fontFamily: GAMA,
    }}
  >
    <span>Merakyat, Mandiri, Berkelanjutan</span>
    <span style={{ opacity: 0.85 }}>Inclusive, Self-Reliant, Sustainable</span>
    <PageNum dark={dark} />
  </div>
);

const PageNum = ({ dark }: { dark?: boolean }) => {
  const { current, total } = useSlidePageNumber();
  return (
    <span>
      {current} / {total}
    </span>
  );
};

/** Cover background — official slide 1:
 *  photo full-bleed, wordmark top-left, gold accent line at right edge,
 *  navy "ugm.ac.id" badge bottom-left, navy motto strip at the very bottom.
 *  Children are laid out in the padded flow area above the strip. */
const CoverFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: '#ffffff', color: TEXT }}>
    <img
      src={coverPhoto}
      alt=""
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
    <RightEdge />
    <img
      src={wordmark}
      alt="Universitas Gadjah Mada"
      style={{ position: 'absolute', top: 63, left: 68, width: 413, height: 'auto' }}
    />
    <div style={{ position: 'relative', padding: '300px 260px 120px 200px', height: '100%', boxSizing: 'border-box' }}>
      {children}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 68,
        bottom: 100,
        background: NAVY_DEEP,
        color: '#ffffff',
        fontSize: 22,
        padding: '8px 20px',
      }}
    >
      ugm.ac.id
    </div>
    <MottoStrip />
  </div>
);

/** Content background — official "Title and Content" layout:
 *  white, wordmark small top-right (230 × 65 px), navy motto strip. */
const ContentFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: '#ffffff', color: TEXT }}>
    <img
      src={wordmark}
      alt="Universitas Gadjah Mada"
      style={{ position: 'absolute', top: 35, right: 84, width: 230, height: 'auto' }}
    />
    <div style={{ position: 'relative', padding: '120px 120px 110px', height: '100%', boxSizing: 'border-box' }}>
      {children}
    </div>
    <MottoStrip />
  </div>
);

/** Separator background — official slide 2 (section header):
 *  white, gold block left of strip, navy block right of strip, wordmark
 *  small top-right, navy "ugm.ac.id" badge on the gold block. */
const SeparatorFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: '#ffffff', color: TEXT }}>
    <img
      src={wordmark}
      alt="Universitas Gadjah Mada"
      style={{ position: 'absolute', top: 35, right: 84, width: 230, height: 'auto' }}
    />
    <div style={{ position: 'relative', padding: '220px 120px 320px 200px', height: '100%', boxSizing: 'border-box' }}>
      {children}
    </div>
    <div style={{ position: 'absolute', left: 0, bottom: 56, width: '31.5%', height: 245, background: GOLD }} />
    <div style={{ position: 'absolute', right: 0, bottom: 56, width: '68.5%', height: 245, background: NAVY }} />
    <div
      style={{
        position: 'absolute',
        left: 200,
        bottom: 178,
        background: NAVY_DEEP,
        color: '#ffffff',
        fontSize: 22,
        padding: '8px 20px',
      }}
    >
      ugm.ac.id
    </div>
    <MottoStrip dark />
  </div>
);

/** Closing background — navy full-bleed with gold edge, for the final page. */
const ClosingFrame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...frame, background: NAVY, color: '#ffffff' }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: 32, height: '100%', background: GOLD }} />
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
  </div>
);

// ---------------------------------------------------------------------------
// Demo pages — text/layout only; backgrounds come from the frames above.
// ---------------------------------------------------------------------------

const Cover: Page = () => (
  <CoverFrame>
    <h1
      style={{
        fontFamily: GAMA,
        fontSize: 68,
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
        margin: 0,
        color: TEXT,
        maxWidth: 1300,
        background: 'rgba(255,255,255,0.88)',
        padding: '28px 36px',
      }}
    >
      Judul Presentasi Title Case Menggunakan Gama Sans Bold
    </h1>
    <p
      style={{
        fontFamily: GAMA,
        fontSize: 30,
        color: TEXT,
        marginTop: 28,
        lineHeight: 1.5,
        maxWidth: 1100,
        background: 'rgba(255,255,255,0.88)',
        padding: '18px 36px',
      }}
    >
      Ruang untuk sub-judul sebagai pelengkap judul utama di atas.
    </p>
  </CoverFrame>
);

const Separator: Page = () => (
  <SeparatorFrame>
    <h1
      style={{
        fontFamily: GAMA,
        fontSize: 84,
        fontWeight: 700,
        lineHeight: 1.15,
        margin: 0,
        color: TEXT,
        maxWidth: 1200,
      }}
    >
      Ini Adalah Halaman Separator Judul Sub Bab
    </h1>
    <p style={{ fontFamily: GAMA, fontSize: 30, color: MUTED, marginTop: 28, lineHeight: 1.5, maxWidth: 900 }}>
      Ini adalah area penjelasan atau deskripsi yang mengiringi judul bab.
    </p>
  </SeparatorFrame>
);

const Content: Page = () => (
  <ContentFrame>
    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: NAVY, fontFamily: GAMA }}>
      Bab Satu
    </div>
    <h1
      style={{
        fontFamily: GAMA,
        fontSize: 56,
        fontWeight: 700,
        lineHeight: 1.2,
        margin: '24px 0 0',
        color: TEXT,
      }}
    >
      Halaman Konten
    </h1>
    <div style={{ display: 'flex', gap: 48, marginTop: 56 }}>
      <div style={{ flex: 1, background: '#eef3f8', borderRadius: 8, padding: '40px 36px' }}>
        <div style={{ fontFamily: GAMA, fontSize: 30, fontWeight: 700, color: NAVY }}>Poin pertama</div>
        <p style={{ fontFamily: GAMA, fontSize: 26, color: MUTED, lineHeight: 1.5, marginTop: 14, marginBottom: 0 }}>
          Latar putih bersih, wordmark kecil di kanan atas, strip motto di bawah.
        </p>
      </div>
      <div style={{ flex: 1, background: '#eef3f8', borderRadius: 8, padding: '40px 36px' }}>
        <div style={{ fontFamily: GAMA, fontSize: 30, fontWeight: 700, color: NAVY }}>Poin kedua</div>
        <p style={{ fontFamily: GAMA, fontSize: 26, color: MUTED, lineHeight: 1.5, marginTop: 14, marginBottom: 0 }}>
          Tinggal pasang teks dan layout — bingkai resmi sudah diurus frame.
        </p>
      </div>
    </div>
  </ContentFrame>
);

const Closer: Page = () => (
  <ClosingFrame>
    <div style={{ fontFamily: GAMA, fontSize: 26, fontWeight: 700, letterSpacing: '0.22em', opacity: 0.85 }}>
      TERIMA KASIH
    </div>
    <h2 style={{ fontFamily: GAMA, fontSize: 84, fontWeight: 700, margin: '36px 0 0', lineHeight: 1.2, maxWidth: 1300 }}>
      Merakyat, Mandiri, Berkelanjutan
    </h2>
    <p style={{ fontFamily: GAMA, fontSize: 30, lineHeight: 1.5, marginTop: 32, opacity: 0.9 }}>
      Inclusive, Self-Reliant, Sustainable
    </p>
  </ClosingFrame>
);

export default [Cover, Separator, Content, Closer];
