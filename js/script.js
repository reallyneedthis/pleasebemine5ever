/* ============================================================
   EDIT ME — how many flowers fall / how long the drop lasts
   ============================================================ */
const FLOWER_COUNT = 260;
const FLOWER_DROP_MS = 4200; // time before the love screen appears

/* ------------------------------------------------------------
   Screen switching
   ------------------------------------------------------------ */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("is-active"));
  document.getElementById(id).classList.add("is-active");
}

/* ------------------------------------------------------------
   SCREEN 1: flowers falling, then auto-advance to love section
   ------------------------------------------------------------ */
function startFlowerDrop() {
  showScreen("screen-flowers");
  const field = document.getElementById("flower-field");
  const continueButton = document.getElementById("flowers-continue");
  field.innerHTML = "";

  const flowerFiles = ["flower-1.png", "flower-2.png", "flower-3.png", "flower-4.png", "flower-5.png"];

  for (let i = 0; i < FLOWER_COUNT; i++) {
    const img = document.createElement("img");
    img.src = flowerFiles[i % flowerFiles.length];
    img.className = "falling-flower";
    img.alt = "";

    const left = Math.random() * 100;
    const size = 42 + Math.random() * 60;
    const duration = 1.4 + Math.random() * 1.2;
    const delay = Math.random() * 1.2;

    img.style.left = `${left}vw`;
    img.style.width = `${size}px`;
    img.style.animationDuration = `${duration}s`;
    img.style.animationDelay = `${delay}s`;

    field.appendChild(img);
  }

  setTimeout(() => {
    continueButton.classList.add("show");
  }, FLOWER_DROP_MS);

  continueButton.addEventListener("click", () => {
    showScreen("screen-love");
    if (window.initLoveHeart) window.initLoveHeart();
  }, { once: true });

  setTimeout(() => showScreen("screen-gallery"), FLOWER_DROP_MS + 12000);
}

/* ------------------------------------------------------------
   Called by gallery.js once the visitor is done walking the
   gallery (all paintings seen, or they crack the passcode).
   Sends them to the folders page, which then branches out to
   wordle.html, final.html, or card.html.
   ------------------------------------------------------------ */
function finishGalleryAndStartWordle() {
  window.location.href = "folders.html";
}
window.finishGalleryAndStartWordle = finishGalleryAndStartWordle;

window.addEventListener("DOMContentLoaded", () => {
  startFlowerDrop();
});
