/* ------------------------------------------------------------
   Align the caption + video box to the blank panel on
   assets/final-bg.jpg. The panel sits at roughly these
   proportions of the source image — measured from the 1366x768
   original, panel at (98,85) sized 1158x614. Recalculated on
   load/resize so it lines up at any screen size.
   The background image is displayed with object-fit: cover (it
   fills the whole viewport, cropped rather than letterboxed), so
   the math below mirrors that scaling manually — the element's
   own bounding box is just the viewport, not the image's actual
   rendered size, so we compute the cover scale/offset from
   naturalWidth/naturalHeight ourselves. If the background image
   is missing, this just leaves the box in its normal centered
   layout (see .final-wrap in style.css).
   ------------------------------------------------------------ */
const FINAL_PANEL = { left: 98 / 1366, top: 85 / 768, width: 1158 / 1366, height: 614 / 768 };

function positionFinalBox() {
  const img = document.getElementById("final-bg-img");
  const wrap = document.getElementById("final-bg-wrap");
  const box = document.getElementById("final-wrap");
  if (!img || !wrap || !box || !img.complete || !img.naturalWidth) return;

  const wrapRect = wrap.getBoundingClientRect();
  const scale = Math.max(wrapRect.width / img.naturalWidth, wrapRect.height / img.naturalHeight);
  const renderedW = img.naturalWidth * scale;
  const renderedH = img.naturalHeight * scale;
  const offsetX = wrapRect.left + (wrapRect.width - renderedW) / 2;
  const offsetY = wrapRect.top + (wrapRect.height - renderedH) / 2;

  box.classList.add("positioned");
  box.style.left = `${offsetX + FINAL_PANEL.left * renderedW}px`;
  box.style.top = `${offsetY + FINAL_PANEL.top * renderedH}px`;
  box.style.width = `${FINAL_PANEL.width * renderedW}px`;
  box.style.height = `${FINAL_PANEL.height * renderedH}px`;
}

(function initFinalBg() {
  const img = document.getElementById("final-bg-img");
  if (!img) return;
  if (img.complete && img.naturalWidth) positionFinalBox();
  img.addEventListener("load", positionFinalBox);
  img.addEventListener("error", () => {
    // background image not found — leave the box in its normal
    // centered layout instead of trying to position it
  });
  window.addEventListener("resize", positionFinalBox);
})();

/* ------------------------------------------------------------
   play button on the poster overlay — the video no longer
   autoplays, so this is what actually starts it. Tapping the
   video again while it's playing pauses it and brings the poster
   (with the caption + play button) back so it can be replayed.
   ------------------------------------------------------------ */
(function initFinalVideo() {
  const video = document.getElementById("final-video");
  const poster = document.getElementById("final-poster");
  const playBtn = document.getElementById("final-play-btn");
  if (!video || !poster || !playBtn) return;

  const play = () => video.play().catch(() => {});

  playBtn.addEventListener("click", play);
  poster.addEventListener("click", (e) => {
    if (e.target === poster) play();
  });
  video.addEventListener("click", () => {
    if (!video.paused) video.pause();
  });
  video.addEventListener("play", () => poster.classList.add("is-hidden"));
  video.addEventListener("pause", () => poster.classList.remove("is-hidden"));
})();
