/* Pestañas MASE, Equipo de pulling y Comparativa: tablero de sectores, gráficos animados,
   calculadora paso a paso con las fórmulas de las planillas y auditoría de las hojas. */
(function(){
"use strict";
const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (x,d=0)=>Number(x||0).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});
const fm = (x)=> x>=100? fmt(x,0) : x>=10? fmt(x,1) : fmt(x,2);
const esc = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $ = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> [...(r||document).querySelectorAll(s)];
const clone = o=>JSON.parse(JSON.stringify(o));

const DATA = {mase:clone(PL.DATOS.mase), pull:clone(PL.DATOS.pull)};
const ST = {
  mase:{sel:1,fix:false,vent:"nat",r2:true,plano:"lay",ready:false},
  pull:{sel:1,fix:false,vent:"nat",r2:true,plano:"lay",ready:false}
};
const PLANOS = [["lay","Layout"],["pel","Áreas de peligro"],["ext","Distribución de extintores"],["loc","Locación TKR-10"]];
const BAND = ["hasta 15","16 a 30","31 a 60","61 a 100","más de 100"];
const opt = k=>({vent:ST[k].vent,r2:ST[k].r2,fix:ST[k].fix});

/* ---------- utilidades de movimiento ---------- */
function countUp(el, to, dec, dur){
  if(RM || !isFinite(to)){ el.textContent = fmt(to,dec); return; }
  const t0 = performance.now(); dur = dur||900;
  (function tick(t){
    const p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
    el.textContent = fmt(to*e,dec);
    if(p<1) requestAnimationFrame(tick); else el.textContent = fmt(to,dec);
  })(t0);
}
function counters(root, anim){
  $$("[data-count]",root).forEach(el=>{
    const to = +el.dataset.count, d = +(el.dataset.dec||0);
    if(anim) countUp(el,to,d); else el.textContent = fmt(to,d);
  });
}
function paint(el, html, anim){
  el.classList.toggle("pl-on", !anim);
  el.innerHTML = html;
  if(anim){ el.classList.remove("pl-on"); void el.offsetWidth; requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("pl-on"))); }
  counters(el, anim);
}

/* ---------- escala logarítmica de los gráficos ---------- */
const LMIN = 0, LMAX = Math.log10(6000);
const lx = (v,x0,w)=> x0 + (Math.log10(Math.max(v,1))-LMIN)/(LMAX-LMIN)*w;
const bandOf = q => PL.idx(q);

/* ---------- gráfico 1: Qf por sector ---------- */
function chartQf(P){
  const rows = P.filas, rh = 36, top = 34, left = 156, W = 700, pw = 490, H = top + rows.length*rh + 34;
  const x = v=>lx(v,left,pw);
  const cuts = [1,15,30,60,100,6000];
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carga de fuego por sector en escala logarítmica con los tramos del Anexo VII">`;
  for(let i=0;i<5;i++){
    const a=x(cuts[i]), b=x(cuts[i+1]);
    s+=`<rect x="${a}" y="${top-6}" width="${b-a}" height="${rows.length*rh+6}" style="fill:var(--h${i})" opacity=".16"/>`;
  }
  [15,30,60,100].forEach(v=>{ s+=`<line x1="${x(v)}" x2="${x(v)}" y1="${top-6}" y2="${top+rows.length*rh}" style="stroke:var(--muted)" stroke-width=".7" stroke-dasharray="3 3"/><text x="${x(v)}" y="${top-12}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${v}</text>`; });
  [1,10,100,1000].forEach(v=>{ s+=`<text x="${x(v)}" y="${top+rows.length*rh+18}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${fmt(v)}</text>`; });
  s+=`<text x="${left+pw}" y="${top+rows.length*rh+32}" text-anchor="end" font-size="11" style="fill:var(--muted)">Qf en kg/m² de madera, escala logarítmica</text>`;
  rows.forEach(({s:sec,r},i)=>{
    const y = top + i*rh + 7;
    s+=`<text x="${left-10}" y="${y+10}" text-anchor="end" font-size="12.5" style="fill:var(--ink)">${esc(sec.n)}${sec.nsec>1?` ×${sec.nsec}`:""}</text>`;
    if(r.vacio){ s+=`<text x="${left+6}" y="${y+10}" font-size="11.5" font-style="italic" style="fill:var(--muted)">no determinado · bomberos de la operadora</text>`; return; }
    const w = Math.max(3, x(r.Qf)-left);
    const tip = `${sec.n}: Qf ${fm(r.Qf)} kg/m² · tramo ${BAND[r.iT]} · ${r.clasif}`;
    s+=`<rect class="pl-grow" style="--d:${i};fill:var(--h${r.iT})" x="${left}" y="${y}" width="${w}" height="16" rx="3" data-tip="${esc(tip)}"/>`;
    s+=`<text class="pl-fade" style="--d:${i+6};fill:var(--ink)" x="${left+w+7}" y="${y+12}" font-size="12" font-family="IBM Plex Mono, monospace">${fm(r.Qf)}</text>`;
  });
  return s+`</svg>`;
}

/* ---------- gráfico 2: aporte de calor por tipo de combustible ---------- */
function chartMix(P){
  const rows = P.filas.filter(f=>!f.r.vacio), rh = 30, left = 156, pw = 500, W = 700, H = rows.length*rh+8;
  const used = new Set();
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Aporte de calor por tipo de combustible en cada sector">`;
  rows.forEach(({s:sec,r},i)=>{
    const y = 4+i*rh; let acc = 0; const bycat = {};
    r.mats.forEach(m=>{ bycat[m.cat] = (bycat[m.cat]||0)+m.Q; });
    s+=`<text x="${left-10}" y="${y+15}" text-anchor="end" font-size="12.5" style="fill:var(--ink)">${esc(sec.n)}</text>`;
    Object.keys(PL.CATS).forEach(c=>{
      const q = bycat[c]||0; if(q<=0) return; used.add(c);
      const w = q/r.Qm*pw; if(w<1.5) return; const tip = `${sec.n} · ${PL.CATS[c].n}: ${fmt(q/r.Qm*100,1)} % del calor (${fmt(q)} kcal)`;
      s+=`<rect class="pl-grow" style="--d:${i};fill:var(${PL.CATS[c].c})" x="${left+acc}" y="${y+3}" width="${Math.max(w-2,1)}" height="18" rx="2" data-tip="${esc(tip)}"/>`;
      acc += w;
    });
  });
  s+=`</svg>`;
  const leg = Object.keys(PL.CATS).filter(c=>used.has(c)).map(c=>`<span><i class="sw" style="background:var(${PL.CATS[c].c})"></i>${PL.CATS[c].n}</span>`).join("");
  return `<div class="legend pl-leg">${leg}</div>`+s;
}

/* ---------- gráfico 3: extintores requeridos e instalados ---------- */
function chartExt(P){
  const rows = P.filas, rh = 32, left = 156, pw = 430, W = 700, H = rows.length*rh+30;
  const mx = Math.max(2, ...rows.map(f=>Math.max(f.r.nReq, f.r.inst?f.r.inst.tot:0)))+0.5;
  const x = v=>left + v/mx*pw;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Extintores requeridos e instalados por sector">`;
  for(let v=0; v<=Math.floor(mx); v+= mx>8?2:1){ s+=`<line x1="${x(v)}" x2="${x(v)}" y1="0" y2="${rows.length*rh}" style="stroke:var(--line)" stroke-width="1"/><text x="${x(v)}" y="${rows.length*rh+16}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${v}</text>`; }
  rows.forEach(({s:sec,r},i)=>{
    const y = i*rh+6, ins = r.inst ? r.inst.tot : 0;
    s+=`<text x="${left-10}" y="${y+14}" text-anchor="end" font-size="12.5" style="fill:var(--ink)">${esc(sec.n)}</text>`;
    const col = r.cumple==="no"||r.cumple==="sin" ? "var(--red)" : "var(--green)";
    if(ins>0) s+=`<rect class="pl-grow" style="--d:${i};fill:${col}" x="${left}" y="${y+3}" width="${x(ins)-left}" height="12" rx="3" data-tip="${esc(sec.n+": instalados "+fmt(ins,ins%1?1:0)+" · requeridos "+r.nReq)}"/>`;
    s+=`<line x1="${x(r.nReq)}" x2="${x(r.nReq)}" y1="${y-1}" y2="${y+19}" style="stroke:var(--ink)" stroke-width="2.5"/>`;
    const ic = r.cumple==="ok"||r.cumple==="espuma" ? "cumple" : r.cumple==="sin" ? "sin equipo" : "no cumple";
    s+=`<text x="${left+pw+22}" y="${y+14}" font-size="11.5" font-family="IBM Plex Mono, monospace" style="fill:${col}">${ic}</text>`;
  });
  return s+`</svg>`;
}

/* ---------- tablero de sectores ---------- */
function tablero(k,P){
  return P.filas.map(({s,r},i)=>{
    const pill = r.vacio?`<span class="pill na">bomberos operadora</span>`: r.cumple==="ok"?`<span class="pill ok">cumple</span>`: r.cumple==="espuma"?`<span class="pill ok">espuma</span>`: r.cumple==="sin"?`<span class="pill ad">sin equipo</span>`:`<span class="pill no">no cumple</span>`;
    const ph = s.foto ? `<img src="img/${s.foto}.webp" alt="" loading="lazy">` : `<span class="pl-ph" aria-hidden="true">${esc(s.n.slice(0,1))}</span>`;
    return `<button type="button" class="pl-tile${i===ST[k].sel?" on":""}" data-act="sel" data-i="${i}" style="--d:${i};--hb:var(--h${r.vacio?0:r.iT})">
      <span class="pl-ph-w">${ph}</span>
      <span class="pl-tn">${esc(s.n)}${s.nsec>1?`<b class="pl-x">×${s.nsec}</b>`:""}</span>
      <span class="pl-tq num">${r.vacio?"—":`<span data-count="${r.Qf}" data-dec="${r.Qf>=100?0:1}">${fm(r.Qf)}</span>`}<small>kg/m²</small></span>
      <span class="pl-tm"><i style="width:${r.vacio?0:Math.min(100,Math.log10(Math.max(r.Qf,1))/LMAX*100)}%"></i></span>
      <span class="pl-tf"><span class="mono">${r.F}</span>${pill}</span>
    </button>`;
  }).join("");
}

/* ---------- KPIs ---------- */
function kpis(k,P){
  const h = PL.hallazgos(DATA[k]), alta = h.filter(x=>x.sev==="alta").length;
  const t = (lab,val,dec,unit,sub,hot)=>`<div class="pl-k${hot?" hot":""}"><span class="pl-kl">${lab}</span><span class="pl-kv num"><span data-count="${val}" data-dec="${dec}">${fmt(val,dec)}</span><small>${unit}</small></span><span class="pl-ks">${sub}</span></div>`;
  return [
    t("Sectores",P.sectores,0,"tipos",`${P.sectoresTot} sectores de incendio · ${fmt(P.m2)} m²`),
    t("Calor total",P.kcal/1e9,2,"Gcal",`${fmt(P.kg)} kg de combustible`),
    t("Qf máxima",P.max?P.max.r.Qf:0,0,"kg/m²",P.max?esc(P.max.s.n):"—",true),
    t("Extintores",P.inst,P.inst%1?1:0,`de ${P.req}`,`${P.sinCumplir} sector(es) sin cumplir`),
    t("Personas",P.personas,0,"a evacuar","según factor de ocupación"),
    t("Hallazgos",alta,0,"altos",`${h.length} observaciones en la planilla`)
  ].join("");
}

/* ---------- detalle del sector: editor ---------- */
function editor(k){
  const s = DATA[k].sectores[ST[k].sel], r = PL.calc(s,opt(k));
  const usos = PL.USOS.map(([v,t])=>`<option value="${v}"${v===s.uso?" selected":""}>${t} · ${v} m²/pers.</option>`).join("");
  const rs = [[1,"1 Explosivo"],[2,"2 Inflamable"],[3,"3 Muy combustible"],[4,"4 Combustible"],[5,"5 Poco combustible"],[6,"6 Incombustible"],[7,"7 Refractario"]].map(([v,t])=>`<option value="${v}"${v===s.R?" selected":""}>${t}</option>`).join("");
  const rowsH = r.mats.map((m,i)=>`<tr data-m="${i}">
    <td>${esc(m.n)}</td>
    <td><select data-f="c" aria-label="Clase de ${esc(m.n)}"><option${m.c==="A"?" selected":""}>A</option><option${m.c==="B"?" selected":""}>B</option></select></td>
    <td class="r"><input type="number" min="0" step="any" data-f="kg" value="${s.mats[i].kg}" aria-label="Peso de ${esc(m.n)} en kg"></td>
    <td class="r"><input type="number" min="0" step="any" data-f="pci" value="${s.mats[i].pci}" aria-label="Poder calorífico de ${esc(m.n)}"></td>
    <td class="r num q">${fmt(m.Q)}</td>
    <td><button type="button" class="del" data-act="delmat" data-m="${i}" aria-label="Quitar ${esc(m.n)}">×</button></td></tr>`).join("");
  const add = PL.CAT.map(c=>`<option value="${c.id}">${c.n} · ${fmt(c.pci)} kcal/kg</option>`).join("");
  return `<div class="lb-card pl-ed">
    <div class="fgrid">
      <label class="field span2">Nombre del sector<input type="text" id="${k}-nom" data-sf="n" value="${esc(s.n)}"></label>
      <label class="field">Superficie S (m²)<input type="number" id="${k}-sup" min="0.1" step="any" data-sf="sup" value="${s.sup}"></label>
      <label class="field">Sectores de incendio iguales<input type="number" id="${k}-nsec" min="1" step="1" data-sf="nsec" value="${s.nsec}"></label>
      <label class="field">Riesgo<select id="${k}-r" data-sf="R">${rs}</select></label>
      <label class="field">Uso (factor de ocupación)<select id="${k}-uso" data-sf="uso">${usos}</select></label>
    </div>
    <div class="tablebox"><table class="pl-mat"><thead><tr><th>Material</th><th>Clase</th><th class="r">Peso (kg)</th><th class="r">PCI (kcal/kg)</th><th class="r">Q (kcal)</th><th></th></tr></thead><tbody>${rowsH}</tbody>
      <tfoot><tr><td colspan="2">Totales</td><td class="r num" id="${k}-ptot">${fmt(r.Ptot)}</td><td></td><td class="r num" id="${k}-qtot">${fmt(r.Qm)}</td><td></td></tr></tfoot></table></div>
    <div class="inline"><label class="field">Agregar material<select id="${k}-addm">${add}</select></label><button type="button" class="btn" data-act="addmat">Agregar</button>
      <button type="button" class="btn ghost" data-act="addsec">Sector nuevo en blanco</button>
      ${DATA[k].sectores.length>1?`<button type="button" class="btn ghost danger" data-act="delsec">Quitar este sector</button>`:""}</div>
    <div class="note">Los valores de la planilla están precargados. Todo lo que cambies recalcula los gráficos y el resumen.</div></div>`;
}

/* ---------- detalle del sector: cálculo paso a paso ---------- */
function steps(k,r,s){
  const q = r.Qf;
  const nx = (v,d)=>`<span data-count="${v}" data-dec="${d}">${fmt(v,d)}</span>`;
  const L = [
    {t:"Calor total del sector",cell:"F19 = Σ(E×D)",f:`Qm = Σ P × K = ${fmt(r.mats.filter(m=>m.kg>0).length)} materiales`,v:nx(r.Qm,0),u:"kcal"},
    {t:"Peso equivalente en madera",cell:"D22 = F19 / C7",f:`Pem = ${fmt(r.Qm)} / ${fmt(PL.PCAL_MADERA)} kcal/kg`,v:nx(r.Pem,1),u:"kg"},
    {t:"Carga de fuego",cell:"D25 = D22 / C8",f:`Qf = ${fmt(r.Pem,1)} kg / ${fmt(r.sup,1)} m²`,v:nx(q,q>=100?0:2),u:"kg/m²",hot:true,
      x:`<div class="scale pl-scale"><div class="pin" style="left:${scalePos(q)}%"><b>${fm(q)} kg/m²</b><i></i></div><div class="bands">${BAND.map((b,i)=>`<div class="${i===r.iT&&!r.vacio?"on":""}">${b}</div>`).join("")}</div></div>`},
    {t:"Qf por la cantidad de sectores",cell:"D28 = D25 × F9",f:`${fm(q)} × ${r.nsec} sector(es)`,v:nx(r.QfT,r.QfT>=100?0:2),u:"kg/m²",warn:r.nsec>1?"Así lo calcula la planilla. No es una carga de fuego normativa: se calcula por sector.":""},
    {t:"Clasificación básica",cell:"F25:G27",f:`Qf < 60 leve · 60 a 120 común · > 120 mayor`,v:`<span class="mono">${r.clasif}</span>`,u:""},
    {t:"Resistencia al fuego exigida",cell:ST[k].vent==="nat"?"Anexo VII · Cuadro 2.2.1":"Anexo VII · Cuadro 2.2.2",f:`Riesgo ${r.R} · tramo ${BAND[r.iT]} kg/m²`,v:`<span class="mono">${r.F}</span>`,u:r.Fnote?"":"min"},
    {t:"Potencial extintor mínimo",cell:"Anexo VII · Tablas 1 y 2",f:`A: ${r.A||"sin columna"} · B: ${r.hasB?(r.B||"sin columna"):"sin líquidos"} · mínimo 1A 5BC`,v:`<span class="mono">${r.Areq}A${r.hasB?" "+r.Breq+"B":""}</span>`,u:""},
    {t:"Cantidad de extintores",cell:"D56 = C56 / C57",f:`${fmt(r.sup,1)} m² / ${PL.M2_EXT} = ${fmt(r.sup/PL.M2_EXT,2)} → ${r.nPorSector} por sector × ${r.nsec}`,v:nx(r.nReq,0),u:"equipos"},
    {t:"Personas y medios de salida",cell:"G72 · G74 · D72",f:`N = ${fmt(r.sup,1)} / ${r.uso} = ${fmt(r.Nper,2)} pers. · con 20 % libre ${fmt(r.Nlibre,2)} · n = N/100 = ${fmt(r.uas,3)} uas`,v:nx(r.Nper,2),u:"personas",
      x:`<span class="note">${r.viaUnica?"n menor a 3 u.a.s.: basta una sola vía de escape.":"Más de 3 unidades de salida: verificar cantidad de vías."}</span>`}
  ];
  return L.map((p,i)=>`<li class="pl-step${p.hot?" hot":""}" style="--i:${i}"><span class="pl-sn">${i+1}</span>
    <div class="pl-sb"><div class="pl-sh"><h4>${p.t}</h4><code>${p.cell}</code></div><div class="formula">${p.f}</div>
    ${p.x||""}${p.warn?`<div class="callout">${p.warn}</div>`:""}</div><div class="pl-sv"><span class="num">${p.v}</span><small>${p.u}</small></div></li>`).join("");
}
function scalePos(q){ return q<=15? q/15*12.5 : q<=30? 12.5+(q-15)/15*12.5 : q<=60? 25+(q-30)/30*25 : q<=100? 50+(q-60)/40*33.3 : Math.min(83.3+(q-100)/900*16.7, 97); }

function donut(r){
  const by = {}; r.mats.forEach(m=>{ by[m.cat]=(by[m.cat]||0)+m.Q; });
  const C = 2*Math.PI*40; let off = 0, segs = "", leg = "";
  Object.keys(PL.CATS).forEach(c=>{
    const q = by[c]||0; if(q<=0 || r.Qm<=0) return; const len = q/r.Qm*C;
    segs += `<circle class="pl-seg" cx="60" cy="60" r="40" fill="none" style="stroke:var(${PL.CATS[c].c});--len:${Math.max(len-2,0.5)};--off:${-off}" stroke-width="16" stroke-dasharray="0 ${C}" stroke-dashoffset="${-off}" data-tip="${esc(PL.CATS[c].n+": "+fmt(q/r.Qm*100,1)+" %")}"/>`;
    leg += `<li><i class="sw" style="background:var(${PL.CATS[c].c})"></i><span>${PL.CATS[c].n}</span><b class="num">${fmt(q/r.Qm*100,1)} %</b></li>`;
    off += len;
  });
  return `<div class="pl-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Aporte de calor por tipo de combustible"><circle cx="60" cy="60" r="40" fill="none" style="stroke:var(--chip)" stroke-width="16"/><g transform="rotate(-90 60 60)">${segs}</g>
    <text x="60" y="58" text-anchor="middle" font-size="15" font-weight="700" font-family="Barlow Condensed, sans-serif" style="fill:var(--ink)">${r.vacio?"—":fm(r.Qf)}</text><text x="60" y="72" text-anchor="middle" font-size="7.5" style="fill:var(--muted)">kg/m²</text></svg>
    <ul class="pl-dl">${leg||"<li class='note'>Sin cantidades cargadas.</li>"}</ul></div>`;
}

function tablasPot(k,r,s){
  const gt = (cap,cols,data,colKey,rowIdx)=>`<table class="grid-tab"><caption class="eyebrow" style="text-align:left;padding:8px 9px">${cap}</caption><thead><tr><th>Qf (kg/m²)</th>${cols.map(c=>`<th>Riesgo ${c}</th>`).join("")}</tr></thead><tbody>${PL.RANGOS.map((rg,i)=>`<tr><td class="${i===rowIdx?"row":""}">${rg}</td>${cols.map(c=>`<td class="${c===colKey&&i===rowIdx&&!r.vacio?"hit":i===rowIdx&&!r.vacio?"row":""}">${data[c][i]}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const rc = r.rec;
  const rec = rc.nd ? `<div class="callout">${esc(rc.motivo)}</div>` : `<div class="pl-rec"><div class="pl-recT"><span class="pill ok">a colocar</span><b>${rc.pool?esc(rc.agente):`${rc.cant} × ${esc(rc.agente)}`}</b></div>
    <ul class="checks pl-chk"><li><span>Clases de fuego</span><span></span><b class="num">${esc(rc.clases)}</b></li>
    <li><span>Potencial mínimo exigido (Tablas 1 y 2 + mínimo 1A/5B)</span><span></span><b class="num">${rc.pool?"a determinar (pto 4.2)":rc.Areq+"A"+(rc.Breq?" "+rc.Breq+"B":"")}</b></li>
    ${rc.item?`<li><span>Potencial del equipo elegido</span><span></span><b class="num">${rc.item.A}A ${rc.item.B}B${rc.item.C?":C":""}</b></li>`:""}
    <li><span>Cantidad: 1 cada 200 m² × ${rc.nsec} sector(es)</span><span></span><b class="num">${rc.nPorSector} × ${rc.nsec} = ${rc.cant}</b></li></ul>
    <p class="note">${esc(rc.motivo)} <i>${esc(rc.fuente||"")}</i></p></div>`;
  const inst = s.inst;
  let ci = "";
  if(inst){
    const nec = inst.nec ? `<li><span>Potencial necesario escrito en la planilla (C66)</span><b class="num">${esc(inst.nec)}</b></li>`:"";
    ci = `<ul class="checks pl-chk">
      <li><span class="pill ${r.cumple==="no"?"no":r.cumple==="sin"?"ad":"ok"}">${r.cumple==="no"?"no cumple":r.cumple==="sin"?"sin dato":"cumple"}</span><span>${esc(inst.marca)} ${esc(inst.cap)} · ${esc(inst.agente)}${inst.pot?" · "+esc(inst.pot):""}</span><span class="num">${inst.cant} × ${s.nsec>1&&inst.tot===inst.cant*s.nsec?s.nsec+" = ":""}${fmt(inst.tot,inst.tot%1?1:0)}</span></li>
      <li><span class="pill ${r.nReq<=inst.tot+1e-9?"ok":"no"}">${r.nReq<=inst.tot+1e-9?"cumple":"faltan"}</span><span>Cantidad requerida por superficie</span><span class="num">${r.nReq} req. / ${fmt(inst.tot,inst.tot%1?1:0)} inst.</span></li>${nec}
      ${r.cumpleDet?`<li><span class="pill ad">detalle</span><span>${esc(r.cumpleDet)}</span><span></span></li>`:""}${inst.nota?`<li><span class="pill ok">nota</span><span>${esc(inst.nota)}</span><span></span></li>`:""}</ul>`;
  } else ci = `<div class="callout bad">La planilla no declara extintores para este sector.</div>`;
  return `<div class="tablebox pl-recbox"><div class="eyebrow" style="padding:8px 9px">Extintor a colocar</div>${rec}</div><div class="tablebox">${gt("Tabla 1 · clase A",[3,4,5],PL.PA,r.R,r.iA)}</div><div class="tablebox">${gt("Tabla 2 · clase B",[2,3],PL.PB,r.colB,r.iB)}</div>${ci}`;
}

function detalle(k, anim){
  const s = DATA[k].sectores[ST[k].sel], r = PL.calc(s,opt(k));
  const chips = DATA[k].sectores.map((x,i)=>`<button type="button" class="chip" role="tab" data-act="sel" data-i="${i}" aria-selected="${i===ST[k].sel}">${esc(x.n)}</button>`).join("");
  $(`#${k}-chips`).innerHTML = chips;
  paint($(`#${k}-steps`), steps(k,r,s), anim);
  paint($(`#${k}-donut`), donut(r), anim);
  $(`#${k}-tablas`).innerHTML = tablasPot(k,r,s);
  const ph = s.foto ? `<img src="img/${s.foto}.webp" alt="${esc(s.n)}" loading="lazy">` + (s.extra||[]).map((e,i)=>`<img class="pl-x" src="img/${e}.webp" alt="${esc(s.n)}: ${i?"acumulador (unidad de cierre)":"BOP"}" loading="lazy">`).join("") : "";
  $(`#${k}-foto`).innerHTML = ph; $(`#${k}-foto`).hidden = !s.foto;
  $(`#${k}-selname`).textContent = s.n;
}

/* ---------- tabla resumen ---------- */
function resumen(k,P){
  const head = ["Sector","S (m²)","×","Riesgo","Qm (kcal)","Pem (kg)","Qf (kg/m²)","Qf × n","Clasif.","F","Pot. mín.","Ext. req.","Ext. inst.","Estado","Personas"];
  const body = P.filas.map(({s,r})=>`<tr><td>${esc(s.n)}</td><td class="r num">${fmt(s.sup,1)}</td><td class="r num">${r.nsec}</td><td class="r num">R${r.R}</td><td class="r num">${fmt(r.Qm)}</td><td class="r num">${fmt(r.Pem,1)}</td><td class="r num"><b>${fmt(r.Qf,2)}</b></td><td class="r num">${fmt(r.QfT,2)}</td><td>${r.vacio?"—":r.clasif}</td><td class="num">${r.F}</td><td class="num">${r.vacio?"—":r.Areq+"A"+(r.hasB?" "+r.Breq+"B":"")}</td><td class="r num">${r.nReq}</td><td class="r num">${r.inst?fmt(r.inst.tot,r.inst.tot%1?1:0):0}</td><td><span class="pill ${r.cumple==="ok"||r.cumple==="espuma"?"ok":r.cumple==="sin"?"ad":"no"}">${r.cumple==="ok"?"cumple":r.cumple==="espuma"?"espuma":r.cumple==="sin"?"sin dato":"no cumple"}</span></td><td class="r num">${r.Npers*r.nsec}</td></tr>`).join("");
  const tot = `<tr><td>Total</td><td class="r num">${fmt(P.m2,1)}</td><td></td><td></td><td class="r num">${fmt(P.kcal)}</td><td></td><td></td><td></td><td></td><td></td><td></td><td class="r num">${P.req}</td><td class="r num">${fmt(P.inst,P.inst%1?1:0)}</td><td></td><td class="r num">${P.personas}</td></tr>`;
  return `<table class="pl-sum"><thead><tr>${head.map((h,i)=>`<th class="${i>0&&i<9?"r":""}">${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody><tfoot>${tot}</tfoot></table>`;
}

function auditoria(k){
  const H = PL.hallazgos(DATA[k]);
  const ord = {alta:0,media:1,baja:2};
  return H.sort((a,b)=>ord[a.sev]-ord[b.sev]).map(h=>`<li class="pl-h ${h.sev}"><span class="pill ${h.sev==="alta"?"no":h.sev==="media"?"ad":"na"}">${h.sev}</span><div><h4>${esc(h.t)} <small>${esc(h.sec)}</small></h4><p>${h.d}</p></div><code>${esc(h.celda)}</code></li>`).join("");
}

/* ---------- locación TKR-10 (repo visor-equipo-de-torre: LAYOUT TKR-10, marco: origen = boca de pozo, +x hacia el mástil, z lateral) ---------- */
function locSVG(){
  const X=v=>(v+43)*10, Z=v=>(v+33)*10;
  const R=(x0,x1,z0,z1,cls,lab,tip,fs,rot)=>`<g data-tip="${tip}"><rect class="lc ${cls}" x="${X(x0)}" y="${Z(z0)}" width="${(x1-x0)*10}" height="${(z1-z0)*10}" rx="2"/><text class="lt" x="${X((x0+x1)/2)}" y="${Z((z0+z1)/2)}" font-size="${fs||10}" text-anchor="middle" dominant-baseline="middle"${rot?` transform="rotate(-90 ${X((x0+x1)/2)} ${Z((z0+z1)/2)})"`:""}>${lab}</text></g>`;
  const T=(x,z,w,h,cls,lab,tip)=>R(x-w/2,x+w/2,z-h/2,z+h/2,cls,lab,tip,11,true);
  const LX=-31.6;
  return `<svg class="pl-loc" viewBox="0 0 930 650" role="img" aria-label="Plano de locación del TKR-10: tráilers, tanques, usina, pileta, bomba, acumulador y planchada alrededor de la boca de pozo">
  <rect width="930" height="650" class="lbg"/>
  <line class="lax" x1="0" y1="${Z(0)}" x2="930" y2="${Z(0)}"/><line class="lax" x1="${X(0)}" y1="0" x2="${X(0)}" y2="650"/>
  ${[25,-25].map(z=>`<circle class="lan" cx="${X(0)}" cy="${Z(z)}" r="5"/>`).join("")}
  <text class="ls" x="${X(0)+8}" y="${Z(25)+4}" font-size="10">anclajes ±25 m (en conflicto: 20 m)</text>
  ${R(-19.3,-1.3,-1.5,2.5,"eq","Equipo (carrier + mástil)","Equipo: carrier hacia −x, termina a 1,3 m de la boca (cota confirmada)")}
  ${R(-21.2,-13.2,3,5.4,"acu","Acumulador 8×2,4","Acumulador 8 × 2,4 m, a 3 m del eje (confirmado)",10)}
  ${R(-19.3,-13.3,-15.9,-13.5,"bom","Bomba 6×2,4","Bomba triplex 6 × 2,4 m; 5 m hasta la pileta (cota rotulada)",10)}
  ${R(-8.3,3.7,-15.9,-13.5,"pil","Pileta 12×2,4","Pileta de ensayo 12 × 2,4 m, 40 m³ (folleto/layout)",10)}
  ${R(2.8,14.8,-1.2,1.2,"pla","Planchada 12×2,4","Planchada 12 × 2,4 m (layout; conflicto con 12 × 2 m)",10)}
  <circle class="lpoz" cx="${X(0)}" cy="${Z(0)}" r="7"/><text class="ls" x="${X(0)+10}" y="${Z(0)-8}" font-size="11">boca de pozo</text>
  <circle class="lan" cx="${X(30)}" cy="${Z(0)}" r="5"/><text class="ls" x="${X(30)-60}" y="${Z(0)+22}" font-size="10">anclaje pirosalva 30 m</text>
  ${T(LX,20.9,2.4,12,"tr","Jefe de equipo","Tráiler 12 × 2,4 m · jefe de equipo")}
  ${T(LX,6.1,2.4,12,"tr","Enc. turno","Tráiler 12 × 2,4 m · encargado de turno / personal")}
  ${T(LX-8.1,20.9,2.4,12,"tr","Descanso CR","Tráiler 12 × 2,4 m · descanso CR")}
  ${T(LX,-8.6,2.4,12,"tk","Tanques","Tanques sobre patín: combustible 12.465 l y agua 8.300 l")}
  ${T(LX,-23.3,2.4,12,"lab","Lab · taller · usinas","Tráiler de 4 módulos: laboratorio, taller, depósito, usinas")}
  ${T(LX+3.6,-21.5,2,3.6,"us","Usina","Usina (grupo electrógeno John Deere, cabina insonorizada)")}
  <text class="ls" x="20" y="636" font-size="10">x → hacia el mástil · z lateral · cuadrícula = marco del visor (1 u = 1 m)</text></svg>
  <ul class="pl-legend" aria-label="Referencias"><li><i class="lk tr"></i>Tráiler habitacional / oficina</li><li><i class="lk lab"></i>Laboratorio · usinas</li><li><i class="lk tk"></i>Tanques</li><li><i class="lk us"></i>Usina</li><li><i class="lk pil"></i>Pileta</li></ul>`;
}
/* ---------- plano ---------- */
function planoHTML(k){
  if(k!=="pull") return `<div class="pl-eq">
    <figure><img src="img/m_sep.webp" alt="Pileta o separador de la planilla"><figcaption>Pileta (plano de equipamiento)</figcaption></figure>
    <figure><img src="img/m_vessel.webp" alt="Recipiente a presión del plano"><figcaption>Recipiente (plano de equipamiento)</figcaption></figure>
    <figure><img src="img/m_extintor.webp" alt="Extintor portátil de polvo"><figcaption>Extintor portátil</figcaption></figure></div>
    <p class="note">La planilla MASE arma el layout de equipamiento y campamento con estos elementos sobre el plano. En esta vista se muestran los sectores calculados.</p>`;
  const p = ST[k].plano;
  return `<div class="seg pl-seg-tabs" role="group" aria-label="Plano">${PLANOS.map(([id,t])=>`<button type="button" data-act="plano" data-p="${id}" aria-pressed="${id===p}">${t}</button>`).join("")}</div>
    ${p==="loc"?`<div class="pl-plano pl-locw">${locSVG()}</div>
    <p class="note">Locación del <b>TKR-10</b> tomada del repositorio visor-equipo-de-torre (LAYOUT TKR-10): tamaños y cotas rotuladas confirmadas, posiciones medidas del vector (confianza C). Es la referencia de un equipo vecino: la planilla del equipo de pulling no trae esta distribución, así que no se asigna aquí ningún sector del cálculo (trailer, command center) a un tráiler en particular.</p>`:`<div class="pl-plano"><img id="pull-planoimg" src="img/plano_${p}.webp" alt="Plano ${PLANOS.find(x=>x[0]===p)[1]} del equipo de pulling" width="835" height="530"><i class="pl-scan" aria-hidden="true"></i></div>
    <p class="note">Plano de las hojas LAY OUT, AREAS DE PELIGROS y DISTRIBUCION EXTINTORES de la planilla del equipo de pulling.</p>`}`;
}

/* ---------- armado de cada proyecto ---------- */
function build(k){
  const D = DATA[k], root = $("#tab-"+k);
  const isP = k==="pull";
  root.innerHTML = `<div class="wrap pl" id="${k}-root">
  <header class="pl-head">
    <div class="pl-ht"><span class="signal"><i aria-hidden="true"></i><span class="eyebrow">Planilla ${esc(D.equipo)} · Dec. 351/79 Anexo VII</span></span>
      <h1>${isP?"Carga de fuego del equipo de pulling":"Carga de fuego MASE"}</h1>
      <p class="lede">${isP?"Los 9 sectores de la planilla del equipo de pulling: boca de pozo, trailer, command center, tanque de gasoil, piletas y usinas. Elegí un sector y seguí el cálculo celda por celda.":"Los 9 sectores de la planilla MASE 2024 con sus superficies y volúmenes. Elegí un sector y seguí el cálculo celda por celda."}</p></div>
    <div class="pl-ctl">
      <div class="seg" role="group" aria-label="Ventilación"><button type="button" data-act="vent" data-v="nat" aria-pressed="${ST[k].vent==="nat"}">Ventilación natural</button><button type="button" data-act="vent" data-v="mec" aria-pressed="${ST[k].vent==="mec"}">Mecánica</button></div>
      <label class="field chk"><input type="checkbox" id="${k}-fix" data-act="fix"> Corregir PCI sospechosos</label>
      <label class="field chk"><input type="checkbox" id="${k}-r2" data-act="r2" checked> Clase B con riesgo 2 (conservador)</label>
      <button type="button" class="btn" data-act="reset">Volver a los datos de la planilla</button>
    </div></header>
  <div class="pl-kpis" id="${k}-kpis"></div>

  <section class="pl-sec"><div class="pl-st"><h2>Sectores</h2><p class="note">Tocá un sector para ver su cálculo. El color de la barra indica el tramo del Anexo VII.</p></div>
    <div class="pl-board" id="${k}-board"></div></section>

  <section class="pl-sec pl-two"><div><div class="pl-st"><h2>${isP?"Plano de la planilla":"Equipos del plano"}</h2></div><div id="${k}-plano">${planoHTML(k)}</div></div>
    <div><div class="pl-st"><h2>Carga de fuego por sector</h2><p class="note">Escala logarítmica: la pileta de ${isP?"40.000":"40.000"} kg y el command center no caben en una misma escala lineal.</p></div><div class="pl-chart" id="${k}-c1"></div></div></section>

  <section class="pl-sec pl-two"><div><div class="pl-st"><h2>De dónde sale el calor</h2><p class="note">Porcentaje del calor de cada sector según el tipo de combustible.</p></div><div class="pl-chart" id="${k}-c2"></div></div>
    <div><div class="pl-st"><h2>Extintores requeridos e instalados</h2><p class="note">La marca negra es lo que pide la superficie (1 cada 200 m² por sector). La barra es lo que declara la planilla.</p></div><div class="pl-chart" id="${k}-c3"></div></div></section>

  <section class="pl-sec" id="${k}-detalle"><div class="pl-st"><h2>Cálculo de <span id="${k}-selname"></span></h2><p class="note">Todas las fórmulas de la hoja Qf, con la celda de origen.</p></div>
    <div class="lb-chips pl-chips" id="${k}-chips" role="tablist" aria-label="Sectores"></div>
    <div class="pl-calc"><div class="pl-left"><figure class="pl-foto" id="${k}-foto" hidden></figure><div id="${k}-ed"></div></div>
      <div class="pl-right"><div class="pl-replay"><button type="button" class="btn" data-act="replay">▶ Repetir animación</button></div><ol class="pl-steps" id="${k}-steps"></ol></div></div>
    <div class="pl-three"><div class="lb-card"><h3>Aporte de calor</h3><div id="${k}-donut" class="pl-chart"></div></div>
      <div class="lb-card pl-tab-w"><h3>Potencial extintor</h3><div id="${k}-tablas"></div></div></div></section>

  <section class="pl-sec"><div class="pl-st"><h2>Resumen de todos los sectores</h2><button type="button" class="btn" data-act="copy">Copiar tabla</button><span class="note" id="${k}-copymsg" aria-live="polite"></span></div>
    <div class="tablebox"><div id="${k}-sum"></div></div></section>

  <section class="pl-sec"><div class="pl-st"><h2>Qué revisar en la planilla</h2><p class="note">Se detecta comparando las celdas con las fórmulas y con las tablas del Anexo VII.</p></div><ul class="pl-aud" id="${k}-aud"></ul></section></div>`;
  $("#"+k+"-ed").innerHTML = editor(k);
  refresh(k,true);
  wire(k);
}

function refresh(k, anim, skipEditor){
  const P = PL.calcProyecto(DATA[k],opt(k));
  paint($(`#${k}-kpis`), kpis(k,P), anim);
  paint($(`#${k}-board`), tablero(k,P), anim);
  paint($(`#${k}-c1`), chartQf(P), anim);
  paint($(`#${k}-c2`), chartMix(P), anim);
  paint($(`#${k}-c3`), chartExt(P), anim);
  detalle(k, anim);
  $(`#${k}-sum`).innerHTML = resumen(k,P);
  $(`#${k}-aud`).innerHTML = auditoria(k);
  if(!skipEditor){ $(`#${k}-ed`).innerHTML = editor(k); }
  else { const s=DATA[k].sectores[ST[k].sel], r=PL.calc(s,opt(k));
    $$(`#${k}-ed tr[data-m]`).forEach((tr,i)=>{ $(".q",tr).textContent = fmt(r.mats[i].Q); });
    $(`#${k}-ptot`).textContent = fmt(r.Ptot); $(`#${k}-qtot`).textContent = fmt(r.Qm); }
  return P;
}

/* ---------- eventos ---------- */
function wire(k){
  const root = $("#tab-"+k);
  root.addEventListener("click",e=>{
    const b = e.target.closest("[data-act]"); if(!b) return; const a = b.dataset.act, S = ST[k], D = DATA[k];
    if(a==="sel"){ S.sel = +b.dataset.i; refresh(k,true); if(b.classList.contains("pl-tile")) $(`#${k}-detalle`).scrollIntoView({behavior:RM?"auto":"smooth",block:"start"}); }
    else if(a==="vent"){ S.vent = b.dataset.v; $$('[data-act="vent"]',root).forEach(x=>x.setAttribute("aria-pressed",x.dataset.v===S.vent)); refresh(k,false); }
    else if(a==="replay"){ detalle(k,true); }
    else if(a==="plano"){ S.plano = b.dataset.p; const w = $(`#${k}-plano`); w.innerHTML = planoHTML(k); }
    else if(a==="reset"){ DATA[k] = clone(PL.DATOS[k]); S.sel = 1; S.fix=false; S.r2=true; $(`#${k}-fix`).checked=false; $(`#${k}-r2`).checked=true; refresh(k,true); }
    else if(a==="addmat"){ const c = PL.CAT.find(x=>x.id===$(`#${k}-addm`).value); D.sectores[S.sel].mats.push({id:c.id,n:c.n,c:c.c,cat:c.cat,kg:100,pci:c.pci}); refresh(k,false); }
    else if(a==="delmat"){ D.sectores[S.sel].mats.splice(+b.dataset.m,1); refresh(k,false); }
    else if(a==="addsec"){ D.sectores.push({id:"nuevo"+Date.now(),n:"Sector nuevo",foto:null,sup:20,R:4,nsec:1,uso:30,mats:[{id:"madera",n:"Madera",c:"A",cat:"celu",kg:200,pci:4400}],inst:null}); S.sel = D.sectores.length-1; refresh(k,true); }
    else if(a==="delsec"){ D.sectores.splice(S.sel,1); S.sel = Math.max(0,S.sel-1); refresh(k,true); }
    else if(a==="copy"){ const P = PL.calcProyecto(D,opt(k)); const rows = [...$$("#"+k+"-sum tr")].map(tr=>[...tr.children].map(c=>c.innerText.trim()).join("\t")).join("\n");
      const ok=()=>{$(`#${k}-copymsg`).textContent="Tabla copiada.";}; const fb=()=>{const rg=document.createRange(); rg.selectNodeContents($(`#${k}-sum`)); const g=getSelection(); g.removeAllRanges(); g.addRange(rg); $(`#${k}-copymsg`).textContent="Seleccioné la tabla: copiala con Ctrl+C.";};
      try{ navigator.clipboard.writeText(rows).then(ok,fb); }catch(x){ fb(); } }
  });
  root.addEventListener("change",e=>{
    const t = e.target, S = ST[k], D = DATA[k];
    if(t.dataset.act==="fix"){ S.fix = t.checked; refresh(k,false); return; }
    if(t.dataset.act==="r2"){ S.r2 = t.checked; refresh(k,false); return; }
    if(t.matches("select[data-f='c']")){ const tr=t.closest("tr"); D.sectores[S.sel].mats[+tr.dataset.m].c = t.value; refresh(k,false,true); }
    if(t.dataset.sf==="R"||t.dataset.sf==="uso"){ D.sectores[S.sel][t.dataset.sf] = +t.value; refresh(k,false,true); }
  });
  root.addEventListener("input",e=>{
    const t = e.target, S = ST[k], D = DATA[k];
    if(t.dataset.f==="kg"||t.dataset.f==="pci"){ const tr=t.closest("tr"); D.sectores[S.sel].mats[+tr.dataset.m][t.dataset.f] = Math.max(0,parseFloat(t.value)||0); refresh(k,false,true); }
    else if(t.dataset.sf==="sup"||t.dataset.sf==="nsec"){ const v=parseFloat(t.value); if(v>0){ D.sectores[S.sel][t.dataset.sf]=v; refresh(k,false,true); } }
    else if(t.dataset.sf==="n"){ D.sectores[S.sel].n = t.value; const P=PL.calcProyecto(D,opt(k)); $(`#${k}-board`).innerHTML = tablero(k,P); counters($(`#${k}-board`),false); $(`#${k}-selname`).textContent=t.value; $$(`#${k}-chips .chip`)[S.sel].textContent=t.value; }
  });
}

/* ---------- comparativa ---------- */
function comparativa(anim){
  const root = $("#tab-comp"); const A = PL.calcProyecto(DATA.pull,opt("pull")), B = PL.calcProyecto(DATA.mase,opt("mase"));
  const ids = DATA.pull.sectores.map(s=>s.id).filter(id=>DATA.mase.sectores.find(x=>x.id===id));
  const rows = ids.map(id=>({id, a:A.filas.find(f=>f.s.id===id), b:B.filas.find(f=>f.s.id===id)}));
  const rh=40, left=156, pw=470, W=700, top=30, H=top+rows.length*rh+34, x=v=>lx(v,left,pw);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carga de fuego por sector, pulling contra MASE">`;
  [1,10,100,1000].forEach(v=>{ s+=`<line x1="${x(v)}" x2="${x(v)}" y1="${top-6}" y2="${top+rows.length*rh}" style="stroke:var(--line)"/><text x="${x(v)}" y="${top+rows.length*rh+16}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${fmt(v)}</text>`; });
  rows.forEach((o,i)=>{ const y=top+i*rh;
    s+=`<text x="${left-10}" y="${y+18}" text-anchor="end" font-size="12.5" style="fill:var(--ink)">${esc(o.a.s.n)}</text>`;
    [[o.a,"var(--cmp-a)","Pulling",0],[o.b,"var(--cmp-b)","MASE",1]].forEach(([f,c,nm,j])=>{
      if(f.r.vacio){ s+=`<text x="${left+6}" y="${y+10+j*14}" font-size="10.5" font-style="italic" style="fill:var(--muted)">${nm}: no determinado</text>`; return; }
      const w=Math.max(3,x(f.r.Qf)-left);
      s+=`<rect class="pl-grow" style="--d:${i};fill:${c}" x="${left}" y="${y+j*14}" width="${w}" height="11" rx="2.5" data-tip="${esc(nm+" · "+o.a.s.n+": Qf "+fm(f.r.Qf)+" kg/m² · S "+fmt(f.s.sup,1)+" m²")}"/><text class="pl-fade" style="--d:${i+5};fill:var(--ink)" x="${left+w+6}" y="${y+9+j*14}" font-size="10.5" font-family="IBM Plex Mono, monospace">${fm(f.r.Qf)}</text>`;
    });
  });
  s+=`</svg>`;
  const rel = (a,b)=> b===0? "—" : (a/b>=1? "×"+fmt(a/b,2) : "÷"+fmt(b/a,2));
  const dl = (a,b,d)=>{ const v=b-a; return v===0?`<span class="pl-d0">igual</span>`:`<span class="pl-d ${v>0?"up":"dn"}">${v>0?"+":"−"}${fmt(Math.abs(v),d||0)}</span>`; };
  const trs = rows.map(o=>`<tr><td>${esc(o.a.s.n)}</td><td class="r num">${fmt(o.a.s.sup,1)} → ${fmt(o.b.s.sup,1)}</td><td class="r num">${o.a.s.nsec} → ${o.b.s.nsec}</td><td class="r num">R${o.a.r.R} → R${o.b.r.R}</td><td class="r num">${fmt(o.a.r.Ptot)} → ${fmt(o.b.r.Ptot)}</td><td class="r num">${o.a.r.vacio?"—":fm(o.a.r.Qf)} → ${o.b.r.vacio?"—":fm(o.b.r.Qf)}</td><td class="num">${o.a.r.F} → ${o.b.r.F}</td><td class="r num">${o.a.r.nReq} → ${o.b.r.nReq}</td><td class="r num">${o.a.s.inst?fmt(o.a.s.inst.tot,o.a.s.inst.tot%1?1:0):0} → ${o.b.s.inst?fmt(o.b.s.inst.tot,o.b.s.inst.tot%1?1:0):0}</td></tr>`).join("");
  const cambios = [];
  rows.forEach(o=>{ const a=o.a,b=o.b;
    if(a.s.sup!==b.s.sup) cambios.push(`<b>${esc(a.s.n)}</b>: la superficie pasa de ${fmt(a.s.sup,1)} a ${fmt(b.s.sup,1)} m² (${rel(b.s.sup,a.s.sup)}).`);
    if(Math.abs(a.r.Ptot-b.r.Ptot)>1e-9 && !a.r.vacio) cambios.push(`<b>${esc(a.s.n)}</b>: el combustible pasa de ${fmt(a.r.Ptot)} a ${fmt(b.r.Ptot)} kg y la Qf de ${fm(a.r.Qf)} a ${fm(b.r.Qf)} kg/m².`);
    if(a.s.nsec!==b.s.nsec) cambios.push(`<b>${esc(a.s.n)}</b>: pasa de ${a.s.nsec} a ${b.s.nsec} sectores de incendio.`);
    if(a.r.R!==b.r.R) cambios.push(`<b>${esc(a.s.n)}</b>: el riesgo cambia de ${a.r.R} a ${b.r.R}.`);
  });
  const kp = (lab,va,vb,d,u)=>`<div class="pl-cmpk"><span class="pl-kl">${lab}</span><div class="pl-cmpv"><span><small>Pulling</small><b class="num"><span data-count="${va}" data-dec="${d}">${fmt(va,d)}</span></b></span><span><small>MASE</small><b class="num"><span data-count="${vb}" data-dec="${d}">${fmt(vb,d)}</span></b></span></div><span class="pl-ks">${u} ${dl(va,vb,d)}</span></div>`;
  paint(root, `<div class="wrap pl"><header class="pl-head"><div class="pl-ht"><span class="signal"><i aria-hidden="true"></i><span class="eyebrow">Equipo de pulling frente a MASE 2024</span></span><h1>Qué cambia entre las dos planillas</h1><p class="lede">Los mismos nueve sectores con superficies, cantidades y equipos distintos. Se recalcula con los datos que tengas cargados en cada pestaña.</p></div>
    <div class="pl-legend2"><span><i class="sw" style="background:var(--cmp-a)"></i>Pulling</span><span><i class="sw" style="background:var(--cmp-b)"></i>MASE</span></div></header>
    <div class="pl-cmpkpis">${kp("Calor total (Gcal)",A.kcal/1e9,B.kcal/1e9,2,"")}${kp("Combustible (kg)",A.kg,B.kg,0,"")}${kp("Área de sectores (m²)",A.m2,B.m2,0,"")}${kp("Extintores requeridos",A.req,B.req,0,"")}${kp("Extintores instalados",A.inst,B.inst,1,"")}${kp("Personas a evacuar",A.personas,B.personas,0,"")}</div>
    <section class="pl-sec"><div class="pl-st"><h2>Carga de fuego por sector</h2><p class="note">Escala logarítmica, igual que en cada pestaña.</p></div><div class="pl-chart" id="comp-c1">${s}</div></section>
    <section class="pl-sec"><div class="pl-st"><h2>Cambios detectados</h2></div><ul class="pl-chg">${cambios.map(c=>`<li>${c}</li>`).join("")||"<li>Los datos cargados son iguales.</li>"}</ul></section>
    <section class="pl-sec"><div class="pl-st"><h2>Lado a lado</h2><p class="note">Formato: Pulling → MASE.</p></div><div class="tablebox"><table class="pl-sum"><thead><tr><th>Sector</th><th class="r">S (m²)</th><th class="r">Sectores</th><th class="r">Riesgo</th><th class="r">Combustible (kg)</th><th class="r">Qf (kg/m²)</th><th>F</th><th class="r">Ext. req.</th><th class="r">Ext. inst.</th></tr></thead><tbody>${trs}</tbody></table></div></section></div>`, anim);
}

/* ---------- tooltip ---------- */
const tip = document.createElement("div"); tip.className="pl-tip"; tip.hidden = true; tip.setAttribute("role","status"); document.body.appendChild(tip);
function showTip(e){ const t = e.target.closest && e.target.closest("[data-tip]"); if(!t || !t.closest(".pl,.pl-chart")){ tip.hidden = true; return; }
  tip.textContent = t.dataset.tip; tip.hidden = false; const w = tip.offsetWidth; let xx = e.clientX+14, yy = e.clientY+14; if(xx+w>innerWidth-8) xx = e.clientX-w-14; tip.style.left = Math.max(8,xx)+"px"; tip.style.top = yy+"px"; }
document.addEventListener("pointermove",showTip); document.addEventListener("pointerdown",showTip);
document.addEventListener("pointerleave",()=>{tip.hidden=true;});

/* ---------- activación por pestaña ---------- */
function show(name){
  if(name==="mase"||name==="pull"){
    if(!ST[name].ready){ ST[name].ready = true; build(name); }
    else refresh(name,true,true);
  } else if(name==="comp"){ comparativa(true); }
}
document.addEventListener("cf-tab",e=>show(e.detail));
window.PLUI = {show};
})();
