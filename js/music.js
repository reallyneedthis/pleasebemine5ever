(function initMusicPlayer() {
  const defaultAudio = document.createElement("audio");
  const player = document.createElement("button");
  const source = document.createElement("source");
  let activeAudio = defaultAudio;
  let wasPlayingBeforeVideo = false;
  let userStartedMusic = false;
  let userPausedMusic = false;
  let currentTrack = "";

  defaultAudio.id = "background-music";
  defaultAudio.preload = "auto";
  defaultAudio.autoplay = true;
  defaultAudio.loop = true;
  source.type = "audio/mpeg";
  defaultAudio.appendChild(source);

  player.type = "button";
  player.id = "music-player";
  player.className = "music-player";
  player.setAttribute("aria-label", "play music");
  player.setAttribute("aria-pressed", "false");
  player.innerHTML = '<span class="music-disc" aria-hidden="true"><span class="music-label">music</span></span>';
  document.body.append(defaultAudio, player);

  function syncPlayerState() {
    const playing = !activeAudio.paused && !activeAudio.muted;
    player.classList.toggle("is-playing", playing);
    player.setAttribute("aria-label", playing ? "pause music" : "play music");
    player.setAttribute("aria-pressed", String(playing));
  }

  function playMusic(fromUser = false) {
    if (!currentTrack) return Promise.resolve();
    if (fromUser) {
      userStartedMusic = true;
      userPausedMusic = false;
      activeAudio.muted = false;
    }
    return activeAudio.play().catch(() => {});
  }

  function tryAutoplay() {
    if (!userPausedMusic) playMusic();
  }

  function getTrackForPage() {
    const activeScreen = document.querySelector(".screen.is-active");
    const activeGallery = activeScreen?.querySelector("#gallery-3d.is-active");
    if (activeScreen?.id === "screen-gallery" && !activeGallery) return currentTrack;
    const screenTrack = activeGallery?.dataset.music || activeScreen?.dataset.music;
    return screenTrack || document.body.dataset.music || "";
  }

  function getAudioForScreen() {
    const activeScreen = document.querySelector(".screen.is-active");
    return activeScreen?.querySelector("#gallery-3d.is-active [data-music-audio]") || defaultAudio;
  }

  function getTrackLoopSetting() {
    const activeScreen = document.querySelector(".screen.is-active");
    return activeScreen?.dataset.musicLoop !== "false";
  }

  function switchTrack(track) {
    const nextAudio = getAudioForScreen();
    if (track === currentTrack && nextAudio === activeAudio) return;

    const shouldResume = userStartedMusic && !activeAudio.paused;
    activeAudio.pause();
    activeAudio = nextAudio;
    currentTrack = track;
    activeAudio.loop = getTrackLoopSetting();

    if (!track) {
      if (activeAudio === defaultAudio) source.removeAttribute("src");
      else activeAudio.removeAttribute("src");
      activeAudio.load();
      syncPlayerState();
      return;
    }

    if (activeAudio === defaultAudio) {
      source.src = track;
      defaultAudio.load();
    } else {
      activeAudio.src = track;
      activeAudio.load();
    }

    if (shouldResume || !userPausedMusic) tryAutoplay();
  }

  player.addEventListener("click", () => {
    if (activeAudio.paused || activeAudio.muted) playMusic(true);
    else {
      userPausedMusic = true;
      activeAudio.pause();
    }
  });

  document.addEventListener("play", (event) => {
    if (event.target instanceof HTMLAudioElement) syncPlayerState();
    if (!(event.target instanceof HTMLVideoElement)) return;
    wasPlayingBeforeVideo = !activeAudio.paused;
    activeAudio.pause();
  }, true);

  document.addEventListener("pause", (event) => {
    if (event.target instanceof HTMLAudioElement) syncPlayerState();
    if (!(event.target instanceof HTMLVideoElement)) return;
    const anotherVideoIsPlaying = [...document.querySelectorAll("video")]
      .some((video) => !video.paused && !video.ended);
    if (!anotherVideoIsPlaying && wasPlayingBeforeVideo) playMusic();
  }, true);

  document.addEventListener("pointerdown", (event) => {
    if (!player.contains(event.target) && (activeAudio.paused || activeAudio.muted)) playMusic(true);
  });

  switchTrack(getTrackForPage());
  new MutationObserver(() => switchTrack(getTrackForPage()))
    .observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
})();