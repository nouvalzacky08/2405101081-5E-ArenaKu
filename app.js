"use strict";
/* ArenaKu - app.js
   Modul bersama: data, navbar/footer, modal login (di akhir alur), kalender slot,
   kartu venue, dan kartu sparring. Dipakai oleh semua halaman. */
const App = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const qs = () => new URLSearchParams(location.search);

  const SPORT = {
    "Futsal": { ikon: "⚽", warna: "linear-gradient(135deg,#0b6e3e,#4cc075)" },
    "Mini Soccer": { ikon: "🥅", warna: "linear-gradient(135deg,#2e7d32,#a5d66b)" },
    "Basketball": { ikon: "🏀", warna: "linear-gradient(135deg,#d84315,#ffb74d)" },
    "Badminton": { ikon: "🏸", warna: "linear-gradient(135deg,#1565c0,#64b5f6)" },
    "Tennis": { ikon: "🎾", warna: "linear-gradient(135deg,#9e9d24,#e6ee9c)" },
    "Padel": { ikon: "🥎", warna: "linear-gradient(135deg,#00838f,#4dd0e1)" },
    "Pickleball": { ikon: "🏓", warna: "linear-gradient(135deg,#6a1b9a,#ce93d8)" }
  };
  const PRIORITAS = ["Kota Madiun", "Kabupaten Madiun", "Kabupaten Magetan", "Kabupaten Ngawi"];
  const LEVEL = ["Pemula", "Menengah", "Lanjutan"];
  const BIAYA = ["Patungan", "Gratis", "Ditanggung Pembuat Listing"];

  /* ---------- Penyimpanan lokal (aman bila diblokir browser) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* abaikan */ } }
  };

  /* ---------- Tanggal ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseISO = (iso) => new Date(iso + "T00:00:00");
  const fmtTanggal = (iso) =>
    parseISO(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const todayISO = () => toISO(new Date());
  const validTanggal = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || "") && iso >= todayISO() && iso <= toISO(addDays(new Date(), 13));

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

  async function getSparring() {
    const base = await loadJSON("data/sparring.json");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const seed = base.map((s) => ({ ...s, tanggal: toISO(addDays(today, s.hari)) }));
    const lokal = store.get("arenaku_sparring", []).map((s) => ({ ...s, milik: true }));
    return [...seed, ...lokal]
      .filter((s) => s.tanggal >= toISO(today))
      .sort((a, b) => (a.tanggal + a.jam_mulai).localeCompare(b.tanggal + b.jam_mulai));
  }

  /* ---------- Filter lokasi bertingkat (Provinsi -> Kota) ---------- */
  function bindLokasi(provSel, kotaSel, venues, { prov = "", kota = "" } = {}) {
    const provs = [...new Set(venues.map((v) => v.provinsi))];
    provSel.innerHTML = '<option value="">Semua provinsi</option>' + provs.map((p) => `<option>${esc(p)}</option>`).join("");
    const isiKota = () => {
      const ks = [...new Set(venues.filter((v) => !provSel.value || v.provinsi === provSel.value).map((v) => v.kota))];
      const cur = kotaSel.value;
      kotaSel.innerHTML = '<option value="">Semua kota/kabupaten</option>' + ks.map((k) => `<option>${esc(k)}</option>`).join("");
      if (ks.includes(cur)) kotaSel.value = cur;
    };
    provSel.addEventListener("change", isiKota);
    provSel.value = prov;
    isiKota();
    kotaSel.value = kota;
  }

  /* ---------- Toast & Modal ---------- */
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
      if (!$(".modal-overlay")) document.body.classList.remove("no-scroll");
      if (onClose) onClose();
    }
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    $(".modal-x", ov).addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    const fokus = $("input, select, textarea", ov);
    if (fokus) fokus.focus();
    return { el: ov, close, $: (s) => $(s, ov), $$: (s) => $$(s, ov) };
  }

  /* ---------- Autentikasi (simulasi frontend, tanpa menyimpan kata sandi) ---------- */
  const getUser = () => store.get("arenaku_user", null);
  let pendingAfterLogin = null;

  function setError(input, pesan) {
    input.closest(".form-group").querySelector(".error").textContent = pesan;
    return !pesan;
  }
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  function selesaiLogin(user, modal) {
    store.set("arenaku_user", user);
    const cb = pendingAfterLogin;
    pendingAfterLogin = null;
    modal.close();
    renderAuthArea();
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
        <div class="form-group"><label for="l-email">Email</label><input type="email" id="l-email" placeholder="nama@email.com" autocomplete="email"><div class="error"></div></div>
        <div class="form-group"><label for="l-sandi">Kata sandi</label><input type="password" id="l-sandi" placeholder="Minimal 6 karakter" autocomplete="current-password"><div class="error"></div></div>
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
      { cls: "modal-sm", onClose: () => { pendingAfterLogin = afterLogin ? null : pendingAfterLogin; } });

    const tampil = (t) => {
      m.$$("[data-tab]").forEach((b) => b.classList.toggle("aktif", b.dataset.tab === t));
      m.$("#form-login").hidden = t !== "login";
      m.$("#form-register").hidden = t !== "register";
    };
    m.$$("[data-tab]").forEach((b) => b.addEventListener("click", () => tampil(b.dataset.tab)));
    tampil(tab);

    m.$("#form-login").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = m.$("#l-email"), sandi = m.$("#l-sandi");
      const ok = [
        setError(email, emailOk(email.value.trim()) ? "" : "Format email tidak valid."),
        setError(sandi, sandi.value.length >= 6 ? "" : "Kata sandi minimal 6 karakter.")
      ].every(Boolean);
      if (!ok) return;
      const em = email.value.trim().toLowerCase();
      const dikenal = store.get("arenaku_users", []).find((u) => u.email === em);
      const nama = dikenal ? dikenal.nama : em.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      selesaiLogin({ nama, email: em, hp: dikenal ? dikenal.hp : "" }, m);
    });

    m.$("#form-register").addEventListener("submit", (e) => {
      e.preventDefault();
      const nama = m.$("#r-nama"), email = m.$("#r-email"), hp = m.$("#r-hp"), sandi = m.$("#r-sandi"), ulang = m.$("#r-ulang");
      const ok = [
        setError(nama, nama.value.trim().length >= 3 ? "" : "Nama minimal 3 karakter."),
        setError(email, emailOk(email.value.trim()) ? "" : "Format email tidak valid."),
        setError(hp, /^(08|\+628)\d{8,11}$/.test(hp.value.replace(/[\s-]/g, "")) ? "" : "Nomor HP tidak valid (contoh: 081234567890)."),
        setError(sandi, sandi.value.length >= 6 ? "" : "Kata sandi minimal 6 karakter."),
        setError(ulang, ulang.value === sandi.value ? "" : "Konfirmasi kata sandi tidak sama.")
      ].every(Boolean);
      if (!ok) return;
      const user = { nama: nama.value.trim(), email: email.value.trim().toLowerCase(), hp: hp.value.replace(/[\s-]/g, "") };
      const users = store.get("arenaku_users", []).filter((u) => u.email !== user.email);
      users.push(user);
      store.set("arenaku_users", users);
      selesaiLogin(user, m);
    });
  }

  /** Jalankan aksi hanya jika sudah login; jika belum, tampilkan modal login lalu lanjutkan. */
  function requireLogin(aksi) {
    if (getUser()) aksi();
    else openAuth("login", aksi);
  }

  /* ---------- Navbar & footer ---------- */
  const MENU = [
    ["venue.html", "Sewa Lapangan", "venue"],
    ["sparring.html", "Sparring", "sparring"],
    ["jadwal.html", "Jadwal Lapangan", "jadwal"],
    ["tentang.html", "Tentang Kami", "tentang"]
  ];

  function renderAuthArea() {
    const el = $("#nav-auth");
    if (!el) return;
    const u = getUser();
    el.innerHTML = u
      ? `<span class="nav-user">Halo, ${esc(u.nama.split(" ")[0])}</span><button type="button" class="btn btn-outline btn-sm" id="btn-logout">Keluar</button>`
      : `<button type="button" class="btn btn-outline btn-sm" data-auth="login">Masuk</button><button type="button" class="btn btn-primary btn-sm" data-auth="register">Daftar</button>`;
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
          <div><h4>ArenaKu</h4><p>Platform sewa lapangan dan cari lawan sparring untuk futsal, mini soccer, basket, badminton, tennis, padel, dan pickleball.</p></div>
          <div><h4>Layanan</h4><ul><li><a href="venue.html">Sewa Lapangan</a></li><li><a href="sparring.html">Sparring</a></li><li><a href="jadwal.html">Jadwal Lapangan</a></li></ul></div>
          <div><h4>Perusahaan</h4><ul><li><a href="tentang.html">Tentang Kami</a></li><li><a href="index.html#faq">FAQ</a></li><li><a href="index.html#cara-booking">Cara Booking</a></li></ul></div>
          <div><h4>Kontak</h4><ul><li>halo@arenaku.example</li><li>0812-0000-0000</li><li>Madiun, Jawa Timur</li></ul></div>
        </div>
        <p class="copy">© 2026 ArenaKu · Tugas UTS Pemrograman Web Dasar · Seluruh data venue adalah data dummy.</p>
      </div></footer>`;
    }
    renderAuthArea();

    document.addEventListener("click", (e) => {
      const t = e.target.closest(".nav-toggle");
      if (t) {
        const buka = $(".navbar").classList.toggle("buka");
        t.setAttribute("aria-expanded", String(buka));
        return;
      }
      const a = e.target.closest("[data-auth]");
      if (a) { openAuth(a.dataset.auth); return; }
      if (e.target.closest("#btn-logout")) {
        store.set("arenaku_user", null);
        renderAuthArea();
        toast("Kamu sudah keluar.");
      }
    });
  }

  /* ---------- Kalender tanggal & slot jam ---------- */
  function dateChips(el, { days = 14, selected, onSelect }) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    el.classList.add("date-chips");
    el.innerHTML = Array.from({ length: days }, (_, i) => {
      const d = addDays(today, i), iso = toISO(d);
      return `<button type="button" class="chip-date ${iso === selected ? "aktif" : ""}" data-date="${iso}">
        <small>${d.toLocaleDateString("id-ID", { weekday: "short" })}</small><strong>${d.getDate()}</strong>
        <small>${d.toLocaleDateString("id-ID", { month: "short" })}</small></button>`;
    }).join("");
    el.onclick = (e) => {
      const b = e.target.closest("[data-date]");
      if (!b) return;
      $$(".chip-date", el).forEach((x) => x.classList.toggle("aktif", x === b));
      onSelect(b.dataset.date);
    };
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const getBookings = () => store.get("arenaku_bookings", []);
  const userBooked = (vid, lid, iso, h) =>
    getBookings().some((b) => b.venueId === vid && b.lapId === lid && b.tanggal === iso && b.jam.includes(h));
  function saveBooking(b) { const all = getBookings(); all.push(b); store.set("arenaku_bookings", all); }

  /** Status slot: available | booked | past | mine | closed (data ketersediaan simulasi yang konsisten). */
  function slotStatus(venue, lap, iso, h) {
    if (venue.coming_soon) return "closed";
    const now = new Date();
    if (iso === toISO(now) && h <= now.getHours()) return "past";
    if (userBooked(venue.id, lap.id, iso, h)) return "mine";
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
    return { get selected() { return [...sel]; }, stat, clear() { sel = []; draw(); } };
  }

  /* ---------- Kartu venue (gaya ayo.co.id) ---------- */
  function venueCard(v, extra = "") {
    const sp = SPORT[v.olahraga[0]] || { ikon: "🏟️", warna: "linear-gradient(135deg,#0b6e3e,#4cc075)" };
    const badge = v.badge || v.olahraga[0];
    const bcls = v.badge === "COMING SOON" ? "soon" : v.badge === "PROMO" ? "promo" : "sport";
    const foto = v.foto ? `<img src="${esc(v.foto)}" alt="${esc(v.nama)}" loading="lazy" onerror="this.remove()">` : "";
    const rating = v.rating
      ? `<span class="rating">★ ${v.rating.toFixed(2)}</span> <span class="muted">(${v.ulasan} ulasan)</span>`
      : '<span class="muted">Belum ada ulasan</span>';
    const harga = v.coming_soon ? '<span class="muted">Segera hadir</span>' : `Mulai <strong>${rupiah(v.harga)}</strong> / sesi`;
    return `<a class="card venue-card" href="detail.html?id=${v.id}${extra}">
      <div class="venue-foto" style="background:${sp.warna}"><span class="emoji">${sp.ikon}</span>${foto}
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
    const joined = store.get("arenaku_joined", []).includes(s.id);
    const tombol = s.milik
      ? '<button type="button" class="btn btn-outline btn-block" disabled>Postinganmu</button>'
      : joined
        ? '<button type="button" class="btn btn-outline btn-block" disabled>Permintaan terkirim ✓</button>'
        : `<button type="button" class="btn btn-primary btn-block" data-join="${esc(s.id)}">Tantang / Bergabung</button>`;
    return `<article class="card spar-card">
      <div class="spar-top"><span class="label sport">${sp.ikon} ${esc(s.olahraga)}</span>
        <span class="level level-${esc(s.level.toLowerCase())}">${esc(s.level)}</span></div>
      <h3>${esc(s.tim)}</h3>
      <p class="muted small">PIC: ${esc(s.pic)}</p>
      <ul class="spar-info">
        <li>📍 ${v ? `<a href="detail.html?id=${v.id}">${esc(v.nama)}</a> · ${esc(v.kota)}` : "Venue belum ditentukan"}</li>
        <li>📅 ${esc(fmtTanggal(s.tanggal))}</li>
        <li>🕒 ${esc(jamText(s))}</li>
        <li>💸 ${esc(s.biaya)}</li>
      </ul>
      ${s.catatan ? `<p class="spar-note">“${esc(s.catatan)}”</p>` : ""}
      ${tombol}</article>`;
  }

  /** Aksi "Tantang / Bergabung": baru meminta login saat tombol ditekan. */
  function bindSparringActions(container, getList, vmap, onChange) {
    container.addEventListener("click", (e) => {
      const b = e.target.closest("[data-join]");
      if (!b) return;
      const s = getList().find((x) => x.id === b.dataset.join);
      if (!s) return;
      requireLogin(() => {
        const j = store.get("arenaku_joined", []);
        if (!j.includes(s.id)) j.push(s.id);
        store.set("arenaku_joined", j);
        const v = vmap.get(s.venue_id);
        const m = openModal(`<h2>Tantangan terkirim 🎉</h2>
          <p>Permintaanmu untuk <strong>${esc(s.tim)}</strong> sudah dikirim.</p>
          <ul class="spar-info">
            <li>👤 PIC: ${esc(s.pic)}</li>
            <li>📞 Kontak: ${esc(s.kontak)}</li>
            <li>📍 ${v ? esc(v.nama) : "Venue belum ditentukan"}</li>
            <li>📅 ${esc(fmtTanggal(s.tanggal))}, ${esc(jamText(s))}</li>
          </ul>
          <p class="muted small">Hubungi PIC untuk konfirmasi jadwal. (Data dummy)</p>
          <button type="button" class="btn btn-primary btn-block" data-close>Oke</button>`, { cls: "modal-sm" });
        m.$("[data-close]").addEventListener("click", m.close);
        if (onChange) onChange();
      });
    });
  }

  renderChrome();

  return {
    $, $$, esc, rupiah, qs, SPORT, PRIORITAS, LEVEL, BIAYA, store, pad, toISO, addDays, parseISO, fmtTanggal, todayISO, validTanggal,
    getVenues, venueMap, sportList, getSparring, bindLokasi, toast, openModal, openAuth, requireLogin, getUser,
    dateChips, renderSlots, slotStatus, slotLegend, saveBooking, venueCard, sparringCard, bindSparringActions, jamText
  };
})();
