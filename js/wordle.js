/* ============================================================
   EDIT ME — the love-word list
   Every word must be exactly 5 letters. The game picks one at
   random each time the page loads. Add as many as you want.
   ============================================================ */
const WORD_LIST = [
  "HEART", "ADORE", "SWEET", "AMORE", "CUPID",
  "BLISS", "CRUSH", "TRYST", "VOWED", "WOOED",
  "FLAME", "FANCY", "YEARN", "LOVED", "LOVER",
  "MARRY", "UNION", "DOTED", "SMOOCH".slice(0,5), "CHARM"
].filter(w => w.length === 5);

let target = "";
let row = 0;
let col = 0;
let guesses = [];
let gameOver = false;

const board = document.getElementById("board");
const keyboard = document.getElementById("keyboard");
const msgEl = document.getElementById("wordle-msg");
const continueBtn = document.getElementById("wordle-continue-btn");

// EDIT ME — where "see what's next" goes once the puzzle is done
const NEXT_PAGE = "final.html";
continueBtn.addEventListener("click", () => {
  window.location.href = NEXT_PAGE;
});

/* ------------------------------------------------------------
   Align the wordle box to the blank parchment panel on
   assets/wordle-bg.jpg (the newspaper graphic). The panel sits
   at roughly these proportions of the source image — measured
   from the 1366x768 original, panel at (696,22) sized 624x723.
   Recalculated on load/resize so it lines up at any screen size.
   If the background image is missing, this just leaves the box
   in its normal centered layout (see .wordle-wrap in style.css).
   ------------------------------------------------------------ */
const WORDLE_PANEL = { left: 696 / 1366, top: 22 / 768, width: 624 / 1366, height: 723 / 768 };

function positionWordleBox() {
  const img = document.getElementById("wordle-bg-img");
  const box = document.getElementById("wordle-wrap");
  const wrap = document.getElementById("wordle-bg-wrap");
  if (!img || !box || !wrap || !img.complete || !img.naturalWidth) return;

  const rect = img.getBoundingClientRect();
  const boxHeightPx = WORDLE_PANEL.height * rect.height;

  // not enough vertical room to fit the whole puzzle inside the
  // parchment panel (typical on narrow/tall phone screens) — fall
  // back to a full-bleed cover background with the normal centered
  // layout instead of a cramped, scrollable box
  const MIN_BOX_HEIGHT = 480;
  if (boxHeightPx < MIN_BOX_HEIGHT) {
    box.classList.remove("positioned");
    box.style.left = box.style.top = box.style.width = box.style.height = "";
    wrap.classList.add("cover-mode");
    return;
  }

  wrap.classList.remove("cover-mode");
  box.classList.add("positioned");
  box.style.left = `${rect.left + WORDLE_PANEL.left * rect.width}px`;
  box.style.top = `${rect.top + WORDLE_PANEL.top * rect.height}px`;
  box.style.width = `${WORDLE_PANEL.width * rect.width}px`;
  box.style.height = `${WORDLE_PANEL.height * rect.height}px`;
}

(function initWordleBg() {
  const img = document.getElementById("wordle-bg-img");
  if (!img) return;
  if (img.complete && img.naturalWidth) positionWordleBox();
  img.addEventListener("load", positionWordleBox);
  img.addEventListener("error", () => {
    // background image not found — leave the box in its normal
    // centered layout instead of trying to position it
  });
  window.addEventListener("resize", positionWordleBox);
})();

const KEY_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["ENTER", ..."ZXCVBNM".split(""), "DEL"]
];

function initWordle() {
  target = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  row = 0; col = 0; guesses = []; gameOver = false;

  board.innerHTML = "";
  for (let r = 0; r < 6; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "board-row";
    for (let c = 0; c < 5; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      rowEl.appendChild(tile);
    }
    board.appendChild(rowEl);
  }

  keyboard.innerHTML = "";
  KEY_ROWS.forEach(krow => {
    const rEl = document.createElement("div");
    rEl.className = "keyboard-row";
    krow.forEach(k => {
      const btn = document.createElement("button");
      btn.className = "key" + (k.length > 1 ? " wide" : "");
      btn.textContent = k === "DEL" ? "⌫" : k;
      btn.dataset.key = k;
      btn.addEventListener("click", () => handleKey(k));
      rEl.appendChild(btn);
    });
    keyboard.appendChild(rEl);
  });

  document.addEventListener("keydown", physicalKeydown);
}

function physicalKeydown(e) {
  if (gameOver) return;
  if (e.key === "Enter") handleKey("ENTER");
  else if (e.key === "Backspace") handleKey("DEL");
  else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
}

function currentRowTiles() {
  return board.children[row].children;
}

function handleKey(k) {
  if (gameOver) return;

  if (k === "DEL") {
    if (col > 0) {
      col--;
      currentRowTiles()[col].textContent = "";
      currentRowTiles()[col].classList.remove("filled");
    }
    return;
  }

  if (k === "ENTER") {
    if (col < 5) {
      flashMsg("not enough letters");
      return;
    }
    submitGuess();
    return;
  }

  if (col < 5) {
    currentRowTiles()[col].textContent = k;
    currentRowTiles()[col].classList.add("filled", "pop");
    setTimeout(() => currentRowTiles()[col].classList.remove("pop"), 150);
    col++;
  }
}

function submitGuess() {
  const tiles = currentRowTiles();
  const guess = Array.from(tiles).map(t => t.textContent).join("");
  guesses.push(guess);

  const targetLetters = target.split("");
  const result = new Array(5).fill("wrong");
  const used = new Array(5).fill(false);

  // pass 1: correct
  for (let i = 0; i < 5; i++) {
    if (guess[i] === targetLetters[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  // pass 2: present
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    const idx = targetLetters.findIndex((l, j) => l === guess[i] && !used[j]);
    if (idx !== -1) {
      result[i] = "present";
      used[idx] = true;
    }
  }

  result.forEach((state, i) => {
    setTimeout(() => {
      tiles[i].classList.add(state);
      updateKeyState(guess[i], state);
    }, i * 180);
  });

  const won = guess === target;

  setTimeout(() => {
    if (won) {
      gameOver = true;
      flashMsg("that's the one 💛");
      continueBtn.classList.add("show");
    } else if (row === 5) {
      gameOver = true;
      flashMsg(`it was "${target}"`);
      continueBtn.classList.add("show");
    } else {
      row++;
      col = 0;
    }
  }, 5 * 180 + 100);
}

function updateKeyState(letter, state) {
  const btn = keyboard.querySelector(`[data-key="${letter}"]`);
  if (!btn) return;
  // don't downgrade a key that's already marked correct
  if (btn.classList.contains("correct")) return;
  if (state === "present" && btn.classList.contains("present")) return;
  btn.classList.remove("wrong", "present", "correct");
  btn.classList.add(state);
}

let msgTimeout;
function flashMsg(text) {
  msgEl.textContent = text;
  clearTimeout(msgTimeout);
  if (!gameOver) {
    msgTimeout = setTimeout(() => { msgEl.textContent = ""; }, 1400);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initWordle();
});
