"use strict";
/* ArenaKu - calendar.js: kalender bulanan interaktif.
   - Menampilkan satu bulan penuh, bisa digeser ke bulan berikutnya (tombol atau swipe).
   - Hari yang sudah lewat tidak bisa dipilih; batas bawah selalu mengikuti tanggal perangkat saat ini.
   - Otomatis menyesuaikan diri ketika hari berganti (diperiksa tiap menit). */
(() => {
  const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const idxBulan = (d) => d.getFullYear() * 12 + d.getMonth();

  App.calendar = function (el, { selected, price, onSelect }) {
    let sel = selected && App.validTanggal(selected) ? selected : App.todayISO();
    let todayRef = App.todayISO();
    let view = App.parseISO(sel);
    view.setDate(1);
    let animasi = "";

    function batas() {
      return { min: idxBulan(App.parseISO(App.todayISO())), max: idxBulan(App.parseISO(App.maxISO())) };
    }

    function render() {
      const { min, max } = batas();
      const today = App.todayISO(), maks = App.maxISO();
      const tahun = view.getFullYear(), bulan = view.getMonth();
      const offset = (new Date(tahun, bulan, 1).getDay() + 6) % 7; // minggu dimulai Senin
      const jumlah = new Date(tahun, bulan + 1, 0).getDate();
      const label = view.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

      let sel_html = "";
      for (let i = 0; i < offset; i++) sel_html += '<span class="cal-kosong"></span>';
      for (let d = 1; d <= jumlah; d++) {
        const iso = `${tahun}-${App.pad(bulan + 1)}-${App.pad(d)}`;
        const mati = iso < today || iso > maks;
        const akhirPekan = App.isWeekend(iso);
        const p = !mati && price ? price(iso) : "";
        const kelas = ["cal-hari", akhirPekan ? "weekend" : "", iso === today ? "today" : "", iso === sel ? "aktif" : ""].join(" ").trim();
        sel_html += `<button type="button" class="${kelas}" data-date="${iso}" ${mati ? "disabled" : ""}
          aria-label="${App.esc(App.fmtTanggal(iso))}" aria-pressed="${iso === sel}">
          <span class="cal-no">${d}</span>${p ? `<small>${App.esc(p)}</small>` : ""}</button>`;
      }

      el.classList.add("cal");
      el.innerHTML = `
        <div class="cal-head">
          <button type="button" class="cal-nav" data-nav="-1" aria-label="Bulan sebelumnya" ${idxBulan(view) <= min ? "disabled" : ""}>‹</button>
          <strong class="cal-judul">${App.esc(label)}</strong>
          <button type="button" class="cal-nav" data-nav="1" aria-label="Bulan berikutnya" ${idxBulan(view) >= max ? "disabled" : ""}>›</button>
        </div>
        <div class="cal-minggu">${HARI.map((h, i) => `<span class="${i > 4 ? "weekend" : ""}">${h}</span>`).join("")}</div>
        <div class="cal-grid ${animasi}">${sel_html}</div>
        <div class="cal-foot"><span>${App.esc(App.fmtTanggal(sel))}</span><button type="button" class="cal-today" data-today>Hari ini</button></div>`;
      animasi = "";
    }

    function pindah(arah) {
      const { min, max } = batas();
      const target = new Date(view.getFullYear(), view.getMonth() + arah, 1);
      if (idxBulan(target) < min || idxBulan(target) > max) return;
      view = target;
      animasi = arah > 0 ? "slide-next" : "slide-prev";
      render();
    }

    function pilih(iso) {
      if (!App.validTanggal(iso)) return;
      sel = iso;
      view = App.parseISO(iso); view.setDate(1);
      render();
      if (onSelect) onSelect(iso);
    }

    el.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) { pindah(Number(nav.dataset.nav)); return; }
      if (e.target.closest("[data-today]")) { pilih(App.todayISO()); return; }
      const d = e.target.closest("[data-date]");
      if (d && !d.disabled) pilih(d.dataset.date);
    });

    // Swipe kiri/kanan untuk berpindah bulan
    let x0 = null;
    el.addEventListener("pointerdown", (e) => { if (e.target.closest(".cal-grid")) x0 = e.clientX; });
    el.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) pindah(dx < 0 ? 1 : -1);
    });
    el.addEventListener("pointercancel", () => { x0 = null; });

    // Ikuti pergantian hari secara otomatis
    App.onTick((hariIni) => {
      if (hariIni === todayRef) return;
      todayRef = hariIni;
      const bulanIni = App.parseISO(hariIni); bulanIni.setDate(1);
      if (idxBulan(view) < idxBulan(bulanIni)) view = bulanIni; // jangan tampilkan bulan yang sudah lewat
      if (sel < hariIni) {
        sel = hariIni;
        view = App.parseISO(sel); view.setDate(1);
        render();
        if (onSelect) onSelect(sel);
      } else render();
    });

    render();
    return {
      get selected() { return sel; },
      setSelected(iso) { if (App.validTanggal(iso)) { sel = iso; view = App.parseISO(iso); view.setDate(1); render(); } },
      refresh: render
    };
  };
})();
