/* =========================================================
   Sentence tools — Parts of Speech edition
   - [bracket] markup → highlighted tokens for signs and feedback
   - item parsing, HTML helpers, speech matching, boss setup
   ========================================================= */
const HL = '#ffd84d';   // highlight colour for the word being tested
const DIGITS = {'0':'zero','1':'one','2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight',
                '9':'nine','10':'ten','11':'eleven','12':'twelve'};

const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffleArr(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const normTok = w => w.toLowerCase().replace(/[^a-z0-9']/g,'');

// 'She sings [beautifully].' → { plain:'She sings beautifully.', toks:[[['She',false]], …, [['beautifully',true],['.',false]]], key:'beautifully' }
function parseMarked(s){
  const toks = []; let hl = false;
  for(const raw of s.split(' ')){
    const pieces = []; let buf = '';
    for(const ch of raw){
      if(ch==='[' || ch===']'){ if(buf) pieces.push([buf, hl]); buf = ''; hl = ch==='['; }
      else buf += ch;
    }
    if(buf) pieces.push([buf, hl]);
    toks.push(pieces);
  }
  const plain = toks.map(p => p.map(x=>x[0]).join('')).join(' ');
  const spans = []; let cur = null;     // neighbouring highlighted words form one span
  toks.forEach(p => {
    const h = p.filter(x=>x[1]).map(x=>x[0]).join('');
    if(h) cur = cur===null ? h : cur+' '+h;
    else if(cur!==null){ spans.push(cur); cur = null; }
  });
  if(cur!==null) spans.push(cur);
  return { plain, toks, key: spans.map(s=>s.replace(/[!?.,]+$/,'')).join(' … ') };
}
function parseItem(e, levelPos){
  const right = parseMarked(e.t), wrong = parseMarked(e.w);
  return { text:right.plain, tMark:e.t, wMark:e.w, right, wrong, pos:e.pos || levelPos, note:e.note || '' };
}
// tokens for canvas signs: each piece = [text, colour or null]
const colorToks = (toks, color=HL) => toks.map(p => p.map(([t,h]) => [t, h ? color : null]));
function markedHTML(s, cls){
  return parseMarked(s).toks.map(p => p.map(([t,h]) => h ? `<mark class="${cls}">${esc(t)}</mark>` : esc(t)).join('')).join(' ');
}
function posChip(p, note){
  const m = POS[p];
  return m ? `<span class="pos" style="--c:${m.color}">${esc(posName(p))}${note ? ' · '+esc(note) : ''}</span>` : '';
}

/* ---------- speech scoring ---------- */
function lcsLen(a,b){
  const dp = Array.from({length:a.length+1}, ()=>new Array(b.length+1).fill(0));
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--)
    dp[i][j] = a[i]===b[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]);
  return dp[0][0];
}
const speechTokens = s => s.toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean).map(w=>DIGITS[w]||w);
// 0..1 — how much of the target sentence was said, in order
function matchScore(heard, target){
  const a = speechTokens(heard), b = speechTokens(target);
  return b.length ? lcsLen(a,b)/b.length : 0;
}

/* ---------- boss: find every word of a part of speech ---------- */
function buildBoss(entry){
  const words = entry.t.split(' '), norms = words.map(normTok);
  const neutral = new Set((entry.neutral||[]).map(normTok));
  const stages = entry.stages.map(s => {
    const keys = s.keys.map(normTok);
    return { pos:s.pos, idx: norms.map((n,i) => keys.includes(n) ? i : -1).filter(i => i>=0) };
  });
  const posOf = new Map();
  stages.forEach(s => s.idx.forEach(i => posOf.set(i, s.pos)));
  return { words, norms, neutral, stages, posOf };
}
