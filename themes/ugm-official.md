---
name: UGM Official
description: Identitas visual resmi Universitas Gadjah Mada untuk presentasi akademik — navy UGM #01416B, font Gama Sans/Serif, strip motto "Merakyat, Mandiri, Berkelanjutan", wordmark UGM. Cocok untuk sempro, sidang, dan presentasi institusional UGM.
mode: light
---

# UGM Official

Diekstraksi dari template resmi "Template PPT UGM" (Template PPT 2026, Opt-2 Wide). Semua token di bawah berasal dari file template tersebut, bukan rekaan.

## Palette

| Role        | Value     | Notes                                              |
| ----------- | --------- | -------------------------------------------------- |
| bg          | `#ffffff` | latar halaman (master bg1)                         |
| text        | `#0e2841` | teks utama (theme dk1, navy sangat gelap)          |
| accent      | `#01416b` | navy UGM — warna dominan layout resmi (9 kemunculan di tiap layout) |
| muted       | `#5a6b7d` | teks sekunder, footer                              |
| hairline    | `#c9d6e3` | garis pemisah tipis                                |
| panel       | `#eef3f8` | panel konten terang (turunan bg + tint accent)     |
| accentSoft  | `#d7e3ee` | panel sorotan beraksen                             |
| onAccent    | `#ffffff` | teks di atas blok accent                           |
| gold        | `#fdd402` | emas UGM — aksen resmi di cover/separator (pita tepi, blok separator) |
| navyDeep    | `#0e426b` | navy badge `ugm.ac.id` pada cover/separator        |

Warna sekunder yang muncul di theme Office template (opsional, hanya untuk kategori/seri data): `#e97132` (oranye), `#156082` (biru baja). Jangan dipakai untuk elemen identitas — identitas UGM = `#01416b` + aksen emas `#fdd402`.

## Typography

- Display font: `'Gama Sans', 'Gama-Sans', Arial, sans-serif` — weight 700 (Bold) untuk judul. Di template, judul memakai Gama Sans Bold, Title Case.
- Body font: `'Gama Sans', Arial, sans-serif` — weight 400 (Regular); Light dan Light Italic untuk kutipan; Italic untuk penekanan.
- Serif pendamping (opsional, untuk pull-quote besar): `'Gama Serif', Georgia, serif`.
- **Font wajib dimuat dari file lokal** — Gama Sans bukan Google Font. File `.otf` sudah disalin ke `assets/fonts/` di workspace root. Injeksi `@font-face` sekali di top-level modul slide (lihat snippet FontLoader di Fixed components). Weight yang dipakai: 300 (light), 400, 400-italic, 700. Lihat `references/webfonts.md` di `open-slide-authoring` untuk aturan injeksi (create-or-update, id di-key ke slide).
- Type-scale overrides (dikonversi dari pt template ke px canvas 1920×1080; 1 pt ≈ 2 px):
  - Hero/judul cover: 60–72 px bold (template 30 pt)
  - Judul section/separator: 72–88 px bold (template 44 pt master title, tetapi separator resmi memakai blok besar)
  - Judul halaman konten: 44–52 px bold (template 24 pt)
  - Body level 1: 32–36 px (template 28 pt ≈ 56 px di layar lebar; turunkan untuk keterbacaan)
  - Body level 2: 28 px
  - Caption/footer: 20–24 px (template 15 pt)
  - Motto strip: 24 px (template 18 pt)

## Layout

- Kanvas 1920 × 1080 (16:9, sesuai Wide template 13.33 × 7.5 in).
- Konten padding: 120 px dari tepi; area teks template dimulai ± 1.67 in ≈ 240 px pada cover — untuk cover boleh lebih lega.
- **Cover resmi**: wordmark UGM di kiri atas (± 90, 88 px dari tepi, lebar ± 460 px), judul besar di area tengah-kanan, subjudul di bawahnya, strip motto di bawah, `ugm.ac.id` kecil di kiri bawah.
- **Separator bab**: judul bab besar kiri-atas dengan blok aksen, sub-bab di bawahnya.
- **Halaman konten**: judul di atas, konten di bawah, footer strip motto selalu ada di bawah (lihat Footer).
- Alignment: rata kiri; tengah hanya untuk cover alternatif dan penutup.

## Background frames (dasar template — tinggal pasang teks & layout)

Empat bingkai latar resmi, direplika dari geometri template PPT UGM. Definisi lengkapnya ada di `ugm-official.demo.tsx` — salin verbatim ke slide yang memakai tema ini. Pemakaian: bungkus konten halaman, tidak perlu mengatur chrome apa pun.

| Frame | Meniru | Isi latar |
| ----- | ------ | --------- |
| `<CoverFrame>` | Slide 1 resmi | Foto kampus full-bleed (`@assets/ugm-cover-photo.jpg`), wordmark besar kiri atas (± 413 px di 68,63), pita emas/navy di tepi kanan (32 px), badge navy `ugm.ac.id` kiri bawah, strip motto. Judul/subjudul diletakkan di atas panel putih semi-transparan (`rgba(255,255,255,0.88)`) agar terbaca di atas foto. |
| `<SeparatorFrame>` | Slide 2 resmi | Putih; blok emas kiri (31.5%) + blok navy kanan (68.5%) setinggi 245 px menempel di atas strip motto; wordmark kecil kanan atas; badge `ugm.ac.id` di atas blok emas. |
| `<ContentFrame>` | Layout "Title and Content" | Putih polos; wordmark kecil kanan atas (230 px di 84,35); strip motto. Ini default untuk semua halaman isi. |
| `<ClosingFrame>` | Penutup | Navy penuh dengan pita emas tepi kanan; konten terpusat. |

Elemen chrome bersama (sudah termasuk di frame): `MottoStrip` — bar navy 56 px di bawah berisi "Merakyat, Mandiri, Berkelanjutan | Inclusive, Self-Reliant, Sustainable | n / total" (nomor halaman via `useSlidePageNumber()`), dan `RightEdge` — pita vertikal emas (atas, 58% tinggi) + navy (bawah, 42%) selebar 32 px.

Aset yang dibutuhkan di workspace `assets/`: `ugm-wordmark.png` (logo lockup, sudah ada), `ugm-cover-photo.jpg` (foto kampus dari template, sudah ada), `fonts/*.otf` (sudah ada).

Contoh pemakaian:

```tsx
const Pendahuluan: Page = () => (
  <ContentFrame>
    <Eyebrow>Bab Satu</Eyebrow>
    <Title>Pendahuluan</Title>
    {/* ...isi halaman... */}
  </ContentFrame>
);
```

## Fixed components

Paste-ready. Komponen ini mengasumsikan `@font-face` Gama sudah dimuat via `FontLoader` di bawah.

### FontLoader (wajib, top-level modul)

```tsx
const FONT_STYLE_ID = 'osd-gama-fonts'; // tambahkan suffix id slide bila perlu
const FONT_CSS = `
@font-face { font-family: 'Gama Sans'; src: url('@assets/fonts/Gama-Sans-Regular.otf'); font-weight: 400; }
@font-face { font-family: 'Gama Sans'; src: url('@assets/fonts/Gama-Sans-light.otf'); font-weight: 300; }
@font-face { font-family: 'Gama Sans'; src: url('@assets/fonts/Gama-Sans-Bold.otf'); font-weight: 700; }
@font-face { font-family: 'Gama Sans'; src: url('@assets/fonts/Gama-Sans-Italic.otf'); font-weight: 400; font-style: italic; }
@font-face { font-family: 'Gama Serif'; src: url('@assets/fonts/Gama-Serif-Regular.otf'); font-weight: 400; }
@font-face { font-family: 'Gama Serif'; src: url('@assets/fonts/Gama-Serif-Bold.otf'); font-weight: 700; }
`;
```

Catatan implementasi: `url('@assets/...')` di dalam string CSS tidak di-resolve bundler. Saat memakai di slide nyata, import file font sebagai modul (`import gamaSansRegular from '@assets/fonts/Gama-Sans-Regular.otf'`) lalu bangun `FONT_CSS` dengan template literal mengganti tiap `url(...)`. Injeksi sekali dengan pola create-or-update dari `references/webfonts.md` (lihat `ugm-official.demo.tsx` untuk contoh jalan).

### Title

```tsx
const Title = ({ children }: { children: React.ReactNode }) => (
  <h1
    style={{
      fontFamily: "'Gama Sans', Arial, sans-serif",
      fontSize: 64,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      margin: 0,
      color: '#0e2841',
    }}
  >
    {children}
  </h1>
);
```

### Footer (strip motto UGM — dari layout resmi)

Bar biru `#01416b` di bagian bawah berisi motto institusi. Ada di semua layout resmi; selalu pasang di halaman konten.

```tsx
import { useSlidePageNumber } from '@open-slide/core';

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 56,
        background: '#01416b',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 120px',
        fontSize: 24,
        fontFamily: "'Gama Sans', Arial, sans-serif",
      }}
    >
      <span>Merakyat, Mandiri, Berkelanjutan</span>
      <span style={{ opacity: 0.85 }}>Inclusive, Self-Reliant, Sustainable</span>
      <span>{current} / {total}</span>
    </div>
  );
};
```

### Eyebrow

```tsx
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontFamily: "'Gama Sans', Arial, sans-serif",
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: '#01416b',
    }}
  >
    {children}
  </div>
);
```

### Wordmark

```tsx
import wordmark from '@assets/ugm-wordmark.png';

const Wordmark = () => (
  <img src={wordmark} alt="Universitas Gadjah Mada" style={{ width: 460, height: 'auto' }} />
);
```

## Motion

- Philosophy: **static**. Template resmi UGM tidak memakai animasi; deck institusional (sempro/sidang) mengutamakan ketenangan. Jika pengguna memaksa, batasi pada fade halus 200–250 ms antar halaman (`SlideTransition` family "fade"), jangan stagger, jangan keyframes dekoratif.

## Aesthetic

Formal-akademik institusional: putih bersih, navy UGM sebagai satu-satunya warna identitas, tipografi Gama Sans Bold yang tegas, dan strip motto sebagai satu-satunya elemen dekoratif berulang. Hindari: gradien, bayangan, rounded besar (radius maksimal 8 px), ikon dekoratif, warna selain navy/netral pada elemen struktural, dan emoji. Elegansi datang dari disiplin grid dan ruang napas, bukan ornamen.

## Example usage

```tsx
const Cover: Page = () => (
  <div style={{ width: '100%', height: '100%', background: '#ffffff', color: '#0e2841', position: 'relative', padding: '88px 120px' }}>
    <Wordmark />
    <div style={{ marginTop: 180, maxWidth: 1400 }}>
      <Title>Judul Presentasi Title Case Menggunakan Gama Sans Bold</Title>
      <p style={{ fontSize: 32, color: '#5a6b7d', marginTop: 36, lineHeight: 1.5, fontFamily: "'Gama Sans', Arial, sans-serif" }}>
        Ruang untuk sub-judul sebagai pelengkap judul utama di atas.
      </p>
    </div>
    <div style={{ position: 'absolute', left: 120, bottom: 90, fontSize: 22, color: '#5a6b7d' }}>ugm.ac.id</div>
    <Footer />
  </div>
);
```
