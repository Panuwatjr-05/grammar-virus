/* =========================================================
   Rendering: first-person perspective street, zombies, boss,
   sentence signs, gun, effects (canvas 2D, no image files)
   ========================================================= */
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let W=0, H=0, DPR=1, bg=null;
const DMAX=22, DMIN=2.6, CAMH=1.6;           // world depth range (metres) and camera height
const horizon = () => H*0.40;
const focal   = () => H*0.92;
const feetY   = d => horizon() + CAMH*focal()/d;
const pxPerM  = d => focal()/d;
const laneX   = (lane,d) => { const dn=(d-DMIN)/(DMAX-DMIN); return W/2 + lane*W*0.38*(0.6+0.4*(1-dn)); };
const SIGN_FONT = "'IBM Plex Sans Thai','Chakra Petch',system-ui,sans-serif";
const UI_FONT   = "'Chakra Petch','IBM Plex Sans Thai',system-ui,sans-serif";
const C = { acid:'#b8f53d', ok:'#5be39a', bad:'#ff5468', warn:'#ffc04d', boss:'#a97cff', text:'#e8eef5', text2:'#a3b0c0' };
let FONT_EPOCH = 0;   // bumped when web fonts finish loading, so cached sign layouts are measured again
if(document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => FONT_EPOCH++);

function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function roundRect(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function spaced(px){ try{ ctx.letterSpacing = px+'px'; }catch(e){} }

function resize(){
  DPR = Math.min(2, window.devicePixelRatio||1); W = innerWidth; H = innerHeight;
  cv.width = W*DPR; cv.height = H*DPR; cv.style.width = W+'px'; cv.style.height = H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  renderBG();
}
// toxic night: teal sky, green fog, dead city
function renderBG(){
  bg = document.createElement('canvas'); bg.width = W*DPR; bg.height = H*DPR;
  const b = bg.getContext('2d'); b.setTransform(DPR,0,0,DPR,0,0);
  const hz = horizon(), r = rng(7);
  let g = b.createLinearGradient(0,0,0,hz);
  g.addColorStop(0,'#03060a'); g.addColorStop(.6,'#081613'); g.addColorStop(1,'#13302a');
  b.fillStyle = g; b.fillRect(0,0,W,hz+1);
  for(let i=0;i<150;i++){ b.fillStyle=`rgba(220,255,230,${.12+r()*.5})`; b.fillRect(r()*W, r()*hz*.85, 1.3, 1.3); }
  const mx=W*.8, my=H*.14, mr=Math.min(W,H)*.052;
  g = b.createRadialGradient(mx,my,mr*.5,mx,my,mr*4.5); g.addColorStop(0,'rgba(200,255,190,.26)'); g.addColorStop(1,'rgba(200,255,190,0)');
  b.fillStyle = g; b.fillRect(mx-mr*5, my-mr*5, mr*10, mr*10);
  b.fillStyle = '#e4f2d6'; b.beginPath(); b.arc(mx,my,mr,0,7); b.fill();
  b.fillStyle = 'rgba(150,180,140,.35)';
  [[-.3,-.2,.22],[.35,.15,.16],[-.05,.4,.12]].forEach(([a,c,s])=>{ b.beginPath(); b.arc(mx+a*mr,my+c*mr,s*mr,0,7); b.fill(); });
  let x = -10;   // ruined city skyline
  while(x < W){
    const bw = 24+r()*70, bh = (.04+r()*.15)*H;
    b.fillStyle = '#050a0d'; b.fillRect(x, hz-bh, bw, bh+2);
    for(let wy=hz-bh+8; wy<hz-6; wy+=12) for(let wx=x+6; wx<x+bw-6; wx+=10)
      if(r()<.07){ b.fillStyle = r()<.25 ? 'rgba(184,245,61,.4)' : 'rgba(255,190,90,.5)'; b.fillRect(wx,wy,4,5); }
    x += bw + r()*8;
  }
  g = b.createLinearGradient(0,hz,0,H); g.addColorStop(0,'#0f1c16'); g.addColorStop(1,'#040706');
  b.fillStyle = g; b.fillRect(0,hz,W,H-hz);
  b.fillStyle = '#0b0f12'; b.beginPath();
  b.moveTo(W/2-W*.12,hz); b.lineTo(W/2+W*.12,hz); b.lineTo(W/2+W*.8,H); b.lineTo(W/2-W*.8,H); b.fill();
  b.strokeStyle = 'rgba(184,245,61,.16)'; b.lineWidth = 2; b.beginPath();
  b.moveTo(W/2-W*.12,hz); b.lineTo(W/2-W*.8,H); b.moveTo(W/2+W*.12,hz); b.lineTo(W/2+W*.8,H); b.stroke();
  b.fillStyle = 'rgba(255,192,77,.3)';
  for(let d=DMAX; d>1.2; d-=2.4){
    const y1=feetY(d), y2=feetY(d-1.1), w1=pxPerM(d)*.08, w2=pxPerM(d-1.1)*.08;
    b.beginPath(); b.moveTo(W/2-w1,y1); b.lineTo(W/2+w1,y1); b.lineTo(W/2+w2,y2); b.lineTo(W/2-w2,y2); b.fill();
  }
  g = b.createLinearGradient(0,hz-H*.1,0,hz+H*.15);
  g.addColorStop(0,'rgba(110,220,150,0)'); g.addColorStop(.5,'rgba(110,220,150,.15)'); g.addColorStop(1,'rgba(110,220,150,0)');
  b.fillStyle = g; b.fillRect(0,hz-H*.1,W,H*.25);
  g = b.createRadialGradient(W/2,H*.55,H*.3,W/2,H*.55,H*1.1); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.66)');
  b.fillStyle = g; b.fillRect(0,0,W,H);
}

/* ---------- characters (drawn in metres, then scaled) ---------- */
function drawZombie(z, x, y, s){
  const dn = (z.d-DMIN)/(DMAX-DMIN);
  let alpha = z.big ? 1 : .45+.55*(1-dn);
  ctx.save(); ctx.translate(x,y);
  if(z.state==='dying'){ const k=Math.min(1,z.t/.45); ctx.rotate(z.fall*k*1.3); alpha *= 1-Math.max(0,(z.t-.35)/.35); }
  if(z.state==='leaving') alpha *= Math.max(0, 1-z.t/.8);
  const human = z.state==='rescued', skin = human ? '#e3b48d' : z.skin;     // cured: back to a person, then fades away
  if(human) alpha *= Math.max(0, 1-Math.max(0, z.t-.45)/.65);
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.scale(s,s);
  const walk = z.state==='walk', ph = z.phase, bob = walk ? Math.abs(Math.sin(ph))*.04 : Math.sin(ph)*.01;
  if(z.big || human){
    const g = ctx.createRadialGradient(0,-1,.2,0,-1,1.3), c = human ? '91,227,154' : '169,124,255';
    g.addColorStop(0,`rgba(${c},${human ? .5 : .35})`); g.addColorStop(1,`rgba(${c},0)`);
    ctx.fillStyle = g; ctx.fillRect(-1.4,-2.4,2.8,2.6);
  }
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0,0,.38,.07,0,0,7); ctx.fill();
  ctx.lineCap = 'round'; ctx.strokeStyle = '#2c3346'; ctx.lineWidth = .16;
  const l1 = walk ? Math.max(0,Math.sin(ph))*.1 : 0, l2 = walk ? Math.max(0,-Math.sin(ph))*.1 : 0;
  ctx.beginPath(); ctx.moveTo(-.11,-.9-bob); ctx.lineTo(-.14,-l1); ctx.moveTo(.11,-.9-bob); ctx.lineTo(.14,-l2); ctx.stroke();
  ctx.fillStyle = '#1d1d1d'; ctx.fillRect(-.24,-.05-l1,.18,.07); ctx.fillRect(.06,-.05-l2,.18,.07);
  const ty = -1.5-bob;
  ctx.fillStyle = z.shirt; roundRect(ctx,-.28,ty,.56,.66,.08); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath();
  ctx.moveTo(-.28,ty+.66); ctx.lineTo(-.18,ty+.55); ctx.lineTo(-.08,ty+.66); ctx.lineTo(.05,ty+.52); ctx.lineTo(.16,ty+.66); ctx.fill();
  if(!human){ ctx.fillStyle = 'rgba(120,20,20,.55)'; ctx.beginPath(); ctx.arc(.1,ty+.25,.06,0,7); ctx.arc(.04,ty+.33,.035,0,7); ctx.fill(); }
  const sw = walk ? Math.sin(ph*.5)*.06 : 0, sl = (z.slap||0)*.35;
  ctx.strokeStyle = z.shirt; ctx.lineWidth = .13; ctx.beginPath();
  ctx.moveTo(-.26,ty+.1); ctx.lineTo(-.4,ty+.32+sw-sl); ctx.moveTo(.26,ty+.1); ctx.lineTo(.4,ty+.32-sw-sl*.3); ctx.stroke();
  ctx.fillStyle = skin; ctx.beginPath();
  ctx.arc(-.42,ty+.36+sw-sl,.085,0,7); ctx.arc(.42,ty+.36-sw-sl*.3,.085,0,7); ctx.fill();
  if(z.big){
    ctx.fillStyle = '#2a2433';
    roundRect(ctx,-.4,ty-.02,.24,.16,.05); ctx.fill(); roundRect(ctx,.16,ty-.02,.24,.16,.05); ctx.fill();
    ctx.fillStyle = '#9a8fb0';
    [-.34,-.24,.24,.34].forEach(px=>{ ctx.beginPath(); ctx.moveTo(px-.03,ty); ctx.lineTo(px,ty-.12); ctx.lineTo(px+.03,ty); ctx.fill(); });
    ctx.fillStyle = '#c9b458'; ctx.fillRect(-.28,ty+.5,.56,.06);
  }
  const hy = ty-.17, tilt = Math.sin(ph*.7)*.08;
  ctx.save(); ctx.translate(0,hy); ctx.rotate(tilt);
  ctx.fillStyle = skin; ctx.fillRect(-.06,.05,.12,.1);
  ctx.beginPath(); ctx.ellipse(0,0,.15,.17,0,0,7); ctx.fill();
  if(!human){ ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.arc(.07,-.07,.04,0,7); ctx.fill(); }
  ctx.fillStyle = human ? '#ffffff' : z.big ? '#b6ff6a' : '#ffe066';
  ctx.beginPath(); ctx.arc(-.055,-.02,.032,0,7); ctx.arc(.055,-.01,.026,0,7); ctx.fill();
  ctx.fillStyle = human ? '#2b2b2b' : '#c0141f'; ctx.beginPath(); ctx.arc(-.055,-.02,.013,0,7); ctx.arc(.055,-.01,.011,0,7); ctx.fill();
  if(human){ ctx.strokeStyle = '#7a3b2a'; ctx.lineWidth = .025; ctx.beginPath(); ctx.arc(0,.05,.05,.2,Math.PI-.2); ctx.stroke(); }
  else{ ctx.fillStyle = '#2a0d0d'; ctx.beginPath(); ctx.ellipse(0,.08,.06,z.state==='attack'?.045:.025,0,0,7); ctx.fill(); }
  ctx.strokeStyle = '#222'; ctx.lineWidth = .03; ctx.beginPath();
  ctx.moveTo(-.1,-.14); ctx.lineTo(-.05,-.2); ctx.moveTo(0,-.17); ctx.lineTo(.02,-.23); ctx.moveTo(.08,-.15); ctx.lineTo(.12,-.2); ctx.stroke();
  ctx.restore();
  if(z.big && z.hit>0){ ctx.globalAlpha = z.hit*2; ctx.fillStyle = '#fff'; roundRect(ctx,-.3,ty-.36,.6,1.02,.1); ctx.fill(); }
  ctx.restore();
}

/* ---------- sentence signs ---------- */
// z.toks = tokens, each a list of [text, colour|null] pieces; coloured pieces are highlighted + underlined
const tokWidth = tk => tk.reduce((a,[t]) => a + ctx.measureText(t).width, 0);
function wrapToks(toks, maxW){
  const sp = ctx.measureText(' ').width, lines = []; let cur = [], w = 0;
  for(const tk of toks){
    const tw = tokWidth(tk);
    if(cur.length && w+sp+tw > maxW){ lines.push({ toks:cur, w }); cur = []; w = 0; }
    w += (cur.length ? sp : 0) + tw; cur.push(tk);
  }
  if(cur.length) lines.push({ toks:cur, w });
  return lines;
}
function drawLabel(z, x, topY, s){
  const fs = Math.round(clamp(10+s*.045, 15, z.big?26:24));
  ctx.font = `600 ${fs}px ${SIGN_FONT}`;
  const sig = z.sig+'|'+fs+'|'+FONT_EPOCH;
  if(z.cacheSig!==sig){ z.cacheSig = sig; z.lines = wrapToks(z.toks, clamp(W*.2,130,300)*(fs/16)); }
  const lh = fs*1.34, padX = fs*.7, padY = fs*.42, sp = ctx.measureText(' ').width;
  const w = Math.max(...z.lines.map(l=>l.w)) + padX*2, h = z.lines.length*lh + padY*2;
  const bx = clamp(x-w/2, 6, W-w-6), by = Math.max(z.big ? 132 : 64, topY-h-12);
  let a = 1; if(z.state==='dying') a = Math.max(0,1-z.t/.3); if(z.state==='leaving') a = Math.max(0,1-z.t/.5);
  if(z.state==='rescued') a = Math.max(0,1-z.t/.4);
  ctx.globalAlpha = a;
  const danger = z.state==='attack', accent = z.big ? C.boss : danger ? C.bad : z.state==='rescued' ? C.ok : C.acid, fill = 'rgba(5,9,14,.9)';
  ctx.fillStyle = fill; roundRect(ctx,bx,by,w,h,3); ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = danger ? `rgba(255,84,104,${.55+.45*Math.sin(performance.now()/120)})` : 'rgba(190,215,240,.22)';
  ctx.stroke();
  const k = Math.min(11, h*.4);                       // HUD corner brackets
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(bx, by+k); ctx.lineTo(bx, by); ctx.lineTo(bx+k, by);
  ctx.moveTo(bx+w-k, by+h); ctx.lineTo(bx+w, by+h); ctx.lineTo(bx+w, by+h-k); ctx.stroke();
  const px = clamp(x, bx+12, bx+w-12);
  ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(px-6,by+h); ctx.lineTo(px+6,by+h); ctx.lineTo(px,by+h+7); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  z.lines.forEach((l,i) => {
    let cx = bx + (w-l.w)/2; const cy = by + padY + i*lh + fs*.06;
    l.toks.forEach((tk,j) => {
      if(j) cx += sp;
      for(const [t,c] of tk){
        const tw = ctx.measureText(t).width;
        ctx.fillStyle = c || C.text; ctx.fillText(t, cx, cy);
        if(c) ctx.fillRect(cx, cy+fs*1.12, tw, Math.max(1.5, fs*.08));
        cx += tw;
      }
    });
  });
  ctx.globalAlpha = 1;
  z.rect = { x:bx, y:by, w, h:h+7 };
}

/* ---------- player view: two Barrett M107 (.50 cal) sniper rifles ---------- */
// left rifle = kill rounds (left click, red), right rifle = cure rounds (right click, green)
// length (fraction of H, capped by the width so the two rifles never cross on narrow screens), and how much
// thicker than true scale they are drawn (close to the camera a real rifle looks chunky; FPS games exaggerate it too)
const RIFLE = { len:.52, maxW:.36, thick:1.5 };
const RIFLES = { kill:{ px:.11, flip:false, color:C.bad }, cure:{ px:.89, flip:true, color:C.ok } };
const rifleLen = () => Math.min(H*RIFLE.len, W*RIFLE.maxW);
const rifleBase = gun => ({ x:W*RIFLES[gun].px, y:H + rifleLen()*.13 });     // shoulders just below the bottom corners
// each rifle points from its shoulder at the crosshair; the right one is mirrored so both scopes stay on top
function aimAngle(gun){
  const b = rifleBase(gun), a = Math.atan2(mouse.y-b.y, mouse.x-b.x);
  return RIFLES[gun].flip ? clamp(a, -Math.PI*.97, -Math.PI*.53) : clamp(a, -Math.PI*.47, -Math.PI*.03);
}
// a point on a rifle (x along the barrel from the butt, y negative = top side) → screen
function riflePoint(gun, x, y){
  const b = rifleBase(gun), a = aimAngle(gun), f = RIFLES[gun].flip ? -1 : 1;
  const lx = x - G.guns[gun].recoil*.07*rifleLen(), ly = y*RIFLE.thick*f;
  return { x:b.x + lx*Math.cos(a) - ly*Math.sin(a), y:b.y + lx*Math.sin(a) + ly*Math.cos(a) };
}
const muzzle = gun => riflePoint(gun, rifleLen(), 0);
// drawn in units of 1% of the rifle length: butt at x = 0, muzzle at x = 100, top of the rifle = negative y
function drawRifle(gun){
  const b = rifleBase(gun), L = rifleLen(), u = L/100, st = G.guns[gun], accent = RIFLES[gun].color;
  const R = (x, y, w, h, r, c) => { ctx.fillStyle = c; roundRect(ctx, x*u, y*u, w*u, h*u, r*u); ctx.fill(); };
  const poly = (c, pts) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x,y],i) => i ? ctx.lineTo(x*u,y*u) : ctx.moveTo(x*u,y*u)); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(aimAngle(gun));
  ctx.scale(1, RIFLE.thick*(RIFLES[gun].flip ? -1 : 1)); ctx.translate(-st.recoil*.07*L, 0);
  // buttstock with recoil pad and folded monopod
  R(6, 4, 1.6, 7, .6, '#1a1e24');
  R(0, -2.2, 14, 7.2, 1.2, '#2a3038');
  R(0, -2.2, 2.2, 7.2, 1, '#121519');
  // lower receiver, raked pistol grip, trigger guard, 10-round box magazine
  R(12, -.6, 40, 5, .8, '#2a3038');
  poly('#1d2229', [[25,4],[30,4],[27.5,13],[22.5,13]]);
  ctx.strokeStyle = '#1d2229'; ctx.lineWidth = u; ctx.beginPath(); ctx.moveTo(30*u, 4.4*u); ctx.quadraticCurveTo(33*u, 8.5*u, 36*u, 4.4*u); ctx.stroke();
  R(36, 4, 8, 8.5, .8, '#20262d'); R(36.5, 11, 7, 1.4, .5, '#15191e');
  // upper receiver, picatinny rail, carry handle
  R(11, -4.6, 50, 4.4, .8, '#3a424d');
  ctx.fillStyle = '#2b323b'; for(let x = 14; x < 58; x += 2.2) ctx.fillRect(x*u, -5.6*u, 1.4*u, 1.1*u);
  ctx.strokeStyle = '#2a3038'; ctx.lineWidth = 1.2*u; ctx.beginPath();
  ctx.moveTo(44*u, -4.8*u); ctx.lineTo(45.5*u, -9.5*u); ctx.lineTo(52.5*u, -9.5*u); ctx.lineTo(54*u, -4.8*u); ctx.stroke();
  // barrel shroud with cooling holes, bipod folded back underneath
  R(60, -3.6, 18, 6.2, .9, '#353c46');
  ctx.fillStyle = '#1a1f25'; for(let x = 63; x < 76; x += 3.6){ ctx.beginPath(); ctx.ellipse((x+1)*u, -.5*u, 1.1*u, 1.4*u, 0, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#22272e'; ctx.lineWidth = .9*u; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(74*u, 2.6*u); ctx.lineTo(58*u, 4.6*u); ctx.moveTo(74*u, 3*u); ctx.lineTo(60*u, 5.6*u); ctx.stroke();
  R(72.5, 1.8, 3, 2, .5, '#22272e');
  // fluted barrel and the arrow-shaped two-port muzzle brake
  R(78, -1.4, 15, 2.8, .6, '#4a525d');
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = .35*u; ctx.beginPath();
  ctx.moveTo(79*u, -.4*u); ctx.lineTo(92*u, -.4*u); ctx.moveTo(79*u, .5*u); ctx.lineTo(92*u, .5*u); ctx.stroke();
  poly('#2f353e', [[92,-3.4],[98,-3.4],[100,0],[98,3.4],[92,3.4]]);
  ctx.fillStyle = '#0d1014'; ctx.fillRect(93.3*u, -2.6*u, 1.6*u, 5.2*u); ctx.fillRect(96*u, -2.6*u, 1.6*u, 5.2*u);
  // scope: rings, tube, eyepiece, objective bell with a lens glint, turrets
  R(23, -9.2, 2.2, 4, .4, '#1c2127'); R(39, -9.2, 2.2, 4, .4, '#1c2127');
  R(18, -12.4, 30, 3.8, 1.9, '#2b3139');
  R(15, -13.4, 6, 5.8, 1.6, '#232930');
  poly('#232930', [[46,-12.4],[51,-14.4],[51,-6.4],[46,-8.6]]);
  ctx.fillStyle = 'rgba(160,220,255,.55)'; ctx.fillRect(50.6*u, -13.8*u, .7*u, 6.8*u);
  R(31, -16, 3, 3.8, .6, '#1c2127');
  ctx.fillStyle = '#1c2127'; ctx.beginPath(); ctx.arc(36.5*u, -10.5*u, 1.7*u, 0, 7); ctx.fill();
  // colour band on the barrel shroud + indicator light: red = kill rifle, green = cure rifle
  // (the light flares when it fires and is bigger when this rifle is selected on a touch screen)
  R(76.4, -3.6, 1.6, 6.2, .3, accent);
  const touch = document.body.classList.contains('touch');
  ctx.globalAlpha = .45 + Math.min(1, st.recoil*1.5)*.55; ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(56*u, -2.4*u, (touch && G.touchGun===gun ? 1.4 : 1.05)*u, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  // muzzle flash: the brake throws the blast out to the sides
  if(st.flash > 0){
    const [core, glow] = gun==='kill' ? ['rgba(255,230,150,.95)', 'rgba(255,150,60,.6)'] : ['rgba(210,255,225,.95)', 'rgba(91,227,154,.6)'];
    poly(glow, [[100,-2],[120,0],[100,2]]);
    poly(glow, [[93.5,-3],[90.5,-14],[97.5,-3]]); poly(glow, [[93.5,3],[90.5,14],[97.5,3]]);
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(101*u, 0, 3*u, 0, 7); ctx.fill();
  }
  ctx.restore();
}
// big .50 BMG casings flying out of the ejection port (green band = cure round)
function drawShells(){
  const u = rifleLen()/100;
  for(const s of G.shells){
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = Math.min(1, s.life*3);
    ctx.fillStyle = '#c9a24a'; roundRect(ctx, -1.8*u, -.55*u, 3.6*u, 1.1*u, .4*u); ctx.fill();
    ctx.fillStyle = s.cure ? C.ok : '#8a6a25'; ctx.fillRect(.9*u, -.55*u, .7*u, 1.1*u);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
// left half red (left click = kill), right half green (right click = rescue)
function drawCrosshair(){
  const x = mouse.x, y = mouse.y, r = 13 + Math.max(G.guns.kill.recoil, G.guns.cure.recoil)*6;
  ctx.lineCap = 'round';
  const arc = (a, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x,y,r,a-.45,a+.45); ctx.stroke(); };
  const line = (x1, y1, x2, y2, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); };
  const parts = (lw, shade) => {
    const L = shade || C.bad, R = shade || C.ok, N = shade || C.text;
    arc(Math.PI*.75, L, lw); arc(Math.PI*1.25, L, lw); arc(Math.PI*.25, R, lw); arc(-Math.PI*.25, R, lw);
    line(x-r-9,y,x-r+3,y,L,lw); line(x+r-3,y,x+r+9,y,R,lw);
    line(x,y-r-9,x,y-r+3,N,lw); line(x,y+r-3,x,y+r+9,N,lw);
  };
  parts(4, 'rgba(0,0,0,.55)'); parts(1.8);
  ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(x,y,2.2,0,7); ctx.fill();
}
function hazardStripes(x0, x1, y0, hh, color){
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1-x0, hh); ctx.clip();
  ctx.fillStyle = color;
  for(let sx = x0-hh; sx < x1+hh; sx += hh*2.2){
    ctx.beginPath(); ctx.moveTo(sx, y0+hh); ctx.lineTo(sx+hh, y0); ctx.lineTo(sx+hh*2, y0); ctx.lineTo(sx+hh, y0+hh); ctx.fill();
  }
  ctx.restore();
}
function drawBanner(kicker, title, sub, color, hazard){
  const y = H*.42, h = Math.min(168, H*.25), x0 = W*.16, x1 = W*.84;
  ctx.save();
  const g = ctx.createLinearGradient(0,0,W,0);
  g.addColorStop(0,'rgba(3,6,10,0)'); g.addColorStop(.18,'rgba(3,6,10,.88)'); g.addColorStop(.82,'rgba(3,6,10,.88)'); g.addColorStop(1,'rgba(3,6,10,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y-h/2, W, h);
  ctx.fillStyle = color; ctx.fillRect(x0, y-h/2, x1-x0, 2); ctx.fillRect(x0, y+h/2-2, x1-x0, 2);
  if(hazard){ hazardStripes(x0, x1, y-h/2-12, 9, color); hazardStripes(x0, x1, y+h/2+3, 9, color); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(clamp(W/80,12,15))}px ${UI_FONT}`; spaced(4); ctx.fillStyle = color;
  ctx.fillText(kicker.toUpperCase(), W/2, y-h*.3);
  ctx.font = `700 ${Math.round(clamp(W/17,30,58))}px ${UI_FONT}`; spaced(2); ctx.fillStyle = '#fff';
  ctx.fillText(title.toUpperCase(), W/2, y);
  ctx.font = `500 ${Math.round(clamp(W/60,14,18))}px ${SIGN_FONT}`; spaced(0); ctx.fillStyle = C.text2;
  ctx.fillText(sub, W/2, y+h*.3);
  ctx.restore();
}
function drawBossBar(B){
  const bw = Math.min(420, W*.5), x = W/2-bw/2, y = 112, frac = 1 - B.found.size/B.total;
  ctx.save();
  ctx.font = `700 11px ${UI_FONT}`; spaced(3); ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left'; ctx.fillStyle = C.boss; ctx.fillText(T('bossBar').toUpperCase(), x, y-5);
  ctx.textAlign = 'right'; ctx.fillStyle = C.text2; ctx.fillText(`${B.found.size} / ${B.total}`, x+bw, y-5);
  ctx.beginPath(); ctx.moveTo(x+6,y); ctx.lineTo(x+bw,y); ctx.lineTo(x+bw-6,y+12); ctx.lineTo(x,y+12); ctx.closePath();
  ctx.fillStyle = 'rgba(169,124,255,.16)'; ctx.fill(); ctx.clip();
  const g = ctx.createLinearGradient(x,0,x+bw,0); g.addColorStop(0,'#7d4dff'); g.addColorStop(1,C.boss);
  ctx.fillStyle = g; ctx.fillRect(x, y, bw*frac, 12);
  ctx.fillStyle = 'rgba(3,6,10,.9)';
  for(let k=1;k<B.total;k++) ctx.fillRect(x + bw*k/B.total - 1, y, 2, 12);
  ctx.restore();
}

function render(){
  ctx.save();
  if(G && G.shake>0) ctx.translate((Math.random()-.5)*G.shake*30, (Math.random()-.5)*G.shake*30);
  if(bg) ctx.drawImage(bg,0,0,W,H);
  if(!G){ ctx.restore(); return; }
  const list = G.zombies.slice();
  if(G.boss) list.push(G.boss);
  list.sort((a,b)=>b.d-a.d);
  for(const z of list){
    const s = pxPerM(z.d)*(z.big?1.35:1), x = laneX(z.lane,z.d), y = feetY(z.d);
    drawZombie(z,x,y,s);
    z.body = { x:x-.45*s, y:y-1.85*s, w:.9*s, h:1.85*s };
  }
  for(const z of list){ const s = pxPerM(z.d)*(z.big?1.35:1); drawLabel(z, laneX(z.lane,z.d), feetY(z.d)-1.85*s, s); }
  for(const t of G.tracers){
    const a = Math.min(1, t.life*11);
    ctx.strokeStyle = t.gun==='cure' ? `rgba(91,227,154,${a})` : `rgba(255,225,150,${a})`; ctx.lineWidth = t.gun==='cure' ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(t.x1,t.y1); ctx.lineTo(t.x2,t.y2); ctx.stroke();
  }
  for(const p of G.parts){ ctx.globalAlpha=Math.min(1,p.life*2); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for(const t of G.texts){
    ctx.globalAlpha = Math.min(1, t.life/(t.max*.4)); ctx.font = `700 ${Math.round(t.size)}px ${UI_FONT}`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(2,5,9,.85)'; ctx.strokeText(t.text,t.x,t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.text,t.x,t.y);
  }
  ctx.globalAlpha = 1;
  if(G.boss && G.phase==='boss') drawBossBar(G.boss);
  drawRifle('kill'); drawRifle('cure'); drawShells();
  if(G.slowT>0){
    ctx.fillStyle = 'rgba(90,170,255,.1)'; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.font = `700 15px ${UI_FONT}`; spaced(5); ctx.fillStyle = '#8fd0ff'; ctx.textAlign = 'center';
    ctx.fillText(`${T('slowOn')}  ${Math.ceil(G.slowT)}`, W/2, H-92); ctx.restore();     // above the gun legend
  }
  if(G.hurt>0){
    const g = ctx.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,H*.9);
    g.addColorStop(0,'rgba(255,0,0,0)'); g.addColorStop(1,`rgba(200,0,20,${G.hurt*.55})`);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  }
  if(G.hp<=30 && G.phase!=='over'){ ctx.fillStyle=`rgba(160,0,20,${.1+.07*Math.sin(performance.now()/200)})`; ctx.fillRect(0,0,W,H); }
  const nn = String(G.idx+1).padStart(2,'0');
  if(G.phase==='intro'){
    // survival sets its own banner for every wave ("Wave 3 cleared · +600 bonus" / "WAVE 4")
    if(G.banner) drawBanner(G.banner.kicker, G.banner.title, G.banner.sub, C.warn, false);
    else drawBanner(G.mode==='review' ? T('hudReview') : T('introKicker', nn), G.mode==='review' ? T('review') : G.L.topic, T('go'), C.acid, false);
  }
  if(G.phase==='bossIntro') drawBanner(G.mode==='survival' ? T('svBossKicker', G.wave) : `${T('introKicker', nn)} · ${G.L.topic}`, T('bossIncoming'), T('bossHint'), C.bad, true);
  ctx.restore();
  if(!G.paused && (G.phase==='wave' || G.phase==='intro')) drawCrosshair();
}
