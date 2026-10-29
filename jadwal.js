"use strict";
/* ArenaKu - jadwal.js: pratinjau ketersediaan lapangan (publik, tanpa login) */
(async () => {
  const { $, esc } = App;
  const venues = (await App.getVenues()).filter((v) => !v.coming_soon);
  const q = App.qs();
  const awal = venues.find((v) => String(v.id) === q.get("id")) || venues[0];

  let iso = App.validTanggal(q.get("tanggal")) ? q.get("tanggal") : App.todayISO();

  App.bindLokasi($("#j-prov"), $("#j-kota"), venues, { prov: awal.provinsi, kota: awal.kota });

  function isiVenue(pilihId) {
    const prov = $("#j-prov").value, kota = $("#j-kota").value;
    const daftar = venues.filter((v) => (!prov || v.provinsi === prov) && (!kota || v.kota === kota));
    $("#j-venue").innerHTML = daftar.map((v) => `<option value="${v.id}">${esc(v.nama)}</option>`).join("") ||
      '<option value="">Tidak ada venue</option>';
    if (pilihId && daftar.some((v) => v.id === pilihId)) $("#j-venue").value = String(pilihId);
  }
  function isiLapangan(pilihId) {
    const v = venues.find((x) => String(x.id) === $("#j-venue").value);
    $("#j-lap").innerHTML = v ? v.lapangan.map((l) => `<option value="${esc(l.id)}">${esc(l.nama)}</option>`).join("") : "";
    if (v && pilihId && v.lapangan.some((l) => l.id === pilihId)) $("#j-lap").value = pilihId;
  }

  function gambar() {
    const v = venues.find((x) => String(x.id) === $("#j-venue").value);
    if (!v) {
      $("#j-judul").textContent = "Tidak ada venue pada filter ini";
      $("#j-info").textContent = "";
      $("#j-slots").innerHTML = "";
      $("#j-legend").innerHTML = "";
      $("#j-booking").hidden = true;
      return;
    }
    const lap = v.lapangan.find((l) => l.id === $("#j-lap").value) || v.lapangan[0];
    $("#j-booking").hidden = false;
    $("#j-booking").href = `detail.html?id=${v.id}&lap=${encodeURIComponent(lap.id)}&tanggal=${iso}`;
    $("#j-judul").textContent = `${v.nama} · ${lap.nama}`;
    $("#j-legend").innerHTML = App.slotLegend();
    const s = App.renderSlots($("#j-slots"), { venue: v, lap, iso, selectable: false });
    $("#j-info").textContent = `${App.fmtTanggal(iso)} · ${s.stat.available} dari ${s.stat.total} slot tersedia · ${App.rupiah(lap.harga)}/jam`;
  }

  isiVenue(awal.id);
  isiLapangan(q.get("lap"));
  App.dateChips($("#j-chips"), { selected: iso, onSelect: (d) => { iso = d; gambar(); } });
  gambar();

  const turun = () => { isiVenue(); isiLapangan(); gambar(); };
  $("#j-prov").addEventListener("change", turun);
  $("#j-kota").addEventListener("change", turun);
  $("#j-venue").addEventListener("change", () => { isiLapangan(); gambar(); });
  $("#j-lap").addEventListener("change", gambar);
})();
