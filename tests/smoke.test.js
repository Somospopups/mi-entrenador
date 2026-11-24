const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
test('login, product title and demo identities are present',()=>{
  assert.match(html,/id="loginForm"/);
  assert.match(html,/<title>Mi Entrenador/);
  assert.doesNotMatch(html,/<title>POPUPS/);
  assert.match(js,/coach@mi-entrenador\.demo/);
  assert.match(js,/alumno@mi-entrenador\.demo/);
  assert.match(js,/function logout\(/);
});
test('core flows and guided tour are wired',()=>{
  for(const action of ['tour-start','tour-next','tour-back','tour-contact','finish-workout','mark-paid','add-event','reset-demo']) assert.ok(js.includes(`case'${action}'`),`missing ${action}`);
  assert.match(js,/workoutHistory\.unshift/);
});
test('every RepDB start and peak illustration referenced by app is bundled',()=>{
  const refs=[...js.matchAll(/assets\/exercises\/([a-z0-9-]+\.webp)/g)].map(m=>m[1]);
  assert.ok(refs.length>=12);
  for(const f of new Set(refs)) assert.ok(fs.existsSync(path.join(root,'assets','exercises',f)),`missing image ${f}`);
  assert.match(js,/peak:'assets\/exercises\/goblet-squat-peak\.webp'/);
});
test('mobile workout has a swipeable, large-art exercise deck and student nav',()=>{
  assert.match(js,/function exerciseDeck\(/);
  assert.match(js,/deck-mark/);
  assert.match(js,/pointerup/);
  assert.match(html,/studentMobileNav/);
  assert.match(css,/\.deck-card-art/);
  assert.match(css,/\.switch-view #studentMobileNav/);
});
test('full-body illustration frames animate and honor reduced-motion preference',()=>{
  assert.match(css,/@keyframes repStartPose/);
  assert.match(css,/@keyframes repPeakPose/);
  assert.match(css,/object-fit:contain!important/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('responsive motion and accessibility affordances exist',()=>{
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(html,/aria-label="Mostrar contraseña"/);
});
test('exercise attribution and PWA assets are included',()=>{
  assert.match(html,/repdb\.co/);
  assert.ok(fs.existsSync(path.join(root,'manifest.webmanifest')));
  assert.ok(fs.existsSync(path.join(root,'sw.js')));
});
test('fresh gamified visual system stays consistent without copying another brand',()=>{
  assert.match(css,/--green:#62c46a/);
  assert.match(css,/border-bottom-width:5px/);
  assert.match(css,/\.login-story\{background:var\(--green\)/);
  assert.match(css,/\.mobile-nav button\.active\{color:#347a00;background:#eff9e5\}/);
  assert.doesNotMatch(`${html}${js}${css}`,/duolingo|duo the owl|owl mascot/i);
});

test('native access screen is concise and uses a custom logo without the hero photo',()=>{
  const login=html.match(/<section class="login-screen"[\s\S]*?<\/section>/)?.[0]||'';
  assert.match(login,/class="native-login"/);
  assert.match(login,/class="native-logo"/);
  assert.match(login,/id="loginForm"/);
  assert.match(login,/data-role="coach"/);
  assert.match(login,/data-role="student"/);
  assert.doesNotMatch(login,/login-art-wrap|repdb-motion|<img/);
  assert.match(css,/\.native-input\{height:49px/);
});
test('native login always uses a single full-width column, including narrow phones',()=>{
  assert.match(css,/\.login-screen\{grid-template-columns:minmax\(0,1fr\)!important\}/);
  assert.match(css,/@media\(max-width:760px\)\{\.login-screen\{grid-template-columns:minmax\(0,1fr\)!important\}\}/);
});
