/* =========================================================
   Audio: synthesized SFX (no files), text-to-speech, speech recognition
   ========================================================= */
let AC = null;
function audio(){
  if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(AC && AC.state==='suspended') AC.resume();
  return AC;
}
function noise(dur, freq, vol, type='lowpass'){
  const a = audio(); if(!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate*dur), a.sampleRate), d = buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/d.length, 2);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination); s.start();
}
function tone(freq, dur, type='sine', vol=.2, slide=0, delay=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq+slide), t+dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t+dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur);
}
const SFX = {
  shot(){ noise(.55,1100,.8); noise(.12,6000,.25,'highpass'); tone(62,.4,'square',.22,-25); },        // .50 BMG: boom + crack
  dart(){ noise(.2,2400,.32,'highpass'); tone(420,.2,'sine',.18,-220); tone(1100,.1,'sine',.08,-600,.02); }, // cure round: air thump
  rescue(){ [659,880,1175].forEach((f,i)=>tone(f,.22,'sine',.16,0,i*.07)); },
  cureFail(){ tone(200,.3,'square',.12,-80); noise(.15,800,.3); },
  lost(){ tone(330,.45,'triangle',.1,-150); },
  good(){ tone(660,.12,'triangle',.2); tone(990,.18,'triangle',.18,0,.08); },
  bad(){ tone(220,.35,'sawtooth',.18,-120); },
  slap(){ noise(.18,600,.8); tone(90,.2,'sine',.4,-40); },
  groan(){ tone(70+Math.random()*40,.9,'sawtooth',.05,-30); },
  roar(){ tone(110,1.2,'sawtooth',.2,-70); noise(1,400,.4); },
  tile(k){ tone(440*Math.pow(1.122,k),.15,'triangle',.2); },
  tileBad(){ tone(160,.25,'square',.15,-60); },
  heal(){ tone(520,.15,'sine',.2); tone(780,.25,'sine',.2,0,.1); },
  slow(){ tone(600,.6,'sine',.18,-450); },
  wave(){ tone(330,.45,'sawtooth',.08,330); tone(660,.3,'triangle',.14,0,.32); },   // survival: next wave, rising alarm
  boom(){ noise(.9,300,.9); tone(60,.8,'sine',.5,-30); },
  win(){ [523,659,784,1046].forEach((f,i)=>tone(f,.25,'triangle',.18,0,i*.12)); },
  lose(){ [392,330,262,196].forEach((f,i)=>tone(f,.35,'sawtooth',.12,0,i*.18)); },
};

/* ---------- Text-to-speech (listening practice) ---------- */
const Voice = {
  enabled:true, voice:null,
  pick(){
    try{
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v=>/en[-_]US/i.test(v.lang) && /Google|Natural|Aria|Jenny|Guy/i.test(v.name))
                || vs.find(v=>/en[-_]US/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null;
    }catch(e){}
  },
  speak(text, force=false, rate=.92){
    if((!this.enabled && !force) || !('speechSynthesis' in window)) return;
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = rate; if(this.voice) u.voice = this.voice;
      speechSynthesis.speak(u);
    }catch(e){}
  },
  stop(){ try{ speechSynthesis.cancel(); }catch(e){} },
};
if('speechSynthesis' in window){ Voice.pick(); try{ speechSynthesis.onvoiceschanged = ()=>Voice.pick(); }catch(e){} }

/* ---------- Speech recognition (speaking practice) ---------- */
const Speech = {
  supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  // onDone({ok:true, alts:[...]} | {ok:false, error})
  listen(onDone){
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    let done = false;
    const finish = x => { if(!done){ done = true; onDone(x); } };
    let r;
    try{
      r = new R(); r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 3;
      r.onresult = e => finish({ ok:true, alts:Array.from(e.results[0]).map(a=>a.transcript) });
      r.onerror = e => finish({ ok:false, error:e.error||'error' });
      r.onend = () => finish({ ok:false, error:'no-speech' });
      r.start();
    }catch(e){ finish({ ok:false, error:'start-failed' }); }
    return () => { try{ r && r.stop(); }catch(e){} };
  },
};
