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
const cfg = { theme: "cream", size: 4, mode: "classic", lvl: 2, fx: true, snd: false, name: "Player", ...ld("s2048", {}) };

// seeded random so the Daily mode is the same for everyone today
const rngFor = (seed) => { if (!seed) return Math.random; let a = seed;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

// ---------- core logic (pure functions) ----------
function slideRow(row, n) {
  const t = row.filter(Boolean), o = [], m = []; let s = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === t[i + 1]) { o.push(t[i] * 2); s += t[i] * 2; m.push(o.length - 1); i++; } else o.push(t[i]);
  }
  while (o.length < n) o.push(0);
  return { o, s, m };
}
// d: 0 left, 1 right, 2 up, 3 down. Every direction is turned into "slide left".
function apply(g, d) {
  const n = g.length, v = d > 1, rv = d % 2 === 1;
  let t = v ? g[0].map((_, c) => g.map((r) => r[c])) : g.map((r) => r.slice());
  if (rv) t = t.map((r) => r.reverse());
  let s = 0, mv = false; const mg = [];
  t = t.map((r, i) => {
    const x = slideRow(r, n);
    if (x.o.some((a, k) => a !== r[k])) mv = true;
    s += x.s;
    x.m.forEach((c) => { const cc = rv ? n - 1 - c : c; mg.push(v ? [cc, i] : [i, cc]); });
    return x.o;
  });
  if (rv) t = t.map((r) => r.reverse());
  if (v) t = t[0].map((_, c) => t.map((r) => r[c]));
  return { g: t, s, mv, mg };
}
const canMove = (g) => [0, 1, 2, 3].some((d) => apply(g, d).mv);
const empties = (g) => g.flatMap((r, i) => r.map((v, j) => (v ? null : [i, j])).filter(Boolean));

class Game {
  constructor(size, mode, rng) {
    this.size = size; this.m = MODES[mode]; this.rng = rng;
    this.g = Array.from({ length: size }, () => Array(size).fill(0));
    this.score = 0; this.combo = 0; this.hist = []; this.over = false; this.won = false;
    this.p = { ...this.m.p };
    this.spawn(); this.spawn();
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
    this.hist.push({ g: this.g, score: this.score, combo: this.combo });
    if (this.hist.length > 50) this.hist.shift();
    this.combo = r.mg.length ? this.combo + 1 : 0;
    const bonus = this.combo > 1 ? Math.round(r.s * Math.min(this.combo - 1, 5) * 0.1) : 0;
    this.g = r.g; this.score += r.s + bonus;
    const sp = []; for (let k = 0; k < this.m.spawn; k++) { const c = this.spawn(); if (c) sp.push(c); }
    if (this.g.some((row) => row.includes(2048))) this.won = true;
    this.over = !canMove(this.g);
    return { sp, mg: r.mg, bonus };
  }
  undo() {
    if (!this.p.undo || !this.hist.length) return false;
    const h = this.hist.pop(); this.g = h.g; this.score = h.score; this.combo = h.combo;
    this.p.undo--; this.over = false; return true;
  }
  hammer(i, j) { this.g[i][j] = 0; this.p.hammer--; }
  swap(a, b) { const t = this.g[a[0]][a[1]]; this.g[a[0]][a[1]] = this.g[b[0]][b[1]]; this.g[b[0]][b[1]] = t; this.p.swap--; }
  shuffle() {
    const f = this.g.flat();
    for (let i = f.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [f[i], f[j]] = [f[j], f[i]]; }
    this.g = Array.from({ length: this.size }, (_, i) => f.slice(i * this.size, (i + 1) * this.size));
    this.p.shuffle--;
  }
}

// ---------- the bot ----------
// Likes big tiles lined up along a "snake" path from a corner, and lots of empty cells.
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
    if (lvl === 3) { // look one move further ahead on a few random spawns
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

// ---------- state ----------
let G, B, race = false, pend = null, swapA = null, ended = false, left = 0, tm, bt, ac;

function beep(f) {
  if (!cfg.snd) return;
  try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; g.gain.value = .05; o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .15); o.stop(ac.currentTime + .15); } catch {}
}
function flash(t) { $("#hint").textContent = t; clearTimeout(flash.t); if (t) flash.t = setTimeout(() => ($("#hint").textContent = ""), 3000); }

function build(el) {
  el.style.setProperty("--size", cfg.size); el.innerHTML = "";
  for (let i = 0; i < cfg.size ** 2; i++) el.appendChild(Object.assign(document.createElement("div"), { className: "cell" }));
}
function drawBoard(el, game, sp = [], mg = []) {
  const n = game.size, has = (a, i, j) => a.some((x) => x[0] === i && x[1] === j);
  [...el.children].forEach((c, k) => {
    const i = (k / n) | 0, j = k % n, v = game.g[i][j];
    c.className = "cell"; c.textContent = v || "";
    if (v) { const l = Math.log2(v); c.dataset.n = l; c.dataset.d = String(v).length; c.style.setProperty("--n", l); if (v >= 512) c.classList.add("glow"); }
    else { delete c.dataset.n; delete c.dataset.d; }
    if (has(sp, i, j)) c.classList.add("pop");
    if (has(mg, i, j)) c.classList.add("mrg");
    if (el.id === "board" && swapA && swapA[0] === i && swapA[1] === j) c.classList.add("sel");
  });
}
const bestKey = () => `best-${cfg.mode}-${cfg.size}`;
function draw(sp, mg) {
  drawBoard($("#board"), G, sp, mg);
  let best = ld(bestKey(), 0); if (G.score > best) { best = G.score; sv(bestKey(), best); }
  $("#score").textContent = G.score; $("#best").textContent = best; $("#youScore").textContent = G.score;
  if (B) $("#botScore").textContent = B.score;
  if (G.m.time) $("#timer").textContent = "⏱ " + left + "s";
  document.querySelectorAll(".tools button").forEach((b) => {
    const t = b.dataset.t, n = G.p[t]; b.querySelector("i").textContent = n > 90 ? "∞" : n;
    b.disabled = n <= 0 || ended; b.classList.toggle("act", pend === t);
  });
}

function newGame() {
  clearInterval(tm); clearInterval(bt);
  const m = MODES[cfg.mode], seed = m.seed ? +new Date().toISOString().slice(0, 10).replace(/-/g, "") : 0;
  G = new Game(cfg.size, cfg.mode, rngFor(seed)); B = race ? new Game(cfg.size, cfg.mode, rngFor(seed)) : null;
  pend = swapA = null; ended = false; left = m.time || 0;
  $("#timer").classList.toggle("hidden", !m.time); $("#botPanel").classList.toggle("hidden", !race);
  $("#bBot").classList.toggle("on", race); $("#combo").textContent = "";
  build($("#board")); if (race) { build($("#botBoard")); drawBoard($("#botBoard"), B); }
  if (m.time) tm = setInterval(() => { left--; if (left <= 0) finish(); else draw(); }, 1000);
  if (race) bt = setInterval(botStep, cfg.lvl === 3 ? 250 : 400);
  draw(G.spawnList, []);
}
function botStep() {
  if (!B || B.over || ended) return;
  const d = botDir(B.g, +cfg.lvl), r = d < 0 ? null : B.move(d);
  if (!r) B.over = true;
  drawBoard($("#botBoard"), B, r ? r.sp : [], r ? r.mg : []); $("#botScore").textContent = B.score;
  if (B.over) flash("🤖 The bot is out of moves!");
}

function doMove(d) {
  if (ended) return;
  pend = swapA = null;
  const r = G.move(d); if (!r) return;
  draw(r.sp, r.mg);
  $("#combo").textContent = G.combo > 1 ? `🔥 COMBO x${G.combo}${r.bonus ? " (+" + r.bonus + ")" : ""}` : "";
  if (r.mg.length) beep(220 + Math.min(G.combo, 8) * 60);
  if (cfg.fx && r.mg.some(([i, j]) => G.g[i][j] >= 128)) { const b = $("#board"); b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); }
  if (G.won && !doMove.w) { doMove.w = true; flash("🎉 2048! Keep going for a higher score"); }
  if (G.over) finish();
}
function finish() {
  if (ended) return; ended = true; doMove.w = false;
  clearInterval(tm); clearInterval(bt);
  if (B && !G.m.time) { let k = 0; while (!B.over && k++ < 5000) { const d = botDir(B.g, +cfg.lvl); if (d < 0) break; B.move(d); } }
  draw(); if (B) drawBoard($("#botBoard"), B); if (B) $("#botScore").textContent = B.score;
  let rank = 0;
  if (G.score > 0) {
    const lb = ld("lb2048", []); const me = { n: cfg.name, s: G.score, m: `${G.m.n} ${cfg.size}×${cfg.size}`, t: Date.now() };
    lb.push(me); lb.sort((a, b) => b.s - a.s); rank = lb.indexOf(me) + 1; sv("lb2048", lb.slice(0, 10));
  }
  $("#endT").textContent = G.over ? "Game over" : "Time's up!";
  let txt = `Score: ${G.score}` + (rank && rank <= 10 ? ` · #${rank} on the leaderboard!` : "");
  if (B) txt += B.score > G.score ? `\n🤖 Bot wins ${B.score} to ${G.score}` : B.score < G.score ? `\n🏆 You beat the bot! ${G.score} to ${B.score}` : "\nIt's a tie!";
  $("#endP").style.whiteSpace = "pre-line"; $("#endP").textContent = txt; openM("mEnd");
}

// ---------- menus ----------
const openM = (id) => $("#" + id).classList.remove("hidden");
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => {
  if (e.target === m || e.target.dataset.close !== undefined) m.classList.add("hidden");
}));
function applyTheme() {
  document.documentElement.dataset.theme = cfg.theme;
  document.querySelectorAll("#themes button").forEach((b) => b.classList.toggle("on", b.dataset.th === cfg.theme));
}
function showLb() {
  const lb = ld("lb2048", []);
  $("#lbList").innerHTML = lb.length ? lb.map((x) => `<li>${x.n.replace(/[<>&]/g, "")} · <b>${x.s}</b> · ${x.m}</li>`).join("") : "<p>No scores yet. Go play!</p>";
  openM("mLb");
}
Object.entries(MODES).forEach(([k, m]) => $("#mode").add(new Option(m.n, k)));
Object.entries(THEMES).forEach(([k, n]) => { const b = Object.assign(document.createElement("button"), { textContent: n }); b.dataset.th = k; $("#themes").appendChild(b); });
$("#themes").onclick = (e) => { const t = e.target.dataset.th; if (t) { cfg.theme = t; sv("s2048", cfg); applyTheme(); } };
$("#mode").value = cfg.mode; $("#size").value = cfg.size; $("#lvl").value = cfg.lvl;
$("#fx").checked = cfg.fx; $("#snd").checked = cfg.snd; $("#name").value = cfg.name;
const bind = (id, key, fn) => $("#" + id).addEventListener("change", (e) => {
  cfg[key] = e.target.type === "checkbox" ? e.target.checked : isNaN(e.target.value) ? e.target.value : +e.target.value;
  sv("s2048", cfg); fn && fn();
});
bind("mode", "mode", newGame); bind("size", "size", newGame); bind("lvl", "lvl"); bind("fx", "fx"); bind("snd", "snd");
$("#name").addEventListener("input", (e) => { cfg.name = e.target.value.trim() || "Player"; sv("s2048", cfg); });
$("#bSet").onclick = () => openM("mSet"); $("#bLb").onclick = showLb; $("#bNew").onclick = newGame;
$("#again").onclick = () => { $("#mEnd").classList.add("hidden"); newGame(); };
$("#lbClear").onclick = () => { sv("lb2048", []); showLb(); };
$("#bBot").onclick = () => { race = !race; newGame(); };

// ---------- power-ups ----------
document.querySelector(".tools").onclick = (e) => {
  const b = e.target.closest("button"); if (!b || ended) return;
  const t = b.dataset.t; if (G.p[t] <= 0) return;
  if (t === "undo") { if (G.undo()) draw(); }
  else if (t === "shuffle") { G.shuffle(); draw(); }
  else { pend = pend === t ? null : t; swapA = null; flash(pend === "swap" ? "Tap two tiles to swap them" : pend === "hammer" ? "Tap a tile to remove it" : ""); draw(); }
};
$("#board").onclick = (e) => {
  const c = e.target.closest(".cell"); if (!c || !pend || ended) return;
  const k = [...$("#board").children].indexOf(c), i = (k / G.size) | 0, j = k % G.size;
  if (!G.g[i][j]) return;
  if (pend === "hammer") { G.hammer(i, j); pend = null; }
  else if (!swapA) swapA = [i, j];
  else if (swapA[0] === i && swapA[1] === j) swapA = null;
  else { G.swap(swapA, [i, j]); pend = swapA = null; }
  draw();
};

// ---------- controls ----------
const keys = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3, a: 0, d: 1, w: 2, s: 3 };
document.addEventListener("keydown", (e) => {
  if (document.querySelector(".modal:not(.hidden)")) return;
  if (e.key in keys) { e.preventDefault(); doMove(keys[e.key]); }
  else if (e.key === "z" && (e.ctrlKey || e.metaKey)) document.querySelector('[data-t="undo"]').click();
});
let ts = null;
$("#board").addEventListener("touchstart", (e) => { ts = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
$("#board").addEventListener("touchend", (e) => {
  if (!ts) return; const t = e.changedTouches[0], dx = t.clientX - ts.x, dy = t.clientY - ts.y; ts = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : dy > 0 ? 3 : 2);
});

applyTheme(); newGame();
