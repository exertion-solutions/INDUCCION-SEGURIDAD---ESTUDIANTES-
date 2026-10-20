/* Motor de las planillas "Cálculo de Carga de Fuego" (MASE 2024 y Pulling).
   Replica fórmula por fórmula las hojas "Qf ..." y agrega las tablas del Anexo VII (Dec. 351/79)
   que ya usa la guía (FF). Cada resultado indica la celda de la planilla de la que sale. */
var PL = (function(){
  const FFx = (typeof FF !== "undefined") ? FF : require("./guia-motor.js");
  const {RANGOS,FNAT,FMEC,PA,PB,USOS,idx} = FFx;

  const PCAL_MADERA = 4400;            // C7  kcal/kg
  const M3_AGUA = 997;                 // M18 kg por m³ (K19*M18/K18)
  const MCAL = 1000;                   // L22 kcal por Mcal
  const UAS_BASE = 100;                // C71/C73 personas por unidad de ancho
  const LIBRE = 0.8;                   // G74 20 % libre para circulación
  const M2_EXT = 200;                  // C57 m² por extintor

  /* categorías de combustible para los gráficos */
  const CATS = {
    celu:{n:"Madera, cartón y papel", c:"--c-celu"},
    plas:{n:"Plásticos y telas", c:"--c-plas"},
    elec:{n:"Material y aparatos eléctricos", c:"--c-elec"},
    gasoil:{n:"Gasoil", c:"--c-gasoil"},
    petro:{n:"Petróleo y gas", c:"--c-petro"},
    grasa:{n:"Grasas y aceites", c:"--c-grasa"}
  };

  /* catálogo para agregar materiales (PCI de la planilla y de la guía) */
  const CAT = [
    {id:"madera",n:"Madera",c:"A",pci:4400,cat:"celu"},
    {id:"carton",n:"Cartón / papel",c:"A",pci:4000,cat:"celu"},
    {id:"plastico",n:"Plástico",c:"A",pci:7839,cat:"plas"},
    {id:"telas",n:"Telas",c:"A",pci:5000,cat:"plas"},
    {id:"matelec",n:"Material eléctrico",c:"A",pci:4290,cat:"elec"},
    {id:"apelec",n:"Aparatos eléctricos",c:"A",pci:8200,cat:"elec"},
    {id:"caucho",n:"Neumáticos / caucho",c:"A",pci:10000,cat:"plas"},
    {id:"gasoil",n:"Gasoil",c:"B",pci:10200,cat:"gasoil"},
    {id:"petroleo",n:"Petróleo",c:"B",pci:12052,cat:"petro"},
    {id:"gas",n:"Gas",c:"B",pci:8540,cat:"petro"},
    {id:"aceite",n:"Aceite lubricante",c:"B",pci:9500,cat:"grasa"},
    {id:"grasa",n:"Grasa",c:"B",pci:9000,cat:"grasa"}
  ];

  /* ---------- datos de las dos planillas ---------- */
  const mk = (id,kg,pci,extra)=>{ const m = CAT.find(x=>x.id===id); return Object.assign({id,n:m.n,c:m.c,cat:m.cat,kg,pci:(pci==null?m.pci:pci)}, extra||{}); };
  const CMD = ()=>[mk("madera",120,4400),mk("carton",50,4000),mk("plastico",50,7839),mk("matelec",70,4290),mk("apelec",100,8200)];
  const ext = (marca,cap,agente,pot,nec,tot,nota)=>({marca,cap,agente,pot,nec,tot,nota});

  const DATOS = {
    pull:{
      id:"pull", nombre:"Equipo de pulling", corto:"Pulling", equipo:"Pulling",
      archivo:"Cálculo de Carga de Fuego · Equipo de pulling",
      sectores:[
        {id:"boca",n:"Boca de pozo",foto:"p_boca",extra:["p_bop","p_acum"],sup:4,R:1,nsec:1,uso:30,mats:[mk("petroleo",0,12900),mk("gas",0,8540)],inst:null,xl:{Qf:0}},
        {id:"trailer",n:"Trailer habitacional",foto:"p_habitacional",sup:24,R:4,nsec:2,uso:16,mats:[mk("madera",300,4400),mk("carton",100,4000),mk("plastico",200,7839),mk("telas",30,5000),mk("matelec",100,4290),mk("apelec",300,8200)],
          inst:{cant:1,...ext("YUKON","5 kg","ABC","6A 40B","3A",1)}},
        {id:"command",n:"Command center",foto:"p_trailer",sup:24,R:4,nsec:1,uso:16,mats:CMD(),
          inst:{cant:1,...ext("YUKON","5 kg","ABC 60","6A 40B:C","2A 6B",1)}},
        {id:"tkgasoil",pool:1,n:"Tanque de gasoil",foto:"p_tkgasoil",sup:24,R:2,nsec:1,uso:30,mats:[mk("gasoil",4500,10200)],
          inst:{cant:1,...ext("YUKON","100 kg","ABC","10A 80B:C","6A 60B",1,"Se colocará uno de 100 kg")}},
        {id:"tornillo",pool:1,n:"Pileta tornillo",foto:"p_pil_tornillo",sup:36,R:2,nsec:1,uso:30,mats:[mk("petroleo",40000,12052)],
          inst:{cant:1,...ext("Tanque espumígeno","500 L","AFFF 3 %",null,null,1,"Cuenta con espumígeno"),espuma:true}},
        {id:"auxiliar",pool:1,n:"Pileta auxiliar",foto:"p_pil_tornillo",sup:36,R:2,nsec:1,uso:30,mats:[mk("petroleo",40000,12052)],
          inst:{cant:1,...ext("Tanque espumígeno","500 L","AFFF 3 %",null,null,1,"Cuenta con espumígeno"),espuma:true}},
        {id:"ensayo",pool:1,n:"Pileta de ensayo",foto:"p_pil_ensayo",sup:36,R:2,nsec:1,uso:30,mats:[mk("petroleo",4000,12052)],
          inst:{cant:1,...ext("Tanque espumígeno","500 L","AFFF 3 %","10B","8B",1,"Cuenta con espumígeno"),espuma:true}},
        {id:"generador",n:"Usina generador",foto:"p_usina",sup:24,R:3,nsec:2,uso:30,mats:[mk("gasoil",400,10200),mk("telas",45,5000),mk("plastico",150,2839),mk("matelec",100,4290),mk("grasa",40,3.8)],
          inst:{cant:1,...ext("COMASEG","10 kg","ABC 60","6A 60B:C","0A 10B",1)},
          fix:{plastico:7839,grasa:9000}},
        {id:"usina",n:"Usina",foto:"p_usina",sup:24,R:3,nsec:2,uso:30,mats:[mk("gasoil",300,10200)],
          inst:{cant:1,...ext("COMASEG","10 kg","ABC 60","6A 60B:C","0A 10B",0.5)}}
      ]
    },
    mase:{
      id:"mase", nombre:"MASE", corto:"MASE", equipo:"MASE 2024",
      archivo:"Cálculo de Carga de Fuego · MASE 2024",
      sectores:[
        {id:"boca",n:"Boca de pozo",foto:"p_boca",extra:["p_bop","p_acum"],sup:100,R:2,nsec:1,uso:30,mats:[mk("petroleo",0,12900),mk("gas",0,8540)],inst:null,xl:{Qf:0}},
        {id:"trailer",n:"Trailer habitacional",foto:"p_habitacional",sup:30,R:4,nsec:5,uso:16,mats:[mk("madera",300,4400),mk("carton",100,4000),mk("plastico",200,7839),mk("telas",30,5000),mk("matelec",100,4290),mk("apelec",300,8200)],
          inst:{cant:2,...ext("YUKON","5 kg","ABC","6A 40B","3A",10)}},
        {id:"command",n:"Command center",foto:"p_trailer",sup:24,R:4,nsec:1,uso:16,mats:CMD(),
          inst:{cant:1,...ext("YUKON","5 kg","ABC 60","6A 40B:C","2A 6B",1)}},
        {id:"tkgasoil",pool:1,n:"Tanque de gasoil",foto:"p_tkgasoil",sup:15,R:2,nsec:1,uso:30,mats:[mk("gasoil",12000,10200)],
          inst:{cant:1,...ext("YUKON","100 kg","ABC","10A 80B:C","60B",1,"Se colocará uno de 100 kg")}},
        {id:"tornillo",pool:1,n:"Pileta tornillo",foto:"p_pil_tornillo",sup:36,R:2,nsec:1,uso:30,mats:[mk("petroleo",40000,12052)],
          inst:{cant:1,...ext("Tanque espumígeno","120 L","AFFF 6 %",null,null,1,"Cuenta con espumígeno"),espuma:true}},
        {id:"auxiliar",pool:1,n:"Pileta auxiliar",foto:"p_pil_tornillo",sup:36,R:2,nsec:1,uso:30,mats:[mk("petroleo",40000,12052)],
          inst:{cant:1,...ext("Tanque espumígeno","120 L","AFFF 6 %",null,null,1,"Cuenta con espumígeno"),espuma:true}},
        {id:"ensayo",pool:1,n:"Pileta de ensayo",foto:"p_pil_ensayo",sup:36,R:2,nsec:1,uso:30,mats:[mk("petroleo",40000,12052)],
          inst:{cant:1,...ext("Tanque espumígeno","120 L","AFFF 6 %",null,null,1,"Cuenta con espumígeno"),espuma:true}},
        {id:"generador",n:"Usina generador",foto:"p_usina",sup:7.2,R:4,nsec:1,uso:30,mats:[mk("gasoil",150,10200)],
          inst:{cant:1,...ext("COMASEG","10 kg","ABC 60","6A 60B:C","0A 10B",1)}},
        {id:"usina",n:"Usina",foto:"p_usina",sup:24,R:4,nsec:2,uso:30,mats:[mk("gasoil",300,10200)],
          inst:{cant:1,...ext("COMASEG","10 kg","ABC 60","6A 60B:C","0A 10B",0.5)}}
      ]
    }
  };

  /* "6A 40B:C" → {A:6,B:40}; "3A 0B" → {A:3,B:0}; vacío → null */
  function parsePot(t){
    if(!t) return null;
    const a = /(\d+)\s*A/i.exec(t), b = /(\d+)\s*B/i.exec(t);
    return {A:a?+a[1]:0, B:b?+b[1]:0};
  }
  const clasifPlanilla = q => q<60 ? "LEVE" : q<=120 ? "COMÚN" : "MAYOR";   // F25:G27


  /* equivalencias de extintores de la planilla (hoja de equivalencias: tipo, peso, potencial) */
  const EXT = [
    {ag:"Polvo ABC",kg:1,A:1,B:3,C:1},{ag:"Polvo ABC",kg:2.5,A:3,B:20,C:1},{ag:"Polvo ABC",kg:5,A:6,B:40,C:1},{ag:"Polvo ABC",kg:10,A:6,B:60,C:1},
    {ag:"Anhídrido carbónico (CO₂)",kg:2,A:0,B:2,C:1},{ag:"Anhídrido carbónico (CO₂)",kg:3.5,A:0,B:3,C:1},{ag:"Anhídrido carbónico (CO₂)",kg:6,A:0,B:5,C:1},{ag:"Anhídrido carbónico (CO₂)",kg:10,A:0,B:10,C:1},
    {ag:"HCFC",kg:5,A:1,B:10,C:1},{ag:"Espuma AB",kg:10,A:2,B:20,C:0}
  ];
  /* Elige agente y capacidad. El decreto fija solo el potencial (pto 4) y que la clase del matafuego corresponda a la clase de fuego probable (7.1.1);
     el agente sale del potencial exigido + la clase de fuego (A/B/C) con las equivalencias de la planilla. */
  function recomendar(s, r){
    if(r.Qm===0) return {nd:true, motivo:"No se determina el combustible: el ataque ante incendio lo hace el personal de bomberos de la operadora."};
    const clases = ["A"]; if(r.hasB) clases.push("B");
    const elec = r.mats.some(m=>(CAT.find(c=>c.id===m.id)||{}).cat==="elec" && m.kg>0);
    if(elec) clases.push("C");
    const base = {clases:clases.join(" + "), Areq:r.Areq, Breq:r.Breq, cant:r.nReq, nPorSector:r.nPorSector, nsec:r.nsec};
    const aDet = r.A==="a det." || r.B==="a det.";
    if(s.pool){
      const it = EXT.find(e=>e.ag==="Polvo ABC"&&e.kg===10);
      return Object.assign(base,{pool:true, item:it, agente:"Espuma AFFF (fija o móvil) + polvo ABC 10 kg portátil",
        motivo:"Superficie de líquido inflamable mayor a 1 m²: el punto 4.2 la excluye de la Tabla 2 («a determinar»). Se cubre con espuma y se deja el polvo ABC portátil como complemento; la capacidad la fija el análisis del sitio (7.1.2).",fuente:"Dec. 351/79 Anexo VII, ptos 4.2 y 7.1.2 + criterio profesional"});
    }
    const ok = e => (!clases.includes("C")||e.C) && e.A>=r.Areq && e.B>=r.Breq;
    const orden = ["Polvo ABC","HCFC","Espuma AB","Anhídrido carbónico (CO₂)"];
    let item = null;
    for(const ag of orden){ item = EXT.filter(e=>e.ag===ag&&ok(e)).sort((a,b)=>a.kg-b.kg)[0]; if(item) break; }
    const nota = [];
    if(clases.includes("C")) nota.push("Hay equipos eléctricos energizados (clase C): no usar agua ni espuma; polvo ABC o CO₂. El decreto no calcula clase C.");
    if(r.hasB) nota.push("Clase B calculada con la Tabla 2 (riesgo "+r.colB+").");
    if(aDet) nota.push("Carga mayor a 100 kg/m²: la tabla dice «a determinar en cada caso»; se toma el mínimo y debe validarse.");
    if(!item) return Object.assign(base,{agente:"A determinar",motivo:"Ningún extintor portátil de las equivalencias llega al potencial exigido ("+r.Areq+"A"+(r.Breq?" "+r.Breq+"B":"")+"): usar más unidades o un equipo de mayor capacidad.",fuente:"Dec. 351/79 Anexo VII, pto 4"});
    return Object.assign(base,{item, agente:item.ag+" "+item.kg+" kg", motivo:nota.join(" "), fuente:"Dec. 351/79 Anexo VII, ptos 4 y 7.1.1; equivalencias de la planilla"});
  }

  /* s: sector. opt: {vent:"nat"|"mec", r2:bool, fix:bool} */
  function calc(s, opt){
    opt = opt||{};
    const mats = s.mats.map(m=>{
      const pci = (opt.fix && s.fix && s.fix[m.id]!=null) ? s.fix[m.id] : m.pci;
      const kg = +m.kg||0;
      return Object.assign({}, m, {pci:+pci||0, kg, Q: kg*(+pci||0)});            // F13 = E13*D13
    });
    const sup = +s.sup>0 ? +s.sup : 1;
    const Ptot = mats.reduce((a,m)=>a+m.kg,0);                                    // D19
    const Qm   = mats.reduce((a,m)=>a+m.Q,0);                                     // F19
    const QmA  = mats.filter(m=>m.c==="A").reduce((a,m)=>a+m.Q,0);
    const QmB  = Qm-QmA;
    const Pem  = Qm/PCAL_MADERA;                                                  // D22
    const Qf   = Pem/sup;                                                         // D25
    const QfT  = Qf*(+s.nsec||1);                                                 // D28
    const qa = QmA/(PCAL_MADERA*sup), qb = QmB/(PCAL_MADERA*sup);
    const R = +s.R||3;
    const iT = idx(Qf), iA = idx(qa), iB = idx(qb);
    const hasB = mats.some(m=>m.c==="B" && m.kg>0);
    const tabF = opt.vent==="mec" ? FMEC : FNAT;
    let F = "—", Fnote = "";
    if(Qm===0) F = "—"; else if(tabF[R]) F = tabF[R][iT]; else Fnote = R===1?"Riesgo 1: tratamiento especial":"Sin valor en cuadro";
    const A = (Qm>0 && PA[R]) ? PA[R][iA] : null;
    const colB = hasB ? ((PB[R] && opt.r2===false) ? R : 2) : R;
    const B = (Qm>0 && hasB && PB[colB]) ? PB[colB][iB] : null;
    const Anum = A && A!=="a det." ? parseInt(A) : 0;
    const Bnum = B && B!=="a det." ? parseInt(B) : 0;
    const Areq = Math.max(Anum,1), Breq = hasB ? Math.max(Bnum,5) : 0;            // punto 7.1.1: mínimo 1A y 5B
    const nPorSector = Math.max(1, Math.ceil(sup/M2_EXT - 1e-9));                 // D56 = C56/C57
    const nsec = +s.nsec||1;
    const nReq = nPorSector*nsec;
    // medios de salida
    const uso = +s.uso||30;
    const Nper = sup/uso;                                                         // G72
    const Nlibre = Nper*LIBRE;                                                    // G74
    const uas = Nper/UAS_BASE;                                                    // D72
    const viaUnica = uas<3;                                                       // B74
    const Npers = Math.ceil(Nper-1e-9);
    const nraw = Npers/100; let n = Math.floor(nraw) + ((nraw%1)>=0.5?1:0); n = Math.max(n,2);
    const ancho = 1.10 + 0.45*(n-2);
    // cumplimiento
    const inst = s.inst||null;
    const instP = inst ? parsePot(inst.pot) : null;
    let cumple = "sin";                                                           // sin|ok|no|espuma
    let cumpleDet = "";
    if(inst){
      const totInst = inst.tot;
      const cantOk = totInst >= nReq - 1e-9;
      if(inst.espuma){ cumple = cantOk ? "espuma" : "no"; cumpleDet = "Equipo de espuma: la planilla no declara potencial"; }
      else {
        const potOk = !instP || (instP.A>=Areq && instP.B>=Breq);
        cumple = (cantOk && potOk) ? "ok" : "no";
        const msg=[]; if(!cantOk) msg.push(`faltan ${nReq-totInst>0?(nReq-totInst).toLocaleString("es-AR"):0} equipo(s)`); if(!potOk) msg.push(`potencial menor a ${Areq}A ${Breq?Breq+"B":""}`);
        cumpleDet = msg.join(" · ");
      }
    } else { cumple = "sin"; cumpleDet = "Sin extintor declarado"; }
    const necPlan = inst ? parsePot(inst.nec) : null;
    const dif = (necPlan && Qm>0) ? {A:necPlan.A-Anum, B:necPlan.B-Bnum} : null;
    const res = {mats,sup,Ptot,Qm,QmA,QmB,Pem,Qf,QfT,qa,qb,R,iT,iA,iB,hasB,F,Fnote,A,B,colB,Anum,Bnum,Areq,Breq,
            nPorSector,nsec,nReq,uso,Nper,Nlibre,uas,viaUnica,Npers,n,ancho,inst,instP,cumple,cumpleDet,necPlan,dif,
            clasif:clasifPlanilla(Qf), clasifT:clasifPlanilla(QfT), vacio:Qm===0};
    res.rec = recomendar(s,res);
    return res;
  }

  function calcProyecto(p, opt){
    const filas = p.sectores.map(s=>({s, r:calc(s,opt)}));
    const conCarga = filas.filter(f=>!f.r.vacio);
    const max = conCarga.reduce((a,f)=>f.r.Qf>a.r.Qf?f:a, conCarga[0]);
    const kcal = filas.reduce((a,f)=>a+f.r.Qm*f.r.nsec,0);
    const kg = filas.reduce((a,f)=>a+f.r.Ptot*f.r.nsec,0);
    const req = filas.reduce((a,f)=>a+(f.r.vacio?0:f.r.nReq),0);
    const inst = filas.reduce((a,f)=>a+(f.r.inst?f.r.inst.tot:0),0);
    const personas = filas.reduce((a,f)=>a+f.r.Npers*f.r.nsec,0);
    const sinCumplir = filas.filter(f=>!f.r.vacio&&(f.r.cumple==="no"||f.r.cumple==="sin")).length;
    return {filas, max, kcal, kg, req, inst, personas, sinCumplir, sectores:p.sectores.length,
            sectoresTot: p.sectores.reduce((a,s)=>a+(+s.nsec||1),0), m2: p.sectores.reduce((a,s)=>a+s.sup*(+s.nsec||1),0)};
  }

  /* hallazgos de las planillas: cada uno con severidad y celda de origen */
  function hallazgos(p){
    const out = [];
    const f = calcProyecto(p).filas;
    f.forEach(({s,r})=>{
      if(r.vacio) out.push({sev:"baja",sec:s.n,t:"Sin cantidad por criterio",d:"El peso de combustible en la boca de pozo no se puede determinar, por eso se deja vacío (Qf no determinado). El ataque ante un incendio lo realiza el personal de bomberos de la operadora, no el equipo.",celda:"D13:D14"});
      s.mats.forEach(m=>{
        const ref = CAT.find(c=>c.id===m.id);
        if(ref && m.pci>0 && (m.pci < ref.pci*0.5 || m.pci > ref.pci*1.8) && m.kg>0)
          out.push({sev:"alta",sec:s.n,t:`PCI sospechoso: ${m.n}`,d:`La planilla usa ${m.pci.toLocaleString("es-AR")} kcal/kg y la referencia es ${ref.pci.toLocaleString("es-AR")}. ${m.id==="grasa"?"Parece cargado en Mcal o con un dígito perdido.":"Se repite 7.839 en otras hojas: parece un error de tipeo."} Activá «Corregir PCI» para ver el efecto.`,celda:"E"+(13+s.mats.indexOf(m))});
      });
      if(r.necPlan && r.dif && (r.dif.A!==0 || r.dif.B!==0))
        out.push({sev:"media",sec:s.n,t:"Potencial necesario distinto a la tabla",d:`La planilla anota ${s.inst.nec}; el Anexo VII da ${r.Anum}A${r.hasB?" "+r.Bnum+"B":""} para Qf ${r.Qf.toLocaleString("es-AR",{maximumFractionDigits:1})} kg/m² y riesgo ${r.R} (el valor está escrito a mano, no sale de una fórmula).`,celda:"C66"});
      if(s.inst && s.inst.tot%1!==0)
        out.push({sev:"alta",sec:s.n,t:"Total de extintores fraccionario",d:`E63 = C61/F9 = ${s.inst.cant} / ${s.nsec} = ${s.inst.tot}. Un sector no puede tener medio extintor: la fórmula divide cuando debería multiplicar (como en la hoja de trailers).`,celda:"E63"});
      if(r.nsec>1 && r.QfT>r.Qf+1e-9){
        const ca = r.clasifT !== r.clasif;
        out.push({sev:ca?"media":"baja",sec:s.n,t:"Qf total multiplicada por la cantidad de sectores",d:`D28 = Qf × ${r.nsec} = ${r.QfT.toLocaleString("es-AR",{maximumFractionDigits:1})} kg/m². La carga de fuego se calcula por sector, no se suma entre sectores iguales.${ca?` Con ese valor la clasificación pasaría de ${r.clasif} a ${r.clasifT}.`:""}`,celda:"D28"});
      }
    });
    out.push({sev:"media",sec:"Todas las hojas",t:"Clasificación escrita a mano",d:"El texto LEVE / COMÚN / MAYOR (F23, G25:G27) es un valor tipeado y no cambia cuando cambia Qf. Acá se calcula con las mismas reglas: menos de 60, de 60 a 120 y más de 120 kg/m².",celda:"F23"});
    out.push({sev:"baja",sec:"Todas las hojas",t:"Superficie de escape con constante fija",d:"G74 en trailers es =2*0,8 (número escrito dentro de la fórmula) en vez de apuntar a G72. Si cambia la superficie, no se actualiza.",celda:"G74"});
    return out;
  }

  return {PCAL_MADERA,M3_AGUA,MCAL,UAS_BASE,LIBRE,M2_EXT,CATS,CAT,DATOS,calc,calcProyecto,hallazgos,parsePot,clasifPlanilla,RANGOS,FNAT,FMEC,PA,PB,USOS,idx};
})();
if (typeof module !== "undefined") module.exports = PL;
