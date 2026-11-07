"use strict";
/* ArenaKu - app.js
   Modul bersama: data, autentikasi (user/admin), navbar & menu profil, booking + kode unik,
   slot jadwal, kartu venue/sparring, modal, dan toast. Dipakai semua halaman.
   Catatan: ini simulasi frontend. Seluruh data disimpan di localStorage browser. */
const App = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const qs = () => new URLSearchParams(location.search);

  const SPORT = {
    "Futsal": { ikon: "⚽", slug: "futsal", warna: "linear-gradient(135deg,#0b6e3e,#4cc075)" },
    "Mini Soccer": { ikon: "🥅", slug: "mini-soccer", warna: "linear-gradient(135deg,#2e7d32,#a5d66b)" },
    "Basketball": { ikon: "🏀", slug: "basketball", warna: "linear-gradient(135deg,#d84315,#ffb74d)" },
    "Badminton": { ikon: "🏸", slug: "badminton", warna: "linear-gradient(135deg,#1565c0,#64b5f6)" },
    "Tennis": { ikon: "🎾", slug: "tennis", warna: "linear-gradient(135deg,#9e9d24,#e6ee9c)" },
    "Padel": { ikon: "🥎", slug: "padel", warna: "linear-gradient(135deg,#00838f,#4dd0e1)" },
    "Pickleball": { ikon: "🏓", slug: "pickleball", warna: "linear-gradient(135deg,#6a1b9a,#ce93d8)" }
  };
  const PRIORITAS = ["Kota Madiun", "Kabupaten Madiun", "Kabupaten Magetan", "Kabupaten Ngawi"];
  const LEVEL = ["Pemula", "Menengah", "Lanjutan"];
  const BIAYA = ["Patungan", "Gratis", "Ditanggung Pembuat Listing"];
  const MAX_HARI = 365; // jendela booking ke depan

  /* ---------- Penyimpanan lokal (aman bila diblokir browser) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* abaikan */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* abaikan */ } }
  };

  /* ---------- Tanggal & waktu (selalu mengikuti jam perangkat) ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseISO = (iso) => new Date(iso + "T00:00:00");
  const fmtTanggal = (iso) =>
    parseISO(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtWaktu = (iso) =>
    new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const todayISO = () => toISO(new Date());
  const maxISO = () => toISO(addDays(new Date(), MAX_HARI));
  const validTanggal = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || "") && iso >= todayISO() && iso <= maxISO();
  const isWeekend = (iso) => [0, 6].includes(parseISO(iso).getDay());
  const jamRange = (jam) => `${pad(jam[0])}:00–${pad(jam[jam.length - 1] + 1)}:00`;

  /** Harga per jam pada tanggal tertentu: akhir pekan 25% lebih mahal (dibulatkan 5.000). */
  const hargaTanggal = (lap, iso) => (isWeekend(iso) ? Math.ceil((lap.harga * 1.25) / 5000) * 5000 : lap.harga);

  /* Pemicu per menit: dipakai kalender/slot agar ikut berganti saat jam atau hari berubah */
  const tickers = [];
  const onTick = (fn) => tickers.push(fn);
  setInterval(() => tickers.forEach((fn) => { try { fn(todayISO()); } catch { /* abaikan */ } }), 60000);

  /* ---------- Data JSON ---------- */
  const cache = {};
  function showDataError() {
    if ($("#data-error")) return;
    const d = document.createElement("div");
    d.id = "data-error";
    d.className = "data-error";
    d.innerHTML = "<strong>Data tidak dapat dimuat.</strong> Jalankan website lewat server lokal " +
      "(ekstensi Live Server di VS Code, atau perintah <code>python -m http.server</code> di folder <code>uts/</code>), " +
      "bukan dengan klik ganda file HTML.";
    document.body.prepend(d);
  }
  function loadJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(path)
        .then((r) => { if (!r.ok) throw new Error(path + " " + r.status); return r.json(); })
        .catch((err) => { showDataError(); throw err; });
    }
    return cache[path];
  }
  const getVenues = () => loadJSON("data/venues.json");
  const venueMap = (venues) => new Map(venues.map((v) => [v.id, v]));
  const sportList = (venues) => {
    const ada = new Set(venues.flatMap((v) => v.olahraga));
    return Object.keys(SPORT).filter((s) => ada.has(s));
  };
  /** Field `foto` di venues.json boleh berupa teks tunggal atau daftar (array) path gambar. */
  const fotosOf = (v) => (Array.isArray(v.foto) ? v.foto : v.foto ? [v.foto] : []).filter(Boolean);

  /* ---------- Sparring ---------- */
  async function getSparring({ semua = false } = {}) {
    const base = await loadJSON("data/sparring.json");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const seed = base.map((s) => ({ ...s, tanggal: toISO(addDays(today, s.hari)) }));
    const lokal = store.get("arenaku_sparring", []);
    const all = [...seed, ...lokal].sort((a, b) => (a.tanggal + a.jam_mulai).localeCompare(b.tanggal + b.jam_mulai));
    return semua ? all : all.filter((s) => s.tanggal >= toISO(today));
  }
  const getJoins = () => store.get("arenaku_joins", []);
  const saveJoins = (a) => store.set("arenaku_joins", a);

  /* ---------- Pengguna & autentikasi (simulasi) ---------- */
  // Akun admin default untuk keperluan testing sistem (hanya demo frontend, bukan keamanan sungguhan).
  const ADMIN = { username: "admin_arenaku", password: "admin123", nama: "Administrator" };
  const getUser = () => store.get("arenaku_user", null);
  const isAdmin = () => (getUser() || {}).role === "admin";
  const getUsers = () => store.get("arenaku_users", []);
  const saveUsers = (a) => store.set("arenaku_users", a);
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const hpOk = (v) => /^(08|\+628)\d{8,11}$/.test(String(v).replace(/[\s-]/g, ""));

  async function hashPw(email, pw) {
    const data = "arenaku|" + email.toLowerCase() + "|" + pw;
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    } catch { /* lanjut ke cadangan */ }
    let h = 5381;
    for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) >>> 0;
    return "x" + h.toString(16);
  }

  function setError(input, pesan) {
    input.closest(".form-group").querySelector(".error").textContent = pesan;
    return !pesan;
  }

  function updateUser(patch) {
    const u = { ...getUser(), ...patch };
    store.set("arenaku_user", u);
    const list = getUsers().map((x) => (x.email === u.email ? { ...x, nama: u.nama, hp: u.hp } : x));
    saveUsers(list);
    renderAuthArea();
    return u;
  }

  let pendingAfterLogin = null;

  function selesaiLogin(user, modal) {
    store.set("arenaku_user", user);
    const cb = pendingAfterLogin;
    pendingAfterLogin = null;
    modal.close();
    renderAuthArea();
    if (user.role === "admin") {
      toast("Masuk sebagai Admin.");
      if (!/admin\.html$/.test(location.pathname)) location.href = "admin.html";
      else location.reload();
      return;
    }
    toast(`Selamat datang, ${user.nama.split(" ")[0]}!`);
    if (cb) cb();
  }

  function openAuth(tab = "login", afterLogin = null) {
    pendingAfterLogin = afterLogin;
    const m = openModal(`
      <h2>${afterLogin ? "Masuk untuk melanjutkan" : "Masuk ke ArenaKu"}</h2>
      <p class="muted">${afterLogin ? "Kamu perlu login untuk menyelesaikan langkah ini. Pilihanmu tidak akan hilang." : "Masuk atau buat akun baru."}</p>
      <div class="tabs" role="tablist">
        <button type="button" data-tab="login">Masuk</button>
        <button type="button" data-tab="register">Daftar</button>
      </div>
      <form id="form-login" novalidate>
        <div class="form-group"><label for="l-id">Email atau username</label><input type="text" id="l-id" placeholder="nama@email.com" autocomplete="username"><div class="error"></div></div>
        <div class="form-group"><label for="l-sandi">Kata sandi</label><input type="password" id="l-sandi" placeholder="Kata sandi" autocomplete="current-password"><div class="error"></div></div>
        <button type="submit" class="btn btn-primary btn-block">Masuk</button>
      </form>
      <form id="form-register" novalidate hidden>
        <div class="form-group"><label for="r-nama">Nama lengkap</label><input type="text" id="r-nama" autocomplete="name"><div class="error"></div></div>
        <div class="form-group"><label for="r-email">Email</label><input type="email" id="r-email" placeholder="nama@email.com" autocomplete="email"><div class="error"></div></div>
        <div class="form-group"><label for="r-hp">Nomor HP</label><input type="tel" id="r-hp" placeholder="081234567890" autocomplete="tel"><div class="error"></div></div>
        <div class="form-group"><label for="r-sandi">Kata sandi</label><input type="password" id="r-sandi" autocomplete="new-password"><div class="error"></div></div>
        <div class="form-group"><label for="r-ulang">Ulangi kata sandi</label><input type="password" id="r-ulang" autocomplete="new-password"><div class="error"></div></div>
        <button type="submit" class="btn btn-primary btn-block">Daftar &amp; Lanjut</button>
      </form>
      <p class="muted small center" style="margin-top:12px">Simulasi frontend: data hanya tersimpan di browser ini.</p>`,
      { cls: "modal-sm", onClose: () => { if (afterLogin) pendingAfterLogin = null; } });

    const tampil = (t) => {
      m.$$("[data-tab]").forEach((b) => b.classList.toggle("aktif", b.dataset.tab === t));
      m.$("#form-login").hidden = t !== "login";
      m.$("#form-register").hidden = t !== "register";
    };
    m.$$("[data-tab]").forEach((b) => b.addEventListener("click", () => tampil(b.dataset.tab)));
    tampil(tab);

    m.$("#form-login").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = m.$("#l-id"), sandi = m.$("#l-sandi");
      const ident = id.value.trim().toLowerCase();
      if (!setError(id, ident ? "" : "Isi email atau username.") | !setError(sandi, sandi.value ? "" : "Isi kata sandi.")) return;

      if (ident === ADMIN.username) {
        if (sandi.value !== ADMIN.password) { setError(sandi, "Kata sandi salah."); return; }
        selesaiLogin({ nama: ADMIN.nama, email: ADMIN.username, hp: "", role: "admin" }, m);
        return;
      }
      if (!emailOk(ident)) { setError(id, "Format email tidak valid."); return; }
      const users = getUsers();
      const u = users.find((x) => x.email === ident);
      if (!u) { setError(id, "Akun belum terdaftar. Silakan daftar dulu."); return; }
      const hash = await hashPw(ident, sandi.value);
      if (u.hash && u.hash !== hash) { setError(sandi, "Kata sandi salah."); return; }
      if (!u.hash) { u.hash = hash; saveUsers(users); }
      selesaiLogin({ nama: u.nama, email: u.email, hp: u.hp || "", role: "user" }, m);
    });

    m.$("#form-register").addEventListener("submit", async (e) => {
      e.preventDefault();
      const nama = m.$("#r-nama"), email = m.$("#r-email"), hp = m.$("#r-hp"), sandi = m.$("#r-sandi"), ulang = m.$("#r-ulang");
      const em = email.value.trim().toLowerCase();
      const cek = [
        setError(nama, nama.value.trim().length >= 3 ? "" : "Nama minimal 3 karakter."),
        setError(email, !emailOk(em) ? "Format email tidak valid." : getUsers().some((x) => x.email === em) ? "Email sudah terdaftar. Silakan masuk." : ""),
        setError(hp, hpOk(hp.value) ? "" : "Nomor HP tidak valid (contoh: 081234567890)."),
        setError(sandi, sandi.value.length >= 6 ? "" : "Kata sandi minimal 6 karakter."),
        setError(ulang, ulang.value === sandi.value ? "" : "Konfirmasi kata sandi tidak sama.")
      ];
      if (!cek.every(Boolean)) return;
      const user = { nama: nama.value.trim(), email: em, hp: hp.value.replace(/[\s-]/g, ""), hash: await hashPw(em, sandi.value), dibuat: new Date().toISOString() };
      saveUsers([...getUsers(), user]);
      selesaiLogin({ nama: user.nama, email: user.email, hp: user.hp, role: "user" }, m);
    });
  }

  /** Jalankan aksi hanya jika sudah login sebagai user; bila belum, tampilkan modal login lalu lanjutkan. */
  function requireLogin(aksi) {
    const u = getUser();
    if (!u) openAuth("login", aksi);
    else if (u.role === "admin") toast("Akun admin hanya untuk memantau. Masuk sebagai user untuk booking.");
    else aksi();
  }

  function logout() {
    store.del("arenaku_user");
    if (/(profil|admin)\.html$/.test(location.pathname)) location.href = "index.html";
    else { renderAuthArea(); toast("Kamu sudah keluar."); }
  }

  /* ---------- Toast, modal, konfirmasi ---------- */
  function toast(pesan) {
    let wadah = $("#toast-wrap");
    if (!wadah) { wadah = document.createElement("div"); wadah.id = "toast-wrap"; document.body.appendChild(wadah); }
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = pesan;
    wadah.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function openModal(html, { cls = "", onClose } = {}) {
    const ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">
      <button class="modal-x" type="button" aria-label="Tutup">×</button>${html}</div>`;
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");
    const onKey = (e) => { if (e.key === "Escape") close(); };
    function close() {
      if (!ov.isConnected) return;
      ov.remove();
      document.removeEventListener("keydown", onKey);
      if (!$(".modal-overlay, .lightbox")) document.body.classList.remove("no-scroll");
      if (onClose) onClose();
    }
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    $(".modal-x", ov).addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    const fokus = $("input, select, textarea", ov);
    if (fokus) fokus.focus();
    return { el: ov, close, $: (s) => $(s, ov), $$: (s) => $$(s, ov) };
  }

  function confirmBox({ judul, teks, ok = "Ya", batal = "Batal", bahaya = false }) {
    return new Promise((resolve) => {
      let hasil = false;
      const m = openModal(`<h2>${esc(judul)}</h2><p class="muted" style="margin:8px 0 18px">${esc(teks)}</p>
        <div class="row-btn"><button type="button" class="btn btn-outline" data-no>${esc(batal)}</button>
        <button type="button" class="btn ${bahaya ? "btn-danger" : "btn-primary"}" data-yes>${esc(ok)}</button></div>`,
        { cls: "modal-sm", onClose: () => resolve(hasil) });
      m.$("[data-no]").addEventListener("click", m.close);
      m.$("[data-yes]").addEventListener("click", () => { hasil = true; m.close(); });
    });
  }

  /* ---------- Filter lokasi bertingkat (Provinsi -> Kota) ---------- */
  function bindLokasi(provSel, kotaSel, venues, { prov = "", kota = "" } = {}) {
    const urutProv = ["DKI Jakarta", "Banten", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur"];
    const provs = [...new Set(venues.map((v) => v.provinsi))].sort((a, b) => urutProv.indexOf(a) - urutProv.indexOf(b));
    provSel.innerHTML = '<option value="">Semua provinsi</option>' + provs.map((p) => `<option>${esc(p)}</option>`).join("");
    const isiKota = () => {
      const ks = [...new Set(venues.filter((v) => !provSel.value || v.provinsi === provSel.value).map((v) => v.kota))].sort();
      const cur = kotaSel.value;
      kotaSel.innerHTML = '<option value="">Semua kota/kabupaten</option>' + ks.map((k) => `<option>${esc(k)}</option>`).join("");
      if (ks.includes(cur)) kotaSel.value = cur;
    };
    provSel.addEventListener("change", isiKota);
    provSel.value = prov;
    isiKota();
    kotaSel.value = kota;
  }

  /* ---------- Booking, kode unik, dan slot ---------- */
  const normBooking = (b) => ({
    status: "Pending", bayar: "Menunggu verifikasi", hadir: false, hiddenUser: false,
    nama: "", hp: "", venueNama: "", lapNama: "", dibuat: "", ...b
  });
  const getBookings = () => store.get("arenaku_bookings", []).map(normBooking);
  const saveBookings = (a) => store.set("arenaku_bookings", a);
  const aktif = (b) => b.status !== "Dibatalkan";

  function kodeUnik(sudah) {
    const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa karakter yang mudah tertukar (O/0, I/1)
    let kode;
    do {
      kode = "ARK-" + Array.from({ length: 6 }, () => abjad[Math.floor(Math.random() * abjad.length)]).join("");
    } while (sudah.has(kode));
    return kode;
  }

  /** Membuat booking baru atas nama user yang sedang login. Mengembalikan data booking (termasuk kode unik). */
  function addBooking({ venue, lap, iso, jam, metode }) {
    const u = getUser();
    const semua = getBookings();
    const total = jam.reduce((n) => n + hargaTanggal(lap, iso), 0);
    const b = normBooking({
      kode: kodeUnik(new Set(semua.map((x) => x.kode))),
      venueId: venue.id, venueNama: venue.nama, lapId: lap.id, lapNama: lap.nama,
      tanggal: iso, jam, total, metode, email: u.email, nama: u.nama, hp: u.hp || "",
      dibuat: new Date().toISOString()
    });
    saveBookings([...semua, b]);
    return b;
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /** Status slot: available | booked | past | mine | closed (data ketersediaan simulasi yang konsisten). */
  function slotStatus(venue, lap, iso, h) {
    if (venue.coming_soon) return "closed";
    const now = new Date();
    if (iso < toISO(now) || (iso === toISO(now) && h <= now.getHours())) return "past";
    const bk = getBookings().find((b) => aktif(b) && b.venueId === venue.id && b.lapId === lap.id && b.tanggal === iso && b.jam.includes(h));
    if (bk) { const me = getUser(); return me && bk.email === me.email ? "mine" : "booked"; }
    const peak = h >= 17 && h <= 21;
    return hash(`${venue.id}|${lap.id}|${iso}|${h}`) % 100 < (peak ? 55 : 25) ? "booked" : "available";
  }
  const SLOT_TEXT = { available: "Tersedia", booked: "Sudah dipesan", past: "Lewat", mine: "Pesananmu", closed: "Tutup" };

  const slotLegend = () => `<div class="legend">
    <span><i class="dot available"></i>Tersedia</span><span><i class="dot booked"></i>Sudah dipesan</span>
    <span><i class="dot dipilih"></i>Dipilih</span><span><i class="dot past"></i>Lewat / pesananmu</span></div>`;

  function renderSlots(el, { venue, lap, iso, selectable = false, onChange }) {
    let sel = [];
    const hours = [];
    for (let h = venue.jam_buka; h < venue.jam_tutup; h++) hours.push(h);
    const stat = { available: 0, total: hours.length };

    function draw() {
      stat.available = 0;
      sel = sel.filter((h) => slotStatus(venue, lap, iso, h) === "available");
      el.innerHTML = `<div class="slot-grid">${hours.map((h) => {
        const st = slotStatus(venue, lap, iso, h);
        if (st === "available") stat.available++;
        const dipilih = sel.includes(h);
        const label = `${pad(h)}:00–${pad(h + 1)}:00`;
        const isi = `<span>${label}</span><small>${dipilih ? "Dipilih" : SLOT_TEXT[st]}</small>`;
        return selectable && st === "available"
          ? `<button type="button" class="slot ${dipilih ? "dipilih" : "available"}" data-h="${h}">${isi}</button>`
          : `<div class="slot ${dipilih ? "dipilih" : st}">${isi}</div>`;
      }).join("")}</div>`;
    }
    function toggle(h) {
      if (sel.includes(h)) {
        const mn = Math.min(...sel), mx = Math.max(...sel);
        sel = h === mn || h === mx ? sel.filter((x) => x !== h) : sel.filter((x) => x < h);
      } else if (sel.length && (h === Math.min(...sel) - 1 || h === Math.max(...sel) + 1)) {
        sel = [...sel, h].sort((a, b) => a - b);
      } else {
        sel = [h];
      }
      draw();
      if (onChange) onChange([...sel]);
    }
    el.onclick = (e) => {
      const b = e.target.closest("button.slot");
      if (b) toggle(Number(b.dataset.h));
    };
    draw();
    return {
      get selected() { return [...sel]; }, stat, clear() { sel = []; draw(); },
      refresh() { const sebelum = sel.length; draw(); if (onChange && sel.length !== sebelum) onChange([...sel]); }
    };
  }

  /* ---------- Kartu venue (gaya ayo.co.id) ---------- */
  function venueCard(v, extra = "") {
    const sp = SPORT[v.olahraga[0]] || { ikon: "🏟️", warna: "linear-gradient(135deg,#0b6e3e,#4cc075)" };
    const badge = v.badge || v.olahraga[0];
    const bcls = v.badge === "COMING SOON" ? "soon" : v.badge === "PROMO" ? "promo" : "sport";
    const foto = fotosOf(v)[0];
    const img = foto ? `<img src="${esc(foto)}" alt="${esc(v.nama)}" loading="lazy" onerror="this.remove()">` : "";
    const rating = v.rating
      ? `<span class="rating">★ ${v.rating.toFixed(2)}</span> <span class="muted">(${v.ulasan} ulasan)</span>`
      : '<span class="muted">Belum ada ulasan</span>';
    const harga = v.coming_soon ? '<span class="muted">Segera hadir</span>' : `Mulai <strong>${rupiah(v.harga)}</strong> / sesi`;
    return `<a class="card venue-card" href="detail.html?id=${v.id}${extra}">
      <div class="venue-foto" style="background:${sp.warna}"><span class="emoji">${sp.ikon}</span>${img}
        <span class="label ${bcls}">${esc(badge)}</span></div>
      <div class="venue-body">
        <h3>${esc(v.nama)}</h3>
        <p class="venue-meta">📍 ${esc(v.kota)}</p>
        <p>${rating}</p>
        <div class="tags">${v.olahraga.map((o) => `<span class="tag">${esc(o)}</span>`).join("")}</div>
        <p class="venue-harga">${harga}</p>
      </div></a>`;
  }

  /* ---------- Kartu sparring ---------- */
  const jamText = (s) => {
    const [h, m] = s.jam_mulai.split(":").map(Number);
    return `${s.jam_mulai}–${pad((h + s.durasi) % 24)}:${pad(m)} (${s.durasi} jam)`;
  };

  function sparringCard(s, vmap) {
    const v = vmap.get(s.venue_id);
    const sp = SPORT[s.olahraga] || { ikon: "🏟️" };
    const me = getUser();
    const milik = !!(me && s.email && s.email === me.email);
    const joined = !!(me && getJoins().some((j) => j.sparId === s.id && j.email === me.email));
    const jumlah = getJoins().filter((j) => j.sparId === s.id).length;
    const tombol = milik
      ? '<button type="button" class="btn btn-outline btn-block" disabled>Postinganmu</button>'
      : joined
        ? '<button type="button" class="btn btn-outline btn-block" disabled>Permintaan terkirim ✓</button>'
        : `<button type="button" class="btn btn-primary btn-block" data-join="${esc(s.id)}">Tantang / Bergabung</button>`;
    return `<article class="card spar-card">
      <div class="spar-top"><span class="label sport">${sp.ikon} ${esc(s.olahraga)}</span>
        <span class="level level-${esc(s.level.toLowerCase())}">${esc(s.level)}</span></div>
      <h3>${esc(s.tim)}</h3>
      <p class="muted small">PIC: ${esc(s.pic)}${jumlah ? ` · ${jumlah} tim menantang` : ""}</p>
      <ul class="spar-info">
        <li>📍 ${v ? `<a href="detail.html?id=${v.id}">${esc(v.nama)}</a> · ${esc(v.kota)}` : "Venue belum ditentukan"}</li>
        <li>📅 ${esc(fmtTanggal(s.tanggal))}</li>
        <li>🕒 ${esc(jamText(s))}</li>
        <li>💸 ${esc(s.biaya)}</li>
      </ul>
      ${s.catatan ? `<p class="spar-note">“${esc(s.catatan)}”</p>` : ""}
      ${tombol}</article>`;
  }

  /** Aksi "Tantang / Bergabung": login baru diminta saat tombol ditekan; hasilnya dicatat sebagai riwayat. */
  function bindSparringActions(container, getList, vmap, onChange) {
    container.addEventListener("click", (e) => {
      const b = e.target.closest("[data-join]");
      if (!b) return;
      const s = getList().find((x) => x.id === b.dataset.join);
      if (!s) return;
      requireLogin(() => {
        const me = getUser();
        const joins = getJoins();
        if (!joins.some((j) => j.sparId === s.id && j.email === me.email)) {
          joins.push({
            id: "j" + Date.now() + Math.random().toString(36).slice(2, 5), sparId: s.id, tim: s.tim, pic: s.pic,
            kontak: s.kontak, venue_id: s.venue_id, olahraga: s.olahraga, tanggal: s.tanggal, jam_mulai: s.jam_mulai,
            durasi: s.durasi, email: me.email, nama: me.nama, dibuat: new Date().toISOString(), hiddenUser: false
          });
          saveJoins(joins);
        }
        const v = vmap.get(s.venue_id);
        const m = openModal(`<h2>Tantangan terkirim 🎉</h2>
          <p>Permintaanmu untuk <strong>${esc(s.tim)}</strong> sudah dikirim.</p>
          <ul class="spar-info">
            <li>👤 PIC: ${esc(s.pic)}</li>
            <li>📞 Kontak: ${esc(s.kontak || "-")}</li>
            <li>📍 ${v ? esc(v.nama) : "Venue belum ditentukan"}</li>
            <li>📅 ${esc(fmtTanggal(s.tanggal))}, ${esc(jamText(s))}</li>
          </ul>
          <p class="muted small">Hubungi PIC untuk konfirmasi jadwal. Riwayatnya tersimpan di menu Profil. (Data dummy)</p>
          <button type="button" class="btn btn-primary btn-block" data-close>Oke</button>`, { cls: "modal-sm" });
        m.$("[data-close]").addEventListener("click", m.close);
        if (onChange) onChange();
      });
    });
  }

  /* ---------- Navbar, menu profil, footer ---------- */
  const MENU = [
    ["venue.html", "Sewa Lapangan", "venue"],
    ["sparring.html", "Sparring", "sparring"],
    ["jadwal.html", "Jadwal Lapangan", "jadwal"],
    ["tentang.html", "Tentang Kami", "tentang"],
    ["kontak.html", "Kontak Kami", "kontak"]
  ];

  function renderAuthArea() {
    const el = $("#nav-auth");
    if (!el) return;
    const u = getUser();
    if (!u) {
      el.innerHTML = '<button type="button" class="btn btn-outline btn-sm" data-auth="login">Masuk</button><button type="button" class="btn btn-primary btn-sm" data-auth="register">Daftar</button>';
      return;
    }
    const admin = u.role === "admin";
    el.innerHTML = `<div class="user-menu">
      <button type="button" class="user-btn" id="user-btn" aria-haspopup="true" aria-expanded="false">
        <span class="avatar">${esc(u.nama.charAt(0).toUpperCase())}</span><span class="user-nama">${admin ? "Admin" : esc(u.nama.split(" ")[0])}</span><span class="caret">▾</span>
      </button>
      <div class="user-dd" id="user-dd" hidden>
        ${admin
          ? '<a href="admin.html">📊 Dashboard Admin</a>'
          : '<a href="profil.html">👤 Profil Saya</a><a href="profil.html#riwayat">🧾 Riwayat</a>'}
        <hr><button type="button" id="btn-logout">↩ Keluar</button>
      </div></div>`;
  }

  function renderChrome() {
    const page = document.body.dataset.page;
    const h = $("#site-header");
    if (h) {
      h.outerHTML = `<header class="navbar"><div class="container nav-inner">
        <a href="index.html" class="logo">Arena<span>Ku</span></a>
        <div class="nav-panel" id="nav-panel">
          <nav class="nav-menu">${MENU.map(([href, label, key]) =>
            `<a href="${href}" class="${key === page ? "aktif" : ""}">${label}</a>`).join("")}</nav>
          <div class="nav-auth" id="nav-auth"></div>
        </div>
        <button type="button" class="nav-toggle" aria-label="Buka menu" aria-expanded="false">☰</button>
      </div></header>`;
    }
    const f = $("#site-footer");
    if (f) {
      f.outerHTML = `<footer class="footer"><div class="container">
        <div class="footer-grid">
          <div><h4>ArenaKu</h4><p>Platform sewa lapangan dan cari lawan sparring di seluruh Pulau Jawa: futsal, mini soccer, basket, badminton, tennis, padel, dan pickleball.</p></div>
          <div><h4>Layanan</h4><ul><li><a href="venue.html">Sewa Lapangan</a></li><li><a href="sparring.html">Sparring</a></li><li><a href="jadwal.html">Jadwal Lapangan</a></li></ul></div>
          <div><h4>Perusahaan</h4><ul><li><a href="tentang.html">Tentang Kami</a></li><li><a href="kontak.html">Kontak Kami</a></li><li><a href="index.html#faq">FAQ</a></li></ul></div>
          <div><h4>Hubungi Kami</h4><ul><li>halo@arenaku.example</li><li>0812-0000-0000</li><li>Madiun, Jawa Timur</li></ul></div>
        </div>
        <p class="copy">© 2026 ArenaKu · Tugas UTS Pemrograman Web Dasar · Seluruh data venue adalah data dummy.</p>
      </div></footer>`;
    }
    renderAuthArea();

    document.addEventListener("click", (e) => {
      const dd = $("#user-dd");
      const ub = e.target.closest("#user-btn");
      if (ub && dd) {
        dd.hidden = !dd.hidden;
        ub.setAttribute("aria-expanded", String(!dd.hidden));
        return;
      }
      if (dd && !dd.hidden && !e.target.closest("#user-dd")) { dd.hidden = true; const b = $("#user-btn"); if (b) b.setAttribute("aria-expanded", "false"); }
      const t = e.target.closest(".nav-toggle");
      if (t) {
        const buka = $(".navbar").classList.toggle("buka");
        t.setAttribute("aria-expanded", String(buka));
        return;
      }
      const a = e.target.closest("[data-auth]");
      if (a) { openAuth(a.dataset.auth); return; }
      if (e.target.closest("#btn-logout")) logout();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { const dd = $("#user-dd"); if (dd) dd.hidden = true; }
    });
  }

  renderChrome();

  return {
    $, $$, esc, rupiah, qs, SPORT, PRIORITAS, LEVEL, BIAYA, MAX_HARI, store, pad, toISO, addDays, parseISO, fmtTanggal, fmtWaktu,
    todayISO, maxISO, validTanggal, isWeekend, jamRange, hargaTanggal, onTick,
    getVenues, venueMap, sportList, fotosOf, getSparring, getJoins, saveJoins,
    getUser, getUsers, saveUsers, isAdmin, emailOk, hpOk, hashPw, setError, updateUser, openAuth, requireLogin, logout,
    toast, openModal, confirmBox, bindLokasi,
    getBookings, saveBookings, addBooking, kodeUnik, aktif, slotStatus, renderSlots, slotLegend,
    venueCard, sparringCard, bindSparringActions, jamText
  };
})();
