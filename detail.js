"use strict";
/* ArenaKu - detail.js: detail venue, kalender slot (tanpa login), booking dengan login di akhir */
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

  root.innerHTML = `
    <div class="breadcrumb"><a href="index.html">Beranda</a> / <a href="venue.html">Sewa Lapangan</a> / ${esc(v.nama)}</div>
    <div class="detail-grid">
      <div class="detail-info">
        <div class="detail-banner" style="background:${sp.warna}"><span>${sp.ikon}</span>
          ${v.foto ? `<img src="${esc(v.foto)}" alt="${esc(v.nama)}" onerror="this.remove()">` : ""}
          <span class="label ${bcls}">${esc(v.badge || v.olahraga[0])}</span></div>
        <h1>${esc(v.nama)}</h1>
        <p class="venue-meta">📍 ${esc(v.kota)}, ${esc(v.provinsi)}</p>
        <p>${rating}</p>
        <div class="tags">${v.olahraga.map((o) => `<span class="tag">${esc(o)}</span>`).join("")}</div>
        <div class="card">
          <h2>Tentang venue</h2>
          <p>${esc(v.deskripsi)}</p>
          <dl class="dl">
            <dt>Alamat</dt><dd>${esc(v.alamat)}</dd>
            <dt>Jam operasional</dt><dd>${App.pad(v.jam_buka)}:00 – ${App.pad(v.jam_tutup)}:00</dd>
            <dt>Fasilitas</dt><dd>${v.fasilitas.map((f) => `<span class="tag">${esc(f)}</span>`).join(" ")}</dd>
          </dl>
          <h2 style="margin-top:16px">Daftar lapangan</h2>
          <table class="lap"><thead><tr><th>Lapangan</th><th>Olahraga</th><th>Harga / sesi</th></tr></thead>
            <tbody>${v.lapangan.map((l) => `<tr><td>${esc(l.nama)}</td><td>${esc(l.olahraga)}</td><td>${rupiah(l.harga)}</td></tr>`).join("")}</tbody></table>
        </div>
      </div>

      <aside class="card booking-panel" id="panel">
        <h2>Jadwal &amp; Booking</h2>
        ${v.coming_soon ? '<div class="notice soon">Venue ini <strong>segera hadir</strong>. Jadwal belum dibuka.</div>' : `
        <div class="field"><label for="lap">Pilih lapangan</label>
          <select id="lap">${v.lapangan.map((l) => `<option value="${esc(l.id)}">${esc(l.nama)} · ${rupiah(l.harga)}/jam</option>`).join("")}</select></div>
        <label class="muted small">Pilih tanggal</label>
        <div id="chips"></div>
        ${App.slotLegend()}
        <div id="slots"></div>
        <div class="ringkas" id="ringkas"></div>
        <button type="button" class="btn btn-primary btn-block" id="btn-konfirmasi" disabled>Pilih slot jam dulu</button>
        <p class="muted small center" style="margin-top:8px">Login hanya diminta saat konfirmasi booking.</p>`}
      </aside>
    </div>`;

  if (v.coming_soon) return;

  let iso = App.validTanggal(q.get("tanggal")) ? q.get("tanggal") : App.todayISO();
  let lap = v.lapangan.find((l) => l.id === q.get("lap")) || v.lapangan[0];
  let slots = null;
  let pilih = [];
  $("#lap").value = lap.id;

  function ringkas() {
    const jam = pilih;
    const btn = $("#btn-konfirmasi");
    if (!jam.length) {
      $("#ringkas").innerHTML = '<span class="muted">Belum ada slot dipilih. Pilih satu atau beberapa jam berurutan.</span>';
      btn.disabled = true;
      btn.textContent = "Pilih slot jam dulu";
      return;
    }
    const total = jam.length * lap.harga;
    $("#ringkas").innerHTML = `
      <div><span>Lapangan</span><strong>${esc(lap.nama)}</strong></div>
      <div><span>Tanggal</span><strong>${esc(App.parseISO(iso).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }))}</strong></div>
      <div><span>Jam</span><strong>${App.pad(jam[0])}:00–${App.pad(jam[jam.length - 1] + 1)}:00 (${jam.length} jam)</strong></div>
      <div><span>Total</span><span class="total">${rupiah(total)}</span></div>`;
    btn.disabled = false;
    btn.textContent = "Konfirmasi Booking";
  }

  function gambarSlot() {
    pilih = [];
    slots = App.renderSlots($("#slots"), { venue: v, lap, iso, selectable: true, onChange: (j) => { pilih = j; ringkas(); } });
    ringkas();
  }

  App.dateChips($("#chips"), { selected: iso, onSelect: (d) => { iso = d; gambarSlot(); } });
  $("#lap").addEventListener("change", (e) => { lap = v.lapangan.find((l) => l.id === e.target.value); gambarSlot(); });
  gambarSlot();

  // Konfirmasi: baru di sini pengguna diminta login
  $("#btn-konfirmasi").addEventListener("click", () => {
    if (!pilih.length) return;
    const snapshot = { jam: [...pilih], lap, iso };
    App.requireLogin(() => bukaPembayaran(snapshot));
  });

  function bukaPembayaran({ jam, lap, iso }) {
    const total = jam.length * lap.harga;
    const user = App.getUser();
    const m = App.openModal(`
      <h2>Konfirmasi &amp; Pembayaran</h2>
      <p class="muted">Periksa kembali pesananmu, ${esc(user.nama.split(" ")[0])}.</p>
      <div class="ringkas">
        <div><span>Venue</span><strong>${esc(v.nama)}</strong></div>
        <div><span>Lapangan</span><strong>${esc(lap.nama)}</strong></div>
        <div><span>Tanggal</span><strong>${esc(App.fmtTanggal(iso))}</strong></div>
        <div><span>Jam</span><strong>${App.pad(jam[0])}:00–${App.pad(jam[jam.length - 1] + 1)}:00 (${jam.length} jam)</strong></div>
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
        App.toast("Maaf, ada slot yang baru saja terisi. Silakan pilih ulang.");
        gambarSlot();
        return;
      }
      const metode = m.$("input[name=metode]:checked").value;
      const kode = "ARK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      App.saveBooking({ kode, venueId: v.id, lapId: lap.id, tanggal: iso, jam, total, metode, email: user.email, status: "Menunggu verifikasi" });
      m.close();
      const ok = App.openModal(`
        <h2>Booking berhasil 🎉</h2>
        <p class="muted">Tunjukkan kode ini di venue setelah pembayaran diverifikasi.</p>
        <div class="kode">${kode}</div>
        <div class="ringkas">
          <div><span>Venue</span><strong>${esc(v.nama)}</strong></div>
          <div><span>Jadwal</span><strong>${esc(App.fmtTanggal(iso))}, ${App.pad(jam[0])}:00–${App.pad(jam[jam.length - 1] + 1)}:00</strong></div>
          <div><span>Total</span><strong>${rupiah(total)} (${esc(metode)})</strong></div>
          <div><span>Status</span><strong>Menunggu verifikasi</strong></div>
        </div>
        <button type="button" class="btn btn-primary btn-block" data-close>Selesai</button>`, { cls: "modal-sm" });
      ok.$("[data-close]").addEventListener("click", ok.close);
      gambarSlot();
    });
  }
})();
