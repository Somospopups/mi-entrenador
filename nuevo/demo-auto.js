/* ════════════════════════════════════════════════════════════
   DEMO AUTOMÁTICA — corre sobre la app REAL (mismos HTML/CSS/JS).
   Se activa con ?demo=1 (lo carga demo2.html en un iframe con #local).
   Sembra datos de ejemplo y reproduce los toques/swipes solos.
   ════════════════════════════════════════════════════════════ */
(function(){
  if (location.href.indexOf('demo=1') < 0) return;
  var W = window;

  /* ── utilidades ── */
  function $(id){ return document.getElementById(id); }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function haceDias(i){ var d=new Date(); d.setDate(d.getDate()-i); return fechaClave(d.getTime()); }
  function diaHoy(){ return claveDia(Date.now()); }
  function cerrarVelo(id){ var v=$(id); if(v) v.classList.remove('ver','abierto'); }
  function post(i){ try{ parent.postMessage({demoEscena:i}, '*'); }catch(e){} }

  // no queremos el refresco en vivo ni el onboarding tapando la demo
  function silenciar(){
    try{
      localStorage.setItem('proto_entrenador_v1_ayuda_v2_alumno','1');
      localStorage.setItem('proto_entrenador_v1_ayuda_v2_entrenador','1');
      localStorage.setItem('proto_entrenador_v1_ayuda_v2_admin','1');
      localStorage.setItem('proto_entrenador_v1_ayuda_v2_usuario','1');
      localStorage.setItem('proto_entrenador_v1_bienv_demoAlu','1');
    }catch(e){}
  }

  /* ── datos de ejemplo ── */
  function E(id,nombre,series,reps,carga,tiempo,extra){
    var e={ id:id, nombre:nombre, series:series||'', reps:reps||'', carga:carga||'', tiempo:tiempo||'', img:null, emoji:'' };
    if(extra) for(var k in extra) e[k]=extra[k];
    return e;
  }
  function planEjemplo(){
    var press = E('press01','Press de banca','4','8-10','40 kg',null,{
      nota:'Bajá controlado, pecho afuera',
      alternativas:[
        { nombre:'Press inclinado con mancuernas', img:null, emoji:'🏋️' },
        { nombre:'Flexiones de brazos', img:null, emoji:'💪' },
        { nombre:'Fondos en banco', img:null, emoji:'🤸' }
      ]});
    var dia = [ press,
      E('sent01','Sentadilla con barra','4','10','60 kg'),
      E('remo01','Remo con barra','4','10','45 kg'),
      E('plan01','Plancha','3','40 seg',null,40) ];
    var p = planVacio();
    DIAS.forEach(function(d){ p[d[0]] = dia.map(function(x){ return Object.assign({}, x, { id:x.id+'-'+d[0] }); }); });
    // el press de HOY queda con el id base y con alternativas
    p[diaHoy()] = dia.map(function(x){ return x.id==='press01' ? Object.assign({}, press) : Object.assign({}, x); });
    return p;
  }
  function hechosEjemplo(plan){
    var h = {};
    // últimos 6 días: todo completado + peso de press = 40 kg (para racha, volumen y sugerencia)
    for(var i=1;i<=6;i++){
      var f = haceDias(i), dk = claveDia(Date.now()-i*86400000);
      var lista = plan[dk]||[]; var m = {};
      lista.forEach(function(e){
        m[e.id] = true;
        if(e.nombre==='Press de banca') m['p:press de banca'] = '40 kg';
        if(e.carga) m['p:'+e.nombre.toLowerCase()] = e.carga;
      });
      h[f]=m;
    }
    return h;
  }

  function sembrar(){
    silenciar();
    var plan = planEjemplo();
    var hechos = hechosEjemplo(plan);
    W.__demoPlan = plan; W.__demoHechos = hechos;
    // base local
    try{
      if (W.BackendLocal){
        BackendLocal._db = {
          usuarios: [
            { id:'demoProfe', dni:'44444444', nombre:'Profe Marina', telefono:'351 5550000', rol:'entrenador', activo:true, membresia:{tipo:'siempre',vence:null} },
            { id:'demoAlu', dni:'22222222', nombre:'Ana García', telefono:'351 5551234', rol:'usuario', activo:true,
              membresia:{tipo:'meses',vence:Date.now()+30*86400000}, plan:plan, hechos:hechos },
            { id:'demoAlu2', dni:'23232323', nombre:'Bruno López', telefono:'', rol:'usuario', activo:true,
              membresia:{tipo:'prueba',vence:Date.now()+7*86400000}, plan:planVacio(), hechos:{} }
          ],
          pagos:[], config:{}
        };
      }
    }catch(e){}
    return { plan:plan, hechos:hechos };
  }

  function setSesion(rol){
    var datos = sembrar();
    if(rol==='alumno'){
      W.sesion = { id:'demoAlu', dni:'22222222', nombre:'Ana García', rol:'alumno', activo:true,
        membresia:{tipo:'meses',vence:Date.now()+30*86400000},
        plan: datos.plan, hechos: JSON.parse(JSON.stringify(datos.hechos)) };
    } else {
      W.sesion = { id:'demoProfe', dni:'44444444', nombre:'Profe Marina', rol:'entrenador', activo:true,
        membresia:{tipo:'siempre',vence:null}, plan:null, hechos:{} };
    }
  }

  function entrarAlumno(){
    setSesion('alumno');
    try{ R_ocultar(); }catch(e){}
    W.Rediseno.renderAlumno();
  }
  function entrarProfe(){
    setSesion('profe');
    try{ R_ocultar(); }catch(e){}
    W.Rediseno.renderEntrenador();
  }
  function R_ocultar(){
    W.Rediseno.ocultarAlumno && W.Rediseno.ocultarAlumno();
    W.Rediseno.ocultarEntrenador && W.Rediseno.ocultarEntrenador();
    W.Rediseno.ocultarOwner && W.Rediseno.ocultarOwner();
  }

  /* ── gesto real de swipe sobre la carta de arriba ── */
  function swipe(derecha){
    var zona=$('dZona'); if(!zona) return Promise.resolve();
    var carta=zona.querySelector('.r-dcarta.entra'); if(!carta) return Promise.resolve();
    var r=carta.getBoundingClientRect();
    var x=r.left+r.width/2, y=r.top+r.height/2;
    function pe(tipo,cx,cy){
      var ev=new PointerEvent(tipo,{bubbles:true,cancelable:true,pointerId:99,pointerType:'touch',
        isPrimary:true,button:0,buttons:tipo==='pointerup'?0:1,clientX:cx,clientY:cy});
      carta.dispatchEvent(ev);
    }
    pe('pointerdown', x, y);
    var pasos=8, dx=derecha?22:-22;
    return new Promise(function(res){
      var i=0;
      (function mover(){
        i++;
        pe('pointermove', x+dx*i, y+Math.abs(dx)*i*0.25);
        if(i<pasos) requestAnimationFrame(mover);
        else {
          // último movimiento grande para pasar el umbral, luego soltar
          pe('pointermove', x+dx*20, y+10);
          requestAnimationFrame(function(){ pe('pointerup', x+dx*20, y+10); setTimeout(res,420); });
        }
      })();
    });
  }

  function cerrarTodo(){
    ['rVeloAyuda','veloBienvenida'].forEach(function(id){ var v=$(id); if(v) v.remove(); });
    document.querySelectorAll('.r-velo.abierto,.r-velo.ver').forEach(function(v){ v.classList.remove('abierto','ver'); });
    var fin=$('dFin'); if(fin) fin.classList.remove('ver');
  }

  /* ══════════ ESCENAS ══════════ */
  var ESCENAS = [
    function login(done){ // 0
      post(0);
      try{ W.sesion=null; R_ocultar();
        var lg=$('vLogin'); if(lg) lg.style.display='flex';
        ['rAppAlumno','rAppProfe','rAppOwner'].forEach(function(id){ var a=$(id); if(a) a.classList.remove('ver'); });
        var sp=$('vSplash'); if(sp) sp.style.display='none';
      }catch(e){}
      sleep(3800).then(done);
    },
    function deck(done){ // 1
      post(1); cerrarTodo(); entrarAlumno();
      sleep(4200).then(done);
    },
    async function swipe1(done){ // 2
      post(2); cerrarTodo(); entrarAlumno(); await sleep(900);
      await swipe(true);
      sleep(3200).then(done);
    },
    async function peso(done){ // 3
      post(3); cerrarTodo(); entrarAlumno(); await sleep(700);
      try{
        var pill=document.querySelector('#dZona .r-dcarta.entra [data-peso]');
        if(pill) pill.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        await sleep(1100);
        var inp=$('dPesoInput');
        if(inp){ inp.value='42,5 kg'; inp.dispatchEvent(new Event('input',{bubbles:true})); }
        await sleep(1200);
        var listo=$('dPesoListo'); if(listo) listo.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      }catch(e){}
      sleep(2600).then(done);
    },
    async function canje(done){ // 4
      post(4); cerrarTodo(); entrarAlumno(); await sleep(700);
      try{
        var btn=document.querySelector('#dZona .r-dcarta.entra [data-canje]');
        if(btn) btn.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        await sleep(1700);
        var op=document.querySelector('#dVeloCanje .r-canje-op');
        if(op) op.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      }catch(e){}
      sleep(2800).then(done);
    },
    async function semana(done){ // 5
      post(5); cerrarTodo(); entrarAlumno(); await sleep(500);
      try{ if(W.Rediseno.dAbrirResumen) W.Rediseno.dAbrirResumen(); }catch(e){}
      sleep(4600).then(done);
    },
    function profe(done){ // 6
      post(6); cerrarTodo(); entrarProfe();
      sleep(4200).then(done);
    },
    async function ficha(done){ // 7
      post(7); cerrarTodo(); entrarProfe(); await sleep(1400);
      try{
        // abrir la ficha/progreso de la primera alumna
        var tarj=document.querySelector('#rListaAlu [data-id]');
        if(tarj) tarj.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      }catch(e){}
      sleep(4200).then(done);
    },
    async function builder(done){ // 8
      post(8); cerrarTodo(); entrarProfe(); await sleep(700);
      try{
        W.Rediseno.builder.abrir({ id:'demoAlu', nombre:'Ana García', demo:false, plan:W.__demoPlan });
        // abrir la ficha del primer ejercicio del día para mostrar alternativas + subir peso
        await sleep(1200);
        var chip=document.querySelector('#bMazo [data-plan], #bMazo .r-mazo-ej, #bMazo .r-dcarta');
        if(chip) chip.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        await sleep(2400);
        var abtn=$('bHAltsBtn'); if(abtn){ abtn.dispatchEvent(new MouseEvent('click',{bubbles:true})); await sleep(1800); }
      }catch(e){}
      sleep(3000).then(done);
    }
  ];

  var indice=0, corriendo=false;
  function arrancar(){
    if(corriendo) return; corriendo=true;
    (function siguiente(){
      var fn=ESCENAS[indice];
      fn(function(){
        indice=(indice+1)%ESCENAS.length;
        setTimeout(siguiente, 350);
      });
    })();
  }

  function esperarListo(){
    if (typeof W.Rediseno === 'object' && W.Rediseno && W.Rediseno.renderAlumno &&
        typeof W.planVacio === 'function' && typeof W.BackendLocal !== 'undefined'){
      silenciar();
      // ocultar splash/login de arranque para que la escena 0 decida
      setTimeout(arrancar, 600);
    } else {
      setTimeout(esperarListo, 120);
    }
  }
  // exponer para control manual / tests
  W.__demoData = { entrarAlumno:entrarAlumno, entrarProfe:entrarProfe, swipe:swipe,
    sembrar:sembrar, cerrarTodo:cerrarTodo, esperarListo:esperarListo,
    setSesion:setSesion };
  if (document.readyState === 'complete') esperarListo();
  else W.addEventListener('load', esperarListo);
  setTimeout(esperarListo, 1200); // red de seguridad: si 'load' tarda, arranca igual
})();
