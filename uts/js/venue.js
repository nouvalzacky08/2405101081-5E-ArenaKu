"use strict";
/* ArenaKu - venue.js: daftar venue, pencarian, filter lokasi/olahraga/harga, pengurutan */
(async () => {
  const { $, $$, esc } = App;
  $("#daftar-venue").innerHTML = App.skeleton(6);
  const venues = await App.getVenues();
  const q = App.qs();
  const tanggal = App.validTanggal(q.get("tanggal")) ? q.get("tanggal") : "";

  $("#f-cabang").innerHTML = '<option value="">Semua</option>' + App.sportList(venues).map((s) => `<option>${esc(s)}</option>`).join("");
  App.bindLokasi($("#f-prov"), $("#f-kota"), venues, { prov: q.get("provinsi") || "", kota: q.get("kota") || "" });
  $("#f-cabang").value = q.get("cabang") || "";
  $("#f-cari").value = q.get("q") || "";

  const HALAMAN = 12;
  let tampil = HALAMAN;
  let hasilKini = [];

  function gambarDaftar() {
    const extra = tanggal ? `&tanggal=${tanggal}` : "";
    $("#daftar-venue").innerHTML = hasilKini.length
      ? hasilKini.slice(0, tampil).map((v) => App.venueCard(v, extra)).join("")
      : '<p class="kosong">Tidak ada venue yang cocok. Coba ubah filter.</p>';
    const sisa = hasilKini.length - tampil;
    $("#lebih-wrap").hidden = sisa <= 0;
    $("#lebih").textContent = `Tampilkan lebih banyak (${Math.max(sisa, 0)} lagi)`;
  }

  function render(reset = true) {
    if (reset) tampil = HALAMAN;
    const kata = $("#f-cari").value.trim().toLowerCase();
    const cab = $("#f-cabang").value, prov = $("#f-prov").value, kota = $("#f-kota").value;
    const min = Number($("#f-min").value) || 0;
    const max = Number($("#f-max").value) || Infinity;
    const urut = $("#f-urut").value;

    const hasil = venues.filter((v) =>
      (!kata || v.nama.toLowerCase().includes(kata) || v.kota.toLowerCase().includes(kata)) &&
      (!cab || v.olahraga.includes(cab)) &&
      (!prov || v.provinsi === prov) &&
      (!kota || v.kota === kota) &&
      v.harga >= min && v.harga <= max
    );

    const skorWilayah = (v) => (App.PRIORITAS.includes(v.kota) ? 0 : 1);
    if (urut === "murah") hasil.sort((a, b) => a.harga - b.harga);
    else if (urut === "mahal") hasil.sort((a, b) => b.harga - a.harga);
    else if (urut === "rating") hasil.sort((a, b) => App.ratingInfo(b).rating - App.ratingInfo(a).rating);
    else hasil.sort((a, b) => skorWilayah(a) - skorWilayah(b) || App.ratingInfo(b).rating - App.ratingInfo(a).rating);

    hasilKini = hasil;
    $("#jumlah").textContent = `${hasil.length} venue ditemukan`;
    gambarDaftar();
  }
  $("#lebih").addEventListener("click", () => { tampil += HALAMAN; gambarDaftar(); });

  $$(".filter-panel input, .filter-panel select, #f-urut").forEach((el) => {
    el.addEventListener("input", () => render());
    el.addEventListener("change", () => render());
  });
  $("#reset").addEventListener("click", () => {
    $$(".filter-panel input").forEach((i) => (i.value = ""));
    $$(".filter-panel select").forEach((s) => (s.value = ""));
    $("#f-kota").value = "";
    render();
  });
  render();
})();
