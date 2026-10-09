# Progress Slidoo — Google login + deck per pemilik

> Update terakhir: 2026-10-09.
> **Penting:** salinan lokal ini tertinggal. HEAD lokal = `e5a9597` (upload flow).
> Pekerjaan Google login **belum ada di sini** — ada di server `/home/magangbtd/slidoo`,
> branch `feature/google-login`, commit terakhir `3b577e8`. Sinkronkan dulu sebelum
> menyunting di lokal.

## Selesai & terbukti (di server, terdeploy)

- Login Google UGM dengan OAuth client **khusus Slidoo** (bukan Pandora/UGM Analytics).
- PKCE S256, `nonce`, `state`, session cookie HMAC httpOnly.
- Domain: `ugm.ac.id`, `mail.ugm.ac.id`; `email_verified` wajib `true`.
- Portal login wajib sebelum aplikasi — open-slide tidak dimuat tanpa sesi.
- Isolasi deck per pemilik lewat `meta.json` (`owner`).
- API: `GET /api/decks` → 401 tanpa sesi; `DELETE /api/decks/<id>` → 404 untuk deck orang lain.
- Halaman "Deck ini privat" pada `/s/<id>`.
- Tombol hapus per kartu + panel kelola (`slidoo-signin` 15, `slidoo-deck-delete` 6).
- Tes: auth 9/9, HTTP 24/24, penuh di image Docker 39/39.
- `.gitignore`: `.env`, `slides/`, `.slidoo/`.

## Belum terbukti — Tahap 1 (panel daftar deck per-user)

Tujuan: ganti grid bawaan open-slide (menampilkan **semua** deck) dengan daftar deck sendiri.

- Blok `<script>` panel **sudah diuji berdiri sendiri di Mac**: sintaks OK + uji DOM lulus
  (panel tampil, 2 deck dirender, `href` = `/slidoo/s/<id>`, tombol Hapus ada).
- **Belum tersambung ke halaman.** `MY_DECKS` didefinisikan di `publish.mjs:186`, tetapi
  baris 376 hanya memasang `UPLOAD_LINK` + `MANAGE_PANEL`.
- Bukti: marker ada di file & image (20), tetapi **0** di `.slidoo/builds/<n>/index.html`;
  `curl /slidoo/ | grep -c slidoo-my-decks` → `0`.
- Grid bawaan open-slide masih tampil; memfilter API tidak mengubahnya.

## Fakta arsitektur

1. Halaman utama disajikan dari **build statis** `.slidoo/builds/<n>`, bukan dirender per
   permintaan. Ubah `publish.mjs` saja tidak mengubah halaman sampai build dijalankan ulang;
   restart container memicu build baru.
2. `publish.mjs` tetap tempat yang benar — dialah yang merakit HTML.
3. Grid deck dibuat `open-slide build` (memindai seluruh `slides/`), tidak bisa difilter
   per pengguna di sana.
4. `docker compose up -d --build` bisa memakai layer `CACHED`; verifikasi isi image dengan
   `docker run --rm slidoo:local grep ...`.

## Langkah berikutnya

1. Sambungkan: baris 376 → `` html.replace('</body>', `${MY_DECKS(this.config.base)}${UPLOAD_LINK(this.config.base)}${MANAGE_PANEL(this.config.base)}</body>`) ``
2. Uji **HTML hasil rakitan** (bukan blok terpisah): `count('slidoo-my-decks') >= 5` +
   `node --check` tiap blok `<script>`.
3. `docker compose up -d --build slidoo` → `grep -c slidoo-my-decks` pada build terbaru ≥ 1.
4. Uji jalur: `root=200`, `authme=200`, `decks=401`.
5. Tes penuh di image (`node --test`).
6. Buka `https://dts-lab.web.id/slidoo/` — pastikan grid tergantikan daftar deck sendiri.
7. Tahap 2 (bila perlu): folder slide per pengguna + build per pengguna.
8. Belum ada push branch `feature/google-login` ke remote.

## Pelajaran teknis (mahal)

1. **Uji HTML hasil rakitan, bukan blok terpisah** — kesalahan "didefinisikan tapi tidak
   dipasang" lolos dua kali.
2. Backslash di template literal `publish.mjs` harus `\\`; menulis `\/` merusak **seluruh**
   blok `<script>` (gejala senyap: skrip ada di DOM, tidak berefek).
3. Hindari regex berisi slash di dalam template; pakai `indexOf`/`slice`/`split`.
4. Komentar `// x` tanpa newline sebelum `const` menelan deklarasi → `ReferenceError` →
   server tidak membalas → Cloudflare **502**.
5. Jangan bikin penanda substitusi sendiri (`%BASE%`); pakai `${JSON.stringify(base)}`.
6. Lebih aman menambah blok `<script>` baru daripada memecah IIFE yang ada.

## Percobaan yang di-rollback

Patch Tahap 1 pertama (penanda `%BASE%` + regex merusak blok script) — dibatalkan dengan
`git checkout -- server/src/publish.mjs`; `node --check` lolos (`PUBLISH OK`).

## Catatan keamanan

- `.env` (600) memuat credential OAuth dan session secret. Jangan dibaca, dicetak, atau
  di-commit; selalu `[REDACTED]`.
- Deck pengguna (`slides/`) adalah data runtime — jangan dipindah/migrasi tanpa
  pencadangan dan persetujuan eksplisit.
