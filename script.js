// 2048 Better - plain JavaScript, no libraries.
const $ = (s) => document.querySelector(s);
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const MODES = {
  easy:      { n: "Easy",        four: 0,  spawn: 1, p: { undo: 99, swap: 5, hammer: 5, shuffle: 3 } },
  classic:   { n: "Classic",     four: .1, spawn: 1, p: { undo: 10, swap: 3, hammer: 3, shuffle: 1 } },
  hard:      { n: "Hard",        four: .3, spawn: 1, p: { undo: 3, swap: 1, hammer: 1, shuffle: 0 } },
  nightmare: { n: "Nightmare",   four: .4, eight: .1, spawn: 2, p: { undo: 0, swap: 0, hammer: 0, shuffle: 0 } },
  timed:     { n: "Time Attack", four: .1, spawn: 1, time: 120, p: { undo: 3, swap: 2, hammer: 2, shuffle: 1 } },
  daily:     { n: "Daily",       four: .1, spawn: 1, seed: 1, p: { undo: 5, swap: 2, hammer: 2, shuffle: 1 } },
};
const THEMES = { cream: "Cream", midnight: "Midnight", ocean: "Ocean", neon: "Neon", forest: "Forest", sunset: "Sunset" };
const cfg = { theme: "cream", size: 4, mode: "classic", bot: 0, fx: true, snd: false, music: false, name: "Player", ...ld("s2048", {}) };

// seeded random: the Daily mode gives everyone the same board today
const rngFor = (seed) => { if (!seed) return Math.random; let a = seed;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

// ---------- core logic ----------
function slideRow(row, n) {
  const t = []; row.forEach((v, i) => v && t.push([v, i]));
  const o = [], L = []; let s = 0;
  for (let i = 0; i < t.length; i++) {
    const a = t[i], b = t[i + 1];
    if (b && a[0] === b[0]) { o.push(a[0] * 2); s += a[0] * 2; L.push({ k: o.length - 1, f: [a[1], b[1]] }); i++; }
    else { o.push(a[0]); L.push({ k: o.length - 1, f: [a[1]] }); }
  }
  while (o.length < n) o.push(0);
  return { o, s, L };
}
// d: 0 left, 1 right, 2 up, 3 down. Every direction is turned into "slide left".
// tl lists every tile: where it came from, where it ends up, and its new value.
function apply(g, d) {
  const n = g.length, v = d > 1, rv = d % 2 === 1, tl = [];
  let t = v ? g[0].map((_, c) => g.map((r) => r[c])) : g.map((r) => r.slice());
  if (rv) t = t.map((r) => r.reverse());
  let s = 0, mv = false;
  t = t.map((r, i) => {
    const x = slideRow(r, n);
    if (x.o.some((a, k) => a !== r[k])) mv = true;
    s += x.s;
    const P = (c) => { const cc = rv ? n - 1 - c : c; return v ? [cc, i] : [i, cc]; };
    x.L.forEach((l) => tl.push({ to: P(l.k), from: l.f.map(P), v: x.o[l.k] }));
    return x.o;
  });
  if (rv) t = t.map((r) => r.reverse());
  if (v) t = t[0].map((_, c) => t.map((r) => r[c]));
  return { g: t, s, mv, tl };
}
const canMove = (g) => [0, 1, 2, 3].some((d) => apply(g, d).mv);
const empties = (g) => g.flatMap((r, i) => r.map((v, j) => (v ? null : [i, j])).filter(Boolean));

class Game {
  constructor(size, mode, rng) {
    this.size = size; this.m = MODES[mode]; this.rng = rng;
    this.g = Array.from({ length: size }, () => Array(size).fill(0));
    this.score = 0; this.combo = 0; this.hist = []; this.over = false; this.won = false;
    this.p = { ...this.m.p }; this.spawn(); this.spawn();
  }
  spawn() {
    const e = empties(this.g); if (!e.length) return null;
    const [i, j] = e[Math.floor(this.rng() * e.length)], x = this.rng(), m = this.m;
    this.g[i][j] = x < (m.eight || 0) ? 8 : x < (m.eight || 0) + m.four ? 4 : 2;
    return [i, j];
  }
  move(d) {
    if (this.over) return null;
    const r = apply(this.g, d); if (!r.mv) return null;
    this.hist.push({ g: this.g, score: this.score, combo: this.combo }); if (this.hist.length > 50) this.hist.shift();
    const merges = r.tl.filter((x) => x.from.length > 1);
    this.combo = merges.length ? this.combo + 1 : 0;
    const bonus = this.combo > 1 ? Math.round(r.s * Math.min(this.combo - 1, 5) * 0.1) : 0;
    this.g = r.g; this.score += r.s + bonus;
    const sp = []; for (let k = 0; k < this.m.spawn; k++) { const c = this.spawn(); if (c) sp.push(c); }
    if (this.g.some((row) => row.includes(2048))) this.won = true;
    this.over = !canMove(this.g);
    return { sp, tl: r.tl, merges, bonus };
  }
  undo() {
    if (!this.p.undo || !this.hist.length) return false;
    const h = this.hist.pop(); Object.assign(this, { g: h.g, score: h.score, combo: h.combo, over: false }); this.p.undo--; return true;
  }
  hammer(i, j) { this.g[i][j] = 0; this.p.hammer--; }
  swap(a, b) { const t = this.g[a[0]][a[1]]; this.g[a[0]][a[1]] = this.g[b[0]][b[1]]; this.g[b[0]][b[1]] = t; this.p.swap--; }
  shuffle() {
    const f = this.g.flat();
    for (let i = f.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [f[i], f[j]] = [f[j], f[i]]; }
    this.g = Array.from({ length: this.size }, (_, i) => f.slice(i * this.size, (i + 1) * this.size)); this.p.shuffle--;
  }
}

// ---------- the bot: likes big tiles along a snake path from a corner, plus empty cells ----------
function evalG(g) {
  const n = g.length; let s = 0, e = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = g[i][j]; if (!v) { e++; continue; }
    s += v * Math.pow(.55, i * n + (i % 2 ? n - 1 - j : j)) * 10;
  }
  return s + e * 30;
}
function botDir(g, lvl) {
  const ok = [0, 1, 2, 3].filter((d) => apply(g, d).mv); if (!ok.length) return -1;
  if (lvl === 1 && Math.random() < .35) return ok[Math.floor(Math.random() * ok.length)];
  let best = -1, bs = -Infinity;
  for (const d of ok) {
    const r = apply(g, d); let sc = r.s + evalG(r.g);
    if (lvl === 3) { // genius: also looks one move further ahead
      const e = empties(r.g), k = Math.min(4, e.length); let tot = 0;
      for (let q = 0; q < k; q++) {
        const [i, j] = e[Math.floor(Math.random() * e.length)], h = r.g.map((x) => x.slice()); h[i][j] = 2;
        let b = -1e4; for (let d2 = 0; d2 < 4; d2++) { const r2 = apply(h, d2); if (r2.mv) b = Math.max(b, r2.s + evalG(r2.g)); }
        tot += b;
      }
      if (k) sc = tot / k;
    }
    if (sc > bs) { bs = sc; best = d; }
  }
  return best;
}

// ---------- drawing (tiles are real elements that slide) ----------
let G, B, pend = null, swapA = null, ended = false, left = 0, tm, bt, ac, wonShown = false;

function mk(L, v, r, c) {
  const t = document.createElement("div"), b = document.createElement("b"), l = Math.log2(v);
  t.className = "t"; t.dataset.r = r; t.dataset.c = c; t.style.setProperty("--r", r); t.style.setProperty("--c", c);
  b.textContent = v; b.dataset.n = l; b.dataset.d = String(v).length; b.style.setProperty("--n", l);
  if (v >= 512) b.classList.add("glow");
  t.appendChild(b); L.appendChild(t); return t;
}
function build(el) {
  el.style.setProperty("--size", cfg.size);
  el.querySelector(".grid").innerHTML = "<i></i>".repeat(cfg.size ** 2);
}
function render(el, game, tl, sp = []) {
  const L = el.querySelector(".tiles"), tok = (el._k = (el._k || 0) + 1);
  L.innerHTML = "";
  if (tl) {
    const go = [], mer = [];
    tl.forEach((m) => {
      const two = m.from.length === 2, ts = m.from.map(([r, c]) => mk(L, two ? m.v / 2 : m.v, r, c));
      go.push(() => ts.forEach((t) => { t.style.setProperty("--r", m.to[0]); t.style.setProperty("--c", m.to[1]); t.dataset.r = m.to[0]; t.dataset.c = m.to[1]; }));
      if (two) mer.push([ts, m]);
    });
    sp.forEach(([i, j]) => mk(L, game.g[i][j], i, j).classList.add("pop"));
    void L.offsetWidth; go.forEach((f) => f());
    if (mer.length) setTimeout(() => {
      if (el._k !== tok) return;
      mer.forEach(([ts, m]) => { ts.forEach((t) => t.remove()); mk(L, m.v, m.to[0], m.to[1]).classList.add("mrg"); });
    }, 110);
  } else game.g.forEach((row, i) => row.forEach((v, j) => {
    if (!v) return;
    const t = mk(L, v, i, j);
    if (sp.some((a) => a[0] === i && a[1] === j)) t.classList.add("pop");
    if (el.id === "board" && swapA && swapA[0] === i && swapA[1] === j) t.classList.add("sel");
  }));
}
const bestKey = () => `best-${cfg.mode}-${cfg.size}`;
function draw(r) {
  render($("#board"), G, r && r.tl, r && r.sp);
  let best = ld(bestKey(), 0); if (G.score > best) { best = G.score; sv(bestKey(), best); }
  $("#score").textContent = G.score; $("#best").textContent = best;
  if (B) $("#botScore").textContent = B.score;
  document.querySelectorAll(".tools button").forEach((b) => {
    const t = b.dataset.t, n = G.p[t];
    b.querySelector("u").innerHTML = "<s></s>".repeat(Math.min(n, 4)); b.disabled = n <= 0 || ended; b.classList.toggle("act", pend === t);
  });
  const m = G.m; $("#sub").textContent = `${m.n} · ${cfg.size}×${cfg.size}` + (m.time ? ` · ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "");
}
function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.remove("show"); void e.offsetWidth; e.classList.add("show"); }
const hint = (t) => ($("#hint").textContent = t || "");
function beep(f) {
  if (!cfg.snd) return;
  try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; g.gain.value = .05; o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .15); o.stop(ac.currentTime + .15); } catch {}
}

// ---------- coffeeshop lo-fi radio (made live with WebAudio, no audio files) ----------
const TRACKS = [
  { n: "Morning Latte",      bpm: 76, ch: [[60, "M"], [57, "m"], [62, "m"], [55, "D"]] },
  { n: "Rainy Window",       bpm: 68, rain: 1, ch: [[53, "M"], [52, "m"], [50, "m"], [55, "D"]] },
  { n: "Corner Table",       bpm: 84, ch: [[50, "m"], [55, "D"], [60, "M"], [57, "D"]] },
  { n: "Last Call Espresso", bpm: 90, ch: [[52, "m"], [57, "D"], [50, "M"], [59, "m"]] },
];
const Q = { M: [0, 4, 7, 11], m: [0, 3, 7, 10], D: [0, 4, 7, 10] }; // jazzy 7th chords
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
let mus = null, tr = 0, paused = false;

function env(g, t, v, dur, att) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
function tone(f, t, v, dur, type, att = .01) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
  env(g, t, v, dur, att); o.connect(g); g.connect(mus.bus); o.start(t); o.stop(t + dur + .05);
}
function noise(t, v, dur, type, f) {
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = mus.nb; fl.type = type; fl.frequency.value = f; env(g, t, v, dur, .002);
  s.connect(fl); fl.connect(g); g.connect(mus.bus); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}
function kick(t) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .2);
  env(g, t, .55, .32, .003); o.connect(g); g.connect(mus.bus); o.start(t); o.stop(t + .4);
}
// one 16th-note step of the beat: drums, Rhodes-style chords, bass, sparse melody, vinyl crackle
function step(s, bar, t) {
  const T = TRACKS[tr], [r, q] = T.ch[bar % 4], ch = Q[q].map((i) => r + 12 + i);
  const tt = t + (s % 2 ? 60 / T.bpm / 4 * .3 : 0); // swing
  if (s === 0 || (s === 10 && bar % 2)) kick(tt);
  if (s === 4 || s === 12) noise(tt, .14, .16, "bandpass", 1900);
  if (s % 2 === 0) noise(tt, s % 4 === 2 ? .05 : .03, .05, "highpass", 7500);
  if (s === 0 || (s === 6 && bar % 2) || (s === 11 && bar % 4 === 3))
    ch.forEach((m, i) => { tone(hz(m), tt + i * .012, .045, 1.4, "triangle"); tone(hz(m) * 2, tt + i * .012, .012, .8, "sine"); });
  if (s === 0 || s === 10) tone(hz(r - 12 + (s ? 7 : 0)), tt, .22, .55, "sine");
  if (s % 2 === 0 && Math.random() < .28) tone(hz(ch[Math.floor(Math.random() * 4)] + 12 + (Math.random() < .3 ? 12 : 0)), tt, .05, .7, "triangle", .005);
  if (Math.random() < .2) noise(tt, .015, .012, "highpass", 3000);
}
function pump() {
  if (!mus || paused) return;
  const d = 60 / TRACKS[tr].bpm / 4;
  while (mus.t < ac.currentTime + .2) {
    step(mus.s, mus.bar, mus.t); mus.t += d;
    if (++mus.s === 16) { mus.s = 0; if (++mus.bar >= 24) return nextTrack(); }
  }
}
function setTrack(i) {
  tr = i; mus.s = 0; mus.bar = 0; mus.t = ac.currentTime + .1;
  mus.rg.gain.setTargetAtTime(TRACKS[i].rain ? .06 : 0, ac.currentTime, 1); $("#npName").textContent = TRACKS[i].n;
}
const nextTrack = () => mus && setTrack((tr + 1) % TRACKS.length);
function togglePause() {
  if (!mus) return; paused = !paused;
  mus.master.gain.setTargetAtTime(paused ? 0 : .8, ac.currentTime, .15); if (!paused) mus.t = ac.currentTime + .1;
  $("#npPause").textContent = paused ? "▶" : "⏸"; $("#np").classList.toggle("paused", paused);
}
function musicOn() {
  $("#np").classList.toggle("hidden", !cfg.music);
  if (mus || !cfg.music) return;
  try { ac = ac || new AudioContext(); } catch { return; }
  ac.resume(); paused = false; $("#npPause").textContent = "⏸"; $("#np").classList.remove("paused");
  const master = ac.createGain(), lp = ac.createBiquadFilter(), bus = ac.createGain(), dl = ac.createDelay(), fb = ac.createGain();
  const nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  lp.type = "lowpass"; lp.frequency.value = 3800; dl.delayTime.value = .3; fb.gain.value = .3; // warm, slightly muffled
  bus.connect(lp); bus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(lp); lp.connect(master); master.connect(ac.destination);
  master.gain.setValueAtTime(0, ac.currentTime); master.gain.linearRampToValueAtTime(.8, ac.currentTime + 2);
  const rs = ac.createBufferSource(), rf = ac.createBiquadFilter(), rg = ac.createGain(); // rain on the window
  rs.buffer = nb; rs.loop = true; rf.type = "lowpass"; rf.frequency.value = 1200; rg.gain.value = 0;
  rs.connect(rf); rf.connect(rg); rg.connect(master); rs.start();
  mus = { master, bus, nb, rg, rs, s: 0, bar: 0, t: 0, id: setInterval(pump, 50) }; setTrack(tr);
}
function musicOff() {
  $("#np").classList.add("hidden"); if (!mus) return;
  const m = mus; mus = null; clearInterval(m.id);
  m.master.gain.cancelScheduledValues(ac.currentTime); m.master.gain.setValueAtTime(m.master.gain.value, ac.currentTime);
  m.master.gain.linearRampToValueAtTime(0, ac.currentTime + 1); setTimeout(() => { m.rs.stop(); m.master.disconnect(); }, 1200);
}
$("#npPause").onclick = togglePause; $("#npNext").onclick = nextTrack;
$("#np").classList.toggle("hidden", !cfg.music); $("#npName").textContent = TRACKS[0].n;
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => cfg.music && musicOn())); // browsers need a tap first

// ---------- game flow ----------
function newGame() {
  clearInterval(tm); clearInterval(bt);
  const m = MODES[cfg.mode], seed = m.seed ? +new Date().toISOString().slice(0, 10).replace(/-/g, "") : 0;
  G = new Game(cfg.size, cfg.mode, rngFor(seed)); B = cfg.bot ? new Game(cfg.size, cfg.mode, rngFor(seed)) : null;
  pend = swapA = null; ended = false; left = m.time || 0; wonShown = false; hint("");
  $("#botBar").classList.toggle("hidden", !B); $("#botBoard").classList.add("hidden");
  build($("#board")); if (B) { build($("#botBoard")); render($("#botBoard"), B); }
  if (m.time) tm = setInterval(() => { if (--left <= 0) finish(); else draw(); }, 1000);
  if (B) bt = setInterval(botStep, cfg.bot === 3 ? 250 : 400);
  draw({ sp: empties(G.g.map((r) => r.map((v) => +!v))).length ? G.g.flatMap((r, i) => r.map((v, j) => (v ? [i, j] : null)).filter(Boolean)) : [] });
}
function botStep() {
  if (!B || B.over || ended) return;
  const d = botDir(B.g, cfg.bot), r = d < 0 ? null : B.move(d);
  if (!r) { B.over = true; toast("🤖 Bot is out of moves"); return; }
  render($("#botBoard"), B, r.tl, r.sp); $("#botScore").textContent = B.score;
}
function doMove(d) {
  if (ended) return;
  pend = swapA = null; hint("");
  const r = G.move(d); if (!r) return;
  draw(r);
  const big = Math.max(0, ...r.merges.map((m) => m.v));
  if (G.combo > 1) toast(`🔥 Combo x${G.combo}` + (r.bonus ? `  +${r.bonus}` : ""));
  if (r.merges.length) beep(220 + Math.min(G.combo, 8) * 60);
  if (cfg.fx && big >= 128) { const b = $("#board"); b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); navigator.vibrate && navigator.vibrate(15); }
  if (G.won && !wonShown) { wonShown = true; toast("🎉 2048! Keep going"); }
  if (G.over) setTimeout(finish, 350);
}
function finish() {
  if (ended) return; ended = true; clearInterval(tm); clearInterval(bt);
  if (B && !G.m.time) { let k = 0; while (!B.over && k++ < 5000) { const d = botDir(B.g, cfg.bot); if (d < 0) break; B.move(d); } }
  draw(); if (B) { render($("#botBoard"), B); $("#botScore").textContent = B.score; }
  let rank = 0;
  if (G.score > 0) {
    const lb = ld("lb2048", []), me = { n: cfg.name, s: G.score, m: `${G.m.n} ${cfg.size}×${cfg.size}` };
    lb.push(me); lb.sort((a, b) => b.s - a.s); rank = lb.indexOf(me) + 1; sv("lb2048", lb.slice(0, 10));
  }
  $("#endT").textContent = G.over ? "Game over" : "Time's up!";
  let txt = `Score ${G.score}` + (rank && rank <= 10 ? `\n#${rank} on your leaderboard` : "");
  if (B) txt += B.score > G.score ? `\n🤖 Bot wins, ${B.score} to ${G.score}` : B.score < G.score ? `\n🏆 You beat the bot, ${G.score} to ${B.score}` : "\nTie with the bot!";
  $("#endP").textContent = txt; $("#mEnd").classList.remove("hidden");
}

// ---------- menu ----------
const closeMenu = () => { $("#menu").classList.remove("open"); $("#scrim").classList.add("hidden"); };
const openMenu = () => { $("#menu").classList.add("open"); $("#scrim").classList.remove("hidden"); };
const SECTIONS = [
  ["Game mode", "mode", Object.entries(MODES).map(([k, m]) => [m.n, k]), newGame],
  ["Challenge a bot", "bot", [["Off", 0], ["Rookie", 1], ["Pro", 2], ["Genius", 3]], newGame],
  ["Board size", "size", [["4×4", 4], ["5×5", 5], ["6×6", 6]], newGame],
  ["Theme", "theme", Object.entries(THEMES).map(([k, n]) => [n, k]), applyTheme],
  ["Effects", "fx", [["Off", false], ["On", true]]],
  ["Music", "music", [["Off", false], ["On", true]], () => (cfg.music ? musicOn() : musicOff())],
  ["Sound effects", "snd", [["Off", false], ["On", true]]],
];
function marks() { document.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", cfg[b._k] === b._v)); }
SECTIONS.forEach(([title, key, opts, fn]) => {
  const h = Object.assign(document.createElement("h3"), { textContent: title }), seg = Object.assign(document.createElement("div"), { className: "seg" });
  opts.forEach(([label, val]) => {
    const b = Object.assign(document.createElement("button"), { textContent: label }); b._k = key; b._v = val;
    b.onclick = () => { cfg[key] = val; sv("s2048", cfg); marks(); fn && fn(); if (fn === newGame) closeMenu(); };
    seg.appendChild(b);
  });
  $("#sections").append(h, seg);
});
function applyTheme() { document.documentElement.dataset.theme = cfg.theme; }
function showLb() {
  const lb = ld("lb2048", []);
  $("#lbList").innerHTML = lb.length ? lb.map((x) => `<li>${x.n.replace(/[<>&"]/g, "")} · <b>${x.s}</b> · ${x.m}</li>`).join("") : "<p>No scores yet. Go play!</p>";
  closeMenu(); $("#mLb").classList.remove("hidden");
}
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => {
  if (e.target === m || e.target.dataset.close !== undefined) m.classList.add("hidden");
}));
$("#name").value = cfg.name; $("#name").oninput = (e) => { cfg.name = e.target.value.trim() || "Player"; sv("s2048", cfg); };
$("#bMenu").onclick = openMenu; $("#scrim").onclick = closeMenu; $("#bNew").onclick = newGame; $("#bLb").onclick = showLb;
$("#again").onclick = () => { $("#mEnd").classList.add("hidden"); newGame(); };
$("#lbClear").onclick = () => { sv("lb2048", []); showLb(); };
$("#botBar").onclick = () => $("#botBoard").classList.toggle("hidden");

// ---------- power-ups ----------
document.querySelector(".tools").onclick = (e) => {
  const b = e.target.closest("button"); if (!b || ended) return;
  const t = b.dataset.t; if (G.p[t] <= 0) return;
  if (t === "undo") { if (G.undo()) draw(); }
  else if (t === "shuffle") { G.shuffle(); draw(); }
  else { pend = pend === t ? null : t; swapA = null; hint(pend === "swap" ? "Tap two tiles to swap them" : pend === "hammer" ? "Tap a tile to remove it" : ""); draw(); }
};
$("#board").onclick = (e) => {
  const t = e.target.closest(".t"); if (!t || !pend || ended) return;
  const i = +t.dataset.r, j = +t.dataset.c;
  if (pend === "hammer") { G.hammer(i, j); pend = null; hint(""); }
  else if (!swapA) swapA = [i, j];
  else if (swapA[0] === i && swapA[1] === j) swapA = null;
  else { G.swap(swapA, [i, j]); pend = swapA = null; hint(""); }
  draw();
};

// ---------- controls ----------
const keys = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, a: 0, d: 1, w: 2, s: 3 };
const busy = () => $("#menu").classList.contains("open") || document.querySelector(".modal:not(.hidden)");
document.addEventListener("keydown", (e) => {
  if (busy()) return;
  if (e.key in keys) { e.preventDefault(); doMove(keys[e.key]); }
  else if (e.key === "z" && (e.ctrlKey || e.metaKey)) document.querySelector('[data-t="undo"]').click();
});
let ts = null;
document.querySelector("main").addEventListener("touchstart", (e) => { ts = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
document.querySelector("main").addEventListener("touchend", (e) => {
  if (!ts || busy()) return; const t = e.changedTouches[0], dx = t.clientX - ts.x, dy = t.clientY - ts.y; ts = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : dy > 0 ? 3 : 2);
});

applyTheme(); marks(); newGame();
