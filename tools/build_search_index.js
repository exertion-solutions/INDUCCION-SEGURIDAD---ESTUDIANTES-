/* Genera assets/search-index.json recorriendo los sitios renderizados con Playwright.
   Uso: servir el repo (python3 -m http.server 8767) y correr: node tools/build_search_index.js [base] */
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const fs = require("fs");
const BASE = process.argv[2] || "http://localhost:8767/";
const SITES = [
  ["guia-inspecciones/", "Guía de Inspecciones SGI"],
  ["guia-mediciones-srt/", "Guía de Mediciones SRT"],
  ["herramientas-torre/", "Herramientas en Equipos de Torre"],
  ["estado-mecanico-pozos/", "Estado mecánico de pozos"],
  ["libro-drops/", "Libro DROPS"],
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const out = []; const seen = new Set();
  const add = (u, t, s) => { t = (t || "").replace(/\s+/g, " ").trim(); if (t.length < 3 || t.length > 90) return; const k = u + "|" + t.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push({ u, t, s }); };
  for (const [dir, name] of SITES) {
    const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
    await pg.goto(BASE + dir, { waitUntil: "load" }); await pg.waitForTimeout(2500);
    const data = await pg.evaluate(() => {
      const hs = [...document.querySelectorAll("h1,h2,h3")].map(h => { let id = h.id || ""; if (!id) { const p = h.closest("[id]"); id = p ? p.id : ""; } return { t: (h.innerText || h.textContent).split("\n")[0], id, lvl: h.tagName }; });
      const GENERIC = new Set(["view", "app", "main", "hse-main", "root"]);
      const clean = e => { const t = (e.innerText || e.textContent || "").split("\n").map(x => x.trim()).filter(x => x && !/^\d+$/.test(x)); return t[0] || ""; };
      const parts = [...document.querySelectorAll(".pc[aria-label]")].map(e => e.getAttribute("aria-label"));
      const links = [...document.querySelectorAll('a[href^="#"]:not(#hse-skip),[data-go]')].map(a => ({ t: clean(a), href: a.getAttribute("href") || a.dataset.go }));
      return { hs, links, parts, GENERIC: [...GENERIC] };
    });
    add(dir, name, "Abrir sitio");
    const gen = new Set(data.GENERIC);
    data.hs.forEach(h => { const real = h.id && !gen.has(h.id); if (real || h.lvl === "H1") add(dir + (real ? "#" + h.id : ""), h.t, name); });
    data.parts.forEach(t => add(dir, t, name + " · pieza del pozo"));
    data.links.forEach(l => l.href && l.href.length > 1 && l.href !== "#hse-main" && add(dir + l.href, l.t, name));
    await pg.close();
  }
  await b.close();
  fs.writeFileSync(__dirname + "/../assets/search-index.json", JSON.stringify(out));
  console.log(out.length + " entradas");
})();
