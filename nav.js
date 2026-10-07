/* Navegación compartida entre los sitios de formación HSE.
   Se incluye en cada página con <script src="../nav.js" defer></script>.
   Usa Shadow DOM para no chocar con los estilos de cada página. */
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
  function isHere(s) {
    var inSub = SITES.slice(1).some(function (x) { return path.indexOf("/" + x.dir) !== -1; });
    return s.dir ? path.indexOf("/" + s.dir) !== -1 : !inSub;
  }

  var host = document.createElement("div");
  host.id = "hse-nav-host";
  host.style.cssText = "all:initial;position:fixed;left:0;bottom:0;z-index:2147483000";
  var root = host.attachShadow({ mode: "open" });

  var items = SITES.map(function (s) {
    var cur = isHere(s);
    return '<a class="it' + (cur ? " cur" : "") + '" href="' + base + s.dir + '"' + (cur ? ' aria-current="page"' : "") + ">" +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + s.ico + '"/></svg>' +
      '<span><b>' + s.name + "</b><small>" + s.sub + "</small></span></a>";
  }).join("");

  root.innerHTML =
    "<style>" +
    ":host{all:initial}" +
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    ".fab{position:fixed;left:14px;bottom:14px;display:flex;align-items:center;gap:8px;padding:10px 16px 10px 12px;border:0;border-radius:999px;cursor:pointer;" +
    "background:linear-gradient(135deg,#ff8a1f,#e5530a);color:#fff;font-size:14px;font-weight:700;letter-spacing:.2px;box-shadow:0 6px 20px rgba(229,83,10,.45),0 0 0 0 rgba(255,138,31,.6);animation:pulse 2.8s infinite;transition:transform .2s}" +
    ".fab:hover{transform:translateY(-2px) scale(1.04)}.fab:focus-visible{outline:3px solid #fff;outline-offset:2px}" +
    ".fab svg{transition:transform .35s}.open .fab svg{transform:rotate(90deg)}" +
    "@keyframes pulse{0%{box-shadow:0 6px 20px rgba(229,83,10,.45),0 0 0 0 rgba(255,138,31,.55)}70%{box-shadow:0 6px 20px rgba(229,83,10,.45),0 0 0 14px rgba(255,138,31,0)}100%{box-shadow:0 6px 20px rgba(229,83,10,.45),0 0 0 0 rgba(255,138,31,0)}}" +
    ".panel{position:fixed;left:14px;bottom:66px;width:min(340px,calc(100vw - 28px));max-height:calc(100vh - 90px);overflow:auto;padding:8px;border-radius:16px;" +
    "background:rgba(16,22,30,.96);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 50px rgba(0,0,0,.5);" +
    "opacity:0;transform:translateY(12px) scale(.96);transform-origin:bottom left;pointer-events:none;transition:opacity .22s,transform .22s}" +
    ".open .panel{opacity:1;transform:none;pointer-events:auto}" +
    ".hd{padding:8px 12px 6px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#ff8a1f;font-weight:700}" +
    ".it{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;color:#e8edf2;text-decoration:none;transition:background .15s,transform .15s}" +
    ".it:hover,.it:focus-visible{background:rgba(255,138,31,.16);transform:translateX(3px);outline:none}" +
    ".it svg{flex:none;color:#ff8a1f}" +
    ".it b{display:block;font-size:14px;font-weight:600;line-height:1.25}.it small{display:block;font-size:12px;color:#93a3b2;margin-top:1px}" +
    ".it.cur{background:rgba(255,138,31,.22);box-shadow:inset 3px 0 0 #ff8a1f}" +
    "@media print{:host{display:none}}" +
    "@media (prefers-reduced-motion:reduce){.fab{animation:none}*{transition:none!important}}" +
    "</style>" +
    '<div id="w"><button class="fab" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="p">' +
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Sitios</button>' +
    '<nav class="panel" id="p" aria-label="Sitios de formación HSE"><div class="hd">Formación HSE</div>' + items + "</nav></div>";

  var w = root.getElementById("w");
  var btn = root.querySelector(".fab");
  function set(o) { w.classList.toggle("open", o); btn.setAttribute("aria-expanded", o ? "true" : "false"); }
  btn.addEventListener("click", function (e) { e.stopPropagation(); set(!w.classList.contains("open")); });
  document.addEventListener("click", function (e) { if (!host.contains(e.target)) set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { set(false); btn.focus(); } });

  function mount() { document.body.appendChild(host); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
