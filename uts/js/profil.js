"use strict";
/* ArenaKu - profil.js: profil user, riwayat aktivitas (booking & sparring), hapus riwayat, pengaturan akun.
   Riwayat dihapus secara "soft delete": hanya disembunyikan dari user, data tetap ada untuk rekap admin. */
(async () => {
  const { $, $$, esc, rupiah } = App;
  const root = $("#profil-root");
  const me = App.getUser();

  if (!me) {
    root.innerHTML = `<div class="akses-ditolak"><div class="big">🔒</div><h2>Masuk untuk melihat profilmu</h2>
      <p class="muted" style="margin:8px 0 18px">Riwayat booking dan sparring hanya tersedia setelah login.</p>
      <button type="button" class="btn btn-primary" id="btn-masuk">Masuk / Daftar</button></div>`;
    $("#btn-masuk").addEventListener("click", () => App.openAuth("login", () => location.reload()));
    return;
  }
  if (me.role === "admin") { location.replace("admin.html"); return; }

  const [venues, sparAll] = await Promise.all([App.getVenues(), App.getSparring({ semua: true })]);
  const vmap = App.venueMap(venues);
  let tab = ["riwayat", "sparring", "akun"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "riwayat";

  const hariIni = () => App.todayISO();
  const bookingSaya = () => App.getBookings().filter((b) => b.email === me.email && !b.hiddenUser)
    .sort((a, b) => b.dibuat.localeCompare(a.dibuat));
  const bookingAktif = (b) => b.status === "Pending" && b.tanggal >= hariIni();
  const bisaHapusB = (b) => !bookingAktif(b);

  function sparringSaya() {
    const joins = App.getJoins();
    const dariJoin = joins.filter((j) => j.email === me.email && !j.hiddenUser).map((j) => ({
      jenis: "join", id: j.id, tim: j.tim, pic: j.pic, venue_id: j.venue_id, olahraga: j.olahraga,
      tanggal: j.tanggal, jam: `${j.jam_mulai}`, dibuat: j.dibuat, lawan: j.tim, kontak: j.kontak
    }));
    const dariPost = App.store.get("arenaku_sparring", []).filter((s) => s.email === me.email && !s.hiddenUser).map((s) => {
      const penantang = joins.filter((j) => j.sparId === s.id).map((j) => j.nama);
      return {
        jenis: "post", id: s.id, tim: s.tim, pic: s.pic, venue_id: s.venue_id, olahraga: s.olahraga,
        tanggal: s.tanggal, jam: s.jam_mulai, dibuat: s.dibuat || s.tanggal, lawan: penantang.length ? penantang.join(", ") : "", kontak: s.kontak
      };
    });
    return [...dariJoin, ...dariPost].sort((a, b) => b.dibuat.localeCompare(a.dibuat));
  }
  const bisaHapusS = (s) => s.jenis === "join" || s.tanggal < hariIni();

  const pillStatus = (s) => ({ Pending: "st-pending", Selesai: "st-selesai", Dibatalkan: "st-batal" }[s] || "st-menunggu");

  function itemBooking(b) {
    const v = vmap.get(b.venueId);
    const aktif = bookingAktif(b);
    return `<article class="card hist-item">
      <div class="hist-top"><span class="hist-kode" title="Tunjukkan kode ini saat check-in">${esc(b.kode)}</span>
        <div class="hist-pills"><span class="pill ${pillStatus(b.status)}">${esc(b.status)}</span>
        <span class="pill ${b.bayar === "Lunas" ? "st-lunas" : "st-menunggu"}">${esc(b.bayar)}</span>
        ${b.hadir ? '<span class="pill st-selesai">Hadir</span>' : ""}</div></div>
      <h3>${v ? `<a href="detail.html?id=${v.id}">${esc(b.venueNama || v.nama)}</a>` : esc(b.venueNama)} · ${esc(b.lapNama)}</h3>
      <p class="meta">📅 ${esc(App.fmtTanggal(b.tanggal))} · 🕒 ${App.jamRange(b.jam)}</p>
      <p class="meta">💸 ${rupiah(b.total)} (${esc(b.metode)}) · dipesan ${esc(App.fmtWaktu(b.dibuat))}</p>
      <div class="hist-act">
        ${aktif ? `<button type="button" class="btn btn-outline btn-xs" data-act="batal" data-id="${esc(b.kode)}">Batalkan booking</button>
          <span class="muted small">Booking aktif. Batalkan dulu jika ingin menghapusnya dari riwayat.</span>`
          : `<button type="button" class="btn btn-danger btn-xs" data-act="hapus-b" data-id="${esc(b.kode)}">🗑 Hapus dari riwayat</button>`}
      </div></article>`;
  }

  function itemSparring(s) {
    const v = vmap.get(s.venue_id);
    const sp = App.SPORT[s.olahraga] || { ikon: "🏟️" };
    const judul = s.jenis === "join" ? `Kamu menantang ${esc(s.tim)}` : `Postingan sparring: ${esc(s.tim)}`;
    const lawan = s.jenis === "join"
      ? `${esc(s.lawan)} (PIC: ${esc(s.pic)})`
      : s.lawan ? esc(s.lawan) : '<span class="muted">Belum ada yang menantang</span>';
    return `<article class="card hist-item">
      <div class="hist-top"><span class="pill ${s.jenis === "join" ? "st-lunas" : "st-selesai"}">${s.jenis === "join" ? "Tantangan" : "Postinganmu"}</span>
        <span class="pill ${s.tanggal < hariIni() ? "st-menunggu" : "st-pending"}">${s.tanggal < hariIni() ? "Selesai" : "Akan datang"}</span></div>
      <h3>${sp.ikon} ${judul}</h3>
      <p class="meta">🤝 Lawan sparring: <strong>${lawan}</strong></p>
      <p class="meta">📍 ${v ? `<a href="detail.html?id=${v.id}">${esc(v.nama)}</a> · ${esc(v.kota)}` : "Venue tidak diketahui"}</p>
      <p class="meta">📅 ${esc(App.fmtTanggal(s.tanggal))} · 🕒 ${esc(s.jam)} · ${esc(s.olahraga)}</p>
      <div class="hist-act">
        ${bisaHapusS(s) ? `<button type="button" class="btn btn-danger btn-xs" data-act="hapus-s" data-kind="${s.jenis}" data-id="${esc(s.id)}">🗑 Hapus dari riwayat</button>`
          : '<span class="muted small">Postingan masih aktif. Bisa dihapus setelah tanggal sparring lewat.</span>'}
      </div></article>`;
  }

  function render() {
    const bk = bookingSaya(), sp = sparringSaya();
    const hapusable = bk.filter(bisaHapusB).length + sp.filter(bisaHapusS).length;
    root.innerHTML = `
      <div class="profil-grid">
        <aside class="card profil-kartu">
          <div class="avatar-lg">${esc(me.nama.charAt(0).toUpperCase())}</div>
          <h2>${esc(me.nama)}</h2>
          <p class="muted small">${esc(me.email)}</p>
          <p class="muted small">${esc(me.hp || "Nomor HP belum diisi")}</p>
          <p style="margin-top:10px"><span class="pill st-selesai">Akun User</span></p>
          <button type="button" class="btn btn-outline btn-block" id="p-logout">↩ Keluar</button>
        </aside>
        <section>
          <div class="tabs" role="tablist">
            <button type="button" data-tab="riwayat" class="${tab === "riwayat" ? "aktif" : ""}">Riwayat Booking (${bk.length})</button>
            <button type="button" data-tab="sparring" class="${tab === "sparring" ? "aktif" : ""}">Riwayat Sparring (${sp.length})</button>
            <button type="button" data-tab="akun" class="${tab === "akun" ? "aktif" : ""}">Pengaturan Akun</button>
          </div>
          ${tab === "akun" ? panelAkun() : `
          <div class="hist-bar"><span class="muted small">${tab === "riwayat" ? "Lapangan yang pernah kamu booking" : "Lapangan dan lawan sparring kamu"}</span>
            <button type="button" class="btn btn-danger btn-sm" id="hapus-semua" ${hapusable ? "" : "disabled"}>🗑 Hapus Semua Riwayat</button></div>
          ${tab === "riwayat"
            ? (bk.length ? bk.map(itemBooking).join("") : `<div class="card kosong-box"><div class="big">🧾</div><p>Belum ada riwayat booking.</p><p style="margin-top:10px"><a class="btn btn-primary btn-sm" href="venue.html">Cari Lapangan</a></p></div>`)
            : (sp.length ? sp.map(itemSparring).join("") : `<div class="card kosong-box"><div class="big">🤝</div><p>Belum ada riwayat sparring.</p><p style="margin-top:10px"><a class="btn btn-primary btn-sm" href="sparring.html">Cari Lawan</a></p></div>`)}`}
        </section>
      </div>`;
    bindAkun();
  }

  function panelAkun() {
    return `<div class="card">
        <h2 style="font-size:1.15rem;margin-bottom:12px">Data diri</h2>
        <form id="f-profil" class="profil-form" novalidate>
          <div class="form-group"><label for="a-nama">Nama lengkap</label><input type="text" id="a-nama" value="${esc(me.nama)}"><div class="error"></div></div>
          <div class="form-group"><label for="a-hp">Nomor HP</label><input type="tel" id="a-hp" value="${esc(me.hp || "")}"><div class="error"></div></div>
          <div class="form-group full"><label for="a-email">Email (tidak dapat diubah)</label><input type="email" id="a-email" value="${esc(me.email)}" disabled></div>
          <div class="full"><button type="submit" class="btn btn-primary btn-sm">Simpan Perubahan</button> <span class="sukses-teks" id="ok-profil"></span></div>
        </form>
      </div>
      <div class="card" style="margin-top:16px">
        <h2 style="font-size:1.15rem;margin-bottom:12px">Ganti kata sandi</h2>
        <form id="f-sandi" class="profil-form" novalidate>
          <div class="form-group full"><label for="s-lama">Kata sandi lama</label><input type="password" id="s-lama" autocomplete="current-password"><div class="error"></div></div>
          <div class="form-group"><label for="s-baru">Kata sandi baru</label><input type="password" id="s-baru" autocomplete="new-password"><div class="error"></div></div>
          <div class="form-group"><label for="s-ulang">Ulangi kata sandi baru</label><input type="password" id="s-ulang" autocomplete="new-password"><div class="error"></div></div>
          <div class="full"><button type="submit" class="btn btn-primary btn-sm">Ganti Kata Sandi</button> <span class="sukses-teks" id="ok-sandi"></span></div>
        </form>
      </div>
      <div class="card" style="margin-top:16px"><h2 style="font-size:1.15rem;margin-bottom:8px">Keluar dari akun</h2>
        <p class="muted small" style="margin-bottom:10px">Kamu bisa masuk kembali kapan saja.</p>
        <button type="button" class="btn btn-danger btn-sm" id="p-logout2">↩ Keluar</button></div>`;
  }

  function bindAkun() {
    const fp = $("#f-profil");
    if (fp) {
      fp.addEventListener("submit", (e) => {
        e.preventDefault();
        const nama = $("#a-nama"), hp = $("#a-hp");
        if (![App.setError(nama, nama.value.trim().length >= 3 ? "" : "Nama minimal 3 karakter."),
          App.setError(hp, App.hpOk(hp.value) ? "" : "Nomor HP tidak valid (contoh: 081234567890).")].every(Boolean)) return;
        Object.assign(me, App.updateUser({ nama: nama.value.trim(), hp: hp.value.replace(/[\s-]/g, "") }));
        $("#ok-profil").textContent = "Tersimpan ✓";
        $(".profil-kartu h2").textContent = me.nama;
        $(".profil-kartu .avatar-lg").textContent = me.nama.charAt(0).toUpperCase();
      });
      $("#f-sandi").addEventListener("submit", async (e) => {
        e.preventDefault();
        const lama = $("#s-lama"), baru = $("#s-baru"), ulang = $("#s-ulang");
        const users = App.getUsers();
        const u = users.find((x) => x.email === me.email);
        const okLama = u && (!u.hash || u.hash === await App.hashPw(me.email, lama.value));
        if (![App.setError(lama, okLama ? "" : "Kata sandi lama salah."),
          App.setError(baru, baru.value.length >= 6 ? "" : "Kata sandi baru minimal 6 karakter."),
          App.setError(ulang, ulang.value === baru.value ? "" : "Konfirmasi tidak sama.")].every(Boolean)) return;
        u.hash = await App.hashPw(me.email, baru.value);
        App.saveUsers(users);
        e.target.reset();
        $("#ok-sandi").textContent = "Kata sandi diperbarui ✓";
      });
      $("#p-logout2").addEventListener("click", App.logout);
    }
    $("#p-logout") && $("#p-logout").addEventListener("click", App.logout);
  }

  /* ----- Aksi pada riwayat ----- */
  root.addEventListener("click", async (e) => {
    const tabBtn = e.target.closest("[data-tab]");
    if (tabBtn) { tab = tabBtn.dataset.tab; history.replaceState(null, "", "#" + tab); render(); return; }

    const act = e.target.closest("[data-act]");
    if (act) {
      const { act: aksi, id, kind } = act.dataset;
      if (aksi === "batal") {
        if (!(await App.confirmBox({ judul: "Batalkan booking?", teks: `Booking ${id} akan dibatalkan dan slot jam dibuka kembali untuk pengguna lain.`, ok: "Ya, batalkan", batal: "Tidak", bahaya: true }))) return;
        App.saveBookings(App.getBookings().map((b) => (b.kode === id ? { ...b, status: "Dibatalkan" } : b)));
        App.toast("Booking dibatalkan.");
      } else if (aksi === "hapus-b") {
        if (!(await App.confirmBox({ judul: "Hapus dari riwayat?", teks: `Booking ${id} akan dihapus dari riwayatmu.`, ok: "Hapus", bahaya: true }))) return;
        App.saveBookings(App.getBookings().map((b) => (b.kode === id ? { ...b, hiddenUser: true } : b)));
        App.toast("Riwayat booking dihapus.");
      } else if (aksi === "hapus-s") {
        if (!(await App.confirmBox({ judul: "Hapus dari riwayat?", teks: "Aktivitas sparring ini akan dihapus dari riwayatmu.", ok: "Hapus", bahaya: true }))) return;
        if (kind === "join") App.saveJoins(App.getJoins().map((j) => (j.id === id ? { ...j, hiddenUser: true } : j)));
        else App.store.set("arenaku_sparring", App.store.get("arenaku_sparring", []).map((s) => (s.id === id ? { ...s, hiddenUser: true } : s)));
        App.toast("Riwayat sparring dihapus.");
      }
      render();
      return;
    }

    if (e.target.closest("#hapus-semua")) {
      const jb = bookingSaya().filter(bisaHapusB).length, js = sparringSaya().filter(bisaHapusS).length;
      if (!(await App.confirmBox({
        judul: "Hapus semua riwayat?",
        teks: `${jb} riwayat booking dan ${js} riwayat sparring akan dihapus. Booking yang masih aktif tidak ikut terhapus.`,
        ok: "Hapus semua", bahaya: true
      }))) return;
      App.saveBookings(App.getBookings().map((b) => (b.email === me.email && bisaHapusB(b) ? { ...b, hiddenUser: true } : b)));
      const sparAktif = new Set(sparringSaya().filter((s) => !bisaHapusS(s)).map((s) => s.id));
      App.saveJoins(App.getJoins().map((j) => (j.email === me.email ? { ...j, hiddenUser: true } : j)));
      App.store.set("arenaku_sparring", App.store.get("arenaku_sparring", []).map((s) => (s.email === me.email && !sparAktif.has(s.id) ? { ...s, hiddenUser: true } : s)));
      App.toast("Riwayat dibersihkan.");
      render();
    }
  });

  window.addEventListener("hashchange", () => {
    const h = location.hash.slice(1);
    if (["riwayat", "sparring", "akun"].includes(h)) { tab = h; render(); }
  });
  render();
})();
