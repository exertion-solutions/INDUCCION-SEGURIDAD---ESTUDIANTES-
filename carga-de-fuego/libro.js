/* Libro de carga de fuego: relevamiento guiado, verificaciones, desvíos e informe Word.
   Usa CF (motor.js) y CFInforme (informe.js). Los datos se guardan en este navegador. */
(function () {
  "use strict";
  const CF = window.CF;
  const KEY = "cf-libro-v1";
  const $ = (s, el = document) => el.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = CF.fmt;
  const tagH = e => `<span class="tag ${e}">${e === "of" ? "oficial" : e === "se" ? "secundario" : "verificar"}</span>`;
  const ESTADO = { C: "Cumple", NC: "No cumple", NA: "No aplica" };

  let L = cargar();
  let etapa = "est";
  let secIdx = 0;
  let avisoGuardado = "";

  function cargar() {
    try { const t = localStorage.getItem(KEY); if (t) { const d = JSON.parse(t); if (d && d.sectores) return d; } } catch (e) { /* sin almacenamiento */ }
    return CF.ejemplo();
  }
  let tGuardar = null;
  function guardar() {
    clearTimeout(tGuardar);
    tGuardar = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(L)); avisoGuardado = "Guardado en este navegador a las " + new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }); }
      catch (e) { avisoGuardado = "No se pudo guardar en el navegador (las fotos ocupan mucho). Guardá un respaldo desde el paso 5."; }
      const el = $("#lb-guardado"); if (el) el.textContent = avisoGuardado;
    }, 400);
  }
  const sec = () => L.sectores[Math.min(secIdx, L.sectores.length - 1)];
  const calc = s => CF.calcSector(s);
  const evaluar = s => CF.evaluar(s, calc(s), L.est.fechaRelev);

  /* ---------- progreso por etapa ---------- */
  const CAMPOS_EST = ["empresa", "cuit", "establecimiento", "domicilio", "localidad", "provincia", "actividad", "nInforme", "fechaRelev", "profesional", "matricula"];
  function progreso() {
    const est = CAMPOS_EST.filter(k => (L.est[k] || "").toString().trim()).length;
    let tot = 0, hechos = 0, nc = 0;
    L.sectores.forEach(s => evaluar(s).forEach(i => { tot++; if (i.estado) hechos++; if (i.estado === "NC") nc++; }));
    return { est: `${est}/${CAMPOS_EST.length}`, estOk: est === CAMPOS_EST.length, sec: `${L.sectores.length} sector${L.sectores.length > 1 ? "es" : ""}`,
      ver: `${hechos}/${tot}`, verOk: hechos === tot, hal: nc ? `${nc} desvío${nc > 1 ? "s" : ""}` : "sin desvíos", nc };
  }

  /* ---------- armado general ---------- */
  function render() {
    const p = progreso();
    const pasos = [["est", "1", "Establecimiento", p.est, p.estOk], ["sec", "2", "Sectores y relevamiento", p.sec, true], ["ver", "3", "Verificación en el lugar", p.ver, p.verOk],
      ["hal", "4", "Desvíos y medidas", p.hal, true], ["inf", "5", "Informe Word", "exportar", false]];
    $("#lb-nav").innerHTML = pasos.map(([id, n, t, chip, ok]) =>
      `<button type="button" class="lb-paso" data-etapa="${id}" aria-current="${etapa === id ? "step" : "false"}"><b>${n}</b><span>${t}<small class="${ok ? "ok" : ""}">${chip}</small></span></button>`).join("");
    const box = $("#lb-etapa");
    box.innerHTML = { est: vEst, sec: vSec, ver: vVer, hal: vHal, inf: vInf }[etapa]();
    $("#lb-guardado").textContent = avisoGuardado || "Los datos se guardan solos en este navegador.";
    if (etapa === "sec") pintarResultados();
  }

  const campo = (path, label, val, o = {}) => `<label class="field ${o.cls || ""}" for="f-${path.replace(/\W/g, "-")}">${label}
    ${o.area ? `<textarea id="f-${path.replace(/\W/g, "-")}" data-f="${path}" rows="${o.rows || 3}" placeholder="${esc(o.ph || "")}">${esc(val)}</textarea>`
      : o.sel ? `<select id="f-${path.replace(/\W/g, "-")}" data-f="${path}">${o.sel.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(val) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`
      : `<input id="f-${path.replace(/\W/g, "-")}" data-f="${path}" type="${o.type || "text"}" value="${esc(val)}" ${o.step ? `step="${o.step}"` : ""} placeholder="${esc(o.ph || "")}" ${o.type === "number" ? 'inputmode="decimal"' : ""}>`}
    ${o.help ? `<small>${o.help}</small>` : ""}</label>`;

  const queVerificar = (titulo, items) => `<details class="qv" open><summary>${titulo}</summary><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul></details>`;

  /* ---------- 1. establecimiento ---------- */
  function vEst() {
    const E = L.est;
    return `<div class="lb-head"><h2>Datos del establecimiento</h2><p>Estos datos van en la carátula y en el capítulo 4 del informe.</p></div>
    ${queVerificar("Qué verificar antes de empezar", ["Pedí la constancia de CUIT y el plano actualizado del establecimiento.", "Confirmá en el lugar el domicilio y la actividad que realmente se desarrolla.",
      "Anotá la fecha del relevamiento: el informe vale para las condiciones de ese día.", "La firma la pone un profesional matriculado; si sos estudiante, completá sus datos y dejá que lo revise."])}
    <fieldset class="lb-card"><legend>Establecimiento</legend><div class="fgrid">
      ${campo("est.empresa", "Razón social", E.empresa)}${campo("est.cuit", "CUIT", E.cuit, { ph: "30-00000000-0" })}
      ${campo("est.establecimiento", "Establecimiento", E.establecimiento)}${campo("est.actividad", "Actividad", E.actividad)}
      ${campo("est.domicilio", "Domicilio", E.domicilio)}${campo("est.localidad", "Localidad", E.localidad)}
      ${campo("est.provincia", "Provincia", E.provincia, { sel: ["Neuquén", "Río Negro", "Mendoza", "La Pampa", "Chubut", "Buenos Aires", "Otra"].map(x => [x, x]) })}
      ${campo("est.solicitante", "Solicitante o destinatario", E.solicitante)}
    </div></fieldset>
    <fieldset class="lb-card"><legend>Informe</legend><div class="fgrid">
      ${campo("est.nInforme", "Informe N.º", E.nInforme)}${campo("est.fechaRelev", "Fecha de relevamiento", E.fechaRelev, { type: "date" })}
      ${campo("est.fechaInforme", "Fecha de emisión", E.fechaInforme, { type: "date" })}
    </div></fieldset>
    <fieldset class="lb-card"><legend>Profesional que firma</legend><div class="fgrid">
      ${campo("est.profesional", "Nombre y apellido", E.profesional)}${campo("est.titulo", "Título", E.titulo)}
      ${campo("est.matricula", "Matrícula", E.matricula)}${campo("est.colegio", "Colegio o consejo", E.colegio, { ph: "Colegio de Técnicos del Neuquén" })}
    </div></fieldset>
    <div class="lb-next"><button class="btn primary" type="button" data-etapa="sec">Seguir con los sectores</button></div>`;
  }

  /* ---------- 2. sectores ---------- */
  function chipsSectores(conAgregar) {
    return `<div class="lb-chips" role="tablist" aria-label="Sectores">${L.sectores.map((s, k) =>
      `<button type="button" role="tab" class="chip" data-sec="${k}" aria-selected="${k === secIdx}">${esc(s.nombre || "Sector " + (k + 1))}</button>`).join("")}
      ${conAgregar ? `<button type="button" class="chip add" data-act="addSec">+ Agregar sector</button>` : ""}</div>`;
  }
  function vSec() {
    const s = sec(); const k = secIdx;
    const opLib = Object.entries(CF.LIB).map(([id, m]) => `<option value="${id}">${esc(m.n)} (clase ${m.c})</option>`).join("");
    return `<div class="lb-head"><h2>Sectores y relevamiento</h2><p>Un sector de incendio por pestaña. Cargá lo que medís y contás en el lugar; los resultados se calculan solos.</p></div>
    ${chipsSectores(true)}
    <div class="lb-split">
      <div class="lb-col">
        <fieldset class="lb-card"><legend>Datos del sector</legend><div class="fgrid">
          ${campo(`s.${k}.nombre`, "Nombre del sector", s.nombre)}
          ${campo(`s.${k}.superficie`, "Superficie de cálculo (m²)", s.superficie, { type: "number", step: "any", help: "Descontá medios de escape, sanitarios y locales de uso común." })}
          ${campo(`s.${k}.uso`, "Uso (factor de ocupación)", s.uso, { sel: CF.USOS.map(([x, t]) => [x, `${t} · ${x} m²/persona`]) })}
          ${campo(`s.${k}.ventilacion`, "Ventilación", s.ventilacion, { sel: [["nat", "Natural (Cuadro 2.2.1)"], ["mec", "Mecánica (Cuadro 2.2.2)"]] })}
          ${campo(`s.${k}.riesgo`, "Riesgo del sector", s.riesgo, { sel: CF.RIESGOS.map(([n, t]) => [n, `R${n} · ${t}`]), help: "Lo define el material predominante. Ante la duda, riesgo 3." })}
          ${campo(`s.${k}.fExistente`, "Resistencia al fuego existente", s.fExistente, { sel: CF.F_OPC.map(x => [x, x]), help: "Solo si está acreditada (ensayo o certificado)." })}
          <label class="field span2 chk"><input type="checkbox" data-f="s.${k}.r2B" ${s.r2B !== false ? "checked" : ""}> Con líquidos inflamables, tomar la columna de riesgo 2 para el potencial clase B (criterio conservador)</label>
          ${campo(`s.${k}.construccion`, "Características constructivas", s.construccion, { area: true, cls: "span2", ph: "Muros, estructura, cubierta, aberturas" })}
        </div>
        ${L.sectores.length > 1 ? `<div class="lb-row-end"><button type="button" class="btn ghost danger" data-act="delSec">Quitar este sector</button></div>` : ""}
        </fieldset>

        <fieldset class="lb-card"><legend>Relevamiento de materiales combustibles</legend>
          ${queVerificar("Qué verificar al relevar", ["Recorré todo el sector, incluidas estanterías altas, entrepisos y depósitos chicos.", "Pesá o contá (pallets, cajas, tambores) y estimá por exceso si falta un dato.",
            "Separá sólidos (clase A) de líquidos inflamables (clase B).", "Para los líquidos, tomá la densidad de la hoja de seguridad del producto.", "Anotá de dónde sacás cada poder calorífico: va en el informe."])}
          <div class="tablebox"><table class="lb-tab"><thead><tr><th>Material</th><th>Clase</th><th class="r">Cantidad</th><th>Unidad</th><th class="r">Densidad</th><th class="r">PCI kcal/kg</th><th>Fuente del PCI</th><th></th></tr></thead><tbody>
          ${(s.materiales || []).map((m, j) => `<tr>
            <td><input aria-label="Material" data-m="${j}:nombre" value="${esc(m.nombre)}" class="w-l"></td>
            <td><select aria-label="Clase" data-m="${j}:c"><option ${m.c === "A" ? "selected" : ""}>A</option><option ${m.c === "B" ? "selected" : ""}>B</option></select></td>
            <td class="r"><input aria-label="Cantidad" data-m="${j}:q" type="number" step="any" inputmode="decimal" value="${esc(m.q)}"></td>
            <td><select aria-label="Unidad" data-m="${j}:u"><option value="kg" ${m.u !== "l" ? "selected" : ""}>kg</option><option value="l" ${m.u === "l" ? "selected" : ""}>litros</option></select></td>
            <td class="r">${m.u === "l" ? `<input aria-label="Densidad" data-m="${j}:dens" type="number" step="0.01" inputmode="decimal" value="${esc(m.dens ?? "")}">` : "—"}</td>
            <td class="r"><input aria-label="Poder calorífico" data-m="${j}:pci" type="number" step="any" inputmode="decimal" value="${esc(m.pci)}"></td>
            <td><input aria-label="Fuente" data-m="${j}:fuente" value="${esc(m.fuente)}" class="w-l"></td>
            <td><button type="button" class="del" data-act="delMat" data-j="${j}" aria-label="Quitar">×</button></td></tr>`).join("")}
          </tbody></table></div>
          <div class="inline"><label class="field" for="lb-addmat">Agregar de la lista<select id="lb-addmat">${opLib}</select></label><button type="button" class="btn" data-act="addMat">Agregar material</button></div>
        </fieldset>

        <fieldset class="lb-card"><legend>Extintores instalados</legend>
          ${queVerificar("Qué verificar en cada extintor", ["Leé el potencial del marbete (por ejemplo 3A-40BC), no solo los kilos.", "Anotá el vencimiento de la carga y de la prueba hidráulica de la tarjeta.", "Ubicá cada equipo en el plano para medir después los recorridos."])}
          <div class="tablebox"><table class="lb-tab"><thead><tr><th>Código</th><th>Agente</th><th class="r">kg</th><th class="r">Pot. A</th><th class="r">Pot. B</th><th>Ubicación</th><th>Vence carga</th><th>Vence P.H.</th><th></th></tr></thead><tbody>
          ${(s.extintores || []).map((e, j) => `<tr>
            <td><input aria-label="Código" data-x="${j}:cod" value="${esc(e.cod)}" class="w-s"></td>
            <td><select aria-label="Agente" data-x="${j}:agente">${["PQS ABC", "CO₂", "AFFF", "Agua", "Agente limpio", "Clase K", "Clase D"].map(a => `<option ${a === e.agente ? "selected" : ""}>${a}</option>`).join("")}</select></td>
            <td class="r"><input aria-label="Capacidad" data-x="${j}:kg" type="number" step="any" value="${esc(e.kg)}" class="w-s"></td>
            <td class="r"><input aria-label="Potencial A" data-x="${j}:ra" type="number" step="1" value="${esc(e.ra)}" class="w-s"></td>
            <td class="r"><input aria-label="Potencial B" data-x="${j}:rb" type="number" step="1" value="${esc(e.rb)}" class="w-s"></td>
            <td><input aria-label="Ubicación" data-x="${j}:ubic" value="${esc(e.ubic)}" class="w-l"></td>
            <td><input aria-label="Vencimiento de carga" data-x="${j}:vc" type="date" value="${esc(e.vc)}"></td>
            <td><input aria-label="Vencimiento de prueba hidráulica" data-x="${j}:ph" type="date" value="${esc(e.ph)}"></td>
            <td><button type="button" class="del" data-act="delExt" data-j="${j}" aria-label="Quitar">×</button></td></tr>`).join("")}
          </tbody></table></div>
          <div class="inline"><button type="button" class="btn" data-act="addExt">Agregar extintor</button></div>
        </fieldset>

        <fieldset class="lb-card"><legend>Mediciones en el lugar</legend><div class="fgrid">
          ${campo(`s.${k}.anchoSalida`, "Ancho libre de la salida (m)", s.anchoSalida, { type: "number", step: "0.01" })}
          ${campo(`s.${k}.nSalidas`, "Cantidad de salidas", s.nSalidas, { type: "number", step: "1" })}
          ${campo(`s.${k}.distExt`, "Recorrido máximo a un extintor (m)", s.distExt, { type: "number", step: "0.1", help: "Desde el punto más alejado, por el camino real." })}
          ${campo(`s.${k}.distSalida`, "Recorrido máximo a la salida (m)", s.distSalida, { type: "number", step: "0.1" })}
        </div></fieldset>

        <fieldset class="lb-card"><legend>Fotos del sector</legend>
          <div class="fotos">${(s.fotos || []).map((f, j) => `<figure class="foto"><img src="${f.data}" alt="${esc(f.cap || "Foto del sector")}">
            <input aria-label="Epígrafe" data-foto="${j}" value="${esc(f.cap)}" placeholder="Epígrafe"><button type="button" class="del" data-act="delFoto" data-j="${j}" aria-label="Quitar foto">×</button></figure>`).join("")}
            <label class="foto add"><input type="file" accept="image/*" data-up="sector" hidden><span>+ Agregar foto</span></label></div>
        </fieldset>
      </div>
      <aside class="lb-res" id="lb-res" aria-live="polite"></aside>
    </div>
    <div class="lb-next"><button class="btn primary" type="button" data-etapa="ver">Seguir con la verificación</button></div>`;
  }
  function pintarResultados() {
    const el = $("#lb-res"); if (!el) return;
    const s = sec(), r = calc(s);
    const inst = (s.extintores || []).length;
    const fEx = CF.fnum(s.fExistente), fReq = CF.fnum(r.F);
    const fila = (k, v, ok) => `<div class="rrow"><span>${k}</span><b class="${ok === true ? "okc" : ok === false ? "noc" : ""}">${v}</b></div>`;
    el.innerHTML = `<p class="eyebrow">Resultados del sector</p>
      <div class="big"><span class="num">${fmt(r.qf, 2)}</span><small>kg/m²</small></div>
      <p class="note">Carga de fuego (A: ${fmt(r.qa, 2)} · B: ${fmt(r.qb, 2)})</p>
      ${fila("Calor total", fmt(r.tot) + " kcal")}
      ${fila("Riesgo", "R" + r.R)}
      ${fila("Resistencia exigida", r.F === "—" ? "no fija" : r.F, r.F === "NP" ? false : (fReq && fEx !== null ? fEx >= fReq : undefined))}
      ${fila("Resistencia existente", s.fExistente || "Sin dato")}
      ${fila("Potencial mínimo", `${r.Anum}A${r.hasB ? "-" + r.Bnum + "B" : ""}`)}
      ${fila("Extintores", `${inst} de ${r.nExt} requeridos`, inst ? inst >= r.nExt : undefined)}
      ${fila("Ocupantes", r.N + " personas")}
      ${fila("Ancho de salida", `${fmt(+s.anchoSalida || 0, 2)} de ${fmt(r.ancho, 2)} m`, +s.anchoSalida ? +s.anchoSalida + 1e-6 >= r.ancho : undefined)}
      ${fila("Salidas", `${+s.nSalidas || 0} de ${r.salidas}`, +s.nSalidas ? +s.nSalidas >= r.salidas : undefined)}
      ${r.inflam1 ? `<p class="callout bad">Hay un inflamable de 1.ª categoría: revisá el riesgo del sector.</p>` : ""}
      ${r.F === "NP" ? `<p class="callout bad">Con este riesgo y ventilación el sector no está permitido (NP).</p>` : ""}`;
  }

  /* ---------- 3. verificación ---------- */
  function vVer() {
    const s = sec(); const ev = evaluar(s);
    const hechos = ev.filter(i => i.estado).length;
    const pend = ev.filter(i => !i.manual && i.sugerido).length;
    return `<div class="lb-head"><h2>Verificación en el lugar</h2><p>Recorré el sector con esta lista. Cada ítem dice qué mirar y en qué norma se apoya. Lo que se puede calcular viene sugerido; confirmalo o cambialo.</p></div>
    ${chipsSectores(false)}
    <div class="lb-prog"><div class="bar"><i style="width:${ev.length ? hechos / ev.length * 100 : 0}%"></i></div><span>${hechos} de ${ev.length} ítems con resultado</span>
      ${pend ? `<button type="button" class="btn" data-act="aceptarSug">Aceptar las ${pend} sugerencias del cálculo</button>` : ""}</div>
    ${CF.GRUPOS.map(g => `<section class="lb-grupo"><h3>${g}</h3>${ev.filter(i => i.g === g).map(i => itemVer(i)).join("")}</section>`).join("")}
    <div class="lb-next"><button class="btn primary" type="button" data-etapa="hal">Seguir con los desvíos</button></div>`;
  }
  function itemVer(i) {
    const st = i.estado;
    const btn = (e, t) => `<button type="button" data-ver="${i.id}:${e}" aria-pressed="${i.manual && st === e}" class="${!i.manual && i.sugerido === e ? "sug" : ""} b-${e}">${t}</button>`;
    return `<article class="vitem ${st ? "st-" + st : ""}" id="v-${i.id}">
      <div class="vhead"><h4>${esc(i.t)}</h4>${tagH(i.est)}</div>
      <p class="vq"><b>Qué verificar:</b> ${esc(i.q)}</p>
      <p class="vbase">${esc(i.base)}</p>
      ${i.detalle ? `<p class="vsug">${i.sugerido ? `<span class="pill ${i.sugerido === "C" ? "ok" : i.sugerido === "NC" ? "no" : "na"}">Sugerido: ${ESTADO[i.sugerido]}</span>` : `<span class="pill ad">Dato</span>`} ${esc(i.detalle)}</p>` : ""}
      <div class="vrow"><div class="seg" role="group" aria-label="Resultado">${btn("C", "Cumple")}${btn("NC", "No cumple")}${btn("NA", "No aplica")}</div>
        <label class="btn ghost small">${i.foto ? "Cambiar foto" : "Foto"}<input type="file" accept="image/*" data-up="ver:${i.id}" hidden></label></div>
      ${(st === "NC" || i.obs) ? `<label class="field" for="o-${i.id}">Observación${st === "NC" ? " (qué encontraste)" : ""}<textarea id="o-${i.id}" data-vo="${i.id}" rows="2">${esc(i.obs)}</textarea></label>`
        : `<button type="button" class="link" data-act="obs" data-id="${i.id}">Agregar observación</button>`}
      ${i.foto ? `<figure class="vfoto"><img src="${i.foto.data}" alt="Foto de ${esc(i.t)}"><button type="button" class="link" data-act="delVFoto" data-id="${i.id}">Quitar foto</button></figure>` : ""}
    </article>`;
  }

  /* ---------- 4. desvíos ---------- */
  function vHal() {
    const lista = [];
    L.sectores.forEach((s, k) => evaluar(s).filter(i => i.estado === "NC").forEach(i => lista.push({ s, k, i })));
    return `<div class="lb-head"><h2>Desvíos y medidas correctivas</h2><p>Cada ítem marcado como «No cumple» abre un desvío. Revisá la medida propuesta y asigná responsable, plazo y prioridad.</p></div>
    ${lista.length ? lista.map(({ s, k, i }, n) => `<article class="hcard pri-${i.prioridad}">
      <div class="hhead"><span class="hnum">${n + 1}</span><div><h4>${esc(i.t)}</h4><p class="note">Sector «${esc(s.nombre)}» · ${esc(i.base)}</p></div></div>
      ${i.obs ? `<p class="hobs">${esc(i.obs)}</p>` : ""}${i.detalle ? `<p class="note">${esc(i.detalle)}</p>` : ""}
      ${i.foto ? `<img class="hfoto" src="${i.foto.data}" alt="Evidencia del desvío">` : ""}
      <div class="fgrid">
        <label class="field span2" for="hm-${k}-${i.id}">Medida correctiva<textarea id="hm-${k}-${i.id}" rows="2" data-h="${k}:${i.id}:medida">${esc(i.medida)}</textarea></label>
        <label class="field" for="hr-${k}-${i.id}">Responsable<input id="hr-${k}-${i.id}" data-h="${k}:${i.id}:responsable" value="${esc(i.responsable)}" placeholder="Cargo o nombre"></label>
        <label class="field" for="hp-${k}-${i.id}">Plazo<input id="hp-${k}-${i.id}" type="date" data-h="${k}:${i.id}:plazo" value="${esc(i.plazo)}"></label>
        <label class="field" for="hq-${k}-${i.id}">Prioridad<select id="hq-${k}-${i.id}" data-h="${k}:${i.id}:prioridad">${["Alta", "Media", "Baja"].map(p => `<option ${p === i.prioridad ? "selected" : ""}>${p}</option>`).join("")}</select></label>
      </div></article>`).join("")
      : `<div class="empty"><p><b>No hay desvíos todavía.</b></p><p class="note">Aparecen acá cuando marcás un ítem como «No cumple» en la verificación.</p></div>`}
    <div class="lb-next"><button class="btn primary" type="button" data-etapa="inf">Ir al informe</button></div>`;
  }

  /* ---------- 5. informe ---------- */
  function faltantes() {
    const f = [];
    const E = L.est;
    [["empresa", "Razón social"], ["cuit", "CUIT"], ["domicilio", "Domicilio"], ["profesional", "Nombre del profesional"], ["matricula", "Matrícula del profesional"]]
      .forEach(([k, t]) => { if (!(E[k] || "").trim()) f.push({ t: t + " sin completar", e: "est" }); });
    L.sectores.forEach((s, k) => {
      const ev = evaluar(s);
      const sv = ev.filter(i => !i.estado).length; if (sv) f.push({ t: `«${s.nombre}»: ${sv} ítem(s) sin verificar (saldrán como S/V)`, e: "ver", k });
      const sinObs = ev.filter(i => i.estado === "NC" && !i.obs).length; if (sinObs) f.push({ t: `«${s.nombre}»: ${sinObs} desvío(s) sin observación`, e: "ver", k });
      const sinResp = ev.filter(i => i.estado === "NC" && (!i.responsable || !i.plazo)).length; if (sinResp) f.push({ t: `«${s.nombre}»: ${sinResp} desvío(s) sin responsable o plazo`, e: "hal", k });
      if (!(s.materiales || []).length) f.push({ t: `«${s.nombre}»: sin materiales relevados`, e: "sec", k });
    });
    return f;
  }
  function vInf() {
    const f = faltantes();
    const filas = L.sectores.map(s => { const r = calc(s); const ev = evaluar(s); const nc = ev.filter(i => i.estado === "NC").length;
      return `<tr><td>${esc(s.nombre)}</td><td class="r num">${fmt(r.S)}</td><td class="r num">${fmt(r.qf, 2)}</td><td>R${r.R}</td><td>${r.F}</td><td>${r.Anum}A${r.hasB ? "-" + r.Bnum + "B" : ""}</td><td class="r num">${nc}</td></tr>`; }).join("");
    return `<div class="lb-head"><h2>Informe formal en Word</h2><p>El informe sale con carátula, objeto, alcance, marco normativo, cálculo por sector, verificación, desvíos, conclusiones, firma y anexo de fotos.</p></div>
    <div class="tablebox"><table class="lb-tab"><thead><tr><th>Sector</th><th class="r">m²</th><th class="r">Qf kg/m²</th><th>Riesgo</th><th>F exigida</th><th>Potencial</th><th class="r">Desvíos</th></tr></thead><tbody>${filas}</tbody></table></div>
    <section class="lb-card"><h3>Antes de exportar</h3>
      ${f.length ? `<ul class="falt">${f.map(x => `<li><button type="button" class="link" data-etapa="${x.e}" ${x.k !== undefined ? `data-sec="${x.k}"` : ""}>${esc(x.t)}</button></li>`).join("")}</ul>
        <p class="note">Podés exportar igual: lo que falta sale como «[completar]» o «S/V».</p>` : `<p class="callout ok">Está todo completo.</p>`}
    </section>
    <section class="lb-card"><h3>Conclusiones</h3>
      <label class="field" for="f-concl">Texto de las conclusiones (si lo dejás vacío, se arma solo con los resultados)
        <textarea id="f-concl" data-f="conclusiones" rows="5">${esc(L.conclusiones)}</textarea></label>
    </section>
    <div class="lb-export">
      <button type="button" class="btn primary big" data-act="word">Exportar informe en Word (.docx)</button>
      <button type="button" class="btn" data-act="json">Guardar respaldo (.json)</button>
      <label class="btn">Cargar respaldo<input type="file" accept="application/json,.json" data-up="json" hidden></label>
      <span class="note" id="lb-msg" aria-live="polite"></span>
    </div>`;
  }

  /* ---------- fotos ---------- */
  function leerFoto(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res({ data: c.toDataURL("image/jpeg", 0.72), w: c.width, h: c.height, cap: "" }); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("No se pudo leer la imagen")); };
      img.src = url;
    });
  }

  /* ---------- descargas ---------- */
  let dlP = null;
  async function descargar(nombre, data) {
    const msg = $("#lb-msg");
    try {
      dlP = dlP || (window.claude && window.claude.use ? window.claude.use("downloads") : Promise.resolve(null));
      const dl = await dlP;
      if (!dl) { msg.textContent = "La descarga no está disponible en esta vista. Abrí la app desde claude.ai."; return; }
      await dl.save({ filename: nombre, data });
      msg.textContent = "Listo: " + nombre;
    } catch (e) {
      msg.textContent = e && e.code === "declined" ? "Descarga cancelada." : "No se pudo descargar (" + (e && (e.message || e.code) || "error") + ").";
    }
  }
  function cargarScript(src) {
    return new Promise((res, rej) => { if (window.docx) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar " + src)); document.head.appendChild(s); });
  }
  async function exportarWord() {
    const msg = $("#lb-msg"); msg.textContent = "Armando el informe…";
    try {
      // docx/JSZip programan tareas con setImmediate; con este respaldo no dependen de postMessage
      if (!window.setImmediate) window.setImmediate = (f, ...a) => setTimeout(() => f(...a), 0);
      await cargarScript("docx.js");
      const out = window.CFInforme.build(window.docx, L);
      const P = window.docx.Packer;
      const datos = P.toArrayBuffer ? await P.toArrayBuffer(out.doc) : await P.toBlob(out.doc);
      const nombre = `Estudio carga de fuego ${(L.est.establecimiento || "establecimiento").replace(/[\\/:*?"<>|]/g, "")} ${L.est.nInforme || ""}`.trim() + ".docx";
      await descargar(nombre, datos);
    } catch (e) { msg.textContent = "No se pudo armar el informe: " + e.message; }
  }

  /* ---------- eventos ---------- */
  function setPath(path, v) {
    const p = path.split(".");
    if (p[0] === "est") L.est[p[1]] = v;
    else if (p[0] === "s") { const s = L.sectores[+p[1]]; s[p[2]] = ["superficie", "uso", "riesgo", "anchoSalida", "nSalidas", "distExt", "distSalida"].includes(p[2]) ? (v === "" ? "" : +v) : v; }
    else L[p[0]] = v;
  }
  function verifObj(id) { const s = sec(); s.verif = s.verif || {}; return (s.verif[id] = s.verif[id] || {}); }

  function enInput(e) {
    const t = e.target;
    if (t.dataset.f) {
      setPath(t.dataset.f, t.type === "checkbox" ? t.checked : t.value);
      guardar();
      if (t.dataset.f.endsWith(".nombre")) { const c = $(`.lb-chips [data-sec="${secIdx}"]`); if (c) c.textContent = t.value || "Sector"; }
      if (etapa === "sec") pintarResultados();
      return;
    }
    if (t.dataset.m) { const [j, k] = t.dataset.m.split(":"); const m = sec().materiales[+j]; m[k] = ["q", "dens", "pci"].includes(k) ? (t.value === "" ? "" : +t.value) : t.value;
      guardar(); if (k === "u" || k === "c") render(); else pintarResultados(); return; }
    if (t.dataset.x) { const [j, k] = t.dataset.x.split(":"); const x = sec().extintores[+j]; x[k] = ["kg", "ra", "rb"].includes(k) ? (t.value === "" ? "" : +t.value) : t.value; guardar(); pintarResultados(); return; }
    if (t.dataset.vo) { verifObj(t.dataset.vo).obs = t.value; guardar(); return; }
    if (t.dataset.h) { const [k, id, campo] = t.dataset.h.split(":"); const s = L.sectores[+k]; s.verif = s.verif || {}; (s.verif[id] = s.verif[id] || {})[campo] = t.value; guardar(); return; }
    if (t.dataset.foto !== undefined) { sec().fotos[+t.dataset.foto].cap = t.value; guardar(); return; }
  }
  async function enArchivo(e) {
    const t = e.target; if (!t.dataset.up || !t.files || !t.files[0]) return;
    const file = t.files[0];
    try {
      if (t.dataset.up === "json") {
        const d = JSON.parse(await file.text()); if (!d || !Array.isArray(d.sectores)) throw new Error("el archivo no es un respaldo del libro");
        L = d; secIdx = 0; guardar(); render(); $("#lb-msg").textContent = "Respaldo cargado."; return;
      }
      const f = await leerFoto(file);
      if (t.dataset.up === "sector") { const s = sec(); (s.fotos = s.fotos || []).push(f); }
      else if (t.dataset.up.startsWith("ver:")) verifObj(t.dataset.up.slice(4)).foto = f;
      guardar(); render();
    } catch (err) { const m = $("#lb-msg"); if (m) m.textContent = err.message; else alertaEn(err.message); }
  }
  function alertaEn(t) { avisoGuardado = t; const el = $("#lb-guardado"); if (el) el.textContent = t; }

  function enClick(e) {
    const b = e.target.closest("button, [data-etapa]"); if (!b) return;
    if (b.dataset.etapa) { etapa = b.dataset.etapa; if (b.dataset.sec !== undefined) secIdx = +b.dataset.sec; render(); const tl = $("#tab-libro"); if (tl && tl.scrollIntoView) tl.scrollIntoView({ block: "start" }); return; }
    if (b.dataset.sec !== undefined) { secIdx = +b.dataset.sec; render(); return; }
    if (b.dataset.ver) { const [id, est] = b.dataset.ver.split(":"); const v = verifObj(id); v.e = (v.e === est) ? undefined : est; guardar(); render();
      const el = document.getElementById("v-" + id); if (el && est === "NC") { const ta = el.querySelector("textarea"); if (ta) ta.focus(); } return; }
    const act = b.dataset.act; if (!act) return;
    const s = sec();
    if (act === "addSec") { L.sectores.push({ id: "s" + Date.now(), nombre: "Sector " + (L.sectores.length + 1), superficie: 100, uso: 16, ventilacion: "nat", riesgo: 3, r2B: true, fExistente: "Sin dato", construccion: "", materiales: [], extintores: [], anchoSalida: "", nSalidas: "", distExt: "", distSalida: "", verif: {}, fotos: [] }); secIdx = L.sectores.length - 1; }
    else if (act === "delSec") { L.sectores.splice(secIdx, 1); secIdx = 0; }
    else if (act === "addMat") { const id = $("#lb-addmat").value; const m = CF.LIB[id]; s.materiales.push({ lib: id, nombre: m.n, c: m.c, u: m.u, dens: m.dens, q: 0, pci: m.pci, fuente: m.src, inflam: m.inflam }); }
    else if (act === "delMat") s.materiales.splice(+b.dataset.j, 1);
    else if (act === "addExt") s.extintores.push({ cod: "E" + (s.extintores.length + 1), agente: "PQS ABC", kg: 5, ra: "", rb: "", ubic: "", vc: "", ph: "" });
    else if (act === "delExt") s.extintores.splice(+b.dataset.j, 1);
    else if (act === "delFoto") s.fotos.splice(+b.dataset.j, 1);
    else if (act === "delVFoto") delete verifObj(b.dataset.id).foto;
    else if (act === "obs") { verifObj(b.dataset.id).obs = " "; render(); const ta = document.getElementById("o-" + b.dataset.id); if (ta) { ta.value = ""; ta.focus(); } verifObj(b.dataset.id).obs = ""; return; }
    else if (act === "aceptarSug") { const r = calc(s); CF.evaluar(s, r, L.est.fechaRelev).forEach(i => { if (!i.manual && i.sugerido) verifObj(i.id).e = i.sugerido; }); }
    else if (act === "word") { exportarWord(); return; }
    else if (act === "json") { descargar(`Respaldo libro carga de fuego ${L.est.nInforme || ""}`.trim() + ".json", JSON.stringify(L, null, 1)); return; }
    else if (act === "ejemplo") { L = CF.ejemplo(); secIdx = 0; etapa = "est"; $("#lb-confirm").hidden = true; }
    else if (act === "nuevo") { $("#lb-confirm").hidden = false; return; }
    else if (act === "cancelNuevo") { $("#lb-confirm").hidden = true; return; }
    else if (act === "okNuevo") {
      const v = CF.ejemplo(); v.est = Object.fromEntries(Object.keys(v.est).map(k => [k, ""])); v.est.fechaRelev = v.est.fechaInforme = new Date().toISOString().slice(0, 10);
      v.est.titulo = "Técnico/a Superior en Seguridad e Higiene";
      v.sectores = [{ id: "s1", nombre: "Sector 1", superficie: "", uso: 16, ventilacion: "nat", riesgo: 3, r2B: true, fExistente: "Sin dato", construccion: "", materiales: [], extintores: [], anchoSalida: "", nSalidas: "", distExt: "", distSalida: "", verif: {}, fotos: [] }];
      L = v; secIdx = 0; etapa = "est"; $("#lb-confirm").hidden = true;
    }
    guardar(); render();
  }

  function init() {
    const root = $("#tab-libro"); if (!root) return;
    root.addEventListener("input", enInput);
    root.addEventListener("change", e => { if (e.target.type === "file") enArchivo(e); else if (e.target.tagName === "SELECT" || e.target.type === "date" || e.target.type === "checkbox") enInput(e); });
    root.addEventListener("click", enClick);
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
