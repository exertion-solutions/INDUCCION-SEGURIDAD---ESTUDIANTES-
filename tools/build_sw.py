#!/usr/bin/env python3
"""Genera sw.js: lista de precache + versión (hash del contenido).
Uso:  python3 tools/build_sw.py          # regenera sw.js
      python3 tools/build_sw.py --check  # falla si sw.js está desactualizado (para CI)
Correrlo cada vez que se agregan, quitan o cambian archivos."""
import hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", ".github", "tools", "node_modules"}
SKIP_FILES = {"sw.js", "README.md", ".nojekyll", ".gitignore"}
EXT = {".html", ".js", ".css", ".json", ".webp", ".png", ".jpg", ".svg", ".woff2", ".pfb", ".ttf", ".webmanifest"}


def collect():
    files = []
    for dp, dn, fn in os.walk(ROOT):
        dn[:] = sorted(d for d in dn if d not in SKIP_DIRS)
        for f in sorted(fn):
            if f in SKIP_FILES or os.path.splitext(f)[1].lower() not in EXT:
                continue
            files.append(os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, "/"))
    return files


def build():
    files = collect()
    h = hashlib.sha256()
    for f in files:
        h.update(f.encode())
        with open(os.path.join(ROOT, f), "rb") as fh:
            h.update(fh.read())
    version = h.hexdigest()[:10]
    urls = ["./"] + [f[: -len("index.html")] if f.endswith("/index.html") else f for f in files if f != "index.html"]
    urls = sorted(set(urls + [f for f in files if f.endswith("index.html")]))
    total = sum(os.path.getsize(os.path.join(ROOT, f)) for f in files)
    return version, urls, total


TEMPLATE = r"""/* GENERADO por tools/build_sw.py — no editar a mano. */
const VERSION = "%(version)s";
const CACHE = "hse-" + VERSION;
const FILES = %(files)s;
const PDFJS_FONTS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/";
const FRESH = /\.(html|js|css|json|webmanifest)$|\/$/;   // se revalidan en segundo plano

async function say(msg) {
  const cs = await self.clients.matchAll({ includeUncontrolled: true });
  cs.forEach((c) => c.postMessage(msg));
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let done = 0;
    const base = self.registration.scope;
    for (const f of FILES) {
      try { await cache.add(new Request(new URL(f, base), { cache: "reload" })); } catch (_) {}
      done++;
      if (done %% 10 === 0 || done === FILES.length) say({ type: "precache-progress", pct: Math.round((done / FILES.length) * 100) });
    }
    say({ type: "precache-done" });
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("hse-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // fuentes estándar de pdf.js (la Guía de Inspecciones las pide a jsDelivr): servirlas desde el repo
  if (req.url.startsWith(PDFJS_FONTS)) {
    const name = req.url.slice(PDFJS_FONTS.length).split("?")[0];
    e.respondWith(caches.match(new URL("assets/pdfjs-standard-fonts/" + name, self.registration.scope).href).then((r) => r || fetch(req)));
    return;
  }
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = () => fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    if (hit) {
      if (FRESH.test(url.pathname)) e.waitUntil(net().catch(() => {}));   // stale-while-revalidate
      return hit;
    }
    try { return await net(); }
    catch (err) {
      if (req.mode === "navigate") return (await cache.match(new URL("./", self.registration.scope).href)) || Response.error();
      return Response.error();
    }
  })());
});
"""


def main():
    version, urls, total = build()
    out = TEMPLATE % {"version": version, "files": json.dumps(urls, ensure_ascii=False, indent=1)}
    path = os.path.join(ROOT, "sw.js")
    if "--check" in sys.argv:
        cur = open(path, encoding="utf8").read() if os.path.exists(path) else ""
        if cur != out:
            print("sw.js desactualizado: correr python3 tools/build_sw.py"); sys.exit(1)
        print("sw.js al día"); return
    open(path, "w", encoding="utf8").write(out)
    print("sw.js v%s · %d URLs · %.1f MB a precachear" % (version, len(urls), total / 1e6))


if __name__ == "__main__":
    main()
