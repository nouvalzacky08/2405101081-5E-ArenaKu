"use strict";
/* ArenaKu - admin.js: Dashboard Admin.
   Memantau seluruh pemesanan (siapa yang booking, jadwal, status pembayaran & kehadiran),
   aktivitas sparring, pesan masuk, dan pengguna. Check-in memakai Kode Booking milik user. */
(async () => {
  const { $, $$, esc, rupiah } = App;
  const root = $("#admin-root");
  const me = App.getUser();

  if (!me || me.role !== "admin") {
    root.innerHTML = `<div class="akses-ditolak"><div class="big">🔒</div>
      <h2>${me ? "Akses ditolak" : "Khusus Admin"}</h2>
      <p class="muted" style="margin:8px 0 18px">${me ? "Halaman ini hanya dapat dibuka oleh akun Admin." : "Silakan masuk dengan akun Admin untuk membuka dashboard."}</p>
      ${me ? '<button type="button" class="btn btn-outline" id="a-keluar">Keluar &amp; masuk sebagai Admin</button>'
           : '<button type="button" class="btn btn-primary" id="a-masuk">Masuk</button>'}</div>`;
    const m = $("#a-masuk"), k = $("#a-keluar");
    if (m) m.addEventListener("click", () => App.openAuth("login"));
    if (k) k.addEventListener("click", () => { App.store.del("arenaku_user"); location.reload(); });
    return;
  }

  const [venues, sparAll] = await Promise.all([App.getVenues(), App.getSparring({ semua: true })]);
  const vmap = App.venueMap(venues);
  let tab = "booking";
  let filterStatus = "Semua";
  let cari = "";

  const pill = { Pending: "st-pending", Selesai: "st-selesai", Dibatalkan: "st-batal" };
  const hariIni = () => App.todayISO();

  /* ---------- Cangkang halaman ---------- */
  root.innerHTML = `
    <div class="admin-title"><div><h1>Dashboard Admin</h1><p class="muted">Pantau seluruh aktivitas pemesanan ArenaKu.</p></div>
      <span class="pill st-selesai">Masuk sebagai ${esc(me.nama)}</span></div>
    <div class="stat-cards" id="stats"></div>
    <div class="card checkin">
      <strong>Check-in dengan Kode Booking</strong>
      <input type="text" id="kode-cek" placeholder="ARK-XXXXXX" maxlength="10" autocomplete="off">
      <button type="button" class="btn btn-primary btn-sm" id="btn-cek">Check-in</button>
      <div class="hasil" id="hasil-cek" aria-live="polite"></div>
    </div>
    <div class="tabs" id="tabs"></div>
    <div id="tab-isi"></div>
    <div class="card demo-box"><div><strong>Data demo</strong><p class="muted small">Untuk keperluan testing: isi dashboard dengan contoh pemesan, atau kosongkan semua data booking, sparring, dan pesan.</p></div>
      <div class="row-btn"><button type="button" class="btn btn-outline btn-sm" id="btn-contoh">+ Tambah Data Contoh</button>
      <button type="button" class="btn btn-danger btn-sm" id="btn-reset">Reset Data Demo</button></div></div>`;

  /* ---------- Statistik ---------- */
  function renderStats() {
    const b = App.getBookings();
    const aktif = b.filter(App.aktif);
    const pend = b.filter((x) => x.status === "Pending").length;
    const sel = b.filter((x) => x.status === "Selesai").length;
    const omzet = aktif.filter((x) => x.bayar === "Lunas").reduce((n, x) => n + x.total, 0);
    const cards = [
      ["Total Booking", aktif.length, ""], ["Pending", pend, "k2"], ["Selesai", sel, "k3"],
      ["Pendapatan (lunas)", rupiah(omzet), "k4"], ["Pengguna Terdaftar", App.getUsers().length, "k5"]
    ];
    $("#stats").innerHTML = cards.map(([l, v, c]) => `<div class="stat-card ${c}"><span>${l}</span><strong>${v}</strong></div>`).join("");
  }

  /* ---------- Tab ---------- */
  function renderTabs() {
    const pesan = App.store.get("arenaku_pesan", []).length;
    const tabs = [["booking", "Pemesanan"], ["sparring", "Sparring"], ["pesan", `Pesan Masuk (${pesan})`], ["user", "Pengguna"]];
    $("#tabs").innerHTML = tabs.map(([k, l]) => `<button type="button" data-tab="${k}" class="${tab === k ? "aktif" : ""}">${l}</button>`).join("");
  }

  function renderTab() {
    renderTabs();
    const isi = $("#tab-isi");
    if (tab === "booking") {
      isi.innerHTML = `<div class="admin-bar">
        <input type="text" id="cari" placeholder="Cari kode, nama, venue..." value="${esc(cari)}">
        <div class="chips" style="margin:0">${["Semua", "Pending", "Selesai", "Dibatalkan"].map((s) =>
          `<button type="button" class="chip ${filterStatus === s ? "aktif" : ""}" data-status="${s}">${s}</button>`).join("")}</div></div>
        <div class="table-wrap" id="tbl"></div>`;
      renderBooking();
    } else if (tab === "sparring") { isi.innerHTML = '<div class="table-wrap" id="tbl"></div><h3 style="margin:22px 0 10px;color:var(--gelap)">Aktivitas bergabung / menantang</h3><div class="table-wrap" id="tbl2"></div>'; renderSparring(); }
    else if (tab === "pesan") { isi.innerHTML = '<div class="table-wrap" id="tbl"></div>'; renderPesan(); }
    else { isi.innerHTML = '<div class="table-wrap" id="tbl"></div>'; renderUser(); }
  }

  const kosong = (teks, kolom) => `<tr><td colspan="${kolom}" class="tbl-kosong">${teks}</td></tr>`;

  /* ---------- Pemesanan ---------- */
  function renderBooking() {
    const k = cari.trim().toLowerCase();
    const data = App.getBookings()
      .filter((b) => filterStatus === "Semua" || b.status === filterStatus)
      .filter((b) => !k || [b.kode, b.nama, b.venueNama, b.lapNama, b.email].join(" ").toLowerCase().includes(k))
      .sort((a, b) => b.dibuat.localeCompare(a.dibuat));
    $("#tbl").innerHTML = `<table class="tbl"><thead><tr>
      <th>No</th><th>Kode Booking</th><th>Pemesan</th><th>Tanggal Main</th><th>Lapangan</th><th>Total</th><th>Pembayaran</th><th>Kehadiran</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      ${data.length ? data.map((b, i) => `<tr>
        <td>${i + 1}</td>
        <td class="kode">${esc(b.kode)}</td>
        <td><strong>${esc(b.nama || "-")}</strong><br><span class="muted small">${esc(b.hp || b.email)}</span></td>
        <td>${esc(App.fmtTanggal(b.tanggal))}<br><span class="muted small">${App.jamRange(b.jam)}</span></td>
        <td>${esc(b.venueNama)}<br><span class="muted small">${esc(b.lapNama)}</span></td>
        <td>${rupiah(b.total)}<br><span class="muted small">${esc(b.metode)}</span></td>
        <td><span class="pill ${b.bayar === "Lunas" ? "st-lunas" : "st-menunggu"}">${esc(b.bayar)}</span></td>
        <td>${b.hadir ? '<span class="pill st-selesai">Hadir</span>' : '<span class="pill st-menunggu">Belum hadir</span>'}</td>
        <td><span class="pill ${pill[b.status]}">${esc(b.status)}</span></td>
        <td><div class="aksi">
          ${b.status === "Pending" && b.bayar !== "Lunas" ? `<button type="button" class="btn btn-outline btn-xs" data-act="lunas" data-id="${esc(b.kode)}">Verifikasi bayar</button>` : ""}
          ${b.status === "Pending" ? `<button type="button" class="btn btn-primary btn-xs" data-act="checkin" data-id="${esc(b.kode)}">Check-in</button>
            <button type="button" class="btn btn-danger btn-xs" data-act="batal" data-id="${esc(b.kode)}">Batalkan</button>` : '<span class="muted small">-</span>'}
        </div></td></tr>`).join("") : kosong("Belum ada data pemesanan. Gunakan “Tambah Data Contoh” untuk mencoba.", 10)}
      </tbody></table>`;
  }

  /* ---------- Sparring ---------- */
  function renderSparring() {
    const joins = App.getJoins();
    $("#tbl").innerHTML = `<table class="tbl" style="min-width:760px"><thead><tr><th>Tim / PIC</th><th>Venue</th><th>Jadwal</th><th>Olahraga</th><th>Level</th><th>Biaya</th><th>Penantang</th></tr></thead><tbody>
      ${sparAll.length ? sparAll.map((s) => { const v = vmap.get(s.venue_id); const j = joins.filter((x) => x.sparId === s.id); return `<tr>
        <td><strong>${esc(s.tim)}</strong><br><span class="muted small">PIC ${esc(s.pic)}</span></td>
        <td>${v ? esc(v.nama) : "-"}<br><span class="muted small">${v ? esc(v.kota) : ""}</span></td>
        <td>${esc(App.fmtTanggal(s.tanggal))}<br><span class="muted small">${esc(App.jamText(s))}</span></td>
        <td>${esc(s.olahraga)}</td><td>${esc(s.level)}</td><td>${esc(s.biaya)}</td>
        <td>${j.length ? j.map((x) => esc(x.nama)).join(", ") : '<span class="muted">-</span>'}</td></tr>`; }).join("") : kosong("Belum ada postingan sparring.", 7)}
      </tbody></table>`;
    const sorted = [...joins].sort((a, b) => b.dibuat.localeCompare(a.dibuat));
    $("#tbl2").innerHTML = `<table class="tbl" style="min-width:600px"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Menantang / bergabung ke</th><th>Jadwal sparring</th></tr></thead><tbody>
      ${sorted.length ? sorted.map((j) => `<tr><td>${esc(App.fmtWaktu(j.dibuat))}</td><td><strong>${esc(j.nama)}</strong><br><span class="muted small">${esc(j.email)}</span></td>
        <td>${esc(j.tim)}</td><td>${esc(App.fmtTanggal(j.tanggal))}, ${esc(j.jam_mulai)}</td></tr>`).join("") : kosong("Belum ada aktivitas bergabung.", 4)}
      </tbody></table>`;
  }

  /* ---------- Pesan & pengguna ---------- */
  function renderPesan() {
    const p = App.store.get("arenaku_pesan", []).slice().reverse();
    $("#tbl").innerHTML = `<table class="tbl" style="min-width:720px"><thead><tr><th>Waktu</th><th>Pengirim</th><th>Domisili</th><th>Subjek</th><th>Pertanyaan</th></tr></thead><tbody>
      ${p.length ? p.map((x) => `<tr><td>${esc(App.fmtWaktu(x.waktu))}</td><td><strong>${esc(x.nama)}</strong><br><span class="muted small">${esc(x.email)}<br>${esc(x.hp)}</span></td>
        <td>${esc(x.domisili)}</td><td>${esc(x.subjek)}</td><td style="max-width:340px">${esc(x.pesan)}</td></tr>`).join("") : kosong("Belum ada pesan dari halaman Kontak Kami.", 5)}
      </tbody></table>`;
  }
  function renderUser() {
    const users = App.getUsers(), bk = App.getBookings();
    $("#tbl").innerHTML = `<table class="tbl" style="min-width:640px"><thead><tr><th>No</th><th>Nama</th><th>Email</th><th>Nomor HP</th><th>Terdaftar</th><th>Booking</th></tr></thead><tbody>
      ${users.length ? users.map((u, i) => `<tr><td>${i + 1}</td><td><strong>${esc(u.nama)}</strong></td><td>${esc(u.email)}</td><td>${esc(u.hp || "-")}</td>
        <td>${u.dibuat ? esc(App.fmtWaktu(u.dibuat)) : "-"}</td><td>${bk.filter((b) => b.email === u.email && App.aktif(b)).length}</td></tr>`).join("") : kosong("Belum ada pengguna terdaftar.", 6)}
      </tbody></table>`;
  }

  /* ---------- Aksi ---------- */
  const ubah = (kode, patch) => App.saveBookings(App.getBookings().map((b) => (b.kode === kode ? { ...b, ...patch } : b)));
  function segarkan() { renderStats(); renderTab(); }

  async function checkin(kode) {
    const b = App.getBookings().find((x) => x.kode === kode);
    if (!b) return { ok: false, teks: `Kode ${kode} tidak ditemukan.` };
    if (b.status === "Dibatalkan") return { ok: false, teks: `Booking ${kode} sudah dibatalkan.` };
    if (b.status === "Selesai") return { ok: false, teks: `Booking ${kode} sudah check-in sebelumnya.` };
    if (b.tanggal > hariIni()) {
      if (!(await App.confirmBox({ judul: "Belum waktunya main", teks: `Jadwal ${kode} adalah ${App.fmtTanggal(b.tanggal)}. Tetap check-in sekarang?`, ok: "Tetap check-in" }))) return { ok: false, teks: "Check-in dibatalkan." };
    }
    if (b.bayar !== "Lunas") {
      if (!(await App.confirmBox({ judul: "Pembayaran belum diverifikasi", teks: `Booking ${kode} atas nama ${b.nama} belum lunas. Tandai lunas dan check-in sekarang?`, ok: "Tandai lunas & check-in" }))) return { ok: false, teks: "Check-in dibatalkan." };
    }
    ubah(kode, { status: "Selesai", bayar: "Lunas", hadir: true });
    return { ok: true, teks: `✓ ${b.nama} berhasil check-in · ${b.venueNama}, ${b.lapNama} · ${App.jamRange(b.jam)}` };
  }

  root.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; renderTab(); return; }
    const st = e.target.closest("[data-status]");
    if (st) { filterStatus = st.dataset.status; renderTab(); return; }

    const act = e.target.closest("[data-act]");
    if (act) {
      const { act: a, id } = act.dataset;
      if (a === "lunas") { ubah(id, { bayar: "Lunas" }); App.toast("Pembayaran diverifikasi."); }
      else if (a === "batal") {
        if (!(await App.confirmBox({ judul: "Batalkan booking?", teks: `Booking ${id} akan dibatalkan dan slot jam dibuka kembali.`, ok: "Ya, batalkan", batal: "Tidak", bahaya: true }))) return;
        ubah(id, { status: "Dibatalkan" }); App.toast("Booking dibatalkan.");
      } else if (a === "checkin") { const r = await checkin(id); App.toast(r.teks); }
      segarkan();
      return;
    }
    if (e.target.closest("#btn-cek")) {
      const kode = $("#kode-cek").value.trim().toUpperCase();
      const hasil = $("#hasil-cek");
      if (!kode) { hasil.textContent = "Masukkan kode booking."; hasil.style.color = "var(--merah)"; return; }
      const r = await checkin(kode);
      hasil.textContent = r.teks;
      hasil.style.color = r.ok ? "var(--hijau-tua)" : "var(--merah)";
      if (r.ok) { $("#kode-cek").value = ""; segarkan(); }
      return;
    }
    if (e.target.closest("#btn-contoh")) { tambahContoh(); return; }
    if (e.target.closest("#btn-reset")) {
      if (!(await App.confirmBox({ judul: "Reset data demo?", teks: "Semua data booking, aktivitas sparring, postingan sparring, dan pesan masuk akan dihapus. Akun pengguna tidak ikut terhapus.", ok: "Reset", bahaya: true }))) return;
      ["arenaku_bookings", "arenaku_joins", "arenaku_sparring", "arenaku_pesan"].forEach(App.store.del);
      App.toast("Data demo direset.");
      segarkan();
    }
  });
  $("#kode-cek").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#btn-cek").click(); });
  root.addEventListener("input", (e) => { if (e.target.id === "cari") { cari = e.target.value; renderBooking(); } });

  /* ---------- Data contoh ---------- */
  function tambahContoh() {
    const contoh = [
      ["Rizky Pratama", "081234500001", 1, 0, 0, [19, 20], "Pending", "Lunas", false],
      ["Dewi Lestari", "081234500002", 2, 0, 1, [16], "Pending", "Menunggu verifikasi", false],
      ["Andra Wijaya", "081234500003", 3, 0, 2, [20, 21], "Pending", "Menunggu verifikasi", false],
      ["Sinta Maharani", "081234500004", 5, 0, -1, [19], "Selesai", "Lunas", true],
      ["Fajar Nugroho", "081234500005", 17, 0, -2, [18, 19], "Selesai", "Lunas", true],
      ["Bagas Saputra", "081234500006", 9, 0, 3, [17], "Dibatalkan", "Menunggu verifikasi", false]
    ];
    const semua = App.getBookings();
    const kode = new Set(semua.map((b) => b.kode));
    let n = 0;
    contoh.forEach(([nama, hp, vid, li, off, jam, status, bayar, hadir], i) => {
      const v = vmap.get(vid), lap = v.lapangan[li];
      const iso = App.toISO(App.addDays(new Date(), off));
      const bentrok = status !== "Dibatalkan" && semua.some((b) => App.aktif(b) && b.lapId === lap.id && b.tanggal === iso && b.jam.some((h) => jam.includes(h)));
      if (bentrok) return;
      const k = App.kodeUnik(kode); kode.add(k);
      semua.push({
        kode: k, venueId: v.id, venueNama: v.nama, lapId: lap.id, lapNama: lap.nama, tanggal: iso, jam,
        total: App.hargaTanggal(lap, iso) * jam.length, metode: ["Transfer Bank", "QRIS", "E-Wallet"][i % 3],
        email: `contoh${i + 1}@arenaku.example`, nama, hp, status, bayar, hadir, hiddenUser: false,
        dibuat: new Date(Date.now() - (contoh.length - i) * 3600 * 1000).toISOString(), contoh: true
      });
      n++;
    });
    App.saveBookings(semua);
    App.toast(n ? `${n} data contoh ditambahkan.` : "Data contoh sudah ada.");
    segarkan();
  }

  segarkan();
})();
