---
name: UGM Midnight
description: Varian gelap identitas UGM dari Template PPT 2026 Opt-1 — latar navy #01416B penuh, aksen emas #FDD402, pita vertikal emas/navy, wordmark putih, strip motto putih di dasar. Untuk pembuka/penutup berdampak atau deck yang ingin tampil gelap namun tetap resmi.
mode: dark
---

# UGM Midnight

Diekstraksi dari "Template PPT 2026 — Opt-1 (Wide Size)". Berbeda dengan `ugm-official` (Opt-2, latar putih), varian ini memakai **navy penuh sebagai latar** dengan emas UGM sebagai aksen utama — persis geometri slide 1 dan slide 4 template Opt-1.

## Palette

| Role      | Value     | Notes                                             |
| --------- | --------- | ------------------------------------------------- |
| bg        | `#01416b` | navy UGM sebagai latar penuh (slide 1 & 4 Opt-1)  |
| text      | `#ffffff` | teks utama di atas navy                           |
| accent    | `#fdd402` | emas UGM — pita tepi, garis aksen, nomor          |
| muted     | `#bcd0e2` | teks sekunder di atas navy                        |
| steel     | `#1d4f80` | blok baja dekoratif (kotak 1.58×1.64 in di Opt-1) |
| hairline  | `#3a6490` | garis pemisah di atas navy                        |
| onLight   | `#0e2841` | teks gelap bila sebuah panel terang dipakai       |

## Typography

Sama dengan `ugm-official` — Gama Sans (Bold 700 judul, Regular 400 isi, Light/Light Italic kutipan), Gama Serif opsional. Font dimuat dari `assets/fonts/` dengan pola FontLoader yang sama. Perbedaan hanya warna: semua teks default putih/muted di atas navy.

- Hero/cover: 64–76 px bold, putih
- Judul konten: 48–56 px bold, putih
- Body: 26–32 px, `#bcd0e2`
- Kutipan: Gama Sans Light Italic 30–34 px, putih (slide 4 Opt-1 memakai pola ini)

## Layout

- Kanvas 1920 × 1080. Konten padding 120–200 px.
- **Cover Opt-1**: wordmark putih kiri atas (± 386 px di 94,80), blok baja kecil kanan atas (± 227×236 px di 1320,29), pita emas vertikal tebal di tepi kanan (± 258 px penuh tinggi), garis aksen putih tipis di atas judul (122×6 px), teks `ugm.ac.id` dan strip motto di dasar.
- **Konten**: navy penuh; judul putih di atas; panel konten boleh memakai `steel` transparan atau garis `hairline`.
- **Penutup**: navy penuh + pita emas horizontal tipis di dasar (slide 4 Opt-1: 13.33×0.19 in ≈ penuh lebar × 27 px).

## Fixed components

Definisi jalan ada di `ugm-midnight.demo.tsx`. Ringkasannya:

### MidnightFrame (latar dasar semua halaman)

Navy penuh + wordmark putih kecil kanan atas + strip motto terang di dasar. Anak diletakkan di area padding.

### MidnightCoverFrame

Tambahan di atas MidnightFrame: pita emas vertikal kanan (258 px), blok baja kanan atas, garis aksen emas di atas judul, wordmark putih besar kiri atas, badge `ugm.ac.id`.

### MottoStripLight

Bar dasar dengan garis emas 6 px di tepi atasnya; teks putih: "Merakyat, Mandiri, Berkelanjutan | Inclusive, Self-Reliant, Sustainable | n/total".

### Title / Eyebrow

```tsx
const Title = ({ children }: { children: React.ReactNode }) => (
  <h1 style={{ fontFamily: "'Gama Sans', Arial, sans-serif", fontSize: 64, fontWeight: 700, lineHeight: 1.2, margin: 0, color: '#ffffff' }}>
    {children}
  </h1>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: "'Gama Sans', Arial, sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fdd402' }}>
    {children}
  </div>
);
```

## Motion

Static — sama seperti tema resmi lainnya. Latar gelap sudah cukup teatrikal tanpa animasi.

## Aesthetic

Formal namun teatrikal: navy pekat, emas satu aksen, tipografi putih besar. Cocok untuk pembuka konferensi, keynote, atau penutup sidang. Hindari: panel putih besar (merusak suasana gelap), warna ketiga selain navy/emas/putih/baja, dan emoji.

## Example usage

```tsx
const Pembuka: Page = () => (
  <MidnightCoverFrame>
    <Eyebrow>Sidang Terbuka</Eyebrow>
    <Title>Judul Presentasi di Atas Navy UGM</Title>
    <p style={{ fontSize: 30, color: '#bcd0e2', marginTop: 28, maxWidth: 1100, lineHeight: 1.5, fontFamily: "'Gama Sans', Arial, sans-serif" }}>
      Sub-judul dengan teks sekunder kebiruan.
    </p>
  </MidnightCoverFrame>
);
```
