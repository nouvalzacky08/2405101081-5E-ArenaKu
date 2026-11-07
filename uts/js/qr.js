"use strict";
/* ArenaKu - qr.js: pembuat QR Code sederhana (tanpa library luar, bisa dipakai offline).
   Mendukung teks (mode byte, UTF-8) sampai 62 byte dengan koreksi kesalahan level M (versi 1-4).
   Dipakai untuk bukti booking: QR berisi kode booking sehingga mudah dipindai/dicek petugas.
   Pemakaian: App.qrSvg("ARENAKU:ARK-ABC234", { ukuran: 180 })  -> string SVG */
(() => {
  // Tabel level M: [data codeword per blok, ec codeword per blok, jumlah blok]
  const VERSI = { 1: [16, 10, 1], 2: [28, 16, 1], 3: [44, 26, 1], 4: [32, 18, 2] };
  const ALIGN = { 2: 18, 3: 22, 4: 26 };

  /* ----- Aritmetika GF(256) untuk Reed-Solomon ----- */
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) {
    EXP[i] = x; LOG[x] = i;
    x <<= 1; if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const kali = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

  function generator(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const next = new Array(g.length + 1).fill(0);
      g.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= kali(c, EXP[i]); });
      g = next;
    }
    return g;
  }
  function sisaBagi(data, n) {
    const g = generator(n);
    const r = new Array(n).fill(0);
    data.forEach((d) => {
      const f = d ^ r.shift();
      r.push(0);
      if (f) g.slice(1).forEach((c, i) => { r[i] ^= kali(c, f); });
    });
    return r;
  }

  function utf8(teks) { return [...new TextEncoder().encode(teks)]; }

  function buatData(bytes, versi) {
    const [dataPerBlok, ecPerBlok, blok] = VERSI[versi];
    const total = dataPerBlok * blok;
    const bits = [];
    const taruh = (nilai, n) => { for (let i = n - 1; i >= 0; i--) bits.push((nilai >>> i) & 1); };
    taruh(0b0100, 4);
    taruh(bytes.length, 8);
    bytes.forEach((b) => taruh(b, 8));
    taruh(0, Math.min(4, total * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const cw = [];
    for (let i = 0; i < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let pad = 0xec; cw.length < total; pad ^= 0xec ^ 0x11) cw.push(pad);

    const dataBlok = [], ecBlok = [];
    for (let b = 0; b < blok; b++) {
      const d = cw.slice(b * dataPerBlok, (b + 1) * dataPerBlok);
      dataBlok.push(d);
      ecBlok.push(sisaBagi(d, ecPerBlok));
    }
    const hasil = [];
    for (let i = 0; i < dataPerBlok; i++) dataBlok.forEach((d) => hasil.push(d[i]));
    for (let i = 0; i < ecPerBlok; i++) ecBlok.forEach((e) => hasil.push(e[i]));
    return hasil;
  }

  const MASK = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  ];

  function formatBits(mask) {
    const data = (0 << 3) | mask; // level M = 00
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }

  function bangun(codewords, versi, mask) {
    const n = 17 + 4 * versi;
    const m = Array.from({ length: n }, () => new Array(n).fill(false));
    const fn = Array.from({ length: n }, () => new Array(n).fill(false));
    const set = (x, y, v) => { m[y][x] = v; fn[y][x] = true; };

    // Pola pencari (finder) + separator
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([ox, oy]) => {
      for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
        const x = ox + dx, y = oy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const d = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
        set(x, y, d !== 2 && d !== 4);
      }
    });
    // Garis timing
    for (let i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
    // Pola alignment
    if (ALIGN[versi]) {
      const c = ALIGN[versi];
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
        set(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    // Area format (dipesan dulu, diisi setelah mask dipilih)
    const taruhFormat = (bits) => {
      for (let i = 0; i <= 5; i++) set(8, i, ((bits >>> i) & 1) === 1);
      set(8, 7, ((bits >>> 6) & 1) === 1);
      set(8, 8, ((bits >>> 7) & 1) === 1);
      set(7, 8, ((bits >>> 8) & 1) === 1);
      for (let i = 9; i < 15; i++) set(14 - i, 8, ((bits >>> i) & 1) === 1);
      for (let i = 0; i < 8; i++) set(n - 1 - i, 8, ((bits >>> i) & 1) === 1);
      for (let i = 8; i < 15; i++) set(8, n - 15 + i, ((bits >>> i) & 1) === 1);
      set(8, n - 8, true); // modul gelap
    };
    taruhFormat(0);

    // Tempatkan data zig-zag
    let k = 0;
    for (let kanan = n - 1; kanan >= 1; kanan -= 2) {
      if (kanan === 6) kanan = 5;
      for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
        const x = kanan - j;
        const naik = ((kanan + 1) & 2) === 0;
        const y = naik ? n - 1 - v : v;
        if (!fn[y][x] && k < codewords.length * 8) {
          m[y][x] = ((codewords[k >>> 3] >>> (7 - (k & 7))) & 1) === 1;
          k++;
        }
      }
    }
    // Terapkan mask
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
      if (!fn[y][x] && MASK[mask](x, y)) m[y][x] = !m[y][x];
    taruhFormat(formatBits(mask));
    return m;
  }

  function penalti(m) {
    const n = m.length;
    let p = 0;
    const baris = (get) => {
      for (let a = 0; a < n; a++) {
        let run = 1;
        for (let b = 1; b < n; b++) {
          if (get(a, b) === get(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p += 1; } else run = 1;
        }
        // pola mirip finder 1011101 dengan ruang kosong 4 modul
        const s = Array.from({ length: n }, (_, b) => (get(a, b) ? "1" : "0")).join("");
        for (const pola of ["10111010000", "00001011101"]) {
          let i = -1;
          while ((i = s.indexOf(pola, i + 1)) !== -1) p += 40;
        }
      }
    };
    baris((a, b) => m[a][b]);
    baris((a, b) => m[b][a]);
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    const gelap = m.flat().filter(Boolean).length;
    p += Math.floor(Math.abs(gelap * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  }

  /** Mengembalikan matriks boolean (true = modul gelap). */
  function matriks(teks) {
    const bytes = utf8(String(teks));
    const KAPASITAS = { 1: 14, 2: 26, 3: 42, 4: 62 }; // jumlah byte maksimum per versi (level M)
    const versi = [1, 2, 3, 4].find((v) => bytes.length <= KAPASITAS[v]);
    if (!versi) throw new Error("Teks QR terlalu panjang (maks. 62 byte).");
    const cw = buatData(bytes, versi);
    let terbaik = null, skor = Infinity;
    for (let mk = 0; mk < 8; mk++) {
      const m = bangun(cw, versi, mk);
      const s = penalti(m);
      if (s < skor) { skor = s; terbaik = m; }
    }
    return terbaik;
  }

  /** SVG QR Code. `ukuran` dalam piksel; margin (quiet zone) 4 modul sesuai standar. */
  function qrSvg(teks, { ukuran = 180, warna = "#000", latar = "#fff" } = {}) {
    const m = matriks(teks), n = m.length, margin = 4, total = n + margin * 2;
    let d = "";
    m.forEach((baris, y) => baris.forEach((gelap, x) => { if (gelap) d += `M${x + margin} ${y + margin}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${ukuran}" height="${ukuran}" shape-rendering="crispEdges" role="img" aria-label="QR Code ${teks.replace(/[<>&"]/g, "")}">` +
      `<rect width="${total}" height="${total}" fill="${latar}"/><path d="${d}" fill="${warna}"/></svg>`;
  }

  window.QR = { matriks, svg: qrSvg };
  if (typeof App !== "undefined") App.qrSvg = qrSvg;
})();
