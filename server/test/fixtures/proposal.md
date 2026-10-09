# Pemodelan Topik Berita Politik dengan NMF

Proposal tesis Magister Ilmu Komputer, Universitas Gadjah Mada, 2026.

## Latar Belakang

Volume berita politik daring di Indonesia tumbuh pesat menjelang pemilu, sehingga pembaca sulit mengikuti pergeseran isu. Penelitian sebelumnya menunjukkan bahwa pemodelan topik dapat meringkas ribuan artikel menjadi belasan tema yang mudah dipahami. Namun sebagian besar studi memakai LDA, yang kurang stabil pada teks pendek seperti judul berita.

Non-negative Matrix Factorization (NMF) menawarkan topik yang lebih koheren pada korpus berukuran sedang. Studi ini memakai 48.213 artikel dari periode Oktober sampai Desember 2025.

## Rumusan Masalah

- Topik apa saja yang dominan dalam pemberitaan politik selama tiga bulan terakhir 2025?
- Bagaimana proporsi tiap topik bergeser dari minggu ke minggu?
- Seberapa koheren topik NMF dibandingkan LDA pada korpus yang sama?

## Metodologi

### Pengumpulan Data

Data diambil dari dataset Kaggle yang memuat judul, isi, tanggal, dan sumber berita. Duplikat dan artikel di bawah 50 kata dibuang.

### Prapemrosesan

Teks dibersihkan, di-stemming dengan Sastrawi, lalu diubah menjadi matriks TF-IDF dengan 20.000 fitur.

### Evaluasi

Koherensi diukur dengan metrik c_v dan NPMI, lalu dibandingkan dengan baseline LDA pada jumlah topik 10 sampai 30.

## Hasil Awal

Uji coba pada 5.000 artikel menghasilkan koherensi c_v 0,61 untuk NMF dan 0,52 untuk LDA pada 15 topik. Topik yang paling menonjol adalah koalisi partai, sengketa hasil pemilu, dan kebijakan subsidi energi {catatan: angka sementara}. Hasil ini <belum> final & masih perlu validasi.

## Jadwal

1. Pengumpulan dan pembersihan data selesai pada Januari 2026.
2. Eksperimen NMF dan LDA berlangsung Februari sampai Maret 2026.
3. Penulisan dan sidang direncanakan pada Mei 2026.

## Daftar Pustaka

Lee, D. D., & Seung, H. S. (1999). Learning the parts of objects by non-negative matrix factorization. Nature.
