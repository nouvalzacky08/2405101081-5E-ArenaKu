"use strict";
/* ArenaKu - home.js: interaksi landing page */
(async () => {
  const { $, $$, esc } = App;

  // FAQ & tab hero tidak butuh data, jadi dipasang lebih dulu
  $("#faq-list").addEventListener("click", (e) => {
    const q = e.target.closest(".faq-q");
    if (q) q.parentElement.classList.toggle("buka");
  });
  $$(".hero-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".hero-tabs button").forEach((x) => x.classList.toggle("aktif", x === b));
      $("#form-sewa").hidden = b.dataset.tab !== "sewa";
      $("#form-sparring").hidden = b.dataset.tab !== "sparring";
    })
  );

  $("#venue-list").innerHTML = App.skeleton(4);
  const [venues, sparring] = await Promise.all([App.getVenues(), App.getSparring()]);
  const vmap = App.venueMap(venues);
  const sports = App.sportList(venues);

  // Form pencarian hero
  const opsiOlahraga = '<option value="">Semua olahraga</option>' + sports.map((s) => `<option>${esc(s)}</option>`).join("");
  $("#h-cabang").innerHTML = opsiOlahraga;
  $("#hs-cabang").innerHTML = opsiOlahraga;
  App.bindLokasi($("#h-prov"), $("#h-kota"), venues);
  $("#h-tanggal").min = $("#h-tanggal").value = App.todayISO();
  $("#h-tanggal").max = App.maxISO();

  const kirim = (url, pairs) => {
    const p = new URLSearchParams();
    pairs.forEach(([k, v]) => { if (v) p.set(k, v); });
    location.href = url + (p.toString() ? "?" + p : "");
  };
  $("#form-sewa").addEventListener("submit", (e) => {
    e.preventDefault();
    kirim("venue.html", [["cabang", $("#h-cabang").value], ["provinsi", $("#h-prov").value], ["kota", $("#h-kota").value], ["tanggal", $("#h-tanggal").value]]);
  });
  $("#form-sparring").addEventListener("submit", (e) => {
    e.preventDefault();
    kirim("sparring.html", [["cabang", $("#hs-cabang").value], ["level", $("#hs-level").value], ["biaya", $("#hs-biaya").value]]);
  });

  // Statistik
  App.countUp($("#st-venue"), venues.length);
  App.countUp($("#st-kota"), new Set(venues.map((v) => v.kota)).size);
  App.countUp($("#st-lap"), venues.reduce((n, v) => n + v.lapangan.length, 0));
  App.countUp($("#st-spar"), sparring.length);

  // Kartu cabang olahraga
  $("#olahraga-list").innerHTML = sports.map((s) => {
    const n = venues.filter((v) => v.olahraga.includes(s)).length;
    return `<a class="card olahraga-card" href="venue.html?cabang=${encodeURIComponent(s)}">
      <div class="ikon">${App.SPORT[s].ikon}</div><h3>${esc(s)}</h3><p>${n} venue</p></a>`;
  }).join("");

  // Venue populer per wilayah
  const WILAYAH = {
    "Madiun, Magetan & Ngawi": (v) => App.PRIORITAS.includes(v.kota),
    "Jawa Timur": (v) => v.provinsi === "Jawa Timur",
    "Jawa Tengah & DIY": (v) => ["Jawa Tengah", "DI Yogyakarta"].includes(v.provinsi),
    "Jawa Barat & Banten": (v) => ["Jawa Barat", "Banten"].includes(v.provinsi),
    "DKI Jakarta": (v) => v.provinsi === "DKI Jakarta"
  };
  const nama = Object.keys(WILAYAH);
  function tampilVenue(w) {
    $$("#region-chips .chip").forEach((c) => c.classList.toggle("aktif", c.dataset.w === w));
    const daftar = venues.filter(WILAYAH[w]).sort((a, b) => App.ratingInfo(b).rating - App.ratingInfo(a).rating).slice(0, 4);
    $("#venue-list").innerHTML = daftar.map((v) => App.venueCard(v)).join("");
  }
  $("#region-chips").innerHTML = nama.map((w) => `<button type="button" class="chip" data-w="${esc(w)}">${esc(w)}</button>`).join("");
  $("#region-chips").addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (c) tampilVenue(c.dataset.w);
  });
  tampilVenue(nama[0]);

  // Preview sparring
  const renderSpar = () => {
    $("#sparring-preview").innerHTML = sparring.slice(0, 3).map((s) => App.sparringCard(s, vmap)).join("");
  };
  renderSpar();
  App.bindSparringActions($("#sparring-preview"), () => sparring, vmap, renderSpar);
})();
