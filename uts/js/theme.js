/* ArenaKu - theme.js: menerapkan tema (terang/gelap) sebelum halaman digambar agar tidak berkedip.
   Dimuat di <head> semua halaman. Pilihan tema disimpan di localStorage; bila belum memilih, mengikuti pengaturan perangkat. */
(function () {
  var t = null;
  try { t = localStorage.getItem("arenaku_tema"); } catch (e) { /* abaikan */ }
  if (t !== "dark" && t !== "light") t = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
})();
