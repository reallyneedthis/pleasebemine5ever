/* ============================================================
   EDIT ME — your slides
   Each entry becomes one painting hung in the gallery. Give it
   a name, a photo, and a video file. Put photos in assets/photos/
   and videos in assets/videos/, named after the person (all
   lowercase, e.g. "shreya.jpg" / "shreya.mp4") — matching the
   paths below makes this easy to scan. The photo hangs in the
   frame; clicking it plays the video. If a photo file is missing
   (or fails to load), that frame just shows a placeholder plaque
   instead (nothing breaks).
   video accepts .mp4, .mov, .webm, or .ogg — just point to the
   file, extension and all, e.g. "assets/videos/name.mov". You can
   also give an array of fallbacks, e.g.
   video: ["assets/videos/name.mp4", "assets/videos/name.mov"],
   and the browser will play whichever one it supports.
   Paintings are hung in order, alternating left/right wall as
   you walk further into the room.
   ============================================================ */
const SLIDES = [
  {
    title: "reel one",
    entries: [
      { name: "Shreya", photo: ["assets/photos/shreya.jpg", "assets/photos/shreya.JPG"], video: ["assets/videos/shreya.mp4", "assets/videos/shreya.mov"] },
      { name: "Ritika", photo: ["assets/photos/ritika.jpg", "assets/photos/ritika.JPG"], video: ["assets/videos/ritika.mp4", "assets/videos/ritika.mov"] },
      { name: "Ananya", photo: ["assets/photos/ananya.jpg", "assets/photos/ananya.JPG"], video: ["assets/videos/ananya.mp4", "assets/videos/ananya.mov"] },
      { name: "Pavitra", photo: ["assets/photos/pavitra.jpg", "assets/photos/pavitra.JPG"], video: ["assets/videos/pavitra.mp4", "assets/videos/pavitra.mov"] },
      { name: "Soumya", photo: ["assets/photos/soumya.jpg", "assets/photos/soumya.JPG"], video: ["assets/videos/soumya.mp4", "assets/videos/soumya.mov"] },
    ],
  },
  {
    title: "reel two",
    entries: [
      { name: "Vedansh", photo: ["assets/photos/vedansh.jpg", "assets/photos/vedansh.JPG"], video: ["assets/videos/vedansh.mp4", "assets/videos/vedansh.mov"] },
      { name: "Swarnica", photo: ["assets/photos/swarnica.jpg", "assets/photos/swarnica.JPG"], video: ["assets/videos/swarnica.mp4", "assets/videos/swarnica.mov"] },
      { name: "Khushi", photo: ["assets/photos/khushi.jpg", "assets/photos/khushi.JPG"], video: ["assets/videos/khushi.mp4", "assets/videos/khushi.mov"] },
    ],
  },
];

// -------------------- first-person controls --------------------
const MOUSE_SENSITIVITY = 0.0022;
const EYE_HEIGHT = 1.7;          // camera height off the floor — you ARE the visitor now
const PITCH_LIMIT = 1.3;         // radians, how far up/down you can look
const MOVE_SPEED = 5.2;
const MAX_INTERACT_DISTANCE = 7; // how far away a painting (or the puzzle sign) can still be clicked on

// EDIT ME — the passcode needed at the sign at the end of the tunnel,
// before it lets the visitor through to the wordle puzzle. Not case
// sensitive.
const PASSCODE = "CHOOTI";

(function () {
  // Flatten every slide's entries into one ordered list of paintings.
  const PAINTINGS = [];
  const FALLBACK_PAINTING_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/1200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg";
  const asList = (value) => (Array.isArray(value) ? value : [value]).filter(Boolean);
  const resolveAssetUrl = (value) => {
    if (!value || typeof value !== "string") return "";
    const cleaned = value.replace(/\\/g, "/").trim();
    if (!cleaned) return "";
    if (/^(?:[a-z]+:)?\/\//i.test(cleaned) || cleaned.startsWith("data:")) return cleaned;
    try {
      return new URL(cleaned, document.baseURI).href;
    } catch (error) {
      return cleaned;
    }
  };
  SLIDES.forEach((slide) => {
    slide.entries.forEach((entry) => {
      PAINTINGS.push({
        name: entry.name,
        photo: asList(entry.photo),
        video: asList(entry.video),
        group: slide.title,
      });
    });
  });

  // -------------------- layout constants --------------------
  // narrower + a warm gold palette, closer to the antique gallery-tunnel
  // reference: a snug corridor with archway "ribs" every couple of
  // paintings instead of one big open hall.
  const CORRIDOR_WIDTH = 7.2;
  const WALL_HEIGHT = 6.4;
  const SPACING = 5;              // distance between paintings along a wall
  const PAINTING_Y = 2.9;
  const PAINTING_W = 2.4;   // default/placeholder size, before a real photo has loaded
  const PAINTING_H = 1.6;
  const FRAME_MAX_W = 2.8;  // a frame will never grow wider than this...
  const FRAME_MAX_H = 2.0;  // ...or taller than this, however the photo is shaped
  const FRAME_MIN_DIM = 1.1; // ...or shrink smaller than this on its short side
  const perSide = Math.ceil(PAINTINGS.length / 2);
  const HALL_LENGTH = Math.max(perSide, 1) * SPACING + 8;
  const HALF_W = CORRIDOR_WIDTH / 2;

  const GOLD = 0xc9a24a;
  const GOLD_DARK = 0x8a6a35;

  // -------------------- DOM refs --------------------
  const startCard = document.getElementById("gallery-start");
  const enterBtn = document.getElementById("gallery-enter-btn");
  const wrap = document.getElementById("gallery-3d");
  const canvas = document.getElementById("gallery-canvas");
  const resumeHint = document.getElementById("gallery-resume");
  const progressEl = document.getElementById("gallery-progress");
  const finishBtn = document.getElementById("gallery-finish-btn");
  const videoOverlay = document.getElementById("gallery-video-overlay");
  const videoEl = document.getElementById("gallery-video");
  const videoNameEl = document.getElementById("gallery-video-name");
  const videoCloseBtn = document.getElementById("gallery-video-close");
  const passcodeOverlay = document.getElementById("gallery-passcode-overlay");
  const passcodeForm = document.getElementById("password-form");
  const passcodeInput = document.getElementById("password-input");
  const passcodeError = document.getElementById("passcode-error");
  const passcodeBackBtn = document.getElementById("passcode-back");
  const crosshair = document.querySelector(".crosshair");
  const hintEl = document.getElementById("gallery-hint");

  if (!enterBtn || !canvas || typeof THREE === "undefined") return;

  let started = false;
  let renderer, camera, scene;
  let yaw = Math.PI, pitch = 0; // yaw=PI faces +Z, i.e. into the corridor
  const pos = { x: 0, z: -3 };
  const keys = {};
  const visited = new Set();
  let overlayOpen = false;
  let finished = false;
  const raycaster = new THREE.Raycaster();
  const textureLoader = new THREE.TextureLoader();
  const interactables = [];    // clickable meshes: paintings + the puzzle sign, tagged via .userData
  let hovered = null;          // the userData object currently under the crosshair, or null
  let pointerX = 0;
  let pointerY = 0;

  progressEl.textContent = `0 / ${PAINTINGS.length} paintings seen`;

  // ================================================================
  // GALLERY INTERIOR
  // ================================================================
  function buildGalleryScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2b241a);
    scene.fog = new THREE.Fog(0x2b241a, 12, 34);

    scene.add(new THREE.AmbientLight(0xffe9c2, 0.42));
    scene.add(new THREE.HemisphereLight(0xffedcf, 0x1c150f, 0.4));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, HALL_LENGTH + 10),
      new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.65, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, HALL_LENGTH / 2 - 4);
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, HALL_LENGTH + 10),
      new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.95 })
    );
    ceiling.position.set(0, WALL_HEIGHT, HALL_LENGTH / 2 - 4);
    ceiling.rotation.x = Math.PI / 2;
    scene.add(ceiling);

    const wallMat = new THREE.MeshStandardMaterial({ map: makeWallTexture(), roughness: 0.92 });
    [-1, 1].forEach((side) => {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(HALL_LENGTH + 10, WALL_HEIGHT), wallMat);
      wall.position.set(side * HALF_W, WALL_HEIGHT / 2, HALL_LENGTH / 2 - 4);
      wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(wall);

      // dark wainscot base
      const skirt = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL_LENGTH + 10, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.7 })
      );
      skirt.position.set(side * (HALF_W - 0.01), 0.275, HALL_LENGTH / 2 - 4);
      skirt.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(skirt);

      // thin gold chair-rail line above the wainscot
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.05, HALL_LENGTH + 10),
        new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.35, roughness: 0.4, emissive: 0x3a2a10, emissiveIntensity: 0.15 })
      );
      rail.position.set(side * (HALF_W - 0.03), 0.56, HALL_LENGTH / 2 - 4);
      scene.add(rail);

      // gold crown molding where the wall meets the ceiling
      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.14, HALL_LENGTH + 10),
        new THREE.MeshStandardMaterial({ color: GOLD_DARK, metalness: 0.3, roughness: 0.45, emissive: 0x2a1c0c, emissiveIntensity: 0.12 })
      );
      crown.position.set(side * (HALF_W - 0.05), WALL_HEIGHT - 0.08, HALL_LENGTH / 2 - 4);
      scene.add(crown);
    });

    const farWall = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, WALL_HEIGHT),
      new THREE.MeshStandardMaterial({ map: wallMat.map, roughness: 0.92 })
    );
    farWall.position.set(0, WALL_HEIGHT / 2, HALL_LENGTH);
    farWall.rotation.y = Math.PI;
    scene.add(farWall);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(CORRIDOR_WIDTH, WALL_HEIGHT),
      new THREE.MeshStandardMaterial({ map: wallMat.map, roughness: 0.92 })
    );
    backWall.position.set(0, WALL_HEIGHT / 2, -6);
    scene.add(backWall);

    // -------------------- tunnel archways --------------------
    // a gold rectangular "portal" every SPACING, straddling the corridor —
    // this is what turns a plain hallway into an art-gallery TUNNEL, with
    // a warm hanging light at the center of each one.
    const archMat = new THREE.MeshStandardMaterial({ color: GOLD_DARK, metalness: 0.3, roughness: 0.4, emissive: 0x2a1c0c, emissiveIntensity: 0.12 });
    for (let z = 1.5; z < HALL_LENGTH + 2; z += SPACING) {
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_HEIGHT, 0.3), archMat);
      left.position.set(-HALF_W + 0.15, WALL_HEIGHT / 2, z);
      scene.add(left);

      const right = left.clone();
      right.position.x = HALF_W - 0.15;
      scene.add(right);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR_WIDTH, 0.3, 0.3), archMat);
      lintel.position.set(0, WALL_HEIGHT - 0.15, z);
      scene.add(lintel);

      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      );
      cord.position.set(0, WALL_HEIGHT - 0.6, z);
      scene.add(cord);

      const pendant = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 14, 14),
        new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffce7a, emissiveIntensity: 1.1 })
      );
      pendant.position.set(0, WALL_HEIGHT - 1.05, z);
      scene.add(pendant);

      const hangLight = new THREE.PointLight(0xffd9a0, 0.55, 9, 2);
      hangLight.position.set(0, WALL_HEIGHT - 1.05, z);
      scene.add(hangLight);
    }

    // -------------------- paintings, in antique gold frames --------------------
    // each frame is (re)built to fit whatever photo actually loads into it —
    // see fitDims() / mountPaintingFrame() below — so nothing gets stretched
    // or cropped; the frame just takes on that photo's own proportions.
    PAINTINGS.forEach((painting, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const depth = Math.floor(i / 2);
      const z = depth * SPACING + 4;
      const x = side * (HALF_W - 0.05);

      painting.pos = new THREE.Vector3(x, PAINTING_Y, z);

      function mount(w, h, map) {
        if (painting._frameGroup) {
          scene.remove(painting._frameGroup);
          disposeFrameGroup(painting._frameGroup);
          const idx = interactables.indexOf(painting._artMesh);
          if (idx !== -1) interactables.splice(idx, 1);
        }
        const { group, art } = buildGoldFrame({ x, y: PAINTING_Y, z, side, w, h, map });
        scene.add(group);
        art.userData = { type: "painting", painting };
        interactables.push(art);
        painting._frameGroup = group;
        painting._artMesh = art;
      }

      // show a placeholder plaque immediately, at the default size; swap in
      // the real photo (resized to fit it) once (if) it loads, so a missing
      // file never breaks the scene
      mount(PAINTING_W, PAINTING_H, makePlaqueTexture(painting.name, i));

      const photoCandidates = asList(painting.photo);
      function setFallbackPhotoTexture() {
        loadTextureFromUrl(
          FALLBACK_PAINTING_URL,
          (tex, img) => {
            const { w, h } = fitDims(img.naturalWidth || img.width, img.naturalHeight || img.height);
            mount(w, h, tex);
          },
          () => {} // the plaque placeholder from mount() above stays put
        );
      }
      function loadTextureFromUrl(url, onLoaded, onError) {
        const image = new Image();
        image.decoding = "async";
        image.crossOrigin = "anonymous";
        image.onload = () => {
          const tex = new THREE.Texture(image);
          tex.needsUpdate = true;
          onLoaded(tex, image);
        };
        image.onerror = () => {
          if (onError) onError();
        };
        image.src = resolveAssetUrl(url);
      }
      function tryLoadPhoto(index) {
        if (index >= photoCandidates.length) {
          setFallbackPhotoTexture();
          return;
        }
        loadTextureFromUrl(
          photoCandidates[index],
          (tex, img) => {
            const { w, h } = fitDims(img.naturalWidth || img.width, img.naturalHeight || img.height);
            mount(w, h, tex);
          },
          () => tryLoadPhoto(index + 1)
        );
      }
      if (photoCandidates.length) tryLoadPhoto(0);
      else setFallbackPhotoTexture();
      const spot = new THREE.SpotLight(0xffe2ae, 1.15, 8, Math.PI / 5, 0.5);
      spot.position.set(x - side * 1.4, WALL_HEIGHT - 0.3, z);
      spot.target.position.copy(painting.pos);
      scene.add(spot);
      scene.add(spot.target);
    });

    // -------------------- the puzzle, waiting at the end of the tunnel --------------------
    const wordleTex = makeWordleSignTexture();
    const { group: wordleGroup, art: wordleSign } = buildGoldFrame({
      x: 0, y: PAINTING_Y + 0.1, z: HALL_LENGTH - 0.05, side: -1,
      w: 3.0, h: 2.1,
      map: wordleTex,
      faceZ: true, // this one hangs on the far (end) wall, not a side wall
    });
    scene.add(wordleGroup);
    wordleSign.userData = { type: "wordle" };
    interactables.push(wordleSign);

    const wordleSpot = new THREE.SpotLight(0xffe2ae, 1.3, 9, Math.PI / 5, 0.5);
    wordleSpot.position.set(0, WALL_HEIGHT - 0.3, HALL_LENGTH - 1.6);
    wordleSpot.target.position.set(0, PAINTING_Y + 0.1, HALL_LENGTH);
    scene.add(wordleSpot);
    scene.add(wordleSpot.target);
  }

  // fits a photo's real width/height inside the frame's size budget,
  // preserving its aspect ratio (like CSS object-fit: contain) — so the
  // whole photo is always visible, never stretched or cropped, and the
  // frame just takes on whatever shape that photo actually is.
  function fitDims(imgW, imgH) {
    if (!imgW || !imgH) return { w: PAINTING_W, h: PAINTING_H };
    const aspect = imgW / imgH;
    let w = FRAME_MAX_W;
    let h = w / aspect;
    if (h > FRAME_MAX_H) {
      h = FRAME_MAX_H;
      w = h * aspect;
    }
    if (w < FRAME_MIN_DIM) { w = FRAME_MIN_DIM; h = w / aspect; }
    if (h < FRAME_MIN_DIM) { h = FRAME_MIN_DIM; w = h * aspect; }
    return { w, h };
  }

  // frees the geometries/materials/textures of a previous frame build
  // before swapping in a resized one, so re-mounting a painting a couple
  // of times (placeholder -> real photo) doesn't leak GPU memory
  function disposeFrameGroup(group) {
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
  }

  // a plain, simple picture frame around a textured plane: a flat border
  // and a thin inner mat, nothing carved or ornate. `side` is the
  // wall-relative outward direction the frame steps forward in; pass
  // `faceZ: true` for something mounted on the far (end) wall instead of
  // a left/right side wall, so it steps forward along Z and faces -Z.
  function buildGoldFrame({ x, y, z, side, w, h, map, faceZ }) {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.55 });
    const matMat = new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.85 });
    const dir = faceZ ? -1 : -side; // which way the frame steps out from the wall, toward the room

    function step(offset, geo, mat) {
      const m = new THREE.Mesh(geo, mat);
      if (faceZ) m.position.set(x, y, z + dir * offset);
      else m.position.set(x + dir * offset, y, z);
      group.add(m);
      return m;
    }

    const dims = (depth, pad) => faceZ
      ? [w + pad, h + pad, depth]
      : [depth, h + pad, w + pad];

    // one plain border, one thin mat — a normal frame, not a carved one
    step(0.07, new THREE.BoxGeometry(...dims(0.14, 0.24)), frameMat);
    step(0.135, new THREE.BoxGeometry(...dims(0.025, 0.06)), matMat);

    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map, roughness: 0.6 })
    );
    if (faceZ) {
      art.position.set(x, y, z + dir * 0.16);
      art.rotation.y = dir > 0 ? 0 : Math.PI;
    } else {
      art.position.set(x + dir * 0.16, y, z);
      art.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    group.add(art);

    return { group, art };
  }

  // parquet-style herringbone floor, drawn once onto a canvas and tiled
  function makeFloorTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const dark = "#4a3223", mid = "#6b4a30", light = "#8a6a41";
    ctx.fillStyle = mid;
    ctx.fillRect(0, 0, size, size);

    const plankLen = 46, plankW = 15, gap = 1.6;
    for (let y = -plankLen; y < size + plankLen; y += plankW + gap) {
      const flip = Math.round(y / (plankW + gap)) % 2 === 0;
      for (let x = -plankLen * 2; x < size + plankLen * 2; x += plankLen) {
        ctx.save();
        ctx.translate(x + (flip ? 0 : plankLen / 2), y + plankW / 2);
        ctx.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
        ctx.fillStyle = Math.random() < 0.5 ? dark : light;
        ctx.fillRect(-plankLen / 2, -plankW / 2 + gap, plankLen - gap * 2, plankW - gap * 2);
        ctx.restore();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(CORRIDOR_WIDTH * 0.9, HALL_LENGTH * 0.4);
    return tex;
  }

  // soft mottled plaster wall texture, warm cream
  function makeWallTexture() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ece0c8";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i++) {
      const v = 210 + Math.random() * 30;
      ctx.fillStyle = `rgba(${v - 10},${v - 20},${v - 45},${0.05 + Math.random() * 0.08})`;
      const r = 4 + Math.random() * 14;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(HALL_LENGTH * 0.35, 1.4);
    return tex;
  }

  function makePlaqueTexture(name, i) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 320;
    const ctx = c.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, c.width, c.height);
    bg.addColorStop(0, i % 2 === 0 ? "#3d2a22" : "#2e3a38");
    bg.addColorStop(1, i % 2 === 0 ? "#0f0f14" : "#1b1b1f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);

    const glow = ctx.createRadialGradient(c.width * 0.5, c.height * 0.3, 20, c.width * 0.5, c.height * 0.3, 180);
    glow.addColorStop(0, "rgba(255, 220, 140, 0.8)");
    glow.addColorStop(1, "rgba(255, 220, 140, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(c.width * 0.5, c.height * 0.42, 74, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f6d7a3";
    ctx.beginPath();
    ctx.arc(c.width * 0.5, c.height * 0.45, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2b2029";
    ctx.fillRect(c.width * 0.35, c.height * 0.52, c.width * 0.3, c.height * 0.2);

    ctx.fillStyle = "#f7efe2";
    ctx.font = "600 34px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, c.width / 2, c.height * 0.82);

    ctx.font = "italic 18px Georgia, serif";
    ctx.fillText("for you", c.width / 2, c.height * 0.9);

    return new THREE.CanvasTexture(c);
  }

  // the sign hanging at the end of the tunnel, teasing the wordle game
  function makeWordleSignTexture() {
    const c = document.createElement("canvas");
    c.width = 560; c.height = 392;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1c2430";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#f0c987";
    ctx.font = "600 34px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("one last thing...", c.width / 2, 74);

    const letters = ["H", "E", "A", "R", "T"];
    const states = ["#538d4e", "#b59f3b", "#538d4e", "#3a3a3c", "#b59f3b"];
    const tile = 56, gap = 10;
    const startX = c.width / 2 - (tile * 5 + gap * 4) / 2;
    letters.forEach((l, i) => {
      const x = startX + i * (tile + gap);
      const y = 130;
      ctx.fillStyle = states[i];
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.strokeRect(x, y, tile, tile);
      ctx.fillStyle = "#f4f2ee";
      ctx.font = "700 30px Inter, sans-serif";
      ctx.fillText(l, x + tile / 2, y + tile / 2 + 11);
    });

    ctx.fillStyle = "#e8dcc8";
    ctx.font = "italic 22px Georgia, serif";
    ctx.fillText("a five-letter word, just for you", c.width / 2, 250);
    ctx.fillStyle = "#f0c987";
    ctx.font = "600 20px Inter, sans-serif";
    ctx.fillText("click to play", c.width / 2, 300);
    return new THREE.CanvasTexture(c);
  }

  // -------------------- shared plumbing --------------------
  function onResize() {
    if (!renderer) return;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    pointerX = canvas.clientWidth / 2;
    pointerY = canvas.clientHeight / 2;
    if (crosshair) {
      crosshair.style.left = `${pointerX}px`;
      crosshair.style.top = `${pointerY}px`;
    }
  }

  function updateCrosshairFromPointer(clientX, clientY) {
    if (!canvas || !crosshair) return;
    const rect = canvas.getBoundingClientRect();
    const clampedX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const clampedY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    pointerX = clampedX;
    pointerY = clampedY;
    crosshair.style.left = `${clampedX}px`;
    crosshair.style.top = `${clampedY}px`;
  }

  function onMouseMove(e) {
    if (overlayOpen || finished) return;

    updateCrosshairFromPointer(e.clientX, e.clientY);

    // Some browsers/local-file contexts reject pointer lock even for a valid
    // user click, so we still allow camera rotation from the mouse itself.
    if (e.movementX || e.movementY) {
      yaw -= e.movementX * MOUSE_SENSITIVITY;
      pitch -= e.movementY * MOUSE_SENSITIVITY;
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    }
  }

  function onKeyDown(e) { keys[e.code] = true; }
  function onKeyUp(e) { keys[e.code] = false; }

  function onPointerLockChange() {
    if (document.pointerLockElement === canvas) {
      if (resumeHint) resumeHint.classList.remove("show");
      pointerX = canvas.clientWidth / 2;
      pointerY = canvas.clientHeight / 2;
      if (crosshair) {
        crosshair.style.left = `${pointerX}px`;
        crosshair.style.top = `${pointerY}px`;
      }
    } else {
      setHovered(null);
      // lock was lost (Escape key, closing a painting, etc.) — let the
      // person know a click will pick mouse-look back up, instead of
      // leaving them stuck with no explanation.
      if (resumeHint && started && !overlayOpen && !finished) resumeHint.classList.add("show");
    }
  }

  // a single click either (a) grabs the pointer lock to start looking around,
  // or (b) if you're already looking around and the crosshair is resting on
  // something clickable, opens it (a painting's video, or the puzzle)
  canvas.addEventListener("click", () => {
    if (overlayOpen || finished) return;

    // Re-request the lock any time it isn't held — not just before the first
    // "started" entry. Closing a painting's video (or hitting Escape) always
    // drops pointer lock, and the old "!started" guard here meant that once
    // you'd entered the gallery once, a lost lock could never be regained —
    // the crosshair would freeze and mouse-look would just stop working.
    // If pointer lock is denied or unavailable in the current environment,
    // the gallery still works via the plain-mouse fallback in onMouseMove
    // instead of silently doing nothing.
    if (document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
      return;
    }
    if (!hovered) return;
    if (hovered.type === "painting") openPainting(hovered.painting);
    else if (hovered.type === "wordle") openPasscode();
  });

  // the resume overlay sits on top of the canvas (inset:0) while the lock
  // is lost, so it needs its own listener to hand control back — clicks on
  // it were never reaching the canvas underneath to re-trigger the lock.
  if (resumeHint) {
    resumeHint.addEventListener("click", () => {
      if (overlayOpen || finished) return;
      canvas.requestPointerLock();
    });
  }

  function currentBounds() {
    return { minX: -HALF_W + 0.8, maxX: HALF_W - 0.8, minZ: -4.5, maxZ: HALL_LENGTH - 0.8 };
  }

  let last = performance.now();

  function step(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!overlayOpen) {
      const forward = (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0) - (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0);
      const strafe = (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0);
      if (forward || strafe) {
        // yaw=0 looks toward -Z in three.js, so "forward" has to be -sin/-cos
        // here to actually match where the camera is looking
        const dx = -Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
        const dz = -Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
        const len = Math.hypot(dx, dz) || 1;
        const b = currentBounds();
        pos.x = Math.max(b.minX, Math.min(b.maxX, pos.x + (dx / len) * MOVE_SPEED * dt));
        pos.z = Math.max(b.minZ, Math.min(b.maxZ, pos.z + (dz / len) * MOVE_SPEED * dt));
      }
    }

    // true first-person camera: your eyes ARE the camera, no third-person rig
    camera.position.set(pos.x, EYE_HEIGHT, pos.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    updateCursor();

    renderer.render(scene, camera);
    requestAnimationFrame(step);
  }

  // the "cursor thing" — a crosshair that reacts to what you're looking at.
  // it raycasts straight out from the center of the view every frame, and
  // lights up + names whatever's clickable once it's close enough
  function updateCursor() {
    if (overlayOpen || finished) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((pointerX / rect.width) * 2 - 1);
    const y = -((pointerY / rect.height) * 2 - 1);

    raycaster.setFromCamera({ x, y }, camera);
    const hits = raycaster.intersectObjects(interactables, false);
    if (hits.length && hits[0].distance <= MAX_INTERACT_DISTANCE) {
      setHovered(hits[0].object.userData);
    } else {
      setHovered(null);
    }
  }

  function setHovered(data) {
    if (hovered === data) return;
    hovered = data;
    if (crosshair) crosshair.classList.toggle("crosshair--active", !!data);
    if (!hintEl) return;
    if (!data) {
      hintEl.classList.remove("show");
      return;
    }
    if (data.type === "painting") {
      hintEl.textContent = visited.has(data.painting) ? `${data.painting.name} — click to watch again` : `click to play ${data.painting.name}`;
    } else if (data.type === "wordle") {
      hintEl.textContent = "click to enter the passcode";
    }
    hintEl.classList.add("show");
  }

  // maps a file extension to the MIME type the <video> element needs to
  // pick the right playback path — this is what makes .mov (and other
  // formats) work reliably alongside .mp4, instead of just hoping the
  // browser sniffs it correctly from a bare src.
  const VIDEO_MIME_TYPES = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    ogg: "video/ogg",
    ogv: "video/ogg",
  };

  // accepts either one path ("assets/videos/1.mov") or an array of
  // fallbacks (["assets/videos/1.mp4", "assets/videos/1.mov"]) — the
  // browser will play the first one it supports.
  function setVideoSources(video) {
    const paths = (Array.isArray(video) ? video : [video])
      .filter((path) => typeof path === "string" && path.trim());

    videoEl.pause();
    videoEl.removeAttribute("src");
    videoEl.innerHTML = "";

    if (!paths.length) {
      return;
    }

    paths.forEach((path) => {
      const ext = (path.split(".").pop() || "").toLowerCase();
      const source = document.createElement("source");
      source.src = resolveAssetUrl(path);
      if (VIDEO_MIME_TYPES[ext]) source.type = VIDEO_MIME_TYPES[ext];
      videoEl.appendChild(source);
    });
    videoEl.load();
  }

  // the "fit the video" mechanic: a plain 16:9 box is wrong for a portrait
  // phone video and vice versa, so as soon as the browser knows a video's
  // real dimensions, we tell the player element to match that shape. CSS
  // (max-width/max-height, see .gallery-video-card video) then fits that
  // correctly-shaped box into the available space without stretching or
  // cropping it.
  videoEl.addEventListener("loadedmetadata", () => {
    if (videoEl.videoWidth && videoEl.videoHeight) {
      videoEl.style.aspectRatio = `${videoEl.videoWidth} / ${videoEl.videoHeight}`;
    }
  });

  function openPainting(painting) {
    overlayOpen = true;
    visited.add(painting);
    progressEl.textContent = `${visited.size} / ${PAINTINGS.length} paintings seen`;

    videoNameEl.textContent = painting.name;
    videoEl.style.aspectRatio = "16 / 9"; // sensible placeholder until this video's own metadata loads
    setVideoSources(painting.video);
    videoOverlay.classList.add("show");
    document.exitPointerLock();
    videoEl.play().catch(() => {});
  }

  videoCloseBtn.addEventListener("click", () => {
    videoEl.pause();
    videoEl.currentTime = 0;
    videoOverlay.classList.remove("show");
    overlayOpen = false;
    if (resumeHint && document.pointerLockElement !== canvas) resumeHint.classList.add("show");
  });

  // -------------------- passcode gate at the end of the tunnel --------------------
  function openPasscode() {
    overlayOpen = true;
    passcodeInput.value = "";
    passcodeError.textContent = "";
    passcodeOverlay.classList.add("show");
    document.exitPointerLock();
    setTimeout(() => passcodeInput.focus(), 50);
  }

  function closePasscode() {
    passcodeOverlay.classList.remove("show");
    overlayOpen = false;
    if (resumeHint && document.pointerLockElement !== canvas) resumeHint.classList.add("show");
  }

  passcodeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const guess = passcodeInput.value.trim().toUpperCase();
    if (guess && guess === PASSCODE.trim().toUpperCase()) {
      passcodeOverlay.classList.remove("show");
      leaveGallery();
    } else {
      passcodeError.textContent = "not quite — try again";
      passcodeInput.value = "";
      passcodeInput.focus();
    }
  });

  passcodeBackBtn.addEventListener("click", closePasscode);

  finishBtn.addEventListener("click", leaveGallery);

  function leaveGallery() {
    finished = true;
    document.exitPointerLock();
    if (resumeHint) resumeHint.classList.remove("show");
    wrap.classList.remove("is-active");
    if (window.finishGalleryAndStartWordle) window.finishGalleryAndStartWordle();
  }

  if (finishBtn) finishBtn.remove();

  // -------------------- entry point --------------------
  enterBtn.addEventListener("click", () => {
    if (started) return;
    started = true;
    startCard.style.display = "none";
    wrap.classList.add("is-active");

    camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    window.addEventListener("resize", onResize);

    buildGalleryScene();
    camera.position.set(pos.x, EYE_HEIGHT, pos.z);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    canvas.requestPointerLock();

    last = performance.now();
    requestAnimationFrame(step);
  });
})();
