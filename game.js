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
  preRaceChoices: { turbo: false, magnet: false },
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
  useNitro: document.getElementById("use-nitro"),
  preRaceOptions: document.getElementById("pre-race-options"),
  exitGarage: document.getElementById("exit-garage"),
  exitSettings: document.getElementById("exit-settings"),
  exitShop: document.getElementById("exit-shop"),
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

function createSportsCar(colorValue) {
  const car = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorValue),
    metalness: 0.4,
    roughness: 0.35,
  });
  car.userData.bodyMaterial = bodyMaterial;

  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x0b1120, metalness: 0.35, roughness: 0.45 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x9cc7ff,
    metalness: 0.12,
    roughness: 0.05,
    transparent: true,
    opacity: 0.8,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 6.2), bodyMaterial);
  base.position.y = 0.9;
  car.add(base);

  const frontSlope = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.42, 1.5), bodyMaterial);
  frontSlope.position.set(0, 1.25, 2.25);
  car.add(frontSlope);

  const rearSlope = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.2), bodyMaterial);
  rearSlope.position.set(0, 1.2, -2.3);
  car.add(rearSlope);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.82, 2.35), bodyMaterial);
  cockpit.position.set(0, 1.7, -0.05);
  car.add(cockpit);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 1.2), glassMaterial);
  windshield.position.set(0, 1.9, 0.6);
  car.add(windshield);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2, 0.45, 0.9), glassMaterial);
  rearGlass.position.set(0, 1.88, -1.15);
  car.add(rearGlass);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.15, 0.35), accentMaterial);
  splitter.position.set(0, 0.52, 3.08);
  car.add(splitter);

  const diffuser = splitter.clone();
  diffuser.position.z = -3.08;
  car.add(diffuser);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.12, 0.6), accentMaterial);
  spoiler.position.set(0, 2.2, -2.2);
  car.add(spoiler);

  const spoilerLegL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.12), accentMaterial);
  spoilerLegL.position.set(-0.7, 2.05, -2.2);
  car.add(spoilerLegL);
  const spoilerLegR = spoilerLegL.clone();
  spoilerLegR.position.x = 0.7;
  car.add(spoilerLegR);

  const headlightGeo = new THREE.BoxGeometry(0.45, 0.16, 0.16);
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xe2e8f0,
    emissiveIntensity: 0.26,
  });
  const headlightL = new THREE.Mesh(headlightGeo, headlightMaterial);
  headlightL.position.set(-1.05, 1, 3.16);
  car.add(headlightL);
  const headlightR = headlightL.clone();
  headlightR.position.x = 1.05;
  car.add(headlightR);

  const tailGeo = new THREE.BoxGeometry(0.42, 0.16, 0.12);
  const tailMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
  const tailL = new THREE.Mesh(tailGeo, tailMaterial);
  tailL.position.set(-1, 0.95, -3.13);
  car.add(tailL);
  const tailR = tailL.clone();
  tailR.position.x = 1;
  car.add(tailR);

  const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.72, 20);
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x090f1a, roughness: 0.84, metalness: 0.06 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.8 });
  const wheelOffsets = [
    [-1.45, 0.55, 2.03],
    [1.45, 0.55, 2.03],
    [-1.45, 0.55, -2.03],
    [1.45, 0.55, -2.03],
  ];
  wheelOffsets.forEach(([x, y, z]) => {
    const tire = new THREE.Mesh(wheelGeo, tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, y, z);
    car.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.74, 16), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    car.add(rim);
  });

  return car;
}

const playerCar = createSportsCar(elements.color.value);

playerCar.position.set(0, 0, 0);
scene.add(playerCar);

const bots = [];
const BOT_COLORS = [0xef4444, 0xf59e0b, 0x8b5cf6, 0x14b8a6, 0xf472b6];

function hexFromInput(input) {
  return Number.parseInt(input.replace("#", ""), 16);
}

function pickBotColor(playerHex) {
  const available = BOT_COLORS.filter((color) => color !== playerHex);
  return available[Math.floor(Math.random() * available.length)] ?? 0xef4444;
}

function createBot(index, speed) {
  const playerHex = hexFromInput(elements.color.value);
  const bot = createSportsCar(pickBotColor(playerHex));
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
  elements.useNitro.classList.toggle("hidden", !(state.raceActive && state.inventory.nitro > 0));
}

function showMenuPanel(target) {
  const ids = ["garage", "settings", "shop"];
  ids.forEach((id) => document.getElementById(id).classList.toggle("hidden", id !== target));
}

function openControlPopup() {
  state.preRaceChoices = { turbo: false, magnet: false };
  const turboCount = state.inventory.turbo;
  const magnetCount = state.inventory.magnet;
  elements.preRaceOptions.innerHTML = `
    <button data-powerup="turbo" ${turboCount < 1 ? "disabled" : ""}>Use Turbo Tires (${turboCount})</button>
    <button data-powerup="magnet" ${magnetCount < 1 ? "disabled" : ""}>Use Coin Magnet (${magnetCount})</button>
  `;
  [...elements.preRaceOptions.querySelectorAll("button")].forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.powerup;
      state.preRaceChoices[key] = !state.preRaceChoices[key];
      button.classList.toggle("active", state.preRaceChoices[key]);
    });
  });
  elements.controlPopup.classList.remove("hidden");
}

function closeControlPopup() {
  elements.controlPopup.classList.add("hidden");
}

function hideHomeMenu() {
  elements.homeMenu.classList.add("hidden");
}

function showHomeMenu() {
  elements.homeMenu.classList.remove("hidden");
  document.getElementById("garage").classList.add("hidden");
  document.getElementById("settings").classList.add("hidden");
  document.getElementById("shop").classList.add("hidden");
}

function useNitroNow() {
  if (!state.raceActive || state.inventory.nitro < 1) return;
  state.inventory.nitro -= 1;
  state.activePowerups.push({ key: "nitro", duration: 8 });
  state.usedThisRace.nitro = true;
  updateHud(elements.position.textContent);
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

function applyChosenPreRacePowerups() {
  state.activePowerups = [];
  state.usedThisRace = { nitro: false, turbo: false, magnet: false };

  if (state.preRaceChoices.turbo && state.inventory.turbo > 0) {
    state.inventory.turbo -= 1;
    state.activePowerups.push({ key: "turbo", duration: RACE_DURATION });
    state.usedThisRace.turbo = true;
  }

  if (state.preRaceChoices.magnet && state.inventory.magnet > 0) {
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
  applyChosenPreRacePowerups();
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
    `You earned ${total} coins. ${state.usedThisRace.nitro || state.usedThisRace.turbo || state.usedThisRace.magnet ? "Powerups were used this race." : "Buy powerups in the shop for the next race."}`
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
elements.useNitro.addEventListener("click", useNitroNow);
bindHold(elements.mobileLeft, "left");
bindHold(elements.mobileBoost, "accel");
bindHold(elements.mobileRight, "right");
elements.applySettings.addEventListener("click", () => {
  applySettings();
  showHomeMenu();
});
elements.exitGarage.addEventListener("click", showHomeMenu);
elements.exitSettings.addEventListener("click", showHomeMenu);
elements.exitShop.addEventListener("click", showHomeMenu);

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
  showMenuPanel("");
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
  playerCar.userData.bodyMaterial.color.set(elements.color.value);
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
    showResult("Purchase complete", `Bought 1 ${item}. Select powerups in the pre-race popup or use Nitro during race.`);
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
