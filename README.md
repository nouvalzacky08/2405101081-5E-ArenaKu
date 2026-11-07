# Pengumpulan UTS Pemrograman Web Dasar

## Identitas Mahasiswa

- Nama: Muhammad Nouval Zacky
- NIM: 2405101081
- Kelas: 5E
- Program Studi: [ISI PROGRAM STUDI]
- Mata Kuliah: Pemrograman Web Dasar
- Tahun Akademik: 2026/2027

## Deskripsi

Repository ini berisi source code, dokumentasi hasil pengerjaan Ujian Tengah Semester (UTS)
mata kuliah Pemrograman Web Dasar.

## Deskripsi Pengerjaan UTS

Aplikasi yang dibuat adalah **ArenaKu**, website frontend untuk *Perancangan Aplikasi Website
Booking Lapangan Olahraga Online*. ArenaKu memungkinkan pengunjung menyewa lapangan (futsal,
mini soccer, badminton, tennis, padel, pickleball, basketball) dan mencari lawan sparring.
Pengunjung bisa menjelajah venue dan melihat jadwal **tanpa login**; login baru diminta saat
konfirmasi booking, membuat postingan sparring, atau menekan "Tantang / Bergabung".

Pengerjaan berfokus pada frontend (HTML, CSS, JavaScript murni, tanpa framework dan backend).
Data berupa data dummy pada file JSON (`data/`) dengan cakupan **seluruh Pulau Jawa**
(40 venue dengan 96 lapangan, 6 provinsi, 30 kota/kabupaten; prioritas Madiun, Magetan, Ngawi). Login, role, dan
booking disimulasikan di browser memakai `localStorage`; tahap backend (PHP + MySQL) dikerjakan pada UAS.

## Fitur yang Diimplementasikan

1. **Landing page** responsif: hero dengan tab Sewa Lapangan / Sparring, statistik, cabang olahraga, venue populer per wilayah, preview sparring, cara booking, FAQ.
2. **Autentikasi dan role (User / Admin)**: popup Masuk/Daftar (validasi email, HP, kata sandi di-hash SHA-256). Akun admin default tersedia untuk pengujian (lihat bagian Akun Demo). Admin tidak dapat memesan lapangan, dan halaman admin tidak dapat dibuka oleh user biasa.
3. **Kode booking unik** (`ARK-XXXXXX`) dibuat otomatis setiap booking dan ditampilkan saat check-in/pembayaran berhasil.
4. **Kalender booking interaktif**: tampilan satu bulan penuh, tombol/swipe ke bulan berikutnya, harga per hari (akhir pekan +25%), tanggal mengikuti waktu perangkat secara real-time, tanggal yang sudah lewat tidak bisa dipilih, rentang pemesanan maksimal 1 tahun.
5. **Halaman Profil**: data akun, ubah nama/HP/kata sandi, **Riwayat Booking** (dengan kode dan status), **Riwayat Sparring** (termasuk lawan/penantang), pembatalan booking aktif, hapus riwayat satuan atau **Hapus Semua Riwayat**. Tombol **Keluar (Logout)** ada di menu profil.
6. **Dashboard Admin**: statistik, tabel pemesanan (Nama, Tanggal Main, Lapangan, Kode Booking, Status Pending/Selesai), cari dan filter, check-in cepat dengan kode booking, verifikasi pembayaran, pembatalan, daftar sparring, pesan masuk, dan daftar pengguna.
7. **Galeri foto lapangan**: slider dengan tombol panah, thumbnail, swipe, dan lightbox (perbesar, keyboard Esc/panah). Bila foto belum diisi, ditampilkan ilustrasi lapangan bawaan.
8. **Sewa Lapangan**: pencarian, filter Provinsi → Kota, cabang olahraga, harga, pengurutan, dan tombol "Tampilkan lebih banyak" (12 venue per halaman).
9. **Detail venue**: galeri, tautan Google Maps, fasilitas, tabel harga per lapangan (hari biasa/akhir pekan), aturan, kalender, dan pilihan jam berurutan. Slot yang sudah dipesan tidak bisa dipilih lagi.
10. **Sparring**: daftar slot terbuka, filter, buat postingan, dan tombol Tantang/Bergabung (login diminta saat ditekan).
11. **Jadwal Lapangan** berbasis kalender, **Tentang Kami**, dan **Kontak Kami** (formulir tervalidasi dengan verifikasi hitung sederhana; pesan tampil di dashboard admin).
12. Validasi form, escape input terhadap injeksi HTML, dan tampilan responsif (ponsel, tablet, desktop).
13. **Mode gelap dan animasi**: tombol tema terang/gelap di navbar (pilihan tersimpan dan mengikuti pengaturan perangkat), transisi halus, kartu muncul bertahap, bagian halaman muncul saat di-scroll, angka statistik berhitung naik, dan *skeleton loading* saat data dimuat. Animasi otomatis dimatikan untuk pengguna yang memilih "kurangi gerakan".
14. **Bukti booking (cetak / PDF) dengan QR Code**: halaman `bukti.html` berisi kode booking unik, detail pesanan, dan QR Code (dibuat dengan kode sendiri di `js/qr.js`, tanpa library). Tombol "Cetak / Simpan PDF" memakai dialog cetak browser (pilih *Save as PDF*). Hanya pemilik booking dan admin yang dapat membukanya. Admin dapat menempel isi QR (`ARENAKU:ARK-XXXXXX`) ke kolom check-in.
15. **Ulasan dan rating**: setelah booking berstatus Selesai, user dapat memberi 1-5 bintang dan komentar (dari Profil atau halaman venue), mengubah, atau menghapusnya. Rating venue dihitung gabungan dari data dummy dan ulasan nyata, dan admin dapat memoderasi ulasan.
16. **Chat sparring**: penantang dapat chat dengan PIC, dan pembuat postingan dapat chat dengan setiap penantang (modal chat, pesan cepat, penanda mengetik). Pesan tersimpan di browser. Untuk postingan contoh, balasan PIC dibuat otomatis (simulasi).
17. **Grafik dashboard admin**: pendapatan per bulan (6 bulan terakhir) dan jumlah booking per olahraga, dibuat dengan SVG murni, lengkap dengan tooltip dan tampilan tabel.

## Akun Demo (Hanya untuk Pengujian)

| Role | Username | Kata sandi |
| --- | --- | --- |
| Admin | `admin_arenaku` | `admin123` |
| User | daftar sendiri lewat tombol Daftar | bebas (min. 6 karakter) |

Akun admin ini hanya akun simulasi frontend untuk keperluan penilaian, bukan kredensial sungguhan.
Di dashboard admin tersedia tombol **Tambah Data Contoh** (mengisi booking dummy) dan **Reset Data Demo**.

## Struktur Folder

- `uts/`: Source code dan file pendukung UTS.
  - `index.html`: Landing page.
  - `venue.html`: Sewa Lapangan (daftar dan filter venue).
  - `detail.html`: Detail venue, galeri, kalender, dan booking.
  - `jadwal.html`: Jadwal Lapangan.
  - `sparring.html`: Sparring / cari lawan tanding.
  - `profil.html`: Profil user, riwayat booking dan sparring, logout.
  - `admin.html`: Dashboard Admin.
  - `bukti.html`: Bukti booking (cetak/PDF) dengan QR Code.
  - `kontak.html`: Kontak Kami.
  - `tentang.html`: Tentang Kami.
  - `css/style.css`: Seluruh gaya tampilan.
  - `js/app.js`: Modul bersama (data, auth/role, navbar, modal, booking, kartu).
  - `js/calendar.js`: Komponen kalender bulanan.
  - `js/gallery.js`: Komponen galeri slider dan lightbox.
  - `js/theme.js`: Penerap tema terang/gelap (dimuat di `<head>`).
  - `js/qr.js`: Pembuat QR Code.
  - `js/chat.js`: Chat sparring.
  - `js/charts.js`: Grafik SVG dashboard admin.
  - `js/bukti.js`: Logika halaman bukti booking.
  - `js/home.js`, `venue.js`, `detail.js`, `jadwal.js`, `sparring.js`, `profil.js`, `admin.js`, `kontak.js`: Logika per halaman.
  - `data/venues.json`: Data dummy venue dan lapangan (40 venue, 96 lapangan, se-Jawa).
  - `data/sparring.json`: Data dummy slot sparring.
  - `assets/img/`: Tempat foto venue; `assets/img/default/` berisi ilustrasi lapangan bawaan (SVG).
  - `screenshots/`: Bukti visual hasil implementasi.

## Cara Menjalankan Aplikasi

Aplikasi membaca file JSON dengan `fetch()`, sehingga **harus dijalankan lewat server lokal**
(bukan klik ganda `index.html`):

1. **VS Code**: pasang ekstensi *Live Server*, klik kanan `uts/index.html`, pilih *Open with Live Server*.
2. **Python**: buka terminal di folder `uts/`, jalankan `python -m http.server 8000`, lalu buka `http://localhost:8000`.

Tidak ada dependensi dan tidak ada API key. Data akun, booking, dan pesan tersimpan di
`localStorage` browser (kata sandi hanya disimpan dalam bentuk hash).

**Menambah foto lapangan:** simpan gambar di `uts/assets/img/`, lalu isi array `foto` pada
`data/venues.json`, misalnya `"foto": ["assets/img/pandawa-1.jpg", "assets/img/pandawa-2.jpg"]`.
Semua foto otomatis tampil pada galeri slider di halaman detail venue.

## Screenshot

Screenshot tersimpan di folder `uts/screenshots/`:

| No | Berkas | Keterangan |
| --- | --- | --- |
| 1 | `01-landing.png` | Landing page |
| 2 | `02-sewa-lapangan.png` | Sewa Lapangan (filter dan kartu venue) |
| 3 | `03-detail-kalender-galeri.png` | Detail venue: galeri dan kalender bulanan |
| 4 | `04-lightbox.png` | Lightbox foto |
| 5 | `05-login-popup.png` | Popup login saat konfirmasi booking |
| 6 | `06-konfirmasi-booking.png` | Konfirmasi/pembayaran booking |
| 7 | `07-kode-booking.png` | Kode booking unik |
| 8 | `08-profil-menu.png` | Menu profil dengan Keluar |
| 9 | `09-riwayat.png` | Riwayat booking dan sparring |
| 10 | `10-jadwal.png` | Jadwal Lapangan |
| 11 | `11-sparring.png` | Sparring |
| 12 | `12-dashboard-admin.png` | Dashboard Admin |
| 13 | `13-kontak.png` | Kontak Kami |
| 14 | `14-mobile-detail.png` | Tampilan mobile |
| 15 | `15-bukti-booking.png` | Bukti booking dengan QR Code |
| 16 | `16-mode-gelap.png` | Mode gelap (Sewa Lapangan) |
| 17 | `17-chat-sparring.png` | Chat sparring |
| 18 | `18-form-ulasan.png` | Form ulasan dan rating |
| 19 | `19-ulasan-venue.png` | Ulasan pengguna di halaman venue |
| 20 | `20-admin-gelap.png` | Dashboard admin dengan grafik (mode gelap) |

## Referensi

- ayo.co.id (hanya inspirasi alur, kartu venue, galeri, dan halaman kontak; tampilan dibuat sendiri)
- gelora.id dan lapanganonline.com (referensi alur booking lapangan)
- MDN Web Docs: https://developer.mozilla.org

Seluruh data venue, rating, harga, dan alamat pada website ini adalah **data dummy** untuk keperluan tugas.
