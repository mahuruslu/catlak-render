/* catlak-render — tek renk, dokulu, küçük harfli slogan postu (1080x1080)
   Kullanım (görselin kendi sekmesinde, aynı origin):
     if(!window.catlak) eval(await (await fetch('https://cdn.jsdelivr.net/gh/mahuruslu/catlak-render@main/catlak.js')).text());
     await catlak({ lines:["..."], layout:"kose", palette:"kirmizi" });
*/
window.catlak = async (o = {}) => {
  const S = 1080, SAFE = 150, L0 = o.x0 ?? SAFE + 10, R0 = S - SAFE - 10, W = R0 - L0, WT = o.weight || 600;
  const PAL = {
    kirmizi: { stops: [[0,[20,4,6]],[.42,[140,16,20]],[.72,[210,44,38]],[1,[248,184,166]]], text: '#f7ede6', dark: false },
    gri: { stops: [[0,[12,12,14]],[.5,[92,94,100]],[1,[234,233,229]]], text: '#f4f2ee', dark: false },
    murekkep: { stops: [[0,[14,12,12]],[.3,[40,34,32]],[.62,[226,220,210]],[1,[247,244,238]]], text: '#151313', dark: true }
  };
  const p = PAL[o.palette || 'kirmizi'];

  // yazı tipi: Nunito 600/700, olmazsa yuvarlak sistem fontu
  let FF = "'Arial Rounded MT Bold',sans-serif";
  try {
    if (!window.__catlakFont) {
      const css = await (await fetch('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700&display=swap')).text();
      for (const m of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
        const u = m[1].match(/url\(([^)]+)\)/), r = m[1].match(/unicode-range:\s*([^;]+);/), wt = m[1].match(/font-weight:\s*(\d+)/);
        if (!u) continue;
        const ff = new FontFace('Nunito', `url(${u[1]})`, { weight: wt ? wt[1] : '600', ...(r ? { unicodeRange: r[1] } : {}) });
        await ff.load(); document.fonts.add(ff);
      }
      window.__catlakFont = true;
    }
    FF = "'Nunito'";
  } catch (e) {}

  // görsel: kare kırpma, odak, yakınlaştırma, hafif yumuşatma
  const src = o.img || window.__catlakSrc || location.href; window.__catlakSrc = src;
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d', { willReadFrequently: true });
  const sc = Math.max(S / img.naturalWidth, S / img.naturalHeight) * (o.zoom || 1);
  const w = img.naturalWidth * sc, h = img.naturalHeight * sc, f = o.focus || [.5, .5];
  const dx = Math.min(0, Math.max(S - w, S / 2 - f[0] * w)), dy = Math.min(0, Math.max(S - h, S / 2 - f[1] * h));
  x.filter = `blur(${o.blur ?? 0.8}px)`; x.drawImage(img, dx, dy, w, h); x.filter = 'none';

  // yazı yerleşimi
  const mode = o.layout || 'kose';
  const raw = (o.lines || []).map(s => s.toLocaleLowerCase('tr').trim());
  x.letterSpacing = '0.3px';
  const meas = (t, s) => { x.font = `${WT} ${s}px ${FF}`; return x.measureText(t).width; };
  const cap = { kose: 88, blok: 68, siir: 76, capraz: 90 }[mode];
  const fill = { kose: .92, blok: .94, siir: .92, capraz: .62 }[mode];
  const longest = Math.max(...raw.filter(Boolean).map(t => meas(t, 100)));
  const fs = Math.max(40, Math.min(cap * (o.scale || 1), W * fill / longest * 100 * (o.scale || 1)));
  const lh = fs * 1.25, ops = [];
  let bb = [S, S, 0, 0];
  const grow = (X, Y) => { bb = [Math.min(bb[0], X), Math.min(bb[1], Y), Math.max(bb[2], X), Math.max(bb[3], Y)]; };
  if (mode === 'capraz') {
    const th = (o.angle ?? -24) * Math.PI / 180, groups = [[]];
    raw.forEach(t => t === '' ? groups.push([]) : groups[groups.length - 1].push(t));
    const starts = o.starts || [[L0 + 10, 250], [S * .42, S * .6]];
    groups.forEach((g, gi) => {
      const [sx, sy] = starts[gi] || [L0 + 10, 250 + gi * 300];
      g.forEach((t, li) => {
        const ox = sx - li * lh * Math.sin(th), oy = sy + li * lh * Math.cos(th), tw = meas(t, fs);
        ops.push({ t, x: ox, y: oy, rot: th });
        for (const [px, py] of [[0, -fs * .8], [tw, -fs * .8], [0, fs * .2], [tw, fs * .2]])
          grow(ox + px * Math.cos(th) - py * Math.sin(th), oy + px * Math.sin(th) + py * Math.cos(th));
      });
    });
  } else {
    const H = raw.reduce((s, t) => s + (t === '' ? lh * .6 : lh), 0);
    const pos = o.textPos || (mode === 'blok' ? 'orta' : 'ust');
    const y0 = o.y0 ?? (pos === 'ust' ? 165 : pos === 'alt' ? S - 150 - H : (S - H) / 2);
    let y = y0;
    for (const t of raw) {
      if (t === '') { y += lh * .6; continue; }
      ops.push({ t, x: L0, y: y + fs * .92, just: mode === 'blok' });
      grow(L0, y); grow(mode === 'blok' ? R0 : L0 + meas(t, fs), y + lh);
      y += lh;
    }
  }

  // tek renk ton + kontrast + vinyet + yazı gölgesi + tram + gren
  const id = x.getImageData(0, 0, S, S), a = id.data, N = S * S;
  const Lm = new Float32Array(N), hist = new Uint32Array(256);
  for (let i = 0, j = 0; j < N; i += 4, j++) { const l = .299 * a[i] + .587 * a[i + 1] + .114 * a[i + 2]; Lm[j] = l; hist[l | 0]++; }
  const pct = q => { let s = 0; for (let k = 0; k < 256; k++) { s += hist[k]; if (s >= q * N) return k; } return 255; };
  const lo = pct(.02), hi = Math.max(lo + 1, pct(.98));
  const lut = new Uint8ClampedArray(768);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let k = 0;
    while (k < p.stops.length - 2 && t > p.stops[k + 1][0]) k++;
    const [t0, c0] = p.stops[k], [t1, c1] = p.stops[k + 1], u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = c0[ch] + (c1[ch] - c0[ch]) * u;
  }
  const K = o.contrast ?? 1.2, G = (o.grain ?? 26) / 255, SH = o.shade ?? .3, R2 = 140 * 140;
  for (let j = 0, i = 0; j < N; j++, i += 4) {
    const X = j % S, Y = (j / S) | 0;
    let v = Math.min(1, Math.max(0, (Lm[j] - lo) / (hi - lo)));
    v = .5 + (v - .5) * K;
    const rx = X / S - .5, ry = Y / S - .5; v *= 1 - .22 * (rx * rx + ry * ry) * 2;
    if (SH > 0) {
      const ex = Math.max(bb[0] - X, 0, X - bb[2]), ey = Math.max(bb[1] - Y, 0, Y - bb[3]);
      const fl = SH * Math.exp(-(ex * ex + ey * ey) / R2);
      v = p.dark ? v + (1 - v) * fl : v * (1 - fl);
    }
    v += .03 * Math.sin(X * 1.9) * Math.sin(Y * 1.9) + (Math.random() - .5) * G;
    const q = Math.min(255, Math.max(0, v * 255)) | 0;
    a[i] = lut[q * 3]; a[i + 1] = lut[q * 3 + 1]; a[i + 2] = lut[q * 3 + 2];
  }
  x.putImageData(id, 0, 0);

  // yazı
  x.font = `${WT} ${fs}px ${FF}`; x.fillStyle = p.text; x.textBaseline = 'alphabetic';
  if (!p.dark) { x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 14; }
  for (const op of ops) {
    x.save(); x.translate(op.x, op.y); if (op.rot) x.rotate(op.rot);
    const words = op.t.split(/\s+/);
    if (op.just && words.length > 1) {
      const ws = words.map(wd => x.measureText(wd).width);
      const gap = (W - ws.reduce((s, n) => s + n, 0)) / (words.length - 1);
      let cx = 0; words.forEach((wd, k) => { x.fillText(wd, cx, 0); cx += ws[k] + gap; });
    } else x.fillText(op.t, 0, 0);
    x.restore();
  }
  x.shadowColor = 'transparent'; x.shadowBlur = 0;

  // imza: sağ alt (varsayılan) ya da sol alt
  x.font = `${WT} 26px ${FF}`; x.globalAlpha = .8;
  if (o.sign === 'sol') x.fillText(o.name || 'catlak', SAFE + 10, S - 48);
  else { x.textAlign = 'right'; x.fillText(o.name || 'catlak', R0, S - 48); x.textAlign = 'left'; }
  x.globalAlpha = 1;

  // son gren
  const id2 = x.getImageData(0, 0, S, S), b = id2.data;
  for (let i = 0; i < b.length; i += 4) { const n = (Math.random() - .5) * 12; b[i] += n; b[i + 1] += n; b[i + 2] += n; }
  x.putImageData(id2, 0, 0);

  // göster + indir düğmesi
  const url = c.toDataURL('image/png'), fn = (o.file || 'catlak') + '.png';
  document.title = fn; document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;min-height:100vh;background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:sans-serif';
  const im = new Image(); im.src = url; im.style.cssText = 'width:min(94vw,82vh);height:auto;display:block';
  const dl = document.createElement('a'); dl.href = url; dl.download = fn; dl.textContent = 'indir · ' + fn;
  dl.style.cssText = 'color:#fff;background:#c8201e;padding:10px 18px;border-radius:999px;text-decoration:none';
  document.body.append(im, dl);
  return FF === "'Nunito'" ? 'ok' : 'ok (yedek font)';
};


/* --- görsel arama: Wikimedia Commons sayfasında (commons.wikimedia.org) çalışır ---
   await catlakAra('Kollwitz hunger')  -> numaralı 8 aday ızgarası + liste
   catlakSec(3)                        -> seçilen adayı kullanılanlara yazar, bilgilerini döndürür
   Kullanılan eserler bu tarayıcının hafızasında tutulur ve bir daha önerilmez. */
window.catlakAra = async (q, n = 8) => {
  const seed = ['File:Adolph Menzel - Eisenwalzwerk - Google Art Project.jpg', 'File:Francisco de Goya, Saturno devorando a su hijo (1819-1823).jpg', 'File:Honoré Daumier - Gargantua.jpg'];
  let used; try { used = JSON.parse(localStorage.catlakUsed || 'null') || seed; } catch (e) { used = seed; }
  const api = '/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=' + encodeURIComponent(q + ' filetype:bitmap') +
    '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1600&iiextmetadatafilter=LicenseShortName|Artist|DateTimeOriginal|ObjectName';
  const s = await (await fetch(api)).json();
  const strip = v => (v || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const out = [];
  for (const pg of Object.values(s.query?.pages || {}).sort((a, b) => a.index - b.index)) {
    const ii = pg.imageinfo?.[0]; if (!ii) continue;
    const m = ii.extmetadata || {};
    if (!/public domain|^pd|cc0/i.test(m.LicenseShortName?.value || '')) continue;
    if (used.includes(pg.title) || Math.min(ii.width, ii.height) < 900) continue;
    out.push({ dosya: pg.title, url: ii.thumburl || ii.url, eser: strip(m.ObjectName?.value), sanatci: strip(m.Artist?.value), tarih: strip(m.DateTimeOriginal?.value) });
    if (out.length >= n) break;
  }
  window.__catlakAday = out;
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:#111;display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px';
  out.forEach((c, i) => {
    const d = document.createElement('div'); d.style.position = 'relative';
    d.innerHTML = `<img src="${c.url}" style="width:100%;height:46vh;object-fit:cover;display:block"><b style="position:absolute;top:4px;left:4px;background:#c8201e;color:#fff;font:bold 18px sans-serif;padding:2px 9px">${i}</b>`;
    document.body.append(d);
  });
  return { aday: out.map((c, i) => `${i}: ${c.dosya.replace('File:', '').slice(0, 80)}`), sonKullanilan: used.slice(-6).map(t => t.replace('File:', '').slice(0, 50)) };
};
window.catlakSec = i => {
  const c = window.__catlakAday[i];
  let used; try { used = JSON.parse(localStorage.catlakUsed || '[]'); } catch (e) { used = []; }
  if (!used.includes(c.dosya)) used.push(c.dosya);
  try { localStorage.catlakUsed = JSON.stringify(used.slice(-500)); } catch (e) {}
  return c;
};
