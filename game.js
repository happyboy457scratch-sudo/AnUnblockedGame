import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js";

const LANE_WIDTH = 6;
const TRACK_LENGTH = 220;
const RACE_DURATION = 60;

const DIFFICULTIES = {
  easy: { bots: 3, speedMin: 66, speedMax: 80, rewardMultiplier: 1 },
  medium: { bots: 4, speedMin: 76, speedMax: 92, rewardMultiplier: 1.4 },
  hard: { bots: 5, speedMin: 88, speedMax: 104, rewardMultiplier: 1.8 },
};

const state = {
  coins: 120,
  inventory: { nitro: 0, turbo: 0, magnet: 0 },
  raceActive: false,
  timeLeft: RACE_DURATION,
  distance: 0,
  playerSpeed: 0,
  laneTarget: 1,
  activePowerups: [],
  usedThisRace: { nitro: false, turbo: false, magnet: false },
  settings: {
    polyMode: "low",
    graphicsQuality: "low",
    width: 800,
    height: 600,
  },
};

const elements = {
  canvas: document.getElementById("game-canvas"),
  homeMenu: document.getElementById("home-menu"),
  menuGarage: document.getElementById("menu-garage"),
  menuSettings: document.getElementById("menu-settings"),
  menuStart: document.getElementById("menu-start"),
  menuShop: document.getElementById("menu-shop"),
  coins: document.getElementById("coins"),
  speed: document.getElementById("speed"),
  timeLeft: document.getElementById("time-left"),
  position: document.getElementById("position"),
  color: document.getElementById("car-color"),
  difficulty: document.getElementById("difficulty"),
  startRace: document.getElementById("start-race"),
  result: document.getElementById("race-result"),
  resultTitle: document.getElementById("result-title"),
  resultBody: document.getElementById("result-body"),
  mobileToggle: document.getElementById("mobile-toggle"),
  mobileControls: document.getElementById("mobile-controls"),
  mobileLeft: document.getElementById("mobile-left"),
  mobileBoost: document.getElementById("mobile-boost"),
  mobileRight: document.getElementById("mobile-right"),
  controlPopup: document.getElementById("control-popup"),
  chooseMobile: document.getElementById("choose-mobile"),
  chooseKeyboard: document.getElementById("choose-keyboard"),
  polyMode: document.getElementById("poly-mode"),
  graphicsQuality: document.getElementById("graphics-quality"),
  resolution: document.getElementById("resolution"),
  applySettings: document.getElementById("apply-settings"),
  inventory: document.getElementById("inventory"),
  shopButtons: [...document.querySelectorAll("#shop button")],
};

const renderer = new THREE.WebGLRenderer({ canvas: elements.canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);
scene.fog = new THREE.Fog(0x0f172a, 60, 260);
const environmentGroup = new THREE.Group();
scene.add(environmentGroup);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, -22);
camera.lookAt(0, 2, 20);

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(-30, 35, -10);
scene.add(sun);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(LANE_WIDTH * 3.8, TRACK_LENGTH),
  new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 })
);
road.rotation.x = -Math.PI / 2;
road.position.z = TRACK_LENGTH / 2 - 20;
scene.add(road);

const laneMarkers = new THREE.Group();
for (let i = 0; i < 48; i += 1) {
  const marker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 3.2),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(-LANE_WIDTH / 2, 0.04, i * 5 - 40);
  laneMarkers.add(marker);

  const marker2 = marker.clone();
  marker2.position.x = LANE_WIDTH / 2;
  laneMarkers.add(marker2);
}
scene.add(laneMarkers);

function clearEnvironment() {
  while (environmentGroup.children.length) {
    const child = environmentGroup.children[0];
    environmentGroup.remove(child);
    child.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material.dispose());
        } else {
          node.material.dispose();
        }
      }
    });
  }
}

function buildEnvironment(polyMode) {
  clearEnvironment();
  const highPoly = polyMode === "high";
  const itemCount = highPoly ? 26 : 12;
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.4, 2.1, highPoly ? 16 : 5);
  const leavesGeo = highPoly
    ? new THREE.SphereGeometry(1.3, 18, 14)
    : new THREE.ConeGeometry(1.2, 1.8, 6);

  for (let i = 0; i < itemCount; i += 1) {
    const z = -20 + i * 10;
    const treeL = new THREE.Group();
    const treeR = new THREE.Group();
    [treeL, treeR].forEach((tree, index) => {
      const trunk = new THREE.Mesh(
        trunkGeo,
        new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 })
      );
      trunk.position.y = 1.2;
      tree.add(trunk);

      const leaves = new THREE.Mesh(
        leavesGeo,
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 })
      );
      leaves.position.y = highPoly ? 2.9 : 2.4;
      tree.add(leaves);

      tree.position.set(index === 0 ? -16 : 16, 0, z + (Math.random() - 0.5) * 3);
      environmentGroup.add(tree);
    });
  }
}

const playerCar = new THREE.Group();
const bodyMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(elements.color.value),
  metalness: 0.35,
  roughness: 0.42,
});
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.2, roughness: 0.45 });
const glassMaterial = new THREE.MeshStandardMaterial({
  color: 0x88bdf8,
  metalness: 0.1,
  roughness: 0.05,
  transparent: true,
  opacity: 0.8,
});

const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1, 6), bodyMaterial);
lowerBody.position.y = 0.95;
playerCar.add(lowerBody);

const hood = new THREE.Mesh(new THREE.BoxGeometry(3, 0.45, 1.8), bodyMaterial);
hood.position.set(0, 1.35, 2.1);
playerCar.add(hood);

const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.85, 2.5), bodyMaterial);
cabin.position.set(0, 1.8, -0.1);
playerCar.add(cabin);

const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.15), glassMaterial);
windshield.position.set(0, 1.95, 0.75);
playerCar.add(windshield);

const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.45, 0.95), glassMaterial);
rearWindow.position.set(0, 1.95, -1.25);
playerCar.add(rearWindow);

const bumperFront = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 0.35), darkMaterial);
bumperFront.position.set(0, 0.6, 3.02);
playerCar.add(bumperFront);

const bumperRear = bumperFront.clone();
bumperRear.position.z = -3.02;
playerCar.add(bumperRear);

const headlightGeo = new THREE.BoxGeometry(0.45, 0.2, 0.15);
const headlightMaterial = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  emissive: 0xe2e8f0,
  emissiveIntensity: 0.25,
});
const headlightL = new THREE.Mesh(headlightGeo, headlightMaterial);
headlightL.position.set(-1.05, 1.02, 3.1);
playerCar.add(headlightL);
const headlightR = headlightL.clone();
headlightR.position.x = 1.05;
playerCar.add(headlightR);

const taillightGeo = new THREE.BoxGeometry(0.42, 0.2, 0.12);
const taillightMaterial = new THREE.MeshStandardMaterial({
  color: 0xef4444,
  emissive: 0x7f1d1d,
  emissiveIntensity: 0.5,
});
const taillightL = new THREE.Mesh(taillightGeo, taillightMaterial);
taillightL.position.set(-1.02, 1, -3.08);
playerCar.add(taillightL);
const taillightR = taillightL.clone();
taillightR.position.x = 1.02;
playerCar.add(taillightR);

const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2, 0.14, 0.55), darkMaterial);
spoiler.position.set(0, 2.22, -2.2);
playerCar.add(spoiler);

const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.72, 20);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.8, metalness: 0.1 });
const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.75 });
const wheelOffsets = [
  [-1.45, 0.55, 1.95],
  [1.45, 0.55, 1.95],
  [-1.45, 0.55, -1.95],
  [1.45, 0.55, -1.95],
];

wheelOffsets.forEach(([x, y, z]) => {
  const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(x, y, z);
  playerCar.add(wheel);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.74, 16), rimMaterial);
  rim.rotation.z = Math.PI / 2;
  rim.position.set(x, y, z);
  playerCar.add(rim);
});

playerCar.position.set(0, 0, 0);
scene.add(playerCar);

const bots = [];
const BOT_COLORS = [0xef4444, 0xf59e0b, 0x8b5cf6, 0x14b8a6, 0xf472b6];

function createBot(index, speed) {
  const bot = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.1, 5.2),
    new THREE.MeshStandardMaterial({ color: BOT_COLORS[index % BOT_COLORS.length] })
  );
  body.position.y = 1;
  bot.add(body);
  bot.position.set((index % 3 - 1) * LANE_WIDTH, 0, 18 + index * 16);
  bot.userData = { speed, distance: 0 };
  scene.add(bot);
  bots.push(bot);
}

function clearBots() {
  while (bots.length) {
    const bot = bots.pop();
    scene.remove(bot);
  }
}

function laneToX(lane) {
  return (lane - 1) * LANE_WIDTH;
}

function updateHud(position = "1 / 1") {
  elements.coins.textContent = state.coins.toString();
  elements.speed.textContent = Math.round(state.playerSpeed).toString();
  elements.timeLeft.textContent = state.timeLeft.toFixed(1);
  elements.position.textContent = position;
  elements.inventory.textContent = `Inventory: Nitro ${state.inventory.nitro} · Turbo ${state.inventory.turbo} · Magnet ${state.inventory.magnet}`;
}

function showMenuPanel(target) {
  const ids = ["garage", "settings", "shop"];
  ids.forEach((id) => document.getElementById(id).classList.toggle("hidden", id !== target));
}

function openControlPopup() {
  elements.controlPopup.classList.remove("hidden");
}

function closeControlPopup() {
  elements.controlPopup.classList.add("hidden");
}

function hideHomeMenu() {
  elements.homeMenu.classList.add("hidden");
}

function populateResolutionOptions() {
  const presets = [
    [800, 600],
    [1024, 768],
    [1280, 720],
    [1366, 768],
    [1600, 900],
    [1920, 1080],
    [2560, 1440],
  ];
  const maxW = Math.floor(window.innerWidth);
  const maxH = Math.floor(window.innerHeight);

  elements.resolution.innerHTML = "";
  const allowed = presets.filter(([w, h]) => w <= maxW && h <= maxH);
  if (!allowed.length) {
    allowed.push([Math.min(800, maxW), Math.min(600, maxH)]);
  }

  allowed.forEach(([w, h]) => {
    const option = document.createElement("option");
    option.value = `${w}x${h}`;
    option.textContent = `${w} × ${h}`;
    elements.resolution.append(option);
  });

  const maxOption = document.createElement("option");
  maxOption.value = "max";
  maxOption.textContent = `Max (${maxW} × ${maxH})`;
  elements.resolution.append(maxOption);

  elements.resolution.value = "max";
}

function applySettings() {
  state.settings.polyMode = elements.polyMode.value;
  state.settings.graphicsQuality = elements.graphicsQuality.value;

  const selected = elements.resolution.value;
  if (selected === "max") {
    state.settings.width = window.innerWidth;
    state.settings.height = window.innerHeight;
  } else {
    const [w, h] = selected.split("x").map(Number);
    state.settings.width = w;
    state.settings.height = h;
  }

  buildEnvironment(state.settings.polyMode);

  const highGraphics = state.settings.graphicsQuality === "high";
  scene.fog = new THREE.Fog(0x0f172a, highGraphics ? 75 : 50, highGraphics ? 330 : 200);
  renderer.shadowMap.enabled = highGraphics;
  sun.castShadow = highGraphics;
  renderer.setPixelRatio(highGraphics ? Math.min(window.devicePixelRatio, 2) : 1);
  renderer.setSize(state.settings.width, state.settings.height);
  camera.aspect = state.settings.width / state.settings.height;
  camera.updateProjectionMatrix();

  elements.canvas.style.width = `${state.settings.width}px`;
  elements.canvas.style.height = `${state.settings.height}px`;
  elements.canvas.style.maxWidth = "100%";
  elements.canvas.style.maxHeight = "100%";
}

function showResult(title, body) {
  elements.resultTitle.textContent = title;
  elements.resultBody.textContent = body;
  elements.result.classList.remove("hidden");
}

function maybeUseAutoPowerups() {
  state.activePowerups = [];
  state.usedThisRace = { nitro: false, turbo: false, magnet: false };

  if (state.inventory.nitro > 0) {
    state.inventory.nitro -= 1;
    state.activePowerups.push({ key: "nitro", duration: 8 });
    state.usedThisRace.nitro = true;
  }

  if (state.inventory.turbo > 0) {
    state.inventory.turbo -= 1;
    state.activePowerups.push({ key: "turbo", duration: RACE_DURATION });
    state.usedThisRace.turbo = true;
  }

  if (state.inventory.magnet > 0) {
    state.inventory.magnet -= 1;
    state.activePowerups.push({ key: "magnet", duration: RACE_DURATION });
    state.usedThisRace.magnet = true;
  }
}

function getPowerupBoosts() {
  let maxSpeedBonus = 0;
  let accelBonus = 0;
  let coinMultiplier = 1;

  for (const powerup of state.activePowerups) {
    if (powerup.key === "nitro" && powerup.duration > 0) {
      maxSpeedBonus += 40;
    }
    if (powerup.key === "turbo" && powerup.duration > 0) {
      accelBonus += 25;
    }
    if (powerup.key === "magnet" && powerup.duration > 0) {
      coinMultiplier = 1.6;
    }
  }

  return { maxSpeedBonus, accelBonus, coinMultiplier };
}

function startRace() {
  const mode = DIFFICULTIES[elements.difficulty.value];
  clearBots();
  for (let i = 0; i < mode.bots; i += 1) {
    const speed = mode.speedMin + Math.random() * (mode.speedMax - mode.speedMin);
    createBot(i, speed);
  }

  state.raceActive = true;
  state.timeLeft = RACE_DURATION;
  state.distance = 0;
  state.playerSpeed = 0;
  state.laneTarget = 1;
  playerCar.position.x = 0;
  playerCar.position.z = 0;
  elements.result.classList.add("hidden");
  maybeUseAutoPowerups();
  updateHud(`1 / ${mode.bots + 1}`);
}

function endRace() {
  state.raceActive = false;

  const mode = DIFFICULTIES[elements.difficulty.value];
  const leaderboard = [
    { name: "You", distance: state.distance },
    ...bots.map((bot, i) => ({ name: `Bot ${i + 1}`, distance: bot.userData.distance })),
  ].sort((a, b) => b.distance - a.distance);

  const place = leaderboard.findIndex((entry) => entry.name === "You") + 1;
  const boosts = getPowerupBoosts();
  const rankBonus = [75, 45, 20, 10, 5][place - 1] ?? 2;
  const distanceBonus = Math.round(state.distance * 0.45);
  const total = Math.round((rankBonus + distanceBonus) * mode.rewardMultiplier * boosts.coinMultiplier);
  state.coins += total;

  showResult(
    place === 1 ? "🏁 You Won!" : `🏁 Finished #${place}`,
    `You earned ${total} coins. ${state.usedThisRace.nitro || state.usedThisRace.turbo || state.usedThisRace.magnet ? "Powerups were used automatically." : "Buy powerups in the shop for the next race."}`
  );

  updateHud(`${place} / ${mode.bots + 1}`);
}

const controls = { left: false, right: false, accel: false };
let mobileEnabled = false;

function setMobileControls(enabled) {
  mobileEnabled = enabled;
  elements.mobileControls.classList.toggle("hidden", !enabled);
  elements.mobileToggle.setAttribute("aria-pressed", String(enabled));
}

function bindHold(button, key) {
  const press = (event) => {
    event.preventDefault();
    controls[key] = true;
  };
  const release = (event) => {
    event.preventDefault();
    controls[key] = false;
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") controls.left = true;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") controls.right = true;
  if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") controls.accel = true;
});
window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") controls.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") controls.right = false;
  if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") controls.accel = false;
});

elements.startRace.addEventListener("click", openControlPopup);
elements.mobileToggle.addEventListener("click", () => setMobileControls(!mobileEnabled));
bindHold(elements.mobileLeft, "left");
bindHold(elements.mobileBoost, "accel");
bindHold(elements.mobileRight, "right");
elements.applySettings.addEventListener("click", applySettings);

elements.menuGarage.addEventListener("click", () => {
  hideHomeMenu();
  showMenuPanel("garage");
});
elements.menuSettings.addEventListener("click", () => {
  hideHomeMenu();
  showMenuPanel("settings");
});
elements.menuShop.addEventListener("click", () => {
  hideHomeMenu();
  showMenuPanel("shop");
});
elements.menuStart.addEventListener("click", () => {
  hideHomeMenu();
  openControlPopup();
});
elements.chooseMobile.addEventListener("click", () => {
  setMobileControls(true);
  closeControlPopup();
  startRace();
});
elements.chooseKeyboard.addEventListener("click", () => {
  setMobileControls(false);
  closeControlPopup();
  startRace();
});

elements.color.addEventListener("input", () => {
  bodyMaterial.color.set(elements.color.value);
});

elements.shopButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.dataset.item;
    const cost = Number(button.dataset.cost);

    if (state.coins < cost) {
      showResult("Not enough coins", `You need ${cost - state.coins} more coins to buy ${item}.`);
      return;
    }

    state.coins -= cost;
    state.inventory[item] += 1;
    showResult("Purchase complete", `Bought 1 ${item}. It will auto-activate in your next race.`);
    updateHud(elements.position.textContent);
  });
});

let last = performance.now();
function tick(now) {
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;

  laneMarkers.children.forEach((marker) => {
    marker.position.z -= 65 * delta;
    if (marker.position.z < -50) marker.position.z += 240;
  });

  if (state.raceActive) {
    const mode = DIFFICULTIES[elements.difficulty.value];
    const boosts = getPowerupBoosts();

    if (controls.left) state.laneTarget = Math.max(0, state.laneTarget - 1);
    if (controls.right) state.laneTarget = Math.min(2, state.laneTarget + 1);

    const targetX = laneToX(state.laneTarget);
    playerCar.position.x += (targetX - playerCar.position.x) * Math.min(delta * 10, 1);

    const baseMaxSpeed = 108;
    const maxSpeed = baseMaxSpeed + boosts.maxSpeedBonus;
    const accel = (controls.accel ? 42 : 23) + boosts.accelBonus;
    state.playerSpeed = THREE.MathUtils.clamp(
      state.playerSpeed + (accel - state.playerSpeed * 0.37) * delta,
      35,
      maxSpeed
    );

    state.distance += state.playerSpeed * delta;

    for (const powerup of state.activePowerups) {
      powerup.duration -= delta;
    }

    bots.forEach((bot) => {
      bot.userData.distance += bot.userData.speed * delta;
      const relativeZ = (bot.userData.distance - state.distance) % TRACK_LENGTH;
      bot.position.z = ((relativeZ + TRACK_LENGTH) % TRACK_LENGTH) - 20;

      if (Math.random() < 0.01) {
        const lane = Math.floor(Math.random() * 3);
        bot.position.x += (laneToX(lane) - bot.position.x) * 0.15;
      }
    });

    state.timeLeft -= delta;

    const sorted = [state.distance, ...bots.map((bot) => bot.userData.distance)].sort((a, b) => b - a);
    const place = sorted.indexOf(state.distance) + 1;
    updateHud(`${place} / ${mode.bots + 1}`);

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endRace();
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener("resize", () => {
  populateResolutionOptions();
  if (elements.resolution.value === "max") {
    applySettings();
  }
});

updateHud();
populateResolutionOptions();
applySettings();
setMobileControls(window.innerWidth <= 760);
requestAnimationFrame(tick);
