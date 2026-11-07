"use strict";
/* ArenaKu - gallery.js: galeri foto venue (image slider/carousel + lightbox).
   - Geser kiri/kanan (swipe, tombol, atau panah keyboard), thumbnail, dan indikator posisi.
   - Klik foto untuk memperbesar (lightbox) lalu geser antar foto.
   - Item: { src, caption } untuk gambar, atau { html, caption } untuk slide kustom (pengganti saat foto belum ada). */
(() => {
  App.gallery = function (el, { items, alt = "Foto venue" }) {
    let i = 0;
    const n = items.length;
    const slide = (it, k) => it.html
      ? `<div class="gal-slide">${it.html}</div>`
      : `<div class="gal-slide"><img src="${App.esc(it.src)}" alt="${App.esc(alt)} ${k + 1}" draggable="false" ${k ? 'loading="lazy"' : ""}></div>`;

    el.classList.add("gal");
    el.innerHTML = `
      <div class="gal-view" tabindex="0" aria-roledescription="carousel" aria-label="${App.esc(alt)}">
        <div class="gal-track">${items.map(slide).join("")}</div>
        ${n > 1 ? '<button type="button" class="gal-nav prev" aria-label="Foto sebelumnya">‹</button><button type="button" class="gal-nav next" aria-label="Foto berikutnya">›</button>' : ""}
        <span class="gal-count"></span>
        <button type="button" class="gal-zoom" aria-label="Perbesar foto">⤢ Perbesar</button>
      </div>
      ${n > 1 ? `<div class="gal-thumbs">${items.map((it, k) => `<button type="button" class="gal-thumb" data-i="${k}" aria-label="Foto ${k + 1}">
        ${it.html ? '<span class="gal-thumb-ph">🖼️</span>' : `<img src="${App.esc(it.src)}" alt="" draggable="false">`}</button>`).join("")}</div>` : ""}
      ${items[0].caption ? '<p class="gal-caption muted small"></p>' : ""}`;

    const view = App.$(".gal-view", el), track = App.$(".gal-track", el);

    function go(k) {
      i = (k + n) % n;
      track.style.transform = `translateX(${-100 * i}%)`;
      App.$(".gal-count", el).textContent = `${i + 1} / ${n}`;
      App.$$(".gal-thumb", el).forEach((t, x) => t.classList.toggle("aktif", x === i));
      const cap = App.$(".gal-caption", el);
      if (cap) cap.textContent = items[i].caption || "";
    }

    // Swipe & klik
    let x0 = null, geser = false;
    view.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) return; x0 = e.clientX; geser = false; });
    view.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { geser = true; go(i + (dx < 0 ? 1 : -1)); }
    });
    view.addEventListener("pointercancel", () => { x0 = null; });
    view.addEventListener("click", (e) => {
      if (e.target.closest(".gal-nav")) { go(i + (e.target.closest(".prev") ? -1 : 1)); return; }
      if (e.target.closest(".gal-zoom")) { lightbox(i); return; }
      if (geser) { geser = false; return; }
      lightbox(i);
    });
    view.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "Enter") lightbox(i);
    });
    App.$$(".gal-thumb", el).forEach((t) => t.addEventListener("click", () => go(Number(t.dataset.i))));

    /* ----- Lightbox ----- */
    function lightbox(start) {
      let k = start;
      const ov = document.createElement("div");
      ov.className = "lightbox";
      ov.setAttribute("role", "dialog");
      ov.setAttribute("aria-modal", "true");
      ov.innerHTML = `
        <button type="button" class="lb-close" aria-label="Tutup">×</button>
        ${n > 1 ? '<button type="button" class="lb-nav prev" aria-label="Foto sebelumnya">‹</button><button type="button" class="lb-nav next" aria-label="Foto berikutnya">›</button>' : ""}
        <div class="lb-stage"></div>
        <div class="lb-info"><span class="lb-cap"></span><span class="lb-count"></span></div>`;
      document.body.appendChild(ov);
      document.body.classList.add("no-scroll");
      const stage = App.$(".lb-stage", ov);

      function show(x) {
        k = (x + n) % n;
        const it = items[k];
        stage.innerHTML = it.html
          ? `<div class="lb-html">${it.html}</div>`
          : `<img src="${App.esc(it.src)}" alt="${App.esc(alt)} ${k + 1}" draggable="false">`;
        App.$(".lb-count", ov).textContent = `${k + 1} / ${n}`;
        App.$(".lb-cap", ov).textContent = it.caption || "";
        go(k);
      }
      function tutup() {
        ov.remove();
        document.removeEventListener("keydown", onKey);
        if (!App.$(".modal-overlay, .lightbox")) document.body.classList.remove("no-scroll");
      }
      function onKey(e) {
        if (e.key === "Escape") tutup();
        else if (e.key === "ArrowLeft") show(k - 1);
        else if (e.key === "ArrowRight") show(k + 1);
      }
      document.addEventListener("keydown", onKey);
      ov.addEventListener("click", (e) => {
        if (e.target.closest(".lb-close") || e.target === ov || e.target === stage) tutup();
        else if (e.target.closest(".lb-nav")) show(k + (e.target.closest(".prev") ? -1 : 1));
      });
      let lx = null;
      stage.addEventListener("pointerdown", (e) => { lx = e.clientX; });
      stage.addEventListener("pointerup", (e) => {
        if (lx === null) return;
        const dx = e.clientX - lx; lx = null;
        if (Math.abs(dx) > 50) show(k + (dx < 0 ? 1 : -1));
      });
      show(k);
      App.$(".lb-close", ov).focus();
    }

    go(0);
    return { go, get index() { return i; }, open: () => lightbox(i) };
  };
})();
