/* =========================================================
   Game logic — Parts of Speech edition, dual guns
   Core loop:  READ the sign → JUDGE the highlighted word
               → ACT: left click fires a kill round at broken sentences, right click a cure round at correct ones
               → FEEDBACK (correct sentence + "word = part of speech")
               → BOSS (find every word of a part of speech) → SPEAK → DEBRIEF (notebook, tips)
   Survival: every sentence from every level, endless waves that speed up, a boss every 3rd wave,
             the run ends when HP hits 0 and goes on the leaderboard
   ========================================================= */
let G = null;
const mouse = { x:0, y:0 };
const SPEEDS = [.75, 1, 1.3];
const SKINS  = ['#7fa65a','#8fb36b','#6e9a55','#9bb57a','#7a9d6a'];
const SHIRTS = ['#4a5d8a','#8a4a4a','#5f7a4a','#7a6a4a','#5a4a7a','#3f6f75','#8a7a5a'];
const SENTENCE_INDEX = new Map();   // correct sentence (plain text) -> { e: item data, li: level index }
LEVELS.forEach((L,li) => L.items.forEach(e => SENTENCE_INDEX.set(parseMarked(e.t).plain, { e, li })));
const levelOf = text => (SENTENCE_INDEX.get(text) || { li:-1 }).li;
// lessons: every level belongs to a unit ('pos' unless it says otherwise) and is numbered inside it
LEVELS.forEach(L => { L.unit = L.unit || 'pos'; });
const unitLevels = u => LEVELS.map((_,i) => i).filter(i => LEVELS[i].unit===u);
const lvNo = i => unitLevels(LEVELS[i].unit).indexOf(i) + 1;
const nextInUnit = i => { const l = unitLevels(LEVELS[i].unit); return l[l.indexOf(i)+1] ?? -1; };
// the first level of each lesson is open; the next one opens once the one before it is cleared
const isUnlocked = i => { const l = unitLevels(LEVELS[i].unit), k = l.indexOf(i); return k===0 || (Store.d.stars[l[k-1]] || 0) > 0; };
const speakBonus = score => score>=80 ? 300 : score>=50 ? 100 : 0;
let zid = 0;

// which zombies carry a broken sentence (true) and which a correct one, in random order
const makeDeck = (count, wrongRatio) => { const n = Math.round(count*wrongRatio); return shuffleArr(Array.from({length:count}, (_,i) => i<n)); };
function newState(mode, idx, L, pool, wrongRatio){
  return { mode, idx, L, pool, bag:[], deck:makeDeck(L.count, wrongRatio),
    speedMul: SPEEDS[Store.d.settings.speed] ?? 1,
    hp:100, score:0, combo:0, bestCombo:0, good:0, decisions:0, slow:0, slowT:0,
    zombies:[], parts:[], texts:[], tracers:[], boss:null,
    guns:{ kill:{ cool:0, recoil:0, flash:0 }, cure:{ cool:0, recoil:0, flash:0 } }, target:null, tapHinted:false,
    spawned:0, resolved:0, spawnT:.8, phase:'intro', phaseT:1.8, clock:0, hurt:0, shake:0, paused:false, shells:[],
    fixed:[], rescued:[], shotRight:[], wrongCure:[], reached:[], lost:[], decTimes:[],
    bossErrors:0, bossErr0:0, bossText:null, bossWords:null, speakScore:null, mastered:0 };
}
function startLevel(idx){
  const L = LEVELS[idx];
  G = newState('level', idx, L, L.items.map(e => parseItem(e, L.pos)), .55);
  UI.enterGame();
}
function startReview(){
  const pool = Store.nbList().map(n => SENTENCE_INDEX.get(n.text)).filter(Boolean)
                    .map(ref => parseItem(ref.e, LEVELS[ref.li].pos));
  if(pool.length < 3) return false;
  const L = { topic:'Review', th:'ทบทวน', count:Math.min(15, Math.max(6, pool.length+3)), speed:1.2, spawn:3.0, maxAlive:3 };
  G = newState('review', -1, L, pool, .5);
  UI.enterGame();
  return true;
}

/* ---------- survival: all parts of speech, endless waves, leaderboard ---------- */
const ALL_BOSSES = LEVELS.flatMap(L => L.boss);
// every wave is a little longer, faster and busier than the one before (capped so the signs stay readable)
const survivalWave = w => ({ count:Math.min(5+w, 12), speed:Math.min(1.1+.07*(w-1), 2.05), spawn:Math.max(3.3-.17*(w-1), 1.45),
                             maxAlive:Math.min(2+Math.floor(w/2), 5), bossSpeed:Math.min(.4+.03*(w-1), .66) });
const errCount = () => G.shotRight.length + G.wrongCure.length + G.reached.length + G.lost.length;
function startSurvival(){
  const pool = LEVELS.flatMap(L => L.items.map(e => parseItem(e, L.pos)));
  G = newState('survival', -1, Object.assign({ topic:'Survival', th:'โหมดเอาชีวิตรอด' }, survivalWave(1)), pool, .55);
  // everyone plays at normal speed so the leaderboard is fair; the record to beat is shown in the HUD
  Object.assign(G, { speedMul:1, wave:1, waveErr0:0, bossesBeaten:0, bossBag:[], phaseT:2.2, record:Store.boardTop(),
    banner:{ kicker:`${T('svKicker')} · ${T('svTitle')}`, title:T('svWave', 1), sub:null } });     // sub: the controls line
  UI.enterGame();
}
// the wave is over: bonus (doubled when it had no mistakes), then a boss after every 3rd wave, else the next wave
function waveCleared(){
  const w = G.wave, perfect = errCount()===G.waveErr0, bonus = 100*w*(perfect ? 2 : 1), msg = T(perfect ? 'svPerfect' : 'svCleared', w, bonus);
  G.score += bonus;
  if(w % 3 === 0){ addText(W/2, H*.3, msg, C.warn, 24, 2.2); G.phase = 'bossIntro'; G.phaseT = 2.4; SFX.roar(); }
  else nextWave(msg);
  UI.hud();
}
function nextWave(kicker){
  G.wave++; Object.assign(G.L, survivalWave(G.wave));
  G.spawned = G.resolved = 0; G.deck = makeDeck(G.L.count, .55); G.spawnT = .8; G.boss = null; G.waveErr0 = errCount();
  G.banner = { kicker, title:T('svWave', G.wave), sub:T('svFaster') };
  G.phase = 'intro'; G.phaseT = 2.2; SFX.wave(); UI.hud();
}
// survival bosses come from every level; long ones keep 3 of their rounds so a boss never stalls the run
function survivalBoss(){
  if(!G.bossBag.length) G.bossBag = shuffleArr(ALL_BOSSES.slice());
  const e = G.bossBag.pop();
  if(e.stages.length <= 3) return e;
  const keep = new Set(shuffleArr(e.stages.map((_,i) => i)).slice(0, 3));
  return Object.assign({}, e, { stages:e.stages.filter((_,i) => keep.has(i)) });
}

/* ---------- spawning ---------- */
function nextItem(){
  if(!G.bag.length) G.bag = shuffleArr(G.pool.slice());
  return G.bag.pop();
}
const gone = z => z.state==='dying' || z.state==='leaving' || z.state==='rescued';
const live = z => z.state==='walk' || z.state==='attack';
// signs float near the horizon at every distance, so two live zombies in one lane would always overlap:
// one zombie per lane, and keep neighbours apart while their signs are still small and far away
function pickLane(){
  let best = null, bestP = 1e9;
  for(const l of [-1,-.5,0,.5,1]){
    let p = Math.random()*.5;
    for(const z of G.zombies){
      if(gone(z)) continue;
      const dl = Math.abs(z.lane-l);
      if(dl < .01) p += 100;
      else if(dl < .6) p += z.d > DMAX*.5 ? 50 : 15;
    }
    if(p < bestP){ bestP = p; best = l; }
  }
  return bestP < 40 ? best : null;
}
function spawn(){
  const lane = pickLane();
  if(lane===null){ G.spawnT = .35; return; }
  const it = nextItem(), wrong = G.deck[G.spawned], id = zid++;
  G.zombies.push({ id, it, wrong, mark: wrong ? it.wMark : it.tMark, sig:'z'+id,
    toks: colorToks(wrong ? it.wrong.toks : it.right.toks),
    lane, d:DMAX, phase:Math.random()*6, sp:.9+Math.random()*.2, state:'walk', t:0, born:G.clock, atk:0, slap:0,
    skin:SKINS[Math.floor(Math.random()*SKINS.length)], shirt:SHIRTS[Math.floor(Math.random()*SHIRTS.length)],
    fall:Math.random()<.5 ? -1 : 1, decided:false });
  G.spawned++;
  G.spawnT = G.L.spawn*(.85+Math.random()*.3)/G.speedMul;
  if(Math.random() < .5) SFX.groan();
}

/* ---------- helpers ---------- */
function addText(x, y, text, color, size=20, life=1.6){ G.texts.push({ x, y, text, color, size, life, max:life }); }
function burst(x, y, color, n, spd){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=spd*(.3+Math.random());
    G.parts.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v-spd*.4, life:.5+Math.random()*.5, color, r:2+Math.random()*4 }); }
}
const inRect = (x,y,r) => !!r && x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h;
const posLine = it => `${it.right.key} = ${posName(it.pos)}${it.note ? ' · '+it.note : ''}`;
const record = z => ({ w:z.it.wMark, r:z.it.tMark, pos:z.it.pos, note:z.it.note });
function hurt(n){
  if(!G || G.phase==='over') return;
  G.hp = Math.max(0, G.hp-n); G.hurt = 1; G.shake = .35; UI.hud();
  if(G.hp <= 0) endGame(false);
}
// the FIRST action on a zombie decides right/wrong (accuracy, combo, notebook); later actions only finish it
function decide(z, good){
  if(z.decided) return false;
  z.decided = true; G.decisions++;
  if(good){
    G.good++; G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.decTimes.push(G.clock-z.born);
    if(Store.nbCorrect(z.it.text)) G.mastered++;
    if(G.good%4===0 && G.slow<3){ G.slow++; addText(W/2, H*.36, T('slowReady'), '#8fd0ff', 20, 1.6); }
    if(G.mode==='survival'){        // survival: every 3 correct answers (in total, not only in a row) heal 10% HP, instead of the combo heal
      if(G.good%3===0 && G.hp < 100){ G.hp = Math.min(100, G.hp+10); addText(W/2, H*.42, T('svHealed'), C.ok, 22, 1.5); SFX.heal(); }
    }
    else if(G.combo%5===0){ G.hp = Math.min(100, G.hp+15); addText(W/2, H*.42, T('healed'), C.ok, 22, 1.5); SFX.heal(); }
  } else {
    G.combo = 0;
    Store.nbMistake(z.it.text, z.it.wMark, levelOf(z.it.text));
  }
  return true;
}
function award(x, y){ const pts = 100+(G.combo-1)*20; G.score += pts; addText(x, y, '+'+pts, C.warn, 26, 1.1); }

/* ---------- player actions: two M107 rifles (left = kill rounds, right = cure rounds) ---------- */
// the spent casing flies out of the ejection port on the rifle's top side (outwards, away from the screen centre), then falls
function ejectShell(gun){
  const a = aimAngle(gun), p = riflePoint(gun, rifleLen()*.47, -rifleLen()*.045), sp = 260 + Math.random()*120;
  const s = RIFLES[gun].flip ? 1 : -1, nx = -Math.sin(a)*s, ny = Math.cos(a)*s;     // unit normal pointing out of the top side
  G.shells.push({ x:p.x, y:p.y, vx:nx*sp - Math.cos(a)*60, vy:ny*sp - Math.sin(a)*60 - 120,
                  rot:Math.random()*6, vr:(Math.random() < .5 ? -1 : 1)*(10 + Math.random()*8), life:1.2, cure:gun==='cure' });
}
// target = the zombie to hit (touch triggers); without it the shot hits whatever is under (px, py)
function shoot(px, py, gun='kill', target=null){
  if(!G || G.paused || !['intro','wave','bossIntro','boss'].includes(G.phase)) return;
  const g = G.guns[gun];
  if(!g || g.cool > 0) return;                       // each rifle has its own fire cycle, so left / right can alternate fast
  audio(); g.cool = .25; g.recoil = 1; g.flash = .09; G.shake = Math.max(G.shake, .07);
  if(gun==='kill') SFX.shot(); else SFX.dart();
  ejectShell(gun);
  const m = muzzle(gun);
  G.tracers.push({ x1:m.x, y1:m.y, x2:px, y2:py, life:.09, gun });
  if(G.phase==='boss'){
    if(inRect(px,py,G.boss.body)){ burst(px,py,'#ffd27a',8,160); addText(px,py-30,T('bounce'),'#ffd27a',18,1.2); }
    return;
  }
  if(G.phase!=='wave') return;
  const hit = target && live(target) ? target
            : G.zombies.filter(live).sort((a,b)=>a.d-b.d).find(z=>inRect(px,py,z.rect)||inRect(px,py,z.body));
  if(!hit){ burst(px, py, gun==='kill' ? '#8a8a8a' : C.ok, 5, 80); return; }
  if(gun==='kill') killHit(hit); else cureHit(hit);
  UI.hud();
}
// kill round (left click): correct on broken sentences, a disaster on survivors
function killHit(z){
  const it = z.it, cx = laneX(z.lane,z.d), headY = feetY(z.d)-1.6*pxPerM(z.d), fs = Math.min(30, W/32);
  z.state = 'dying'; z.t = 0; G.resolved++;
  if(z.wrong){
    burst(cx,headY,C.ok,22,260); burst(cx,headY,'#3d6b2a',12,180);
    if(decide(z, true)){ award(cx, headY-40); G.fixed.push(record(z)); }
    else{ G.score += 20; addText(cx, headY-40, '+20', C.warn, 22, 1); }
    addText(W/2, H*.2, it.text, C.ok, fs, 2.6);
    SFX.good(); Voice.speak(it.text);
  } else {
    burst(cx,headY,'#cfa36b',16,200);
    if(decide(z, false)) G.shotRight.push(record(z));
    addText(W/2, H*.2, TT('survivorHit'), C.bad, fs*.8, 2.6);
    SFX.bad(); hurt(15);
  }
  addText(W/2, H*.2+fs*1.25, posLine(it), POS[it.pos].color, fs*.75, 2.6);
}
// cure round (right click): cures survivors; on a broken sentence the cure fails and the zombie gets faster
function cureHit(z){
  const it = z.it, cx = laneX(z.lane,z.d), headY = feetY(z.d)-1.6*pxPerM(z.d), fs = Math.min(30, W/32);
  if(!z.wrong){
    z.state = 'rescued'; z.t = 0; G.resolved++;
    burst(cx,headY,C.ok,26,240); burst(cx,headY,'#ffffff',10,160);
    if(decide(z, true)){ award(cx, headY-40); G.rescued.push(record(z)); }
    addText(W/2, H*.2, it.text, C.ok, fs, 2.6);
    SFX.rescue(); Voice.speak(it.text);
  } else {
    burst(cx,headY,'#9aa5b1',12,140);
    if(decide(z, false)) G.wrongCure.push(record(z));
    z.sp = Math.min(z.sp*1.35, 1.9);
    addText(W/2, H*.2, TT('cureFail'), C.bad, fs*.8, 2.6);
    SFX.cureFail(); hurt(10);
  }
  addText(W/2, H*.2+fs*1.25, posLine(it), POS[it.pos].color, fs*.75, 2.6);
}
function useSlowmo(){
  if(!G || G.paused || G.slow<=0 || G.slowT>0 || !(G.phase==='wave' || G.phase==='boss')) return;
  G.slow--; G.slowT = 5; SFX.slow(); UI.hud();
}
/* ---------- touch screens: tap a zombie to target it, then press the left (kill) or right (rescue) trigger ---------- */
// the zombie the triggers shoot at: the one the player tapped, else the closest one
function touchTarget(){
  if(!G || G.phase!=='wave') return null;
  let z = G.zombies.find(z => z.id===G.target && live(z));
  if(!z){ z = G.zombies.filter(live).sort((a,b) => a.d-b.d)[0] || null; G.target = z ? z.id : null; }
  return z;
}
// a tap on the scene only aims (it never fires, so the player still has to choose kill or rescue)
function pickTarget(px, py){
  if(!G || G.paused || G.phase!=='wave') return;
  const z = G.zombies.filter(live).sort((a,b) => a.d-b.d).find(z => inRect(px,py,z.rect) || inRect(px,py,z.body));
  if(!z) return;
  G.target = z.id; SFX.tile(0);
  if(!G.tapHinted){ G.tapHinted = true; addText(W/2, H*.3, T('tapHint'), C.text, 20, 2.2); }
}
function fireTouch(gun){
  const z = touchTarget();
  if(z && z.body) shoot(z.body.x+z.body.w/2, z.body.y+z.body.h*.55, gun, z);
  else shoot(mouse.x, mouse.y, gun);
}
// both rifles follow the targeted zombie
function aimAtTarget(){
  const z = touchTarget();
  if(z && z.body){ mouse.x = z.body.x+z.body.w/2; mouse.y = z.body.y+z.body.h*.55; }
}

/* ---------- boss: find every word of the requested part of speech ---------- */
const bossToks = B => B.words.map((w,i) => [[w, B.found.has(i) ? POS[B.found.get(i)].color : null]]);
function spawnBoss(){
  const entry = G.mode==='survival' ? survivalBoss() : G.L.boss[Math.floor(Math.random()*G.L.boss.length)];
  const B = Object.assign(buildBoss(entry), { big:true, entry, stage:0, found:new Map(), d:16, lane:0, phase:0,
    state:'walk', t:0, atk:0, slap:0, hit:0, skin:'#6d8b4b', shirt:'#3a2b4d', fall:1, sig:'b0' });
  B.total = B.stages.reduce((a,s) => a+s.idx.length, 0);
  B.toks = bossToks(B);
  G.boss = B; G.phase = 'boss'; G.bossErr0 = G.bossErrors;
  UI.showTiles(B);
}
function bossPick(i){
  const B = G && G.boss;
  if(!B || G.phase!=='boss' || G.paused || B.found.has(i) || !B.words[i]) return;
  audio();
  const st = B.stages[B.stage], word = B.words[i].replace(/[^A-Za-z0-9']/g,'');
  if(st.idx.includes(i)){
    B.found.set(i, st.pos); B.hit = .25; B.d = Math.min(DMAX, B.d+.8);
    if(B.state==='attack') B.state = 'walk';
    G.score += 50; SFX.tile(B.found.size);
    const s = pxPerM(B.d)*1.35; burst(laneX(0,B.d), feetY(B.d)-1.2*s, POS[st.pos].color, 14, 220);
    if(st.idx.every(k => B.found.has(k))){
      B.stage++;
      if(B.stage >= B.stages.length) bossDefeated();
      else{ addText(W/2, H*.5, T('stageClear', posName(st.pos,true)), POS[st.pos].color, 24, 1.4); SFX.good(); }
    }
  } else if(B.neutral.has(B.norms[i])){
    addText(W/2, H*.5, T('neutralHint', word), C.text2, 20, 1.4);
  } else {
    G.bossErrors++; G.combo = 0; B.d = Math.max(DMIN+.2, B.d-1.5); G.shake = .2; SFX.tileBad();
    const known = B.posOf.get(i);
    addText(W/2, H*.5, known ? T('wrongPos', word, posA(known)) : T('notPos', word, posA(st.pos)), C.bad, 22, 1.6);
    UI.tileWrong(i);
  }
  B.toks = bossToks(B); B.sig = 'b'+B.found.size;
  UI.updateTiles(B); UI.hud();
}
// the boss sentence with every target word's part of speech (for the debrief)
function bossAnswer(B){
  G.bossText = B.entry.t; G.bossTh = B.entry.th;
  G.bossWords = B.words.map((w,i) => ({ w, pos:B.posOf.get(i) || null }));
}
function bossDefeated(){
  const B = G.boss;
  bossAnswer(B);
  B.state = 'dying'; B.t = 0; G.phase = 'bossDead'; G.phaseT = 2;
  const bonus = Math.max(50, 300-(G.bossErrors-G.bossErr0)*50); G.score += bonus;
  const s = pxPerM(B.d)*1.35, x = laneX(0,B.d), y = feetY(B.d)-1.2*s;
  burst(x,y,C.boss,40,380); burst(x,y,C.ok,30,300);
  addText(W/2, H*.22, G.bossText, C.ok, Math.min(28,W/32), 3);
  addText(x, y-60, '+'+bonus, C.warn, 30, 1.4);
  if(G.mode==='survival'){ G.bossesBeaten++; G.hp = Math.min(100, G.hp+20); addText(W/2, H*.3, '+20 HP', C.ok, 24, 1.6); SFX.heal(); }
  SFX.boom(); Voice.speak(G.bossText); UI.hideTiles(); UI.hud();
}
function updateBoss(dt){
  const B = G.boss;
  if(B.state==='walk'){
    B.d -= (G.L.bossSpeed || .5)*G.speedMul*dt; B.phase += dt*3.5;
    if(B.d <= DMIN+.2){ B.d = DMIN+.2; B.state = 'attack'; B.atk = .6; }
  } else if(B.state==='attack'){
    B.phase += dt*2; B.atk -= dt; B.slap = Math.max(0, B.slap-dt*3);
    if(B.atk <= 0){ B.atk = 1.5; B.slap = 1; SFX.slap(); hurt(12); }
  }
}
// called by the speaking panel; score = 0..100, or null when skipped
function finishSpeak(score){
  if(!G || G.phase!=='speak') return;
  G.speakScore = score;
  if(score != null) G.score += speakBonus(score);
  endGame(true);
}

/* ---------- update ---------- */
function updateWave(dt, ts){
  G.spawnT -= dt;
  const alive = G.zombies.filter(z=>z.state==='walk'||z.state==='attack').length;
  if(G.spawned<G.L.count && G.spawnT<=0 && alive<G.L.maxAlive) spawn();
  for(const z of G.zombies){
    z.t += dt;
    if(z.state==='walk'){
      z.d -= G.L.speed*G.speedMul*z.sp*dt*ts; z.phase += dt*5.5*ts;
      if(z.d <= DMIN){
        z.d = DMIN;
        if(z.wrong){                                   // broken sentence reached you: it bites until killed
          z.state = 'attack'; z.atk = .5;
          if(decide(z, false)) G.reached.push(record(z));
        } else {                                       // survivor nobody rescued: lost
          z.state = 'leaving'; z.t = 0; G.resolved++;
          if(decide(z, false)) G.lost.push(record(z));
          addText(laneX(z.lane,z.d), feetY(z.d)-1.95*pxPerM(z.d), T('lost'), C.warn, 20, 1.3); SFX.lost();
        }
        UI.hud();
      }
    } else if(z.state==='attack'){
      z.phase += dt*2*ts; z.atk -= dt*ts; z.slap = Math.max(0, z.slap-dt*3);
      if(z.atk <= 0){ z.atk = 1.2; z.slap = 1; SFX.slap(); hurt(10); if(G.phase==='over') return; }
    }
  }
  G.zombies = G.zombies.filter(z=>!((z.state==='dying'&&z.t>.7) || (z.state==='leaving'&&z.t>.8) || (z.state==='rescued'&&z.t>1.1)));
  if(G.resolved>=G.L.count && G.zombies.length===0){
    if(G.mode==='level'){ G.phase = 'bossIntro'; G.phaseT = 2.4; SFX.roar(); UI.hud(); }
    else if(G.mode==='survival') waveCleared();
    else endGame(true);
  }
}
function update(dt){
  if(!G || G.paused) return;
  for(const g of Object.values(G.guns)){ g.cool = Math.max(0,g.cool-dt); g.recoil = Math.max(0,g.recoil-dt*6); g.flash = Math.max(0,g.flash-dt); }
  G.hurt = Math.max(0,G.hurt-dt*2); G.shake = Math.max(0,G.shake-dt);
  for(const p of G.parts){ p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 600*dt; p.life -= dt; }
  for(const s of G.shells){ s.x += s.vx*dt; s.y += s.vy*dt; s.vy += 1100*dt; s.rot += s.vr*dt; s.life -= dt; }
  G.shells = G.shells.filter(s => s.life > 0 && s.y < H + 60);
  G.parts = G.parts.filter(p=>p.life>0);
  for(const t of G.texts){ t.life -= dt; t.y -= dt*18; }
  G.texts = G.texts.filter(t=>t.life>0);
  for(const t of G.tracers) t.life -= dt;
  G.tracers = G.tracers.filter(t=>t.life>0);
  if(G.boss){ G.boss.t += dt; G.boss.hit = Math.max(0, G.boss.hit-dt); }
  if(G.phase==='over' || G.phase==='speak') return;
  G.clock += dt;
  let ts = 1;
  if(G.slowT > 0){ G.slowT = Math.max(0, G.slowT-dt); ts = .35; }
  if(G.phase==='intro'){ G.phaseT -= dt; if(G.phaseT<=0) G.phase = 'wave'; }
  else if(G.phase==='wave') updateWave(dt, ts);
  else if(G.phase==='bossIntro'){ G.phaseT -= dt; if(G.phaseT<=0) spawnBoss(); }
  else if(G.phase==='boss') updateBoss(dt*ts);
  else if(G.phase==='bossDead'){
    G.phaseT -= dt;
    if(G.phaseT <= 0){
      if(G.mode==='survival') nextWave(T('svBossDown'));             // survival keeps going: no speaking break
      else if(Store.d.settings.speak){ G.phase = 'speak'; UI.openSpeak(G.bossText); }
      else endGame(true);
    }
  }
}

/* ---------- end of a run ---------- */
function endGame(win){
  if(!G || G.phase==='over') return;
  const sv = G.mode==='survival';
  if(sv && G.phase==='boss' && G.boss) bossAnswer(G.boss);     // the debrief explains the boss that got you
  G.phase = 'over'; UI.hideTiles();
  const errors = G.shotRight.length + G.wrongCure.length + G.reached.length + G.lost.length + Math.floor(G.bossErrors/2);
  const stars = win ? (errors===0 ? 3 : errors<=2 ? 2 : 1) : 0;
  const acc = G.decisions ? Math.round(G.good/G.decisions*100) : 0;
  const avgDec = G.decTimes.length ? G.decTimes.reduce((a,b)=>a+b,0)/G.decTimes.length : 0;
  const sd = Store.d, time = Math.round(G.clock);
  if(win && G.mode==='level'){
    sd.stars[G.idx] = Math.max(sd.stars[G.idx]||0, stars);
    sd.best[G.idx] = Math.max(sd.best[G.idx]||0, G.score);
  }
  // survival: the run goes on the leaderboard under the player's name
  const board = sv ? Store.addRun({ id:Date.now().toString(36) + Math.random().toString(36).slice(2,6), name:sd.player, score:G.score,
    wave:G.wave, time, acc, good:G.good, decisions:G.decisions, combo:G.bestCombo, bosses:G.bossesBeaten, date:new Date().toISOString() }) : null;
  Store.logSession({ time:new Date().toISOString(), player:sd.player||'', mode:G.mode,
    level:G.mode==='level' ? G.idx+1 : G.mode, wave:sv ? G.wave : '', topic:G.L.topic, result:sv ? 'gameover' : win ? 'win' : 'lose',
    score:G.score, stars, accuracy:acc, decisions:G.decisions, correct:G.good, kills:G.fixed.length, rescued:G.rescued.length,
    survivorsShot:G.shotRight.length, wrongCures:G.wrongCure.length, lostSurvivors:G.lost.length, bitten:G.reached.length,
    bossErrors:G.bossErrors, avgDecisionSec:+avgDec.toFixed(2), bestCombo:G.bestCombo, speakScore:G.speakScore ?? '',
    speed:sv ? 'normal' : ['relaxed','normal','hard'][sd.settings.speed] || 'normal', durationSec:time, fun:'', difficulty:'' });
  (win || (board && board.pb) ? SFX.win : SFX.lose)();
  const summary = { win, mode:G.mode, idx:G.idx, score:G.score, stars, acc, avgDec, bestCombo:G.bestCombo,
    fixed:G.fixed, rescued:G.rescued, shotRight:G.shotRight, wrongCure:G.wrongCure, reached:G.reached, lost:G.lost,
    bossText:G.bossText, bossTh:G.bossTh, bossWords:G.bossWords, bossErrors:G.bossErrors, speakScore:G.speakScore, mastered:G.mastered,
    wave:G.wave, time, board, name:sd.player };
  const run = G;
  setTimeout(()=>{ if(G===run) UI.showResult(summary); }, win ? 700 : 1100);
}
