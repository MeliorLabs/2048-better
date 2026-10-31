// 2048 Better - plain JavaScript, no libraries.
const SIZE = 4;

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const undoBtn = document.getElementById("undo");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlay-text");
const overlayBtn = document.getElementById("overlay-btn");

let grid, score, best, history, keepPlaying;

// ---------- saving (wrapped in try/catch in case storage is blocked) ----------
function loadBest() {
  try { return Number(localStorage.getItem("best2048")) || 0; } catch { return 0; }
}
function saveBest() {
  try { localStorage.setItem("best2048", best); } catch {}
}

// ---------- helpers ----------
const copy = (g) => g.map((row) => row.slice());
const transpose = (g) => g[0].map((_, c) => g.map((row) => row[c]));

// Slide one row to the left and merge equal neighbours once.
function slide(row) {
  const tiles = row.filter(Boolean);
  const out = [];
  const merged = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2);
      gained += tiles[i] * 2;
      merged.push(out.length - 1);
      i++; // skip the tile we just merged
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  return { row: out, gained, merged };
}

function addRandomTile() {
  const empty = [];
  grid.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
  if (!empty.length) return null;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return [r, c];
}

function canMove() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return true;
      if (grid[r][c] === grid[r][c + 1]) return true;
      if (r < SIZE - 1 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

// ---------- game ----------
function newGame() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  score = 0;
  history = [];
  keepPlaying = false;
  overlay.classList.add("hidden");
  addRandomTile();
  const first = addRandomTile();
  render(first, []);
}

function move(dir) {
  const vertical = dir === "up" || dir === "down";
  const reverse = dir === "right" || dir === "down";

  // Turn every direction into "slide left" so we only write the logic once.
  let g = vertical ? transpose(grid) : copy(grid);
  if (reverse) g = g.map((row) => row.reverse());

  let gained = 0;
  let moved = false;
  const mergedCells = [];

  let result = g.map((row, r) => {
    const s = slide(row);
    if (s.row.some((v, i) => v !== row[i])) moved = true;
    gained += s.gained;
    s.merged.forEach((c) => {
      const cc = reverse ? SIZE - 1 - c : c;
      mergedCells.push(vertical ? [cc, r] : [r, cc]);
    });
    return s.row;
  });

  if (!moved) return;

  // Undo the transforms
  if (reverse) result = result.map((row) => row.reverse());
  if (vertical) result = transpose(result);

  history.push({ grid: copy(grid), score });
  if (history.length > 50) history.shift();

  grid = result;
  score += gained;
  if (score > best) { best = score; saveBest(); }

  const spawned = addRandomTile();
  render(spawned, mergedCells);
  checkEnd();
}

function undo() {
  const last = history.pop();
  if (!last) return;
  grid = last.grid;
  score = last.score;
  overlay.classList.add("hidden");
  render(null, []);
}

function checkEnd() {
  if (!keepPlaying && grid.some((row) => row.includes(2048))) {
    showOverlay("You win! 🎉", "Keep going", () => {
      keepPlaying = true;
      overlay.classList.add("hidden");
    });
  } else if (!canMove()) {
    showOverlay("Game over", "Try again", newGame);
  }
}

function showOverlay(text, buttonText, onClick) {
  overlayText.textContent = text;
  overlayBtn.textContent = buttonText;
  overlayBtn.onclick = onClick;
  overlay.classList.remove("hidden");
}

// ---------- drawing ----------
function buildBoard() {
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    boardEl.appendChild(cell);
  }
}

function render(spawned, mergedCells) {
  const cells = boardEl.children;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c];
      const el = cells[r * SIZE + c];
      el.textContent = v || "";
      el.className = "cell" + (v ? " " + (v <= 2048 ? "v" + v : "vbig") : "");
      if (spawned && spawned[0] === r && spawned[1] === c) el.classList.add("pop");
      if (mergedCells.some(([mr, mc]) => mr === r && mc === c)) el.classList.add("merge");
    }
  }
  scoreEl.textContent = score;
  bestEl.textContent = best;
  undoBtn.disabled = history.length === 0;
}

// ---------- controls ----------
const keys = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  a: "left", d: "right", w: "up", s: "down",
};

document.addEventListener("keydown", (e) => {
  const dir = keys[e.key];
  if (dir) {
    e.preventDefault(); // stops the page from scrolling
    move(dir);
  } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
    undo();
  }
});

let touchStart = null;
boardEl.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

boardEl.addEventListener("touchend", (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return; // too small, ignore
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
  else move(dy > 0 ? "down" : "up");
});

document.getElementById("restart").addEventListener("click", newGame);
undoBtn.addEventListener("click", undo);

// ---------- start ----------
best = loadBest();
buildBoard();
newGame();
