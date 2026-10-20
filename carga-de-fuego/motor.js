/* Motor de cálculo de carga de fuego y verificaciones (Dec. 351/79, Anexo VII).
   Compartido por la guía, el libro y el informe Word. Expone window.CF. */
(function (root) {
  "use strict";

  const LIB = {
    madera: { n: "Madera (pallets, estanterías)", c: "A", u: "kg", pci: 4400, est: "of", src: "Patrón del Dec. 351/79 (18,41 MJ/kg)" },
    carton: { n: "Cartón (cajas, embalajes)", c: "A", u: "kg", pci: 4000, est: "se", src: "TP IAS 2023" },
    papel: { n: "Papel (archivo)", c: "A", u: "kg", pci: 4400, est: "se", src: "TP IAS 2023 (4.000 a 4.400)" },
    caucho: { n: "Neumáticos / caucho", c: "A", u: "kg", pci: 10000, est: "ve", src: "UTN FRRQ; el valor real podría ser menor" },
    film: { n: "Film de polietileno", c: "A", u: "kg", pci: 10000, est: "se", src: "TP IAS 2023" },
    algodon: { n: "Algodón", c: "A", u: "kg", pci: 3980, est: "se", src: "UTN FRRQ" },
    lana: { n: "Lana", c: "A", u: "kg", pci: 4940, est: "se", src: "UTN FRRQ" },
    pvc: { n: "PVC", c: "A", u: "kg", pci: 5000, est: "se", src: "UTN FRRQ" },
    gasoil: { n: "Gasoil", c: "B", u: "l", dens: 0.84, pci: 10000, est: "se", src: "UTN FRRQ; densidad según hoja de seguridad", inflam: 2 },
    aceite: { n: "Aceite lubricante", c: "B", u: "l", dens: 0.88, pci: 9500, est: "ve", src: "Informe TdF 2026" },
    nafta: { n: "Nafta", c: "B", u: "l", dens: 0.74, pci: 10000, est: "ve", src: "UTN FRRQ; densidad según hoja de seguridad", inflam: 1 },
    glp: { n: "GLP", c: "B", u: "kg", pci: 11000, est: "se", src: "≈ 46 MJ/kg (valor de referencia)", inflam: 1 },
    otro: { n: "Otro material", c: "A", u: "kg", pci: 0, est: "ve", src: "Completar fuente" }
  };

  const RIESGOS = [[1, "Explosivos"], [2, "Inflamables"], [3, "Muy combustibles"], [4, "Combustibles"], [5, "Poco combustibles"], [6, "Incombustibles"], [7, "Refractarios"]];
  const RANGOS = ["hasta 15", "16 a 30", "31 a 60", "61 a 100", "más de 100"];
  const FNAT = { 2: ["F 60", "F 90", "F 120", "F 180", "F 180"], 3: ["F 30", "F 60", "F 90", "F 120", "F 180"], 4: ["F 30", "F 30", "F 60", "F 90", "F 120"], 5: ["—", "F 30", "F 30", "F 60", "F 90"] };
  const FMEC = { 2: ["NP", "NP", "NP", "NP", "NP"], 3: ["F 60", "F 90", "F 120", "F 180", "NP"], 4: ["F 60", "F 60", "F 90", "F 120", "F 180"], 5: ["F 30", "F 60", "F 60", "F 90", "F 120"] };
  const PA = { 3: ["1A", "2A", "3A", "6A", "a det."], 4: ["1A", "1A", "2A", "4A", "a det."], 5: ["1A", "1A", "1A", "3A", "a det."] };
  const PB = { 2: ["6B", "8B", "10B", "20B", "a det."], 3: ["4B", "6B", "8B", "10B", "a det."] };
  const USOS = [[30, "Depósito"], [16, "Edificio industrial"], [8, "Oficinas, bancos, clínicas"], [3, "Comercio, mercado, restaurante"], [5, "Gimnasio"], [2, "Educación, culto, salas de juego"], [1, "Salas de asambleas y de baile"], [12, "Vivienda"], [20, "Hotel, pisos superiores"]];
  const F_OPC = ["Sin dato", "F 0 / sin acreditar", "F 30", "F 60", "F 90", "F 120", "F 180"];

  const idx = q => q <= 15 ? 0 : q <= 30 ? 1 : q <= 60 ? 2 : q <= 100 ? 3 : 4;
  const fnum = f => { const m = /F\s*(\d+)/.exec(f || ""); return m ? +m[1] : null; };

  function kgDe(m) { const q = +m.q || 0; return m.u === "l" ? q * (+m.dens || 0) : q; }

  /** Cálculo completo de un sector. sec: {superficie, uso, ventilacion, riesgo, r2B, materiales[]} */
  function calcSector(sec) {
    const S = Math.max(+sec.superficie || 0, 0.0001);
    const items = (sec.materiales || []).map(m => { const kg = kgDe(m); return { ...m, kg, kcal: kg * (+m.pci || 0) }; });
    const tot = items.reduce((a, b) => a + b.kcal, 0);
    const totA = items.filter(i => i.c === "A").reduce((a, b) => a + b.kcal, 0);
    const totB = tot - totA;
    const qf = tot / (4400 * S), qa = totA / (4400 * S), qb = totB / (4400 * S);
    const hasB = items.some(i => i.c === "B" && (+i.q) > 0);
    const inflam1 = items.some(i => i.inflam === 1 && (+i.q) > 0);
    const R = +sec.riesgo || 3;
    const iT = idx(qf), iA = idx(qa), iB = idx(qb);
    const tab = sec.ventilacion === "mec" ? FMEC : FNAT;
    let F = "—", Fnote = "";
    if (tab[R]) F = tab[R][iT];
    else Fnote = R === 1 ? "Riesgo 1: se considera solo como fuente de ignición; requiere tratamiento especial." : "Los cuadros no fijan resistencia al fuego para riesgo " + R + ".";
    const A = PA[R] ? PA[R][iA] : null;
    const colB = (hasB && sec.r2B !== false) ? 2 : R;
    const B = PB[colB] ? PB[colB][iB] : null;
    const Anum = A && A !== "a det." ? parseInt(A) : 1;
    const Bnum = Math.max(B && B !== "a det." ? parseInt(B) : 0, 5);
    const nExt = Math.max(1, Math.ceil(S / 200 - 1e-9));
    const uso = +sec.uso || 30;
    const N = Math.ceil(S / uso - 1e-9);
    const nraw = N / 100;
    let n = Math.floor(nraw) + ((nraw % 1) >= 0.5 ? 1 : 0); n = Math.max(n, 2);
    const ancho = 1.10 + 0.45 * (n - 2);
    const salidas = n < 4 ? 1 : Math.ceil(n / 4 + 1 - 1e-9);
    return { S, items, tot, totA, totB, qf, qa, qb, hasB, inflam1, R, iT, iA, iB, F, Fnote, A, B, colB, Anum, Bnum, nExt, uso, N, nraw, n, ancho, salidas };
  }

  /* ---------- Lista de verificación ("qué verificar") ---------- */
  const fmt = (x, d = 0) => Number(x).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const hoyISO = () => new Date().toISOString().slice(0, 10);

  const ITEMS = [
    // Documentación
    { id: "doc1", g: "Cálculo y documentación", t: "Plano del sector actualizado y superficie verificada",
      q: "Medí el sector en obra y compará con el plano. Descontá medios de escape, sanitarios y locales de uso común.", base: "Dec. 351/79, Anexo VII, definiciones", est: "of",
      med: "Actualizar el plano del sector con las medidas relevadas.", pri: "Media" },
    { id: "doc2", g: "Cálculo y documentación", t: "Poderes caloríficos con fuente declarada",
      q: "Cada material del relevamiento debe tener su poder calorífico inferior y de dónde salió (ficha técnica, bibliografía).", base: "Dec. 351/79, Anexo VII (no trae tabla de PCI)", est: "of",
      auto: (s) => { const sin = (s.materiales || []).filter(m => !m.fuente || !(+m.pci)); return sin.length ? { e: "NC", d: sin.length + " material(es) sin PCI o sin fuente" } : { e: "C", d: "Todos los materiales tienen PCI y fuente" }; },
      med: "Completar el PCI y la fuente de cada material.", pri: "Media" },
    { id: "doc3", g: "Cálculo y documentación", t: "Carga de fuego del sector exhibida en el lugar",
      q: "Buscá un cartel o registro visible con la carga de fuego del sector.", base: "Dec. 351/79, art. 183 (texto leído en fuente secundaria)", est: "ve",
      med: "Colocar en el sector un cartel con su carga de fuego y riesgo.", pri: "Baja" },
    // Construcción
    { id: "con1", g: "Construcción", t: "Resistencia al fuego de muros y cubierta ≥ la exigida",
      q: "Identificá el material de muros, columnas y cubierta y su resistencia acreditada (ensayo IRAM 11950 / 11949 o certificado).", base: "Anexo VII, Cuadros 2.2.1 y 2.2.2", est: "ve",
      auto: (s, r) => { if (r.F === "NP") return { e: "NC", d: "La combinación de riesgo y ventilación no está permitida (NP)" };
        const req = fnum(r.F); if (req === null) return { e: "NA", d: "El cuadro no fija F para este caso" };
        const ex = s.fExistente; if (!ex || ex === "Sin dato") return { e: null, d: "Exigida " + r.F + ". Cargá la F existente en el sector" };
        const v = fnum(ex) ?? 0; return v >= req ? { e: "C", d: "Existente " + ex + " ≥ exigida " + r.F } : { e: "NC", d: "Existente " + ex + " < exigida " + r.F }; },
      med: "Mejorar la resistencia al fuego de los elementos constructivos (revestimiento ignífugo, muro cortafuego) o reducir la carga de fuego.", pri: "Alta" },
    { id: "con2", g: "Construcción", t: "Cortes de gas y electricidad accesibles y señalizados",
      q: "Ubicá el corte general de energía y de gas: a no más de 5 m de la línea municipal, señalizado y sin obstrucciones.", base: "Anexo VII, 6.1.6", est: "of",
      med: "Reubicar o señalizar los cortes generales de gas y electricidad.", pri: "Media" },
    // Extintores
    { id: "ext1", g: "Extintores", t: "Cantidad de extintores ≥ la requerida",
      q: "Contá los extintores del sector. Mínimo 1 cada 200 m² o fracción.", base: "Anexo VII, 7.1.1", est: "of",
      auto: (s, r) => { const n = (s.extintores || []).length; if (!n) return { e: null, d: "Requeridos " + r.nExt + ". Cargá los extintores instalados" };
        return n >= r.nExt ? { e: "C", d: n + " instalados ≥ " + r.nExt + " requeridos" } : { e: "NC", d: n + " instalados < " + r.nExt + " requeridos" }; },
      med: "Incorporar extintores hasta cubrir la cantidad requerida.", pri: "Alta" },
    { id: "ext2", g: "Extintores", t: "Potencial del marbete ≥ el mínimo calculado",
      q: "Leé el potencial en el marbete de cada equipo (por ejemplo 3A-40BC). No alcanza con \"PQS 5 kg\".", base: "Anexo VII, Tablas 1 y 2 y punto 7.1.1", est: "of",
      auto: (s, r) => { const ex = (s.extintores || []).filter(e => /PQS|ABC|AFFF|agua/i.test(e.agente || ""));
        if (!ex.length) return { e: null, d: "Mínimo " + r.Anum + "A" + (r.hasB ? "-" + r.Bnum + "B" : "") + ". Cargá el potencial de cada equipo" };
        const bad = ex.filter(e => (+e.ra || 0) < r.Anum || (r.hasB && (+e.rb || 0) < r.Bnum));
        return bad.length ? { e: "NC", d: bad.length + " equipo(s) por debajo de " + r.Anum + "A" + (r.hasB ? "-" + r.Bnum + "B" : "") } : { e: "C", d: "Todos ≥ " + r.Anum + "A" + (r.hasB ? "-" + r.Bnum + "B" : "") }; },
      med: "Reemplazar los equipos de potencial insuficiente.", pri: "Alta" },
    { id: "ext3", g: "Extintores", t: "Recorrido hasta un extintor: ≤ 20 m (clase A) y ≤ 15 m (clase B)",
      q: "Trazá sobre el plano el recorrido real desde el punto más alejado hasta el extintor más cercano, esquivando estibas.", base: "Dec. 351/79 art. 176 e IRAM 3517-2 (fuente secundaria)", est: "se",
      auto: (s, r) => { const d = +s.distExt; if (!d) return { e: null, d: "Cargá la distancia máxima medida" };
        const lim = r.hasB ? 15 : 20; return d <= lim ? { e: "C", d: fmt(d, 1) + " m ≤ " + lim + " m" } : { e: "NC", d: fmt(d, 1) + " m > " + lim + " m" }; },
      med: "Redistribuir o agregar extintores para cumplir las distancias.", pri: "Alta" },
    { id: "ext4", g: "Extintores", t: "Agente extintor adecuado a la clase de fuego",
      q: "PQS ABC para fuegos A y B; CO₂ o agente limpio junto a tableros eléctricos (clase C); clase K en cocinas.", base: "IRAM 3517-1 (fuente secundaria)", est: "se",
      med: "Adecuar el agente extintor al riesgo de cada puesto.", pri: "Media" },
    { id: "ext5", g: "Extintores", t: "Carga vigente y tarjeta de mantenimiento",
      q: "Revisá la tarjeta: mantenimiento anual y recarga después de cada uso. Anotá el vencimiento.", base: "IRAM 3517-2 (fuente secundaria)", est: "se",
      auto: (s) => { const ex = (s.extintores || []).filter(e => e.vc); if (!ex.length) return { e: null, d: "Cargá el vencimiento de carga de cada equipo" };
        const f = s._fecha || hoyISO(); const v = ex.filter(e => e.vc < f); return v.length ? { e: "NC", d: v.length + " equipo(s) con carga vencida" } : { e: "C", d: "Cargas vigentes al " + f.split("-").reverse().join("/") }; },
      med: "Recargar los equipos vencidos con un recargador habilitado.", pri: "Alta" },
    { id: "ext6", g: "Extintores", t: "Prueba hidráulica vigente",
      q: "Verificá la fecha de la última prueba hidráulica estampada (cada 5 años en general; 2 años en equipos a base de agua).", base: "IRAM 3517-2, Anexo E (fuente secundaria)", est: "ve",
      auto: (s) => { const ex = (s.extintores || []).filter(e => e.ph); if (!ex.length) return { e: null, d: "Cargá el vencimiento de la prueba hidráulica" };
        const f = s._fecha || hoyISO(); const v = ex.filter(e => e.ph < f); return v.length ? { e: "NC", d: v.length + " equipo(s) con prueba hidráulica vencida" } : { e: "C", d: "Pruebas hidráulicas vigentes" }; },
      med: "Realizar la prueba hidráulica de los equipos vencidos.", pri: "Alta" },
    { id: "ext7", g: "Extintores", t: "Altura de instalación correcta",
      q: "Parte superior a 1,5 m del piso como máximo (1 m si pesa más de 20 kg); base a 0,10 m o más.", base: "IRAM 3517-2, 6.2.14 (fuente secundaria)", est: "se",
      med: "Reubicar los soportes a la altura reglamentaria.", pri: "Baja" },
    { id: "ext8", g: "Extintores", t: "Señalización, demarcación y acceso libre",
      q: "Cartel rojo sobre el equipo (IRAM 10005), demarcación en el piso y nada que lo tape o bloquee.", base: "Guía de señalización SRT; IRAM 10005-1 y 10005-2", est: "of",
      med: "Señalizar los extintores y despejar su acceso.", pri: "Media" },
    { id: "ext9", g: "Extintores", t: "Control periódico registrado",
      q: "Pedí el registro de controles: al menos 4 por año según IRAM 3517-2.", base: "IRAM 3517-2 (fuente secundaria)", est: "se",
      med: "Implementar y registrar el control trimestral de extintores.", pri: "Media" },
    // Medios de escape
    { id: "esc1", g: "Medios de escape", t: "Ancho libre de salida ≥ el requerido",
      q: "Medí el ancho libre de paso de cada salida (sin contar marcos ni hojas abiertas).", base: "Anexo VII, medios de escape", est: "of",
      auto: (s, r) => { const a = +s.anchoSalida; if (!a) return { e: null, d: "Requerido " + fmt(r.ancho, 2) + " m. Cargá el ancho medido" };
        return a + 1e-6 >= r.ancho ? { e: "C", d: fmt(a, 2) + " m ≥ " + fmt(r.ancho, 2) + " m" } : { e: "NC", d: fmt(a, 2) + " m < " + fmt(r.ancho, 2) + " m" }; },
      med: "Ampliar la salida o agregar medios de escape.", pri: "Alta" },
    { id: "esc2", g: "Medios de escape", t: "Cantidad de medios de escape ≥ la requerida",
      q: "Contá las salidas independientes del sector.", base: "Anexo VII, medios de escape", est: "of",
      auto: (s, r) => { const n = +s.nSalidas; if (!n) return { e: null, d: "Requeridas " + r.salidas + ". Cargá las salidas existentes" };
        return n >= r.salidas ? { e: "C", d: n + " ≥ " + r.salidas } : { e: "NC", d: n + " < " + r.salidas }; },
      med: "Habilitar un medio de escape adicional.", pri: "Alta" },
    { id: "esc3", g: "Medios de escape", t: "Recorrido máximo hasta la salida ≤ 40 m",
      q: "Medí desde el punto más alejado hasta la salida por el camino real (20 m en subsuelos).", base: "Anexo VII, medios de escape", est: "of",
      auto: (s) => { const d = +s.distSalida; if (!d) return { e: null, d: "Cargá la distancia máxima medida" };
        return d <= 40 ? { e: "C", d: fmt(d, 1) + " m ≤ 40 m" } : { e: "NC", d: fmt(d, 1) + " m > 40 m" }; },
      med: "Agregar una salida o reorganizar el sector para acortar el recorrido.", pri: "Alta" },
    { id: "esc4", g: "Medios de escape", t: "Puertas que abren hacia afuera y sin traba",
      q: "Las puertas de salida abren en el sentido de la evacuación, sin candados durante la jornada; no hay puertas giratorias.", base: "Anexo VII, medios de escape", est: "of",
      med: "Invertir el sentido de apertura o colocar barral antipánico.", pri: "Alta" },
    { id: "esc5", g: "Medios de escape", t: "Vías de escape libres de obstáculos",
      q: "Recorré el camino a la salida: sin mercadería, pallets ni equipos que lo angosten.", base: "Ley 19.587 y Dec. 351/79, Cap. 18", est: "of",
      med: "Despejar y demarcar las vías de escape.", pri: "Alta" },
    { id: "esc6", g: "Medios de escape", t: "Señalización de salida visible",
      q: "Carteles verdes de salida y flechas direccionales a 2 m del piso, iluminados.", base: "Guía de señalización SRT; Anexo VII, C11", est: "of",
      med: "Colocar señalización de salida y flechas direccionales.", pri: "Media" },
    { id: "esc7", g: "Medios de escape", t: "Iluminación de emergencia operativa",
      q: "Probá las luminarias cortando la energía: deben encender y durar (IRAM-AADL J 2027: 1 lux en el piso, 1,5 h).", base: "IRAM-AADL J 2027; valor del decreto a verificar", est: "ve",
      med: "Instalar o reparar la iluminación de emergencia.", pri: "Media" },
    // Almacenamiento
    { id: "alm1", g: "Almacenamiento", t: "Estibas a 1 m de los muros y camino de ronda (E13)",
      q: "En locales de más de 100 m², estibas a 1 m de muros y ejes divisorios; de más de 250 m², camino de ronda; ninguna estiba de más de 200 m².", base: "Anexo VII, condición E13", est: "of",
      auto: (s, r) => r.S <= 100 ? { e: "NA", d: "Sector de " + fmt(r.S) + " m² (≤ 100 m²)" } : { e: null, d: "Aplica: sector de " + fmt(r.S) + " m²" + (r.S > 250 ? "; requiere camino de ronda" : "") },
      med: "Reubicar las estibas a 1 m de los muros y demarcar el camino de ronda.", pri: "Media" },
    { id: "alm2", g: "Almacenamiento", t: "Inflamables en el puesto de trabajo ≤ 200 l",
      q: "En el lugar de trabajo solo la cantidad necesaria, en recipientes cerrados; el resto en depósito.", base: "Dec. 351/79, art. 164 (fuente secundaria)", est: "se",
      auto: (s, r) => { if (!r.hasB) return { e: "NA", d: "Sin líquidos inflamables" };
        const l = (s.materiales || []).filter(m => m.c === "B" && m.u === "l").reduce((a, m) => a + (+m.q || 0), 0);
        return { e: null, d: fmt(l) + " l de líquidos en el sector" }; },
      med: "Trasladar el excedente de inflamables a un depósito habilitado.", pri: "Alta" },
    { id: "alm3", g: "Almacenamiento", t: "Contención de derrames (bateas)",
      q: "Tambores sobre batea o recinto con capacidad mayor que el recipiente más grande (110 % según la práctica del art. 165).", base: "Dec. 351/79, art. 165 (fuente secundaria)", est: "se",
      auto: (s, r) => r.hasB ? { e: null, d: "Aplica: hay líquidos clase B" } : { e: "NA", d: "Sin líquidos inflamables" },
      med: "Colocar bateas de contención bajo los recipientes.", pri: "Alta" },
    { id: "alm4", g: "Almacenamiento", t: "Superficie del sector dentro del límite (C3)",
      q: "Sectores de hasta 1.000 m²; si son mayores, muro cortafuego o rociadores.", base: "Anexo VII, condición C3", est: "of",
      auto: (s, r) => r.S <= 1000 ? { e: "C", d: fmt(r.S) + " m² ≤ 1.000 m²" } : { e: null, d: fmt(r.S) + " m²: verificar muro cortafuego o rociadores" },
      med: "Sectorizar con muro cortafuego o instalar rociadores.", pri: "Alta" },
    { id: "alm5", g: "Almacenamiento", t: "Servicio de agua contra incendio cuando corresponde (E3)",
      q: "Sectores de más de 600 m² (300 m² en subsuelo) requieren servicio de agua (E1), según determine Bomberos.", base: "Anexo VII, condiciones E1 y E3; IRAM 3597", est: "of",
      auto: (s, r) => r.S > 600 ? { e: null, d: "Aplica: sector de " + fmt(r.S) + " m²" } : { e: "NA", d: "Sector de " + fmt(r.S) + " m² (≤ 600 m²)" },
      med: "Proyectar la instalación de hidrantes según IRAM 3597.", pri: "Alta" },
    // Gestión
    { id: "ins1", g: "Instalaciones y gestión", t: "Tablero eléctrico cerrado, señalizado y con corte accesible",
      q: "Tapa colocada, sin cables expuestos, cartel de riesgo eléctrico y extintor apto clase C cerca.", base: "Dec. 351/79, Cap. 14", est: "of",
      med: "Cerrar y señalizar el tablero y colocar un extintor de CO₂ próximo.", pri: "Media" },
    { id: "gen1", g: "Instalaciones y gestión", t: "Plan de evacuación con punto de reunión",
      q: "Plano de evacuación visible, roles asignados y punto de reunión exterior.", base: "Dec. 351/79, art. 187 (guía SRT)", est: "se",
      med: "Elaborar y exhibir el plan de evacuación.", pri: "Media" },
    { id: "gen2", g: "Instalaciones y gestión", t: "Personal capacitado en uso de extintores",
      q: "Registro de capacitación con fecha, contenidos y firmas.", base: "Dec. 351/79, art. 187", est: "se",
      med: "Capacitar al personal en uso de extintores y registrar la asistencia.", pri: "Media" },
    { id: "gen3", g: "Instalaciones y gestión", t: "Simulacros registrados",
      q: "El art. 187 pide ejercicios periódicos sin fijar frecuencia; como buena práctica, 2 por año.", base: "Dec. 351/79, art. 187", est: "se",
      med: "Programar y registrar simulacros de evacuación.", pri: "Baja" },
    { id: "gen4", g: "Instalaciones y gestión", t: "Orden y limpieza",
      q: "Sin acumulación de residuos combustibles, trapos con aceite o embalajes fuera de las estibas.", base: "Ley 19.587", est: "of",
      med: "Retirar los residuos combustibles y fijar una rutina de orden y limpieza.", pri: "Media" }
  ];
  const GRUPOS = [...new Set(ITEMS.map(i => i.g))];

  /** Estado final de cada ítem: lo que marcó la persona o, si no marcó, la sugerencia automática. */
  function evaluar(sec, r, fecha) {
    const s = { ...sec, _fecha: fecha };
    return ITEMS.map(it => {
      const a = it.auto ? it.auto(s, r) : { e: null, d: "" };
      const v = (sec.verif || {})[it.id] || {};
      const estado = v.e || a.e || null;
      return { ...it, sugerido: a.e, detalle: a.d, estado, manual: !!v.e, obs: v.obs || "", foto: v.foto || null,
        medida: v.medida ?? it.med, responsable: v.responsable || "", plazo: v.plazo || "", prioridad: v.prioridad || it.pri };
    });
  }

  function ejemplo() {
    return {
      v: 1,
      est: { empresa: "Taller de servicios (ejemplo)", cuit: "", establecimiento: "Pañol y depósito de insumos", domicilio: "", localidad: "Cipolletti", provincia: "Río Negro",
        actividad: "Servicios a la industria petrolera: taller y depósito", solicitante: "", nInforme: "CF-001", fechaRelev: hoyISO(), fechaInforme: hoyISO(),
        profesional: "", titulo: "Técnico/a Superior en Seguridad e Higiene", matricula: "", colegio: "" },
      sectores: [{
        id: "s1", nombre: "Pañol", superficie: 400, uso: 30, ventilacion: "nat", riesgo: 3, r2B: true, fExistente: "Sin dato",
        construccion: "Nave de 20 × 20 m en planta baja. Muros de bloque de hormigón hasta 3 m y cerramiento de chapa; estructura de pórticos de acero; cubierta de chapa trapezoidal con traslúcidas. Ventilación natural.",
        materiales: [
          { lib: "madera", nombre: "Madera (pallets, estanterías)", c: "A", u: "kg", q: 1200, pci: 4400, fuente: LIB.madera.src },
          { lib: "carton", nombre: "Cartón (cajas, embalajes)", c: "A", u: "kg", q: 800, pci: 4000, fuente: LIB.carton.src },
          { lib: "papel", nombre: "Papel (archivo)", c: "A", u: "kg", q: 300, pci: 4400, fuente: LIB.papel.src },
          { lib: "caucho", nombre: "Neumáticos / caucho", c: "A", u: "kg", q: 600, pci: 10000, fuente: LIB.caucho.src },
          { lib: "film", nombre: "Film de polietileno", c: "A", u: "kg", q: 150, pci: 10000, fuente: LIB.film.src },
          { lib: "gasoil", nombre: "Gasoil", c: "B", u: "l", dens: 0.84, q: 400, pci: 10000, fuente: LIB.gasoil.src, inflam: 2 },
          { lib: "aceite", nombre: "Aceite lubricante", c: "B", u: "l", dens: 0.88, q: 600, pci: 9500, fuente: LIB.aceite.src }
        ],
        extintores: [
          { cod: "E1", agente: "PQS ABC", kg: 5, ra: 3, rb: 40, ubic: "Muro oeste, al medio", vc: "", ph: "" },
          { cod: "E2", agente: "PQS ABC", kg: 5, ra: 3, rb: 40, ubic: "Muro este, al medio", vc: "", ph: "" },
          { cod: "E3", agente: "PQS ABC", kg: 10, ra: 6, rb: 40, ubic: "Junto a los lubricantes", vc: "", ph: "" },
          { cod: "E4", agente: "CO₂", kg: 3.5, ra: 0, rb: 5, ubic: "Junto al tablero eléctrico", vc: "", ph: "" }
        ],
        anchoSalida: 1.10, nSalidas: 1, distExt: 13.9, distSalida: 22.4,
        verif: {}, fotos: []
      }],
      conclusiones: ""
    };
  }

  root.CF = { LIB, RIESGOS, RANGOS, FNAT, FMEC, PA, PB, USOS, F_OPC, ITEMS, GRUPOS, calcSector, evaluar, ejemplo, fmt, idx, fnum };
})(typeof window !== "undefined" ? window : globalThis);
