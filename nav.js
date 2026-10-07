/* Capa compartida de los sitios de formación HSE.
   Se incluye en cada página con <script src="../nav.js" defer></script>.
   - Menú "Sitios" (Shadow DOM) con progreso, anterior/siguiente y buscador (Ctrl+K o "/").
   - Barra de progreso de lectura, enlace "saltar al contenido".
   - Reglas globales: foco visible, movimiento reducido, impresión.
   - Registro del service worker (uso sin conexión) y botón de instalar. */
(function () {
  if (window.__hseNav) return;
  window.__hseNav = true;

  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/nav\.js(\?.*)?$/, "") : "../";

  var SITES = [
    { dir: "", name: "Inicio", sub: "Portada de la formación", ico: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" },
    { dir: "guia-inspecciones/", name: "Guía de Inspecciones SGI", sub: "Cómo completar cada formulario", ico: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9" },
    { dir: "guia-mediciones-srt/", name: "Guía de Mediciones SRT", sub: "Higiene y seguridad", ico: "M3 17l6-6 4 4 8-8M14 7h7v7" },
    { dir: "herramientas-torre/", name: "Herramientas en Equipos de Torre", sub: "Qué es y cómo se usa", ico: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-.6-.6-2.1z" },
    { dir: "estado-mecanico-pozos/", name: "Estado mecánico de pozos", sub: "Lectura de pozos terminados", ico: "M12 2v20M8 6h8M7 11h10M6 16h12" },
    { dir: "libro-drops/", name: "Libro DROPS", sub: "Objetos caídos · 3D e inspecciones", ico: "M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" }
  ];

  var path = location.pathname;
  var curIdx = (function () {
    for (var i = 1; i < SITES.length; i++) if (path.indexOf("/" + SITES[i].dir) !== -1) return i;
    return 0;
  })();

  /* ---------- progreso (sitios vistos) ---------- */
  var KEY = "hse.visited";
  function getVisited() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function markVisited() {
    if (!curIdx) return;
    var v = getVisited();
    if (v.indexOf(SITES[curIdx].dir) === -1) { v.push(SITES[curIdx].dir); try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  }
  markVisited();
  window.hseNav = { visited: getVisited, sites: SITES };

  /* ---------- reglas globales ---------- */
  var g = document.createElement("style");
  g.id = "hse-global";
  g.textContent =
    ":is(a,button,input,select,textarea,summary,[tabindex]):focus-visible{outline:3px solid #ff8a1f!important;outline-offset:2px!important}" +
    "@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}" +
    "@media print{#hse-nav-host,#hse-progress,#hse-skip{display:none!important}body{background:#fff!important}*{animation:none!important}img,figure,table,pre,section,article{break-inside:avoid}}";
  (document.head || document.documentElement).appendChild(g);

  /* ---------- enlace "saltar al contenido" ---------- */
  function addSkip() {
    var t = document.querySelector("main,[role=main]") || document.querySelector("h1");
    if (!t || document.getElementById("hse-skip")) return;
    if (!t.id) t.id = "hse-main";
    if (t.tagName === "H1" || t === document.querySelector("h1")) t.setAttribute("tabindex", "-1");
    var a = document.createElement("a");
    a.id = "hse-skip"; a.href = "#" + t.id; a.textContent = "Saltar al contenido";
    a.style.cssText = "position:fixed;left:8px;top:-60px;z-index:2147483001;padding:10px 16px;border-radius:8px;background:#ff8a1f;color:#111;font:700 14px system-ui,sans-serif;text-decoration:none;transition:top .15s";
    a.addEventListener("focus", function () { a.style.top = "8px"; });
    a.addEventListener("blur", function () { a.style.top = "-60px"; });
    document.body.insertBefore(a, document.body.firstChild);
  }

  /* ---------- barra de progreso de lectura ---------- */
  function addProgress() {
    var bar = document.createElement("div");
    bar.id = "hse-progress";
    bar.setAttribute("aria-hidden", "true");
    bar.style.cssText = "position:fixed;left:0;top:0;height:3px;width:100%;z-index:2147482999;pointer-events:none;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,#ff8a1f,#35d0ff);opacity:0;transition:opacity .2s";
    document.body.appendChild(bar);
    var tick = false;
    function upd() {
      tick = false;
      var h = document.documentElement.scrollHeight - innerHeight;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (h < 200) { bar.style.opacity = "0"; return; }
      bar.style.opacity = "1"; bar.style.transform = "scaleX(" + Math.min(1, y / h) + ")";
    }
    addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener("resize", upd); upd();
  }

  /* ---------- menú ---------- */
  var host = document.createElement("div");
  host.id = "hse-nav-host";
  host.style.cssText = "all:initial;position:fixed;left:0;bottom:0;z-index:2147483000";
  var root = host.attachShadow({ mode: "open" });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var visited = getVisited();
  function icon(d) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; }

  var items = SITES.map(function (s, i) {
    var cur = i === curIdx, seen = s.dir && visited.indexOf(s.dir) !== -1;
    return '<a class="it' + (cur ? " cur" : "") + '" href="' + base + s.dir + '"' + (cur ? ' aria-current="page"' : "") + ">" + icon(s.ico) +
      "<span><b>" + s.name + "</b><small>" + s.sub + "</small></span>" + (seen ? '<i class="ok" title="Visto" aria-label="Visto">✓</i>' : "") + "</a>";
  }).join("");

  var prev = curIdx > 0 ? SITES[curIdx - 1] : null, next = curIdx < SITES.length - 1 ? SITES[curIdx + 1] : null;
  var pn = '<div class="pn">' +
    (prev ? '<a href="' + base + prev.dir + '" title="' + esc(prev.name) + '">← Anterior</a>' : "<span></span>") +
    (next ? '<a href="' + base + next.dir + '" title="' + esc(next.name) + '">Siguiente →</a>' : "<span></span>") + "</div>";

  root.innerHTML =
    "<style>" +
    ":host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    ".fab{position:fixed;left:14px;bottom:14px;display:flex;align-items:center;gap:8px;padding:10px 16px 10px 12px;border:0;border-radius:999px;cursor:pointer;" +
    "background:linear-gradient(135deg,#ff8a1f,#e5530a);color:#fff;font-size:14px;font-weight:700;letter-spacing:.2px;box-shadow:0 6px 20px rgba(229,83,10,.45);animation:pulse 2.8s infinite;transition:transform .2s}" +
    ".fab:hover{transform:translateY(-2px) scale(1.04)}.fab:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
    ".fab svg{transition:transform .35s}.open .fab svg{transform:rotate(90deg)}" +
    "@keyframes pulse{0%{box-shadow:0 6px 20px rgba(229,83,10,.45),0 0 0 0 rgba(255,138,31,.55)}70%{box-shadow:0 6px 20px rgba(229,83,10,.45),0 0 0 14px rgba(255,138,31,0)}100%{box-shadow:0 6px 20px rgba(229,83,10,.45),0 0 0 0 rgba(255,138,31,0)}}" +
    ".panel{position:fixed;left:14px;bottom:66px;width:min(360px,calc(100vw - 28px));max-height:calc(100vh - 90px);overflow:auto;padding:8px;border-radius:16px;" +
    "background:rgba(16,22,30,.97);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 50px rgba(0,0,0,.5);color:#e8edf2;" +
    "opacity:0;transform:translateY(12px) scale(.96);transform-origin:bottom left;pointer-events:none;visibility:hidden;transition:opacity .22s,transform .22s,visibility .22s}" +
    ".open .panel{opacity:1;transform:none;pointer-events:auto;visibility:visible}" +
    ".hd{display:flex;justify-content:space-between;align-items:center;padding:8px 12px 6px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#ff8a1f;font-weight:700}" +
    ".hd em{font-style:normal;color:#93a3b2;letter-spacing:.4px;text-transform:none;font-weight:600}" +
    ".q{width:100%;margin:2px 0 6px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:14px}" +
    ".q::placeholder{color:#8798a8}.q:focus{outline:2px solid #ff8a1f;outline-offset:1px}" +
    ".it{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;color:#e8edf2;text-decoration:none;transition:background .15s,transform .15s}" +
    ".it:hover,.it:focus-visible{background:rgba(255,138,31,.16);transform:translateX(3px);outline:none}" +
    ".it svg{flex:none;color:#ff8a1f}.it span{flex:1;min-width:0}" +
    ".it b{display:block;font-size:14px;font-weight:600;line-height:1.25}.it small{display:block;font-size:12px;color:#93a3b2;margin-top:1px;overflow:hidden;text-overflow:ellipsis}" +
    ".it.cur{background:rgba(255,138,31,.22);box-shadow:inset 3px 0 0 #ff8a1f}" +
    ".ok{font-style:normal;flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#1fa55b;color:#fff;font-size:12px;font-weight:700}" +
    ".pn{display:flex;justify-content:space-between;gap:8px;margin:6px 4px 2px}.pn a{flex:1;text-align:center;padding:9px;border-radius:10px;background:rgba(255,255,255,.07);color:#e8edf2;text-decoration:none;font-size:13px;font-weight:600}" +
    ".pn a:hover,.pn a:focus-visible{background:rgba(255,138,31,.25);outline:none}" +
    ".st{display:flex;align-items:center;gap:8px;margin:8px 8px 4px;font-size:12px;color:#93a3b2}.dot{width:8px;height:8px;border-radius:50%;background:#7a8795}.dot.on{background:#1fa55b;box-shadow:0 0 0 3px rgba(31,165,91,.25)}" +
    ".inst{display:none;width:calc(100% - 8px);margin:6px 4px 2px;padding:10px;border:0;border-radius:10px;background:#ff8a1f;color:#111;font-weight:700;font-size:13px;cursor:pointer}.inst.show{display:block}" +
    ".none{padding:14px 12px;color:#93a3b2;font-size:13px}" +
    ".bar{height:4px;margin:2px 12px 6px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,#ff8a1f,#35d0ff);transition:width .4s}" +
    "@media print{:host{display:none}}@media (prefers-reduced-motion:reduce){.fab{animation:none}*{transition:none!important}}" +
    "</style>" +
    '<div id="w"><button class="fab" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="p" title="Sitios (Ctrl+K)">' +
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Sitios</button>' +
    '<nav class="panel" id="p" aria-label="Sitios de formación HSE">' +
    '<div class="hd">Formación HSE<em id="cnt"></em></div><div class="bar"><i id="prog"></i></div>' +
    '<input class="q" id="q" type="search" placeholder="Buscar en todos los sitios…  ( / )" aria-label="Buscar en todos los sitios" autocomplete="off">' +
    '<div id="list">' + items + "</div>" + pn +
    '<button class="inst" id="inst" type="button">Instalar como app</button>' +
    '<div class="st"><span class="dot" id="dot"></span><span id="stx">Comprobando uso sin conexión…</span></div></nav></div>';

  var w = root.getElementById("w"), btn = root.querySelector(".fab"), q = root.getElementById("q"), list = root.getElementById("list");
  var itemsHTML = items;
  function updCount() {
    var n = getVisited().length, t = SITES.length - 1;
    root.getElementById("cnt").textContent = n + "/" + t + " vistos";
    root.getElementById("prog").style.width = (n / t * 100) + "%";
  }
  updCount();
  function set(o) {
    w.classList.toggle("open", o); btn.setAttribute("aria-expanded", o ? "true" : "false");
    if (o) { loadIndex(); setTimeout(function () { q.focus(); }, 60); }
  }
  btn.addEventListener("click", function (e) { e.stopPropagation(); set(!w.classList.contains("open")); });
  document.addEventListener("click", function (e) { if (!host.contains(e.target)) set(false); });
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    var typing = /INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable);
    if (e.key === "Escape" && w.classList.contains("open")) { set(false); btn.focus(); }
    else if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); set(true); }
    else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); set(true); }
  });

  /* ---------- buscador ---------- */
  var idx = null, loading = false;
  function loadIndex() {
    if (idx || loading) return; loading = true;
    fetch(base + "assets/search-index.json").then(function (r) { return r.json(); }).then(function (j) { idx = j; if (q.value) run(); }).catch(function () { loading = false; });
  }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function run() {
    var t = norm(q.value.trim());
    if (!t) { list.innerHTML = itemsHTML; return; }
    if (!idx) { list.innerHTML = '<div class="none">Cargando índice…</div>'; return; }
    var words = t.split(/\s+/), out = [];
    for (var i = 0; i < idx.length && out.length < 40; i++) {
      var e = idx[i], hay = norm(e.t + " " + e.s), ok = true;
      for (var k = 0; k < words.length; k++) if (hay.indexOf(words[k]) === -1) { ok = false; break; }
      if (ok) out.push(e);
    }
    list.innerHTML = out.length ? out.map(function (e) {
      return '<a class="it" href="' + base + e.u + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg><span><b>' + esc(e.t) + "</b><small>" + esc(e.s) + "</small></span></a>";
    }).join("") : '<div class="none">Sin resultados para “' + esc(q.value) + "”</div>";
  }
  q.addEventListener("input", run);
  q.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { var a = list.querySelector("a.it"); if (a) location.href = a.href; }
    if (e.key === "ArrowDown") { var f = list.querySelector("a.it"); if (f) { e.preventDefault(); f.focus(); } }
  });

  /* ---------- sin conexión / instalar ---------- */
  var dot = root.getElementById("dot"), stx = root.getElementById("stx"), inst = root.getElementById("inst"), deferred = null;
  function status(on, msg) { dot.classList.toggle("on", on); stx.textContent = msg; }
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register(base + "sw.js").then(function () { return navigator.serviceWorker.ready; })
      .then(function () { status(true, "Disponible sin conexión"); })
      .catch(function () { status(false, "Sin modo offline en este navegador"); });
    navigator.serviceWorker.addEventListener("message", function (e) {
      if (e.data && e.data.type === "precache-progress") status(false, "Descargando para uso offline… " + e.data.pct + "%");
      if (e.data && e.data.type === "precache-done") status(true, "Disponible sin conexión");
    });
  } else status(false, "Modo offline requiere http(s)");
  addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; inst.classList.add("show"); });
  inst.addEventListener("click", function () { if (deferred) { deferred.prompt(); deferred = null; inst.classList.remove("show"); } });
  addEventListener("online", function () { stx.textContent = "En línea · " + (dot.classList.contains("on") ? "disponible sin conexión" : "descargando…"); });
  addEventListener("offline", function () { stx.textContent = "Sin conexión · usando copia guardada"; });

  function mount() { addSkip(); addProgress(); document.body.appendChild(host); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
