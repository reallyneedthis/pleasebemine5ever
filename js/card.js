/* ------------------------------------------------------------
   card.html — tap the card to flip it open, with a little
   confetti burst the first time it opens.
   ------------------------------------------------------------ */
(function () {
  const card = document.getElementById("bday-card");
  const confettiField = document.getElementById("confetti-field");
  if (!card) return;

  const CONFETTI_COLORS = ["#c9a15a", "#e8b4bc", "#f5ecdf", "#8c6f8f", "#b8923f"];
  let hasOpened = false;

  function burstConfetti() {
    if (!confettiField) return;
    const count = 60;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.borderRadius = Math.random() < 0.5 ? "50%" : "2px";
      confettiField.appendChild(piece);
      setTimeout(() => piece.remove(), 4200);
    }
  }

  const setOpen = (isOpen) => {
    card.classList.toggle("is-open", isOpen);
    card.setAttribute("aria-label", isOpen ? "close the card" : "open the card");
  };

  card.addEventListener("click", (event) => {
    const clickedFront = event.target.closest(".bday-card-front");
    const clickedBack = event.target.closest(".bday-card-back");
    if (clickedFront) setOpen(true);
    if (clickedBack) setOpen(false);

    if (clickedFront && !hasOpened) {
      hasOpened = true;
      burstConfetti();
    }
  });
})();
