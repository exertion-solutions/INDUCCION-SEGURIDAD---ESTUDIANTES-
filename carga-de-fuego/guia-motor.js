/* Motor de cálculo compartido: constantes del Anexo VII (Dec. 351/79) y cálculo por sector. */
var FF = (function(){
  const LIB = {
    madera:{n:"Madera (pallets, estanterías)",c:"A",u:"kg",pci:4400,est:"of",src:"Patrón del decreto (18,41 MJ/kg)",img:"madera",col:"--m-madera"},
    carton:{n:"Cartón (cajas)",c:"A",u:"kg",pci:4000,est:"se",src:"TP IAS 2023",img:"carton",col:"--m-carton"},
    papel:{n:"Papel (archivo)",c:"A",u:"kg",pci:4400,est:"se",src:"TP IAS 2023 (4.000 a 4.400)",img:"papel",col:"--m-papel"},
    caucho:{n:"Neumáticos / caucho",c:"A",u:"kg",pci:10000,est:"ve",src:"UTN FRRQ; podría ser menor",img:"caucho",col:"--m-caucho"},
    film:{n:"Film de polietileno",c:"A",u:"kg",pci:10000,est:"se",src:"TP IAS 2023",img:"film",col:"--m-film"},
    gasoil:{n:"Gasoil",c:"B",u:"l",dens:0.84,pci:10000,est:"se",src:"UTN FRRQ; densidad a verificar",img:"liquidos",col:"--m-gasoil",inflam:2},
    aceite:{n:"Aceite lubricante",c:"B",u:"l",dens:0.88,pci:9500,est:"ve",src:"Informe TdF 2026",img:"liquidos",col:"--m-aceite"},
    algodon:{n:"Algodón",c:"A",u:"kg",pci:3980,est:"se",src:"UTN FRRQ",col:"--m-otro"},
    lana:{n:"Lana",c:"A",u:"kg",pci:4940,est:"se",src:"UTN FRRQ",col:"--m-otro"},
    pvc:{n:"PVC",c:"A",u:"kg",pci:5000,est:"se",src:"UTN FRRQ",col:"--m-otro"},
    nafta:{n:"Nafta",c:"B",u:"l",dens:0.74,pci:10000,est:"ve",src:"UTN FRRQ; densidad a verificar",col:"--m-otro",inflam:1},
    glp:{n:"GLP",c:"B",u:"kg",pci:11000,est:"se",src:"≈ 46 MJ/kg",col:"--m-otro",inflam:1}
  };
  const EJEMPLO = [["madera",1200],["carton",800],["papel",300],["caucho",600],["film",150],["gasoil",400],["aceite",600]];
  const RIESGOS = [[1,"Explosivos"],[2,"Inflamables"],[3,"Muy combustibles"],[4,"Combustibles"],[5,"Poco combustibles"],[6,"Incombustibles"],[7,"Refractarios"]];
  const RANGOS = ["hasta 15","16 a 30","31 a 60","61 a 100","más de 100"];
  const FNAT = {2:["F 60","F 90","F 120","F 180","F 180"],3:["F 30","F 60","F 90","F 120","F 180"],4:["F 30","F 30","F 60","F 90","F 120"],5:["—","F 30","F 30","F 60","F 90"]};
  const FMEC = {2:["NP","NP","NP","NP","NP"],3:["F 60","F 90","F 120","F 180","NP"],4:["F 60","F 60","F 90","F 120","F 180"],5:["F 30","F 60","F 60","F 90","F 120"]};
  const PA = {3:["1A","2A","3A","6A","a det."],4:["1A","1A","2A","4A","a det."],5:["1A","1A","1A","3A","a det."]};
  const PB = {2:["6B","8B","10B","20B","a det."],3:["4B","6B","8B","10B","a det."]};
  const USOS = [[30,"Depósito"],[16,"Edificio industrial"],[8,"Oficinas, bancos, clínicas"],[3,"Comercio, mercado, restaurante"],[5,"Gimnasio"],[2,"Educación, culto, salas de juego"],[1,"Salas de asambleas y de baile"],[12,"Vivienda"],[20,"Hotel, pisos superiores"]];
  const idx = q => q<=15?0 : q<=30?1 : q<=60?2 : q<=100?3 : 4;
  const fmt = (x,d=0) => Number(x||0).toLocaleString("es-AR",{minimumFractionDigits:d,maximumFractionDigits:d});

  /* mats: [{n,c,u,dens,pci,q,inflam}] ; s: {sup, uso, vent, R, r2} */
  function calc(mats, s){
    const items = mats.map(m=>{ const q=+m.q||0; const kg = m.u==="l" ? q*(+m.dens||0) : q; return Object.assign({}, m, {q, kg, kcal: kg*(+m.pci||0)}); });
    const tot = items.reduce((a,b)=>a+b.kcal,0);
    const totA = items.filter(i=>i.c==="A").reduce((a,b)=>a+b.kcal,0);
    const totB = tot-totA;
    const S = +s.sup>0 ? +s.sup : 1;
    const qf = tot/(4400*S), qa = totA/(4400*S), qb = totB/(4400*S);
    const hasB = items.some(i=>i.c==="B" && i.q>0);
    const inflam1 = items.some(i=>i.inflam===1 && i.q>0);
    const R = +s.R||3;
    const iT = idx(qf), iA = idx(qa), iB = idx(qb);
    let F = "—", Fnote = "";
    const tab = s.vent==="mec" ? FMEC : FNAT;
    if (tab[R]) F = tab[R][iT];
    else Fnote = R===1 ? "Riesgo 1: solo se considera fuente de ignición; requiere tratamiento especial." : "Los cuadros no fijan F para riesgo "+R+".";
    const A = PA[R] ? PA[R][iA] : null;
    const colB = (hasB && s.r2!==false) ? 2 : R;
    const B = PB[colB] ? PB[colB][iB] : null;
    const Anum = A && A!=="a det." ? parseInt(A) : 1;
    const Bnum = Math.max(B && B!=="a det." ? parseInt(B) : 0, 5);
    const nExt = Math.ceil(S/200 - 1e-9);
    const uso = +s.uso || 30;
    const N = Math.ceil(S/uso - 1e-9);
    const nraw = N/100; let n = Math.floor(nraw) + ((nraw%1)>=0.5?1:0); n = Math.max(n,2);
    const ancho = 1.10 + 0.45*(n-2);
    const salidas = n<4 ? 1 : Math.ceil(n/4+1-1e-9);
    const Fmin = /^F \d+/.test(F) ? parseInt(F.slice(2)) : null;
    return {items,tot,totA,totB,qf,qa,qb,hasB,inflam1,R,iT,iA,iB,F,Fmin,Fnote,A,B,colB,Anum,Bnum,nExt,uso,N,nraw,n,ancho,salidas,S};
  }
  return {LIB,EJEMPLO,RIESGOS,RANGOS,FNAT,FMEC,PA,PB,USOS,idx,fmt,calc};
})();
if (typeof module !== "undefined") module.exports = FF;
