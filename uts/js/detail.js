"use strict";
/* ArenaKu - detail.js: detail venue (galeri slider), kalender bulanan, slot jam, booking.
   Pengunjung bebas melihat semuanya; login baru diminta saat menekan Konfirmasi Booking. */
(async () => {
  const { $, esc, rupiah } = App;
  const root = $("#detail-root");
  const venues = await App.getVenues();
  const q = App.qs();
  const v = venues.find((x) => String(x.id) === q.get("id"));

  if (!v) {
    root.innerHTML = '<p class="kosong">Venue tidak ditemukan. <a href="venue.html" style="color:var(--hijau)">Kembali ke daftar venue</a></p>';
    return;
  }
  document.title = `${v.nama} - ArenaKu`;

  const sp = App.SPORT[v.olahraga[0]];
  const bcls = v.badge === "COMING SOON" ? "soon" : v.badge === "PROMO" ? "promo" : "sport";
  const rating = v.rating
    ? `<span class="rating">★ ${v.rating.toFixed(2)}</span> <span class="muted">(${v.ulasan} ulasan)</span>`
    : '<span class="muted">Belum ada ulasan</span>';
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.nama + " " + v.kota)}`;
  const mingguan = (l) => `${rupiah(l.harga)} <span class="muted small">/ jam</span>`;
  const akhirPekan = (l) => rupiah(App.hargaTanggal(l, "2026-11-07")); // 7 Nov 2026 = Sabtu (selalu akhir pekan)

  root.innerHTML = `
    <div class="breadcrumb"><a href="index.html">Beranda</a> / <a href="venue.html">Sewa Lapangan</a> / ${esc(v.nama)}</div>
    <div class="detail-grid">
      <div class="detail-info">
        <div id="galeri"></div>
        <span class="label ${bcls}" style="margin-bottom:8px">${esc(v.badge || v.olahraga[0])}</span>
        <h1>${esc(v.nama)}</h1>
        <p class="venue-meta">📍 ${esc(v.kota)}, ${esc(v.provinsi)} · <a class="maps-link" href="${maps}" target="_blank" rel="noopener">Lihat di peta</a></p>
        <p>${rating}</p>
        <div class="tags">${v.olahraga.map((o) => `<span class="tag">${esc(o)}</span>`).join("")}</div>
        <div class="card">
          <h2>Tentang venue</h2>
          <p>${esc(v.deskripsi)}</p>
          <dl class="dl">
            <dt>Alamat</dt><dd>${esc(v.alamat)}</dd>
            <dt>Jam operasional</dt><dd>${App.pad(v.jam_buka)}:00 – ${App.pad(v.jam_tutup)}:00 (setiap hari)</dd>
            <dt>Fasilitas</dt><dd>${v.fasilitas.map((f) => `<span class="tag">${esc(f)}</span>`).join(" ")}</dd>
          </dl>
          <h2 style="margin-top:16px">Daftar lapangan &amp; harga</h2>
          <table class="lap"><thead><tr><th>Lapangan</th><th>Olahraga</th><th>Senin–Jumat</th><th>Sabtu–Minggu</th></tr></thead>
            <tbody>${v.lapangan.map((l) => `<tr><td>${esc(l.nama)}</td><td>${esc(l.olahraga)}</td><td>${mingguan(l)}</td><td class="we">${akhirPekan(l)}</td></tr>`).join("")}</tbody></table>
          <h2 style="margin-top:16px">Peraturan &amp; ketentuan</h2>
          <ul class="rules">
            <li>Datang minimal 10 menit sebelum jadwal dan tunjukkan <strong>kode booking</strong> saat check-in.</li>
            <li>Pembayaran harus diselesaikan dalam 30 menit setelah booking, jika tidak otomatis dibatalkan.</li>
            <li>Gunakan sepatu yang sesuai dengan jenis lapangan.</li>
            <li>Dilarang merokok dan membawa minuman beralkohol di area lapangan.</li>
            <li>Kerusakan fasilitas akibat kelalaian penyewa menjadi tanggung jawab penyewa.</li>
          </ul>
        </div>
      </div>

      <aside class="card booking-panel" id="panel">
        <h2>Jadwal &amp; Booking</h2>
        ${v.coming_soon ? '<div class="notice soon">Venue ini <strong>segera hadir</strong>. Jadwal belum dibuka.</div>' : `
        <div class="field"><label for="lap">Pilih lapangan</label>
          <select id="lap">${v.lapangan.map((l) => `<option value="${esc(l.id)}">${esc(l.nama)} · mulai ${rupiah(l.harga)}/jam</option>`).join("")}</select></div>
        <label class="muted small">Pilih tanggal (harga per jam, dalam ribu rupiah)</label>
        <div class="cal-wrap" id="kalender"></div>
        ${App.slotLegend()}
        <div id="slots"></div>
        <div class="ringkas" id="ringkas"></div>
        <button type="button" class="btn btn-primary btn-block" id="btn-konfirmasi" disabled>Pilih slot jam dulu</button>
        <p class="muted small center" style="margin-top:8px">Login hanya diminta saat konfirmasi booking.</p>`}
      </aside>
    </div>`;

  /* ----- Galeri foto (slider + lightbox) ----- */
  const fotos = App.fotosOf(v).map((src) => ({ src }));
  const items = fotos.length ? fotos : [
    { src: `assets/img/default/${sp.slug}.svg`, caption: `Ilustrasi lapangan ${v.olahraga[0]}. Foto asli belum diunggah.` },
    { html: `<div class="gal-ph" style="background:${sp.warna}"><span>${sp.ikon}</span><p>${esc(v.nama)}</p></div>`, caption: "Foto asli belum diunggah." }
  ];
  App.gallery($("#galeri"), { items, alt: `Foto ${v.nama}` });

  if (v.coming_soon) return;

  /* ----- Kalender, slot, dan ringkasan ----- */
  let iso = App.validTanggal(q.get("tanggal")) ? q.get("tanggal") : App.todayISO();
  let lap = v.lapangan.find((l) => l.id === q.get("lap")) || v.lapangan[0];
  let slots = null;
  let pilih = [];
  $("#lap").value = lap.id;

  function ringkas() {
    const btn = $("#btn-konfirmasi");
    if (!pilih.length) {
      $("#ringkas").innerHTML = '<span class="muted">Belum ada slot dipilih. Pilih satu atau beberapa jam berurutan.</span>';
      btn.disabled = true;
      btn.textContent = "Pilih slot jam dulu";
      return;
    }
    const harga = App.hargaTanggal(lap, iso);
    $("#ringkas").innerHTML = `
      <div><span>Lapangan</span><strong>${esc(lap.nama)}</strong></div>
      <div><span>Tanggal</span><strong>${esc(App.parseISO(iso).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }))}</strong></div>
      <div><span>Jam</span><strong>${App.jamRange(pilih)} (${pilih.length} jam)</strong></div>
      <div><span>Harga / jam</span><strong>${rupiah(harga)}${App.isWeekend(iso) ? " (akhir pekan)" : ""}</strong></div>
      <div><span>Total</span><span class="total">${rupiah(harga * pilih.length)}</span></div>`;
    btn.disabled = false;
    btn.textContent = "Konfirmasi Booking";
  }

  function gambarSlot() {
    pilih = [];
    slots = App.renderSlots($("#slots"), { venue: v, lap, iso, selectable: true, onChange: (j) => { pilih = j; ringkas(); } });
    ringkas();
  }

  const kal = App.calendar($("#kalender"), {
    selected: iso,
    price: (d) => String(Math.round(App.hargaTanggal(lap, d) / 1000)),
    onSelect: (d) => { iso = d; gambarSlot(); }
  });
  $("#lap").addEventListener("change", (e) => { lap = v.lapangan.find((l) => l.id === e.target.value); kal.refresh(); gambarSlot(); });
  gambarSlot();
  App.onTick(() => { if (slots) slots.refresh(); }); // jam yang sudah lewat otomatis tidak bisa dipilih

  // Konfirmasi: baru di sini pengguna diminta login
  $("#btn-konfirmasi").addEventListener("click", () => {
    if (!pilih.length) return;
    const snapshot = { jam: [...pilih], lap, iso };
    App.requireLogin(() => bukaPembayaran(snapshot));
  });

  function bukaPembayaran({ jam, lap, iso }) {
    const harga = App.hargaTanggal(lap, iso);
    const total = harga * jam.length;
    const user = App.getUser();
    const m = App.openModal(`
      <h2>Konfirmasi &amp; Pembayaran</h2>
      <p class="muted">Periksa kembali pesananmu, ${esc(user.nama.split(" ")[0])}.</p>
      <div class="ringkas">
        <div><span>Venue</span><strong>${esc(v.nama)}</strong></div>
        <div><span>Lapangan</span><strong>${esc(lap.nama)}</strong></div>
        <div><span>Tanggal</span><strong>${esc(App.fmtTanggal(iso))}</strong></div>
        <div><span>Jam</span><strong>${App.jamRange(jam)} (${jam.length} jam)</strong></div>
        <div><span>Total bayar</span><span class="total">${rupiah(total)}</span></div>
      </div>
      <strong>Metode pembayaran</strong>
      <div class="radio-list">
        <label><input type="radio" name="metode" value="Transfer Bank" checked> Transfer Bank</label>
        <label><input type="radio" name="metode" value="QRIS"> QRIS</label>
        <label><input type="radio" name="metode" value="E-Wallet"> E-Wallet (GoPay / OVO / DANA)</label>
      </div>
      <p class="notice">Selesaikan pembayaran dalam 30 menit, jika tidak booking otomatis dibatalkan. (Simulasi)</p>
      <button type="button" class="btn btn-primary btn-block" id="bayar" style="margin-top:14px">Bayar &amp; Konfirmasi</button>`);

    m.$("#bayar").addEventListener("click", () => {
      // Cek ulang agar tidak terjadi double booking pada slot yang sama
      if (jam.some((h) => App.slotStatus(v, lap, iso, h) !== "available")) {
        m.close();
        App.toast("Maaf, ada slot yang baru saja terisi atau sudah lewat. Silakan pilih ulang.");
        gambarSlot();
        return;
      }
      const b = App.addBooking({ venue: v, lap, iso, jam, metode: m.$("input[name=metode]:checked").value });
      m.close();
      const ok = App.openModal(`
        <h2>Booking berhasil 🎉</h2>
        <p class="muted">Simpan <strong>kode booking</strong> ini dan tunjukkan kepada petugas saat check-in di lokasi.</p>
        <div class="kode">${esc(b.kode)}</div>
        <div class="ringkas">
          <div><span>Venue</span><strong>${esc(v.nama)}</strong></div>
          <div><span>Lapangan</span><strong>${esc(lap.nama)}</strong></div>
          <div><span>Jadwal</span><strong>${esc(App.fmtTanggal(iso))}, ${App.jamRange(jam)}</strong></div>
          <div><span>Total</span><strong>${rupiah(b.total)} (${esc(b.metode)})</strong></div>
          <div><span>Status</span><strong>${esc(b.status)} · ${esc(b.bayar)}</strong></div>
        </div>
        <div class="row-btn"><a class="btn btn-outline" href="profil.html#riwayat">Lihat Riwayat</a><button type="button" class="btn btn-primary" data-close>Selesai</button></div>`, { cls: "modal-sm" });
      ok.$("[data-close]").addEventListener("click", ok.close);
      gambarSlot();
    });
  }
})();
