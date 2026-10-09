---
name: UGM Heritage
description: Varian klasik dari Template 2 (varian 1) — navy pekat #00416B, garis emas horizontal penuh di dasar, hairline putih di atas judul, tipografi Gama Sans besar. Lebih tenang dan klasik dibanding ugm-midnight; tanpa pita vertikal.
mode: dark
---

# UGM Heritage

Diekstraksi dari "Template 2 — (NEW) Template Presentasi UGM 1 (Widescreen)". Varian tertua dari bahasa desain UGM: navy pekat polos, satu garis emas horizontal di tepi bawah, dan hairline putih pendek sebagai aksen judul.

## Palette

| Role     | Value     | Notes                                          |
| -------- | --------- | ---------------------------------------------- |
| bg       | `#00416b` | navy pekat latar penuh (slide 1 & 4 template)  |
| text     | `#ffffff` | teks utama                                     |
| accent   | `#fdd402` | emas — garis bawah penuh lebar (0.17 in ≈ 24 px) |
| muted    | `#b8cde0` | teks sekunder                                  |
| hairline | `rgba(255,255,255,0.85)` | garis tipis putih (0.85×0.04 in ≈ 122×6 px) |

## Typography

Sama dengan `ugm-official` — Gama Sans Bold/Regular/Light Italic dari `assets/fonts/`. Di template ini judul cover memakai Title Case besar putih; kutipan (slide 4) memakai Gama Sans Light Italic putih.

- Hero/cover: 68–80 px bold
- Judul konten: 48–56 px bold
- Body: 26–32 px muted
- Kutipan: Gama Sans Light Italic 32–36 px

## Layout

- **Cover**: wordmark putih kiri atas, hairline putih pendek (122×6 px) di kiri sebagai aksen di atas atau bawah judul, judul besar putih, garis emas penuh lebar di tepi bawah (24 px).
- **Konten**: navy penuh, judul putih + hairline emas pendek di bawahnya, isi di bawah.
- **Penutup**: navy penuh + garis emas bawah; tagline putih besar.

Tidak ada pita vertikal, tidak ada blok baja — ornamen hanya garis.

## Fixed components

Definisi jalan di `ugm-heritage.demo.tsx`:

- `HeritageCoverFrame` — navy + wordmark putih kiri atas + hairline putih + garis emas bawah penuh.
- `HeritageFrame` — navy + wordmark putih kecil kanan atas + garis emas bawah + strip motto putih.
- `HeritageClosingFrame` — navy + garis emas bawah, konten terpusat.
- `Title`, `Eyebrow` — putih / emas, Gama Sans.

## Motion

Static.

## Aesthetic

Klasik dan tenang — "jubah akademik": satu bidang navy, satu garis emas, huruf putih besar. Lebih resmi dan lebih sedikit ornamen dibanding ugm-midnight. Hindari: kotak/panel berwarna, gradien, bayangan, warna keempat, emoji.

## Example usage

```tsx
const Pembahasan: Page = () => (
  <HeritageFrame>
    <Eyebrow>Bab Tiga</Eyebrow>
    <Title>Pembahasan</Title>
    {/* isi */}
  </HeritageFrame>
);
```
