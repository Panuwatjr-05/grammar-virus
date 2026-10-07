/* =========================================================
   UI: menu tabs, briefing, guide, HUD, boss word dock, speaking panel,
   results + survey, notebook, stats, settings, input, main loop
   ========================================================= */
const $ = s => document.querySelector(s);
const isTH = () => Store.d.settings.lang==='th';
const pad2 = n => String(n).padStart(2,'0');
const ic = (name, cls='') => `<svg class="i ${cls}"><use href="#i-${name}"/></svg>`;
const starsHTML = n => [0,1,2].map(k => ic('star', k<n ? '' : 'off')).join('');
const sayBtn = text => `<button class="say" data-say="${esc(text)}" title="${esc(T('listen'))}">${ic('volume')}</button>`;
const sayButtons = root => root.querySelectorAll('[data-say]').forEach(b => b.onclick = () => Voice.speak(b.dataset.say, true));
// the two controls: mouse buttons, or the trigger buttons on a touch screen
const ctlStrip = () => { const [k, c] = isTouch() ? ['target','heart'] : ['mouse-l','mouse-r'];
  return `<span class="ctl kill">${ic(k)}${esc(TT('ctlKill'))}</span><span class="ctl cure">${ic(c)}${esc(TT('ctlCure'))}</span>`; };
const pageHead = (kicker, title, desc, side='') =>
  `<div class="page-head"><div><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${desc ? `<p>${esc(desc)}</p>` : ''}</div>${side}</div>`;

/* ---------- teaching blocks (briefing, guide, debrief) ----------
   English first; in Thai mode the Thai translation sits right under every English line,
   and every example word / sentence gets its Thai meaning. English mode stays English-only. */
const tr = o => o ? (isTH() && o.th ? o.th : o.en) : '';
// the browser's Thai line breaking can split grammar terms ("ก|ริยาวิเศษณ์"), so keep them whole
const TH_TERMS = new RegExp(['คำกริยาวิเศษณ์','กริยาวิเศษณ์','คำคุณศัพท์','คุณศัพท์','คำสรรพนาม','สรรพนาม','คำบุพบท','บุพบท',
  'คำสันธาน','สันธาน','คำอุทาน','คำนาม','คำกริยา','กริยาช่อง','ความคิด','ความรู้สึก','ผู้ถูกกระทำ','ตัวพิมพ์ใหญ่','ประโยค'].join('|'), 'g');
const thHTML = s => esc(s).replace(TH_TERMS, m => `<span class="nw">${m}</span>`);
const gloss = th => isTH() && th ? `<p class="gloss">${thHTML(th)}</p>` : '';
const thSmall = th => isTH() && th ? `<small>${esc(th)}</small>` : '';
const sayText = s => parseMarked(s).plain.replace(/\s·\s/g, ', ').replace(/\s→\s/g, ', ');
const qPill = L => `<span class="qpill">${ic('search')}${esc(L.q.en)}${isTH() ? ' · ' + esc(L.q.th) : ''}</span>`;
const defHTML = L => `<p class="def">${esc(L.def.en)}</p>${gloss(L.def.th)}`;
function groupsHTML(L){
  return `<div class="groups">${L.groups.map(g => {
    const c = g.pos ? POS[g.pos].color : L.pos ? POS[L.pos].color : 'var(--acid)';
    const name = g.pos ? posName(g.pos) : g.en, sub = g.pos ? tr(g) : (isTH() ? g.th : '');
    const meaning = (g.wordsTh || '').split(' · ');
    return `<div class="grp" style="--c:${c}"><span class="gl">${esc(name)}${sub ? `<em>${esc(sub)}</em>` : ''}</span>
      <span class="gw">${g.words.split(' · ').map((w,k) => `<span>${esc(w)}${thSmall(meaning[k])}</span>`).join('')}</span></div>`;
  }).join('')}</div>`;
}
function rulesHTML(L, compact=false){
  return `<ol class="rlist${compact ? ' compact' : ''}">${L.rules.map((r,i) => `
    <li><span class="rn">${i+1}</span><div><b>${esc(r.en)}</b>${gloss(r.th)}
      <div class="rx"><span class="ok">${ic('check')}<span>${markedHTML(r.ok,'ok')}</span>${compact ? '' : sayBtn(sayText(r.ok))}</span>
      ${r.bad && !compact ? `<span class="bad">${ic('x')}<span>${markedHTML(r.bad,'mv')}</span></span>` : ''}</div>
      ${isTH() && r.okTh ? `<p class="extr">= ${thHTML(r.okTh)}</p>` : ''}</div></li>`).join('')}</ol>`;
}
function cluesHTML(L){
  return `<div class="clues">${L.clues.map(c => {
    const col = c.pos ? POS[c.pos].color : L.pos ? POS[L.pos].color : 'var(--acid)';
    const left = c.pos ? posName(c.pos) : c.s;
    return `<span class="clue" style="--c:${col}"><b>${esc(left)}${thSmall(c.sTh)}</b>${ic('arrow-r')}<span>${esc(c.en)}${thSmall(c.exTh)}</span></span>`;
  }).join('')}</div><p class="cnote">${thHTML(tr(L.clueNote))}</p>`;
}
const watchHTML = L => `<div class="watch">${ic('alert')}<div><b>${esc(T('watchOut'))}</b><p>${thHTML(tr(L.tip))}</p></div></div>`;

/* ---------- answer key (results + notebook) ---------- */
// x = { w: broken sentence, r: correct sentence (both with [ ] marks), pos }
// seen = which of the two the player actually saw ('bad' / 'ok'); that line comes first and is tagged
function answerCard(x, seen, extra=''){
  const plain = parseMarked(x.r).plain, a = ANSWERS[plain] || {};
  const tag = `<span class="seen">${esc(T('youSaw'))}</span>`;
  const ok = `<div class="line ok">${ic('check')}<span>${markedHTML(x.r,'ok')}</span>${seen==='ok' ? tag : ''}${x.pos ? posChip(x.pos) : ''}${sayBtn(plain)}</div>`
           + (isTH() && a.tt ? `<p class="extr">= ${thHTML(a.tt)}</p>` : '');
  const bad = x.w ? `<div class="line bad">${ic('x')}<span>${markedHTML(x.w,'mv')}</span>${seen==='bad' ? tag : ''}</div>` : '';
  const why = a.en ? `<div class="why">${ic('bulb')}<div><b>${esc(T('whyLbl'))}</b> ${esc(a.en)}${gloss(a.th)}</div></div>` : '';
  return `<li class="ans">${seen==='ok' ? ok + bad : bad + ok}${why}${extra}</li>`;
}
function bossWordHTML(b){
  const [, core, tail] = b.w.match(/^(.*?)([.,!?]*)$/);   // punctuation stays uncoloured
  return b.pos ? `<span class="bwd" style="--c:${POS[b.pos].color}"><span>${esc(core)}<span class="pp">${esc(tail)}</span></span><small>${esc(POS[b.pos].en)}</small></span>`
               : `<span class="bwd plain">${esc(b.w)}<small>&nbsp;</small></span>`;
}
// the boss sentence with every target word coloured, its translation, and the job of each part of speech
function bossHTML(s){
  const byPos = {};
  s.bossWords.forEach(b => { if(b.pos) (byPos[b.pos] = byPos[b.pos] || []).push(b.w.replace(/[.,!?]+$/,'')); });
  const jobs = CAT_ORDER.filter(p => byPos[p]).map(p => `<div class="bjob" style="--c:${POS[p].color}">
      <span class="bjw">${esc(byPos[p].join(' · '))}</span>${ic('arrow-r')}
      <span><b>${esc(posName(p))}</b> ${esc(POS_JOB[p].en)}${isTH() ? `<span class="thx"> · ${thHTML(POS_JOB[p].th)}</span>` : ''}</span></div>`).join('');
  return `<div class="bossbox"><div class="bossline">${s.bossWords.map(bossWordHTML).join('')}${sayBtn(s.bossText)}</div>
    ${isTH() && s.bossTh ? `<p class="extr">= ${thHTML(s.bossTh)}</p>` : ''}
    <div class="label bjl">${esc(T('bossJobs'))}</div><div class="bjobs">${jobs}</div></div>`;
}

/* ---------- survival leaderboard ---------- */
const fmtNum = n => Number(n||0).toLocaleString('en-US');
const fmtTime = s => { const t = Math.round(s||0); return `${Math.floor(t/60)}:${pad2(t%60)}`; };
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(isTH() ? 'th-TH' : 'en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); };
const rankHTML = n => `<span class="rk${n <= 3 ? ' r'+n : ''}">${n}</span>`;
const accOf = p => p.decisions ? Math.round(p.good/p.decisions*100) : 0;
// the top players as a short list (play-tab card, survival briefing)
const miniTop = P => P.length
  ? `<ol class="mini">${P.map((p,i) => `<li>${rankHTML(i+1)}<span class="pn">${esc(p.name)}</span><span class="mw">${esc(T('svWave', p.best.wave))}</span><b>${fmtNum(p.best.score)}</b></li>`).join('')}</ol>`
  : `<p class="muted">${esc(T('svNoRecord'))}</p>`;
// one row per player (their best run + totals); me = name key to highlight; past `limit` rows only your own row is added
function playersTable(players, me, limit=Infinity){
  const rows = players.map((p,i) => ({ p, rank:i+1 })).filter(x => x.rank <= limit || x.p.key===me);
  return `<div class="tbl"><table class="board"><thead><tr><th class="rkc">#</th><th>${esc(T('bdPlayer'))}</th>
      <th class="num">${esc(T('bdBest'))}</th><th class="num">${esc(T('bdWave'))}</th><th class="num opt">${esc(T('bdTime'))}</th>
      <th class="num opt">${esc(T('bdAcc'))}</th><th class="num opt">${esc(T('bdRunsN'))}</th></tr></thead><tbody>${rows.map(({ p, rank }) => `
      <tr class="${p.key===me ? 'me' : ''}${rank > limit ? ' gap' : ''}"><td class="rkc">${rankHTML(rank)}</td>
        <td class="pn">${esc(p.name)}${p.key===me ? `<span class="you">${esc(T('bdYou'))}</span>` : ''}</td>
        <td class="num sc">${fmtNum(p.best.score)}</td><td class="num">${p.best.wave}</td><td class="num opt">${fmtTime(p.best.time)}</td>
        <td class="num opt">${accOf(p)}%</td><td class="num opt">${p.runs}</td></tr>`).join('')}</tbody></table></div>`;
}
// every run, best first
function runsTable(runs, me){
  return `<div class="tbl"><table class="board"><thead><tr><th class="rkc">#</th><th>${esc(T('bdPlayer'))}</th>
      <th class="num">${esc(T('bdScore'))}</th><th class="num">${esc(T('bdWave'))}</th><th class="num opt">${esc(T('bdTime'))}</th>
      <th class="num opt">${esc(T('bdAcc'))}</th><th class="num opt">${esc(T('bdCombo'))}</th><th class="opt">${esc(T('bdDate'))}</th></tr></thead><tbody>${runs.map((r,i) => `
      <tr class="${Store.nameKey(r.name)===me ? 'me' : ''}"><td class="rkc">${rankHTML(i+1)}</td><td class="pn">${esc(r.name)}</td>
        <td class="num sc">${fmtNum(r.score)}</td><td class="num">${r.wave}</td><td class="num opt">${fmtTime(r.time)}</td>
        <td class="num opt">${r.acc}%</td><td class="num opt">×${r.combo}</td><td class="opt dt">${esc(fmtDate(r.date))}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- stats tab: the play data of every player ---------- */
const nameOf = n => String(n||'').trim() || T('stNoName');
const accPct = (c, d) => d ? Math.round(c/d*100) : 0;
const sumOf = (S, k) => S.reduce((a,s) => a + (+s[k]||0), 0);
const fmtDur = s => { const t = Math.round(s||0), h = Math.floor(t/3600); return h ? `${h}:${pad2(Math.floor(t%3600/60))}:${pad2(t%60)}` : fmtTime(t); };
// one entry per player (names match ignoring case and spaces), most points first
function statsPlayers(S){
  const m = new Map();
  S.forEach(s => {
    const k = Store.nameKey(s.player);
    let p = m.get(k);
    if(!p){ p = { key:k, name:nameOf(s.player), n:0, cor:0, dec:0, score:0, time:0, sv:0, won:new Set(), last:'' }; m.set(k, p); }
    p.n++; p.cor += +s.correct||0; p.dec += +s.decisions||0; p.score += +s.score||0; p.time += +s.durationSec||0;
    if(s.mode==='survival') p.sv = Math.max(p.sv, +s.score||0);
    if(s.mode==='level' && s.result==='win') p.won.add(+s.level);
    if(String(s.time) > p.last){ p.last = String(s.time); p.name = nameOf(s.player); }
  });
  return [...m.values()].sort((a,b) => b.score-a.score || b.n-a.n);
}
// one row per level that has been played, then survival and review
function levelRows(S){
  const rows = [];
  const add = (list, o) => {
    if(!list.length) return;
    rows.push(Object.assign(o, { n:list.length, won:list.filter(s => s.result==='win').length,
      best:list.reduce((a,s) => (+s.score||0) > (+a.score||0) ? s : a), avg:sumOf(list,'score')/list.length,
      acc:accPct(sumOf(list,'correct'), sumOf(list,'decisions')), stars:list.reduce((a,s) => Math.max(a, +s.stars||0), 0) }));
  };
  LEVELS.forEach((L,i) => add(S.filter(s => s.mode==='level' && +s.level===i+1),
    { tag:pad2(lvNo(i)), label:L.topic, sub:L.pos ? POS[L.pos].th : L.th, color:L.pos ? POS[L.pos].color : 'var(--acid)', level:true }));
  add(S.filter(s => s.mode==='survival'), { tag:ic('flame'), label:T('svKicker'), color:'var(--warn)' });
  add(S.filter(s => s.mode==='review'), { tag:ic('notebook'), label:T('review'), color:'var(--acid)' });
  return rows;
}
// scores by level; showBy = also name who got the best score (everyone's view)
function levelTable(rows, showBy){
  return `<div class="tbl"><table class="board stt"><thead><tr><th>${esc(T('stLevel'))}</th><th class="num">${esc(T('stPlayed'))}</th>
      <th class="num opt">${esc(T('stCleared'))}</th><th class="num">${esc(T('stBest'))}</th><th class="num opt">${esc(T('stAvg'))}</th>
      <th>${esc(T('stAcc'))}</th><th class="opt">${esc(T('stStars'))}</th></tr></thead><tbody>${rows.map(r => `
      <tr><td><div class="lvc" style="--c:${r.color}"><b>${r.tag}</b><span>${esc(r.label)}${isTH() && r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></div></td>
        <td class="num">${r.n}</td><td class="num opt">${r.level ? r.won : '–'}</td>
        <td class="num"><span class="sc">${fmtNum(r.best.score)}</span>${showBy ? `<small class="by">${esc(nameOf(r.best.player))}</small>` : ''}</td>
        <td class="num opt">${fmtNum(Math.round(r.avg))}</td>
        <td><span class="accbar" style="--c:${r.color}"><i style="width:${r.acc}%"></i></span><b class="accv">${r.acc}%</b></td>
        <td class="opt">${r.level ? `<span class="lvl-stars">${starsHTML(r.stars)}</span>` : '–'}</td></tr>`).join('')}</tbody></table></div>`;
}
// every player; click a row to see only that player's data (sel = their name key)
function playerTable(players, sel){
  return `<div class="tbl"><table class="board stt"><thead><tr><th class="rkc">#</th><th>${esc(T('bdPlayer'))}</th>
      <th class="num opt">${esc(T('stSessions'))}</th><th class="num">${esc(T('stLvCleared'))}</th><th class="num">${esc(T('stAcc'))}</th>
      <th class="num">${esc(T('stTotal'))}</th><th class="num opt">${esc(T('stSvBest'))}</th><th class="num opt">${esc(T('stTime'))}</th>
      <th class="opt">${esc(T('stLast'))}</th></tr></thead><tbody>${players.map((p,i) => `
      <tr class="pick${p.key===sel ? ' me' : ''}" data-k="${esc(p.key)}"><td class="rkc">${rankHTML(i+1)}</td><td class="pn">${esc(p.name)}</td>
        <td class="num opt">${p.n}</td><td class="num">${p.won.size} / ${LEVELS.length}</td><td class="num">${accPct(p.cor, p.dec)}%</td>
        <td class="num sc">${fmtNum(p.score)}</td><td class="num opt">${p.sv ? fmtNum(p.sv) : '–'}</td>
        <td class="num opt">${fmtDur(p.time)}</td><td class="opt dt">${esc(fmtDate(p.last))}</td></tr>`).join('')}</tbody></table></div>`;
}

const uName = u => { const x = UNITS.find(x => x.key===u); return x ? (isTH() ? x.th : x.en) : ''; };

const UI = {
  tab:'play', boardView:'players', unit:'pos', guideUnit:'pos',
  statsPlayer:null,          // stats tab: name key of the player being shown, null = everyone
  init(){
    document.querySelectorAll('.tab').forEach(b => b.onclick = () => { this.tab = b.dataset.tab; this.renderMenu(); });
    document.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { Store.d.settings.lang = b.dataset.lang; Store.save(); this.applyLang(); });
    const pn = $('#playerName');
    pn.value = Store.d.player || '';
    pn.oninput = () => { Store.d.player = pn.value.trim().slice(0,40); Store.save(); };
    $('#btnPause').onclick = e => { e.currentTarget.blur(); this.pause(true); };
    $('#btnResume').onclick = () => this.pause(false);
    $('#btnQuit').onclick = () => {
      // survival: quitting ends the run and still saves it on the leaderboard (once something has happened)
      if(G && G.mode==='survival' && G.decisions > 0){ this.pause(false); endGame(false); }
      else this.menu();
    };
    $('#btnVoice').onclick = e => { e.currentTarget.blur(); Store.d.settings.voice = !Store.d.settings.voice; Voice.enabled = Store.d.settings.voice; Store.save(); this.hud(); };
    $('#slowBtn').onclick = e => { e.currentTarget.blur(); useSlowmo(); };
    // touch screens: the two gun legends are the triggers (left = kill rifle, right = rescue rifle)
    document.querySelectorAll('.gunbtn').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault(); setTouch(); fireTouch(b.dataset.gun);
      b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120);
    }));
    if(matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');     // phones / tablets
    Voice.enabled = Store.d.settings.voice;
    this.applyLang();
  },
  applyLang(){
    const lang = Store.d.settings.lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = TT(el.dataset.i18n));
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = T(el.dataset.i18nPh); el.setAttribute('aria-label', T('playerLabel')); });
    document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.dataset.lang===lang));
    this.renderMenu();
    if(G) this.hud();
  },
  show(id){ document.querySelectorAll('.overlay').forEach(o => o.classList.toggle('show', o.id===id)); },
  menu(){
    G = null; Voice.stop();
    document.body.classList.remove('ingame','paused','boss');
    this.hideTiles(); this.show('menu'); this.renderMenu();
  },
  renderMenu(){
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab===this.tab));
    document.querySelectorAll('.pane').forEach(p => p.hidden = p.id !== 'pane-'+this.tab);
    $('#nbCount').textContent = Object.keys(Store.d.notebook).length || '';
    ({ play:()=>this.renderLevels(), board:()=>this.renderBoard(), guide:()=>this.renderGuide(), notebook:()=>this.renderNotebook(),
       stats:()=>this.renderStats(), settings:()=>this.renderSettings() })[this.tab]();
  },

  /* ---------- play tab ---------- */
  renderLevels(){
    // lesson switch: Parts of Speech | Tenses (each lesson unlocks on its own)
    const u = this.unit, ids = unitLevels(u), seg = $('#unitSeg'), box = $('#levels'); box.innerHTML = '';
    seg.innerHTML = UNITS.map(x => `<button data-u="${x.key}" class="${x.key===u ? 'on' : ''}">${esc(uName(x.key))}</button>`).join('');
    seg.querySelectorAll('button').forEach(b => b.onclick = () => { this.unit = b.dataset.u; this.renderLevels(); });
    const open = ids.filter(isUnlocked), next = open.find(i => !Store.d.stars[i]) ?? open[open.length-1];
    let total = 0;
    ids.forEach(i => {
      const L = LEVELS[i], st = Store.d.stars[i] || 0, locked = !isUnlocked(i);
      total += st;
      const b = document.createElement('button');
      b.className = 'lvl' + (i===next && !st ? ' next' : '');
      b.disabled = locked;
      b.style.setProperty('--c', L.pos ? POS[L.pos].color : 'var(--acid)');
      b.innerHTML = `<span class="lvl-no">${pad2(lvNo(i))}</span>
        <span><span class="lvl-name">${esc(L.topic)}</span><span class="lvl-sub">${esc(L.pos ? POS[L.pos].th : L.th)}</span></span>
        ${locked ? `<span class="lvl-lock">${ic('lock')}</span>` : `<span class="lvl-stars">${starsHTML(st)}</span>`}
        <span class="lvl-bar">${L.chips.map(p => `<i style="background:${POS[p].color}"></i>`).join('')}</span>`;
      b.onclick = () => { audio(); this.briefing(i); };
      box.appendChild(b);
    });
    $('#starsTotal').textContent = T('starsTotal', total, ids.length*3);
    $('#playBtn span').textContent = T('playLevel', lvNo(next));
    $('#playBtn').onclick = () => { audio(); this.briefing(next); };
    const n = Object.keys(Store.d.notebook).length, rb = $('#reviewBtn');
    rb.querySelector('span').textContent = T('reviewN', n);
    rb.disabled = n < 3; rb.title = n < 3 ? T('nbNeed') : '';
    rb.onclick = () => { audio(); startReview(); };
    this.renderSurvivalCard();
  },
  renderSurvivalCard(){
    $('#svCard').innerHTML = `
      <div class="sv-main"><div class="kicker">${ic('flame')}${esc(T('svKicker'))}</div>
        <h3>${esc(T('svTitle'))}</h3><p>${esc(T('svDesc'))}</p></div>
      <div class="sv-top"><span class="label">${esc(T('svTop'))}</span>${miniTop(Store.boardPlayers().slice(0, 3))}</div>
      <div class="sv-cta">
        <button class="btn warn" id="svPlay">${ic('play')}<span>${esc(T('svPlay'))}</span></button>
        <button class="btn ghost" id="svBoard">${ic('trophy')}<span>${esc(T('tabBoard'))}</span></button>
      </div>
      <span class="lvl-bar">${CAT_ORDER.map(p => `<i style="background:${POS[p].color}"></i>`).join('')}</span>`;
    $('#svPlay').onclick = () => { audio(); this.survivalBrief(); };
    $('#svBoard').onclick = () => { this.tab = 'board'; this.renderMenu(); };
  },
  // survival briefing: what each part of speech does, the rules, who to beat, and the player's name (needed for the leaderboard)
  survivalBrief(newPlayer=false){
    const th = isTH();
    const ref = CAT_ORDER.map(p => `<div class="pref">${posChip(p)}<span class="pj">${esc(POS_JOB[p].en)}${th ? `<small>${thHTML(POS_JOB[p].th)}</small>` : ''}</span></div>`).join('');
    const rules = ['svRule1','svRule2','svRuleHeal','svRule3','svRule4','svRule5','svRule6']
      .map((k,i) => `<li><span class="rn">${i+1}</span><div><b>${esc(T(k))}</b></div></li>`).join('');
    $('#brBody').innerHTML = `
      <div class="brief-head">
        <div><div class="kicker sv">${esc(T('svBriefKicker'))}</div><h2>${esc(T('svTitle'))}</h2>
          <div class="qline"><span class="qpill warn">${ic('clock')}${esc(T('svQ'))}</span></div></div>
        <div class="chips">${CAT_ORDER.map(p => posChip(p)).join('')}</div>
      </div>
      <div class="bcols sv">
        <div class="bsec"><span class="label">${esc(T('svRef'))}</span><div class="prefs">${ref}</div></div>
        <div>
          <div class="bsec"><span class="label">${esc(T('svRulesLbl'))}</span><ol class="rlist compact">${rules}</ol></div>
          <div class="bsec"><span class="label">${esc(T('svTop'))}</span>${miniTop(Store.boardPlayers().slice(0, 5))}</div>
        </div>
      </div>
      <div class="brief-foot">
        <div class="mission">
          ${ctlStrip()}<span>${ic('flame')}${esc(T('svEndless'))}</span><span class="heal">${ic('heart')}${esc(T('svHealShort'))}</span>
          <span>${ic('skull')}${esc(T('svBossEvery'))}</span>
        </div>
        <div class="row">
          <label class="field" id="svField">${ic('user')}<input id="svName" maxlength="40" placeholder="${esc(T('svName'))}" aria-label="${esc(T('svName'))}"></label>
          <button class="btn warn" id="brStart">${ic('play')}<span>${esc(T('svStart'))}</span></button>
          <button class="btn ghost" id="brBack">${ic('arrow-l')}<span>${esc(T('back'))}</span></button>
        </div>
        <p class="svneed" id="svNeed"></p>
      </div>`;
    const inp = $('#svName'), field = $('#svField');
    inp.value = newPlayer ? '' : Store.d.player || '';
    inp.oninput = () => { field.classList.remove('need'); $('#svNeed').textContent = ''; };
    const go = () => {
      const name = inp.value.trim().slice(0, 40);
      if(!name){
        field.classList.remove('need'); void field.offsetWidth; field.classList.add('need');
        $('#svNeed').textContent = T('svNeedName'); inp.focus(); return;
      }
      Store.d.player = name; Store.save(); $('#playerName').value = name;
      startSurvival();
    };
    inp.onkeydown = e => { if(e.key==='Enter') go(); };
    $('#brStart').onclick = () => { audio(); go(); };
    $('#brBack').onclick = () => this.menu();
    this.show('briefing');
    if(!inp.value) setTimeout(() => inp.focus(), 60);
  },
  briefing(i){
    const L = LEVELS[i], th = isTH();
    this.unit = L.unit;
    const boss = L.chips.length===1 ? T('missionBoss', posName(L.chips[0], true)) : T('missionMixed', L.chips.length);
    $('#brBody').innerHTML = `
      <div class="brief-head">
        <div><div class="kicker">${esc(uName(L.unit) + ' · ' + T('briefKicker', pad2(lvNo(i))))}</div><h2>${esc(L.topic)}</h2>${th ? `<div class="th">${esc(L.th)}</div>` : ''}
          <div class="qline">${qPill(L)}</div></div>
        <div class="chips">${L.chips.map(p => posChip(p)).join('')}</div>
      </div>
      <div class="bcols">
        <div>
          <div class="bsec"><span class="label">${esc(T('whatIs'))}</span>${defHTML(L)}</div>
          <div class="bsec"><span class="label">${esc(T('examples'))}</span>${groupsHTML(L)}</div>
          <div class="bsec"><span class="label">${esc(T('clue'))}</span>${cluesHTML(L)}</div>
        </div>
        <div>
          <div class="bsec"><span class="label">${esc(T('ruleLbl'))}</span>${rulesHTML(L)}</div>
          ${watchHTML(L)}
        </div>
      </div>
      <div class="brief-foot">
        <div class="mission">
          ${ctlStrip()}<span>${ic('virus')}${esc(T('missionZ', L.count))}</span><span>${ic('skull')}${esc(boss)}</span>
        </div>
        <div class="row">
          <button class="btn" id="brStart">${ic('play')}<span>${esc(T('start'))}</span></button>
          <button class="btn ghost" id="brBack">${ic('arrow-l')}<span>${esc(T('back'))}</span></button>
        </div>
      </div>`;
    sayButtons($('#brBody'));
    $('#brStart').onclick = () => startLevel(i);
    $('#brBack').onclick = () => this.menu();
    this.show('briefing');
  },

  /* ---------- guide tab: the 8 parts of speech ---------- */
  renderGuide(){
    const u = this.guideUnit;
    const seg = `<div class="seg" id="guideSeg">${UNITS.map(x => `<button data-u="${x.key}" class="${x.key===u ? 'on' : ''}">${esc(uName(x.key))}</button>`).join('')}</div>`;
    const cards = unitLevels(u).map(i => LEVELS[i]).filter(L => L.pos).map(L => `
      <div class="gcard" style="--c:${POS[L.pos].color}">
        <div class="gh"><b>${esc(L.topic)}</b><span>${esc(POS[L.pos].th)}</span>${qPill(L)}</div>
        ${defHTML(L)}${groupsHTML(L)}${rulesHTML(L, true)}${cluesHTML(L)}
      </div>`).join('');
    const wf = u==='pos' ? LEVELS.find(L => L.unit==='pos' && !L.pos && L.chips.length===4) : null;
    const el = $('#guideBody');
    el.innerHTML = pageHead(T('tabGuide'), T(u==='tense' ? 'guideTitleTense' : 'guideTitle'), T(u==='tense' ? 'guideDescTense' : 'guideDesc'), seg) + `<div class="guide">${cards}</div>
      ${wf ? `<div class="forms"><div class="label">${esc(T('guideForms'))}</div>${groupsHTML(wf)}${cluesHTML(wf)}</div>` : ''}`;
    sayButtons(el);
    el.querySelectorAll('#guideSeg button').forEach(b => b.onclick = () => { this.guideUnit = b.dataset.u; this.renderGuide(); });
  },

  /* ---------- leaderboard tab: survival rankings, kept on this computer ---------- */
  renderBoard(){
    const el = $('#boardBody'), runs = Store.boardRuns(), players = Store.boardPlayers();
    const me = Store.d.player ? Store.nameKey(Store.d.player) : null;
    const side = `<div class="row" style="margin:0">
      <button class="btn warn" id="bdPlay">${ic('play')}<span>${esc(T('svPlay'))}</span></button>
      <button class="btn danger" id="bdClear" ${runs.length ? '' : 'disabled'}>${ic('trash')}<span>${esc(T('bdClear'))}</span></button></div>`;
    let h = pageHead(T('tabBoard'), T('bdTitle'), T('bdDesc'), side);
    if(!runs.length) h += `<p class="empty">${esc(T('bdEmpty'))}</p>`;
    else{
      const most = k => runs.reduce((a,r) => r[k] > a[k] ? r : a), top = runs[0], far = most('wave'), long = most('time');
      const kpi = (k, v, sub) => `<div class="kpi"><span class="label">${esc(T(k))}</span><b>${v}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
      h += `<div class="kpis">${kpi('bdKTop', fmtNum(top.score), T('bdBy', top.name))}${kpi('bdKWave', far.wave, T('bdBy', far.name))}
          ${kpi('bdKLong', fmtTime(long.time), T('bdBy', long.name))}${kpi('bdKPlayers', players.length)}${kpi('bdKRuns', runs.length)}</div>
        <div class="bd-view"><div class="seg" id="bdView">${['players','runs'].map(v =>
          `<button data-v="${v}" class="${this.boardView===v ? 'on' : ''}">${esc(T(v==='players' ? 'bdPlayers' : 'bdRuns'))}</button>`).join('')}</div></div>
        ${this.boardView==='players' ? playersTable(players, me) : runsTable(runs.slice(0, 100), me)}`;
    }
    el.innerHTML = h;
    $('#bdPlay').onclick = () => { audio(); this.survivalBrief(); };
    $('#bdClear').onclick = () => { if(confirm(T('bdConfirm'))){ Store.clearBoard(); this.renderBoard(); } };
    el.querySelectorAll('#bdView button').forEach(b => b.onclick = () => { this.boardView = b.dataset.v; this.renderBoard(); });
  },

  /* ---------- in-game ---------- */
  enterGame(){
    this.show(null); this.hideTiles();
    document.body.classList.add('ingame'); document.body.classList.remove('paused','boss');
    this.hud();
  },
  hud(){
    if(!G) return;
    $('#hpfill').style.width = G.hp+'%'; $('#hpNum').textContent = G.hp;
    const hp = $('#hp'); hp.classList.toggle('low', G.hp<=30); hp.classList.toggle('mid', G.hp>30 && G.hp<=60);
    const lv = $('#hLevel'), sv = G.mode==='survival';
    lv.style.setProperty('--c', sv ? 'var(--warn)' : G.mode==='level' && G.L.pos ? POS[G.L.pos].color : 'var(--acid)');
    lv.querySelector('span').textContent = G.mode==='review' ? T('hudReview') : sv ? `${T('hudSurvival')} · ${T('svWave', G.wave)}`
                                         : `${T('hudLevel')} ${pad2(lvNo(G.idx))} · ${G.L.topic}`;
    // survival: progress to the next heal (every 3 correct answers = +10% HP)
    const pips = $('#hPips');
    pips.innerHTML = sv ? [0,1,2].map(k => `<i class="${k < G.good%3 ? 'on' : ''}"></i>`).join('') + '<small>+10%</small>' : '';
    pips.title = sv ? T('svHealShort') : '';
    // survival: the record to beat, or "New record!" once you pass it
    const rec = sv ? G.record : null, beat = !!rec && G.score > rec.score, hb = $('#hBest');
    hb.classList.toggle('new', beat);
    hb.innerHTML = rec ? ic('trophy') + esc(beat ? T('hudNewRecord') : T('hudRecord', fmtNum(rec.score), rec.name)) : '';
    $('#hScore').textContent = String(G.score).padStart(5,'0');
    $('#hCombo').innerHTML = G.combo >= 2 ? ic('flame') + esc(T('hudCombo', G.combo)) : '';
    const bossTime = ['bossIntro','boss','bossDead','speak'].includes(G.phase);
    $('#hLeft').textContent = bossTime ? 1 : Math.max(0, G.L.count-G.resolved);
    $('#hLeftLbl').textContent = bossTime ? T('hudBoss') : T('hudLeft');
    $('#slowN').textContent = G.slow; $('#slowBtn').disabled = G.slow <= 0;
    $('#btnVoice use').setAttribute('href', Store.d.settings.voice ? '#i-volume' : '#i-volume-off');
  },
  pause(p){
    if(!G || !['intro','wave','bossIntro','boss','bossDead'].includes(G.phase)) return;
    G.paused = p; this.show(p ? 'pause' : null);
    document.body.classList.toggle('paused', p);
    $('#btnQuit span').textContent = T(G.mode==='survival' && G.decisions > 0 ? 'svEndRun' : 'quit');
    if(p) Voice.stop();
  },

  /* ---------- boss word dock ---------- */
  showTiles(B){
    document.body.classList.add('boss');
    $('#tMeaning').innerHTML = B.entry.th ? `${ic('info')}<span><b>${esc(T('meaning'))}:</b> ${esc(B.entry.th)}</span>` : '';
    const box = $('#tWords'); box.innerHTML = '';
    B.words.forEach((w,i) => {
      const b = document.createElement('button'); b.className = 'tile';
      b.innerHTML = `<span>${esc(w)}</span><small></small>`;
      b.onclick = () => { b.blur(); bossPick(i); };
      box.appendChild(b);
    });
    $('#tiles').classList.add('show');
    this.updateTiles(B);
  },
  updateTiles(B){
    const st = B.stages[Math.min(B.stage, B.stages.length-1)], left = st.idx.filter(k => !B.found.has(k)).length;
    $('#tiles .dock-head').style.setProperty('--c', POS[st.pos].color);
    $('#tPrompt').textContent = T('findPrompt', posName(st.pos, true));
    $('#tStage').textContent = T('findLeft', left) + (B.stages.length>1 ? ' · ' + T('stageOf', Math.min(B.stage+1, B.stages.length), B.stages.length) : '');
    const kids = $('#tWords').children;
    B.words.forEach((w,i) => {
      const k = kids[i]; if(!k) return;
      const p = B.found.get(i);
      k.classList.toggle('found', !!p);
      if(p) k.style.setProperty('--c', POS[p].color); else k.style.removeProperty('--c');
      k.querySelector('small').textContent = p ? POS[p].en : '';
    });
  },
  tileWrong(i){
    const el = $('#tWords').children[i]; if(!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  },
  hideTiles(){ $('#tiles').classList.remove('show'); document.body.classList.remove('boss'); },

  /* ---------- speaking bonus ---------- */
  openSpeak(text){
    let best = null, stopFn = null;
    $('#spBody').innerHTML = `
      <div class="kicker">${esc(T('speakKicker'))}</div>
      <h2 style="font-size:30px;margin-top:8px;text-transform:uppercase;letter-spacing:.03em">${esc(T('speakTitle'))}</h2>
      <p class="muted" style="margin-top:8px;line-height:1.55">${esc(T('speakDesc'))}</p>
      <div class="speak-sent">${esc(text)}</div>
      <div class="mic-row">
        <button class="ibtn" id="spListen">${ic('volume')}<span>${esc(T('listen'))}</span></button>
        ${Speech.supported ? `<button class="mic" id="spGo" title="${esc(T('speakBtn'))}">${ic('mic')}</button>` : ''}
      </div>
      <div id="spStatus" class="status">${Speech.supported ? '' : esc(T('noSpeech'))}</div>
      <div class="row center" style="margin-top:6px"><button class="btn ghost" id="spDone"><span>${esc(T(Speech.supported ? 'skip' : 'continue'))}</span>${ic('arrow-r')}</button></div>`;
    $('#spListen').onclick = () => Voice.speak(text, true);
    $('#spDone').onclick = () => { if(stopFn) stopFn(); this.show(null); finishSpeak(best); };
    const go = $('#spGo');
    if(go) go.onclick = () => {
      Voice.stop(); go.disabled = true; go.classList.add('listening');
      $('#spStatus').textContent = T('listening');
      stopFn = Speech.listen(res => {
        stopFn = null; go.disabled = false; go.classList.remove('listening');
        if(!res.ok){
          $('#spStatus').textContent = res.error==='no-speech' ? T('speakRetry') : T('micError', res.error);
          return;
        }
        let heard = res.alts[0] || '', m = -1;
        res.alts.forEach(a => { const v = matchScore(a, text); if(v > m){ m = v; heard = a; } });
        const sc = Math.round(Math.max(0, m)*100), col = sc>=80 ? 'var(--ok)' : sc>=50 ? 'var(--warn)' : 'var(--bad)';
        best = Math.max(best ?? 0, sc);
        const msg = sc>=80 ? T('speakExcellent', speakBonus(sc)) : sc>=50 ? T('speakGood', speakBonus(sc)) : T('speakRetry');
        $('#spStatus').innerHTML = `<div class="score-big" style="--c:${col}">${sc}%</div>
          <div class="meter" style="--c:${col}"><i style="width:${sc}%"></i></div>
          <div>${esc(msg)}</div><div class="muted" style="margin-top:6px">${esc(T('heard', heard))}</div>`;
        $('#spDone span').textContent = T('continue');
      });
    };
    this.show('speak');
  },

  /* ---------- results + playtest survey ---------- */
  showResult(s){
    document.body.classList.remove('ingame','paused','boss');
    const sv = s.mode==='survival', L = s.mode==='level' ? LEVELS[s.idx] : null;
    const kick = sv ? T('svOverKicker') : !s.win ? T('kLose') : s.mode==='review' ? T('kReview') : T('kWin');
    const title = sv ? T('svOverTitle', s.wave) : !s.win ? T('loseTitle') : s.mode==='review' ? T('winReview')
                : nextInUnit(s.idx) < 0 ? T(LEVELS[s.idx].unit==='tense' ? 'winAllTense' : 'winAll') : T('winTitle', lvNo(s.idx));
    $('#rPanel').classList.toggle('lose', !s.win && !sv);
    $('#rPanel').classList.toggle('warn', sv);
    const stat = (icon, k, v) => `<div class="stat"><span class="label">${ic(icon)}${esc(T(k))}</span><b>${v}</b></div>`;
    const side = sv ? `<div class="rankbadge"><span class="label">${esc(T('bdRank'))}</span><b>#${s.board.playerRank}</b><small>${esc(T('svOfPlayers', s.board.players))}</small></div>`
               : s.win && s.mode==='level' ? `<div class="stars">${starsHTML(s.stars)}</div>` : '';
    let h = `<div class="res-head"><div><div class="kicker">${esc(kick)}</div><h2>${esc(title)}</h2></div>${side}</div>`;
    if(sv){
      // survival: where this run landed, then the leaderboard with your row highlighted
      const b = s.board, note = b.record ? T('svNewRecord') : b.pb ? T('svNewPB') : T('svPrevBest', fmtNum(b.prev));
      h += `<div class="svnote${b.record || b.pb ? ' good' : ''}">${ic(b.record ? 'trophy' : b.pb ? 'star' : 'info')}<span>${esc(note)}</span></div>
        <div class="stats">${stat('trophy','sScore',fmtNum(s.score))}${stat('virus','sWave',s.wave)}${stat('clock','sTime',fmtTime(s.time))}
          ${stat('percent','sAcc',s.acc+'%')}${stat('flame','sCombo','×'+s.bestCombo)}</div>
        <div class="sec">${ic('trophy')}${esc(T('bdTitle'))}</div>${playersTable(Store.boardPlayers(), Store.nameKey(s.name), 10)}`;
    }
    else h += `
      <div class="stats">${stat('trophy','sScore',s.score)}${stat('percent','sAcc',s.acc+'%')}
        ${stat('clock','sDec', s.avgDec ? s.avgDec.toFixed(1)+'s' : '–')}${stat('flame','sCombo','×'+s.bestCombo)}
        ${stat('shield','sRescued', s.rescued.length)}
        ${s.speakScore!=null ? stat('mic','sSpeak',s.speakScore+'%') : ''}${s.mastered ? stat('check','sMastered',s.mastered) : ''}</div>`;
    // mistakes first, each with the full answer key; then the boss; then what went right (folded)
    const cards = (xs, seen) => `<ul class="list">${xs.map(x => answerCard(x, seen)).join('')}</ul>`;
    const sec = (icon, key, hint) => `<div class="sec">${ic(icon)}${esc(T(key))}</div>${hint ? `<p class="sec-hint">${esc(TT(hint))}</p>` : ''}`;
    const fold = (key, n, list) => `<details><summary class="sec">${ic('chev-r','chev')}${esc(T(key))} (${n})</summary>${list}</details>`;
    if(s.reached.length) h += sec('alert','secBitten','hintReached') + cards(s.reached, 'bad');
    if(s.wrongCure.length) h += sec('x','secWrongCure','hintWrongCure') + cards(s.wrongCure, 'bad');
    if(s.shotRight.length) h += sec('target','secSurvivor','hintSurvivor') + cards(s.shotRight, 'ok');
    if(s.lost.length) h += sec('user','secLost','hintLost') + cards(s.lost, 'ok');
    if(s.bossWords) h += sec('skull','secBoss') + bossHTML(s);
    if(s.fixed.length) h += fold('secFixed', s.fixed.length, cards(s.fixed, 'bad'));
    if(s.rescued.length) h += fold('secRescued', s.rescued.length, cards(s.rescued, 'ok'));
    if(L) h += `<div class="tip">${ic('bulb')}<div><b>${esc(T('tipTitle'))}</b>${rulesHTML(L, true)}</div></div>`;
    h += `<div class="survey"><div class="sec">${ic('chart')}${esc(T('surveyTitle'))}</div>
      <div class="q"><span>${esc(T('surveyFun'))}</span><div class="scale">${esc(T('funLow'))}<div class="seg" data-q="fun">${[1,2,3,4,5].map(v=>`<button data-v="${v}">${v}</button>`).join('')}</div>${esc(T('funHigh'))}</div></div>
      <div class="q"><span>${esc(T('surveyHard'))}</span><div class="seg" data-q="difficulty">${['easy','right','hard'].map(k=>`<button data-v="${k}">${esc(T(k))}</button>`).join('')}</div></div>
      <div class="thanks" id="svThanks"></div></div><div class="row" id="rBtns"></div>`;
    const body = $('#rBody'); body.innerHTML = h; sayButtons(body);
    body.querySelectorAll('.seg[data-q]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
      g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x===b));
      Store.updateLast({ [g.dataset.q]: g.dataset.q==='fun' ? +b.dataset.v : b.dataset.v });
      $('#svThanks').textContent = T('thanks');
    }));
    const btns = $('#rBtns');
    const mk = (label, cls, icon, fn) => { const b = document.createElement('button'); b.className = 'btn'+(cls ? ' '+cls : '');
      b.innerHTML = `${ic(icon)}<span>${esc(label)}</span>`; b.onclick = fn; btns.appendChild(b); };
    if(sv){
      mk(T('replay'), '', 'replay', () => startSurvival());
      mk(T('svNext'), 'ghost', 'user', () => this.survivalBrief(true));       // hand over to the next player
      mk(T('tabBoard'), 'ghost', 'trophy', () => { this.tab = 'board'; this.menu(); });
    } else if(s.mode==='level'){
      if(s.win && nextInUnit(s.idx) >= 0) mk(T('next'), '', 'arrow-r', () => this.briefing(nextInUnit(s.idx)));
      mk(s.win ? T('replay') : T('retry'), s.win ? 'ghost' : '', 'replay', () => startLevel(s.idx));
    } else mk(T('retry'), 'ghost', 'replay', () => { if(!startReview()) this.menu(); });
    mk(T('menu'), 'ghost', 'home', () => this.menu());
    this.show('result');
  },

  /* ---------- notebook tab ---------- */
  renderNotebook(){
    const list = Store.nbList(), el = $('#nbBody');
    const side = `<div class="row" style="margin:0"><span class="muted">${esc(T('nbMastered', Store.d.mastered))}</span>
      <button class="btn" id="nbGo" ${list.length<3 ? 'disabled' : ''}>${ic('replay')}<span>${esc(T('nbStart'))}</span></button></div>`;
    let h = pageHead(T('tabNotebook'), T('nbTitle'), T('nbDesc'), side);
    if(list.length && list.length < 3) h += `<p class="muted" style="margin-bottom:12px">${esc(T('nbNeed'))}</p>`;
    if(!list.length) h += `<p class="empty">${esc(T('nbEmpty'))}</p>`;
    else h += `<ul class="list">${list.map(n => {
      const ref = SENTENCE_INDEX.get(n.text);
      const x = { w:n.wrong, r: ref ? ref.e.t : n.text, pos: ref ? (ref.e.pos || LEVELS[ref.li].pos) : null };
      const meta = `<div class="meta">${LEVELS[n.level] ? `<span>${esc(T('level'))} ${lvNo(n.level)} · ${esc(LEVELS[n.level].topic)}</span>` : ''}<span>${esc(T('nbMisses', n.misses))}</span>
          <span class="dots2" title="${esc(T('nbProgress'))}">${[0,1].map(k => `<i class="${k<n.streak ? 'on' : ''}"></i>`).join('')}</span></div>`;
      return answerCard(x, null, meta);
    }).join('')}</ul>`;
    el.innerHTML = h; sayButtons(el);
    $('#nbGo').onclick = () => { audio(); startReview(); };
  },

  /* ---------- stats tab: the play data of every player (or one player), scores by level ---------- */
  renderStats(){
    const all = Store.d.sessions, el = $('#stBody'), players = statsPlayers(all);
    if(this.statsPlayer!=null && !players.some(p => p.key===this.statsPlayer)) this.statsPlayer = null;
    const pk = this.statsPlayer, me = pk==null ? null : players.find(p => p.key===pk);
    const S = me ? all.filter(s => Store.nameKey(s.player)===pk) : all;
    const side = `<div class="row" style="margin:0">
      <button class="btn" id="stExport">${ic('download')}<span>${esc(T('stExport'))}</span></button>
      <button class="btn danger" id="stReset">${ic('trash')}<span>${esc(T('stReset'))}</span></button></div>`;
    let h = pageHead(T('tabStats'), T('stTitle'), T('stDesc'), side);
    if(!all.length) h += `<p class="empty">${esc(T('stNone'))}</p>`;
    else {
      const kpi = (k, v) => `<div class="kpi"><span class="label">${esc(T(k))}</span><b>${v}</b></div>`;
      // "k:" marks a player, so the player without a name (key "") is not mistaken for "everyone"
      const opts = `<option value="">${esc(T('stAll'))}</option>` + players.map(p =>
        `<option value="k:${esc(p.key)}"${p.key===pk ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
      h += `<div class="st-filter"><span class="label">${esc(T('stView'))}</span>
          <label class="selwrap">${ic('user')}<select id="stPlayer" aria-label="${esc(T('stView'))}">${opts}</select></label></div>
        <div class="kpis">${kpi('stSessions', S.length)}${me ? kpi('stLvCleared', `${me.won.size} / ${LEVELS.length}`) : kpi('stPlayersN', players.length)}
          ${kpi('stTime', fmtDur(sumOf(S,'durationSec')))}${kpi('stAcc', accPct(sumOf(S,'correct'), sumOf(S,'decisions'))+'%')}
          ${me ? kpi('stTotal', fmtNum(me.score)) + kpi('stSvBest', me.sv ? fmtNum(me.sv) : '–')
               : kpi('stStars', Object.values(Store.d.stars).reduce((a,b) => a+b, 0)+' / '+LEVELS.length*3) + kpi('stMastered', Store.d.mastered)}</div>
        <div class="sec">${ic('chart')}${esc(T('stByLevel'))}${me ? ` · ${esc(me.name)}` : ''}</div>${levelTable(levelRows(S), !me)}
        <div class="sec">${ic('user')}${esc(T('stPlayersN'))}</div><p class="sec-hint">${esc(T('stPick'))}</p>${playerTable(players, pk)}`;
    }
    el.innerHTML = h;
    $('#stExport').onclick = () => Store.exportCSV();
    $('#stReset').onclick = () => { if(confirm(T('stConfirm'))){ Store.reset(); $('#playerName').value = ''; this.renderMenu(); } };
    const sel = $('#stPlayer');
    if(sel) sel.onchange = () => { this.statsPlayer = sel.value ? sel.value.slice(2) : null; this.renderStats(); };
    el.querySelectorAll('tr.pick').forEach(tr => tr.onclick = () => { this.statsPlayer = this.statsPlayer===tr.dataset.k ? null : tr.dataset.k; this.renderStats(); });
  },

  /* ---------- settings tab ---------- */
  renderSettings(){
    const st = Store.d.settings, el = $('#setBody');
    const seg = (key, opts) => `<div class="seg" data-k="${key}">${opts.map(([v,l]) =>
      `<button data-v="${v}" class="${String(st[key])===String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
    const row = (label, control) => `<div class="set"><b>${esc(T(label))}</b>${control}</div>`;
    el.innerHTML = pageHead(T('tabSettings'), T('setTitle'), '') +
      row('setLang', seg('lang', [['en','English'],['th','ไทย']])) +
      row('setVoice', seg('voice', [[true,T('on')],[false,T('off')]])) +
      row('setSpeed', seg('speed', [[0,T('slow')],[1,T('normal')],[2,T('fast')]])) +
      row('setSpeak', seg('speak', [[true,T('on')],[false,T('off')]])) +
      (Speech.supported ? '' : `<p class="muted" style="margin-top:14px">${esc(T('noSpeech'))}</p>`);
    el.querySelectorAll('.seg').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = g.dataset.k, raw = b.dataset.v;
      st[k] = k==='lang' ? raw : k==='speed' ? +raw : raw==='true';
      Voice.enabled = st.voice; Store.save();
      if(k==='lang') this.applyLang(); else this.renderSettings();
    }));
  },
};

/* ---------- input ---------- */
// mouse: left button = kill gun, right button (or Shift/Ctrl + click on a trackpad) = cure gun.
// mousedown fires for every button, even while the other one is held.
const gunFor = e => (e.button===2 || e.shiftKey || e.ctrlKey) ? 'cure' : 'kill';
cv.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('mousedown', e => {
  if(e.button!==0 && e.button!==2) return;
  mouse.x = e.clientX; mouse.y = e.clientY; shoot(e.clientX, e.clientY, gunFor(e));
});
// touch screens: show the trigger buttons and say "button" instead of "click" in the help texts
function setTouch(){
  if(isTouch()) return;
  document.body.classList.add('touch');
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = TT(el.dataset.i18n));
}
// touch / pen: a tap aims at the zombie under the finger; the left / right trigger buttons fire
cv.addEventListener('pointerdown', e => {
  if(e.pointerType==='mouse') return;
  e.preventDefault(); setTouch();
  pickTarget(e.clientX, e.clientY);
});
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('contextmenu', e => { if(document.body.classList.contains('ingame')) e.preventDefault(); });
addEventListener('keydown', e => {
  if(e.target && e.target.tagName==='INPUT') return;
  if(e.key==='Escape' || e.key==='p' || e.key==='P'){ if(G) UI.pause(!G.paused); return; }
  if(e.code==='Space' && G && document.body.classList.contains('ingame')){ e.preventDefault(); useSlowmo(); }
});
addEventListener('blur', () => { if(G && !G.paused) UI.pause(true); });
addEventListener('resize', () => { resize(); render(); });   // redraw at once: resizing clears the canvas

/* ---------- main loop ---------- */
let lastFrame = performance.now();
function loop(now){
  const dt = Math.min(.05, (now-lastFrame)/1000); lastFrame = now;
  update(dt);
  if(isTouch()) aimAtTarget();            // touch screens: both rifles follow the targeted zombie
  render();
  requestAnimationFrame(loop);
}
resize(); mouse.x = W/2; mouse.y = H/2;
UI.init();
requestAnimationFrame(loop);
