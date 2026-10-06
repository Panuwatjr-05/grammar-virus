/* =========================================================
   Store: progress, settings, mistake notebook, playtest logs
   (saved in this browser with localStorage)
   ========================================================= */
const SAVE_KEY = 'grammarVirusPOS';           // Parts of Speech edition (levels differ from the word-order edition)
// survival leaderboard order: score, then wave reached, then time survived, then whoever got there first
const cmpRun = (a,b) => b.score-a.score || b.wave-a.wave || b.time-a.time || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const Store = {
  d:null,
  defaults(){
    return { v:2, unlocked:1, stars:{}, best:{}, player:'', mastered:0, notebook:{}, sessions:[], board:[],
             settings:{ lang:'en', voice:true, speed:1, speak:true } };
  },
  load(){
    let s = null;
    try{ s = JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){}
    const d = this.defaults();
    if(s){ Object.assign(d, s); d.settings = Object.assign(this.defaults().settings, s.settings||{}); }
    else{ // keep the player's name and settings from the word-order edition, not its level progress
      try{ const old = JSON.parse(localStorage.getItem('grammarVirusSave')); if(old){ d.player = old.player||''; d.settings = Object.assign(d.settings, old.settings||{}); } }catch(e){}
    }
    if(!Array.isArray(d.board)) d.board = [];
    this.d = d;
  },
  save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.d)); }catch(e){} },

  /* ---- mistake notebook (spaced review: 2 correct in a row = mastered) ---- */
  nbMistake(text, wrong, level){
    const n = this.d.notebook[text] || { text, wrong:null, level, misses:0, streak:0 };
    n.misses++; n.streak = 0; n.last = Date.now();
    if(wrong) n.wrong = wrong;
    this.d.notebook[text] = n;
  },
  nbCorrect(text){
    const n = this.d.notebook[text]; if(!n) return false;
    n.streak++;
    if(n.streak >= 2){ delete this.d.notebook[text]; this.d.mastered++; return true; }
    return false;
  },
  nbList(){ return Object.values(this.d.notebook).sort((a,b)=> b.misses-a.misses || b.last-a.last); },

  /* ---- survival leaderboard: every run on this computer (kept apart from level progress) ---- */
  nameKey: n => String(n||'').trim().toLowerCase().replace(/\s+/g,' '),     // "Anna", "anna " = the same player
  // saves a run; returns where it landed: { playerRank, players, runRank, runs, pb (personal best), record (new #1), prev }
  addRun(r){
    r.name = String(r.name||'').trim().slice(0,40) || 'Player';
    const key = this.nameKey(r.name), before = this.boardPlayers().find(p => p.key===key), top = this.boardTop();
    this.d.board.push(r);
    if(this.d.board.length > 300){ this.d.board.sort(cmpRun); this.d.board.length = 300; }
    this.save();
    const players = this.boardPlayers(), runs = this.boardRuns();
    return { playerRank:players.findIndex(p => p.key===key)+1, players:players.length,
             runRank:runs.indexOf(r)+1, runs:runs.length,
             pb:!before || r.score > before.best.score, record:!top || r.score > top.score, prev:before ? before.best.score : null };
  },
  boardRuns(){ return this.d.board.slice().sort(cmpRun); },
  boardTop(){ return this.boardRuns()[0] || null; },
  // one entry per player: their best run plus totals over all their runs, best player first
  boardPlayers(){
    const m = new Map();
    for(const r of this.boardRuns()){                 // sorted, so the first run seen is that player's best
      const k = this.nameKey(r.name);
      let p = m.get(k);
      if(!p){ p = { key:k, name:r.name, best:r, runs:0, good:0, decisions:0, last:r.date }; m.set(k, p); }
      p.runs++; p.good += +r.good||0; p.decisions += +r.decisions||0;
      if(r.date > p.last){ p.last = r.date; p.name = r.name; }       // show the name as it was typed most recently
    }
    return [...m.values()];
  },
  clearBoard(){ this.d.board = []; this.save(); },

  /* ---- playtest logs ---- */
  logSession(s){ this.d.sessions.push(s); if(this.d.sessions.length>500) this.d.sessions.shift(); this.save(); },
  updateLast(patch){ const s = this.d.sessions[this.d.sessions.length-1]; if(s) Object.assign(s, patch); this.save(); },
  exportCSV(){
    const cols = ['time','player','mode','level','wave','topic','result','score','stars','accuracy','decisions','correct',
                  'kills','rescued','survivorsShot','wrongCures','lostSurvivors','bitten','bossErrors','avgDecisionSec','bestCombo',
                  'speakScore','speed','durationSec','fun','difficulty'];
    const cell = v => { const s = v==null ? '' : String(v); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const rows = [cols.join(',')].concat(this.d.sessions.map(s => cols.map(c=>cell(s[c])).join(',')));
    const blob = new Blob(['﻿'+rows.join('\n')], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grammar-virus-playtest-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  // "Reset progress" keeps the settings and the leaderboard (that has its own clear button)
  reset(){ const keep = this.d.settings, board = this.d.board; this.d = this.defaults(); this.d.settings = keep; this.d.board = board; this.save(); },
};
Store.load();
