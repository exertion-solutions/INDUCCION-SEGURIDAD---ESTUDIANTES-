/* Balancín de bombeo (pumpjack) convencional: cinemática resuelta + dibujo SVG.
   Coordenadas en unidades del viewBox, Y hacia arriba, suelo en y=0, boca de pozo en x=0.
   Mecanismo: manivela (O,r) -> biela (Lp) -> pin trasero de la viga (b) -> viga con pivote en el poste Samson
   -> cabeza de caballo (arco de radio a, centrado en el pivote) -> cable vertical -> barra pulida.
   Ilustrativo, no es un diseño a escala real. */
(function (root) {
  "use strict";

  // ===== PARÁMETROS =====
  var P = {
    a: 56,                    // radio de la cabeza de caballo = brazo delantero de la viga
    b: 62,                    // brazo trasero de la viga (pivote -> pin de la biela)
    H: 150,                   // altura del pivote sobre el suelo
    r: 22,                    // radio de la manivela
    Lp: 84,                   // longitud de la biela
    O: { x: 122, y: 66 },     // eje de la manivela (salida del reductor)
    whTop: 66,                // altura de la prensaestopas
    rodMean: 108,             // altura media del carro de la barra pulida
    cwR: 20,                  // distancia del contrapeso al eje
    horseSpan: 38             // semiapertura angular del arco de la cabeza de caballo (grados)
  };

  // ===== ECUACIONES =====
  function derive(p) {
    var q = {}; for (var k in p) q[k] = p[k];
    q.pivot = { x: q.a, y: q.H };               // el cable queda sobre x=0 (tangente izquierda del arco)
    q.Lc = q.H - q.rodMean;                     // largo libre del cable en el punto medio
    return q;
  }
  var D = derive(P);

  // ===== CINEMÁTICA =====
  // Intersección de dos circunferencias: (pivote, b) y (C, Lp). Se toma la solución con B más arriba.
  function kin(theta, d) {
    d = d || D;
    var C = { x: d.O.x + d.r * Math.cos(theta), y: d.O.y + d.r * Math.sin(theta) };
    var dx = C.x - d.pivot.x, dy = C.y - d.pivot.y, dist = Math.hypot(dx, dy);
    if (dist > d.b + d.Lp || dist < Math.abs(d.b - d.Lp)) return null; // mecanismo trabado
    var aa = (d.b * d.b - d.Lp * d.Lp + dist * dist) / (2 * dist);
    var h = Math.sqrt(Math.max(0, d.b * d.b - aa * aa));
    var ux = dx / dist, uy = dy / dist;
    var m = { x: d.pivot.x + aa * ux, y: d.pivot.y + aa * uy };
    var B1 = { x: m.x - h * uy, y: m.y + h * ux }, B2 = { x: m.x + h * uy, y: m.y - h * ux };
    var B = B1.y >= B2.y ? B1 : B2;
    // B = pivote + b*(cos phi, sin phi); phi>0: lado trasero arriba y cabeza de caballo abajo
    var phi = Math.atan2(B.y - d.pivot.y, B.x - d.pivot.x);
    // el arco enrolla a*phi de cable: la barra pulida baja cuando la cabeza baja
    var rodY = d.pivot.y - d.Lc - d.a * phi;
    return { theta: theta, C: C, B: B, phi: phi, rodY: rodY };
  }

  // ===== VERIFICACIÓN (todo el rango de movimiento) =====
  function segDist(p, a, b) {
    var vx = b.x - a.x, vy = b.y - a.y, t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  }
  function verify(d) {
    d = d || D;
    var n = 720, phiMin = 1e9, phiMax = -1e9, rMin = 1e9, rMax = -1e9, clearPost = 1e9, clearGround = 1e9, maxStep = 0, prev = null, ok = true;
    var legA = { x: d.pivot.x + 34, y: 0 }, legB = { x: d.pivot.x + 5, y: d.pivot.y - 6 };
    for (var i = 0; i <= n; i++) {
      var k = kin(i / n * 2 * Math.PI, d);
      if (!k) { ok = false; break; }
      phiMin = Math.min(phiMin, k.phi); phiMax = Math.max(phiMax, k.phi);
      rMin = Math.min(rMin, k.rodY); rMax = Math.max(rMax, k.rodY);
      // holgura biela / pata trasera del poste y contrapeso / suelo
      for (var t = 0; t <= 1; t += 0.1) clearPost = Math.min(clearPost, segDist({ x: k.C.x + (k.B.x - k.C.x) * t, y: k.C.y + (k.B.y - k.C.y) * t }, legA, legB));
      clearGround = Math.min(clearGround, d.O.y - d.cwR - 15);
      if (prev !== null) maxStep = Math.max(maxStep, Math.abs(k.phi - prev));
      prev = k.phi;
    }
    return {
      ok: ok, phiDeg: [phiMin * 180 / Math.PI, phiMax * 180 / Math.PI],
      stroke: rMax - rMin, rodY: [rMin, rMax], clearPost: clearPost, clearGround: clearGround,
      maxStepDeg: maxStep * 180 / Math.PI, topClear: rMin - d.whTop
    };
  }

  // ===== DIBUJO =====
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e); return e;
  }
  function pts(arr) { return arr.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }

  function mount(svg, opts) {
    var d = D, g = el("g", { transform: "translate(58 296) scale(1 -1)" }, svg);
    var STEEL = "#8ea1b5", DARK = "#3a4a5c", OR = "#ff8a1f", RED = "#e5530a", LIGHT = "#dce6f0";

    // base / patín
    el("rect", { x: 12, y: 0, width: 172, height: 8, rx: 2, fill: "#2a3949", stroke: STEEL, "stroke-width": 1 }, g);
    // cabezal de pozo (árbol): base, cuerpo, válvula lateral, prensaestopas
    el("rect", { x: -9, y: 0, width: 18, height: 16, fill: DARK, stroke: STEEL }, g);
    el("rect", { x: -5, y: 16, width: 10, height: d.whTop - 16 - 8, fill: "#4c6075", stroke: STEEL }, g);
    el("rect", { x: -9, y: 34, width: 18, height: 6, fill: DARK }, g);
    el("rect", { x: 5, y: 26, width: 18, height: 6, fill: "#4c6075", stroke: STEEL }, g);
    el("circle", { cx: 26, cy: 29, r: 5, fill: RED }, g);
    el("rect", { x: -7, y: d.whTop - 10, width: 14, height: 10, rx: 2, fill: "#5d758c", stroke: LIGHT, "stroke-width": 1 }, g);
    // poste Samson (A) con travesaños
    var px = d.pivot.x, py = d.pivot.y;
    el("polyline", { points: pts([[px - 34, 8], [px - 5, py - 7]]), stroke: "url(#steel)", "stroke-width": 7, "stroke-linecap": "round", fill: "none" }, g);
    el("polyline", { points: pts([[px + 34, 8], [px + 5, py - 7]]), stroke: "url(#steel)", "stroke-width": 7, "stroke-linecap": "round", fill: "none" }, g);
    el("path", { d: "M" + (px - 24) + " 48 L" + (px + 24) + " 48 M" + (px - 15) + " 96 L" + (px + 15) + " 96 M" + (px - 24) + " 48 L" + (px + 15) + " 96 M" + (px + 24) + " 48 L" + (px - 15) + " 96", stroke: STEEL, "stroke-width": 2.2, fill: "none" }, g);
    el("rect", { x: px - 9, y: py - 12, width: 18, height: 10, rx: 2, fill: DARK, stroke: LIGHT, "stroke-width": 1 }, g); // cojinete central
    // reductor + motor + correa
    el("rect", { x: d.O.x - 24, y: 8, width: 48, height: d.O.y - 8 - 6, rx: 6, fill: "#2f4254", stroke: STEEL, "stroke-width": 1.4 }, g);
    el("rect", { x: 156, y: 8, width: 34, height: 24, rx: 5, fill: "#35516b", stroke: STEEL, "stroke-width": 1.4 }, g);
    el("circle", { cx: 173, cy: 20, r: 7, fill: "#1f2f3f", stroke: LIGHT, "stroke-width": 1 }, g);
    el("path", { d: "M" + (d.O.x + 22) + " 36 L167 27 M" + (d.O.x + 22) + " 18 L167 12", stroke: "#111", "stroke-width": 2, fill: "none" }, g);

    // cable, carro y barra pulida
    var cable1 = el("line", { stroke: LIGHT, "stroke-width": 1.6 }, g), cable2 = el("line", { stroke: LIGHT, "stroke-width": 1.6 }, g);
    var carrier = el("rect", { x: -9, width: 18, height: 5, rx: 1.5, fill: OR }, g);
    var rod = el("line", { x1: 0, x2: 0, y1: d.whTop - 2, stroke: "#eef3f8", "stroke-width": 3.2, "stroke-linecap": "round" }, g);

    // viga (grupo que gira) con cabeza de caballo
    var beam = el("g", {}, g);
    var arc = []; var span = d.horseSpan * Math.PI / 180;
    for (var i = 0; i <= 14; i++) { var t = Math.PI - span + (2 * span) * i / 14; arc.push([d.a * Math.cos(t), d.a * Math.sin(t)]); }
    var inner = []; for (var j = 14; j >= 0; j--) { var t2 = Math.PI - span + (2 * span) * j / 14; inner.push([(d.a - 9) * Math.cos(t2), (d.a - 9) * Math.sin(t2)]); }
    el("polygon", { points: pts([[-d.a + 8, 6], [-d.a + 8, -6], [0, -10], [d.b, -7], [d.b, 7], [0, 10]]), fill: OR }, beam);
    el("polygon", { points: pts(arc.concat(inner)), fill: RED, stroke: "#ffb347", "stroke-width": 1 }, beam);
    el("line", { x1: -d.a + 10, y1: 0, x2: d.b - 2, y2: 0, stroke: "#ffcf8a", "stroke-width": 1.2, opacity: 0.7 }, beam);
    el("circle", { cx: d.b, cy: 0, r: 4.5, fill: LIGHT, stroke: DARK, "stroke-width": 1.5 }, beam);

    // biela
    var pit1 = el("line", { stroke: STEEL, "stroke-width": 5, "stroke-linecap": "round" }, g);
    var pit2 = el("line", { stroke: "#c7d3df", "stroke-width": 1.8, "stroke-linecap": "round" }, g);
    // manivela con contrapeso
    var crank = el("g", {}, g);
    el("rect", { x: -d.cwR - 15, y: -15, width: 28, height: 30, rx: 8, fill: RED, stroke: "#ffb347", "stroke-width": 1.2 }, crank);
    el("rect", { x: -d.cwR + 6, y: -5, width: d.cwR + d.r - 4, height: 10, rx: 5, fill: STEEL }, crank);
    el("circle", { cx: d.r, cy: 0, r: 5, fill: "#ffb347", stroke: DARK, "stroke-width": 1.5 }, crank);
    el("circle", { cx: 0, cy: 0, r: 7, fill: LIGHT, stroke: DARK, "stroke-width": 2 }, crank);
    // pivote
    el("circle", { cx: px, cy: py, r: 8, fill: LIGHT, stroke: DARK, "stroke-width": 2 }, g);

    function draw(theta) {
      var k = kin(theta); if (!k) return;
      beam.setAttribute("transform", "translate(" + px + " " + py + ") rotate(" + (k.phi * 180 / Math.PI).toFixed(3) + ")");
      crank.setAttribute("transform", "translate(" + d.O.x + " " + d.O.y + ") rotate(" + (theta * 180 / Math.PI).toFixed(2) + ")");
      [pit1, pit2].forEach(function (l) { l.setAttribute("x1", k.C.x); l.setAttribute("y1", k.C.y); l.setAttribute("x2", k.B.x); l.setAttribute("y2", k.B.y); });
      // el cable sale vertical desde la tangente izquierda del arco (x=0, y=pivote)
      cable1.setAttribute("x1", -3); cable1.setAttribute("x2", -3); cable2.setAttribute("x1", 3); cable2.setAttribute("x2", 3);
      [cable1, cable2].forEach(function (c) { c.setAttribute("y1", py); c.setAttribute("y2", k.rodY + 5); });
      carrier.setAttribute("y", k.rodY); rod.setAttribute("y2", k.rodY);
    }
    var raf = 0, t0 = 0, running = false, reduce = matchMedia("(prefers-reduced-motion:reduce)").matches, period = (opts && opts.period) || 5200;
    function loop(ts) { if (!running) return; if (!t0) t0 = ts; draw(((ts - t0) % period) / period * 2 * Math.PI); raf = requestAnimationFrame(loop); }
    function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    draw(Math.PI * 0.35);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe((opts && opts.observe) || svg); else start();
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    return { draw: draw, start: start, stop: stop };
  }

  var api = { P: P, D: D, kin: kin, verify: verify, mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Pumpjack = api;
})(typeof window !== "undefined" ? window : this);
