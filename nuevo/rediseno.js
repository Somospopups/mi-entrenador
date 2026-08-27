/* ════════════════════════════════════════════════════════════
   MI ENTRENADOR · REDISEÑO (módulo nuevo)
   Pantallas nuevas para ENTRENADOR (lista, ficha, finanzas,
   constructor de planes) y ALUMNO (mazo a pantalla completa).
   Convive con index.html: usa sus globals (sesion, Backend,
   planDe, LIBRERIA, etc.) y se monta encima con z-index alto.
   ════════════════════════════════════════════════════════════ */
'use strict';
(function(){
var R = {};
window.Rediseno = R;

/* ── utilidades ── */
function $(id){ return document.getElementById(id); }
function rEl(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
function inicial(n){ return (n||'?').trim().charAt(0).toUpperCase(); }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function rPlata(n){ return '$ ' + Number(n||0).toLocaleString('es-AR'); }
function rFecha(ms){ var d=new Date(ms); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }
function rGuardar(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function rLeer(k,d){ try{ var v=JSON.parse(localStorage.getItem(k)); return v==null?d:v; }catch(e){ return d; } }
var rToastTimer=null;
function rToast(msg, root){
  root = root || document.body;
  var t = root.querySelector('.r-toast');
  if (!t){ t = rEl('<div class="r-toast"></div>'); root.appendChild(t); }
  t.textContent = msg; t.classList.add('ver');
  clearTimeout(rToastTimer);
  rToastTimer = setTimeout(function(){ t.classList.remove('ver'); }, 2100);
}
function rAbrirVelo(velo){ velo.classList.add('abierto'); }
function rCerrarVelo(velo){ velo.classList.remove('abierto'); }
function rWaLink(tel, texto){
  var d = String(tel||'').replace(/\D/g,'').replace(/^0+/,'');
  if (d.length===10) d='549'+d; else if (d.length===12 && d.indexOf('54')===0) d='549'+d.slice(2);
  if (d.length<11) return null;
  return 'https://wa.me/'+d+'?text='+encodeURIComponent(texto);
}
function rManchas(){ return '<div class="r-manchas"><i></i><i></i><i></i></div>'; }

/* ── categorías de la librería ── */
function rCategoria(nombre){
  var n = nombre.toLowerCase();
  if (/cinta|bicicleta|soga|saltos|escalador|estiramiento/.test(n)) return 'cardio';
  if (/sentadilla|peso muerto|estocada|prensa|glúteo|gluteo|hip thrust|hip-trust|cuádriceps|cuadriceps|femoral|talones|gemelo/.test(n)) return 'piernas';
  if (/remo|dominada|jalón|jalon|curl|martillo|concentrado/.test(n)) return 'traccion';
  if (/plancha|abdominal|giro ruso|superman|elevación de piernas|elevacion de piernas|cruzados|core/.test(n)) return 'core';
  return 'empuje'; /* press, flexiones, aperturas, vuelos, fondos, tríceps, encogimientos */
}
R.CATS = [['todo','Todos'],['piernas','Piernas'],['empuje','Pecho y hombros'],
          ['traccion','Espalda y brazos'],['core','Abdomen'],['cardio','Cardio'],['mios','Míos']];
function rLibreria(){
  var base = LIBRERIA.map(function(e){
    return { n:e.n, img:e.img, img2:e.img2, img3:e.img3, cat:rCategoria(e.n), propio:false, emoji:'' };
  });
  return base.concat(rPropios());
}
function clavePropios(){ return CONFIG.CLAVE_DATOS+'_ejpropios_'+(sesion?sesion.id:'x'); }
function rPropios(){ return rLeer(clavePropios(), []); }
function rImgsEj(e){
  if (e.emoji && !e.img) return [];
  if (e.img && e.img2 && e.img3) return [e.img, e.img3, e.img2, e.img3];
  if (e.img && e.img2) return [e.img, e.img2];
  return e.img ? [e.img] : [];
}

/* ════════════════════════════════════════════════════════════
   ESPACIO DEL ENTRENADOR
   ════════════════════════════════════════════════════════════ */
var T = R.entrenador = {
  alumnos: [], usuario: null, pantalla: 'lista',
  finanzas: { pagos: [] }
};

function rCobrosKey(){ return CONFIG.CLAVE_DATOS+'_cobros_'+(sesion?sesion.id:'x'); }
function rCobros(){ return rLeer(rCobrosKey(), []); }
function rGuardarCobros(p){ rGuardar(rCobrosKey(), p); }
function rNubeOk(){ return !!(window.Backend && Backend.registrarCobroNube); }
function rEsDemoId(id){ return String(id||'').indexOf('demo_')===0; }
function rNuevoDedup(){ return 'c'+Date.now()+Math.floor(Math.random()*1e6); }

/* sube un cobro puntual a la nube (fuego y olvido); los demo no suben */
function rSubirCobro(c){
  if (!rNubeOk() || rEsDemoId(c.alumnoId)) return;
  Backend.registrarCobroNube(c.alumnoId, c.alumno, c.monto, c.dedup).then(function(r){
    if (r && r.ok){ var ps=rCobros().map(function(x){ return x.dedup===c.dedup ? Object.assign({},x,{_nube:true}) : x; }); rGuardarCobros(ps); }
  }).catch(function(){});
}
/* sincroniza cobros con la nube: trae los de otros dispositivos y sube los pendientes */
async function rSyncCobros(){
  if (!rNubeOk()) return;
  try{
    var r = await Backend.listarCobrosNube();
    if (r && r.error) return;
    var locales = rCobros().slice();
    (r.cobros||[]).forEach(function(nc){
      if (!locales.some(function(x){ return x.dedup===nc.dedup; })) locales.push(nc);
    });
    rGuardarCobros(locales);
    // subir pendientes (sin marca _nube y que no sean demo)
    var pend = locales.filter(function(x){ return !x._nube && !rEsDemoId(x.alumnoId) && x.dedup; });
    for (var i=0;i<pend.length;i++){
      var rr = await Backend.registrarCobroNube(pend[i].alumnoId, pend[i].alumno, pend[i].monto, pend[i].dedup);
      if (rr && rr.ok){ var dd=pend[i].dedup;
        var ps=rCobros().map(function(x){ return x.dedup===dd ? Object.assign({},x,{_nube:true}) : x; }); rGuardarCobros(ps); }
    }
  }catch(e){}
}
/* sincroniza ejercicios propios con la nube */
async function rSyncPropios(){
  if (!window.Backend || !Backend.guardarEjpropioNube) return;
  try{
    var r = await Backend.listarEjpropiosNube();
    if (r && r.error) return;
    var locales = rPropios().slice();
    (r.propios||[]).forEach(function(np){
      if (!locales.some(function(x){ return String(x.n).toLowerCase()===String(np.n).toLowerCase(); })) locales.push(np);
    });
    rGuardar(clavePropios(), locales);
    var pend = locales.filter(function(x){ return !x._nube; });
    for (var i=0;i<pend.length;i++){
      var rr = await Backend.guardarEjpropioNube(pend[i].n, pend[i].emoji||'🏋️', pend[i].cat||'mios');
      if (rr && rr.ok){ var nm=String(pend[i].n).toLowerCase();
        var ps=rPropios().map(function(x){ return String(x.n).toLowerCase()===nm ? Object.assign({},x,{_nube:true}) : x; });
        rGuardar(clavePropios(), ps); }
    }
  }catch(e){}
}
function rSyncNube(){ rSyncCobros().then(function(){ try{ rHeadCobros(); if(T.pantalla==='finanzas') rPintarFinanzas(); }catch(e){} }); rSyncPropios(); }

/* ── Sincronización INMEDIATA de la lista de alumnos entre dispositivos ──
   Si la PC tiene abierta la lista y crean un alumno desde el celu,
   la lista se refresca sola (al volver a la pestaña, al recuperar foco
   y con un chequeo corto mientras está abierta). No toca nada si estás
   escribiendo, con una hoja abierta o en otra pantalla. */
var rLiveInit = false, rLiveTimer = null;
async function rRefrescoVivo(){
  try{
    var app = $('rAppProfe');
    if (!app || !app.classList.contains('ver')) return;          // no está el entrenador en pantalla
    if (T.pantalla !== 'lista') return;                          // solo en la lista de alumnos
    if (app.querySelector('.r-velo.abierto')) return;            // hay una hoja (alta/cobro) abierta
    var busca = $('rBuscaAlu');
    if (busca && (document.activeElement === busca)) return;     // estás escribiendo en el buscador
    var antes = (T.alumnos||[]).length;
    var lista = await rListarAlumnos();
    var despues = lista.length;
    T.alumnos = lista;
    if (despues !== antes || !rLivePintada){
      var scrollY = app.scrollTop || 0;
      await rPintarAlumnos(busca ? busca.value : '');
      app.scrollTop = scrollY;
      rLivePintada = true;
    }
  }catch(e){}
}
var rLivePintada = false;
function rIniciarLive(){
  if (rLiveInit) return; rLiveInit = true;
  document.addEventListener('visibilitychange', function(){ if (document.visibilityState==='visible'){ rRefrescoVivo(); rSyncNube(); } });
  window.addEventListener('focus', function(){ rRefrescoVivo(); rSyncNube(); });
  window.addEventListener('pageshow', function(){ rRefrescoVivo(); rSyncNube(); });
  rLiveTimer = setInterval(function(){ if (document.visibilityState==='visible') rRefrescoVivo(); }, 8000);
}

/* ── alumnos de PRUEBA (demo) ──
   El dueño/administrador puede ser "cargado como alumno" por los entrenadores
   para probar, SIN tocar su cuenta real: estos alumnos viven solo en el
   dispositivo del profe (localStorage), nunca se suben a Supabase. */
var DNI_DEMO = ['33245911'];   // DNI del dueño · se puede ampliar
function esDniDemo(dni){
  var d = String(dni||'').replace(/\D/g,'');
  return DNI_DEMO.some(function(x){ return x===d; });
}
function rDemoKey(){ return CONFIG.CLAVE_DATOS+'_demoAlumnos_'+(sesion?sesion.id:'x'); }
function rDemoAlumnos(){
  var arr = rLeer(rDemoKey(), []);
  return arr.map(function(u){
    u.demo = true; u.activo = true;
    u.plan = rLeer(rDemoPlanKey(u.id), null);
    u.hechos = {};
    return u;
  });
}
function rDemoPlanKey(id){ return CONFIG.CLAVE_DATOS+'_demoPlan_'+(sesion?sesion.id:'x')+'_'+id; }
function rGuardarDemoAlumno(u){
  var arr = rLeer(rDemoKey(), []).filter(function(x){ return x.id!==u.id; });
  arr.push({ id:u.id, dni:u.dni, nombre:u.nombre, telefono:u.telefono||'', rol:'alumno' });
  rGuardar(rDemoKey(), arr);
}

function rEstadoAlumno(u){
  if (!u.activo) return ['gris','Cuenta desactivada'];
  var plan = planDe(u);
  if (!planTieneAlgo(plan)) return ['rojo','Todavía no tiene plan'];
  var fechas = Object.keys(u.hechos||{}).sort().reverse();
  var ult = null;
  for (var i=0;i<fechas.length;i++){
    var marcas = u.hechos[fechas[i]]||{};
    if (Object.keys(marcas).some(function(k){ return k.indexOf('p:')!==0 && marcas[k]!==undefined; })){ ult = fechas[i]; break; }
  }
  if (!ult) return ['ambar','Con plan · todavía no entrenó'];
  var dd = Math.floor((Date.now() - Date.parse(ult+'T12:00:00'))/86400000);
  if (dd<=0) return ['ok','Entrenó hoy · plan al día'];
  if (dd<=3)  return ['ok','Entrenó hace '+dd+' día'+(dd===1?'':'s')];
  if (dd<=7)  return ['ambar','No entrena hace '+dd+' días'];
  return ['rojo','No entrena hace '+dd+' días'];
}

function rRenderEntrenador(){
  if (!$('rAppProfe')){
    document.body.appendChild(rEl(
      '<div class="r-app" id="rAppProfe">'+rManchas()+
        '<div id="rPantLista"></div>'+
        '<div id="rPantFicha" style="display:none"></div>'+
        '<div id="rPantFin" style="display:none"></div>'+
      '</div>'));
  }
  var app = $('rAppProfe');
  app.classList.add('ver');
  rIniciarLive();
  rIrPantalla('lista');
  try{ rSyncNube(); }catch(e){}   // cobros y ejercicios propios: nube + local
}
function rIrPantalla(cual){
  T.pantalla = cual;
  var pc = rEsDesktop();
  if (pc){
    // En PC la lista (con el panel derecho) siempre está; finanzas es pantalla aparte.
    $('rPantLista').style.display = (cual==='finanzas') ? 'none' : 'block';
    $('rPantFicha').style.display = 'none';               // en PC la ficha vive en rColDer
    $('rPantFin').style.display = (cual==='finanzas') ? 'block' : 'none';
    if (cual==='finanzas') rPintarFinanzas();
    else { rPintarLista(); }   // pinta la lista y el panel derecho según T.pantalla/usuario
  } else {
    $('rPantLista').style.display = (cual==='lista') ? 'block' : 'none';
    $('rPantFicha').style.display = (cual==='ficha') ? 'block' : 'none';
    $('rPantFin').style.display = (cual==='finanzas') ? 'block' : 'none';
    if (cual==='lista') rPintarLista();
    if (cual==='ficha') rPintarFicha();
    if (cual==='finanzas') rPintarFinanzas();
  }
}

function rEsDesktop(){ try{ return window.matchMedia && window.matchMedia('(min-width:720px)').matches; }catch(e){ return false; } }

/* ── pantalla: lista de alumnos ── */
function rPintarLista(){
  var wrap = $('rPantLista');
  var nombre = (sesion.nombre.split(' ')[0]||'Profe');
  wrap.innerHTML =
    '<div class="r-head"><h1>Hola, '+esc(nombre)+'<small class="r-sub">Mis alumnos</small></h1>'+
      '<button class="r-pill head" id="rBtnFin" style="margin-left:auto">💰 Finanzas · <b id="rTotalHead">$0</b></button>'+
      '<button class="r-sync-btn" id="rBtnSync" title="Sincronizar con la nube">🔄</button>'+
      '<button class="r-salir-btn" id="rBtnSalir" title="Cerrar sesión">🚪</button>'+
    '</div>'+
    '<div class="r-escritorio">'+
      '<div class="r-col-izq">'+
        '<input class="r-busca" id="rBuscaAlu" placeholder="Buscar alumno…">'+
        '<div class="r-lista" id="rListaAlu"></div>'+
        '<div class="r-barra"><button class="r-btn-prin" id="rBtnAgregar"><span style="font-size:19px">+</span> Agregar alumno</button></div>'+
      '</div>'+
      '<div class="r-col-der" id="rColDer"></div>'+
    '</div>';
  $('rBtnFin').onclick = function(){ rIrPantalla('finanzas'); };
  $('rBtnSalir').onclick = function(){ if (confirm('¿Cerrar tu sesión?')) salir(); };
  $('rBtnSync').onclick = function(){ rSincronizarAhora(this); };
  $('rBtnAgregar').onclick = function(){ rHojaAlta(); };
  $('rBuscaAlu').addEventListener('input', function(){ rPintarAlumnos(this.value); });
  rPintarAlumnos('');
  rHeadCobros();
  if (rEsDesktop() && T.usuario && T.pantalla==='ficha'){ rRenderDetalleDer(); }
  else if (rEsDesktop()){ var d=$('rColDer'); if(d) d.innerHTML = rDetalleVacio(); }
}
/* Tras guardar un plan: en PC refresca el panel derecho; en celu vuelve a la ficha. */
function rVolverFicha(){
  if (rEsDesktop()){ T.pantalla='ficha'; rRenderDetalleDer(); }
  else rIrPantalla('ficha');
}
function rDetalleVacio(){
  return '<div class="r-der-vacio"><div class="r-g">👈</div><b>Seleccioná un alumno</b><br>Elegí alguien de la lista para ver su ficha y crear su plan.</div>';
}
function rRenderDetalleDer(){
  var der = $('rColDer');
  if (!der){ rPintarLista(); return; }
  var u = T.usuario;
  if (!u){ der.innerHTML = rDetalleVacio(); return; }
  der.innerHTML = rFichaHTML(u, false);
  rConectarFicha(der, u);
}
/* botón manual: force-fetch de alumnos + cobros + propios, con feedback */
async function rSincronizarAhora(btn){
  if (btn){ btn.disabled = true; var viejo = btn.textContent; btn.textContent = '⏳'; btn.classList.add('girando'); }
  try{
    if (typeof rSyncCobros === 'function') await rSyncCobros();
    if (typeof rSyncPropios === 'function') await rSyncPropios();
    var lista = await rListarAlumnos();
    T.alumnos = lista;
    if (T.pantalla === 'lista'){
      var busca = $('rBuscaAlu');
      await rPintarAlumnos(busca ? busca.value : '');
    }
    try{ rHeadCobros(); if(T.pantalla==='finanzas') rPintarFinanzas(); }catch(e){}
    rToast('✓ Sincronizado con la nube', $('rAppProfe'));
  }catch(e){
    rToast('No se pudo sincronizar. Revisá tu conexión.', $('rAppProfe'));
  }finally{
    if (btn){ btn.disabled = false; btn.textContent = viejo; btn.classList.remove('girando'); }
  }
}
R.rSincronizarAhora = rSincronizarAhora;
async function rListarAlumnos(){
  var reales = await Backend.listarUsuarios();
  var demo = rDemoAlumnos().filter(function(d){
    return !reales.some(function(u){ return String(u.dni).replace(/\D/g,'')===String(d.dni).replace(/\D/g,''); });
  });
  return demo.concat(reales);
}
async function rPintarAlumnos(filtro){
  T.alumnos = await rListarAlumnos();
  var f = (filtro||'').toLowerCase();
  var lista = T.alumnos.filter(function(u){
    return !f || u.nombre.toLowerCase().indexOf(f)>=0 || String(u.dni).indexOf(f.replace(/\D/g,''))>=0;
  }).sort(function(a,b){ return a.nombre.localeCompare(b.nombre); });
  $('rListaAlu').innerHTML = lista.map(function(u,i){
    var e = u.demo ? ['ambar','🧪 Alumno de prueba'] : rEstadoAlumno(u);
    var sel = (T.usuario && T.usuario.id===u.id) ? ' r-sel' : '';
    return '<button class="r-alumno'+sel+'" data-id="'+u.id+'" style="animation-delay:'+(i*45)+'ms">'+
      '<span class="r-avatar">'+inicial(u.nombre)+'</span>'+
      '<span class="r-info"><b>'+esc(u.nombre)+'</b>'+
      '<small class="st-'+e[0]+'"><span class="r-puntito"></span>'+e[1]+'</small></span>'+
      '<span class="r-flecha">›</span></button>';
  }).join('') || '<p class="r-vacio">Ningún alumno con ese nombre.</p>';
  $('rListaAlu').querySelectorAll('[data-id]').forEach(function(b){
    b.onclick = function(){
      T.usuario = T.alumnos.find(function(x){ return x.id===b.getAttribute('data-id'); });
      if (rEsDesktop()){
        T.pantalla='ficha';
        $('rListaAlu').querySelectorAll('.r-alumno').forEach(function(x){ x.classList.toggle('r-sel', x===b); });
        rRenderDetalleDer();
      } else {
        rIrPantalla('ficha');
      }
    };
  });
  rHeadCobros();
}
function rHeadCobros(){
  var ahora = new Date(), k = ahora.getFullYear()+'-'+ahora.getMonth();
  var total = rCobros().filter(function(p){ var d=new Date(p.fecha); return d.getFullYear()+'-'+d.getMonth()===k; })
    .reduce(function(s,p){ return s+p.monto; },0);
  var el = $('rTotalHead'); if (el) el.textContent = rPlata(total);
}

/* ── pantalla: ficha del alumno ── */
function rFichaHTML(u, conAtras){
  return (conAtras
      ? '<div class="r-head"><button class="r-atras" id="rFichaAtras">‹</button><h1 style="font-size:17px">Ficha del alumno</h1></div>'
      : '<div class="r-head"><h1 style="font-size:19px">'+esc(u.nombre)+'<small class="r-sub">Ficha del alumno</small></h1></div>')+
    '<div class="r-ficha-top">'+
      '<div class="r-cred"><span class="r-avatar">'+inicial(u.nombre)+'</span>'+
      '<div style="flex:1"><b>'+esc(u.nombre)+'</b><small>DNI '+esc(u.dni)+(u.telefono?' · '+esc(u.telefono):'')+'</small>'+
      '<div><button class="r-chato" id="rFWsp">WhatsApp</button>'+
      (u.demo?'':'<button class="r-chato" id="rFClave">Blanquear clave</button>')+
      (u.demo?'<span style="font-size:11px;font-weight:700;color:#d97706">🧪 Alumno de prueba · los datos quedan en este dispositivo</span>':'')+
      '</div></div></div>'+
      '<button class="r-btn-prin" id="rFCrear"><span style="font-size:18px">+</span> Crear plan nuevo</button>'+
      '<button class="r-btn-abono" id="rFAbono">💵 Registrar abono mensual</button>'+
    '</div>'+
    '<div class="r-tabs"><button class="r-tab activa" data-tab="planes">Planes anteriores</button>'+
      '<button class="r-tab" data-tab="progreso">Progreso</button></div>'+
    '<div class="r-contenido" id="rFPlanes"></div>'+
    '<div class="r-contenido" id="rFProg" style="display:none"></div>';
}
function rConectarFicha(wrap, u){
  var atras = wrap.querySelector('#rFichaAtras');
  if (atras) atras.onclick = function(){ rIrPantalla('lista'); };
  wrap.querySelector('#rFCrear').onclick = function(){ R.builder.abrir(u); };
  wrap.querySelector('#rFAbono').onclick = function(){ rHojaCobro(u); };
  var btnWsp = wrap.querySelector('#rFWsp');
  if (btnWsp) btnWsp.onclick = function(){
    var link = rWaLink(u.telefono, '¡Hola '+(u.nombre.split(' ')[0]||'')+'! ');
    if (!link){ rToast('Este alumno no tiene WhatsApp cargado', $('rAppProfe')); return; }
    window.open(link, '_blank');
  };
  var btnClave = wrap.querySelector('#rFClave');
  if (btnClave) btnClave.onclick = function(){
    if (!confirm('¿Blanquear la contraseña?\n\n'+u.nombre+' tendrá que elegir una nueva en su próximo ingreso.')) return;
    Backend.blanquearPassword(u.id).then(function(r){
      if (r.error){ rToast(r.error, $('rAppProfe')); return; }
      rHojaCredencial(u, r.password);
    });
  };
  wrap.querySelectorAll('[data-tab]').forEach(function(b){
    b.onclick = function(){
      wrap.querySelectorAll('[data-tab]').forEach(function(x){ x.classList.toggle('activa', x===b); });
      var cual = b.getAttribute('data-tab');
      wrap.querySelector('#rFPlanes').style.display = cual==='planes' ? 'block' : 'none';
      wrap.querySelector('#rFProg').style.display = cual==='progreso' ? 'block' : 'none';
      if (cual==='progreso') rPintarProgFicha(u);
    };
  });
  rPintarPlanesFicha(u);
  rActualizarBotonAbono(u);
}
function rPintarFicha(){
  var u = T.usuario; if (!u) return rIrPantalla('lista');
  var wrap = $('rPantFicha');
  wrap.innerHTML = rFichaHTML(u, true);
  rConectarFicha(wrap, u);
}
function rActualizarBotonAbono(u){
  var btn = $('rFAbono'); if (!btn) return;
  var ahora = new Date(), k = ahora.getFullYear()+'-'+ahora.getMonth();
  var pago = rCobros().filter(function(p){
    var d=new Date(p.fecha); return p.alumnoId===u.id && (d.getFullYear()+'-'+d.getMonth())===k;
  }).sort(function(a,b){ return b.fecha-a.fecha; })[0];
  btn.textContent = pago ? ('✓ Abono pagado · '+rPlata(pago.monto)+' el '+rFecha(pago.fecha)+' (otro)') : '💵 Registrar abono mensual';
}
function rPintarPlanesFicha(u){
  var c = $('rFPlanes');
  var bloques = [];
  var actual = soloDiasPlan(planDe(u));
  if (planTieneAlgo(actual)) bloques.push({ tit:'Plan actual', plan:actual, abierto:true });
  var ant = (u.plan && u.plan.__anterior) ? u.plan.__anterior : null;
  if (ant && planTieneAlgo(ant)) bloques.push({ tit:'Plan anterior', plan:ant, abierto:false });
  if (!bloques.length){
    c.innerHTML = '<div class="r-vacio"><div class="r-g">📋</div><b>Todavía no hay planes.</b><br>Tocá “Crear plan nuevo” para armar el primero.</div>';
    return;
  }
  c.innerHTML = bloques.map(function(b, bi){
    var dias = DIAS.map(function(d){
      var lista = (b.plan[d[0]]||[]);
      if (!lista.length) return '';
      return '<div class="r-dia-linea"><span class="r-dn">'+DIA_CORTO[d[0]]+'</span>'+
        '<span class="r-de">'+lista.map(function(e){ return esc(e.nombre); }).join(', ')+'</span>'+
        '<span class="r-dx">'+lista.length+' ej.</span></div>';
    }).join('');
    var ndias = DIAS.reduce(function(s,d){ return s + ((b.plan[d[0]]||[]).length?1:0); },0);
    return '<div class="r-semana'+(b.abierto?' abierta':'')+'">'+
      '<button class="r-semana-cab"><span class="r-ico">📅</span><span class="r-d"><b>'+b.tit+'</b>'+
      '<small>'+ndias+' días con entrenamiento</small></span><span class="r-chev">›</span></button>'+
      '<div class="r-semana-dias">'+dias+'</div></div>';
  }).join('');
  c.querySelectorAll('.r-semana-cab').forEach(function(b){
    b.onclick = function(){ b.parentElement.classList.toggle('abierta'); };
  });
}
function soloDiasPlan(p){
  var v = planVacio();
  DIAS.forEach(function(d){ if (Array.isArray(p[d[0]])) v[d[0]] = p[d[0]]; });
  return v;
}
async function rPintarProgFicha(u){
  var c = $('rFProg');
  if (u.demo){
    c.innerHTML = '<div class="r-vacio"><div class="r-g">🧪</div><b>Alumno de prueba.</b><br>Las marcas y el progreso no se guardan: es solo para que pruebes armar planes.</div>';
    return;
  }
  c.innerHTML = '<div class="r-caja">Cargando…</div>';
  var prog;
  try{ prog = await Backend.obtenerProgreso(u.id); }catch(e){ prog = { cargas:{} }; }
  var cargas = prog.cargas || {};
  // racha
  var plan = planDe(u), racha = 0;
  for (var i=0;i<60;i++){
    var t = Date.now()-i*86400000, kd = claveDia(t), f = fechaClave(t);
    var lista = plan[kd]||[]; if (!lista.length) continue;
    var m = (u.hechos&&u.hechos[f])||{};
    var completo = lista.every(function(e){ return m[e.id]!==undefined; });
    if (completo) racha++; else { if (i===0) continue; break; }
  }
  // barras 8 sesiones
  var barras = '';
  for (var j=7;j>=0;j--){
    var tt = Date.now()-j*86400000, kd2 = claveDia(tt), f2 = fechaClave(tt);
    var lista2 = plan[kd2]||[], m2 = (u.hechos&&u.hechos[f2])||{};
    var hechos = lista2.filter(function(e){ return m2[e.id]===true; }).length;
    var pct = lista2.length ? Math.round(hechos/lista2.length*100) : 0;
    barras += '<div style="flex:1;text-align:center"><i style="display:block;height:56px;border-radius:7px;'+
      'background:'+(pct? 'linear-gradient(180deg,var(--c1),var(--c2))':'rgba(124,58,237,.12)')+';position:relative">'+
      '<b style="position:absolute;bottom:4px;left:0;right:0;color:#fff;font-size:9px;font-style:normal">'+(pct?pct+'%':'')+'</b></i>'+
      '<small style="font-size:9px;color:var(--gris)">'+['h7','h6','h5','h4','h3','h2','at','hoy'][7-j]+'</small></div>';
  }
  // últimas cargas
  var fechas = Object.keys(cargas).sort().reverse(), vistos = {}, filas = '';
  for (var fi=0; fi<fechas.length && Object.keys(vistos).length<6; fi++){
    Object.keys(cargas[fechas[fi]]||{}).forEach(function(k){
      if (k.indexOf('p:')===0 && !vistos[k]){ vistos[k]=cargas[fechas[fi]][k]; }
    });
  }
  Object.keys(vistos).forEach(function(k){
    filas += '<div class="r-pago"><span class="r-d" style="flex:1"><b>'+esc(k.slice(2).charAt(0).toUpperCase()+k.slice(3))+'</b>'+
      '<small>último peso registrado</small></span><span class="r-m">'+esc(vistos[k])+'</span></div>';
  });
  c.innerHTML =
    '<div class="r-caja"><h3>🔥 Racha actual</h3><div style="display:flex;align-items:center;gap:10px">'+
      '<span style="font-size:30px;font-weight:900;background:linear-gradient(135deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent">'+racha+'</span>'+
      '<small style="font-size:12px;color:var(--gris)">días seguidos cumpliendo<br>el plan al pie de la letra</small></div></div>'+
    '<div class="r-caja"><h3>Cumplimiento · últimas 8 sesiones</h3><div style="display:flex;gap:6px;align-items:flex-end">'+barras+'</div></div>'+
    '<div class="r-caja"><h3>Pesos que viene usando</h3>'+(filas||'<p style="font-size:12.5px;color:var(--gris)">Todavía no registró pesos.</p>')+'</div>';
}

/* ── pantalla: finanzas ── */
function rPintarFinanzas(){
  var wrap = $('rPantFin');
  wrap.innerHTML =
    '<div class="r-head"><button class="r-atras" id="rFinAtras">‹</button><h1>Finanzas<small class="r-sub" id="rFinMes"></small></h1></div>'+
    '<div class="r-contenido" style="padding-top:4px">'+
      '<div class="r-fin-hero"><small>Recaudado este mes</small><div class="r-num" id="rFinTotal">$0</div>'+
        '<div class="r-comp" id="rFinComp"></div></div>'+
      '<div class="r-fin-chips"><span><b id="rFinN">0</b>pagos</span>'+
        '<span><b id="rFinProm">$0</b>promedio</span><span><b id="rFinFaltan">0</b>sin pagar</span></div>'+
      '<div class="r-caja"><h3>💵 Pagos registrados</h3><div id="rFinPagos"></div></div>'+
      '<div class="r-caja"><h3>🔔 Les falta pagar este mes</h3><div id="rFinDeudas"></div></div>'+
      '<p style="font-size:10.5px;color:var(--gris);text-align:center;margin-top:6px">Los cobros se guardan en este dispositivo del profe.</p>'+
    '</div>';
  $('rFinAtras').onclick = function(){ rIrPantalla('lista'); };
  var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var ahora = new Date(), kMes = ahora.getFullYear()+'-'+ahora.getMonth();
  $('rFinMes').textContent = MESES[ahora.getMonth()]+' '+ahora.getFullYear();
  var pagos = rCobros();
  var delMes = pagos.filter(function(p){ var d=new Date(p.fecha); return d.getFullYear()+'-'+d.getMonth()===kMes; })
    .sort(function(a,b){ return b.fecha-a.fecha; });
  var total = delMes.reduce(function(s,p){ return s+p.monto; },0);
  var mesPas = new Date(ahora.getFullYear(), ahora.getMonth()-1, 1);
  var kPas = mesPas.getFullYear()+'-'+mesPas.getMonth();
  var totalAnt = pagos.filter(function(p){ var d=new Date(p.fecha); return d.getFullYear()+'-'+d.getMonth()===kPas; })
    .reduce(function(s,p){ return s+p.monto; },0);
  $('rFinTotal').textContent = rPlata(total);
  $('rFinComp').textContent = totalAnt
    ? ((total>=totalAnt?'▲ ':'▼ ')+Math.abs(Math.round((total-totalAnt)/totalAnt*100))+'% vs. '+MESES[mesPas.getMonth()])
    : 'Sin pagos el mes pasado para comparar';
  $('rFinN').textContent = delMes.length;
  $('rFinProm').textContent = delMes.length ? rPlata(Math.round(total/delMes.length)) : '$0';
  $('rFinPagos').innerHTML = delMes.length ? delMes.map(function(p){
    return '<div class="r-pago"><span class="r-avatar">'+inicial(p.alumno)+'</span>'+
      '<span class="r-d"><b>'+esc(p.alumno)+'</b><small>'+rFecha(p.fecha)+' · abono mensual</small></span>'+
      '<span class="r-m">'+rPlata(p.monto)+'</span></div>';
  }).join('') : '<p style="font-size:12.5px;color:var(--gris)">Todavía no registraste pagos este mes.</p>';
  var pagadores = {}; delMes.forEach(function(p){ pagadores[p.alumnoId]=true; });
  rListarAlumnos().then(function(alumnos){
    var deben = alumnos.filter(function(u){ return u.activo && !pagadores[u.id]; });
    $('rFinFaltan').textContent = deben.length;
    $('rFinDeudas').innerHTML = deben.length ? deben.map(function(u){
      return '<div class="r-pago"><span class="r-avatar">'+inicial(u.nombre)+'</span>'+
        '<span class="r-d"><b>'+esc(u.nombre)+'</b><small style="color:#d97706">Sin registrar este mes</small></span>'+
        '<button class="r-cobrar" data-id="'+u.id+'">Cobrar</button></div>';
    }).join('') : '<p style="font-size:12.5px;color:var(--ok);font-weight:700">✓ Todos al día este mes.</p>';
    $('rFinDeudas').querySelectorAll('[data-id]').forEach(function(b){
      b.onclick = function(){ var u = alumnos.find(function(x){ return x.id===b.getAttribute('data-id'); }); rHojaCobro(u, function(){ rPintarFinanzas(); rHeadCobros(); }); };
    });
  });
}

/* ── hojas: alta de alumno, credencial, cobro ── */
function rVeloBase(id, interno){
  return '<div class="r-velo" id="'+id+'"><div class="r-hoja"><div class="r-agarre"></div>'+interno+'</div></div>';
}
function rHojaAlta(){
  var existente = $('rVeloAlta'); if (existente) existente.remove();
  var v = rEl(rVeloBase('rVeloAlta',
    '<b style="font-size:17px">Nuevo alumno</b>'+
    '<small style="color:var(--gris);display:block;margin:3px 0 14px">Con estos datos le creamos la cuenta; la clave se la mandás por WhatsApp.</small>'+
    '<div class="r-campo"><label>Nombre y apellido</label><input id="rAltaNombre" placeholder="Ej: Valentina López"></div>'+
    '<div class="r-campo"><label>DNI</label><input id="rAltaDni" inputmode="numeric" placeholder="Ej: 35123456"></div>'+
    '<div class="r-campo"><label>WhatsApp (recomendado)</label><input id="rAltaTel" inputmode="tel" placeholder="351 000 0000"></div>'+
    '<button class="r-btn-prin" id="rAltaCrear">Crear cuenta</button>'));
  $('rAppProfe').appendChild(v);
  rAbrirVelo(v);
  v.onclick = function(ev){ if (ev.target===v) rCerrarVelo(v); };
  setTimeout(function(){ $('rAltaNombre').focus(); }, 350);
  $('rAltaCrear').onclick = async function(){
    var nombre = $('rAltaNombre').value.trim(), dni = $('rAltaDni').value.trim(), tel = $('rAltaTel').value.trim();
    if (!nombre){ rToast('Ponele el nombre', $('rAppProfe')); return; }
    if (!dni || String(dni).replace(/\D/g,'').length<7){ rToast('Falta el DNI', $('rAppProfe')); return; }
    $('rAltaCrear').textContent = 'Creando…';
    // DNI del dueño: se crea como alumno de PRUEBA en este dispositivo, sin tocar su cuenta real
    if (esDniDemo(dni)){
      var idDemo = 'demo_'+String(dni).replace(/\D/g,'');
      var ya = rDemoAlumnos().find(function(x){ return x.id===idDemo; });
      var demoU = { id:idDemo, dni:String(dni).replace(/\D/g,''), nombre:nombre, telefono:tel, rol:'alumno', demo:true };
      rGuardarDemoAlumno(demoU);
      $('rAltaCrear').textContent='Crear cuenta';
      rCerrarVelo(v); v.remove();
      rToast('🧪 Alumno de prueba: no toca la cuenta real', $('rAppProfe'));
      rHojaCredencial({ nombre:nombre, telefono:tel }, ya ? 'la misma de siempre' : 'demo123');
      rPintarAlumnos($('rBuscaAlu')?$('rBuscaAlu').value:'');
      return;
    }
    var r = await Backend.crearUsuario({ nombre:nombre, dni:dni, telefono:tel, membresia:'1' });
    // ¿DNI repetido? si es un alumno propio, se sobrescribe (reactiva + datos nuevos + clave nueva)
    if (r.error && /ya existe|duplicate/i.test(r.error)){
      var todos = await Backend.listarUsuarios();
      var dniSolo = String(dni).replace(/\D/g,'');
      var existe = todos.find(function(u){ return String(u.dni).replace(/\D/g,'')===dniSolo; });
      if (existe){
        var ok = confirm('Ya hay una cuenta con ese DNI: '+existe.nombre+'.\n\n¿Querés sobreescribirla? Se actualizan los datos y se genera una clave nueva para mandarle.');
        if (!ok){ $('rAltaCrear').textContent='Crear cuenta'; return; }
        var ra = await Backend.actualizarPerfil(existe.id, { nombre:nombre, telefono:tel });
        $('rAltaCrear').textContent='Crear cuenta';
        if (ra.error){ rToast(ra.error, $('rAppProfe')); return; }
        rCerrarVelo(v); v.remove();
        rHojaCredencial({ nombre:nombre, telefono:tel }, ra.password);
        rPintarAlumnos($('rBuscaAlu')?$('rBuscaAlu').value:'');
        return;
      }
      // existe pero no es tuyo (alumno de otro profe o un entrenador): el dueño puede liberarlo
      rToast('Ese DNI ya está usado en otra cuenta. Pedile al dueño que lo libere desde su panel.', $('rAppProfe'));
      $('rAltaCrear').textContent='Crear cuenta';
      return;
    }
    if (r.error){ rToast(r.error, $('rAppProfe')); $('rAltaCrear').textContent='Crear cuenta'; return; }
    rCerrarVelo(v); v.remove();
    rHojaCredencial({ nombre:r.usuario.nombre||nombre, telefono:tel }, r.password);
    rPintarAlumnos($('rBuscaAlu')?$('rBuscaAlu').value:'');
  };
}
function rHojaCredencial(u, password){
  var existente = $('rVeloCred'); if (existente) existente.remove();
  var link = rWaLink(u.telefono, '¡Hola '+(u.nombre.split(' ')[0]||'')+'! Ya tenés tu acceso a Mi Entrenador. Entrá con tu DNI y esta clave temporal: '+password+' (te va a pedir cambiarla la primera vez).');
  var v = rEl(rVeloBase('rVeloCred',
    '<b style="font-size:17px">Cuenta creada 🎉</b>'+
    '<small style="color:var(--gris);display:block;margin:3px 0 10px">Pasale esta clave temporal: entra con su DNI y la cambia.</small>'+
    '<div class="r-clave"><div class="r-pw">'+esc(password)+'</div><small>Entra con su DNI y esta clave</small></div>'+
    (link ? '<button class="r-btn-prin verde" id="rCredWsp">Enviar por WhatsApp</button>' : '')+
    '<button class="r-chato" style="width:100%;justify-content:center;margin-top:10px" id="rCredListo">Listo</button>'+
    '<button class="r-chato" style="width:100%;justify-content:center;margin-top:6px" id="rCredCopiar">Copiar clave</button>'));
  $('rAppProfe').appendChild(v);
  rAbrirVelo(v);
  v.onclick = function(ev){ if (ev.target===v) rCerrarVelo(v); };
  if (link) $('rCredWsp').onclick = function(){ window.open(link,'_blank'); };
  $('rCredCopiar').onclick = function(){
    if (navigator.clipboard) navigator.clipboard.writeText(password).then(function(){ rToast('Clave copiada', $('rAppProfe')); });
  };
  $('rCredListo').onclick = function(){ rCerrarVelo(v); v.remove(); };
}
function rHojaCobro(u, alGuardar){
  var existente = $('rVeloCobro'); if (existente) existente.remove();
  var v = rEl(rVeloBase('rVeloCobro',
    '<b style="font-size:17px">Abono de '+esc(u.nombre)+'</b>'+
    '<small style="color:var(--gris);display:block;margin:3px 0 14px">Queda registrado en Finanzas de este mes.</small>'+
    '<div class="r-campo"><label>Monto</label><input id="rCobroMonto" inputmode="decimal" placeholder="25000" class="r-monto"></div>'+
    '<div class="r-atajos"><button data-m="20000">$20.000</button><button data-m="25000">$25.000</button><button data-m="30000">$30.000</button></div>'+
    '<button class="r-btn-prin verde" id="rCobroOk">✓ Confirmar pago</button>'));
  $('rAppProfe').appendChild(v);
  rAbrirVelo(v);
  v.onclick = function(ev){ if (ev.target===v) rCerrarVelo(v); };
  setTimeout(function(){ $('rCobroMonto').focus(); }, 350);
  v.querySelectorAll('[data-m]').forEach(function(b){
    b.onclick = function(){ $('rCobroMonto').value = b.getAttribute('data-m'); };
  });
  $('rCobroOk').onclick = function(){
    var monto = parseInt(String($('rCobroMonto').value).replace(/\D/g,''),10);
    if (!monto){ rToast('Ponele el monto', $('rAppProfe')); return; }
    var pagos = rCobros();
    var cNuevo = { alumnoId:u.id, alumno:u.nombre, monto:monto, fecha:Date.now(), dedup:rNuevoDedup() };
    if (rEsDemoId(u.id)) cNuevo._nube = true;   // demo: nunca sube
    pagos.push(cNuevo);
    rGuardarCobros(pagos);
    rSubirCobro(cNuevo);
    rCerrarVelo(v); v.remove();
    rToast('✓ Pago de '+(u.nombre.split(' ')[0]||'')+' registrado', $('rAppProfe'));
    rHeadCobros(); rActualizarBotonAbono(u);
    if (alGuardar) alGuardar();
  };
}

/* exponer para el builder */
R.entrenador = T;
R.rIrPantalla = rIrPantalla;
R.rVolverFicha = rVolverFicha;
R.rPintarAlumnos = rPintarAlumnos;
R.rLeer = rLeer;
R.rGuardar = rGuardar;
R.rDemoPlanKey = rDemoPlanKey;
R.rPropios = rPropios;
R.rToastProfe = function(msg){ rToast(msg, $('rAppProfe')); };
R.rCategoria = rCategoria;
R.rManchas = rManchas;
R.renderEntrenador = rRenderEntrenador;
R.ocultarEntrenador = function(){ var a=$('rAppProfe'); if(a) a.classList.remove('ver'); };
})();

/* ════════════════════════════════════════════════════════════
   CONSTRUCTOR DE PLANES (mazo del entrenador)
   ════════════════════════════════════════════════════════════ */
(function(){
var R = window.Rediseno;
var B = { abierta:false, userId:null, nombre:'', plan:null, dia:'lun', cat:'todo',
          editando:null, vivos:null, cargas:{} };
R.builder = B;

function b$(id){ return document.getElementById(id); }
function nuevoId(){ return 'e'+Date.now()+Math.floor(Math.random()*99999); }

B.abrir = function(u){
  B.userId = u.id; B.nombre = u.nombre; B.demo = !!u.demo;
  var planBase = u.demo ? R.rLeer(R.rDemoPlanKey(u.id), null) : u.plan;
  B.vivos = planBase ? JSON.parse(JSON.stringify(planBase)) : null;
  B.plan = { lun:[], mar:[], mie:[], jue:[], vie:[], sab:[], dom:[] };  // plan nuevo: arranca vacío
  B.dia = claveDia(Date.now()); B.cat = 'todo';
  if (!$('rAppBuilder')){
    document.body.appendChild(crearEstructura());
    conectar();
  }
  $('rAppBuilder').classList.add('ver');
  // borrador automático: si el plan NUEVO todavía no se guardó y hay un borrador, lo recupera
  if (!planBase){
    var borr = R.rLeer(B._claveBorrador(), null);
    if (borr && borr.plan && planTieneAlgo(borr.plan)){
      B.plan = borr.plan; B.dia = borr.dia || B.dia;
      setTimeout(function(){ if (confirm('Tenías un plan sin guardar. ¿Lo retomás donde lo dejaste?')){ B._borradorActivo = true; }
        else { B.plan = { lun:[], mar:[], mie:[], jue:[], vie:[], sab:[], dom:[] }; try{ localStorage.removeItem(B._claveBorrador()); }catch(e){} bPintarMazo(); bPintarDias(); } }, 250);
    }
  }
  bPintarDias(); bPintarMazo(); bPintarGrilla();
  b$('bBusca').value='';
  Backend.obtenerProgreso(u.id).then(function(r){ B.cargas = r.cargas||{}; }).catch(function(){});
};
B._claveBorrador = function(){ return CONFIG.CLAVE_DATOS+'_borradorPlan_'+(sesion?sesion.id:'x')+'_'+B.userId; };
B._guardarBorrador = function(){
  try{
    var soloDias={}; DIAS.forEach(function(d){ soloDias[d[0]] = Array.isArray(B.plan[d[0]])?B.plan[d[0]]:[]; });
    if (!planTieneAlgo(soloDias)) return;
    R.rGuardar(B._claveBorrador(), { plan:soloDias, dia:B.dia, ts:Date.now() });
  }catch(e){}
};
B._borrarBorrador = function(){ try{ localStorage.removeItem(B._claveBorrador()); }catch(e){} };
B.cerrar = function(){ $('rAppBuilder').classList.remove('ver'); B.abierta=false; };

function crearEstructura(){
  var d = document.createElement('div');
  d.className = 'r-app'; d.id = 'rAppBuilder';
  d.innerHTML = R && R.rManchas ? '' : '';
  d.innerHTML = '<div class="r-manchas"><i></i><i></i><i></i></div>'+
    '<div class="r-head"><button class="r-atras" id="bAtras">‹</button>'+
      '<h1>Armar plan<small>Plan de <span id="bNombre"></span></small></h1></div>'+
    '<div class="r-pildoras"><div class="r-pcentro" id="bDias"></div></div>'+
    '<div class="r-plan-zona"><div class="r-plan-titulo"><b>Sesión</b><span id="bAyuda"></span></div>'+
      '<div class="r-mazo" id="bMazo"></div></div>'+
    '<div class="r-pildoras"><div class="r-pcentro">'+
      '<button class="r-pill acc" id="bRepetir">↺ Repetir día anterior</button>'+
      '<button class="r-pill acc" id="bPlantillas">Plantillas</button>'+
    '</div></div>'+
    '<div class="r-biblio"><div class="r-biblio-cab"><h2>Ejercicios</h2><div class="r-cats" id="bCats"></div></div>'+
      '<input class="r-busca" id="bBusca" placeholder="Buscar: sentadilla, press, curl…" style="margin:8px 0 9px;width:100%">'+
      '<div class="r-grilla" id="bGrilla"></div></div>'+
    '<div class="r-barra"><div style="font-size:13px;font-weight:800;white-space:nowrap"><span id="bN">0</span> ejercicios<small style="display:block;font-size:10px;font-weight:500;color:var(--gris)" id="bDiaNom"></small></div>'+
      '<button class="r-btn-prin" id="bGuardar" style="flex:1">Guardar plan</button></div>'+
    // hoja detalles
    '<div class="r-velo" id="bVelo"><div class="r-hoja"><div class="r-agarre"></div>'+
      '<div class="r-dh"><span id="bHImg"></span><div><b id="bHNom"></b><small id="bHSub"></small></div></div>'+
      '<div class="r-pista" id="bHPista"></div>'+
      '<div class="r-dos">'+
        '<div class="r-campo"><label>Series</label><input id="bHSeries" inputmode="numeric" placeholder="4"><div class="r-sugiere" data-p="series"><button>3</button><button>4</button><button>5</button></div></div>'+
        '<div class="r-campo"><label>Repeticiones / tiempo</label><input id="bHReps" placeholder="10-12 · 40 seg"><div class="r-sugiere" data-p="reps"><button>8-10</button><button>10-12</button><button>40 seg</button></div></div>'+
        '<div class="r-campo"><label>Peso / carga</label><input id="bHCarga" placeholder="40 kg · desc. 90 seg"><div class="r-sugiere" data-p="carga"><button>sin peso</button><button>mancuernas</button></div></div>'+
        '<div class="r-campo"><label>Comentario para el alumno</label><input id="bHNota" placeholder="Ej: bajá lento"></div>'+
      '</div><div class="r-hb"><button class="r-cancela" id="bHCancela">Cancelar</button><button class="r-listo" id="bHListo">Listo</button></div></div></div>'+
    // hoja ejercicio propio
    '<div class="r-velo" id="bVeloPropio"><div class="r-hoja"><div class="r-agarre"></div>'+
      '<b style="font-size:17px">Ejercicio propio</b>'+
      '<small style="color:var(--gris);display:block;margin:3px 0 14px">Ponele nombre y un emoji: queda en tu biblioteca.</small>'+
      '<div class="r-campo"><label>Nombre del ejercicio</label><input id="bPNombre" placeholder="Ej: Sentadilla búlgara"></div>'+
      '<div class="r-campo"><label>Elegí un emoji</label><div class="r-emoji-opts" id="bPEmojis"></div></div>'+
      '<div class="r-hb"><button class="r-cancela" id="bPCancela">Cancelar</button><button class="r-listo" id="bPCrear">Crear ejercicio</button></div></div></div>'+
    // hoja plantillas
    '<div class="r-velo" id="bVeloUtil"><div class="r-hoja"><div class="r-agarre"></div>'+
      '<button class="r-semana-cab" id="bUtilGuardar" style="width:100%;border:0;background:none;border-bottom:1px solid var(--borde);padding:14px 4px;font-size:14px;font-weight:600;text-align:left;color:var(--tinta)">📥 Guardar este plan como plantilla</button>'+
      '<button class="r-semana-cab" id="bUtilUsar" style="width:100%;border:0;background:none;border-bottom:1px solid var(--borde);padding:14px 4px;font-size:14px;font-weight:600;text-align:left;color:var(--tinta)">📋 Usar una plantilla guardada</button>'+
      '<button class="r-semana-cab" id="bUtilCopiar" style="width:100%;border:0;background:none;padding:14px 4px;font-size:14px;font-weight:600;text-align:left;color:var(--tinta)">👥 Copiar el plan de otro alumno</button>'+
    '</div></div>'+
    '<div class="r-toast"></div>';
  return d;
}
function bToast(m){ var t=b$('rAppBuilder').querySelector('.r-toast'); t.textContent=m; t.classList.add('ver'); clearTimeout(t._t); t._t=setTimeout(function(){ t.classList.remove('ver'); },1900); }

function bDibujo(e, grande){
  if (e.img) return '<img src="'+e.img+'" alt="">';
  return '<span class="'+(grande?'r-dh-emoji':'r-pc-emoji')+'" style="'+(grande?'':'')+'">'+(e.emoji||'🏋️')+'</span>';
}
function bPintarDias(){
  b$('bNombre').textContent = B.nombre;
  b$('bDias').innerHTML = DIAS.map(function(d){
    var n=(B.plan[d[0]]||[]).length;
    return '<button class="r-pill'+(d[0]===B.dia?' activo':'')+'" data-dia="'+d[0]+'">'+DIA_CORTO[d[0]]+(n?'<span class="r-punto"></span>':'')+'</button>';
  }).join('');
  b$('bDias').querySelectorAll('[data-dia]').forEach(function(b){
    b.onclick=function(){ B.dia=b.getAttribute('data-dia'); bPintarDias(); bPintarMazo(); bPintarGrilla(); };
  });
  var nombre = DIAS.find(function(d){ return d[0]===B.dia; })[1];
  b$('bDiaNom').textContent = nombre;
}
function bPintarMazo(){
  B._guardarBorrador && B._guardarBorrador();
  var lista = B.plan[B.dia], mazo = b$('bMazo');
  mazo.innerHTML='';
  if (!lista.length){
    var mas = document.createElement('button');
    mas.className='r-mas';
    mas.innerHTML='<span class="r-cir">+</span>Empezar el plan · arrastrá una carta acá';
    mas.onclick=function(){ b$('bBusca').focus(); b$('bGrilla').scrollIntoView({behavior:'smooth'}); };
    mazo.appendChild(mas);
  } else {
    lista.forEach(function(e,i){
      var pc = document.createElement('div');
      pc.className='r-pc'; pc.style.animationDelay=(i*50)+'ms';
      pc.innerHTML='<span class="r-pc-num">'+(i+1)+'</span><button class="r-pc-x" data-x="'+i+'">×</button>'+
        '<div class="r-pc-img">'+(e.img?'<img src="'+e.img+'">':'<span class="r-pc-emoji">'+(e.emoji||'🏋️')+'</span>')+'</div>'+
        '<div class="r-pc-info"><div class="r-pc-nom">'+escHtml(e.nombre)+'</div>'+
        '<div class="r-pc-det">'+[e.series&&e.reps?e.series+'×'+e.reps:(e.series||e.reps||''),e.carga].filter(Boolean).join(' · ')+'</div></div>';
      pc.querySelector('[data-x]').onclick=function(ev){ ev.stopPropagation(); lista.splice(i,1); bPintarMazo(); bPintarGrilla(); bPintarDias(); };
      pc.onclick=function(){ bAbrirHoja('plan', i); };
      bGesto(pc, 'plan', i);
      mazo.appendChild(pc);
    });
  }
  b$('bN').textContent = lista.length;
  b$('bAyuda').textContent = lista.length ? 'Tocá para editar · arrastrá para ordenar' : 'Tocá una carta de abajo o arrastrala';
}
function escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function bLibro(){
  return LIBRERIA.map(function(e){ return { n:e.n, img:e.img, cat:R.rCategoria ? R.rCategoria(e.n) : 'empuje', emoji:'', propio:false }; })
    .concat(R.rPropios());
}
function bPintarGrilla(){
  var f = (b$('bBusca').value||'').toLowerCase();
  var enPlan = {}; B.plan[B.dia].forEach(function(e){ enPlan[e.nombre]=true; });
  var cats = b$('bCats');
  cats.innerHTML = R.CATS.filter(function(c){ return c[0]!=='mios' || R.rPropios().length; })
    .map(function(c){ return '<button class="r-cat'+(c[0]===B.cat?' activa':'')+'" data-cat="'+c[0]+'">'+c[1]+'</button>'; }).join('');
  cats.querySelectorAll('[data-cat]').forEach(function(b){
    b.onclick=function(){ B.cat=b.getAttribute('data-cat'); bPintarGrilla(); };
  });
  var html = !f ? '<button class="r-ec" id="bCrearCard"><span class="r-ec-crear"><span class="r-mas2">+</span><small>Crear ejercicio</small></span></button>' : '';
  html += bLibro().filter(function(e){
    var enCat = B.cat==='todo' ? true : B.cat==='mios' ? !!e.propio : e.cat===B.cat;
    return enCat && (!f || e.n.toLowerCase().indexOf(f)>=0);
  }).map(function(e){
    return '<button class="r-ec'+(enPlan[e.n]?' en-plan':'')+'" data-nom="'+escHtml(e.n)+'">'+
      (e.propio?'<span class="r-ec-propio">★</span>':'')+
      '<span class="r-ec-check">✓</span>'+
      '<span class="r-ec-img">'+(e.img?'<img src="'+e.img+'">':'<span class="r-ec-emoji">'+(e.emoji||'🏋️')+'</span>')+'</span>'+
      '<span class="r-ec-nom">'+escHtml(e.n)+'</span></button>';
  }).join('');
  b$('bGrilla').innerHTML = html || '<p style="grid-column:1/-1;color:var(--gris);font-size:12.5px;text-align:center;padding:24px">Nada con ese nombre.</p>';
  var crear = b$('bCrearCard'); if (crear) crear.onclick = bAbrirPropio;
  b$('bGrilla').querySelectorAll('[data-nom]').forEach(function(b){
    b.onclick=function(){
      var nom=b.getAttribute('data-nom');
      if (enPlan[nom]){ bToast('Ya está en el plan de hoy'); return; }
      bAbrirHoja('biblio', nom);
    };
    bGesto(b, 'nuevo', null);
  });
}
function bEjEnPlan(i){ return B.plan[B.dia][i]; }
function bEjLibro(nom){ return bLibro().find(function(x){ return x.n===nom; }); }
function bAbrirHoja(tipo, ref){
  B.editando = { tipo:tipo, ref:ref };
  var e = tipo==='plan' ? B.plan[B.dia][ref] : bEjLibro(ref);
  var imgCaja = b$('bHImg');
  imgCaja.innerHTML = e.img ? '<img src="'+e.img+'">' : '<span class="r-dh-emoji">'+(e.emoji||'🏋️')+'</span>';
  b$('bHNom').textContent = e.nombre || e.n;
  b$('bHSub').textContent = tipo==='plan' ? 'Editar detalles' : 'Nuevo en la sesión';
  // receta: qué le pusiste antes
  var receta = null;
  if (tipo!=='plan'){
    var ant = (B.vivos && B.vivos.__anterior) || B.vivos;
    if (ant){ (ant[B.dia]||[]).forEach(function(x){ if (x.nombre===(e.n)) receta=x; }); }
  } else receta = e;
  b$('bHSeries').value = e.series || (receta?receta.series:'');
  b$('bHReps').value   = e.reps   || (receta?receta.reps:'');
  b$('bHCarga').value  = e.carga  || (receta?receta.carga:'');
  b$('bHNota').value   = e.nota   || (receta?(receta.nota||''):'');
  var pistas=[];
  if (receta && tipo!=='plan') pistas.push('La vez pasada le pusiste <b>'+[receta.series&&receta.reps?receta.series+'×'+receta.reps:'',receta.carga].filter(Boolean).join(' · ')+'</b>.');
  var k = 'p:'+String(e.nombre||e.n||'').trim().toLowerCase();
  var fechas = Object.keys(B.cargas||{}).sort().reverse(), uso=null;
  for (var i=0;i<fechas.length;i++){ if (B.cargas[fechas[i]][k]){ uso=B.cargas[fechas[i]][k]; break; } }
  if (uso) pistas.push('El alumno usó <b>'+uso+'</b> la última vez.');
  var pista = b$('bHPista'); pista.hidden = !pistas.length; pista.innerHTML = pistas.join('<br>') || '💬 Ajustá series, peso o dejá una nota.';
  if (!pistas.length) pista.innerHTML='💬 Ajustá series, peso o dejá una nota para el alumno.';
  b$('bVelo').classList.add('abierto');
}
function conectar(){
  b$('bAtras').onclick = function(){ B.cerrar(); };
  b$('bBusca').addEventListener('input', function(){ bPintarGrilla(); });
  b$('bHCancela').onclick = function(){ b$('bVelo').classList.remove('abierto'); };
  b$('bVelo').onclick = function(ev){ if (ev.target===this) this.classList.remove('abierto'); };
  b$('bVelo').querySelectorAll('.r-sugiere button').forEach(function(b){
    b.onclick=function(){ var map={series:'bHSeries',reps:'bHReps',carga:'bHCarga'}; b$(map[b.parentElement.getAttribute('data-p')]).value=b.textContent.trim(); };
  });
  b$('bHListo').onclick = function(){
    var v=function(id){ return b$(id).value.trim(); };
    if (B.editando.tipo==='plan'){
      var e=B.plan[B.dia][B.editando.ref];
      e.series=v('bHSeries'); e.reps=v('bHReps'); e.carga=v('bHCarga'); e.nota=v('bHNota');
    } else {
      var base=bEjLibro(B.editando.ref);
      B.plan[B.dia].push({ id:nuevoId(), nombre:base.n, img:base.img||'', emoji:base.emoji||'',
        series:v('bHSeries'), reps:v('bHReps'), carga:v('bHCarga'), nota:v('bHNota') });
    }
    b$('bVelo').classList.remove('abierto');
    bPintarMazo(); bPintarGrilla(); bPintarDias();
  };
  // ejercicio propio
  var EMOJIS=['🏋️','🦵','💪','🔥','🏃','🧘','🤸','🚴','🤾','⭐'];
  var emojiElegido='🏋️';
  window.bAbrirPropio = function(){
    b$('bPNombre').value=''; emojiElegido='🏋️';
    b$('bPEmojis').innerHTML = EMOJIS.map(function(em,i){ return '<button data-em="'+em+'" class="'+(i===0?'activo':'')+'">'+em+'</button>'; }).join('');
    b$('bPEmojis').querySelectorAll('button').forEach(function(b){
      b.onclick=function(){ emojiElegido=b.getAttribute('data-em'); b$('bPEmojis').querySelectorAll('button').forEach(function(x){ x.classList.toggle('activo',x===b); }); };
    });
    b$('bVeloPropio').classList.add('abierto');
    setTimeout(function(){ b$('bPNombre').focus(); },300);
  };
  b$('bPCancela').onclick=function(){ b$('bVeloPropio').classList.remove('abierto'); };
  b$('bVeloPropio').onclick=function(ev){ if (ev.target===this) this.classList.remove('abierto'); };
  b$('bPCrear').onclick=function(){
    var nombre=b$('bPNombre').value.trim();
    if(!nombre){ bToast('Ponele un nombre'); return; }
    if (bLibro().some(function(e){ return e.n.toLowerCase()===nombre.toLowerCase(); })){ bToast('Ya existe ese ejercicio'); return; }
    var propios=R.rPropios();
    var nuevo={ n:nombre, cat:'mios', propio:true, emoji:emojiElegido, img:'' };
    propios.push(nuevo);
    R.rGuardar(CONFIG.CLAVE_DATOS+'_ejpropios_'+sesion.id, propios);
    if (window.Backend && Backend.guardarEjpropioNube){
      Backend.guardarEjpropioNube(nombre, emojiElegido, 'mios').then(function(rr){
        if (rr && rr.ok){ var ps=R.rPropios().map(function(x){ return x.n===nombre?Object.assign({},x,{_nube:true}):x; });
          R.rGuardar(CONFIG.CLAVE_DATOS+'_ejpropios_'+sesion.id, ps); }
      }).catch(function(){});
    }
    b$('bVeloPropio').classList.remove('abierto');
    B.cat='mios'; bPintarGrilla();
    bAbrirHoja('biblio', nombre);
  };
  // utilidades
  b$('bPlantillas').onclick=function(){ b$('bVeloUtil').classList.add('abierto'); };
  b$('bVeloUtil').onclick=function(ev){ if(ev.target===this) this.classList.remove('abierto'); };
  b$('bUtilGuardar').onclick=function(){
    var nombre=prompt('Nombre de la plantilla:'); if(!nombre) return;
    if(!planTieneAlgo(B.plan)){ bToast('El plan está vacío'); return; }
    var k=CONFIG.CLAVE_DATOS+'_plantillas_'+sesion.id, g=(function(){ try{return JSON.parse(localStorage.getItem(k))||{};}catch(e){return {};} })();
    g[nombre]=B.plan; try{ localStorage.setItem(k, JSON.stringify(g)); }catch(e){}
    b$('bVeloUtil').classList.remove('abierto'); bToast('Plantilla guardada');
  };
  b$('bUtilUsar').onclick=function(){
    var k=CONFIG.CLAVE_DATOS+'_plantillas_'+sesion.id, g=(function(){ try{return JSON.parse(localStorage.getItem(k))||{};}catch(e){return {};} })();
    var nombres=Object.keys(g);
    if(!nombres.length){ bToast('No hay plantillas guardadas'); return; }
    var nombre=prompt('¿Cuál plantilla?\n'+nombres.join('\n')); if(!nombre||!g[nombre]) return;
    B.plan = JSON.parse(JSON.stringify(g[nombre]));
    ['lun','mar','mie','jue','vie','sab','dom'].forEach(function(d){ if(!Array.isArray(B.plan[d])) B.plan[d]=[]; });
    b$('bVeloUtil').classList.remove('abierto'); bPintarDias(); bPintarMazo(); bPintarGrilla(); bToast('Plantilla aplicada: recordá Guardar');
  };
  b$('bUtilCopiar').onclick=function(){
    var otros = (R.entrenador.alumnos||[]).filter(function(u){ return u.id!==B.userId && planTieneAlgo(planDe(u)); });
    if(!otros.length){ bToast('Ningún otro alumno con plan'); return; }
    var nombre=prompt('¿Copiar el plan de quién?\n'+otros.map(function(u,i){ return (i+1)+'. '+u.nombre; }).join('\n'), '1');
    var idx=parseInt(nombre,10)-1; if(isNaN(idx)||!otros[idx]) return;
    B.plan = planVacio();
    var p=planDe(otros[idx]);
    DIAS.forEach(function(d){ B.plan[d[0]]=(p[d[0]]||[]).map(function(e){ return { id:nuevoId(), nombre:e.nombre, img:e.img||imgDe(e.nombre), emoji:e.emoji||'', series:e.series, reps:e.reps, carga:e.carga, nota:e.nota }; }); });
    b$('bVeloUtil').classList.remove('abierto'); bPintarDias(); bPintarMazo(); bPintarGrilla(); bToast('Plan copiado: recordá Guardar');
  };
  b$('bRepetir').onclick=function(){
    var fuente = (B.vivos && B.vivos.__anterior) || (B.vivos && planTieneAlgo(B.vivos) ? B.vivos : null);
    var prev = fuente ? (fuente[B.dia]||[]) : [];
    if(!prev.length){ bToast('No hay un día anterior para repetir'); return; }
    prev.forEach(function(e){ B.plan[B.dia].push({ id:nuevoId(), nombre:e.nombre, img:e.img||imgDe(e.nombre), emoji:e.emoji||'', series:e.series, reps:e.reps, carga:e.carga, nota:e.nota }); });
    bPintarMazo(); bPintarGrilla(); bPintarDias(); bToast('Día anterior repetido: '+prev.length+' ejercicios');
  };
  b$('bGuardar').onclick=async function(){
    var final={};
    DIAS.forEach(function(d){ final[d[0]]=B.plan[d[0]]; });
    if (B.demo){   // alumno de prueba: el plan queda solo en este dispositivo
      var vivo = B.vivos;
      if (vivo){
        var vivoDias={}; DIAS.forEach(function(d){ vivoDias[d[0]]=Array.isArray(vivo[d[0]])?vivo[d[0]]:[]; });
        if (planTieneAlgo(vivoDias) && JSON.stringify(vivoDias)!==JSON.stringify(final)){
          final.__anterior = vivoDias; final.__fecha = fechaClave(Date.now());
        } else if (vivo.__anterior){ final.__anterior=vivo.__anterior; final.__fecha=vivo.__fecha; }
      }
      R.rGuardar(R.rDemoPlanKey(B.userId), final);
      B._borrarBorrador();
      B.cerrar(); avisar('Plan guardado (prueba)');
      R.entrenador.usuario.plan = final;
      R.rVolverFicha();
      return;
    }
    var vivo = B.vivos;
    if (vivo){
      var vivoDias={}; DIAS.forEach(function(d){ vivoDias[d[0]]=Array.isArray(vivo[d[0]])?vivo[d[0]]:[]; });
      if (planTieneAlgo(vivoDias) && JSON.stringify(vivoDias)!==JSON.stringify(final)){
        final.__anterior = vivoDias; final.__fecha = fechaClave(Date.now());
      } else if (vivo.__anterior){ final.__anterior=vivo.__anterior; final.__fecha=vivo.__fecha; }
    }
    var r = await Backend.guardarPlan(B.userId, final);
    if (r && r.error){ bToast(r.error); return; }
    B._borrarBorrador();
    B.cerrar();
    avisar('Plan guardado');
    var uid=B.userId;
    var alumnos=await Backend.listarUsuarios();
    R.entrenador.alumnos=alumnos;
    R.entrenador.usuario=alumnos.find(function(x){return x.id===uid;})||R.entrenador.usuario;
    R.rVolverFicha();
  };
}

/* ── gestos: toque=editar · deslizar=scroll · mantener y arrastrar=tomar ── */
var drag=null, ultimoGesto=0, ESPERA=400, UMBRAL=11;
document.addEventListener('touchmove', function(ev){ if(drag && drag.arrastrando) ev.preventDefault(); }, { passive:false });
function bFantasma(el){
  var f=document.createElement('div'); f.className='r-fantasma';
  var img=el.querySelector('.r-pc-img img, .r-ec-img img');
  var em=el.querySelector('.r-pc-emoji, .r-ec-emoji');
  var nom=el.querySelector('.r-ec-nom, .r-pc-nom');
  var cabeza = img
    ? '<img src="'+img.src+'">'
    : '<div class="r-f-emoji">'+(em?em.textContent:'🏋️')+'</div>';
  f.innerHTML = cabeza + '<div class="r-f-info"><div class="r-f-nom">'+(nom?nom.textContent:'')+'</div></div>';
  document.body.appendChild(f); return f;
}
function bSobreMazo(x,y){
  var m=b$('bMazo'); if(!m) return false; var r=m.getBoundingClientRect();
  return x>=r.left-20 && x<=r.right+20 && y>=r.top-26 && y<=r.bottom+26;
}
function bGesto(el, tipo, idx){
  el.addEventListener('pointerdown', function(ev){
    if(!b$('rAppBuilder')||!b$('rAppBuilder').classList.contains('ver')) return;
    if(ev.target.closest('.r-pc-x')) return;
    if(ev.pointerType==='mouse' && ev.button!==0) return;
    var data={ tipo:tipo, el:el, arrastrando:false, timer:null, sx:ev.clientX, sy:ev.clientY, lx:ev.clientX, ly:ev.clientY };
    if(tipo==='nuevo'){
      var nom=el.getAttribute('data-nom');
      if(B.plan[B.dia].some(function(e){ return e.nombre===nom; })) return;
      data.base=nom;
    } else data.idx=Number(idx);
    drag=data;
    try{ el.setPointerCapture(ev.pointerId); }catch(e){}
    if(ev.pointerType==='mouse'){ empezar(); return; }
    drag.timer=setTimeout(empezar, ESPERA);
    function empezar(){
      if(!drag) return;
      drag.arrastrando=true;
      if(navigator.vibrate) navigator.vibrate(15);
      drag.fantasma=bFantasma(el);
      // posicionar el fantasma justo donde está el dedo/cursor desde el arranque
      drag.fantasma.style.left=(drag.lx-48)+'px';
      drag.fantasma.style.top=(drag.ly-50)+'px';
      el.style.opacity='.25';
    }
    drag._empezar=empezar;
  });
  el.addEventListener('pointermove', function(ev){
    if(!drag || drag.el!==el) return;
    drag.lx=ev.clientX; drag.ly=ev.clientY;
    if(!drag.arrastrando){
      if(Math.hypot(ev.clientX-drag.sx, ev.clientY-drag.sy)>UMBRAL){ clearTimeout(drag.timer); drag=null; }
      return;
    }
    drag.fantasma.style.left=(ev.clientX-48)+'px';
    drag.fantasma.style.top=(ev.clientY-50)+'px';
    if(drag.tipo==='nuevo') b$('bMazo').classList.toggle('sobre', bSobreMazo(ev.clientX,ev.clientY));
  });
  function fin(ev){
    if(!drag || drag.el!==el) return;
    clearTimeout(drag.timer);
    if(drag.arrastrando){
      if(drag.tipo==='nuevo'){ if(bSobreMazo(ev.clientX,ev.clientY)) bAbrirHoja('biblio', drag.base); }
      else {
        var cards=[].slice.call(b$('bMazo').querySelectorAll('.r-pc'));
        var destino=cards.length;
        for(var i=0;i<cards.length;i++){ var r=cards[i].getBoundingClientRect(); if(ev.clientX<r.left+r.width/2){ destino=i; break; } }
        var lista=B.plan[B.dia], item=lista.splice(drag.idx,1)[0];
        if(destino>drag.idx) destino--;
        lista.splice(Math.max(0,destino),0,item);
        bPintarMazo(); bPintarGrilla();
      }
      ultimoGesto=Date.now();
    }
    if(drag&&drag.fantasma) drag.fantasma.remove();
    el.style.opacity=''; b$('bMazo').classList.remove('sobre');
    drag=null;
  }
  el.addEventListener('pointerup', fin);
  el.addEventListener('pointercancel', fin);
}
})();

/* ════════════════════════════════════════════════════════════
   PANTALLA DEL ALUMNO · mazo a pantalla completa
   ════════════════════════════════════════════════════════════ */
(function(){
var R = window.Rediseno;
var D = { dia:null, idx:0, timers:[], arr:null };
R.alumno = D;

function d$(id){ return document.getElementById(id); }
function dNuevoId(){ return 'e'+Date.now()+Math.floor(Math.random()*99999); }

R.renderAlumno = function(){
  D.dia = claveDia(Date.now()); D.idx = 0;
  if (!d$('rAppAlumno')){
    document.body.appendChild(crearEstructura());
    conectar();
  }
  d$('rAppAlumno').classList.add('ver');
  dRender();
};
R.ocultarAlumno = function(){ var a=d$('rAppAlumno'); if(a) a.classList.remove('ver'); };

function crearEstructura(){
  var d=document.createElement('div');
  d.className='r-app'; d.id='rAppAlumno';
  d.innerHTML='<div class="r-manchas"><i></i><i></i><i></i></div>'+
    '<div class="r-deck-top"><div class="r-deck-titulo"><small>Hola, '+(sesion.nombre.split(' ')[0]||'')+'</small><b id="dTitulo">¡A entrenar!</b></div>'+
      '<div class="r-deck-dias" id="dDias"></div>'+
      '<div class="r-anillo-wrap"><div class="r-anillo" id="dAnillo"></div><i id="dAnilloTxt">0%</i></div>'+
      '<button class="r-salir-btn" id="dSalir" title="Cerrar sesión">🚪</button>'+
      '<button class="r-menu-btn" id="dMenu" title="Menú">☰</button></div>'+
    '<div class="r-deck-puntos" id="dPuntos"></div>'+
    '<div class="r-deck-zona" id="dZona"><button class="r-nav-dia izq" id="dIzq">‹</button><button class="r-nav-dia der" id="dDer">›</button></div>'+
    '<div class="r-deck-botones" id="dBotones"><button class="r-bbtn no" id="dNo">✗</button><button class="r-bbtn ok" id="dSi">✓</button></div>'+
    '<div class="r-deck-pista" id="dPista">Deslizá la carta · ✓ hecha · ✗ no salió</div>'+
    '<div class="r-deck-fin" id="dFin"><div class="r-confeti" id="dConfeti"></div><div class="r-emoji" id="dFinEmoji">🎉</div>'+
      '<h2 id="dFinTitulo"></h2><p id="dFinTexto"></p>'+
      '<div><button id="dFinRevisar">Revisar</button> <button id="dFinSalir" style="background:#f1f1f8;color:var(--gris);box-shadow:none">Salir</button></div></div>'+
    // peso
    '<div class="r-velo" id="dVeloPeso"><div class="r-hoja"><div class="r-agarre"></div>'+
      '<h3 style="font-size:17px;text-align:center">¿Qué peso usaste?</h3><p style="font-size:12.5px;color:var(--gris);text-align:center;margin:4px 0 14px" id="dPesoSub"></p>'+
      '<input id="dPesoInput" inputmode="decimal" placeholder="60 kg" style="width:100%;border:1.5px solid var(--borde);border-radius:14px;padding:14px;font-size:18px;font-weight:800;text-align:center;outline:none;background:#fafaff;color:var(--tinta)">'+
      '<div class="r-hb"><button class="r-cancela" id="dPesoCancela">Cancelar</button><button class="r-listo" id="dPesoListo">Listo</button></div></div></div>'+
    // menú
    '<div class="r-velo" id="dVeloMenu"><div class="r-hoja"><div class="r-agarre"></div>'+
      '<button class="r-semana-cab" id="dMenuProg" style="width:100%;border:0;background:none;border-bottom:1px solid var(--borde);padding:14px 4px;font-size:14px;font-weight:600;text-align:left;color:var(--tinta)">📊 Mi progreso (peso, medidas, cargas)</button>'+
      '<button class="r-semana-cab" id="dMenuAyuda" style="width:100%;border:0;background:none;border-bottom:1px solid var(--borde);padding:14px 4px;font-size:14px;font-weight:600;text-align:left;color:var(--tinta)">❓ Cómo funciona</button>'+
      '<button class="r-semana-cab" id="dMenuSalir" style="width:100%;border:0;background:none;padding:14px 4px;font-size:14px;font-weight:600;text-align:left;color:var(--rojo)">🚪 Salir de mi cuenta</button>'+
    '</div></div>'+
    '<div class="r-toast"></div>';
  return d;
}
function dToast(m){ var t=d$('rAppAlumno').querySelector('.r-toast'); t.textContent=m; t.classList.add('ver'); clearTimeout(t._t); t._t=setTimeout(function(){ t.classList.remove('ver'); },1900); }
function dHoy(){ return claveDia(Date.now()); }
function dPlan(){ return planDe(sesion); }
function dLista(dia){ return dPlan()[dia]||[]; }
function dEsHoy(){ return D.dia===dHoy(); }
function dMarcasHoy(dia){ var f=fechaClave(Date.now()); if(dia!==dHoy()) return {}; return (sesion.hechos||{})[f]||{}; }
function dEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function dRender(){
  D.timers.forEach(clearInterval); D.timers=[];
  dPintarDias(); dPintarAnillo();
  var lista=dLista(D.dia), zona=d$('dZona');
  zona.querySelectorAll('.r-dcarta').forEach(function(c){ c.remove(); });
  var sinPlan = !planTieneAlgo(dPlan());
  if(!lista.length){
    var carta=document.createElement('div');
    carta.className='r-dcarta entra especial';
    if(sinPlan) carta.innerHTML='<div class="r-gran">✨</div><h2>Tu plan está en camino</h2><p>Tu entrenador lo está preparando. En cuanto lo tengas, lo vas a ver acá.</p>';
    else carta.innerHTML='<div class="r-gran">🌙</div><h2>Día de descanso</h2><p>El descanso también entrena. Recargá pilas: mañana se vuelve.</p>';
    zona.appendChild(carta);
    d$('dBotones').style.display='none';
    d$('dPista').textContent = dEsHoy() ? '' : 'Estás mirando otro día';
    d$('dPuntos').innerHTML='';
    dNavFlechas();
    return;
  }
  d$('dBotones').style.display = dEsHoy() ? 'flex' : 'none';
  d$('dPista').textContent = dEsHoy() ? 'Deslizá la carta · ✓ hecha · ✗ no salió' : 'Estás mirando otro día · tocá "hoy" para volver';
  var marcas=dMarcasHoy(D.dia);
  // cartas: solo la actual (el mazo real sale de Supabase; atrás mostramos difuminado)
  [-1,-2].forEach(function(atras){
    var i=D.idx+atras;
    if(i>=0){ var c=dHacerCarta(lista[i], i, atras===-1?'detras':'detras2'); zona.appendChild(c); }
  });
  var actual=dHacerCarta(lista[D.idx], D.idx, 'entra');
  zona.appendChild(actual);
  // puntos
  d$('dPuntos').innerHTML = lista.map(function(e,i){
    var m=marcas[e.id];
    return '<span class="'+(m===true?'ok':m===false?'no':(i===D.idx&&dEsHoy()?'act':''))+'"></span>';
  }).join('');
  // animación del dibujo
  var imgs=actual.querySelectorAll('.r-dibujo img');
  if(imgs.length>1){
    var f=0; imgs[0].classList.add('viendo');
    D.timers.push(setInterval(function(){
      imgs[f].classList.remove('viendo'); f=(f+1)%imgs.length; imgs[f].classList.add('viendo');
    }, 900));
  } else if(imgs.length===1) imgs[0].classList.add('viendo');
  dNavFlechas();
}
function dNavFlechas(){
  var lista=dLista(D.dia), mostrar = !dEsHoy() && lista.length>1;
  d$('dIzq').classList.toggle('vis', mostrar && D.idx>0);
  d$('dDer').classList.toggle('vis', mostrar && D.idx<lista.length-1);
}
function dHacerCarta(e, i, clase){
  var marcas=dMarcasHoy(D.dia);
  var m=marcas[e.id];
  var cuadros=imgsDe(e.nombre);
  var imgsCuadro = cuadros.length ? cuadros : (e.img?[e.img]:[]);
  var dibujo = imgsCuadro.length
    ? imgsCuadro.map(function(src){ return '<img src="'+src+'">'; }).join('')
    : '<span class="r-dib-emoji">🏋️</span>';
  var pesoClave='p:'+String(e.nombre||'').trim().toLowerCase();
  var pesoUsado = (sesion.hechos&&(sesion.hechos[fechaClave(Date.now())]||{})[pesoClave]) || '';
  var pillPeso = pesoUsado || e.carga;
  var sxr = (e.series&&e.reps)?(e.series+' × '+e.reps):(e.series||e.reps||'');
  var ult='';
  if(!pesoUsado && e.carga===undefined){}
  // última carga real
  var fechas=Object.keys(sesion.hechos||{}).sort().reverse();
  for(var fi=0;fi<fechas.length;fi++){ var v=(sesion.hechos[fechas[fi]]||{})[pesoClave]; if(v){ ult=v; break; } }
  var c=document.createElement('div');
  c.className='r-dcarta '+clase;
  c.innerHTML='<div class="r-dibujo"><span class="r-num-ej">'+(i+1)+' / '+dLista(D.dia).length+'</span>'+
    '<span class="r-marca '+(m===true?'ok':m===false?'no':'')+'">'+(m===true?'✓ Hecho':m===false?'✗ No salió':'')+'</span>'+
    '<span class="r-sello ok">¡HECHO!</span><span class="r-sello no">NO SALIÓ</span>'+
    dibujo+'</div>'+
    '<div class="r-datos"><h2>'+dEsc(e.nombre)+'</h2>'+
    '<div class="r-pastillas">'+(sxr?'<i>'+sxr+'</i>':'')+
      (pillPeso?'<i class="peso'+(pesoUsado?' editado':'')+'" data-peso="1">'+(pesoUsado?'Usaste '+pesoUsado:pillPeso)+' ✎</i>':'')+
    '</div>'+
    (e.nota?'<div class="r-nota"><b>Profe:</b> '+dEsc(e.nota)+'</div>':'')+
    (ult && !pesoUsado ? '<div class="r-ult-peso">La última vez usaste <b>'+dEsc(ult)+'</b></div>' : '')+
    '</div>';
  var pill=c.querySelector('[data-peso]');
  if(pill && dEsHoy()) pill.onclick=function(ev){ ev.stopPropagation(); dAbrirPeso(e); };
  return c;
}
function dPintarDias(){
  var plan=dPlan(), hoyK=dHoy();
  d$('dDias').innerHTML = DIAS.map(function(d){
    var lista=plan[d[0]]||[];
    var marcas = d[0]===hoyK ? dMarcasHoy(hoyK) : {};
    var respondidos = lista.filter(function(e){ return marcas[e.id]!==undefined; }).length;
    var cls = d[0]===hoyK ? 'hoy ' : '';
    cls += d[0]===D.dia ? 'activo ' : '';
    cls += lista.length ? (respondidos===lista.length?'ok':'') : '';
    var punto = lista.length ? '<span class="r-pd"></span>' : '';
    return '<button class="r-dp '+cls+'" data-dia="'+d[0]+'">'+punto+DIA_CORTO[d[0]]+'<small>'+(d[0]===hoyK?'hoy':'')+'</small></button>';
  }).join('');
  d$('dDias').querySelectorAll('[data-dia]').forEach(function(b){
    b.onclick=function(){ D.dia=b.getAttribute('data-dia'); D.idx=0; dRender(); };
  });
  var act = d$('dDias').querySelector('.r-dp.activo');
  if (act && act.scrollIntoView) act.scrollIntoView({inline:'center', block:'nearest'});
}
function dPintarAnillo(){
  var lista=dLista(D.dia), marcas=dMarcasHoy(D.dia);
  var hechos=lista.filter(function(e){ return marcas[e.id]!==undefined; }).length;
  var pct=lista.length?Math.round(hechos/lista.length*100):0;
  d$('dAnillo').style.background='conic-gradient(var(--c1) 0 '+pct+'%, rgba(124,58,237,.15) '+pct+'% 100%)';
  d$('dAnilloTxt').textContent=pct+'%';
  d$('dTitulo').textContent = dEsHoy() ? (pct===100&&lista.length?'¡Día completado! 🎉':'¡A entrenar! 💪')
    : (DIAS.find(function(x){return x[0]===D.dia;})[1]);
}
function dNavFlechas2(){}
async function dResponder(ok){
  if(!dEsHoy()) return;
  var lista=dLista(D.dia), e=lista[D.idx];
  var carta=d$('dZona').querySelector('.r-dcarta.entra');
  var r = await Backend.marcarHecho(sesion.id, fechaClave(Date.now()), e.id, ok);
  if(r.error){ dToast(r.error); return; }
  if(r.hechos) sesion.hechos=r.hechos;
  if(carta){ carta.classList.add(ok?'fuera-ok':'fuera-no'); if(navigator.vibrate) navigator.vibrate(ok?20:[15,40,15]); }
  dPintarAnillo(); dPintarDias();
  setTimeout(function(){
    var marcas=dMarcasHoy(D.dia);
    var falta=lista.findIndex(function(x){ return marcas[x.id]===undefined; });
    if(falta===-1){ dMostrarFin(); return; }
    D.idx=falta; dRender();
  }, 300);
}
function dMostrarFin(){
  var lista=dLista(D.dia), marcas=dMarcasHoy(D.dia);
  var hechas=lista.filter(function(e){ return marcas[e.id]===true; }).length;
  d$('dFinTitulo').textContent = hechas===lista.length ? '¡Día completado! 🎉' : '¡Lista la sesión!';
  d$('dFinTexto').textContent = hechas===lista.length
    ? 'Hiciste los '+lista.length+' ejercicios. ¡Descansá, te lo ganaste!'
    : 'Respondiste '+hechas+' de '+lista.length+'. Mañana se vuelve.';
  d$('dConfeti').innerHTML='';
  if(hechas===lista.length){
    var cols=['#5b8def','#a06bff','#27c47a','#f2b63a','#e8619a','#ff8f6b'];
    for(var i=0;i<40;i++){
      var s=document.createElement('i');
      s.style.left=Math.floor(Math.random()*100)+'%'; s.style.background=cols[i%cols.length];
      s.style.animationDuration=(2.2+Math.random()*2).toFixed(1)+'s';
      s.style.animationDelay=(Math.random()*1.2).toFixed(1)+'s';
      d$('dConfeti').appendChild(s);
    }
  }
  d$('dFin').classList.add('ver');
}
function dAbrirPeso(e){
  var f=fechaClave(Date.now()), k='p:'+String(e.nombre||'').trim().toLowerCase();
  var actual=(sesion.hechos&&(sesion.hechos[f]||{})[k])||'';
  d$('dPesoSub').textContent='Profe te indicó: '+(e.carga||'sin peso')+(actual?' · ya anotaste '+actual:'');
  d$('dPesoInput').value=actual||e.carga||'';
  d$('dVeloPeso').classList.add('abierto');
  setTimeout(function(){ d$('dPesoInput').focus(); },300);
  dPesoEj=e;
}
var dPesoEj=null;
function conectar(){
  d$('dSi').onclick=function(){ dResponder(true); };
  d$('dNo').onclick=function(){ dResponder(false); };
  d$('dIzq').onclick=function(){ if(D.idx>0){ D.idx--; dRender(); } };
  d$('dDer').onclick=function(){ if(D.idx<dLista(D.dia).length-1){ D.idx++; dRender(); } };
  d$('dPesoCancela').onclick=function(){ d$('dVeloPeso').classList.remove('abierto'); };
  d$('dVeloPeso').onclick=function(ev){ if(ev.target===this) this.classList.remove('abierto'); };
  d$('dPesoListo').onclick=async function(){
    var v=d$('dPesoInput').value.trim();
    var r=await Backend.guardarPeso(sesion.id, fechaClave(Date.now()), dPesoEj.nombre, v);
    if(r.error){ dToast(r.error); return; }
    if(r.hechos) sesion.hechos=r.hechos;
    d$('dVeloPeso').classList.remove('abierto'); dRender();
  };
  d$('dFinRevisar').onclick=function(){ d$('dFin').classList.remove('ver'); D.idx=0; dRender(); };
  d$('dFinSalir').onclick=function(){ d$('dFin').classList.remove('ver'); R.ocultarAlumno(); mostrar('home'); };
  d$('dMenu').onclick=function(){ d$('dVeloMenu').classList.add('abierto'); };
  d$('dSalir').onclick=function(){ if (confirm('¿Cerrar tu sesión?')) salir(); };
  d$('dVeloMenu').onclick=function(ev){ if(ev.target===this) this.classList.remove('abierto'); };
  d$('dMenuSalir').onclick=function(){ d$('dVeloMenu').classList.remove('abierto'); salir(); };
  d$('dMenuAyuda').onclick=function(){ d$('dVeloMenu').classList.remove('abierto'); abrirAyuda(); };
  d$('dMenuProg').onclick=function(){
    d$('dVeloMenu').classList.remove('abierto');
    R.ocultarAlumno();
    mostrar('home');
    verTab('prog');
  };
  // gesto deslizar la carta
  var zona=d$('dZona'), arr=null;
  var umbral=110;
  function aplicarTirada(carta, dx, dy){
    var ancho = carta.offsetWidth || 300;
    var rot = dx/14 + Math.max(-6, Math.min(6, dy/34));
    carta.style.transform='translate3d('+dx+'px,'+(dy||0)+'px,0) rotate('+rot+'deg)';
    carta.classList.toggle('sw-ok', dx>40);
    carta.classList.toggle('sw-no', dx<-40);
    var sOk=carta.querySelector('.r-sello.ok'), sNo=carta.querySelector('.r-sello.no');
    var fuerza=Math.min(1, Math.abs(dx)/umbral);
    if(sOk) sOk.style.opacity = dx>20 ? String(fuerza) : '0';
    if(sNo) sNo.style.opacity = dx<-20 ? String(fuerza) : '0';
    // la pila de atrás avanza con el dedo
    var prog=Math.min(1, Math.abs(dx)/ancho);
    var d1=carta.parentElement.querySelector('.r-dcarta.detras');
    var d2=carta.parentElement.querySelector('.r-dcarta.detras2');
    if(d1) d1.style.transform='scale('+(0.93+0.07*prog)+') translateY('+(18-18*prog)+'px)';
    if(d2) d2.style.transform='scale('+(0.86+0.07*prog)+') translateY('+(34-16*prog)+'px)';
  }
  function resetPila(carta){
    var p=carta.parentElement;
    carta.classList.remove('sw-ok','sw-no');
    carta.style.transform='';
    var sOk=carta.querySelector('.r-sello.ok'), sNo=carta.querySelector('.r-sello.no');
    if(sOk) sOk.style.opacity='0'; if(sNo) sNo.style.opacity='0';
    var d1=p.querySelector('.r-dcarta.detras'), d2=p.querySelector('.r-dcarta.detras2');
    if(d1) d1.style.transform=''; if(d2) d2.style.transform='';
  }
  zona.addEventListener('pointerdown', function(ev){
    if(ev.target.closest('[data-peso]')||ev.target.closest('.r-nav-dia')) return;
    var c=ev.target.closest('.r-dcarta.entra'); if(!c) return;
    arr={sx:ev.clientX, sy:ev.clientY, x:0, y:0, c:c};
    try{c.setPointerCapture(ev.pointerId);}catch(e){}
    c.style.transition='none';
  });
  zona.addEventListener('pointermove', function(ev){
    if(!arr) return;
    arr.x=ev.clientX-arr.sx; arr.y=ev.clientY-arr.sy;
    aplicarTirada(arr.c, arr.x, arr.y);
  });
  function fin(){
    if(!arr) return;
    var dx=arr.x||0, carta=arr.c;
    carta.style.transition='';
    var decide = dEsHoy();
    if(decide && dx>umbral){ carta.classList.remove('sw-ok','sw-no'); carta.style.transform=''; carta.classList.add('fuera-ok'); dResponder(true); }
    else if(decide && dx<-umbral){ carta.classList.remove('sw-ok','sw-no'); carta.style.transform=''; carta.classList.add('fuera-no'); dResponder(false); }
    else { carta.classList.add('volver'); resetPila(carta); setTimeout(function(){ carta.classList.remove('volver'); },520); }
    arr=null;
  }
  zona.addEventListener('pointerup', fin);
  zona.addEventListener('pointercancel', fin);
}
})();

/* ════════════════════════════════════════════════════════════
   ENGANCHE CON index.html
   ════════════════════════════════════════════════════════════ */
(function(){
/* En PC, al seleccionar texto de una hoja el mouse puede soltarse sobre el
   fondo oscuro: en ese caso NO se cierra el popup. Solo cierra si el gesto
   (presionar Y soltar) empezó en el fondo. En celular es un toque puntual. */
document.addEventListener('pointerdown', function(ev){
  var velo = ev.target.closest && ev.target.closest('.r-velo');
  if (!velo) return;
  velo._pressEnFondo = (ev.target === velo);
}, true);
document.addEventListener('click', function(ev){
  var velo = ev.target.closest && ev.target.closest('.r-velo');
  if (!velo) return;
  var sueltaEnFondo = (ev.target === velo);
  if (sueltaEnFondo && !velo._pressEnFondo){ ev.stopPropagation(); ev.preventDefault(); }
}, true);

function montar(){
  if(!window.sesion) return;
  window.Rediseno.ocultarAlumno && window.Rediseno.ocultarAlumno();
  window.Rediseno.ocultarEntrenador && window.Rediseno.ocultarEntrenador();
  window.Rediseno.ocultarOwner && window.Rediseno.ocultarOwner();
  if(sesion.rol==='superadmin'){
    window.Rediseno.renderOwner && window.Rediseno.renderOwner();
  } else if(sesion.rol==='entrenador'){
    window.Rediseno.renderEntrenador();
  } else if(sesion.rol==='alumno' || sesion.rol==='usuario'){
    window.Rediseno.renderAlumno();
  }
}
// cuando entra a la app
var _aLaApp = window.aLaApp;
window.aLaApp = function(){
  _aLaApp && _aLaApp();
  setTimeout(montar, 60);
};
/* ════════ GESTO "ATRÁS" DE ANDROID ════════
   Devuelve:
   · 'capa'        → cerró una hoja/menú/builder/capítulo (consumimos el toque)
   · 'raiz'        → estamos en la pantalla inicial del rol (el doble-toque decide)
   El doble-toque para salir lo maneja index.html. */
R.atras = function(){
  function visible(el){ return el && el.classList.contains('ver'); }
  function capasAbiertas(raiz){
    return Array.prototype.slice.call(raiz.querySelectorAll('.r-velo.ver, .r-hoja.ver'))
      .concat(Array.prototype.slice.call(document.querySelectorAll('.velo.abierto')));
  }
  // 0 · cualquier hoja/menú abierto (tanto del rediseño como de la app base) se cierra
  var profe = $('rAppProfe'), alum = $('rAppAlumno'), build = $('rAppBuilder');
  var velos = Array.prototype.slice.call(document.querySelectorAll('.r-velo.abierto, .velo.abierto'))
    .filter(function(v){ return v.id !== 'veloForzada'; });
  if (velos.length){
    var v = velos[velos.length-1];
    v.classList.remove('ver'); v.classList.remove('abierto');
    return 'capa';
  }
  // 1 · el constructor de planes (mazo del profe) → vuelve a la ficha/lista
  if (visible(build)){ R.builder.cerrar(); return 'capa'; }
  // 1b · panel del dueño (superadmin)
  if (R.atrasOwner){ var oo = R.atrasOwner(); if (oo !== 'fuera') return oo; }
  // 2 · espacio del ENTRENADOR
  if (visible(profe)){
    if (R.entrenador && R.entrenador.pantalla === 'ficha'){
      var ab = $('rFichaAtras'); if (ab){ ab.click(); return 'capa'; }
      R.rIrPantalla('lista'); return 'capa';
    }
    if (R.entrenador && R.entrenador.pantalla === 'finanzas'){
      var af = $('rFinAtras'); if (af){ af.click(); return 'capa'; }
      R.rIrPantalla('lista'); return 'capa';
    }
    return 'raiz';  // lista de alumnos = inicio del profe
  }
  // 3 · espacio del ALUMNO
  if (visible(alum)){
    return 'raiz';  // el mazo es el inicio; salir a la app base lo decide el doble-toque
  }
  return 'fuera';   // no hay pantalla nueva visible: lo maneja la app vieja
};

// al salir
var _salir = window.salir;
window.salir = function(){
  window.Rediseno && window.Rediseno.ocultarAlumno && window.Rediseno.ocultarAlumno();
  window.Rediseno && window.Rediseno.ocultarEntrenador && window.Rediseno.ocultarEntrenador();
  window.Rediseno && window.Rediseno.ocultarOwner && window.Rediseno.ocultarOwner();
  _salir && _salir();
};
// refrescar el mazo del alumno cuando vuelve del progreso
window.__rAlumnoRender = function(){ if(window.sesion && (sesion.rol==='alumno'||sesion.rol==='usuario')) window.Rediseno.renderAlumno(); };
})();

/* ════════════════════════════════════════════════════════════
   PANEL DEL DUEÑO (superadmin) · liberar DNI borrando cuentas
   ════════════════════════════════════════════════════════════ */
(function(){
var R = window.Rediseno;
var O = { app:null };
R.owner = O;

function o$(id){ return document.getElementById(id); }
function oEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function oToast(m){ var t=o$('rOwnToast'); if(!t) return; t.textContent=m; t.classList.add('ver'); clearTimeout(t._t); t._t=setTimeout(function(){ t.classList.remove('ver'); },2200); }

function crearEstructura(){
  var d=document.createElement('div');
  d.className='r-app'; d.id='rAppOwner';
  d.innerHTML='<div class="r-manchas"><i></i><i></i><i></i></div>'+
    '<div class="r-head"><h1>Panel del dueño<small class="r-sub">Hola, '+(window.sesion&&sesion.nombre?sesion.nombre.split(' ')[0]:'')+'</small></h1>'+
      '<button class="r-sync-btn" id="oSync" title="Sincronizar">🔄</button>'+
      '<button class="r-salir-btn" id="oSalir" title="Cerrar sesión">🚪</button></div>'+
    '<div style="padding:8px 16px 30px;overflow-y:auto;flex:1">'+
      '<div class="r-caja" style="margin-bottom:14px">'+
        '<h3>🗑️ Liberar un DNI</h3>'+
        '<p style="font-size:12.5px;color:var(--gris);margin:2px 0 10px;line-height:1.4">Buscá cualquier cuenta por DNI (alumno o entrenador) y podés borrarla para que se pueda volver a crear. Al borrar, el DNI queda libre al instante.</p>'+
        '<div style="display:flex;gap:8px">'+
          '<input id="oDni" inputmode="numeric" placeholder="DNI de la cuenta" class="r-busca" style="margin:0;width:auto;flex:1">'+
          '<button class="r-chato" id="oBuscar" style="flex:0 0 auto">Buscar</button></div>'+
        '<div id="oRes" style="margin-top:12px"></div></div>'+
      '<p style="font-size:10.5px;color:var(--gris);text-align:center;line-height:1.5">Los entrenadores solo pueden sobrescribir <b>sus propios</b> alumnos.<br>Si un DNI está tomado por otra cuenta, liberalo desde acá.</p>'+
    '</div>'+
    '<div class="r-toast" id="rOwnToast"></div>';
  return d;
}

R.renderOwner = function(){
  if (!o$('rAppOwner')) document.body.appendChild(crearEstructura());
  o$('rAppOwner').classList.add('ver');
  o$('oSalir').onclick = function(){ if(confirm('¿Cerrar tu sesión?')){ R.ocultarOwner(); salir(); } };
  o$('oSync').onclick = function(){ oToast('✓ Datos actualizados'); };
  var buscar = function(){ oBuscar(); };
  o$('oBuscar').onclick = buscar;
  o$('oDni').addEventListener('keydown', function(e){ if(e.key==='Enter') buscar(); });
};
R.ocultarOwner = function(){ var a=o$('rAppOwner'); if(a) a.classList.remove('ver'); };

var oActual = null;
async function oBuscar(){
  var dni = o$('oDni').value; var res = o$('oRes');
  var d = String(dni||'').replace(/\D/g,'');
  if (d.length<7){ oToast('Escribí el DNI completo'); return; }
  res.innerHTML = '<div style="color:var(--gris);font-size:13px;padding:6px 2px">Buscando…</div>';
  var r;
  try{ r = await Backend.buscarCuentaPorDni(d); }catch(e){ r = { error:'Sin conexión' }; }
  if (r && r.error){ res.innerHTML=''; oToast(r.error||'No se pudo buscar'); return; }
  if (r && r.noExiste){
    res.innerHTML = '<div style="background:#eafaf0;border:1px solid #bfe8cf;border-radius:13px;padding:13px;font-size:13px;color:#15803d">✅ Ese DNI <b>no tiene ninguna cuenta</b>: está libre para crear.</div>';
    oActual=null; return;
  }
  oActual = r.cuenta;
  var u = oActual;
  var rolTxt = u.rol==='alumno'?'Alumno':u.rol==='entrenador'?'Entrenador':u.rol==='superadmin'?'Dueño':'Administrador';
  var esSuper = u.rol==='superadmin'||u.rol==='admin';
  res.innerHTML =
    '<div style="background:#fafaff;border:1.5px solid var(--borde);border-radius:15px;padding:14px">'+
      '<div style="display:flex;align-items:center;gap:12px">'+
        '<span class="r-avatar">'+(u.nombre?oEsc(u.nombre.charAt(0).toUpperCase()):'?')+'</span>'+
        '<div style="flex:1;min-width:0"><b style="font-size:15px">'+oEsc(u.nombre)+'</b>'+
        '<small style="display:block;color:var(--gris);font-size:12px;margin-top:2px">'+rolTxt+' · DNI '+oEsc(u.dni)+(u.telefono?' · '+oEsc(u.telefono):'')+'</small></div>'+
      '</div>'+
      (esSuper
        ? '<div style="margin-top:12px;font-size:12.5px;color:#d97706;background:#fff8e6;border:1px solid #ffe2a8;border-radius:11px;padding:10px">🔒 Es una cuenta de administración: no se puede borrar.</div>'
        : '<button class="r-btn-prin" id="oBorrar" style="margin-top:13px;background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 10px 24px rgba(220,38,38,.3)">🗑️ Borrar esta cuenta y liberar DNI</button>'+
          '<div style="font-size:11px;color:var(--gris);margin-top:8px;text-align:center">Se borra el acceso, el plan y el historial. Es irreversible.</div>')+
    '</div>';
  var btn = o$('oBorrar');
  if (btn) btn.onclick = oBorrar;
}

async function oBorrar(){
  if (!oActual) return;
  var u = oActual;
  if (!confirm('¿BORRAR la cuenta de '+u.nombre+' (DNI '+u.dni+')?\n\nSe elimina el acceso y todos sus datos. El DNI queda libre para volver a crear. Esta acción NO se puede deshacer.')) return;
  var btn = o$('oBorrar'); if(btn){ btn.disabled=true; btn.textContent='Borrando…'; }
  var r;
  try{ r = await Backend.eliminarUsuario(u.id); }catch(e){ r = { error:'Sin conexión' }; }
  if (r && r.error){ if(btn){ btn.disabled=false; btn.textContent='🗑️ Borrar esta cuenta y liberar DNI'; } oToast(r.error||'No se pudo borrar'); return; }
  o$('oRes').innerHTML = '<div style="background:#eafaf0;border:1px solid #bfe8cf;border-radius:13px;padding:13px;font-size:13px;color:#15803d">✅ Cuenta borrada. El DNI <b>'+oEsc(u.dni)+'</b> ya está libre. El profe puede crearla de nuevo.</div>';
  o$('oDni').value=''; oActual=null;
  oToast('Cuenta borrada');
}

// Atrás de Android: en el panel del dueño es raíz (doble-toque lo maneja index)
R.atrasOwner = function(){
  var a=o$('rAppOwner');
  if (a && a.classList.contains('ver')){
    var velos = Array.prototype.slice.call(document.querySelectorAll('#rAppOwner .r-velo.abierto'));
    if (velos.length){ velos[velos.length-1].classList.remove('abierto'); return 'capa'; }
    return 'raiz';
  }
  return 'fuera';
};
})();
