/* ════════════════════════════════════════════════════════════
   MI ENTRENADOR · REDISEÑO (módulo nuevo)
   Pantallas nuevas para ENTRENADOR (lista, ficha, finanzas,
   constructor de planes) y ALUMNO (mazo a pantalla completa).
   Convive con index.html: usa sus globals (sesion, Backend,
   planDe, LIBRERIA, etc.) y se monta encima con z-index alto.
   ════════════════════════════════════════════════════════════ */
'use strict';
/* ── helpers de tiempo GLOBALES (los usan el constructor del entrenador
   y el mazo del alumno). No van dentro de ningún IIFE para que ambos los vean. */
function tiempoSegundosDe(x){
  if(x==null) return 0;
  if(typeof x==='number' && isFinite(x)) return x>1000?Math.round(x/1000):x;
  var s=String(x).toLowerCase().replace(',','.');
  var m=s.match(/(\d+(?:\.\d+)?)\s*(min|mn|m|hs|h)/);
  if(m){ var v=parseFloat(m[1]); if(m[2]==='hs'||m[2]==='h') v*=60; return Math.round(v*60); }
  m=s.match(/(\d+)\s*[:']\s*(\d{1,2})/);
  if(m) return parseInt(m[1],10)*60+parseInt(m[2],10);
  m=s.match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : 0;
}
function dFmtTiempo(seg){
  seg=Math.max(0,Math.round(seg));
  var m=Math.floor(seg/60), s=seg%60;
  return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}
function tiempoTextoDe(e){
  var seg = e && e.tiempo ? tiempoSegundosDe(e.tiempo) : 0;
  if(!seg) return '';
  if(seg>=60){ var m=seg/60; return (m%1?m.toFixed(1):m)+' min'; }
  return seg+' seg';
}
/* ── "MODO PROPIO": un entrenador o el dueño entrena él mismo.
   Su plan y progreso se guardan SOLO en este dispositivo (privado, no toca
   la nube ni las tablas de alumnos), y no afecta sus funciones de gestión. */
var __modoPropio = false;
function miClavePlan(){ return (window.CONFIG?CONFIG.CLAVE_DATOS:'proto_entrenador_v1') + '_miplan_' + (window.sesion?sesion.id:'x'); }
function miClaveHechos(){ return (window.CONFIG?CONFIG.CLAVE_DATOS:'proto_entrenador_v1') + '_mihechos_' + (window.sesion?sesion.id:'x'); }
function miLeerPlan(){ try{ var v=JSON.parse(localStorage.getItem(miClavePlan())); return v||null; }catch(e){ return null; } }
function miGuardarPlan(p){ try{ localStorage.setItem(miClavePlan(), JSON.stringify(p)); }catch(e){} }
function miLeerHechos(){ try{ var v=JSON.parse(localStorage.getItem(miClaveHechos())); return v||{}; }catch(e){ return {}; } }
function miGuardarHechos(h){ try{ localStorage.setItem(miClaveHechos(), JSON.stringify(h)); }catch(e){} }
function miEsGestor(){ return window.sesion && (sesion.rol==='entrenador' || sesion.rol==='superadmin' || sesion.rol==='admin'); }
/* Sincroniza el plan y marcas propios del gestor desde la nube a esta sesión
   (para que lo armado en la PC aparezca en el celu al instante). Devuelve una promesa. */
async function miSyncNube(){
  if(!miEsGestor()) return;
  __modoPropio = true;
  var r;
  try { r = await Backend.obtenerMiPlan(sesion.id); }
  catch(e){ r=null; }
  if(r && r.plan && planTieneAlgo(r.plan)){
    sesion.plan = r.plan; miGuardarPlan(r.plan);   // nube manda
  }
  if(r && r.hechos){
    var h=Object.assign({}, miLeerHechos());      // mezclar: nube + lo local (lo local gana por si quedó offline)
    Object.keys(r.hechos||{}).forEach(function(f){ h[f]=Object.assign({}, r.hechos[f]||{}, h[f]||{}); });
    sesion.hechos = h; miGuardarHechos(h);
  }
}
/* entrar al entrenamiento propio del gestor: si tiene plan → mazo; si no → armarlo */
async function entrarEntrenar(){
  if(!miEsGestor()){ window.Rediseno.renderAlumno(); return; }
  __modoPropio = true;
  await miSyncNube();   // bajar lo de la nube (PC↔celu)
  var plan = (window.sesion && sesion.plan && planTieneAlgo(sesion.plan)) ? sesion.plan : miLeerPlan();
  if(!plan || !planTieneAlgo(plan)){
    window.Rediseno.builder.abrir({ id:sesion.id, nombre:sesion.nombre, demo:false }, { propio:true });
    return;
  }
  window.Rediseno.renderAlumno();
}
/* volver del entrenamiento propio al panel de gestión (no desloguea) */
function dVolverDePropio(){
  __modoPropio = false;
  var a=document.getElementById('rAppAlumno'); if(a) a.classList.remove('ver');
  var b=document.getElementById('rAppBuilder'); if(b) b.classList.remove('ver');
  var fin=document.getElementById('dFin'); if(fin) fin.classList.remove('ver');
  if(window.sesion && (sesion.rol==='entrenador')){ window.Rediseno.renderEntrenador(); }
  else if(window.sesion && (sesion.rol==='superadmin'||sesion.rol==='admin')){ window.Rediseno.renderOwner(); }
  else { try{ window.Rediseno.ocultarAlumno(); }catch(e){} }
}
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

/* ── Ayuda / onboarding con el diseño nuevo (no depende de la app vieja) ── */
function rGuiaRol(rol){
  if (rol==='alumno' || rol==='usuario') return [
    ['📋','Tu profe te arma el plan','Lo ves día por día con el dibujo de cada ejercicio.'],
    ['✅','Marcá cada ejercicio','Al terminarlo tocá ✓ (lo hice) o ✗ (no salió). Lo podés corregir.'],
    ['⏱️','Timer y peso','Usá el descanso entre series y anotá el peso que levantaste.'],
    ['🔥','No cortes la racha','Completá el día entero y sumá días seguidos. Tu profe te ve.']
  ];
  if (rol==='superadmin' || rol==='admin') return [
    ['👥','Gestioná entrenadores','En "Entrenadores" les cobrás, das prueba o membresía para siempre.'],
    ['💵','Registrá los pagos','El vencimiento corre solo y el resumen te muestra la recaudación.'],
    ['🗑️','Liberar un DNI','Si un DNI quedó tomado, lo buscás y lo borrás para volver a crear la cuenta.'],
    ['🔒','Privacidad','Cada entrenador ve solo a sus alumnos. Vos no ves los planes de nadie.']
  ];
  return [ // entrenador (default)
    ['➕','Cargá tus alumnos','Creá cada uno con su DNI: la app te da la clave para mandarle por WhatsApp.'],
    ['🏋️','Armales el plan','En "Crear plan nuevo" arrastrás los ejercicios al día, con series, reps y carga.'],
    ['📋','Plantillas y copiar','Guardá plantillas o copiá planes entre alumnos: armás una vez, usás mil.'],
    ['💬','WhatsApp y avisos','Mandale el plan o un recordatorio directo por WhatsApp desde su ficha.']
  ];
}
function rAyuda(){
  var ex = document.getElementById('rVeloAyuda'); if (ex) ex.remove();
  var rol = (window.sesion && (sesion.rol||'entrenador')) || 'entrenador';
  var items = rGuiaRol(rol);
  var filas = items.map(function(it){
    return '<div class="r-ayuda-fila"><span class="r-ayuda-em">'+it[0]+'</span>'+
      '<div><b>'+esc(it[1])+'</b><small>'+esc(it[2])+'</small></div></div>';
  }).join('');
  var v = rEl('<div class="r-velo" id="rVeloAyuda" style="position:fixed;z-index:300"><div class="r-hoja"><div class="r-agarre"></div>'+
    '<b style="font-size:17px">¿Cómo funciona?</b>'+
    '<small style="color:var(--gris);display:block;margin:3px 0 12px">Te dejamos lo esencial para arrancar.</small>'+
    '<div class="r-ayuda-lista">'+filas+'</div>'+
    '<button class="r-listo" id="rAyudaOk" style="width:100%;margin-top:14px">Entendido 👍</button>'+
    '</div></div>');
  document.body.appendChild(v);
  rAbrirVelo(v);
  var cerrar=function(){ rCerrarVelo(v); setTimeout(function(){ v.remove(); },220); };
  v.onclick=function(ev){ if(ev.target===v) cerrar(); };
  v.querySelector('#rAyudaOk').onclick=cerrar;
}

/* Hoja modal de entrada de texto (reemplaza prompt nativo). cb(valor|null) */
function rHojaInput(opts, cb){
  var existente = $('rVeloInput'); if (existente) existente.remove();
  var v = rEl(rVeloBase('rVeloInput',
    '<b style="font-size:16px">'+esc(opts.titulo||'')+'</b>'+
    (opts.mensaje?'<small style="color:var(--gris);display:block;margin:3px 0 12px">'+esc(opts.mensaje)+'</small>':'')+
    '<div class="r-campo" style="margin-top:8px"><label>'+esc(opts.label||'')+'</label>'+
    '<input id="rInpTexto" placeholder="'+esc(opts.placeholder||'')+'" value="'+esc(opts.valor||'')+'"></div>'+
    '<div class="r-hb"><button class="r-cancela" id="rInpNo">Cancelar</button>'+
    '<button class="r-listo" id="rInpSi">'+esc(opts.okTexto||'Aceptar')+'</button></div>'));
  var host = opts.host || document.body;
  host.appendChild(v); rAbrirVelo(v);
  function cerrar(val){ rCerrarVelo(v); setTimeout(function(){ v.remove(); },220); cb && cb(val); }
  v.onclick = function(ev){ if(ev.target===v) cerrar(null); };
  v.querySelector('#rInpNo').onclick=function(){ cerrar(null); };
  var inp=v.querySelector('#rInpTexto');
  v.querySelector('#rInpSi').onclick=function(){ var val=inp.value.trim(); if(!val){ inp.focus(); return; } cerrar(val); };
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ var val=inp.value.trim(); if(val) cerrar(val); } });
  setTimeout(function(){ inp.focus(); },320);
}

/* Hoja modal para elegir de una lista (reemplaza prompt con opciones).
   items: [{id, titulo, sub, emoji}] → cb(item|null) */
function rHojaLista(opts, items, cb){
  var existente = $('rVeloPick'); if (existente) existente.remove();
  var filas = items.length ? items.map(function(it,i){
    return '<button class="r-pick" data-i="'+i+'"><span class="r-pick-em">'+(it.emoji||'📄')+'</span>'+
      '<span class="r-pick-tx"><b>'+esc(it.titulo)+'</b>'+(it.sub?'<small>'+esc(it.sub)+'</small>':'')+'</span>'+
      '<span class="r-pick-fle">›</span></button>'; }).join('')
    : '<p style="color:var(--gris);font-size:13px;text-align:center;padding:14px">'+esc(opts.vacio||'No hay opciones')+'</p>';
  var v = rEl(rVeloBase('rVeloPick',
    '<b style="font-size:16px">'+esc(opts.titulo||'Elegí una opción')+'</b>'+
    (opts.mensaje?'<small style="color:var(--gris);display:block;margin:3px 0 12px">'+esc(opts.mensaje)+'</small>':'')+
    '<div class="r-pick-lista" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;max-height:56vh;overflow-y:auto">'+filas+'</div>'+
    '<div class="r-hb"><button class="r-cancela" id="rPickNo" style="width:100%">Cancelar</button></div>'));
  var host = opts.host || document.body;
  host.appendChild(v); rAbrirVelo(v);
  function cerrar(it){ rCerrarVelo(v); setTimeout(function(){ v.remove(); },220); cb && cb(it); }
  v.onclick=function(ev){ if(ev.target===v) cerrar(null); };
  v.querySelector('#rPickNo').onclick=function(){ cerrar(null); };
  v.querySelectorAll('.r-pick').forEach(function(b){
    b.onclick=function(){ var it=items[Number(b.getAttribute('data-i'))]; cerrar(it); };
  });
}

/* ── Confirmación PROPIA de la app (reemplaza el confirm() del navegador) ──
   rConfirmar(opts, onOk, onCancel)  · onCancel se dispara al cancelar/tocar fondo. */
function rConfirmar(opts, onOk, onCancel){
  if (typeof opts === 'string') opts = { titulo: opts };
  opts = opts || {};
  var cerrada = false;
  var v = rEl(
    '<div class="r-confirm-velo">'+
      '<div class="r-confirm">'+
        '<div class="r-confirm-icon'+(opts.peligro ? ' peligro':'')+'">'+(opts.icono || (opts.peligro ? '🚪' : '❓'))+'</div>'+
        '<b class="r-confirm-tit">'+esc(opts.titulo || '¿Confirmás?')+'</b>'+
        (opts.mensaje ? '<p class="r-confirm-msg">'+esc(opts.mensaje)+'</p>' : '')+
        '<div class="r-confirm-bot">'+
          '<button class="r-chato" id="rConfNo">'+esc(opts.cancelTexto || 'Cancelar')+'</button>'+
          '<button class="r-listo'+(opts.peligro ? ' peligro':'')+'" id="rConfSi">'+esc(opts.okTexto || 'Aceptar')+'</button>'+
        '</div>'+
      '</div>'+
    '</div>');
  document.body.appendChild(v);
  requestAnimationFrame(function(){ v.classList.add('ver'); });
  function cerrar(cb){ if (cerrada) return; cerrada = true; v.classList.remove('ver');
    setTimeout(function(){ v.remove(); }, 200); if (cb) cb(); }
  v.addEventListener('click', function(ev){ if (ev.target===v) cerrar(onCancel); });
  v.querySelector('#rConfNo').onclick = function(){ cerrar(onCancel); };
  v.querySelector('#rConfSi').onclick = function(){ cerrar(onOk); };
  setTimeout(function(){ var b=v.querySelector('#rConfNo'); if(b) b.focus(); }, 120);
  return v;
}
R.rConfirmar = rConfirmar;
R.rAyuda = rAyuda;
R.rHojaInput = rHojaInput;
R.rHojaLista = rHojaLista;

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
      '<button class="r-pill head" id="rBtnYo" style="margin-left:auto" title="Entrenar vos mismo">🏋️ Mi entrenamiento</button>'+
      '<button class="r-pill head" id="rBtnFin">💰 Finanzas · <b id="rTotalHead">$0</b></button>'+
      '<button class="r-sync-btn" id="rBtnAyuda" title="Cómo usar la app">❓</button>'+
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
  var _btnYo = $('rBtnYo'); if(_btnYo) _btnYo.onclick = function(){ entrarEntrenar(); };
  $('rBtnSalir').onclick = function(){ rConfirmar({ icono:'🚪', titulo:'¿Cerrar tu sesión?', mensaje:'Vas a volver a la pantalla de ingreso.', okTexto:'Cerrar sesión', peligro:true }, function(){ salir(); }); };
  $('rBtnSync').onclick = function(){ rSincronizarAhora(this); };
  var _btnAyuda = $('rBtnAyuda'); if(_btnAyuda) _btnAyuda.onclick = rAyuda;
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
      '<div><button class="r-chato" id="rFWsp">💬 WhatsApp</button>'+
      '<button class="r-chato" id="rFRecordar">🔔 Recordar entrenar</button>'+
      '<button class="r-chato" id="rFEditar">✏️ Editar datos</button>'+
      (u.demo?'<span style="font-size:11px;font-weight:700;color:#d97706">🧪 Alumno de prueba · los datos quedan en este dispositivo</span>':'')+
      '</div></div></div>'+
      '<button class="r-btn-prin" id="rFCrear"><span style="font-size:18px">+</span> Crear plan nuevo</button>'+
      '<button class="r-btn-abono" id="rFAbono">💵 Registrar abono mensual</button>'+
      (u.demo?'':'<button class="r-btn-clave" id="rFClave">🔑 Blanquear contraseña del alumno</button>')+
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
  var btnEditar = wrap.querySelector('#rFEditar');
  if (btnEditar) btnEditar.onclick = function(){ rHojaEditarAlumno(u); };
  var btnRec = wrap.querySelector('#rFRecordar');
  if (btnRec) btnRec.onclick = function(){
    var link = rWaLink(u.telefono, '');
    if (!link){ rToast('Este alumno no tiene WhatsApp cargado', $('rAppProfe')); return; }
    var nombre = (u.nombre.split(' ')[0]||'');
    var est = rEstadoAlumno(u);
    var entrenoHoy = est[1].indexOf('Entrenó hoy')===0;
    var msg = entrenoHoy
      ? '¡Hola '+nombre+'! Vi que ya entrenaste hoy 💪 ¡Genial, seguí así! Cualquier cosa me escribís.'
      : '¡Hola '+nombre+'! Te quería recordar que tenés tu plan de entrenamiento listo 📋. Buscá un ratito y hacelo, que cuando lo cumplís se nota. ¡Vamos que se puede! 🔥';
    var l = rWaLink(u.telefono, msg);
    window.open(l, '_blank');
  };
  var btnClave = wrap.querySelector('#rFClave');
  if (btnClave) btnClave.onclick = function(){
    rConfirmar({ icono:'🔑', titulo:'¿Blanquear la contraseña?', mensaje:u.nombre+' tendrá que elegir una nueva en su próximo ingreso.', okTexto:'Blanquear' }, function(){
      Backend.blanquearPassword(u.id).then(function(r){
        if (r.error){ rToast(r.error, $('rAppProfe')); return; }
        var nombre = (u.nombre.split(' ')[0]||'');
        rHojaCredencial(u, r.password, {
          titulo:'Contraseña blanqueada 🔑',
          subtitulo:'Pasale esta clave temporal a '+u.nombre+': entra con su DNI y la cambia.',
          mensaje:'¡Hola '+nombre+'! Blanqueamos tu contraseña de Mi Entrenador. Entrá con tu DNI y esta clave temporal: '+r.password+' (te va a pedir cambiarla la primera vez).'
        });
      });
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
function rFichaActiva(){ return document.querySelector('#rPantFicha .r-ficha-top, #rColDer .r-ficha-top'); }
function rContenedorFicha(){ var f = rFichaActiva(); return f ? f.closest('#rPantFicha, #rColDer') : document.querySelector('#rColDer, #rPantFicha'); }
function rPintarPlanesFicha(u){
  var wrap = rContenedorFicha();
  var c = wrap.querySelector('#rFPlanes');
  if (!c) return;
  var bloques = [];
  var actual = soloDiasPlan(planDe(u));
  if (planTieneAlgo(actual)) bloques.push({ tit:'Plan actual', plan:actual, abierto:true, cual:'actual' });
  var ant = (u.plan && u.plan.__anterior) ? u.plan.__anterior : null;
  if (ant && planTieneAlgo(ant)) bloques.push({ tit:'Plan anterior', plan:ant, abierto:false, cual:'anterior' });
  if (!bloques.length){
    c.innerHTML = '<div class="r-vacio"><div class="r-g">📋</div><b>Todavía no hay planes.</b><br>Tocá “Crear plan nuevo” para armar el primero.</div>';
    return;
  }
  c.innerHTML =
    '<p class="r-plan-hint">Mantené presionado un plan para <b>borrarlo</b>.</p>'+
    bloques.map(function(b, bi){
    var dias = DIAS.map(function(d){
      var lista = (b.plan[d[0]]||[]);
      if (!lista.length) return '';
      return '<div class="r-dia-linea"><span class="r-dn">'+DIA_CORTO[d[0]]+'</span>'+
        '<span class="r-de">'+lista.map(function(e){ return esc(e.nombre); }).join(', ')+'</span>'+
        '<span class="r-dx">'+lista.length+' ej.</span></div>';
    }).join('');
    var ndias = DIAS.reduce(function(s,d){ return s + ((b.plan[d[0]]||[]).length?1:0); },0);
    return '<div class="r-semana'+(b.abierto?' abierta':'')+'" data-cual="'+b.cual+'">'+
      '<button class="r-semana-cab"><span class="r-ico">📅</span><span class="r-d"><b>'+b.tit+'</b>'+
      '<small>'+ndias+' días con entrenamiento</small></span>'+
      '<span class="r-borrar-plan" data-borrar="'+b.cual+'" title="Borrar plan" role="button">🗑️</span>'+
      '<span class="r-chev">›</span></button>'+
      '<div class="r-semana-dias">'+dias+'</div></div>';
  }).join('');
  wrap.querySelectorAll('.r-semana-cab').forEach(function(b){
    var semana = b.parentElement;
    var lp;
    var btnBorrar = b.querySelector('[data-borrar]');
    function pedirBorrado(){
      var cual = semana.getAttribute('data-cual');
      rConfirmar({ icono:'🗑️', titulo:'¿Borrar el '+(cual==='anterior'?'plan anterior':'plan actual')+'?',
        mensaje: cual==='anterior'
          ? 'Se elimina el plan guardado como anterior. El plan actual no se toca.'
          : 'Se vacía el plan que el alumno tiene ahora. El plan anterior (si existe) se conserva.',
        okTexto:'Sí, borrar', peligro:true }, function(){ rBorrarPlan(u, cual); });
    }
    if (btnBorrar){
      btnBorrar.addEventListener('click', function(ev){ ev.stopPropagation(); ev.preventDefault(); pedirBorrado(); });
    }
    b.addEventListener('pointerdown', function(){
      lp = setTimeout(function(){
        if (navigator.vibrate) navigator.vibrate(15);
        pedirBorrado();
      }, 600);
    });
    function cancelar(){ clearTimeout(lp); }
    b.addEventListener('pointerup', cancelar);
    b.addEventListener('pointermove', cancelar);
    b.addEventListener('pointercancel', cancelar);
    b.addEventListener('click', function(ev){
      if (ev.target && ev.target.closest && ev.target.closest('[data-borrar]')) return;
      if (lp) clearTimeout(lp);
      semana.classList.toggle('abierta');
    });
  });
}
async function rBorrarPlan(u, cual){
  var diasVacios = planVacio();
  if (u.demo){
    var p = R.rLeer(R.rDemoPlanKey(u.id), null) || {};
    if (cual==='anterior') delete p.__anterior; else Object.assign(p, diasVacios);
    R.rGuardar(R.rDemoPlanKey(u.id), p);
    if (T.usuario && T.usuario.id===u.id) T.usuario.plan = p;
  } else {
    var p2 = u.plan ? JSON.parse(JSON.stringify(u.plan)) : {};
    if (cual==='anterior') delete p2.__anterior; else { Object.assign(p2, diasVacios); }
    var r;
    try{ r = await Backend.guardarPlan(u.id, p2); }catch(e){ r={error:'Sin conexión'}; }
    if (r && r.error){ rToast(r.error, $('rAppProfe')); return; }
    if (T.usuario && T.usuario.id===u.id) T.usuario.plan = p2;
  }
  rToast('Plan borrado', $('rAppProfe'));
  // refrescar la ficha donde esté (PC panel derecho o celu)
  if (rEsDesktop()){ rRenderDetalleDer(); } else { rPintarFicha(); }
}
function soloDiasPlan(p){
  var v = planVacio();
  DIAS.forEach(function(d){ if (Array.isArray(p[d[0]])) v[d[0]] = p[d[0]]; });
  return v;
}
async function rPintarProgFicha(u){
  var wrap = rContenedorFicha();
  var c = wrap && wrap.querySelector('#rFProg'); if (!c) c=$('rFProg');
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
  // últimas cargas + evolución
  function rPesoNum(t){ if(t==null) return null; var m=String(t).replace(',','.').match(/(\d+(?:\.\d+)?)/); return m?parseFloat(m[1]):null; }
  var fechas = Object.keys(cargas).sort(), vistos = {}, filas = '';
  var series = {};
  fechas.forEach(function(f){
    Object.keys(cargas[f]||{}).forEach(function(k){
      if(k.indexOf('p:')!==0) return;
      if(!vistos[k]) vistos[k]=cargas[f][k];
      var v=rPesoNum(cargas[f][k]); if(v!=null){ (series[k]=series[k]||[]).push(v); }
    });
  });
  function rSparkline(vals){
    if(!vals || vals.length<2) return '';
    var w=96,h=32,p=4, min=Math.min.apply(null,vals), max=Math.max.apply(null,vals), rango=(max-min)||1;
    var xy=vals.map(function(v,i){ return [p+(w-2*p)*(i/(vals.length-1)), h-p-(h-2*p)*((v-min)/rango)]; });
    var pts=xy.map(function(p){ return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ');
    var up=vals[vals.length-1]>=vals[0], col=up?'#16a34a':'#dc2626';
    var ult=xy[xy.length-1];
    return '<svg width="'+w+'" height="'+h+'" style="flex:0 0 auto"><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="'+ult[0].toFixed(1)+'" cy="'+ult[1].toFixed(1)+'" r="3.2" fill="'+col+'"/></svg>';
  }
  Object.keys(vistos).forEach(function(k){
    var vals=series[k]||[];
    filas += '<div class="r-pago" style="align-items:center"><span class="r-d" style="flex:1"><b>'+esc(k.slice(2).charAt(0).toUpperCase()+k.slice(3))+'</b>'+
      '<small>'+(vals.length>1?('evolución · '+vals.length+' registros'):'último peso registrado')+'</small></span>'+
      (vals.length>1?rSparkline(vals):'')+
      '<span class="r-m" style="margin-left:8px">'+esc(vistos[k])+'</span></div>';
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
        $('rAltaCrear').textContent='Crear cuenta';
        rConfirmar({ icono:'♻️', titulo:'¿Sobreescribir a '+existe.nombre+'?', mensaje:'Ese DNI ya tiene una cuenta tuya. Se actualizan los datos y se genera una clave nueva para mandarle por WhatsApp.', okTexto:'Sobreescribir' }, async function(){
          var ra = await Backend.actualizarPerfil(existe.id, { nombre:nombre, telefono:tel });
          if (ra.error){ rToast(ra.error, $('rAppProfe')); return; }
          rCerrarVelo(v); v.remove();
          rHojaCredencial({ nombre:nombre, telefono:tel }, ra.password);
          rPintarAlumnos($('rBuscaAlu')?$('rBuscaAlu').value:'');
        });
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
function rHojaEditarAlumno(u){
  var existente = $('rVeloEdit'); if (existente) existente.remove();
  var v = rEl(rVeloBase('rVeloEdit',
    '<b style="font-size:17px">✏️ Editar datos</b>'+
    '<small style="color:var(--gris);display:block;margin:3px 0 14px">'+esc(u.nombre)+(u.demo?' · alumno de prueba':'')+'</small>'+
    '<div class="r-campo"><label>Nombre y apellido</label><input id="rEdNombre" value="'+esc(u.nombre||'')+'"></div>'+
    '<div class="r-campo"><label>WhatsApp</label><input id="rEdTel" inputmode="tel" value="'+esc(u.telefono||'')+'" placeholder="351 000 0000"></div>'+
    '<button class="r-btn-prin" id="rEdGuardar">Guardar cambios</button>'));
  $('rAppProfe').appendChild(v);
  rAbrirVelo(v);
  v.onclick = function(ev){ if(ev.target===v) rCerrarVelo(v); };
  setTimeout(function(){ var i=$('rEdNombre'); if(i) i.focus(); },320);
  $('rEdGuardar').onclick = async function(){
    var nombre=$('rEdNombre').value.trim(), tel=$('rEdTel').value.trim();
    if(!nombre){ rToast('Ponele el nombre', $('rAppProfe')); return; }
    var btn=$('rEdGuardar'); btn.textContent='Guardando…';
    if (u.demo){
      var lista = rDemoAlumnos();
      var en = lista.find(function(x){return x.id===u.id;});
      if(en){ en.nombre=nombre; en.telefono=tel; rGuardarDemoAlumno(en); }
      rCerrarVelo(v); setTimeout(function(){ v.remove(); },220);
      rToast('Datos actualizados ✓', $('rAppProfe'));
      rPintarAlumnos($('rBuscaAlu')?$('rBuscaAlu').value:'');
      if (R.entrenador && R.entrenador.usuario && R.entrenador.usuario.id===u.id){ R.entrenador.usuario.nombre=nombre; R.entrenador.usuario.telefono=tel; }
      return;
    }
    var r = await Backend.actualizarPerfil(u.id, { nombre:nombre, telefono:tel });
    btn.textContent='Guardar cambios';
    if (r && r.error){ rToast(r.error, $('rAppProfe')); return; }
    rCerrarVelo(v); setTimeout(function(){ v.remove(); },220);
    rToast('Datos actualizados ✓', $('rAppProfe'));
    try{
      var alumnos = await Backend.listarUsuarios();
      R.entrenador.alumnos = alumnos;
      var actual = alumnos.find(function(x){return x.id===u.id;});
      if (actual && R.entrenador.usuario && R.entrenador.usuario.id===u.id) R.entrenador.usuario = actual;
      rPintarAlumnos($('rBuscaAlu')?$('rBuscaAlu').value:'');
    }catch(e){}
  };
}

function rHojaCredencial(u, password, opts){
  opts = opts || {};
  var existente = $('rVeloCred'); if (existente) existente.remove();
  var titulo = opts.titulo || 'Cuenta creada 🎉';
  var subtitulo = opts.subtitulo || 'Pasale esta clave temporal: entra con su DNI y la cambia.';
  var msjWsp = opts.mensaje || ('¡Hola '+(u.nombre.split(' ')[0]||'')+'! Ya tenés tu acceso a Mi Entrenador. Entrá con tu DNI y esta clave temporal: '+password+' (te va a pedir cambiarla la primera vez).');
  var link = rWaLink(u.telefono, msjWsp);
  var v = rEl(rVeloBase('rVeloCred',
    '<b style="font-size:17px">'+esc(titulo)+'</b>'+
    '<small style="color:var(--gris);display:block;margin:3px 0 10px">'+esc(subtitulo)+'</small>'+
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
R.ocultarEntrenador = function(){
  var a=$('rAppProfe'); if(a) a.classList.remove('ver');
  var b=$('rAppBuilder'); if(b) b.classList.remove('ver');   // cerrar el constructor si estaba abierto
  var v=$('bVelo'); if(v) v.classList.remove('abierto');
};
})();

/* ════════════════════════════════════════════════════════════
   CONSTRUCTOR DE PLANES (mazo del entrenador)
   ════════════════════════════════════════════════════════════ */
(function(){
var R = window.Rediseno;
var B = { abierta:false, userId:null, nombre:'', plan:null, dia:'lun', cat:'todo',
          editando:null, vivos:null, cargas:{}, semana:1, maxSemana:1 };
function bSemanaVacia(){ var s={}; DIAS.forEach(function(d){ s[d[0]]=[]; }); return s; }
function bCambiarSemana(n){
  // guarda la semana actual en B.semanas y pasa a la n
  if(!B.semanas) B.semanas = {};
  B.semanas[B.semana] = B.plan;
  B.semana = n;
  B.plan = (B.semanas[n] && planTieneAlgo(B.semanas[n])) ? B.semanas[n]
        : (function(){ var s=bSemanaVacia(); B.semanas[n]=s; return s; })();
  bPintarSemanas(); bPintarDias(); bPintarMazo(); bPintarGrilla();
  bToast('Semana '+n);
}
function bPintarSemanas(){
  var act=b$('bSemAct'), ant=b$('bSemAnt'), sig=b$('bSemSig');
  if(act) act.textContent='Semana '+B.semana+(B.semana===B.maxSemana?'':' · '+B.maxSemana+' en total');
  if(ant){ ant.disabled = B.semana<=1; ant.style.opacity = B.semana<=1?'.35':'1'; }
  if(sig){ sig.textContent = B.semana>=B.maxSemana ? '+' : '›'; sig.title = B.semana>=B.maxSemana ? 'Agregar semana' : 'Semana siguiente'; }
}
R.builder = B;

function b$(id){ return document.getElementById(id); }
function nuevoId(){ return 'e'+Date.now()+Math.floor(Math.random()*99999); }

B.abrir = function(u, opts){
  opts = opts || {};
  B.modoPropio = !!opts.propio;
  if (B.modoPropio){ __modoPropio = true; }
  B.userId = u.id; B.nombre = u.nombre; B.demo = !!u.demo && !B.modoPropio; B.prevDia = null;
  B.nombreAlumno = null;
  B.semana = 1; B.maxSemana = 1; B.semanas = {};
  var planBase;
  if (B.modoPropio) planBase = (window.sesion && sesion.plan && planTieneAlgo(sesion.plan)) ? sesion.plan : miLeerPlan();
  else planBase = u.demo ? R.rLeer(R.rDemoPlanKey(u.id), null) : u.plan;
  B.vivos = planBase ? JSON.parse(JSON.stringify(planBase)) : null;
  B.plan = { lun:[], mar:[], mie:[], jue:[], vie:[], sab:[], dom:[] };  // plan nuevo: arranca vacío
  B.semanas[1] = B.plan;
  // si el plan vigente ya tenía semanas extra guardadas, las recupera
  if (B.vivos && B.vivos.__semanas){
    Object.keys(B.vivos.__semanas).forEach(function(k){
      var n=Number(k); if(n>1){ B.semanas[n]=JSON.parse(JSON.stringify(B.vivos.__semanas[n])); B.maxSemana=Math.max(B.maxSemana,n); }
    });
  }
  B.dia = claveDia(Date.now()); B.cat = 'todo';
  if (!$('rAppBuilder')){
    document.body.appendChild(crearEstructura());
    conectar();
  }
  $('rAppBuilder').classList.add('ver');
  // borrador automático: si el plan NUEVO todavía no se guardó y hay un borrador, lo recupera
  if (!planBase && !B.modoPropio){
    var borr = R.rLeer(B._claveBorrador(), null);
    if (borr && borr.plan && planTieneAlgo(borr.plan)){
      B.plan = borr.plan; B.dia = borr.dia || B.dia;
      setTimeout(function(){ R.rConfirmar({ icono:'↺', titulo:'Retomar tu plan sin guardar', mensaje:'Tenías un plan que no llegaste a guardar. ¿Lo retomás donde lo dejaste?', okTexto:'Sí, retomarlo', cancelTexto:'Empezar de cero' },
        function(){ B._borradorActivo = true; },
        function(){ B.plan = { lun:[], mar:[], mie:[], jue:[], vie:[], sab:[], dom:[] }; try{ localStorage.removeItem(B._claveBorrador()); }catch(e){} bPintarMazo(); bPintarDias(); }); }, 250);
    }
  }
  bPintarDias(); bPintarMazo(); bPintarGrilla();
  b$('bBusca').value='';
  if (B.modoPropio){
    B.cargas = {};
    var mh = miLeerHechos();
    Object.keys(mh).forEach(function(f){ B.cargas[f]=mh[f]; });
    bPintarMazo(); bPintarGrilla(); bPintarDias();
  } else {
    Backend.obtenerProgreso(u.id).then(function(r){ B.cargas = r.cargas||{}; }).catch(function(){});
  }
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
  var guardarSVG = '<svg class="r-floppy" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
  d.innerHTML = '<div class="r-manchas"><i></i><i></i><i></i></div>'+
    '<div class="r-head"><button class="r-atras" id="bAtras">‹</button>'+
      '<h1>Armar plan<small>Plan de <span id="bNombre"></span></small></h1>'+
      '<button class="r-salir-btn" id="bSalir" title="Cerrar sesión">🚪</button></div>'+
    // PANEL IZQUIERDO (semanas, días, sesión, acciones y planes anteriores)
    '<div class="r-bpanel">'+
      '<div class="r-semanas" id="bSemanas"><button class="r-sem-nav" id="bSemAnt" title="Semana anterior">‹</button><div class="r-sem-act" id="bSemAct">Semana 1</div><button class="r-sem-nav" id="bSemSig" title="Semana siguiente">+</button></div>'+
      '<div class="r-pildoras"><div class="r-pcentro" id="bDias"></div></div>'+
      '<div class="r-plan-zona"><div class="r-plan-titulo"><b>Sesión</b><span id="bAyuda"></span></div>'+
        '<div class="r-mazo" id="bMazo"></div></div>'+
      '<div class="r-pildoras"><div class="r-pcentro">'+
        '<button class="r-pill acc" id="bRepetir">↺ Repetir día anterior</button>'+
        '<button class="r-pill acc" id="bPlantillas">Plantillas</button>'+
        '<button class="r-pill acc" id="bImprimir">🖨️ Imprimir / PDF</button>'+
      '</div></div>'+
      '<div class="r-ant" id="bPrevZona"><div class="r-ant-cab">🕘 Plan anterior <span id="bPrevFecha"></span></div><div class="r-ant-dias" id="bPrev"></div></div>'+
    '</div>'+
    // PANEL DERECHO (biblioteca de ejercicios, a toda la columna)
    '<div class="r-biblio"><div class="r-biblio-cab"><h2>Ejercicios</h2><div class="r-cats" id="bCats"></div></div>'+
      '<input class="r-busca" id="bBusca" placeholder="Buscar: sentadilla, press, curl…" style="margin:8px 0 9px;width:100%">'+
      '<div class="r-grilla" id="bGrilla"></div></div>'+
    '<div class="r-fab-barra">'+
      '<div class="r-contador"><b><span id="bN">0</span> ejercicios</b><small id="bDiaNom"></small></div>'+
      '<button class="r-fab-guardar" id="bGuardar" title="Guardar plan" aria-label="Guardar plan">'+guardarSVG+'</button>'+
    '</div>'+
    // hoja detalles
    '<div class="r-velo" id="bVelo"><div class="r-hoja"><div class="r-agarre"></div>'+
      '<div class="r-dh"><span id="bHImg"></span><div><b id="bHNom"></b><small id="bHSub"></small></div></div>'+
      '<div class="r-pista" id="bHPista"></div>'+
      '<div class="r-dos">'+
        '<div class="r-campo"><label>Series</label><input id="bHSeries" inputmode="numeric" placeholder="4"><div class="r-sugiere" data-p="series"><button>3</button><button>4</button><button>5</button></div></div>'+
        '<div class="r-campo"><label>Repeticiones / tiempo</label><input id="bHReps" placeholder="10-12 · 40 seg"><div class="r-sugiere" data-p="reps"><button>8-10</button><button>10-12</button><button>40 seg</button></div></div>'+
        '<div class="r-campo"><label>Peso / carga</label><input id="bHCarga" placeholder="40 kg · desc. 90 seg"><div class="r-sugiere" data-p="carga"><button>sin peso</button><button>mancuernas</button></div></div>'+
        '<div class="r-campo"><label>⏱️ Tiempo (si es por duración)</label><input id="bHTiempo" inputmode="decimal" placeholder="Ej: 40 seg · 3 min"><div class="r-sugiere" data-p="tiempo"><button>30 seg</button><button>45 seg</button><button>1 min</button><button>5 min</button></div></div>'+
        '<div class="r-campo"><label>Comentario para el alumno</label><input id="bHNota" placeholder="Ej: bajá lento"></div>'+
      '</div><div class="r-hb"><button class="r-cancela" id="bHCancela">Cancelar</button><button class="r-listo" id="bHListo">Listo</button></div>'+
      '<button class="r-quitar" id="bHQuitar" style="display:none;margin-top:10px;width:100%;border:1.5px solid rgba(220,38,38,.4);background:rgba(220,38,38,.08);color:#dc2626;border-radius:13px;padding:11px;font-size:13.5px;font-weight:800">🗑️ Quitar del plan</button></div></div>'+
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
  bPintarPrev();
}
function bPrevPlan(){
  // Referencia para comparar mientras armás: el plan que la persona YA tiene hecho
  // (plan vigente del alumno); si no tiene, el plan anterior guardado.
  var base = B.vivos;
  if (B.demo){ var p = R.rLeer(R.rDemoPlanKey(B.userId), null); base = p; }
  if (!base) return null;
  var dias={}; DIAS.forEach(function(d){ dias[d[0]]=Array.isArray(base[d[0]])?base[d[0]]:[]; });
  if (DIAS.some(function(d){ return (base[d[0]]||[]).length; })) return dias;   // plan vigente con ejercicios
  return base.__anterior || null;                                              // sino, el anterior
}
function bPintarPrev(){
  var zona=b$('bPrevZona'), caja=b$('bPrev'), fecha=b$('bPrevFecha');
  if(!zona) return;
  var ant=bPrevPlan();
  if(!ant || !DIAS.some(function(d){ return (ant[d[0]]||[]).length; })){
    zona.style.display='none'; return;
  }
  zona.style.display='';
  var fTxt='';
  if(ant.__fecha){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(ant.__fecha);
    if(m) fTxt='· '+m[3]+'/'+m[2]; }
  if(fecha) fecha.textContent=fTxt;
  var conDatos = DIAS.map(function(d){ return d[0]; }).filter(function(k){ return (ant[k]||[]).length; });
  if (B.prevDia==null) B.prevDia = (ant[B.dia]&&ant[B.dia].length) ? B.dia : conDatos[0];
  if (!(ant[B.prevDia]||[]).length) B.prevDia = conDatos[0];
  var prevDia = B.prevDia;
  caja.innerHTML='';
  var chips=document.createElement('div'); chips.className='r-ant-chips';
  chips.innerHTML = DIAS.map(function(d){
    var n=(ant[d[0]]||[]).length;
    return '<button class="r-ant-chip'+(prevDia===d[0]?' activo':'')+'" data-d="'+d[0]+'">'+DIA_CORTO[d[0]]+(n?'<i>'+n+'</i>':'')+'</button>';
  }).join('');
  caja.appendChild(chips);
  chips.querySelectorAll('[data-d]').forEach(function(b){
    b.onclick=function(){ B.prevDia=b.getAttribute('data-d'); bPintarPrev(); };
  });
  var lista=document.createElement('div'); lista.className='r-ant-lista';
  var items=ant[prevDia]||[];
  lista.innerHTML = items.length ? items.map(function(e,i){
    return '<div class="r-ant-ej"><span class="r-ant-emoji">'+(e.emoji||'🏋️')+'</span>'+
      '<div class="r-ant-tx"><b>'+escHtml(e.nombre)+'</b><small>'+[e.series&&e.reps?e.series+'×'+e.reps:(e.series||e.reps||''),tiempoTextoDe(e),e.carga].filter(Boolean).join(' · ')+'</small></div>'+
      '<button class="r-ant-mas" data-nom="'+escHtml(e.nombre)+'" title="Agregar al plan nuevo">＋</button></div>';
  }).join('') : '<p class="r-ant-vacio">Ese día no tenía ejercicios.</p>';
  caja.appendChild(lista);
  lista.querySelectorAll('.r-ant-mas').forEach(function(bt){
    bt.onclick=function(){
      var nom=bt.getAttribute('data-nom');
      if(B.plan[B.dia].some(function(x){ return x.nombre===nom; })){ bToast('Ya está en la sesión'); return; }
      var src=(ant[prevDia]||[]).find(function(x){ return x.nombre===nom; }) || bEjLibro(nom);
      var lib=bEjLibro(nom);
      B.plan[B.dia].push({
        id:nuevoId(), nombre:nom, img: lib?lib.img:(src&&src.img), emoji: lib?lib.emoji:(src&&src.emoji||'🏋️'),
        series: src&&src.series, reps: src&&src.reps, carga: src&&src.carga, nota: src&&src.nota,
        tiempo: src&&src.tiempo ? src.tiempo : ''
      });
      bPintarMazo(); bPintarGrilla(); bPintarDias(); bToast('Agregado a la sesión ✓');
    };
  });
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
        '<div class="r-pc-det">'+[e.series&&e.reps?e.series+'×'+e.reps:(e.series||e.reps||''),tiempoTextoDe(e),e.carga].filter(Boolean).join(' · ')+'</div></div>';
      pc.querySelector('[data-x]').onclick=function(ev){ ev.stopPropagation(); lista.splice(i,1); bPintarMazo(); bPintarGrilla(); bPintarDias(); };
      pc.onclick=function(){ if(Date.now()-ultimoGesto<500) return; bAbrirHoja('plan', i); };
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
  b$('bHTiempo').value = tiempoTextoDe(e) || (receta?tiempoTextoDe(receta):'');
  b$('bHNota').value   = e.nota   || (receta?(receta.nota||''):'');
  var pistas=[];
  if (receta && tipo!=='plan') pistas.push('La vez pasada le pusiste <b>'+[receta.series&&receta.reps?receta.series+'×'+receta.reps:'',receta.carga].filter(Boolean).join(' · ')+'</b>.');
  var k = 'p:'+String(e.nombre||e.n||'').trim().toLowerCase();
  var fechas = Object.keys(B.cargas||{}).sort().reverse(), uso=null;
  for (var i=0;i<fechas.length;i++){ if (B.cargas[fechas[i]][k]){ uso=B.cargas[fechas[i]][k]; break; } }
  if (uso) pistas.push('El alumno usó <b>'+uso+'</b> la última vez.');
  var pista = b$('bHPista'); pista.hidden = !pistas.length; pista.innerHTML = pistas.join('<br>') || '💬 Ajustá series, peso o dejá una nota.';
  if (!pistas.length) pista.innerHTML='💬 Ajustá series, peso o dejá una nota para el alumno.';
  var q = b$('bHQuitar'); if (q) q.style.display = (tipo==='plan') ? 'block' : 'none';
  b$('bVelo').classList.add('abierto');
}
function conectar(){
  // ¿Hay algo en el plan nuevo que todavía no se guardó?
  B._hayCambios = function(){
    if(!B.plan) return false;
    return DIAS.some(function(d){ return (B.plan[d[0]]||[]).length>0; });
  };
  // popup de advertencia al volver sin guardar
  B.pedirVolver = function(){
    if(!B._hayCambios()){ B._salir(); return; }
    var v=document.createElement('div');
    v.className='r-confirm-velo salir-velo';
    v.innerHTML='<div class="r-confirm salir-plan">'+
      '<div class="r-confirm-icon">⚠️</div>'+
      '<b class="r-confirm-tit">¿Volver sin guardar?</b>'+
      '<p class="r-confirm-msg">Armaste ejercicios en este plan. Si salís ahora sin guardar, esos cambios se pierdan.</p>'+
      '<div class="r-confirm-bot">'+
        '<button class="r-salir-si">💾 Guardar y volver</button>'+
        '<button class="r-salir-no">Salir sin guardar</button>'+
        '<button class="r-salir-cancel">Seguir acá</button>'+
      '</div></div>';
    document.body.appendChild(v);
    var fin=function(){ v.classList.remove('ver'); setTimeout(function(){ v.remove(); },200); };
    requestAnimationFrame(function(){ v.classList.add('ver'); });
    v.addEventListener('click',function(ev){ if(ev.target===v) fin(); });
    v.querySelector('.r-salir-cancel').onclick=fin;
    v.querySelector('.r-salir-no').onclick=function(){ fin(); B._borrarBorrador && B._borrarBorrador(); B._salir(); };
    v.querySelector('.r-salir-si').onclick=function(){ var b=v.querySelector('.r-salir-si'); b.textContent='Guardando…'; b.disabled=true; B.guardar(); };
  };
  B._salir = function(){
    var ap=b$('rAppBuilder'); if(ap) ap.classList.remove('ver');
    B.abierta=false;
    if(R.entrenador && R.entrenador.usuario && typeof R.rVolverFicha==='function'){
      try{ R.rVolverFicha(); }catch(e){}
    }
  };
  b$('bAtras').onclick = function(){ B.pedirVolver(); };
  var sAnt=b$('bSemAnt'), sSig=b$('bSemSig');
  if(sAnt) sAnt.onclick=function(){ if(B.semana>1) bCambiarSemana(B.semana-1); };
  if(sSig) sSig.onclick=function(){
    if(B.semana < B.maxSemana){ bCambiarSemana(B.semana+1); return; }
    // semana nueva: pide confirmación si la actual está vacía
    if(!planTieneAlgo(B.plan)){ bToast('Primero armá algo en esta semana'); return; }
    B.maxSemana++; bCambiarSemana(B.maxSemana);
  };
  bPintarSemanas();
  var bSalir = b$('bSalir');
  if (bSalir) bSalir.onclick = function(ev){
    ev.preventDefault(); ev.stopPropagation();
    R.rConfirmar({ icono:'🚪', titulo:'¿Cerrar tu sesión?', mensaje:'Vas a volver a la pantalla de ingreso.', okTexto:'Cerrar sesión', peligro:true }, function(){
      var ap=b$('rAppBuilder'); if(ap) ap.classList.remove('ver');          // 1) cerrar el constructor
      var pv=b$('rAppProfe'); if(pv) pv.classList.remove('ver');           // 2) cerrar panel profe
      var bl=document.querySelectorAll('.r-velo.abierto,.velo.abierto');
      for(var i=0;i<bl.length;i++){ bl[i].classList.remove('abierto'); bl[i].classList.remove('ver'); }
      try{ if(typeof window.salir==='function') window.salir(); else salir(); }catch(e){
        if(typeof salir==='function'){ try{ salir(); }catch(_){} }
      }
      var lg2=document.getElementById('vLogin'); if(lg2){ lg2.style.display='flex'; }   // 3) forzar login a la vista
    });
  };
  b$('bBusca').addEventListener('input', function(){ bPintarGrilla(); });
  b$('bHCancela').onclick = function(){ b$('bVelo').classList.remove('abierto'); };
  var bQuitar = b$('bHQuitar');
  if (bQuitar){
    bQuitar.onclick = function(){
      if (B.editando && B.editando.tipo==='plan'){
        var idx = B.editando.ref;
        if (typeof idx === 'number' && B.plan[B.dia][idx]){
          B.plan[B.dia].splice(idx,1);
          b$('bVelo').classList.remove('abierto');
          bPintarMazo(); bPintarGrilla(); bPintarDias();
        }
      }
    };
  }
  b$('bVelo').onclick = function(ev){ if (ev.target===this) this.classList.remove('abierto'); };
  b$('bVelo').querySelectorAll('.r-sugiere button').forEach(function(b){
    b.onclick=function(){ var map={series:'bHSeries',reps:'bHReps',carga:'bHCarga',tiempo:'bHTiempo'}; b$(map[b.parentElement.getAttribute('data-p')]).value=b.textContent.trim(); };
  });
  b$('bHListo').onclick = function(){
    var v=function(id){ return b$(id).value.trim(); };
    var seg=tiempoSegundosDe(v('bHTiempo'));
    if (B.editando.tipo==='plan'){
      var e=B.plan[B.dia][B.editando.ref];
      e.series=v('bHSeries'); e.reps=v('bHReps'); e.carga=v('bHCarga'); e.nota=v('bHNota');
      e.tiempo = seg>0 ? seg : '';
    } else {
      var base=bEjLibro(B.editando.ref);
      B.plan[B.dia].push({ id:nuevoId(), nombre:base.n, img:base.img||'', emoji:base.emoji||'',
        series:v('bHSeries'), reps:v('bHReps'), carga:v('bHCarga'), nota:v('bHNota'),
        tiempo: seg>0 ? seg : '' });
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
  b$('bImprimir').onclick=function(){ bImprimirPlan(); };
  b$('bVeloUtil').onclick=function(ev){ if(ev.target===this) this.classList.remove('abierto'); };
  b$('bUtilGuardar').onclick=function(){
    b$('bVeloUtil').classList.remove('abierto');
    if(!planTieneAlgo(B.plan)){ bToast('El plan está vacío'); return; }
    R.rHojaInput({ host:b$('rAppBuilder'), titulo:'Guardar plantilla', label:'Nombre de la plantilla',
      placeholder:'Ej: Fuerza · semana 1', okTexto:'Guardar' }, function(nombre){
      if(!nombre) return;
      var k=CONFIG.CLAVE_DATOS+'_plantillas_'+sesion.id, g=(function(){ try{return JSON.parse(localStorage.getItem(k))||{};}catch(e){return {};} })();
      g[nombre]=B.plan; try{ localStorage.setItem(k, JSON.stringify(g)); }catch(e){}
      bToast('Plantilla guardada ✓');
    });
  };
  b$('bUtilUsar').onclick=function(){
    b$('bVeloUtil').classList.remove('abierto');
    var k=CONFIG.CLAVE_DATOS+'_plantillas_'+sesion.id, g=(function(){ try{return JSON.parse(localStorage.getItem(k))||{};}catch(e){return {};} })();
    var nombres=Object.keys(g);
    if(!nombres.length){ bToast('No hay plantillas guardadas'); return; }
    R.rHojaLista({ host:b$('rAppBuilder'), titulo:'Usar plantilla', vacio:'No hay plantillas guardadas' },
      nombres.map(function(n){ var ej=Object.keys(g[n]).reduce(function(s,dd){ return s+((g[n][dd]||[]).length); },0);
        return { id:n, titulo:n, sub:ej+' ejercicios', emoji:'📋' }; }), function(it){
      if(!it) return;
      B.plan = JSON.parse(JSON.stringify(g[it.id]));
      ['lun','mar','mie','jue','vie','sab','dom'].forEach(function(d){ if(!Array.isArray(B.plan[d])) B.plan[d]=[]; });
      bPintarDias(); bPintarMazo(); bPintarGrilla(); bToast('Plantilla aplicada: recordá Guardar');
    });
  };
  b$('bUtilCopiar').onclick=function(){
    b$('bVeloUtil').classList.remove('abierto');
    var otros = (R.entrenador.alumnos||[]).filter(function(u){ return u.id!==B.userId && planTieneAlgo(planDe(u)); });
    if(!otros.length){ bToast('Ningún otro alumno con plan'); return; }
    R.rHojaLista({ host:b$('rAppBuilder'), titulo:'Copiar plan de…', vacio:'Ningún otro alumno con plan' },
      otros.map(function(u){ return { id:u.id, titulo:u.nombre, sub:'Plan cargado', emoji:'👤' }; }),
      function(it){
        if(!it) return;
        var src = otros.find(function(u){ return u.id===it.id; });
        B.plan = planVacio();
        var p=planDe(src);
        DIAS.forEach(function(d){ B.plan[d[0]]=(p[d[0]]||[]).map(function(e){ return { id:nuevoId(), nombre:e.nombre, img:e.img||imgDe(e.nombre), emoji:e.emoji||'', series:e.series, reps:e.reps, carga:e.carga, nota:e.nota, tiempo:e.tiempo||'' }; }); });
        bPintarDias(); bPintarMazo(); bPintarGrilla(); bToast('Plan copiado: recordá Guardar');
      });
  };
  b$('bRepetir').onclick=function(){
    var fuente = (B.vivos && B.vivos.__anterior) || (B.vivos && planTieneAlgo(B.vivos) ? B.vivos : null);
    var prev = fuente ? (fuente[B.dia]||[]) : [];
    if(!prev.length){ bToast('No hay un día anterior para repetir'); return; }
    prev.forEach(function(e){ B.plan[B.dia].push({ id:nuevoId(), nombre:e.nombre, img:e.img||imgDe(e.nombre), emoji:e.emoji||'', series:e.series, reps:e.reps, carga:e.carga, nota:e.nota, tiempo:e.tiempo||'' }); });
    bPintarMazo(); bPintarGrilla(); bPintarDias(); bToast('Día anterior repetido: '+prev.length+' ejercicios');
  };
  b$('bGuardar').onclick=function(){ B.guardar(); };
  B.guardar = async function(){
    B.semanas[B.semana] = B.plan;   // sincroniza la semana en edición
    var final={};
    var w1 = B.semanas[1] || B.plan;
    DIAS.forEach(function(d){ final[d[0]] = w1[d[0]]; });
    var extras={}; var hayExtras=false;
    for (var n=2; n<=B.maxSemana; n++){ if(B.semanas[n] && planTieneAlgo(B.semanas[n])){ extras[n]=B.semanas[n]; hayExtras=true; } }
    if(hayExtras){
      final.__semanas = extras;
      var lun = new Date(); lun.setHours(0,0,0,0); lun.setDate(lun.getDate() - ((lun.getDay()+6)%7));
      final.__inicio = fechaClave(lun.getTime());
    }
    if (B.modoPropio){   // el gestor entrena: su plan se SINCRONIZA A LA NUBE como un alumno
      // respaldo local al instante (por si no hay red)
      miGuardarPlan(final);
      if (window.sesion) sesion.plan = final;
      var rr;
      try { rr = await Backend.guardarPlan(sesion.id, final); } catch(e){ rr={error:'Sin conexión'}; }
      if (rr && rr.error){
        // sin red: queda en el dispositivo y el service worker no está; avisamos que se sincroniza al volver
        bToast('Guardado en este dispositivo. Se sincronizará al tener conexión.');
      } else {
        bToast('Plan guardado y sincronizado ☁️');
      }
      B._borrarBorrador();
      $('rAppBuilder').classList.remove('ver');
      __modoPropio=true;
      window.Rediseno.renderAlumno();
      return;
    }
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
      B._salir(); avisar('Plan guardado (prueba)');
      R.entrenador.usuario.plan = final;
      bOfrecerWhatsapp(B.nombreAlumno || B.nombre, final);
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
    avisar('Plan guardado');
    var uid=B.userId;
    var alumnos=await Backend.listarUsuarios();
    R.entrenador.alumnos=alumnos;
    R.entrenador.usuario=alumnos.find(function(x){return x.id===uid;})||R.entrenador.usuario;
    B._salir();
    bOfrecerWhatsapp(B.nombre, final);
  };
}

/* ── imprimir / exportar a PDF el plan que se está armando ── */
function bImprimirPlan(){
  if(!planTieneAlgo(B.plan)){ bToast('El plan está vacío'); return; }
  var nombreApp = (window.CONFIG && CONFIG.APP_NOMBRE) ? CONFIG.APP_NOMBRE : 'Mi Entrenador';
  var c1='#7c3aed', c2='#3b82f6';
  var diasHtml = DIAS.map(function(d){
    var items = (B.plan[d[0]]||[]);
    if(!items.length) return '';
    var filas = items.map(function(e,i){
      var det = [e.series&&e.reps?(e.series+'×'+e.reps):(e.series||e.reps||''), tiempoTextoDe(e), e.carga].filter(Boolean).join(' · ');
      return '<tr><td class="n">'+(i+1)+'</td><td><b>'+escHtml(e.nombre)+'</b>'+(det?'<span>'+escHtml(det)+'</span>':'')+(e.nota?'<em>↳ '+escHtml(e.nota)+'</em>':'')+'</td></tr>';
    }).join('');
    return '<section><h2>'+d[1]+'</h2><table>'+filas+'</table></section>';
  }).join('');
  var html = '<!doctype html><html><head><meta charset="utf-8"><title>Plan · '+escHtml(B.nombre)+'</title>'+
    '<style>'+
    '*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#23233f;margin:0;padding:34px 30px}'+
    '.cab{border-bottom:3px solid '+c1+';padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}'+
    '.cab h1{margin:0;font-size:22px;background:linear-gradient(135deg,'+c1+','+c2+');-webkit-background-clip:text;background-clip:text;color:transparent}'+
    '.cab small{color:#8d8bb0;font-size:13px}.cab .al{text-align:right;font-weight:800;font-size:16px}.cab .al small{display:block;font-weight:500}'+
    'section{margin-bottom:18px;break-inside:avoid}h2{font-size:15px;color:'+c1+';margin:0 0 7px;border-left:4px solid '+c2+';padding-left:9px}'+
    'table{width:100%;border-collapse:collapse}td{padding:7px 8px;border-bottom:1px solid #eee;vertical-align:top;font-size:13px}'+
    'td.n{width:26px;color:#8d8bb0;font-weight:700}td b{font-size:13.5px}td span{display:block;color:#6b6990;font-size:12px;margin-top:1px}'+
    'td em{display:block;color:#b45309;font-size:11.5px;font-style:normal;margin-top:2px}'+
    '.pie{margin-top:24px;text-align:center;color:#8d8bb0;font-size:11.5px;border-top:1px solid #eee;padding-top:12px}'+
    '@media print{body{padding:10px}.cab{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
    '</style></head><body>'+
    '<div class="cab"><div><h1>'+escHtml(nombreApp)+'</h1><small>Plan de entrenamiento</small></div>'+
    '<div class="al">'+escHtml(B.nombre)+'<small>'+new Date().toLocaleDateString('es-AR')+'</small></div></div>'+
    diasHtml+
    '<div class="pie">Generado con '+escHtml(nombreApp)+' · ¡A darle con todo! 🔥</div>'+
    '<script>window.onload=function(){try{window.focus();setTimeout(function(){window.print();},250);}catch(e){}};<\/script>'+
    '</body></html>';
  var w = window.open('', '_blank');
  if(!w){ bToast('El navegador bloqueó la ventana. Permití pop-ups.'); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

/* ── mensaje amigable del plan + ofrecer enviarlo por WhatsApp ── */
function bResumenEjercicio(e){
  var partes = [];
  if (e.series && e.reps) partes.push(e.series+' × '+e.reps);
  else if (e.series) partes.push(e.series+' series');
  else if (e.reps) partes.push(e.reps);
  if (tiempoTextoDe(e)) partes.push('⏱️ '+tiempoTextoDe(e));
  if (e.carga) partes.push(e.carga);
  return '• ' + e.nombre + (partes.length ? ' ('+partes.join(' · ')+')' : '');
}
function bArmarMensajePlan(nombre, plan){
  var LARGOS = { lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo' };
  var nombreCorto = String(nombre||'').split(' ')[0] || '';
  var lineas = [];
  lineas.push('¡Hola '+nombreCorto+'! 💪 Ya te dejé tu nueva rutina en la app Mi Entrenador.');
  lineas.push('');
  var total = 0;
  DIAS.forEach(function(d){
    var lista = plan[d[0]] || [];
    if (!lista.length) return;
    total++;
    lineas.push('*'+LARGOS[d[0]]+'* ('+lista.length+' ejercicios)');
    lista.forEach(function(e){
      lineas.push(bResumenEjercicio(e));
      if (e.nota) lineas.push('   ↳ '+e.nota);
    });
    lineas.push('');
  });
  if (!total){ lineas.push('Todavía no hay ejercicios cargados.'); lineas.push(''); }
  lineas.push('Recordá:');
  lineas.push('✅ Marcá cada ejercicio con ✓ si lo hiciste o ✗ si no salió.');
  lineas.push('⚖️ Anotá los pesos que usás para ver tu progreso.');
  lineas.push('');
  lineas.push('Cualquier cosa me escribís. ¡A darle con todo! 🔥');
  return lineas.join('\n');
}
function bOfrecerWhatsapp(nombre, plan){
  var u = (R.entrenador && R.entrenador.usuario) || null;
  var tel = u && u.telefono;
  var link = null;
  if (tel){
    var d = String(tel).replace(/\D/g,'').replace(/^0+/,'');
    if (d.length===10) d='549'+d; else if (d.length===12 && d.indexOf('54')===0) d='549'+d.slice(2);
    if (d.length>=11){
      var msg = bArmarMensajePlan(nombre, plan);
      link = 'https://wa.me/'+d+'?text='+encodeURIComponent(msg);
    }
  }
  R.rConfirmar({
    icono:'📲', titulo:'¿Se lo enviamos por WhatsApp?',
    mensaje: link ? 'Le mando a '+(u?u.nombre:nombre)+' un mensaje con su nuevo plan listo para entrenar.'
                  : 'Este alumno no tiene WhatsApp cargado en su ficha. Podés enviárselo copiando el mensaje.',
    okTexto: link ? 'Sí, enviar 💬' : 'Copiar mensaje',
    cancelTexto: 'No, después'
  }, function(){
    if (link){ window.open(link, '_blank'); }
    else {
      var msg = bArmarMensajePlan(nombre, plan);
      if (navigator.clipboard) navigator.clipboard.writeText(msg).then(function(){ bToast('Mensaje copiado'); });
    }
  });
}

/* ── gestos: toque=editar · deslizar=scroll · mantener y arrastrar=tomar ── */
var drag=null, ultimoGesto=0, ESPERA=400, UMBRAL=11;
document.addEventListener('touchmove', function(ev){ if(window.__bGestoActivo) ev.preventDefault(); }, { passive:false });
function bFantasma(el){
  var f=document.createElement('div'); f.className='r-fantasma';
  var img=el.querySelector('.r-pc-img img, .r-ec-img img');
  var em=el.querySelector('.r-pc-emoji, .r-ec-emoji');
  var nom=el.querySelector('.r-ec-nom, .r-pc-nom');
  var cabeza = img
    ? '<img src="'+img.src+'">'
    : '<div class="r-f-emoji">'+(em?em.textContent:'🏋️')+'</div>';
  f.innerHTML = cabeza + '<div class="r-f-info"><div class="r-f-nom">'+(nom?nom.textContent:'')+'</div></div><div class="r-f-borrar">🗑️</div>';
  document.body.appendChild(f); return f;
}
function bSobreMazo(x,y){
  var m=b$('bMazo'); if(!m) return false; var r=m.getBoundingClientRect();
  return x>=r.left-20 && x<=r.right+20 && y>=r.top-26 && y<=r.bottom+26;
}
function bGesto(el, tipo, idx){
  var st = null;   // estado del gesto, LOCAL a esta carta (no se cuelga entre elementos)

  function empezar(ev){
    if(!st || st.arrastrando) return;
    st.arrastrando = true;
    window.__bGestoActivo = true;
    ultimoGesto = Date.now();
    try{ el.setPointerCapture(st.pid); }catch(e){}
    if(navigator.vibrate) navigator.vibrate(15);
    st.fantasma = bFantasma(el);
    st.fantasma.style.transform='translate3d('+(st.lx-48)+'px,'+(st.ly-50)+'px,0) scale(1.06)';
    el.style.opacity='.25';
  }

  function limpiar(){
    if(!st) return;
    clearTimeout(st.timer);
    if(st.fantasma) st.fantasma.remove();
    el.style.opacity='';
    var mz=b$('bMazo'); if(mz){ mz.classList.remove('sobre'); mz.classList.remove('fuera'); }
    window.__bGestoActivo=false;
    st=null;
  }

  el.addEventListener('pointerdown', function(ev){
    if(!b$('rAppBuilder')||!b$('rAppBuilder').classList.contains('ver')) return;
    if(ev.target.closest('.r-pc-x')) return;
    if(ev.pointerType==='mouse' && ev.button!==0) return;
    var base=null, ref=Number(idx);
    if(tipo==='nuevo'){
      base=el.getAttribute('data-nom');
      if(B.plan[B.dia].some(function(e){ return e.nombre===base; })) return;
    }
    st={ tipo:tipo, el:el, arrastrando:false, timer:null, seMovio:false, pid:ev.pointerId,
         base:base, idx:ref, sx:ev.clientX, sy:ev.clientY, lx:ev.clientX, ly:ev.clientY, fantasma:null };
    if(ev.pointerType!=='mouse'){ st.timer=setTimeout(function(){ empezar(ev); }, ESPERA); }
  });

  el.addEventListener('pointermove', function(ev){
    if(!st) return;
    st.lx=ev.clientX; st.ly=ev.clientY;
    var dist=Math.hypot(ev.clientX-st.sx, ev.clientY-st.sy);
    if(!st.arrastrando){
      if(ev.pointerType==='mouse'){
        if(dist>UMBRAL) empezar(ev);
        else return;
      } else {
        if(dist>UMBRAL){ clearTimeout(st.timer); limpiar(); }  // touch: se movió antes de la espera → scroll
        return;
      }
    }
    if(dist>6) st.seMovio=true;
    st.fantasma.style.transform='translate3d('+(ev.clientX-48)+'px,'+(ev.clientY-50)+'px,0) scale(1.06)';
    if(st.tipo==='nuevo'){
      b$('bMazo').classList.toggle('sobre', bSobreMazo(ev.clientX,ev.clientY));
    } else {
      var sobre=bSobreMazo(ev.clientX,ev.clientY), mz=b$('bMazo');
      mz.classList.toggle('sobre', sobre);
      mz.classList.toggle('fuera', !sobre);
      st.fantasma.classList.toggle('r-fuera', !sobre);
    }
  });

  function fin(ev){
    if(!st) return;
    var arrastraba=st.arrastrando, movio=st.seMovio, t=st.tipo, base=st.base, indx=st.idx;
    clearTimeout(st.timer);
    try{
      if(arrastraba && movio){
        if(t==='nuevo'){
          if(bSobreMazo(ev.clientX,ev.clientY)) bAbrirHoja('biblio', base);
        } else if(!bSobreMazo(ev.clientX,ev.clientY)){
          B.plan[B.dia].splice(indx,1);
          if(navigator.vibrate) navigator.vibrate([12,40,12]);
          bPintarMazo(); bPintarGrilla(); bPintarDias();
        } else {
          var cards=[].slice.call(b$('bMazo').querySelectorAll('.r-pc'));
          var destino=cards.length;
          for(var i=0;i<cards.length;i++){ var r=cards[i].getBoundingClientRect(); if(ev.clientX<r.left+r.width/2){ destino=i; break; } }
          var lista=B.plan[B.dia], item=lista.splice(indx,1)[0];
          if(destino>indx) destino--;
          lista.splice(Math.max(0,destino),0,item);
          bPintarMazo(); bPintarGrilla();
        }
        ultimoGesto=Date.now();
      }
    }catch(e){ if(window&&window.console) console.error('soltar carta:', e); }
    finally{ limpiar(); }   // SIEMPRE quitar el fantasma y restaurar la carta, aunque algo falle
  }
  el.addEventListener('pointerup', fin);
  el.addEventListener('pointercancel', limpiar);
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
  var vbtn = d$('dVolver'); if(vbtn) vbtn.style.display = (miEsGestor() && __modoPropio) ? 'grid' : 'none';
  d$('rAppAlumno').classList.add('ver');
  dRender();
};
R.ocultarAlumno = function(){ var a=d$('rAppAlumno'); if(a) a.classList.remove('ver'); };

function crearEstructura(){
  var d=document.createElement('div');
  d.className='r-app'; d.id='rAppAlumno';
  d.innerHTML='<div class="r-manchas"><i></i><i></i><i></i></div>'+
    '<div class="r-deck-top">'+
      '<div class="r-deck-fila1">'+
        '<button class="r-atras-deck" id="dVolver" style="display:none" title="Volver a mi panel" aria-label="Volver a mi panel">‹</button>'+
        '<div class="r-deck-titulo"><small>Hola, '+(sesion.nombre.split(' ')[0]||'')+'</small><b id="dTitulo">¡A entrenar!</b></div>'+
        '<span class="r-sem-badge" id="dSemBadge" style="display:none"></span>'+
        '<div class="r-deck-der"><div class="r-anillo-wrap"><div class="r-anillo" id="dAnillo"></div><i id="dAnilloTxt">0%</i></div>'+
        '<button class="r-salir-btn" id="dSalir" title="Cerrar sesión">🚪</button>'+
        '<button class="r-menu-btn" id="dMenu" title="Menú">☰</button></div>'+
      '</div>'+
      '<div class="r-deck-dias" id="dDias"></div>'+
    '</div>'+
    '<div class="r-deck-zona" id="dZona"></div>'+
    '<div class="r-deck-ejs" id="dCuadritos"></div>'+
    '<div class="r-deck-pista" id="dPista">Deslizá la carta → ✓ hecho · ← ✗ no salió</div>'+
    '<div class="r-deck-fin" id="dFin"><div class="r-confeti" id="dConfeti"></div><div class="r-emoji" id="dFinEmoji">🎉</div>'+
      '<h2 id="dFinTitulo"></h2><p id="dFinTexto"></p>'+
      '<div><button id="dFinRevisar">Revisar</button> <button id="dFinSalir" style="background:#f1f1f8;color:var(--gris);box-shadow:none">Salir</button></div></div>'+
    // peso
    '<div class="r-velo" id="dVeloPeso"><div class="r-hoja"><div class="r-agarre"></div>'+
      '<h3 style="font-size:17px;text-align:center">¿Qué peso usaste?</h3><p style="font-size:12.5px;color:var(--gris);text-align:center;margin:4px 0 8px" id="dPesoSub"></p>'+
      '<p style="font-size:11.5px;color:#a06a00;text-align:center;margin:0 0 12px;background:#fff8e6;border:1px solid #ffe2a8;border-radius:10px;padding:7px 10px">💡 Si subiste o bajaste el peso que te indicó tu profe, anotá el real: lo ve en tu progreso. 📈</p>'+
      '<input id="dPesoInput" inputmode="decimal" placeholder="60 kg" style="width:100%;border:1.5px solid var(--borde);border-radius:14px;padding:14px;font-size:18px;font-weight:800;text-align:center;outline:none;background:#fafaff;color:var(--tinta)">'+
      '<div class="r-hb"><button class="r-cancela" id="dPesoCancela">Cancelar</button><button class="r-listo" id="dPesoListo">Listo</button></div></div></div>'+
    // temporizador de ejercicios por tiempo
    '<div class="r-timer-velo" id="dVeloTimer"><div class="r-timer-box">'+
      '<button class="r-timer-x" id="dTimerCerrar" aria-label="Cerrar">×</button>'+
      '<small class="r-timer-ej" id="dTimerNombre"></small>'+
      '<div class="r-timer-anillo"><svg viewBox="0 0 200 200"><circle class="t-pista" cx="100" cy="100" r="88"/><circle class="t-progreso" id="dTimerCirc" cx="100" cy="100" r="88"/></svg>'+
      '<div class="r-timer-num" id="dTimerNum">00:00</div></div>'+
      '<div class="r-timer-botones">'+
        '<button class="t-btn" id="dTimerReset" title="Reiniciar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button>'+
        '<button class="t-play" id="dTimerPlay"><svg viewBox="0 0 24 24" fill="#fff" stroke="none" id="dTimerPlayIco"><path d="M8 5v14l11-7z"/></svg></button>'+
        '<button class="t-btn" id="dTimerOk" title="Ejercicio hecho">✓</button>'+
      '</div>'+
    '</div></div>'+
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
function dPlan(){
  var p = planDe(sesion);
  if(__modoPropio && !DIAS.some(function(d){ return (p[d[0]]||[]).length; })){
    // si todavía no llegó el plan de la nube (ej. sin conexión), usamos el respaldo local
    var loc=miLeerPlan(); if(loc){
      var n=semanaActualDe(loc), src=(n&&n>1&&loc.__semanas&&loc.__semanas[n])?loc.__semanas[n]:loc;
      var v=planVacio(); DIAS.forEach(function(d){ if(Array.isArray(src[d[0]])) v[d[0]]=src[d[0]]; }); return v;
    }
  }
  return p;
}
function dLista(dia){ return dPlan()[dia]||[]; }
/* (tiempoSegundosDe / dFmtTiempo / tiempoTextoDe son globales, definidas arriba) */
/* timers de ejercicios por tiempo: T[ejId]={fin,total,corriendo,resto} */
var dTimers = {};
var dTimerInt = null;
function dTimerDeHoy(){
  if(!dTimers.__f || dTimers.__f!==dHoy()){ dTimers={ __f:dHoy() }; }
  return dTimers;
}
function dTimerHayCorriendo(){
  var T=dTimerDeHoy();
  return Object.keys(T).some(function(k){ return k!=='__f' && T[k].corriendo; });
}
function dEsHoy(){ return D.dia===dHoy(); }
function dHechos(){
  var cloud = sesion.hechos||{};
  if(__modoPropio && !Object.keys(cloud).length){ var loc=miLeerHechos(); if(Object.keys(loc).length) return loc; }
  return cloud;
}
function dMarcasHoy(dia){ var f=fechaClave(Date.now()); if(dia!==dHoy()) return {}; return dHechos()[f]||{}; }
function dEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

function dRender(){
  D.timers.forEach(clearInterval); D.timers=[];
  dSemBadge(); dPintarDias(); dPintarAnillo();
  var lista=dLista(D.dia), zona=d$('dZona');
  zona.querySelectorAll('.r-dcarta').forEach(function(c){ c.remove(); });
  var sinPlan = !planTieneAlgo(dPlan());
  if(!lista.length){
    var carta=document.createElement('div');
    carta.className='r-dcarta entra especial';
    if(sinPlan) carta.innerHTML='<div class="r-gran">✨</div><h2>Tu plan está en camino</h2><p>Tu entrenador lo está preparando. En cuanto lo tengas, lo vas a ver acá.</p>';
    else carta.innerHTML='<div class="r-gran">🌙</div><h2>Día de descanso</h2><p>El descanso también entrena. Recargá pilas: mañana se vuelve.</p>';
    zona.appendChild(carta);
    var db0=d$('dBotones'); if(db0) db0.style.display='none';
    d$('dPista').textContent = dEsHoy() ? '' : 'Tocá un día arriba para volver';
    dPintarCuadritos([], {});
    return;
  }
  var db1=d$('dBotones'); if(db1) db1.style.display='none';
  d$('dPista').textContent = dEsHoy() ? 'Deslizá la carta → ✓ hecho · ← ✗ no salió' : 'Tocá un cuadrito para ver cada ejercicio';
  var marcas=dMarcasHoy(D.dia);
  // cartas: solo la actual (el mazo real sale de Supabase; atrás mostramos difuminado)
  [-1,-2].forEach(function(atras){
    var i=D.idx+atras;
    if(i>=0){ var c=dHacerCarta(lista[i], i, atras===-1?'detras':'detras2'); zona.appendChild(c); }
  });
  var actual=dHacerCarta(lista[D.idx], D.idx, 'entra');
  zona.appendChild(actual);
  // cuadraditos de todos los ejercicios del día (tocables; ✓ verde / ✗ roja)
  dPintarCuadritos(lista, marcas);
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
function dNavFlechas(){ /* flechas retiradas: se navega con los cuadraditos */ }
function dHacerCarta(e, i, clase){
  var marcas=dMarcasHoy(D.dia);
  var m=marcas[e.id];
  var cuadros=imgsDe(e.nombre);
  var imgsCuadro = cuadros.length ? cuadros : (e.img?[e.img]:[]);
  var dibujo = imgsCuadro.length
    ? imgsCuadro.map(function(src){ return '<img src="'+src+'">'; }).join('')
    : '<span class="r-dib-emoji">🏋️</span>';
  var pesoClave='p:'+String(e.nombre||'').trim().toLowerCase();
  var pesoUsado = (dHechos()[fechaClave(Date.now())]||{})[pesoClave] || '';
  var pillPeso = pesoUsado || e.carga;
  var sxr = (e.series&&e.reps)?(e.series+' × '+e.reps):(e.series||e.reps||'');
  var segT = tiempoSegundosDe(e.tiempo);
  var timerPill='';
  if(segT){
    var T=dTimerDeHoy(), st=T[e.id], resto = st ? (st.corriendo?Math.max(0,(st.fin-Date.now())/1000):st.resto) : segT;
    var corriendo = !!(st && st.corriendo && resto>0);
    var termino = !!st && !st.corriendo && st.resto===0;
    timerPill = '<i class="tiempo'+(corriendo?' corre':termino?' fin':'')+'" data-timer="'+e.id+'">'+
      (termino?'✅ ':(corriendo?'⏸️ ':'⏱️ '))+
      '<b>'+(termino?'Listo':dFmtTiempo(resto))+'</b>'+(corriendo?' (tocá)':'')+'</i>';
  }
  var ult='';
  if(!pesoUsado && e.carga===undefined){}
  // última carga real
  var fechas=Object.keys(dHechos()).sort().reverse();
  for(var fi=0;fi<fechas.length;fi++){ var v=(dHechos()[fechas[fi]]||{})[pesoClave]; if(v){ ult=v; break; } }
  var c=document.createElement('div');
  c.className='r-dcarta '+clase;
  c.innerHTML='<div class="r-dibujo"><span class="r-num-ej">'+(i+1)+' / '+dLista(D.dia).length+'</span>'+
    '<span class="r-marca '+(m===true?'ok':m===false?'no':'')+'">'+(m===true?'✓ Hecho':m===false?'✗ No salió':'')+'</span>'+
    '<span class="r-sello ok">¡HECHO!</span><span class="r-sello no">NO SALIÓ</span>'+
    (segT?'<button class="r-timer-fab" data-timer="'+e.id+'" aria-label="Poner el temporizador">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14l11-7z"/></svg>'+
      '<small>'+(segT>=60?Math.round(segT/60)+"′":segT+"″")+'</small></button>':'')+
    dibujo+'</div>'+
    '<div class="r-datos"><h2>'+dEsc(e.nombre)+'</h2>'+
    '<div class="r-pastillas">'+(sxr?'<i>'+sxr+'</i>':'')+
      timerPill+
      (pillPeso?'<i class="peso'+(pesoUsado?' editado':'')+'" data-peso="1">'+(pesoUsado?'Usaste '+pesoUsado:pillPeso)+' ✎</i>':'')+
    '</div>'+
    (e.nota?'<div class="r-nota"><b>Profe:</b> '+dEsc(e.nota)+'</div>':'')+
    (ult && !pesoUsado ? '<div class="r-ult-peso">La última vez usaste <b>'+dEsc(ult)+'</b></div>' : '')+
    '</div>';
  var pill=c.querySelector('[data-peso]');
  if(pill && dEsHoy()) pill.onclick=function(ev){ ev.stopPropagation(); dAbrirPeso(e); };
  c.querySelectorAll('[data-timer]').forEach(function(b){
    b.style.pointerEvents='auto';
    b.onclick=function(ev){ ev.stopPropagation(); ev.preventDefault(); dAbrirTimer(e); };
  });
  return c;
}
function dPintarCuadritos(lista, marcas){
  var caja=d$('dCuadritos'); if(!caja) return;
  if(!lista.length){ caja.innerHTML=''; caja.style.display='none'; return; }
  caja.style.display='flex';
  caja.innerHTML = lista.map(function(e,i){
    var m=marcas[e.id];
    var cuadros=imgsDe(e.nombre);
    var mini = cuadros.length
      ? '<img src="'+cuadros[0]+'" alt="">'
      : '<span class="r-cu-em">'+(e.emoji||'🏋️')+'</span>';
    var sello = m===true ? '<b class="r-cu-v">✓</b>' : m===false ? '<b class="r-cu-x">✗</b>' : '';
    return '<button class="r-cuadrito'+(i===D.idx?' act':'')+(m===true?' ok':m===false?' no':'')+'" data-i="'+i+'">'+mini+sello+'</button>';
  }).join('');
  caja.querySelectorAll('.r-cuadrito').forEach(function(b){
    b.onclick=function(){ D.idx=Number(b.getAttribute('data-i')); dRender(); };
  });
  // si hay muchos ejercicios y la fila scrollea, mantener el actual a la vista
  var act=caja.querySelector('.r-cuadrito.act');
  if(act) caja.scrollLeft = act.offsetLeft - (caja.clientWidth - act.offsetWidth)/2;
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
function dSemBadge(){
  var el=d$('dSemBadge'); if(!el) return;
  var p=sesion&&sesion.plan;
  try{
    if(p && p.__semanas && typeof semanaActualDe==='function'){
      var n=semanaActualDe(p), max=1;
      Object.keys(p.__semanas).forEach(function(k){ var x=Number(k); if(x>max) max=x; });
      el.style.display='inline-block';
      el.textContent='Semana '+n+' de '+max+' 📅';
    } else { el.style.display='none'; }
  }catch(e){ el.style.display='none'; }
}
function dNavFlechas2(){}
function miMarcar(fecha, ejId, valor){
  var h=miLeerHechos(); h[fecha]=h[fecha]||{}; h[fecha][ejId]=valor; miGuardarHechos(h); return {ok:true, hechos:h};
}
function miGuardarPesoLocal(fecha, nombre, peso){
  var h=miLeerHechos(); h[fecha]=h[fecha]||{};
  var k='p:'+String(nombre||'').trim().toLowerCase();
  var t=String(peso||'').trim(); if(t) h[fecha][k]=t; else delete h[fecha][k];
  miGuardarHechos(h); return {ok:true, hechos:h};
}
async function dResponder(ok){
  if(!dEsHoy()) return;
  var lista=dLista(D.dia), e=lista[D.idx];
  var carta=d$('dZona').querySelector('.r-dcarta.entra');
  var f=fechaClave(Date.now());
  var r;
  if(__modoPropio){
    // optimista: espejo local al instante (offline) + nube en paralelo
    var loc=miLeerHechos(); loc[f]=loc[f]||{}; loc[f][e.id]=!!ok; miGuardarHechos(loc);
    var mem = (sesion.hechos&&sesion.hechos[f]) ? Object.assign({}, sesion.hechos[f]) : {};
    mem[e.id]=!!ok;
    var hechosObj=Object.assign({}, sesion.hechos||{}); hechosObj[f]=mem; sesion.hechos=hechosObj;
    Backend.marcarHecho(sesion.id, f, e.id, ok).then(function(rr){
      if(rr && rr.hechos){ sesion.hechos=rr.hechos; }
    }).catch(function(){ /* quedó el espejo local; se sincroniza al volver */ });
    r={ ok:true, hechos:hechosObj };
  } else {
    r = await Backend.marcarHecho(sesion.id, f, e.id, ok);
  }
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
    : 'Realizaste '+hechas+' de '+lista.length+'. Mañana se vuelve.';
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
  var actual=(dHechos()[f]||{})[k]||'';
  d$('dPesoSub').textContent='Profe te indicó: '+(e.carga||'sin peso')+(actual?' · ya anotaste '+actual:'');
  d$('dPesoInput').value=actual||e.carga||'';
  d$('dVeloPeso').classList.add('abierto');
  setTimeout(function(){ d$('dPesoInput').focus(); },300);
  dPesoEj=e;
}
var dPesoEj=null;
/* ── temporizador de ejercicios por tiempo ── */
var dTimerEj=null;
function dAbrirTimer(e){
  var seg=tiempoSegundosDe(e.tiempo);
  if(!seg) return;
  dTimerEj=e;
  var T=dTimerDeHoy(), st=T[e.id];
  if(!st){ st=T[e.id]={ total:seg, resto:seg, fin:0, corriendo:false }; }
  d$('dTimerNombre').textContent=e.nombre||'';
  d$('dVeloTimer').classList.add('ver');
  dTimerRender();
}
function dTimerCerrar(){ d$('dVeloTimer').classList.remove('ver'); dTimerEj=null; }
function dTimerEstado(){ var T=dTimerDeHoy(); return dTimerEj ? T[dTimerEj.id] : null; }
function dTimerRender(){
  var st=dTimerEstado(); if(!st) return;
  var resto = st.corriendo ? Math.max(0,(st.fin-Date.now())/1000) : st.resto;
  d$('dTimerNum').textContent=dFmtTiempo(resto);
  var circ=d$('dTimerCirc');
  var long=2*Math.PI*88, p=st.total?Math.min(1,resto/st.total):0;
  circ.style.strokeDashoffset=String(long*(1-p));
  var caja=d$('dVeloTimer');
  caja.classList.toggle('corre', st.corriendo && resto>0);
  caja.classList.toggle('fin', !st.corriendo && resto<=0);
  d$('dTimerPlayIco').innerHTML = st.corriendo && resto>0
    ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'
    : '<path d="M8 5v14l11-7z"/>';
}
function dTimerTick(){
  var st=dTimerEstado();
  if(!st) return;
  if(st.corriendo){
    var resto=Math.max(0,(st.fin-Date.now())/1000);
    if(resto<=0){ st.corriendo=false; st.resto=0; dTimerFinalizo(); }
  }
  if(dTimerEj) dTimerRender();
  dTimerRefrescarPills();
}
function dTimerRefrescarPills(){
  var zona=d$('dZona'); if(!zona) return;
  zona.querySelectorAll('[data-timer]').forEach(function(el){
    var id=el.getAttribute('data-timer');
    var e=dLista(D.dia).find(function(x){ return String(x.id)===String(id); });
    if(!e) return;
    var segT=tiempoSegundosDe(e.tiempo), T=dTimerDeHoy(), stx=T[id];
    var rr = stx ? (stx.corriendo?Math.max(0,(stx.fin-Date.now())/1000):stx.resto) : segT;
    var corr = !!(stx && stx.corriendo && rr>0);
    var listo = !!stx && !stx.corriendo && stx.resto===0;
    el.classList.toggle('corre',corr); el.classList.toggle('fin',listo);
    if(el.tagName==='I') el.innerHTML=(listo?'✅ ':'<b>'+dFmtTiempo(rr)+'</b>')+(corr?' ⏸':' ⏱');
  });
}
function dTimerToggle(){
  var st=dTimerEstado(); if(!st) return;
  if(!st.corriendo && st.resto<=0){ st.resto=st.total; }
  st.corriendo=!st.corriendo;
  if(st.corriendo) st.fin=Date.now()+Math.max(1,Math.round(st.resto*1000));
  else st.resto=Math.max(0,(st.fin-Date.now())/1000);
  dTimerRender(); dRender();
}
function dTimerReset(){
  var st=dTimerEstado(); if(!st) return;
  st.corriendo=false; st.resto=st.total; st.fin=0;
  dTimerRender(); dRender();
}
function dTimerFinalizo(){
  dBeepFin();
  if(navigator.vibrate) navigator.vibrate([200,80,200,80,400]);
  dToast('⏱️ ¡Tiempo! Terminaste el ejercicio');
  if(!dEsHoy()) return;
  setTimeout(function(){ dTimerCerrar(); dResponder(true); }, 1400);
}
function dBeepFin(){
  try{
    var ctx=dBeepFin._ctx || (dBeepFin._ctx=new (window.AudioContext||window.webkitAudioContext)());
    if(ctx.state==='suspended') ctx.resume();
    [0,0.22,0.44].forEach(function(t,i){
      var o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sine'; o.frequency.value = i<2?880:1320;
      g.gain.setValueAtTime(0.0001, ctx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime+t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+t+0.18);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime+t); o.stop(ctx.currentTime+t+0.2);
    });
  }catch(e){}
}
function conectar(){
  if(d$('dSi')) d$('dSi').onclick=function(){ dResponder(true); };
  if(d$('dNo')) d$('dNo').onclick=function(){ dResponder(false); };
  d$('dPesoCancela').onclick=function(){ d$('dVeloPeso').classList.remove('abierto'); };
  d$('dVeloPeso').onclick=function(ev){ if(ev.target===this) this.classList.remove('abierto'); };
  // temporizador
  d$('dTimerPlay').onclick=function(){ dTimerToggle(); };
  d$('dTimerReset').onclick=function(){ dTimerReset(); };
  d$('dTimerOk').onclick=function(){ dTimerCerrar(); if(dEsHoy()) dResponder(true); };
  d$('dTimerCerrar').onclick=function(){ dTimerCerrar(); };
  d$('dVeloTimer').onclick=function(ev){ if(ev.target===this) dTimerCerrar(); };
  if(!dTimerInt) dTimerInt=setInterval(function(){
    if(!d$('dVeloTimer').classList.contains('ver') && !dTimerHayCorriendo()) return;
    dTimerTick();
  },300);
  d$('dPesoListo').onclick=async function(){
    var v=d$('dPesoInput').value.trim();
    var f=fechaClave(Date.now());
    var r;
    if(__modoPropio){
      // optimista: espejo local + nube
      r=miGuardarPesoLocal(f, dPesoEj.nombre, v);
      if(r.hechos) sesion.hechos=r.hechos;
      Backend.guardarPeso(sesion.id, f, dPesoEj.nombre, v).then(function(rr){ if(rr&&rr.hechos) sesion.hechos=rr.hechos; }).catch(function(){});
    } else {
      r=await Backend.guardarPeso(sesion.id, f, dPesoEj.nombre, v);
    }
    if(r.error){ dToast(r.error); return; }
    if(r.hechos) sesion.hechos=r.hechos;
    d$('dVeloPeso').classList.remove('abierto'); dRender();
  };
  d$('dFinRevisar').onclick=function(){ d$('dFin').classList.remove('ver'); D.idx=0; dRender(); };
  d$('dFinSalir').onclick=function(){ d$('dFin').classList.remove('ver'); dVolverDePropio(); };
  d$('dMenu').onclick=function(){ d$('dVeloMenu').classList.add('abierto'); };
  d$('dSalir').onclick=function(){ R.rConfirmar({ icono:'🚪', titulo:'¿Cerrar tu sesión?', mensaje:'Vas a volver a la pantalla de ingreso.', okTexto:'Cerrar sesión', peligro:true }, function(){ salir(); }); };
  var _dv=d$('dVolver'); if(_dv) _dv.onclick=function(){ dVolverDePropio(); };
  d$('dVeloMenu').onclick=function(ev){ if(ev.target===this) this.classList.remove('abierto'); };
  d$('dMenuSalir').onclick=function(){ d$('dVeloMenu').classList.remove('abierto'); salir(); };
  d$('dMenuAyuda').onclick=function(){ d$('dVeloMenu').classList.remove('abierto'); if(window.Rediseno.rAyuda) window.Rediseno.rAyuda(); };
  d$('dMenuProg').onclick=function(){
    d$('dVeloMenu').classList.remove('abierto');
    R.ocultarAlumno();
    mostrar('home');
    verTab('prog');
  };
  // gesto deslizar la carta (fluido: rAF + transición de resorte)
  var zona=d$('dZona'), arr=null;
  var umbral=80, rafId=null;
  function aplicarTirada(carta, dx, dy){
    var ancho = carta.offsetWidth || 300;
    var rot = dx/16 + Math.max(-7, Math.min(7, dy/40));
    carta.style.transform='translate3d('+dx+'px,'+(dy||0)+'px,0) rotate('+rot+'deg)';
    carta.classList.toggle('sw-ok', dx>30);
    carta.classList.toggle('sw-no', dx<-30);
    var sOk=carta.querySelector('.r-sello.ok'), sNo=carta.querySelector('.r-sello.no');
    var fuerza=Math.min(1, Math.abs(dx)/umbral);
    if(sOk) sOk.style.opacity = dx>14 ? String(fuerza) : '0';
    if(sNo) sNo.style.opacity = dx<-14 ? String(fuerza) : '0';
    // la pila de atrás avanza suave con el dedo
    var prog=Math.min(1, Math.abs(dx)/ancho);
    var p=carta.parentElement;
    var d1=p.querySelector('.r-dcarta.detras'), d2=p.querySelector('.r-dcarta.detras2');
    if(d1) d1.style.transform='translate3d(0,'+((18-18*prog))+'px,0) scale('+(0.94+0.06*prog)+')';
    if(d2) d2.style.transform='translate3d(0,'+((32-14*prog))+'px,0) scale('+(0.88+0.06*prog)+')';
  }
  function programar(){
    if(rafId!=null) return;
    rafId=requestAnimationFrame(function(){
      rafId=null;
      if(arr){ aplicarTirada(arr.c, arr.x, arr.y); }
    });
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
    if(ev.target.closest('[data-peso]')||ev.target.closest('.r-nav-dia')||ev.target.closest('[data-timer]')) return;
    var c=ev.target.closest('.r-dcarta.entra'); if(!c) return;
    if(arr && arr.c===c) return;
    arr={sx:ev.clientX, sy:ev.clientY, x:0, y:0, c:c, movio:false};
    if(rafId!=null){ cancelAnimationFrame(rafId); rafId=null; }
    try{c.setPointerCapture(ev.pointerId);}catch(e){}
    c.style.transition='none';
    c.style.zIndex='7';
    var d1=c.parentElement.querySelector('.r-dcarta.detras'), d2=c.parentElement.querySelector('.r-dcarta.detras2');
    if(d1) d1.style.transition='transform .18s linear'; if(d2) d2.style.transition='transform .18s linear';
  });
  zona.addEventListener('pointermove', function(ev){
    if(!arr) return;
    arr.x=ev.clientX-arr.sx; arr.y=ev.clientY-arr.sy;
    if(Math.hypot(arr.x,arr.y)>6) arr.movio=true;
    // si el gesto es casi vertical, lo dejamos (no lo forzamos a swipe)
    if(Math.abs(arr.y) > Math.abs(arr.x)*1.4 && Math.abs(arr.x)<24) return;
    programar();
  });
  function fin(ev){
    if(!arr) return;
    var dx=arr.x||0, carta=arr.c, cancelado = ev && ev.type==='pointercancel';
    if(rafId!=null){ cancelAnimationFrame(rafId); rafId=null; }
    carta.style.transition='';
    carta.style.zIndex='';
    var d1=carta.parentElement.querySelector('.r-dcarta.detras'), d2=carta.parentElement.querySelector('.r-dcarta.detras2');
    if(d1) d1.style.transition=''; if(d2) d2.style.transition='';
    if(cancelado){ carta.classList.add('volver'); resetPila(carta); setTimeout(function(){ carta.classList.remove('volver'); },420); arr=null; return; }
    var esHoy = dEsHoy();
    if(esHoy && dx>umbral){ carta.classList.remove('sw-ok','sw-no'); carta.style.transform=''; carta.classList.add('fuera-ok'); dResponder(true); }
    else if(esHoy && dx<-umbral){ carta.classList.remove('sw-ok','sw-no'); carta.style.transform=''; carta.classList.add('fuera-no'); dResponder(false); }
    else { carta.classList.add('volver'); resetPila(carta); setTimeout(function(){ carta.classList.remove('volver'); },420); }
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
var R = window.Rediseno;
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
  if(sesion.rol==='superadmin' || sesion.rol==='admin'){
    window.Rediseno.renderOwner && window.Rediseno.renderOwner();
  } else if(sesion.rol==='entrenador'){
    window.Rediseno.renderEntrenador();
  } else if(sesion.rol==='alumno' || sesion.rol==='usuario'){
    window.Rediseno.renderAlumno();
  }
  // onboarding: primera vez que entra a la interfaz nueva
  try{
    var kAyuda = 'proto_entrenador_v1_ayuda_v2_'+(sesion.rol||'x');
    if(!localStorage.getItem(kAyuda)){
      localStorage.setItem(kAyuda,'1');
      setTimeout(function(){ window.Rediseno.rAyuda && window.Rediseno.rAyuda(); }, 700);
    }
  }catch(e){}
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
  // gestor entrenando en su mazo propio → vuelve a su panel de gestión
  if (typeof __modoPropio !== 'undefined' && __modoPropio){
    var _a = $('rAppAlumno'), _b = $('rAppBuilder');
    if ((_a && _a.classList.contains('ver')) || (_b && _b.classList.contains('ver'))){
      if (typeof dVolverDePropio === 'function'){ dVolverDePropio(); return 'capa'; }
    }
  }
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
  // 1 · el constructor de planes (mazo del profe) → avisa si hay cambios y vuelve
  if (visible(build)){ R.builder.pedirVolver ? R.builder.pedirVolver() : R.builder.cerrar(); return 'capa'; }
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
  try{ window.__modoPropio = false; }catch(e){}
  if (typeof __modoPropio !== 'undefined') __modoPropio = false;
  try{
    window.Rediseno && window.Rediseno.ocultarAlumno && window.Rediseno.ocultarAlumno();
    window.Rediseno && window.Rediseno.ocultarEntrenador && window.Rediseno.ocultarEntrenador();
    window.Rediseno && window.Rediseno.ocultarOwner && window.Rediseno.ocultarOwner();
  }catch(e){}
  ['rAppProfe','rAppAlumno','rAppOwner','rAppBuilder'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.classList.remove('ver');
  });
  try{ _salir && _salir(); }catch(e){}
  var lg=document.getElementById('vLogin'); if(lg){ lg.style.display='flex'; }
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
      '<button class="r-pill head" id="oYo" title="Entrenar vos mismo" style="margin-left:auto">🏋️ Mi entrenamiento</button>'+
      '<button class="r-sync-btn" id="oAyuda" title="Cómo usar la app">❓</button>'+
      '<button class="r-sync-btn" id="oSync" title="Sincronizar">🔄</button>'+
      '<button class="r-salir-btn" id="oSalir" title="Cerrar sesión">🚪</button></div>'+
    '<div style="padding:8px 16px 30px;overflow-y:auto;flex:1">'+
      '<div class="r-caja" style="margin-bottom:14px">'+
        '<h3>📊 Resumen</h3><div id="oResumen" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"></div></div>'+
      '<div class="r-caja" style="margin-bottom:14px">'+
        '<h3>👥 Entrenadores</h3>'+
        '<p style="font-size:12.5px;color:var(--gris);margin:2px 0 10px;line-height:1.4">Cobrá membresías, activá pruebas o dales "para siempre". <button class="r-chato" id="oRecargar" style="float:right;padding:5px 11px;font-size:12px">↺ Recargar</button></p>'+
        '<div id="oEntrenadores"><div style="color:var(--gris);font-size:13px;padding:4px">Cargando…</div></div></div>'+

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
  o$('oSalir').onclick = function(){ R.rConfirmar({ icono:'🚪', titulo:'¿Cerrar tu sesión?', mensaje:'Vas a volver a la pantalla de ingreso.', okTexto:'Cerrar sesión', peligro:true }, function(){ R.ocultarOwner(); salir(); }); };
  o$('oSync').onclick = function(){ oToast('✓ Datos actualizados'); };
  var _oAyuda = o$('oAyuda'); if(_oAyuda) _oAyuda.onclick = function(){ R.rAyuda && R.rAyuda(); };
  var _oYo = o$('oYo'); if(_oYo) _oYo.onclick = function(){ entrarEntrenar(); };
  var buscar = function(){ oBuscar(); };
  o$('oBuscar').onclick = buscar;
  o$('oDni').addEventListener('keydown', function(e){ if(e.key==='Enter') buscar(); });
  oRenderEntrenadores();
  if (o$('oRecargar')) o$('oRecargar').onclick = function(){ oRenderEntrenadores(); oToast('↺ Actualizado'); };
};
R.ocultarOwner = function(){ var a=o$('rAppOwner'); if(a) a.classList.remove('ver'); };

async function oRenderEntrenadores(){
  var caja=o$('oEntrenadores'), res=o$('oResumen');
  if(!caja) return;
  var todos;
  try{ todos = await Backend.listarUsuarios(); }catch(e){ caja.innerHTML='<div style="color:#dc2626;font-size:13px">No se pudo cargar. Revisá la conexión.</div>'; return; }
  var entrenadores = todos.filter(function(u){ return u.rol==='entrenador'; });
  var alumnos = todos.filter(function(u){ return u.rol==='alumno'; });
  var vencidos = entrenadores.filter(function(u){ var b=badgeDe(u); return b && b[0]==='mal'; }).length;
  var prueba = entrenadores.filter(function(u){ return u.membresia && u.membresia.tipo==='prueba'; }).length;
  if(res){
    var chip=function(t,n,color){ return '<span style="background:'+color+';color:#fff;border-radius:20px;padding:7px 14px;font-size:12.5px;font-weight:800">'+n+' '+t+'</span>'; };
    res.innerHTML = chip('entrenadores', entrenadores.length, 'linear-gradient(135deg,#7c3aed,#3b82f6)')
      + chip('alumnos', alumnos.length, 'linear-gradient(135deg,#0ea5e9,#22c55e)')
      + (vencidos?chip('con deuda', vencidos, 'linear-gradient(135deg,#ef4444,#dc2626)'):'')
      + (prueba?chip('en prueba', prueba, 'linear-gradient(135deg,#f59e0b,#d97706)'):'');
  }
  if(!entrenadores.length){ caja.innerHTML='<div style="color:var(--gris);font-size:13px;padding:4px">Todavía no hay entrenadores creados.</div>'; return; }
  caja.innerHTML = entrenadores.map(function(u,i){
    var b=(typeof badgeDe==='function')?badgeDe(u):['ok','Activo'];
    var color = b[0]==='mal'?'#dc2626':b[0]==='oro'?'#d97706':b[0]==='gris'?'#9ca3af':b[0].indexOf('Prueba')>=0?'#d97706':'#16a34a';
    var nAlu = alumnos.filter(function(a){ return a.entrenadorId===u.id || a.entrenador_id===u.id; }).length;
    return '<div class="o-ent" data-i="'+i+'">'+
      '<span class="r-avatar">'+oEsc((u.nombre||'?').charAt(0).toUpperCase())+'</span>'+
      '<div style="flex:1;min-width:0"><b style="font-size:14px">'+oEsc(u.nombre)+'</b>'+
      '<small style="display:block;color:var(--gris);font-size:11.5px">DNI '+oEsc(u.dni)+(u.telefono?' · '+oEsc(u.telefono):'')+' · '+nAlu+' alumnos</small>'+
      '<span style="display:inline-block;margin-top:4px;font-size:11px;font-weight:800;color:'+color+'">● '+oEsc(b[1])+(u.activo===false?' · desactivado':'')+'</span></div>'+
      '<button class="r-chato o-ent-btn" data-acc="pagar" style="padding:6px 10px;font-size:12px">💵 Cobrar</button>'+
      '<button class="r-chato o-ent-btn" data-acc="prueba" style="padding:6px 10px;font-size:12px">🧪 Prueba</button>'+
      '<button class="r-chato o-ent-btn" data-acc="siempre" style="padding:6px 10px;font-size:12px">⭐ Siempre</button>'+
      '<button class="r-chato o-ent-btn" data-acc="toggle" style="padding:6px 10px;font-size:12px">'+(u.activo===false?'▶️ Activar':'⏸️ Pausar')+'</button>'+
    '</div>';
  }).join('');
  caja.querySelectorAll('.o-ent').forEach(function(row){
    var u = entrenadores[Number(row.getAttribute('data-i'))];
    row.querySelectorAll('.o-ent-btn').forEach(function(btn){
      btn.onclick=function(){ oAccionEntrenador(u, btn.getAttribute('data-acc')); };
    });
  });
}
function oAccionEntrenador(u, acc){
  if(acc==='pagar'){
    R.rHojaInput({ titulo:'💵 Cobrar membresía', label:'Meses a cobrar', placeholder:'1', valor:'1', okTexto:'Confirmar pago' }, function(meses){
      if(!meses) return;
      var m = parseInt(meses,10); if(!m || m<1){ oToast('Poné los meses'); return; }
      R.rConfirmar({ icono:'💵', titulo:'¿Registrar pago de '+u.nombre+'?', mensaje:m+' mes(es) de membresía. Se extiende su vencimiento.', okTexto:'Sí, cobrar' }, async function(){
        var precio = (window.CONFIG && CONFIG.PRECIO_MES) ? CONFIG.PRECIO_MES : 0;
        var r = await Backend.registrarPago(u.id, m, precio*m);
        if(r && r.error){ oToast(r.error); return; }
        oToast('Pago registrado ✓'); oRenderEntrenadores();
      });
    });
    return;
  }
  if(acc==='prueba'){
    R.rConfirmar({ icono:'🧪', titulo:'¿Activar prueba a '+u.nombre+'?', mensaje:'Tendrá unos días de uso con la franja de prueba a la vista.', okTexto:'Activar prueba' }, async function(){
      var r = await Backend.cambiarMembresia(u.id,'prueba');
      if(r && r.error){ oToast(r.error); return; } oToast('Prueba activada ✓'); oRenderEntrenadores();
    });
    return;
  }
  if(acc==='siempre'){
    R.rConfirmar({ icono:'⭐', titulo:'¿Membresía para siempre?', mensaje:u.nombre+' no vencerá nunca más (badge dorado).', okTexto:'Dar para siempre' }, async function(){
      var r = await Backend.cambiarMembresia(u.id,'siempre');
      if(r && r.error){ oToast(r.error); return; } oToast('Membresía para siempre ⭐'); oRenderEntrenadores();
    });
    return;
  }
  if(acc==='toggle'){
    var va = u.activo===false;
    R.rConfirmar({ icono: va?'▶️':'⏸️', titulo: va?('¿Activar a '+u.nombre+'?'):('¿Pausar a '+u.nombre+'?'),
      mensaje: va?'Vuelve a poder ingresar con normalidad.':'No podrá ingresar hasta que lo reactives.',
      okTexto: va?'Activar':'Pausar', peligro: !va }, async function(){
      var r = await Backend.setActivo(u.id, va);
      if(r && r.error){ oToast(r.error); return; } oToast(va?'Activado ✓':'Pausado'); oRenderEntrenadores();
    });
    return;
  }
}

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

function oBorrar(){
  if (!oActual) return;
  var u = oActual;
  R.rConfirmar({ icono:'🗑️', titulo:'¿Borrar a '+u.nombre+'?', mensaje:'DNI '+u.dni+'. Se elimina el acceso y todos sus datos. El DNI queda libre para volver a crear. Esta acción NO se puede deshacer.', okTexto:'Sí, borrar cuenta', peligro:true }, function(){ oEjecutarBorrado(u); });
}
async function oEjecutarBorrado(u){
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
