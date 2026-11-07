"use strict";
/* ArenaKu - chat.js: chat sparring antara pembuat postingan dan penantang.
   - Penantang chat dengan PIC postingan; pembuat postingan chat dengan setiap penantang.
   - Pesan disimpan di localStorage (key arenaku_chat), jadi tetap ada setelah halaman ditutup.
   - Untuk postingan contoh (data dummy), balasan PIC dibuat otomatis agar fitur bisa dicoba (simulasi). */
(() => {
  const { esc } = App;
  const KEY = "arenaku_chat";
  const getChat = () => App.store.get(KEY, []);
  const saveChat = (a) => App.store.set(KEY, a);
  const percakapan = (sparId, pen) =>
    getChat().filter((m) => m.sparId === sparId && m.pen === pen).sort((a, b) => a.waktu.localeCompare(b.waktu));

  function tambahPesan(sparId, pen, dari, nama, teks) {
    const semua = getChat();
    const m = { id: "c" + Date.now() + Math.random().toString(36).slice(2, 6), sparId, pen, dari, nama, teks, waktu: new Date().toISOString() };
    semua.push(m);
    saveChat(semua);
    return m;
  }
  const jam = (iso) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  /** Balasan otomatis PIC (hanya untuk postingan contoh). Isinya mengikuti data postingan. */
  function balasan(spar, venue, nama, teks) {
    const t = teks.toLowerCase();
    if (/terima ?kasih|makasih|thanks|thx/.test(t)) return "Sama-sama! 👍";
    if (/deal|siap|oke|\bok\b|setuju|sip|gas|boleh/.test(t))
      return `Sip, deal! Sampai ketemu di lapangan 🔥 Kontak PIC: ${spar.kontak || "-"}`;
    if (/jam|kapan|waktu|mulai|tanggal|hari/.test(t))
      return `Mainnya ${App.fmtTanggal(spar.tanggal)}, ${App.jamText(spar)}. Datang 15 menit lebih awal ya.`;
    if (/biaya|bayar|harga|patungan|sewa|iuran/.test(t))
      return `Skema biaya: ${spar.biaya}. Rinciannya kita sepakati sebelum main.`;
    if (/level|skill|kemampuan|pemula|menengah|lanjut/.test(t))
      return `Level kami ${spar.level}. Santai saja, yang penting seru dan fair play!`;
    if (/dimana|di mana|lokasi|venue|tempat|alamat|lapangan/.test(t))
      return venue ? `Kita main di ${venue.nama}, ${venue.kota}. Lokasi lengkap ada di halaman detail venue.` : "Venue-nya masih kami konfirmasi ya.";
    if (/halo|hai|\bhi\b|selamat|permisi/.test(t)) return `Halo juga ${nama.split(" ")[0]}! Ada yang mau ditanyakan soal jadwal atau biaya?`;
    return "Oke, noted! Kalau mau tanya jam, biaya, level, atau lokasi, langsung tanya saja ya.";
  }

  function bukaPercakapan(spar, vmap, pen, saya, penNama) {
    const me = App.getUser();
    const venue = vmap.get(spar.venue_id);
    const simulasi = !spar.email; // postingan contoh: tidak ada pemilik akun nyata
    const lawan = saya === "penantang" ? spar.pic : penNama;
    const peran = saya === "penantang" ? `PIC · ${spar.tim}` : "Penantang";
    const cepat = saya === "penantang"
      ? ["Jam berapa mulai?", "Biayanya gimana?", "Levelnya apa?", "Di mana lokasinya?", "Siap, deal!"]
      : ["Siap, kita atur jadwal", "Biaya kita bagi dua ya", "Terima kasih sudah menantang!"];

    const timers = [];
    const m = App.openModal(`
      <div class="chat-head"><span class="avatar">${esc(lawan.charAt(0).toUpperCase())}</span>
        <div><h2>${esc(lawan)}</h2><p class="muted">${esc(peran)}</p></div></div>
      <div class="chat-info">📍 ${venue ? esc(venue.nama) : "Venue belum ditentukan"} · 📅 ${esc(App.fmtTanggal(spar.tanggal))}, ${esc(spar.jam_mulai)}<br>
        ${simulasi && saya === "penantang" ? "Balasan PIC dibuat otomatis (simulasi) karena ini postingan contoh." : "Pesan tersimpan di browser ini."}</div>
      <div class="chat-box" id="chat-box" aria-live="polite"></div>
      <div class="chat-cepat">${cepat.map((c) => `<button type="button" data-cepat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <form class="chat-form" id="chat-form" autocomplete="off">
        <input type="text" id="chat-input" maxlength="300" placeholder="Tulis pesan..." aria-label="Tulis pesan">
        <button type="submit" class="btn btn-primary">Kirim</button>
      </form>`, { onClose: () => timers.forEach(clearTimeout) });
    const box = m.$("#chat-box");

    function gambar(mengetik = false) {
      const pesan = percakapan(spar.id, pen);
      box.innerHTML = (pesan.length ? "" : '<div class="bubble sistem">Belum ada pesan. Sapa dulu untuk menentukan jadwal dan biaya sparring 👋</div>') +
        pesan.map((x) => `<div class="bubble ${x.dari === me.email ? "me" : "lawan"}">${esc(x.teks)}<small>${esc(jam(x.waktu))}</small></div>`).join("") +
        (mengetik ? '<div class="mengetik" aria-label="Sedang mengetik"><i></i><i></i><i></i></div>' : "");
      box.scrollTop = box.scrollHeight;
    }

    function balasOtomatis(teks) {
      if (!(simulasi && saya === "penantang")) return;
      gambar(true);
      const t = setTimeout(() => {
        tambahPesan(spar.id, pen, "pic", spar.pic, balasan(spar, venue, me.nama, teks));
        gambar();
      }, 1000 + Math.random() * 700);
      timers.push(t);
    }

    function kirim(teks) {
      teks = teks.trim();
      if (!teks) return;
      tambahPesan(spar.id, pen, me.email, me.nama, teks.slice(0, 300));
      gambar();
      balasOtomatis(teks);
    }

    m.$("#chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = m.$("#chat-input");
      kirim(inp.value);
      inp.value = "";
      inp.focus();
    });
    m.$(".chat-cepat").addEventListener("click", (e) => {
      const b = e.target.closest("[data-cepat]");
      if (b) kirim(b.dataset.cepat);
    });

    gambar();
    // Pembuka otomatis dari PIC contoh saat percakapan masih kosong
    if (simulasi && saya === "penantang" && !percakapan(spar.id, pen).length) {
      gambar(true);
      timers.push(setTimeout(() => {
        tambahPesan(spar.id, pen, "pic", spar.pic, `Halo ${me.nama.split(" ")[0]}! Terima kasih sudah menantang ${spar.tim}. Mau konfirmasi jadwal dan biayanya dulu?`);
        gambar();
      }, 900));
    }
    setTimeout(() => m.$("#chat-input").focus(), 50);
  }

  /** Titik masuk: dipanggil dari kartu sparring dan halaman profil. */
  App.openChat = function (spar, vmap) {
    const me = App.getUser();
    if (!me || me.role === "admin") return;
    const pembuat = !!(spar.email && spar.email === me.email);

    if (!pembuat) {
      const ikut = App.getJoins().some((j) => j.sparId === spar.id && j.email === me.email);
      if (!ikut) { App.toast("Tekan “Tantang / Bergabung” dulu untuk memulai chat."); return; }
      bukaPercakapan(spar, vmap, me.email, "penantang", me.nama);
      return;
    }

    // Pembuat postingan: pilih penantang (satu per email)
    const peserta = [];
    App.getJoins().filter((j) => j.sparId === spar.id).forEach((j) => { if (!peserta.some((p) => p.email === j.email)) peserta.push(j); });
    if (!peserta.length) { App.toast("Belum ada penantang untuk postinganmu."); return; }
    if (peserta.length === 1) { bukaPercakapan(spar, vmap, peserta[0].email, "pembuat", peserta[0].nama); return; }
    const list = App.openModal(`<h2>Chat penantang</h2><p class="muted">Pilih penantang untuk mulai ngobrol.</p>
      <div class="chat-list">${peserta.map((p) => {
        const msgs = percakapan(spar.id, p.email), last = msgs[msgs.length - 1];
        return `<button type="button" data-pen="${esc(p.email)}"><span class="avatar">${esc(p.nama.charAt(0).toUpperCase())}</span>
          <span><strong>${esc(p.nama)}</strong><small>${last ? esc(last.teks.slice(0, 50)) : "Belum ada pesan"}</small></span></button>`;
      }).join("")}</div>`, { cls: "modal-sm" });
    list.$(".chat-list").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pen]");
      if (!b) return;
      const p = peserta.find((x) => x.email === b.dataset.pen);
      list.close();
      bukaPercakapan(spar, vmap, p.email, "pembuat", p.nama);
    });
  };
})();
