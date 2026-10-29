# Pengumpulan UTS Pemrograman Web Dasar

## Identitas Mahasiswa

- Nama: Muhammad Nouval Zacky
- NIM: 2405101081
- Kelas: 5E
- Program Studi: Teknik Informatika
- Mata Kuliah: Pemrograman Web Dasar
- Tahun Akademik: 2026/2027

## Deskripsi

Repository ini berisi source code, dokumentasi hasil pengerjaan Ujian Tengah Semester (UTS)
mata kuliah Pemrograman Web Dasar.

## Deskripsi Pengerjaan UTS

Aplikasi yang dibuat adalah **ArenaKu**, website frontend untuk *Perancangan Aplikasi Website
Booking Lapangan Olahraga Online*. ArenaKu memungkinkan pengunjung menyewa lapangan (futsal,
mini soccer, badminton, tennis, padel, pickleball, basketball) dan mencari lawan sparring.
Pengunjung bisa menjelajah venue dan melihat jadwal ketersediaan **tanpa login**; login baru
diminta saat konfirmasi booking, membuat postingan sparring, atau menekan "Tantang / Bergabung".

Pengerjaan UTS berfokus pada frontend menggunakan HTML, CSS, dan JavaScript murni (tanpa framework
dan tanpa backend). Data venue dan sparring berupa data dummy pada file JSON terpisah (`data/`),
dengan cakupan Jawa Timur (prioritas Madiun, Magetan, Ngawi), Jawa Tengah, Jawa Barat, dan DKI
Jakarta. Tahap backend (PHP + MySQL) dikerjakan pada UAS.

## Fitur yang Diimplementasikan

1. **Landing page** responsif: hero interaktif dengan tab Sewa Lapangan / Sparring, statistik, cabang olahraga, venue populer per wilayah, preview sparring, cara booking, keunggulan, testimoni, FAQ, dan CTA.
2. **Navigasi utama**: Sewa Lapangan, Sparring, Jadwal Lapangan, Tentang Kami, serta tombol Masuk/Daftar.
3. **Sewa Lapangan**: pencarian, filter bertingkat Provinsi → Kota/Kabupaten, filter cabang olahraga dan rentang harga, serta pengurutan (rekomendasi Madiun, rating, harga).
4. **Kartu venue** gaya ayo.co.id: banner, label (COMING SOON / PROMO / cabang olahraga), nama, lokasi, rating dan jumlah ulasan, jenis olahraga, dan harga "Mulai RpXX.XXX / sesi".
5. **Detail venue dan kalender ketersediaan** per lapangan, tanggal, dan jam (slot tersedia / sudah dipesan / lewat), dapat dilihat tanpa login.
6. **Jadwal Lapangan**: halaman khusus untuk melihat ketersediaan slot per venue dan lapangan.
7. **Booking dengan login di akhir**: pilih satu atau beberapa jam berurutan, lalu popup login/daftar muncul saat menekan Konfirmasi Booking; dilanjutkan modal pembayaran dan kode booking. Slot yang sudah dibooking tidak bisa dipilih lagi.
8. **Sparring**: daftar slot terbuka, filter olahraga/level/biaya, buat postingan (tim, PIC, venue, tanggal, jam, olahraga, level skill, skema biaya), dan tombol "Tantang / Bergabung" yang meminta login saat ditekan.
9. Validasi form, perlindungan terhadap injeksi HTML pada input pengguna, dan tampilan responsif (ponsel, tablet, desktop).

## Struktur Folder

- `uts/`: Source code dan file pendukung UTS.
  - `index.html`: Landing page.
  - `venue.html`: Sewa Lapangan (daftar dan filter venue).
  - `detail.html`: Detail venue, kalender slot, dan booking.
  - `jadwal.html`: Jadwal Lapangan (pratinjau ketersediaan).
  - `sparring.html`: Sparring / cari lawan tanding.
  - `tentang.html`: Tentang Kami.
  - `css/style.css`: Seluruh gaya tampilan.
  - `js/app.js`: Modul bersama (data, navbar, modal login, kalender slot, kartu).
  - `js/home.js`, `js/venue.js`, `js/detail.js`, `js/jadwal.js`, `js/sparring.js`: Logika per halaman.
  - `data/venues.json`: Data dummy venue dan lapangan.
  - `data/sparring.json`: Data dummy slot sparring.
  - `assets/img/`: Tempat foto venue (opsional, lihat catatan di bawah).
- `uts/screenshots/`: Bukti visual hasil implementasi.

## Cara Menjalankan Aplikasi

Aplikasi membaca file JSON dengan `fetch()`, sehingga **harus dijalankan lewat server lokal**
(bukan klik ganda `index.html`). Pilih salah satu:

1. **VS Code**: pasang ekstensi *Live Server*, klik kanan `uts/index.html`, pilih *Open with Live Server*.
2. **Python**: buka terminal di folder `uts/`, jalankan `python -m http.server 8000`, lalu buka `http://localhost:8000`.

Tidak ada dependensi yang perlu dipasang dan tidak ada kredensial/API key. Login dan booking
bersifat simulasi frontend, data tersimpan di `localStorage` browser (kata sandi tidak disimpan).

Catatan: untuk memakai foto asli venue, isi field `foto` pada `data/venues.json` dengan path
gambar, misalnya `assets/img/pandawa.jpg`. Bila kosong, kartu memakai banner gradien dengan ikon olahraga.

## Screenshot

Screenshot hasil implementasi tersimpan di folder `uts/screenshots/`:
landing page, sewa lapangan, detail venue, popup login, konfirmasi booking, jadwal lapangan,
sparring, dan tampilan mobile.

## Referensi

- ayo.co.id (referensi alur dan tampilan kartu venue)
- gelora.id dan lapanganonline.com (referensi alur booking lapangan)
- MDN Web Docs: https://developer.mozilla.org

Seluruh data venue, rating, harga, dan alamat pada website ini adalah **data dummy** untuk keperluan tugas.
