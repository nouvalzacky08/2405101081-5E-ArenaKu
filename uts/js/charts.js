"use strict";
/* ArenaKu - charts.js: grafik SVG sederhana untuk dashboard admin (tanpa library luar).
   - App.chartBulanan(data): batang vertikal pendapatan per bulan.
   - App.chartHorizontal(data): batang horizontal untuk perbandingan kategori (mis. booking per olahraga).
   - App.pasangTip(el): tooltip saat hover/fokus pada batang.
   Satu seri = satu warna (warna hijau tema); nama kategori selalu tertulis, jadi tidak bergantung pada warna saja.
   Setiap grafik punya tampilan tabel (<details>) untuk aksesibilitas. */
(() => {
  const { esc } = App;
  const singkat = (n) => {
    if (n >= 1e6) return "Rp" + (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(".", ",") + " jt";
    if (n >= 1e3) return "Rp" + Math.round(n / 1e3) + " rb";
    return "Rp" + n;
  };
  const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");

  function skala(max) {
    const kasar = (max || 1) / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(kasar)));
    const f = kasar / mag;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
    return { step, top: step * Math.ceil((max || 1) / step) };
  }

  /** Path batang dengan ujung atas membulat 4px dan dasar rata (menempel pada garis dasar). */
  function batang(x, y, w, y0) {
    const r = Math.min(4, w / 2, y0 - y);
    return `M${x} ${y0}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y0}Z`;
  }
  function batangH(x0, y, h, x) {
    const r = Math.min(4, h / 2, x - x0);
    return `M${x0} ${y}H${x - r}Q${x} ${y} ${x} ${y + r}V${y + h - r}Q${x} ${y + h} ${x - r} ${y + h}H${x0}Z`;
  }

  const tabel = (judulKolom, baris) => `<details class="tabel-chart" style="margin-top:8px"><summary class="small muted" style="cursor:pointer">Lihat sebagai tabel</summary>
    <div class="table-wrap" style="box-shadow:none;margin-top:6px"><table class="tbl" style="min-width:0"><thead><tr><th>${esc(judulKolom[0])}</th><th>${esc(judulKolom[1])}</th></tr></thead>
    <tbody>${baris.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table></div></details>`;

  /** data: [{ label, nilai, sekarang? }] */
  App.chartBulanan = function (data) {
    if (!data.some((d) => d.nilai > 0)) return '<div class="chart-kosong">Belum ada pendapatan lunas.<br>Klik “Tambah Data Contoh” di bawah untuk mencoba.</div>';
    const W = 560, H = 250, ml = 56, mr = 10, mt = 20, mb = 30;
    const iw = W - ml - mr, ih = H - mt - mb;
    const maks = Math.max(...data.map((d) => d.nilai));
    const { step, top } = skala(maks);
    const y = (v) => mt + ih * (1 - v / top);
    const band = iw / data.length, bw = Math.min(46, band * 0.62);
    let grid = "";
    for (let v = 0; v <= top + 1; v += step) {
      grid += `<line class="grid-garis" x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/><text class="sumbu" x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${v ? singkat(v).replace("Rp", "") : "0"}</text>`;
    }
    const terbesar = data.findIndex((d) => d.nilai === maks);
    const bars = data.map((d, i) => {
      const x = ml + band * i + (band - bw) / 2;
      const tip = `${d.label}: ${rupiah(d.nilai)}`;
      const label = d.nilai > 0 && (i === terbesar || i === data.length - 1)
        ? `<text class="nilai" x="${x + bw / 2}" y="${y(d.nilai) - 6}" text-anchor="middle">${singkat(d.nilai)}</text>` : "";
      return `${d.nilai > 0 ? `<path class="bar ${d.sekarang ? "sekarang" : ""}" d="${batang(x, y(d.nilai), bw, y(0))}" data-tip="${esc(tip)}" tabindex="0" role="img" aria-label="${esc(tip)}" style="animation-delay:${i * 60}ms"/>` : ""}
        ${label}<text class="sumbu" x="${x + bw / 2}" y="${H - 10}" text-anchor="middle">${esc(d.label)}</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Grafik batang pendapatan per bulan"><g class="sumbu">${grid}</g>${bars}</svg>` +
      tabel(["Bulan", "Pendapatan (lunas)"], data.map((d) => [d.label, rupiah(d.nilai)]));
  };

  /** data: [{ label, nilai }] sudah terurut menurun. */
  App.chartHorizontal = function (data, satuan = "booking") {
    if (!data.length) return '<div class="chart-kosong">Belum ada data booking.</div>';
    const W = 460, baris = 30, mt = 4, ml = 104, mr = 40;
    const H = mt * 2 + data.length * baris;
    const maks = Math.max(...data.map((d) => d.nilai)) || 1;
    const iw = W - ml - mr;
    const bars = data.map((d, i) => {
      const y = mt + i * baris + 5, h = baris - 12, x = ml + Math.max(2, (d.nilai / maks) * iw);
      const tip = `${d.label}: ${d.nilai} ${satuan}`;
      return `<text class="label-bar" x="${ml - 10}" y="${y + h / 2 + 4}" text-anchor="end">${esc(d.label)}</text>
        <path class="hbar" d="${batangH(ml, y, h, x)}" data-tip="${esc(tip)}" tabindex="0" role="img" aria-label="${esc(tip)}" style="animation-delay:${i * 60}ms"/>
        <text class="nilai" x="${x + 6}" y="${y + h / 2 + 4}">${d.nilai}</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Grafik batang ${esc(satuan)} per olahraga"><line class="grid-garis" x1="${ml}" x2="${ml}" y1="${mt}" y2="${H - mt}"/>${bars}</svg>` +
      tabel(["Olahraga", "Jumlah " + satuan], data.map((d) => [d.label, String(d.nilai)]));
  };

  /* ----- Tooltip (hover mouse dan fokus keyboard) ----- */
  let tip;
  const getTip = () => tip || (tip = Object.assign(document.body.appendChild(document.createElement("div")), { className: "chart-tip", role: "tooltip" }));
  App.pasangTip = function (el) {
    const tampil = (t, x, y) => { const d = getTip(); d.textContent = t; d.style.opacity = 1; d.style.left = Math.min(x + 14, innerWidth - d.offsetWidth - 8) + "px"; d.style.top = Math.max(8, y - 34) + "px"; };
    const sembunyi = () => { if (tip) tip.style.opacity = 0; };
    el.addEventListener("mousemove", (e) => { const t = e.target.closest("[data-tip]"); t ? tampil(t.dataset.tip, e.clientX, e.clientY) : sembunyi(); });
    el.addEventListener("mouseleave", sembunyi);
    el.addEventListener("focusin", (e) => { const t = e.target.closest("[data-tip]"); if (t) { const r = t.getBoundingClientRect(); tampil(t.dataset.tip, r.left + r.width / 2, r.top); } });
    el.addEventListener("focusout", sembunyi);
  };
})();
