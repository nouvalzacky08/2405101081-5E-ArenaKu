"use strict";
/* ArenaKu - kontak.js: formulir Kontak Kami (validasi, verifikasi sederhana, pesan tersimpan untuk admin) */
(() => {
  const { $, esc } = App;
  let a = 0, b = 0;

  function soalBaru() {
    a = 2 + Math.floor(Math.random() * 8);
    b = 2 + Math.floor(Math.random() * 8);
    $("#soal").textContent = `${a} + ${b}`;
    $("#k-jawab").value = "";
  }
  soalBaru();

  // Isi otomatis jika user sudah login
  const u = App.getUser();
  if (u && u.role === "user") { $("#k-nama").value = u.nama; $("#k-email").value = u.email; $("#k-hp").value = u.hp || ""; }

  $("#form-kontak").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = { nama: $("#k-nama"), email: $("#k-email"), hp: $("#k-hp"), domisili: $("#k-domisili"), subjek: $("#k-subjek"), pesan: $("#k-pesan") };
    const hasil = [
      App.setError(f.nama, f.nama.value.trim().length >= 3 ? "" : "Nama minimal 3 karakter."),
      App.setError(f.email, App.emailOk(f.email.value.trim()) ? "" : "Format email tidak valid."),
      App.setError(f.hp, App.hpOk(f.hp.value) ? "" : "Nomor HP tidak valid (contoh: 081234567890)."),
      App.setError(f.domisili, f.domisili.value.trim().length >= 3 ? "" : "Isi domisili."),
      App.setError(f.subjek, f.subjek.value.trim().length >= 3 ? "" : "Isi subjek."),
      App.setError(f.pesan, f.pesan.value.trim().length >= 10 ? "" : "Pertanyaan minimal 10 karakter.")
    ];
    const benar = Number($("#k-jawab").value.trim()) === a + b;
    $("#e-jawab").textContent = benar ? "" : "Jawaban salah.";
    if (!hasil.every(Boolean) || !benar) { if (!benar) soalBaru(); return; }

    const pesan = App.store.get("arenaku_pesan", []);
    pesan.push({
      id: "p" + Date.now(), waktu: new Date().toISOString(), nama: f.nama.value.trim(), email: f.email.value.trim(),
      hp: f.hp.value.replace(/[\s-]/g, ""), domisili: f.domisili.value.trim(), subjek: f.subjek.value.trim(), pesan: f.pesan.value.trim()
    });
    App.store.set("arenaku_pesan", pesan);
    $("#kontak-kartu").innerHTML = `<div class="kosong-box"><div class="big">✅</div>
      <h2 style="color:var(--gelap);margin:6px 0">Pesan terkirim</h2>
      <p>Terima kasih, ${esc(f.nama.value.trim().split(" ")[0])}. Tim ArenaKu akan menghubungimu secepatnya.</p>
      <p class="muted small" style="margin-top:8px">Simulasi frontend: pesan tersimpan di browser ini dan tampil di Dashboard Admin.</p>
      <p style="margin-top:14px"><a href="index.html" class="btn btn-primary btn-sm">Kembali ke Beranda</a></p></div>`;
  });
})();
