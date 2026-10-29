"use strict";
/* ArenaKu - sparring.js: daftar sparring, filter, buat postingan, tantang/bergabung */
(async () => {
  const { $, $$, esc } = App;
  const [venues, awal] = await Promise.all([App.getVenues(), App.getSparring()]);
  const vmap = App.venueMap(venues);
  const q = App.qs();
  let semua = awal;

  $("#s-cabang").innerHTML = '<option value="">Semua olahraga</option>' + App.sportList(venues).map((s) => `<option>${esc(s)}</option>`).join("");
  $("#s-cabang").value = q.get("cabang") || "";
  $("#s-level").value = App.LEVEL.includes(q.get("level")) ? q.get("level") : "";
  $("#s-biaya").value = App.BIAYA.includes(q.get("biaya")) ? q.get("biaya") : "";

  let tampil = [];
  function render() {
    const cab = $("#s-cabang").value, lv = $("#s-level").value, bi = $("#s-biaya").value;
    tampil = semua.filter((s) => (!cab || s.olahraga === cab) && (!lv || s.level === lv) && (!bi || s.biaya === bi));
    $("#jumlah").textContent = `${tampil.length} slot sparring terbuka`;
    $("#daftar-sparring").innerHTML = tampil.length
      ? tampil.map((s) => App.sparringCard(s, vmap)).join("")
      : '<p class="kosong">Belum ada sparring yang cocok. Jadilah yang pertama membuat postingan!</p>';
  }
  ["#s-cabang", "#s-level", "#s-biaya"].forEach((id) => $(id).addEventListener("change", render));
  App.bindSparringActions($("#daftar-sparring"), () => tampil, vmap, render);
  render();

  /* ---------- Buat postingan ---------- */
  $("#btn-buat").addEventListener("click", () => {
    const bisa = venues.filter((v) => !v.coming_soon);
    const grup = {};
    bisa.forEach((v) => (grup[v.provinsi] = grup[v.provinsi] || []).push(v));
    const besok = App.toISO(App.addDays(new Date(), 1));

    const m = App.openModal(`
      <h2>Buat Postingan Sparring</h2>
      <p class="muted">Isi detail pertandingan. Kamu akan diminta login saat menekan Posting.</p>
      <form id="form-spar" novalidate>
        <div class="form-row">
          <div class="form-group"><label for="p-tim">Nama tim / komunitas</label><input type="text" id="p-tim"><div class="error"></div></div>
          <div class="form-group"><label for="p-pic">Nama PIC</label><input type="text" id="p-pic"><div class="error"></div></div>
        </div>
        <div class="form-group"><label for="p-kontak">Kontak PIC (WhatsApp)</label><input type="tel" id="p-kontak" placeholder="081234567890"><div class="error"></div></div>
        <div class="form-group"><label for="p-venue">Venue lapangan</label>
          <select id="p-venue"><option value="">Pilih venue</option>${Object.entries(grup).map(([p, vs]) =>
            `<optgroup label="${esc(p)}">${vs.map((v) => `<option value="${v.id}">${esc(v.nama)} (${esc(v.kota)})</option>`).join("")}</optgroup>`).join("")}</select>
          <div class="error"></div></div>
        <div class="form-row">
          <div class="form-group"><label for="p-olahraga">Cabang olahraga</label><select id="p-olahraga"><option value="">Pilih venue dulu</option></select><div class="error"></div></div>
          <div class="form-group"><label for="p-level">Level skill</label><select id="p-level">${App.LEVEL.map((l) => `<option>${l}</option>`).join("")}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="p-tanggal">Tanggal</label><input type="date" id="p-tanggal" min="${App.todayISO()}" value="${besok}"><div class="error"></div></div>
          <div class="form-group"><label for="p-jam">Jam mulai</label><input type="time" id="p-jam" value="19:00"><div class="error"></div></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label for="p-durasi">Durasi</label><select id="p-durasi"><option value="1">1 jam</option><option value="2" selected>2 jam</option><option value="3">3 jam</option></select></div>
          <div class="form-group"><label for="p-biaya">Skema biaya</label><select id="p-biaya">${App.BIAYA.map((b) => `<option>${b}</option>`).join("")}</select></div>
        </div>
        <div class="form-group"><label for="p-catatan">Catatan (opsional)</label><textarea id="p-catatan" rows="2" maxlength="140"></textarea></div>
        <button type="submit" class="btn btn-primary btn-block">Posting</button>
      </form>`);

    // Pilihan olahraga mengikuti venue yang dipilih
    m.$("#p-venue").addEventListener("change", (e) => {
      const v = vmap.get(Number(e.target.value));
      m.$("#p-olahraga").innerHTML = v
        ? v.olahraga.map((o) => `<option>${esc(o)}</option>`).join("")
        : '<option value="">Pilih venue dulu</option>';
    });

    const err = (id, pesan) => {
      m.$(id).closest(".form-group").querySelector(".error").textContent = pesan;
      return !pesan;
    };
    m.$("#form-spar").addEventListener("submit", (e) => {
      e.preventDefault();
      const kontak = m.$("#p-kontak").value.replace(/[\s-]/g, "");
      const ok = [
        err("#p-tim", m.$("#p-tim").value.trim().length >= 3 ? "" : "Nama tim minimal 3 karakter."),
        err("#p-pic", m.$("#p-pic").value.trim().length >= 2 ? "" : "Nama PIC wajib diisi."),
        err("#p-kontak", /^(08|\+628)\d{8,11}$/.test(kontak) ? "" : "Nomor tidak valid (contoh: 081234567890)."),
        err("#p-venue", m.$("#p-venue").value ? "" : "Pilih venue."),
        err("#p-olahraga", m.$("#p-olahraga").value ? "" : "Pilih cabang olahraga."),
        err("#p-tanggal", App.validTanggal(m.$("#p-tanggal").value) ? "" : "Pilih tanggal dalam 14 hari ke depan."),
        err("#p-jam", m.$("#p-jam").value ? "" : "Jam wajib diisi.")
      ].every(Boolean);
      if (!ok) return;

      const venue = vmap.get(Number(m.$("#p-venue").value));
      const jam = m.$("#p-jam").value;
      const jamBuka = `${App.pad(venue.jam_buka)}:00`, jamTutup = `${App.pad(venue.jam_tutup)}:00`;
      if (jam < jamBuka || jam >= jamTutup) {
        err("#p-jam", `Venue buka ${jamBuka}–${jamTutup}.`);
        return;
      }
      const post = {
        id: "u" + Date.now(),
        tim: m.$("#p-tim").value.trim(),
        pic: m.$("#p-pic").value.trim(),
        kontak,
        venue_id: venue.id,
        tanggal: m.$("#p-tanggal").value,
        jam_mulai: jam,
        durasi: Number(m.$("#p-durasi").value),
        olahraga: m.$("#p-olahraga").value,
        level: m.$("#p-level").value,
        biaya: m.$("#p-biaya").value,
        catatan: m.$("#p-catatan").value.trim()
      };
      m.close();
      // Login diminta di akhir, saat posting
      App.requireLogin(() => {
        const lokal = App.store.get("arenaku_sparring", []);
        lokal.push({ ...post, email: App.getUser().email });
        App.store.set("arenaku_sparring", lokal);
        App.getSparring().then((d) => { semua = d; render(); });
        App.toast("Postingan sparring berhasil dibuat!");
      });
    });
  });
})();
