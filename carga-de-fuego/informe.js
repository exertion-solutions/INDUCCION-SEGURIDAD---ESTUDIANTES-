/* Genera el informe formal en Word (.docx) a partir del libro. Requiere CF (motor.js) y la librería docx.
   Expone window.CFInforme.build(docx, libro) -> docx.Document */
(function (root) {
  "use strict";
  const CF = root.CF;

  function build(docx, L) {
    const { Document, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType,
      BorderStyle, Header, Footer, PageNumber, ImageRun, PageBreak, VerticalAlign } = docx;
    const fmt = CF.fmt;
    const E = L.est || {};
    const W = 9070;                    // ancho útil A4 con márgenes de 2,5 cm (DXA)
    const AZUL = "1F3864", GRIS = "F2F2F2", ROJO = "B8231F";
    const fecha = iso => iso ? iso.split("-").reverse().join("/") : "____/____/______";
    const val = (v, alt = "[completar]") => (v === undefined || v === null || String(v).trim() === "") ? alt : String(v);

    const P = (text, o = {}) => new Paragraph({
      alignment: o.align || AlignmentType.JUSTIFIED, spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 300 },
      keepNext: o.keepNext, children: Array.isArray(text) ? text : [new TextRun({ text: String(text), bold: o.bold, italics: o.italics, size: o.size, color: o.color })]
    });
    const R = (text, o = {}) => new TextRun({ text: String(text), ...o });
    const H1 = t => new Paragraph({ heading: "Heading1", children: [R(t)], keepNext: true });
    const H2 = t => new Paragraph({ heading: "Heading2", children: [R(t)], keepNext: true });
    const bullet = t => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [R(t)] });

    const border = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
    const borders = { top: border, bottom: border, left: border, right: border };
    function cell(text, o = {}) {
      const runs = Array.isArray(text) ? text : [R(text ?? "", { bold: o.bold || o.head, color: o.head ? "FFFFFF" : o.color, size: o.size || 18 })];
      return new TableCell({
        borders, width: { size: o.w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
        shading: o.head ? { fill: AZUL, type: ShadingType.CLEAR, color: "auto" } : o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 }, columnSpan: o.span,
        children: [new Paragraph({ alignment: o.align || AlignmentType.LEFT, children: runs })]
      });
    }
    function tabla(cols, filas, opt = {}) {
      const total = cols.reduce((a, c) => a + c.w, 0);
      const k = W / total; const ws = cols.map(c => Math.round(c.w * k));
      const rows = [];
      if (!opt.sinCabecera) rows.push(new TableRow({ tableHeader: true, cantSplit: true, children: cols.map((c, i) => cell(c.t, { head: true, w: ws[i], align: c.a, size: 16 })) }));
      filas.forEach((f, j) => rows.push(new TableRow({ cantSplit: true, children: f.map((v, i) => {
        const o = (v && typeof v === "object" && !Array.isArray(v) && "v" in v) ? v : { v };
        return cell(o.v, { w: ws[i], align: cols[i].a, bold: o.bold, color: o.color, fill: o.fill || (opt.zebra && j % 2 ? GRIS : undefined) });
      }) })));
      return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: ws, rows });
    }
    const kv = (pares) => tabla([{ t: "", w: 3200 }, { t: "", w: 5870 }], pares.map(([k, v]) => [{ v: k, bold: true, fill: GRIS }, v]), { sinCabecera: true });
    const espacio = () => new Paragraph({ spacing: { after: 120 }, children: [] });

    function bytes(dataURL) {
      const b64 = dataURL.split(",")[1];
      if (typeof atob === "function") { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
      return Uint8Array.from(Buffer.from(b64, "base64"));
    }
    function imagen(f, maxW = 560) {
      const w = f.w || 800, h = f.h || 600; const k = Math.min(1, maxW / w);
      return new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new ImageRun({ type: "jpg", data: bytes(f.data), transformation: { width: Math.round(w * k), height: Math.round(h * k) } })] });
    }

    // ---------- cálculos ----------
    const secs = (L.sectores || []).map(s => {
      const r = CF.calcSector(s);
      const ev = CF.evaluar(s, r, E.fechaRelev);
      return { s, r, ev };
    });
    const hallazgos = [];
    secs.forEach(({ s, ev }) => ev.filter(i => i.estado === "NC").forEach(i => hallazgos.push({ s, i })));
    const ordenPri = { Alta: 0, Media: 1, Baja: 2 };
    hallazgos.sort((a, b) => (ordenPri[a.i.prioridad] ?? 3) - (ordenPri[b.i.prioridad] ?? 3));

    // ---------- carátula ----------
    const cuerpo = [];
    cuerpo.push(new Paragraph({ spacing: { before: 1800, after: 200 }, alignment: AlignmentType.CENTER, children: [R("ESTUDIO DE CARGA DE FUEGO", { bold: true, size: 44, color: AZUL })] }));
    cuerpo.push(new Paragraph({ spacing: { after: 120 }, alignment: AlignmentType.CENTER, children: [R("Y PROTECCIÓN CONTRA INCENDIOS", { bold: true, size: 32, color: AZUL })] }));
    cuerpo.push(new Paragraph({ spacing: { after: 900 }, alignment: AlignmentType.CENTER, children: [R("Ley N.º 19.587 – Decreto N.º 351/79, Capítulo 18 y Anexo VII", { italics: true, size: 22 })] }));
    cuerpo.push(kv([
      ["Empresa", val(E.empresa)], ["CUIT", val(E.cuit)], ["Establecimiento", val(E.establecimiento)],
      ["Domicilio", [val(E.domicilio), val(E.localidad, ""), val(E.provincia, "")].filter(x => x).join(", ")],
      ["Actividad", val(E.actividad)], ["Informe N.º", val(E.nInforme)],
      ["Fecha de relevamiento", fecha(E.fechaRelev)], ["Fecha de emisión", fecha(E.fechaInforme)],
      ["Elaboró", `${val(E.profesional)} – ${val(E.titulo)}`], ["Matrícula", `${val(E.matricula)}${E.colegio ? " – " + E.colegio : ""}`]
    ]));
    cuerpo.push(new Paragraph({ children: [new PageBreak()] }));

    // ---------- 1 a 3 ----------
    cuerpo.push(H1("1. Objeto"));
    cuerpo.push(P(`El presente estudio tiene por objeto determinar la carga de fuego de los sectores de incendio del establecimiento ${val(E.establecimiento)}, perteneciente a ${val(E.empresa)}, clasificar su riesgo y establecer las condiciones de protección contra incendios exigibles, conforme a la Ley N.º 19.587 de Higiene y Seguridad en el Trabajo y a su Decreto Reglamentario N.º 351/79, Capítulo 18 y Anexo VII.`));
    cuerpo.push(H1("2. Alcance"));
    cuerpo.push(P(`El estudio comprende ${secs.length === 1 ? "el sector" : "los " + secs.length + " sectores"} de incendio que se detallan a continuación, relevados el ${fecha(E.fechaRelev)}: ${secs.map(x => x.s.nombre + " (" + fmt(x.r.S) + " m²)").join("; ")}. Incluye el cálculo de la carga de fuego, la resistencia al fuego exigida, el potencial extintor mínimo, la verificación de los medios de escape y la verificación de las condiciones de protección observadas en el lugar.`));
    cuerpo.push(H1("3. Marco normativo"));
    [["Ley N.º 19.587", " de Higiene y Seguridad en el Trabajo."],
     ["Decreto N.º 351/79", ", Capítulo 18 (arts. 160 a 187) y Anexo VII: definiciones, clasificación de riesgos, resistencia al fuego, potencial extintor, medios de escape y condiciones de situación, construcción y extinción."],
     ["Norma IRAM 3517-1 y 3517-2", ": selección, instalación, control y mantenimiento de extintores (referencia técnica)."],
     ["Normas IRAM 10005-1 y 10005-2", ": colores y señales de seguridad (referencia técnica)."],
     ["Norma IRAM 3597", ": sistemas de hidrantes y bocas de incendio, cuando corresponda (referencia técnica)."],
     ["Normas IRAM 11950 y 11949", ": ensayo y clasificación de la resistencia al fuego de elementos constructivos (referencia técnica)."]]
      .forEach(([a, b]) => cuerpo.push(bullet([R(a, { bold: true }), R(b)])));
    cuerpo.push(P("Las normas IRAM se citan como referencia técnica; su obligatoriedad depende de la remisión que haga la normativa aplicable en cada jurisdicción.", { italics: true, size: 18 }));

    // ---------- 4 ----------
    cuerpo.push(H1("4. Datos del establecimiento"));
    cuerpo.push(kv([["Razón social", val(E.empresa)], ["CUIT", val(E.cuit)], ["Establecimiento", val(E.establecimiento)],
      ["Domicilio", val(E.domicilio)], ["Localidad / Provincia", `${val(E.localidad)} / ${val(E.provincia)}`],
      ["Actividad principal", val(E.actividad)], ["Solicitante", val(E.solicitante)]]));

    // ---------- 5 ----------
    cuerpo.push(H1("5. Metodología"));
    cuerpo.push(P("Para cada sector de incendio se relevaron en el lugar los materiales combustibles presentes, con su cantidad, separando los sólidos (fuego clase A) de los líquidos inflamables (fuego clase B). Los líquidos se convirtieron a masa mediante su densidad y, según el Anexo VII, se consideraron distribuidos uniformemente en todo el sector."));
    cuerpo.push(P("La carga de fuego se calculó como el peso en madera equivalente por unidad de superficie, tomando como patrón la madera de poder calorífico inferior 18,41 MJ/kg (≈ 4.400 kcal/kg):"));
    cuerpo.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 }, children: [R("Qf = Σ (Pi × Hi) / (4.400 kcal/kg × S)   [kg/m²]", { bold: true, font: "Consolas", size: 20 })] }));
    cuerpo.push(P("Donde Pi es el peso de cada material (kg), Hi su poder calorífico inferior (kcal/kg) y S la superficie del sector (m²), descontados los medios de escape, sanitarios y locales de uso común. Con la carga de fuego y el riesgo se determinaron la resistencia al fuego exigida (Cuadros 2.2.1 y 2.2.2) y el potencial extintor mínimo (Tablas 1 y 2 del Anexo VII). Los medios de escape se verificaron con el factor de ocupación correspondiente al uso. El Decreto 351/79 no incluye una tabla de poderes caloríficos, por lo que en cada material se indica la fuente adoptada."));

    // ---------- 6: desarrollo por sector ----------
    cuerpo.push(H1("6. Desarrollo del cálculo por sector"));
    secs.forEach(({ s, r }, k) => {
      const n = `6.${k + 1}`;
      cuerpo.push(H2(`${n}. Sector «${val(s.nombre)}»`));
      const usoT = (CF.USOS.find(u => u[0] === +s.uso) || [0, "—"])[1];
      cuerpo.push(kv([["Superficie de cálculo", fmt(r.S) + " m²"], ["Uso", `${usoT} (factor de ocupación ${s.uso} m²/persona)`],
        ["Ventilación", s.ventilacion === "mec" ? "Mecánica" : "Natural"], ["Características constructivas", val(s.construccion)],
        ["Resistencia al fuego existente", val(s.fExistente === "Sin dato" ? "" : s.fExistente, "Sin dato acreditado")]]));
      cuerpo.push(espacio());
      cuerpo.push(P(`Tabla ${n}.a – Relevamiento de materiales combustibles y calor total`, { bold: true, after: 80, keepNext: true, size: 19 }));
      cuerpo.push(tabla([{ t: "Material", w: 2000 }, { t: "Clase", w: 750, a: AlignmentType.CENTER }, { t: "Cantidad", w: 1150, a: AlignmentType.RIGHT },
        { t: "Peso (kg)", w: 1000, a: AlignmentType.RIGHT }, { t: "PCI (kcal/kg)", w: 1100, a: AlignmentType.RIGHT }, { t: "Calor (kcal)", w: 1300, a: AlignmentType.RIGHT }, { t: "Fuente del PCI", w: 1900 }],
        r.items.map(i => [i.nombre, i.c, `${fmt(i.q, i.u === "l" ? 0 : 1)} ${i.u === "l" ? "l" : "kg"}${i.u === "l" ? " (δ " + fmt(i.dens, 2) + ")" : ""}`, fmt(i.kg, 1), fmt(i.pci), fmt(i.kcal), val(i.fuente)])
          .concat([[{ v: "Subtotal clase A", bold: true }, "", "", "", "", { v: fmt(r.totA), bold: true }, ""],
                   [{ v: "Subtotal clase B", bold: true }, "", "", "", "", { v: fmt(r.totB), bold: true }, ""],
                   [{ v: "Total", bold: true, fill: GRIS }, { v: "", fill: GRIS }, { v: "", fill: GRIS }, { v: "", fill: GRIS }, { v: "", fill: GRIS }, { v: fmt(r.tot), bold: true, fill: GRIS }, { v: "", fill: GRIS }]]), { zebra: false }));
      cuerpo.push(espacio());
      cuerpo.push(P([R("Carga de fuego: ", { bold: true }), R(`Qf = ${fmt(r.tot)} / (4.400 × ${fmt(r.S)}) = `), R(`${fmt(r.qf, 2)} kg/m²`, { bold: true }),
        R(`  (clase A: ${fmt(r.qa, 2)} kg/m²; clase B: ${fmt(r.qb, 2)} kg/m²).`)]));
      const riesgoT = (CF.RIESGOS.find(x => x[0] === r.R) || [0, ""])[1];
      cuerpo.push(P(`Tabla ${n}.b – Resultados`, { bold: true, after: 80, keepNext: true, size: 19 }));
      cuerpo.push(tabla([{ t: "Parámetro", w: 3400 }, { t: "Resultado", w: 2600 }, { t: "Referencia", w: 3070 }], [
        ["Carga de fuego total", fmt(r.qf, 2) + " kg/m²", "Anexo VII, definición"],
        ["Clasificación del riesgo", `Riesgo ${r.R} – ${riesgoT}`, "Anexo VII, Tabla 2.1"],
        ["Resistencia al fuego exigida", r.F === "—" ? (r.Fnote || "No fijada") : r.F, `Cuadro ${s.ventilacion === "mec" ? "2.2.2" : "2.2.1"}`],
        ["Potencial extintor mínimo por equipo", `${r.Anum}A${r.hasB ? " – " + r.Bnum + "B" : ""}`, `Tablas 1 y 2; mínimo 1A-5BC (7.1.1)${r.hasB && s.r2B !== false ? "; clase B con columna de riesgo 2" : ""}`],
        ["Cantidad mínima de extintores", `${r.nExt}`, "1 cada 200 m² o fracción"],
        ["Ocupantes (N)", `${r.N} personas`, `Superficie / ${s.uso} m² por persona`],
        ["Unidades de ancho de salida (n)", `${r.n} (${fmt(r.ancho, 2)} m)`, "n = N / 100; mínimo 2 unidades"],
        ["Medios de escape requeridos", `${r.salidas}`, "Anexo VII, medios de escape"]
      ], { zebra: true }));
      if ((s.extintores || []).length) {
        cuerpo.push(espacio());
        cuerpo.push(P(`Tabla ${n}.c – Extintores instalados`, { bold: true, after: 80, keepNext: true, size: 19 }));
        cuerpo.push(tabla([{ t: "Código", w: 950 }, { t: "Agente", w: 1150 }, { t: "Capacidad", w: 1100, a: AlignmentType.RIGHT }, { t: "Potencial", w: 1100, a: AlignmentType.CENTER },
          { t: "Ubicación", w: 2200 }, { t: "Venc. carga", w: 1150, a: AlignmentType.CENTER }, { t: "Venc. P.H.", w: 1150, a: AlignmentType.CENTER }],
          s.extintores.map(e => [val(e.cod, "—"), val(e.agente, "—"), e.kg ? fmt(e.kg, 1) + " kg" : "—", `${+e.ra ? e.ra + "A-" : ""}${+e.rb ? e.rb + "B" : ""}${/CO|PQS|ABC/i.test(e.agente || "") ? "C" : ""}` || "—",
            val(e.ubic, "—"), e.vc ? fecha(e.vc) : "—", e.ph ? fecha(e.ph) : "—"]), { zebra: true }));
      }
    });

    // ---------- 7: verificaciones ----------
    cuerpo.push(H1("7. Verificación de las condiciones de protección"));
    cuerpo.push(P("Se verificaron en el lugar las condiciones de protección contra incendios. Se consigna para cada ítem el resultado: C (cumple), NC (no cumple), NA (no aplica) o S/V (sin verificar)."));
    secs.forEach(({ s, ev }, k) => {
      cuerpo.push(H2(`7.${k + 1}. Sector «${val(s.nombre)}»`));
      const lab = e => e === "C" ? { v: "C", color: "1C7A45", bold: true } : e === "NC" ? { v: "NC", color: ROJO, bold: true } : e === "NA" ? { v: "NA" } : { v: "S/V", color: "9A6412" };
      cuerpo.push(tabla([{ t: "Ítem verificado", w: 3300 }, { t: "Referencia", w: 2200 }, { t: "Resultado", w: 1050, a: AlignmentType.CENTER }, { t: "Observación", w: 2520 }],
        ev.map(i => [i.t, i.base, lab(i.estado), [i.detalle, i.obs].filter(Boolean).join(". ")]), { zebra: true }));
      const c = { C: 0, NC: 0, NA: 0, SV: 0 }; ev.forEach(i => c[i.estado || "SV"]++);
      cuerpo.push(P(`Resumen: ${c.C} ítems cumplen, ${c.NC} no cumplen, ${c.NA} no aplican y ${c.SV} quedaron sin verificar.`, { before: 100, italics: true }));
    });

    // ---------- 8: hallazgos ----------
    cuerpo.push(H1("8. Desvíos y medidas correctivas"));
    if (!hallazgos.length) cuerpo.push(P("No se registraron desvíos en los ítems verificados."));
    else cuerpo.push(tabla([{ t: "N.º", w: 500, a: AlignmentType.CENTER }, { t: "Sector", w: 1000 }, { t: "Desvío", w: 2200 }, { t: "Medida correctiva", w: 2350 },
      { t: "Responsable", w: 1350 }, { t: "Plazo", w: 1000, a: AlignmentType.CENTER }, { t: "Prioridad", w: 1050, a: AlignmentType.CENTER }],
      hallazgos.map(({ s, i }, j) => [String(j + 1), s.nombre, i.t + (i.obs ? ". " + i.obs : ""), val(i.medida), val(i.responsable, "A designar"), i.plazo ? fecha(i.plazo) : "A definir",
        { v: i.prioridad, bold: true, color: i.prioridad === "Alta" ? ROJO : undefined }]), { zebra: true }));

    // ---------- 9: conclusiones ----------
    cuerpo.push(H1("9. Conclusiones"));
    const auto = secs.map(({ s, r }) => `El sector «${s.nombre}» presenta una carga de fuego de ${fmt(r.qf, 2)} kg/m², se clasifica como riesgo ${r.R} y requiere una resistencia al fuego ${r.F === "—" ? "no fijada por los cuadros" : r.F}, extintores de potencial mínimo ${r.Anum}A${r.hasB ? "-" + r.Bnum + "B" : ""} (al menos ${r.nExt}) y ${r.salidas} medio${r.salidas > 1 ? "s" : ""} de escape de ${fmt(r.ancho, 2)} m de ancho.`).join(" ");
    const altas = hallazgos.filter(h => h.i.prioridad === "Alta").length;
    const resumenH = hallazgos.length ? ` Se identificaron ${hallazgos.length} desvío${hallazgos.length > 1 ? "s" : ""}${altas ? `, de los cuales ${altas} de prioridad alta, que deben corregirse antes de continuar la operación normal del sector` : ""}. Se recomienda implementar las medidas correctivas en los plazos indicados y verificar su cierre.` : " No se registraron desvíos en los ítems verificados.";
    (L.conclusiones && L.conclusiones.trim() ? L.conclusiones.trim().split(/\n+/) : [auto + resumenH]).forEach(t => cuerpo.push(P(t)));

    // ---------- 10: limitaciones ----------
    cuerpo.push(H1("10. Limitaciones"));
    cuerpo.push(P("Los resultados corresponden a las condiciones y cantidades observadas en la fecha del relevamiento; cualquier cambio en los materiales almacenados, en la superficie o en el uso de los sectores obliga a actualizar el estudio. Los poderes caloríficos son valores de referencia bibliográfica salvo que se indique ficha técnica del producto; las densidades de los líquidos deben confirmarse con la hoja de seguridad de cada producto. Los Cuadros 2.2.1 y 2.2.2 del Anexo VII se aplicaron según la interpretación habitual (2.2.1 ventilación natural; 2.2.2 ventilación mecánica)."));

    // ---------- firma ----------
    cuerpo.push(new Paragraph({ spacing: { before: 900 }, alignment: AlignmentType.RIGHT, children: [R("______________________________")] }));
    cuerpo.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [R(val(E.profesional, "Nombre y apellido"), { bold: true })] }));
    cuerpo.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [R(val(E.titulo, "Título habilitante"))] }));
    cuerpo.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [R("Matrícula: " + val(E.matricula, "______________") + (E.colegio ? " – " + E.colegio : ""))] }));
    cuerpo.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [R(`${val(E.localidad, "")}${E.localidad ? ", " : ""}${fecha(E.fechaInforme)}`)] }));

    // ---------- anexo fotográfico ----------
    const fotos = [];
    secs.forEach(({ s, ev }) => {
      (s.fotos || []).forEach(f => fotos.push({ f, cap: `Sector «${s.nombre}»${f.cap ? ": " + f.cap : ""}` }));
      ev.filter(i => i.foto).forEach(i => fotos.push({ f: i.foto, cap: `Sector «${s.nombre}» – ${i.t} (${i.estado || "S/V"})${i.obs ? ": " + i.obs : ""}` }));
    });
    if (fotos.length) {
      cuerpo.push(new Paragraph({ children: [new PageBreak()] }));
      cuerpo.push(H1("Anexo I. Registro fotográfico"));
      fotos.forEach(({ f, cap }, j) => {
        cuerpo.push(imagen(f));
        cuerpo.push(P(`Foto ${j + 1}. ${cap}`, { align: AlignmentType.CENTER, italics: true, size: 18, after: 240 }));
      });
    }

    const doc = new Document({
      creator: val(E.profesional, "Libro de carga de fuego"), title: "Estudio de carga de fuego – " + val(E.establecimiento, ""),
      styles: {
        default: { document: { run: { font: "Arial", size: 21 } } },
        paragraphStyles: [
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: AZUL, font: "Arial" }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 } },
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, color: AZUL, font: "Arial" }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } }
        ]
      },
      numbering: { config: [] },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } }, titlePage: true },
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZUL, space: 4 } },
          children: [R(`Estudio de carga de fuego – ${val(E.establecimiento, "")}`, { size: 16, color: "595959" })] })] }),
          first: new Header({ children: [new Paragraph({ children: [] })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          R(`Informe N.º ${val(E.nInforme, "—")}  ·  Página `, { size: 16, color: "595959" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "595959" }),
          R(" de ", { size: 16, color: "595959" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "595959" })] })] }),
          first: new Footer({ children: [new Paragraph({ children: [] })] }) },
        children: cuerpo
      }]
    });
    return { doc, hallazgos: hallazgos.length, sectores: secs.length, fotos: fotos.length };
  }

  root.CFInforme = { build };
})(typeof window !== "undefined" ? window : globalThis);
