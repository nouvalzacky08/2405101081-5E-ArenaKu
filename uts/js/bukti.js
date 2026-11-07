"use strict";
/* ArenaKu - bukti.js: bukti booking yang bisa dicetak atau disimpan sebagai PDF (lewat dialog cetak browser).
   Berisi kode booking unik dan QR Code. Hanya pemilik booking (atau admin) yang dapat membukanya. */
(async () => {
  const { $, esc, rupiah } = App;
  const root = $("#bukti-root");
  const me = App.getUser();
  const kode = (App.qs().get("kode") || "").trim().toUpperCase();

  const pesan = (ikon, judul, teks, tombol = "") =>
    (root.innerHTML = `<div class="akses-ditolak"><div class="big">${ikon}</div><h2>${judul}</h2><p class="muted" style="margin:8px 0 18px">${teks}</p>${tombol}</div>`);

  if (!me) {
    pesan("🔒", "Masuk untuk melihat bukti booking", "Bukti booking hanya bisa dibuka oleh pemiliknya.", '<button type="button" class="btn btn-primary" id="b-masuk">Masuk</button>');
    $("#b-masuk").addEventListener("click", () => App.openAuth("login", () => location.reload()));
    return;
  }
  const b = App.getBookings().find((x) => x.kode === kode);
  if (!b) { pesan("🔎", "Booking tidak ditemukan", `Kode “${esc(kode || "-")}” tidak ada di data browser ini.`, '<a class="btn btn-outline" href="profil.html#riwayat">Ke Riwayat</a>'); return; }
  if (me.role !== "admin" && b.email !== me.email) { pesan("⛔", "Akses ditolak", "Bukti ini milik pengguna lain.", '<a class="btn btn-outline" href="index.html">Ke Beranda</a>'); return; }

  const venues = await App.getVenues();
  const v = venues.find((x) => x.id === b.venueId);
  document.title = `Bukti ${b.kode} - ArenaKu`;
  const batal = b.status === "Dibatalkan";
  const payload = `ARENAKU:${b.kode}`;

  root.innerHTML = `
    <div class="bukti-aksi no-print">
      <a class="btn btn-outline btn-sm" href="${me.role === "admin" ? "admin.html" : "profil.html#riwayat"}">← Kembali</a>
      <button type="button" class="btn btn-primary" id="btn-cetak">🖨 Cetak / Simpan PDF</button>
    </div>
    <article class="ticket">
      ${batal ? '<div class="cap-batal">DIBATALKAN</div>' : ""}
      <div class="ticket-head"><span class="logo">Arena<span>Ku</span></span><div style="text-align:right"><strong>BUKTI BOOKING LAPANGAN</strong><br><small>Dicetak ${esc(App.fmtWaktu(new Date().toISOString()))}</small></div></div>
      <div class="ticket-body">
        <div>
          <span class="muted small">Kode booking</span>
          <div class="ticket-kode">${esc(b.kode)}</div>
          <h2>${esc(b.venueNama)}</h2>
          <p class="muted" style="margin-bottom:12px">${esc(b.lapNama)}${v ? " · " + esc(v.kota) : ""}</p>
          <dl class="dl">
            <dt>Atas nama</dt><dd>${esc(b.nama || "-")}</dd>
            <dt>Tanggal main</dt><dd>${esc(App.fmtTanggal(b.tanggal))}</dd>
            <dt>Jam</dt><dd>${App.jamRange(b.jam)} (${b.jam.length} jam)</dd>
            <dt>Alamat</dt><dd>${v ? esc(v.alamat) : "-"}</dd>
            <dt>Total</dt><dd><strong>${rupiah(b.total)}</strong> · ${esc(b.metode)}</dd>
            <dt>Pembayaran</dt><dd><span class="pill ${b.bayar === "Lunas" ? "st-lunas" : "st-menunggu"}">${esc(b.bayar)}</span></dd>
            <dt>Status</dt><dd><span class="pill ${{ Pending: "st-pending", Selesai: "st-selesai", Dibatalkan: "st-batal" }[b.status]}">${esc(b.status)}</span>${b.hadir ? ' <span class="pill st-selesai">Hadir</span>' : ""}</dd>
            <dt>Dipesan</dt><dd>${esc(App.fmtWaktu(b.dibuat))}</dd>
          </dl>
        </div>
        <div class="ticket-qr">${App.qrSvg(payload, { ukuran: 170 })}<small>Tunjukkan QR atau kode ini kepada petugas saat check-in.</small></div>
      </div>
      <div class="ticket-foot"><strong>Ketentuan</strong>
        <ul><li>Datang minimal 10 menit sebelum jadwal.</li><li>Bukti ini hanya berlaku untuk tanggal dan jam di atas.</li><li>Dokumen ini dibuat dari data simulasi (tugas UTS), bukan transaksi sungguhan.</li></ul></div>
    </article>`;
  $("#btn-cetak").addEventListener("click", () => window.print());
})();
