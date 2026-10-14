
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// ==========================================
// WILDLANDS — FIRST-PERSON SURVIVAL
// ==========================================

// SCENE
const scene = new THREE.Scene();
const skyColor = new THREE.Color(0x9bc6d5);
scene.background = skyColor.clone();
scene.fog = new THREE.Fog(0x9bc6d5, 35, 100);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  150
);
camera.rotation.order = "YXZ";
camera.position.set(0, 1.7, 0);

// RENDERER
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "low-power"
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = "block";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "0";

document.body.prepend(renderer.domElement);

// ==========================================
// LIGHTING — FIXED HEMISPHERE REFERENCE
// ==========================================

const hemisphere = new THREE.HemisphereLight(
  0xc6e3ff,
  0x34462a,
  1.6
);
scene.add(hemisphere);

const sunlight = new THREE.DirectionalLight(0xffe4b3, 1.1);
sunlight.position.set(30, 50, 20);
scene.add(sunlight);

// ==========================================
// MATERIALS
// ==========================================

const mat = {
  grass: new THREE.MeshLambertMaterial({ color: 0x648b43 }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x765035 }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x315c35 }),
  leaves2: new THREE.MeshLambertMaterial({ color: 0x477441 }),
  rock: new THREE.MeshLambertMaterial({ color: 0x858b86 }),
  fiber: new THREE.MeshLambertMaterial({ color: 0x99ad56 }),
  berry: new THREE.MeshLambertMaterial({ color: 0x633d9b }),
  bush: new THREE.MeshLambertMaterial({ color: 0x3c7138 })
};

// ==========================================
// WORLD
// ==========================================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  mat.grass
);

ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.03;
scene.add(ground);

const world = new THREE.Group();
scene.add(world);

const resources = [];

const inventory = {
  wood: 0,
  stone: 0,
  fiber: 0,
  berries: 0
};

const keys = {};

let health = 100;
let hunger = 100;
let yaw = 0;
let pitch = 0;
let velocityY = 0;
let grounded = true;
let gameStarted = false;
let inventoryOpen = false;
let elapsed = 0;
let hungerTimer = 0;
let toastTimer = null;

const player = {
  x: 0,
  z: 0,
  height: 1.7,
  speed: 5
};

const clock = new THREE.Clock();

// ==========================================
// RANDOM HELPERS
// ==========================================

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// ==========================================
// RESOURCE CREATION
// ==========================================

function addResource(group, x, z, type, label, amount) {
  group.position.set(x, 0, z);
  world.add(group);

  resources.push({
    group,
    x,
    z,
    type,
    label,
    amount
  });
}

function makeTree(x, z) {
  const group = new THREE.Group();
  const height = rand(2.8, 4.8);
  const trunkHeight = height * 0.48;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, trunkHeight, 5),
    mat.trunk
  );

  trunk.position.y = trunkHeight / 2;
  group.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(height * 0.36, height * 0.72, 5),
    Math.random() > 0.5 ? mat.leaves : mat.leaves2
  );

  crown.position.y = trunkHeight + height * 0.28;
  group.add(crown);

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(height * 0.27, height * 0.55, 5),
    mat.leaves
  );

  top.position.y = trunkHeight + height * 0.58;
  group.add(top);

  addResource(group, x, z, "wood", "Tree", 3);
}

function makeRock(x, z) {
  const group = new THREE.Group();

  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(rand(0.55, 0.9), 0),
    mat.rock
  );

  rock.position.y = 0.48;
  rock.scale.set(1.2, 0.8, 1);
  rock.rotation.set(rand(0, 1), rand(0, 3), rand(0, 1));
  group.add(rock);

  addResource(group, x, z, "stone", "Rock", 3);
}

function makePlant(x, z) {
  const group = new THREE.Group();

  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, rand(0.55, 0.9), 4),
      mat.fiber
    );

    leaf.position.set(
      rand(-0.2, 0.2),
      0.35,
      rand(-0.2, 0.2)
    );

    leaf.rotation.z = rand(-0.5, 0.5);
    group.add(leaf);
  }

  addResource(group, x, z, "fiber", "Wild plant", 2);
}

function makeBush(x, z) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    mat.bush
  );

  body.position.y = 0.45;
  body.scale.set(1.2, 0.85, 1);
  group.add(body);

  for (let i = 0; i < 5; i++) {
    const berry = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.09, 0),
      mat.berry
    );

    berry.position.set(
      rand(-0.4, 0.4),
      rand(0.35, 0.8),
      rand(-0.4, 0.4)
    );

    group.add(berry);
  }

  addResource(group, x, z, "berries", "Berry bush", 3);
}

// Generate the wilderness.
for (let i = 0; i < 100; i++) {
  const x = rand(-45, 45);
  const z = rand(-45, 45);

  // Keep the starting area relatively clear.
  if (Math.hypot(x, z) < 7) continue;

  const roll = Math.random();

  if (roll < 0.48) {
    makeTree(x, z);
  } else if (roll < 0.70) {
    makeRock(x, z);
  } else if (roll < 0.86) {
    makePlant(x, z);
  } else {
    makeBush(x, z);
  }
}

// ==========================================
// USER INTERFACE
// ==========================================

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const inventoryScreen = document.getElementById("inventory");
const hint = document.getElementById("resourceMessage");

function requireElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Wildlands is missing HTML element: #${id}`);
  }

  return element;
}

const healthBar = requireElement("healthBar");
const hungerBar = requireElement("hungerBar");
const healthText = requireElement("healthText");
const hungerText = requireElement("hungerText");
const woodCount = requireElement("woodCount");
const stoneCount = requireElement("stoneCount");
const fiberCount = requireElement("fiberCount");
const berryCount = requireElement("berryCount");
const inventoryItems = requireElement("inventoryItems");
const toast = requireElement("toast");
const clockDisplay = requireElement("clock");

if (!startScreen || !startButton || !inventoryScreen || !hint) {
  throw new Error(
    "Wildlands could not find one or more required UI elements. Check index.html."
  );
}

startButton.addEventListener("click", startGame);

document.getElementById("closeInventory")
  ?.addEventListener("click", closeInventory);

// ==========================================
// STARTING AND STOPPING
// ==========================================

function startGame() {
  if (health <= 0) {
    resetGame();
  }

  gameStarted = true;
  startScreen.classList.add("hidden");
  renderer.domElement.requestPointerLock();
}

document.addEventListener("pointerlockchange", () => {
  const locked =
    document.pointerLockElement === renderer.domElement;

  if (!locked && gameStarted && !inventoryOpen) {
    startScreen.classList.remove("hidden");
    startButton.textContent = "RETURN TO WILDERNESS";
  }
});

// ==========================================
// MOUSE LOOK
// ==========================================

document.addEventListener("mousemove", event => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }

  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;

  pitch = THREE.MathUtils.clamp(pitch, -1.52, 1.52);

  camera.rotation.set(pitch, yaw, 0);
});

// ==========================================
// KEYBOARD INPUT
// ==========================================

document.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (
    [
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight"
    ].includes(event.code)
  ) {
    event.preventDefault();
  }

  if (event.repeat || !gameStarted) return;

  if (event.code === "KeyE" && !inventoryOpen) {
    gather();
  }

  if (event.code === "KeyF" && !inventoryOpen) {
    eatBerry();
  }

  if (event.code === "KeyI") {
    toggleInventory();
  }

  if (event.code === "Escape" && inventoryOpen) {
    closeInventory();
  }
});

document.addEventListener("keyup", event => {
  keys[event.code] = false;
});

document.addEventListener("contextmenu", event => {
  event.preventDefault();
});

// ==========================================
// RESOURCE GATHERING
// ==========================================

function nearestResource() {
  let best = null;
  let bestDistance = 3.5;

  const forward = new THREE.Vector3(
    -Math.sin(yaw),
    0,
    -Math.cos(yaw)
  );

  for (const target of resources) {
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const distance = Math.hypot(dx, dz);

    if (distance > bestDistance) continue;

    const direction = new THREE.Vector3(dx, 0, dz);

    if (distance > 0.01) {
      direction.normalize();

      if (forward.dot(direction) < 0.25) {
        continue;
      }
    }

    best = target;
    bestDistance = distance;
  }

  return best;
}

function gather() {
  const target = nearestResource();

  if (!target) {
    showToast("Nothing nearby to gather.");
    return;
  }

  inventory[target.type] += target.amount;

  world.remove(target.group);
  resources.splice(resources.indexOf(target), 1);

  showToast(`+${target.amount} ${target.type}`);
  updateHUD();
}

function eatBerry() {
  if (inventory.berries <= 0) {
    showToast("You have no berries.");
    return;
  }

  if (hunger >= 100) {
    showToast("You're not hungry.");
    return;
  }

  inventory.berries--;
  hunger = Math.min(100, hunger + 25);

  showToast("You ate berries.");
  updateHUD();
}

// ==========================================
// INVENTORY
// ==========================================

function toggleInventory() {
  if (inventoryOpen) {
    closeInventory();
    return;
  }

  inventoryOpen = true;
  inventoryScreen.classList.remove("hidden");

  document.exitPointerLock();
  updateInventory();
}

function closeInventory() {
  inventoryOpen = false;
  inventoryScreen.classList.add("hidden");

  if (gameStarted) {
    renderer.domElement.requestPointerLock();
  }
}

function updateInventory() {
  const entries = [
    ["Wood", inventory.wood],
    ["Stone", inventory.stone],
    ["Fiber", inventory.fiber],
    ["Berries", inventory.berries]
  ];

  inventoryItems.innerHTML = entries
    .map(([name, amount]) => `
      <div class="inventoryRow">
        <span>${name}</span>
        <strong>${amount}</strong>
      </div>
    `)
    .join("");
}

// ==========================================
// HUD
// ==========================================

function updateHUD() {
  healthBar.style.width = `${health}%`;
  hungerBar.style.width = `${hunger}%`;

  healthText.textContent = Math.ceil(health);
  hungerText.textContent = Math.ceil(hunger);

  woodCount.textContent = inventory.wood;
  stoneCount.textContent = inventory.stone;
  fiberCount.textContent = inventory.fiber;
  berryCount.textContent = inventory.berries;

  if (inventoryOpen) {
    updateInventory();
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 1800);
}

// ==========================================
// PLAYER MOVEMENT
// ==========================================

function updatePlayer(delta) {
  if (!gameStarted || inventoryOpen) return;

  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }

  const forwardInput =
    Number(!!keys.KeyW || !!keys.ArrowUp) -
    Number(!!keys.KeyS || !!keys.ArrowDown);

  const sideInput =
    Number(!!keys.KeyD || !!keys.ArrowRight) -
    Number(!!keys.KeyA || !!keys.ArrowLeft);

  const move = new THREE.Vector3(
    -Math.sin(yaw) * forwardInput +
      Math.cos(yaw) * sideInput,

    0,

    -Math.cos(yaw) * forwardInput -
      Math.sin(yaw) * sideInput
  );

  if (move.lengthSq() > 0) {
    move.normalize();
  }

  const sprinting =
    !!(keys.ShiftLeft || keys.ShiftRight);

  const speed = sprinting ? 8 : player.speed;

  player.x = THREE.MathUtils.clamp(
    player.x + move.x * speed * delta,
    -96,
    96
  );

  player.z = THREE.MathUtils.clamp(
    player.z + move.z * speed * delta,
    -96,
    96
  );

  // Jumping and gravity.
  if (keys.Space && grounded) {
    velocityY = 7;
    grounded = false;
  }

  velocityY -= 18 * delta;
  camera.position.y += velocityY * delta;

  if (camera.position.y <= player.height) {
    camera.position.y = player.height;
    velocityY = 0;
    grounded = true;
  }

  camera.position.x = player.x;
  camera.position.z = player.z;

  const target = nearestResource();

  hint.textContent = target
    ? `Press E to gather ${target.label}`
    : "";
}

// ==========================================
// SURVIVAL SYSTEM
// ==========================================

function updateSurvival(delta) {
  if (!gameStarted || inventoryOpen || health <= 0) {
    return;
  }

  hungerTimer += delta;

  if (hungerTimer < 5) return;

  hungerTimer = 0;
  hunger = Math.max(0, hunger - 0.7);

  if (hunger === 0) {
    health = Math.max(0, health - 3);
  }

  if (health <= 0) {
    health = 0;
    gameStarted = false;

    document.exitPointerLock();

    startScreen.classList.remove("hidden");
    startButton.textContent = "TRY AGAIN";

    showToast("You ran out of health.");
  }

  updateHUD();
}

// ==========================================
// RESET
// ==========================================

function resetGame() {
  health = 100;
  hunger = 100;
  hungerTimer = 0;
  elapsed = 0;

  player.x = 0;
  player.z = 0;

  yaw = 0;
  pitch = 0;
  velocityY = 0;
  grounded = true;

  camera.position.set(0, player.height, 0);
  camera.rotation.set(0, 0, 0);

  for (const key of Object.keys(inventory)) {
    inventory[key] = 0;
  }

  updateHUD();
}

// ==========================================
// DAY / NIGHT CYCLE — FIXED
// ==========================================

function updateDayNight(delta) {
  elapsed += delta;

  const dayLength = 240;
  const phase = (elapsed % dayLength) / dayLength;
  const angle = phase * Math.PI * 2;

  const daylight = Math.max(
    0.12,
    Math.sin(angle) * 0.5 + 0.5
  );

  sunlight.position.set(
    Math.cos(angle) * 45,
    Math.max(5, Math.sin(angle) * 55),
    20
  );

  sunlight.intensity = daylight * 1.4;

  // Update the existing sky color instead of replacing the scene.
  scene.background
    .copy(new THREE.Color(0x101a2c))
    .lerp(new THREE.Color(0x9bc6d5), daylight);

  scene.fog.color.copy(scene.background);

  // FIX: hemisphere is now properly defined above.
  hemisphere.intensity = 0.35 + daylight * 1.2;

  const totalMinutes = Math.floor(phase * 1440);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const day = Math.floor(elapsed / dayLength) + 1;

  clockDisplay.textContent =
    `DAY ${day} · ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// ==========================================
// MAIN GAME LOOP
// ==========================================

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  try {
    updatePlayer(delta);
    updateSurvival(delta);
    updateDayNight(delta);

    renderer.render(scene, camera);
  } catch (error) {
    console.error("Wildlands game loop error:", error);
  }
}

// ==========================================
// WINDOW RESIZING
// ==========================================

window.addEventListener("resize", () => {
  camera.aspect =
    window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.25)
  );
});

// ==========================================
// INITIALIZE
// ==========================================

updateHUD();
animate();

console.log("Wildlands initialized successfully.");
