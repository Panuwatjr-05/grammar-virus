/* =========================================================
   Automated self-test — runs ONLY when the URL ends with #selftest
   (content checks + simulated play-through; restores saved progress after)
   Demo snapshots for screenshots/slides: #demo-brief, #demo-wave, #demo-boss, #demo-result, #demo-guide
   ========================================================= */
const TEST_SOLVE = () => { const B = G.boss, st = B.stages[B.stage]; bossPick(st.idx.find(k => !B.found.has(k))); };
// perfect player: kill round on broken sentences, cure round on correct ones
const TEST_SHOOT = maxD => () => {
  if(!G || G.phase!=='wave') return;
  const z = G.zombies.find(z => z.state==='walk' && z.d < maxD && z.body);
  if(z){ G.guns.kill.cool = G.guns.cure.cool = 0; shoot(z.body.x+z.body.w/2, z.body.y+z.body.h*.55, z.wrong ? 'kill' : 'cure'); }
};
// a player who picks the wrong gun every 4th time (and finishes off zombies they tried to cure)
const TEST_SLOPPY = () => {
  let n = 0;
  return () => {
    if(!G || G.phase!=='wave') return;
    G.guns.kill.cool = G.guns.cure.cool = 0;
    const at = (z, gun) => shoot(z.body.x+z.body.w/2, z.body.y+z.body.h*.55, gun);
    const left = G.zombies.find(z => (z.state==='walk'||z.state==='attack') && z.decided && z.wrong && z.body);
    if(left) return at(left, 'kill');
    const z = G.zombies.find(z => z.state==='walk' && z.d < 10 && z.body && !z.decided);
    if(!z) return;
    n++;
    at(z, n%4===1 ? (z.wrong ? 'cure' : 'kill') : (z.wrong ? 'kill' : 'cure'));
  };
};
// sample survival leaderboard for screenshots (demo only: the real save is restored afterwards)
const DEMO_BOARD = () => {
  const rows = [['Mint',14820,9,318,92,34],['Poom',12340,8,281,88,27],['Ploy',11960,8,276,90,22],['Ben',9480,7,240,84,18],
                ['Anna',8210,6,212,81,15],['Poom',7900,6,205,79,14],['Ice',6120,5,180,76,12],['Mint',5400,5,171,85,11],['Fah',3980,4,133,72,9]];
  Store.d.board = rows.map(([name, score, wave, time, acc, combo], i) => ({ id:'demo'+i, name, score, wave, time, acc,
    good:Math.round(acc/2), decisions:50, combo, bosses:Math.floor(wave/3), date:new Date(Date.now()-(i*47+5)*60000).toISOString() }));
  Store.d.player = 'Ploy';
};
// sample play data from 5 players for screenshots of the stats tab
const DEMO_PLAYERS = ['Mint','Poom','Ploy','Ben','Anna'];
const DEMO_SESSIONS = () => {
  const S = []; let t = Date.now() - 3*864e5;
  DEMO_PLAYERS.forEach((player, pi) => {
    for(let lv = 1; lv <= 7-pi; lv++){                      // each player got a bit less far
      const tries = 1 + (lv+pi)%2;
      for(let k = 0; k < tries; k++){
        const win = k===tries-1, dec = 12+lv, cor = Math.round(dec*(win ? .9-pi*.04 : .6));
        S.push({ time:new Date(t += 9e5).toISOString(), player, mode:'level', level:lv, topic:LEVELS[lv-1].topic, result:win ? 'win' : 'lose',
          score:win ? 1400+lv*230-pi*120 : 600+lv*90, stars:win ? 3-(pi+lv)%3 : 0, decisions:dec, correct:cor, durationSec:70+lv*12 });
      }
    }
    S.push({ time:new Date(t += 9e5).toISOString(), player, mode:'survival', level:'survival', wave:9-pi, topic:'Survival', result:'gameover',
      score:14820-pi*2200, stars:0, decisions:60-pi*6, correct:Math.round((60-pi*6)*(.9-pi*.04)), durationSec:320-pi*40 });
  });
  Store.d.sessions = S; Store.d.stars = {};
  S.filter(s => s.mode==='level').forEach(s => { Store.d.stars[s.level-1] = Math.max(Store.d.stars[s.level-1]||0, s.stars); });
};

if(location.hash.startsWith('#demo-')){
  window.requestAnimationFrame = () => 0;
  // #demo-<mode>[level][-th], e.g. #demo-brief1-th = level 1 briefing in Thai
  const backup = JSON.stringify(Store.d), [, mode, lvNum, thai] = location.hash.match(/^#demo-([a-z]+)(\d*)(-th)?$/) || [];
  if(thai){ Store.d.settings.lang = 'th'; UI.applyLang(); }
  const frames = (n, fn) => { for(let i=0;i<n;i++){ if(G) G.paused = false; if(fn) fn(); update(1/60); if(i%3===0) render(); } render(); };
  setTimeout(() => {                                          // wait until the window has its final size
    try{
      resize();
      if(mode==='brief') UI.briefing(lvNum ? +lvNum-1 : 4);
      if(mode==='guide'){ UI.tab = 'guide'; UI.renderMenu(); }
      if(mode==='wave'){ startLevel(4); frames(60*10); mouse.x = W*.56; mouse.y = H*.5; render(); }
      if(mode==='mobile'){ setTouch(); startLevel(4); frames(60*10); aimAtTarget(); render(); }   // touch: triggers + target
      if(mode==='rescue'){                                   // kill broken sentences while waiting, then capture a cure shot
        startLevel(4); let i = 0, z = null;
        const killWrong = () => { const w = G.zombies.find(w => w.state==='walk' && w.wrong && w.d < 12 && w.body);
          if(w){ G.guns.kill.cool = G.guns.cure.cool = 0; shoot(w.body.x+w.body.w/2, w.body.y+w.body.h*.55, 'kill'); } };
        while(i++ < 4000 && !(z = G.zombies.find(z => z.state==='walk' && !z.wrong && z.d < 12 && z.body))) frames(1, killWrong);
        if(z){ G.guns.kill.cool = G.guns.cure.cool = 0; mouse.x = z.body.x+z.body.w/2; mouse.y = z.body.y+z.body.h*.55; shoot(mouse.x, mouse.y, 'cure'); }
        frames(3);
      }
      if(mode==='boss'){
        startLevel(9); G.phase = 'wave'; G.spawned = G.resolved = G.L.count;
        frames(60*6);
        for(let k=0;k<4;k++) TEST_SOLVE();
        frames(20);
      }
      if(mode==='mistakes'){                                 // a player who picks the wrong gun every 4th time
        Store.d.settings.speak = false; startLevel(lvNum ? +lvNum-1 : 4);
        let i = 0; const sloppy = TEST_SLOPPY();
        while(G.phase!=='boss' && G.phase!=='over' && i++ < 20000) frames(1, sloppy);
        while(G.phase==='boss') TEST_SOLVE();
        frames(200);
      }
      // survival + leaderboard (with the sample leaderboard above)
      if(mode==='menu'){ DEMO_BOARD(); UI.tab = 'play'; UI.renderMenu(); }
      if(mode==='board'){ DEMO_BOARD(); UI.tab = 'board'; UI.renderMenu(); }
      if(mode==='stats'){                                    // #demo-stats2 = only the 2nd sample player's data
        DEMO_SESSIONS(); UI.statsPlayer = lvNum ? Store.nameKey(DEMO_PLAYERS[+lvNum-1]) : null; UI.tab = 'stats'; UI.renderMenu();
      }
      if(mode==='svbrief'){ DEMO_BOARD(); UI.survivalBrief(); }
      if(mode==='survival'){                                 // mid-run in wave 2, the record to beat in the HUD
        DEMO_BOARD(); startSurvival(); let i = 0;           // #demo-survival1 = the "wave 2" banner instead
        while(G.wave < 2 && i++ < 20000) frames(1, TEST_SHOOT(12));
        if(lvNum) frames(40); else frames(60*9, TEST_SHOOT(8));
        mouse.x = W*.52; mouse.y = H*.46; render();
      }
      if(mode==='svresult'){                                 // a new player makes some mistakes, beats the wave-3 boss, falls in wave 4
        DEMO_BOARD(); Store.d.player = 'Nan'; startSurvival();
        let i = 0; const sloppy = TEST_SLOPPY();
        while(G.phase!=='over' && G.wave < 4 && i++ < 40000){ if(G.phase==='boss') TEST_SOLVE(); else frames(1, sloppy); }
        while(G.phase!=='over' && i++ < 80000){ G.paused = false; update(1/60); if(i%30===0) render(); }
      }
      if(mode==='result'){
        Store.d.settings.speak = false; startLevel(0);
        let i = 0; while(G.phase!=='boss' && i++ < 20000) frames(1, TEST_SHOOT(10));
        while(G.phase==='boss') TEST_SOLVE();
        frames(200);
      }
    }catch(err){ document.title = 'DEMO ERROR: ' + err.message; }
  }, 200);
  setTimeout(render, 300);
  setTimeout(() => { Store.d = JSON.parse(backup); Store.save(); }, 4000);
}

if(location.hash === '#selftest'){
  window.requestAnimationFrame = () => 0;           // stop the real loop; the test drives frames itself
  const out = [], fails = [];
  const ok = (cond, msg) => { (cond ? out : fails).push((cond ? 'ok   ' : 'FAIL ') + msg); };
  window.addEventListener('error', e => fails.push('FAIL runtime error: ' + e.message));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const step = (fn, draw = true) => { if(G) G.paused = false; if(fn) fn(); update(1/60); if(draw) render(); };
  const runUntil = (cond, max, fn) => { let i = 0; while(!cond() && i < max){ step(fn, i % (fn ? 3 : 30) === 0); i++; } return i; };

  (async () => {
    const backup = JSON.stringify(Store.d);
    try{
      /* ---- 1. content checks ---- */
      let items = 0;
      LEVELS.forEach((L, li) => {
        const tag = `L${li+1} ${L.topic}`;
        const full = o => o && o.en && o.th;
        ok(full(L.q) && full(L.def) && full(L.clueNote) && full(L.tip) && L.chips.length && L.chips.every(p => POS[p])
           && L.groups.length && L.groups.every(g => g.words && (g.pos ? POS[g.pos] && full(g) : g.en))
           && L.rules.length && L.rules.every(r => full(r) && parseMarked(r.ok).key && (!r.bad || parseMarked(r.bad).key))
           && L.clues.length && L.clues.every(c => (c.s || POS[c.pos]) && c.en && (c.pos || c.exTh))
           && L.groups.every(g => g.wordsTh && g.wordsTh.split(' · ').length === g.words.split(' · ').length)
           && L.rules.every(r => r.okTh),
           `${tag}: teaching text complete (${L.rules.length} rules, each with a highlighted example)`);
        let bad = [];
        L.items.forEach(e => {
          items++;
          const r = parseMarked(e.t), w = parseMarked(e.w), pos = e.pos || L.pos;
          if(r.plain===w.plain || !r.key || !w.key || !POS[pos]) bad.push(e.t);
        });
        ok(bad.length===0 && L.items.length>=10, `${tag}: ${L.items.length} sentence pairs (correct ≠ broken, highlight + part of speech set)` + (bad.length ? ' ✗ '+bad.join(' | ') : ''));
        L.boss.forEach(b => {
          const B = buildBoss(b), seen = new Set(); let issue = '';
          B.stages.forEach((s, k) => {
            if(s.idx.length !== b.stages[k].keys.length) issue += ` stage ${s.pos}: ${s.idx.length} matches for ${b.stages[k].keys.length} keys;`;
            s.idx.forEach(i => { if(seen.has(i)) issue += ` "${B.words[i]}" in two stages;`; seen.add(i); });
          });
          B.neutral.forEach(n => { if(!B.norms.includes(n)) issue += ` neutral "${n}" not in sentence;`; });
          seen.forEach(i => { if(B.neutral.has(B.norms[i])) issue += ` "${B.words[i]}" is target and neutral;`; });
          ok(!issue, `${tag}: boss "${b.t}"${issue}`);
        });
      });
      ok(SENTENCE_INDEX.size === items, `${items} sentences, all unique`);
      const unexplained = [...SENTENCE_INDEX.keys()].filter(k => !(ANSWERS[k] && ANSWERS[k].tt && ANSWERS[k].en && ANSWERS[k].th));
      const orphans = Object.keys(ANSWERS).filter(k => !SENTENCE_INDEX.has(k));
      ok(!unexplained.length && !orphans.length, `answer key: ${SENTENCE_INDEX.size - unexplained.length}/${SENTENCE_INDEX.size} sentences have a translation + explanation`
         + (unexplained.length ? ' · missing: ' + unexplained.join(' | ') : '') + (orphans.length ? ' · no such sentence: ' + orphans.join(' | ') : ''));
      const last = LEVELS[LEVELS.length-1];
      ok(last.boss.every(b => POS_ORDER.every(p => b.stages.some(s => s.pos===p))), 'final boss sentences contain all 8 parts of speech');
      ok(LEVELS.filter(L => L.pos).map(L => L.pos).join() === POS_ORDER.join(), 'levels 1–8 cover the 8 parts of speech in order');
      ok(markedHTML('She sings [beautifully].','ok').includes('<mark class="ok">beautifully</mark>'), 'highlight markup renders');
      ok(parseMarked('[Both] Tom [and] Anna are here.').key === 'Both … and', 'split highlights join as "Both … and"');
      ok(matchScore('i was born in 2008', 'I was born in 2008.') === 1 && matchScore('she has lived here for 10 years','She has lived here for ten years.') === 1, 'speech match handles numbers');
      ok(Object.keys(STR.th).every(k => k in STR.en), 'every Thai UI string has an English key');
      const svKeys = Object.keys(STR.en).filter(k => /^(sv|bd|tabBoard|hudSurvival|hudRecord|hudNewRecord|sWave|sTime)/.test(k));
      ok(svKeys.every(k => k in STR.th), `survival + leaderboard text is translated to Thai (${svKeys.length} strings)`);
      ok(posA('adverb')==='an adverb' && posA('noun')==='a noun' && posA('interjection')==='an interjection', 'feedback uses "an adverb" / "a noun"');
      ok(T('findPrompt', posName('verb', true)) === 'Find all the verbs' && T('findLeft', 2) === '2 left', 'boss prompt reads "Find all the verbs" · "2 left"');

      /* ---- 2a. dual guns ---- */
      startLevel(0); G.phase = 'wave'; G.spawnT = 999;
      const mk = (wrong, lane, d) => { G.deck[G.spawned] = wrong; spawn(); const z = G.zombies[G.zombies.length-1]; z.lane = lane; z.d = d; return z; };
      const at = (z, gun) => { render(); G.guns.kill.cool = G.guns.cure.cool = 0; shoot(z.body.x+z.body.w/2, z.body.y+z.body.h*.55, gun); };
      const zc = mk(false, -1, 8), zw = mk(true, 1, 8);
      at(zc, 'cure');
      ok(zc.state==='rescued' && G.rescued.length===1 && G.good===1 && G.hp===100, 'cure round rescues a correct sentence');
      at(zw, 'cure');
      ok(zw.state==='walk' && G.hp===90 && G.wrongCure.length===1 && zw.sp>1.1, 'cure round on a broken sentence: −10 HP and the zombie speeds up');
      at(zw, 'kill');
      ok(zw.state==='dying' && G.decisions===2 && G.fixed.length===0, 'a kill round still finishes it, but only the first decision counts');
      const zs = mk(false, 0, 8); at(zs, 'kill');
      ok(G.hp===75 && G.shotRight.length===1, 'kill round on a survivor: −15 HP');
      const zl = mk(false, .5, DMIN+.01); step();
      ok(zl.state==='leaving' && G.lost.length===1, 'a survivor nobody rescues is lost');
      const zr = mk(false, -.5, 8); render(); G.guns.kill.cool = G.guns.cure.cool = 0;
      cv.dispatchEvent(new MouseEvent('mousedown', { button:2, clientX:zr.body.x+zr.body.w/2, clientY:zr.body.y+zr.body.h*.55, bubbles:true }));
      ok(zr.state==='rescued', 'right mouse button fires a cure round');
      const menuEv = new MouseEvent('contextmenu', { bubbles:true, cancelable:true }); cv.dispatchEvent(menuEv);
      ok(menuEv.defaultPrevented, 'browser right-click menu is blocked during play');
      G.tracers = []; G.guns.kill.cool = G.guns.cure.cool = 0; mouse.x = W/2; mouse.y = H*.45;
      shoot(W/2, H*.3, 'kill'); shoot(W/2, H*.3, 'cure'); shoot(W/2, H*.3, 'kill');
      const tk = G.tracers.filter(t => t.gun==='kill'), tc = G.tracers.filter(t => t.gun==='cure'), [sk, sc] = G.shells.slice(-2);
      ok(tk.length===1 && tc.length===1 && tk[0].x1 < W*.45 && tc[0].x1 > W*.55 && sk.vx < 0 && !sk.cure && sc.vx > 0 && sc.cure,
         'two rifles: kill rounds fire from the left one, cure rounds from the right one, each on its own fire cycle');

      /* ---- 2c. touch screens: tap to target, left / right trigger buttons ---- */
      setTouch();
      startLevel(0); G.phase = 'wave'; G.spawnT = 999;
      const tFar = mk(true, -1, 9), tNear = mk(false, 1, 6); render();
      ok(touchTarget()===tNear, 'touch: the closest zombie is targeted automatically');
      const touchEv = (el, x, y) => el.dispatchEvent(new PointerEvent('pointerdown', { pointerType:'touch', clientX:x, clientY:y, bubbles:true, cancelable:true }));
      touchEv(cv, tFar.body.x+tFar.body.w/2, tFar.body.y+tFar.body.h*.5);
      ok(G.target===tFar.id && tFar.state==='walk' && tNear.state==='walk', 'touch: tapping a zombie only targets it (no shot)');
      G.guns.kill.cool = G.guns.cure.cool = 0;
      touchEv(document.querySelector('.gunbtn.kill'), 0, 0); render();
      touchEv(document.querySelector('.gunbtn.cure'), 0, 0);
      ok(tFar.state==='dying' && tNear.state==='rescued' && G.good===2,
         'touch: left button = kill round at the target, right button = cure round at the next closest one');
      ok(TT('go')===T('goT') && document.querySelector('[data-i18n="r1t"]').textContent===T('r1tT'), 'touch: help texts say "button" instead of "click"');
      document.body.classList.remove('touch'); UI.applyLang();

      /* ---- 2b. survival mode + leaderboard ---- */
      const realSpeed = Store.d.settings.speed;
      Store.d.board = []; Store.d.player = 'Tester'; Store.d.settings.speed = 0;
      startSurvival();
      ok(G.mode==='survival' && G.pool.length===items && G.speedMul===1 && G.wave===1,
         `survival mixes all ${items} sentences from every level, at the same speed for everyone`);
      Store.d.settings.speed = realSpeed;
      const sp1 = G.L.speed, n1 = G.L.count;
      runUntil(() => G.wave===2 || G.phase==='over', 20000, TEST_SHOOT(14));
      ok(G.wave===2 && G.L.speed > sp1 && G.L.count > n1 && G.score >= n1*100 + 200,
         `wave 1 cleared with the perfect-wave bonus → wave 2 is faster and longer (score ${G.score})`);
      runUntil(() => G.phase==='boss' || G.phase==='over', 40000, TEST_SHOOT(14));
      ok(G.phase==='boss' && G.wave===3 && G.boss.stages.length <= 3,
         `wave 3 ends with a boss: "${G.boss ? G.boss.entry.t : '?'}" (${G.boss ? G.boss.stages.length : 0} rounds)`);
      G.hp = 50; runUntil(() => G.phase!=='boss', 2000, TEST_SOLVE);
      runUntil(() => G.phase==='intro' || G.phase==='over', 600);
      ok(G.wave===4 && G.hp===70 && G.bossesBeaten===1 && G.phase==='intro', 'beating the boss heals 20 HP and starts wave 4');
      runUntil(() => G.phase==='over', 60000);
      const svScore = G.score;
      ok(G.phase==='over' && G.hp===0, `the run only ends when HP runs out (wave ${G.wave}, ${svScore} points, ${(G.clock/60).toFixed(1)} min)`);
      await wait(1300);
      const run1 = Store.d.board[0];
      ok(Store.d.board.length===1 && run1.name==='Tester' && run1.wave===4 && run1.score===svScore, 'the run is saved on the leaderboard');
      ok(document.querySelector('#result').classList.contains('show') && document.querySelector('#rBody tr.me')
         && document.querySelector('#rBody .rankbadge b').textContent==='#1', 'survival result shows your rank and the leaderboard with your row highlighted');
      startSurvival(); render();
      ok(document.querySelector('#hBest').textContent.includes('Tester'), 'the HUD shows the record to beat');
      runUntil(() => G.decisions > 0, 20000, TEST_SHOOT(14)); UI.pause(true);
      const quitLbl = document.querySelector('#btnQuit span').textContent;
      document.querySelector('#btnQuit').click();
      ok(quitLbl===T('svEndRun') && G.phase==='over' && Store.d.board.length===2, 'pause → "End run & save score" ends the run and still saves it');
      await wait(1300);
      Store.d.board = [];
      const fake = (name, score, wave, k) => Store.addRun({ id:'t'+k, name, score, wave, time:wave*40, acc:80, good:8, decisions:10,
                                                           combo:4, bosses:0, date:new Date(Date.now()+k*1000).toISOString() });
      fake('Anna', 5000, 5, 1); fake('Ben', 7000, 6, 2); fake('Ben', 7000, 7, 3);
      const rA = fake(' anna ', 9000, 7, 4), PL = Store.boardPlayers();
      ok(PL.length===2 && PL[0].key==='anna' && PL[0].best.score===9000 && PL[0].runs===2 && PL[1].best.wave===7
         && rA.record && rA.pb && rA.playerRank===1 && rA.players===2,
         'leaderboard: one row per player (names ignore case and spaces), best first, a tie goes to the higher wave');
      UI.tab = 'board'; UI.boardView = 'players'; UI.renderMenu();
      const rowsP = document.querySelectorAll('#boardBody table.board tbody tr').length;
      document.querySelector('#bdView button[data-v="runs"]').click();
      ok(rowsP===2 && document.querySelectorAll('#boardBody table.board tbody tr').length===4, 'leaderboard tab lists every player and every run');
      UI.boardView = 'players';
      const keepD = Store.d; Store.d = JSON.parse(JSON.stringify(keepD)); Store.reset();
      const keptRuns = Store.d.board.length; Store.d = keepD; Store.save();
      ok(keptRuns===4, '"Reset progress" keeps the leaderboard');
      startSurvival(); G.phase = 'wave'; G.spawnT = 999; G.hp = 50;
      const hpTrail = [];
      for(let k = 0; k < 5; k++){ const z = mk(k%2===0, k*.5-1, 8); at(z, z.wrong ? 'kill' : 'cure'); hpTrail.push(G.hp); }
      ok(hpTrail.join()==='50,50,60,60,60' && G.combo===5 && document.querySelectorAll('#hPips i.on').length===2,
         `survival: every 3 correct answers heal 10% HP, no combo ×5 heal on top (HP ${hpTrail.join(' → ')})`);

      /* ---- 2. win run: level 1 with a perfect player ---- */
      Store.d.settings.speak = true;
      startLevel(0);
      let f = runUntil(() => G.phase === 'boss' || G.phase === 'over', 20000, TEST_SHOOT(14));
      ok(G.phase === 'boss', `wave 1 cleared in ${(f/60).toFixed(0)}s → boss (hp ${G.hp}, survivors shot ${G.shotRight.length}, bitten ${G.reached.length})`);
      const B = G.boss, wrongI = B.words.findIndex((w,i) => !B.stages[0].idx.includes(i) && !B.neutral.has(B.norms[i]));
      bossPick(wrongI);
      ok(G.bossErrors === 1 && B.found.size === 0, `clicking "${B.words[wrongI]}" (not a noun) is rejected`);
      runUntil(() => G.phase !== 'boss', 600, TEST_SOLVE);
      ok(G.phase === 'bossDead' && G.bossWords, `boss defeated: "${G.bossText}"`);
      runUntil(() => G.phase === 'speak', 400);
      ok(G.phase === 'speak' && document.querySelector('#speak').classList.contains('show'), 'speaking panel opens');
      finishSpeak(85);
      ok(G.phase === 'over' && G.speakScore === 85, 'speaking score recorded');
      await wait(900);
      ok(document.querySelector('#result').classList.contains('show'), 'result screen shown after win');
      ok(document.querySelectorAll('#rBody .bwd:not(.plain)').length === B.total, 'result shows the boss sentence colour-coded');
      ok(document.querySelectorAll('#rBody li.ans .why').length === G.fixed.length + G.rescued.length && document.querySelectorAll('#rBody .bjob').length > 0,
         `debrief explains all ${G.fixed.length + G.rescued.length} sentences and what each boss word does`);
      ok(Store.d.unlocked >= 2 && (Store.d.stars[0] || 0) >= 1, `level 2 unlocked, stars=${Store.d.stars[0]}`);
      const ls = Store.d.sessions[Store.d.sessions.length - 1];
      ok(ls && ls.result === 'win', `session logged (accuracy ${ls && ls.accuracy}%)`);
      const funBtn = document.querySelector('.seg[data-q="fun"] button');
      funBtn && funBtn.click();
      ok(Store.d.sessions[Store.d.sessions.length - 1].fun === 1, 'survey answer saved to session');
      ok(!/\p{Extended_Pictographic}/u.test(document.querySelector('#rBody').innerText), 'result screen has no emoji');

      /* ---- 3. final boss: all 8 stages ---- */
      startLevel(9); G.phase = 'wave'; G.spawned = G.resolved = G.L.count;
      runUntil(() => G.phase === 'boss', 400);
      const FB = G.boss;
      runUntil(() => G.phase !== 'boss', 2000, TEST_SOLVE);
      ok(G.phase === 'bossDead' && new Set(G.bossWords.filter(b => b.pos).map(b => b.pos)).size === 8, `final boss: ${FB.stages.length} stages cleared, ${FB.total} words found`);

      /* ---- 4. lose run: level 2, player never shoots ---- */
      startLevel(1);
      f = runUntil(() => G.phase === 'over', 60000);
      ok(G.phase === 'over' && G.hp === 0, `idle player is overrun after ${(f/60).toFixed(0)}s (bitten ${G.reached.length})`);
      await wait(1300);
      ok(document.querySelector('#result').classList.contains('show'), 'result screen shown after loss');
      ok(document.querySelectorAll('#rBody li.ans .why').length >= G.reached.length + G.lost.length && document.querySelector('#rBody .seen'),
         `loss debrief explains every mistake (${G.reached.length} bitten, ${G.lost.length} survivors lost) and marks what you saw`);

      /* ---- 5. review mode from the notebook ---- */
      LEVELS[0].items.slice(0,3).forEach(e => Store.nbMistake(parseMarked(e.t).plain, e.w, 0));
      ok(startReview(), `review starts with ${Store.nbList().length} notebook sentences`);
      runUntil(() => G.phase === 'over', 40000, TEST_SHOOT(14));
      ok(G.phase === 'over', `review finished (accuracy ${G.decisions ? Math.round(G.good/G.decisions*100) : 0}%, mastered ${G.mastered})`);
      await wait(900);

      /* ---- 5b. stats tab: every player's play data, scores by level ---- */
      const realSessions = Store.d.sessions;
      const sess = (player, mode, level, score, result, correct, k) => ({ time:new Date(Date.now()+k*1000).toISOString(), player, mode, level,
        topic:'', result, score, stars:result==='win' ? 2 : 0, accuracy:0, decisions:10, correct, durationSec:60 });
      Store.d.sessions = [sess('Mint','level',1,1500,'win',8,1), sess('Mint','level',2,900,'lose',5,2), sess('mint ','survival','survival',6000,'gameover',7,3),
                          sess('Ben','level',1,2100,'win',9,4), sess('','level',1,300,'lose',2,5)];
      UI.statsPlayer = null; UI.tab = 'stats'; UI.renderMenu();
      const stT = () => document.querySelectorAll('#stBody table.stt'), stRows = i => stT()[i].querySelectorAll('tbody tr');
      const kpiLabels = [...document.querySelectorAll('#stBody .kpi .label')].map(x => x.textContent).join(' | ');
      ok(stRows(0).length===3 && stRows(1).length===3 && stRows(0)[0].querySelector('.sc').textContent==='2,100'
         && stRows(0)[0].querySelector('.by').textContent==='Ben' && !/fun|difficulty/i.test(kpiLabels),
         `stats: scores by level (levels 1, 2 + survival) and every player (Mint, Ben, no name); boxes: ${kpiLabels}`);
      stT()[1].querySelector('tr[data-k="mint"]').click();
      ok(UI.statsPlayer==='mint' && stRows(0).length===3 && document.querySelector('#stPlayer').value==='k:mint'
         && document.querySelector('#stBody .kpi b').textContent==='3' && !document.querySelector('#stBody .by'),
         'stats: clicking a player shows only their data');
      stT()[1].querySelector('tr[data-k=""]').click();
      ok(UI.statsPlayer==='' && stRows(0).length===1 && document.querySelector('#stBody .kpi b').textContent==='1',
         'stats: games without a player name are grouped as "(no name)"');
      UI.statsPlayer = null; Store.d.sessions = realSessions;

      /* ---- 6. menus, guide, language switch, pause ---- */
      UI.menu();
      ['board', 'guide', 'notebook', 'stats', 'settings', 'play'].forEach(tab => { UI.tab = tab; UI.renderMenu(); });
      ok(document.querySelectorAll('#guideBody .gcard').length === 8, 'guide shows the 8 parts of speech');
      ok(document.querySelectorAll('#levels .lvl').length === LEVELS.length, `level grid renders ${LEVELS.length} levels`);
      Store.d.settings.lang = 'th'; UI.applyLang();
      ok(document.querySelector('[data-i18n="tabPlay"]').textContent === 'เล่น', 'Thai language applies');
      const thGaps = [];
      LEVELS.forEach((L, li) => {
        UI.briefing(li);
        const b = document.querySelector('#brBody'), n = s => b.querySelectorAll(s).length;
        if(n('.rlist > li') !== n('.rlist p.gloss') || n('.rlist > li') !== n('.rlist p.extr')
           || n('.gw > span') !== n('.gw small') || !b.querySelector('p.def + p.gloss')) thGaps.push(li+1);
      });
      ok(!thGaps.length, 'Thai mode: every English line, example sentence and example word has a Thai translation'
         + (thGaps.length ? ' (missing in levels ' + thGaps.join(', ') + ')' : ''));
      UI.menu();
      Store.d.settings.lang = 'en'; UI.applyLang();
      UI.briefing(4);
      ok(document.querySelector('#briefing').classList.contains('show') && document.querySelector('#brBody mark'), 'briefing opens with highlighted examples');
      startLevel(4); step(); UI.pause(true);
      ok(G.paused && document.querySelector('#pause').classList.contains('show'), 'pause works');
      UI.pause(false); UI.menu();

      /* ---- 7. no emoji anywhere (icons are SVG) ---- */
      const EMOJI = /\p{Extended_Pictographic}/u;
      const strHits = Object.values(STR).flatMap(o => Object.values(o)).filter(s => EMOJI.test(s));
      ok(!strHits.length, 'no emoji in UI text (EN + TH)' + (strHits.length ? ': ' + strHits.join(' | ') : ''));
      ok(!EMOJI.test(JSON.stringify(LEVELS)), 'no emoji in level content');
      const screens = [];
      ['en','th'].forEach(lang => {
        Store.d.settings.lang = lang; UI.applyLang();
        ['play','board','guide','notebook','stats','settings'].forEach(tab => { UI.tab = tab; UI.renderMenu(); screens.push(document.body.innerText); });
        UI.briefing(9); screens.push(document.body.innerText); UI.menu();
        UI.survivalBrief(); screens.push(document.body.innerText); UI.menu();
      });
      Store.d.settings.lang = 'en'; UI.tab = 'play'; UI.applyLang();
      ok(!screens.some(t => EMOJI.test(t)), `no emoji on ${screens.length} rendered screens`);
    }catch(err){
      fails.push('FAIL exception: ' + err.message + '\n' + err.stack);
    }finally{
      Store.d = JSON.parse(backup); Store.save();
    }
    const pre = document.createElement('pre');
    pre.id = 'selftest-out';
    pre.textContent = (fails.length ? 'SELFTEST FAIL' : 'SELFTEST PASS') + '\n' + fails.concat(out).join('\n');
    document.body.appendChild(pre);
    document.title = fails.length ? 'SELFTEST FAIL' : 'SELFTEST PASS';
  })();
}
