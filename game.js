
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc6d5);
scene.fog = new THREE.Fog(0x9bc6d5, 35, 100);

const camera = new THREE.PerspectiveCamera(
  75, innerWidth / innerHeight, 0.1, 150
);
camera.rotation.order = "YXZ";
camera.position.set(0, 1.7, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: "low-power"
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xc6e3ff, 0x34462a, 1.6));

const sunlight = new THREE.DirectionalLight(0xffe4b3, 1.1);
sunlight.position.set(30, 50, 20);
scene.add(sunlight);

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

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  mat.grass
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const world = new THREE.Group();
scene.add(world);

const resources = [];
const inventory = { wood: 0, stone: 0, fiber: 0, berries: 0 };
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
let toastTimer;

const player = { x: 0, z: 0, height: 1.7, speed: 5 };
const clock = new THREE.Clock();

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function addResource(group, x, z, type, label, amount) {
  group.position.set(x, 0, z);
  world.add(group);
  resources.push({ group, x, z, type, label, amount });
}

function makeTree(x, z) {
  const group = new THREE.Group();
  const h = rand(2.8, 4.8);
  const trunkH = h * 0.48;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, trunkH, 5),
    mat.trunk
  );
  trunk.position.y = trunkH / 2;
  group.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(h * 0.36, h * 0.72, 5),
    Math.random() > 0.5 ? mat.leaves : mat.leaves2
  );
  crown.position.y = trunkH + h * 0.28;
  group.add(crown);

  const top = new THREE.Mesh(
    new THREE.ConeGeometry(h * 0.27, h * 0.55, 5),
    mat.leaves
  );
  top.position.y = trunkH + h * 0.58;
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
    leaf.position.set(rand(-0.2, 0.2), 0.35, rand(-0.2, 0.2));
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
    berry.position.set(rand(-0.4, 0.4), rand(0.35, 0.8), rand(-0.4, 0.4));
    group.add(berry);
  }

  addResource(group, x, z, "berries", "Berry bush", 3);
}

for (let i = 0; i < 100; i++) {
  const x = rand(-45, 45);
  const z = rand(-45, 45);

  if (Math.hypot(x, z) < 7) continue;

  const roll = Math.random();
  if (roll < 0.48) makeTree(x, z);
  else if (roll < 0.70) makeRock(x, z);
  else if (roll < 0.86) makePlant(x, z);
  else makeBush(x, z);
}

// UI references
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const inventoryScreen = document.getElementById("inventory");
const hint = document.getElementById("resourceMessage");

startButton.addEventListener("click", startGame);

function startGame() {
  if (health <= 0) resetGame();

  gameStarted = true;
  startScreen.classList.add("hidden");
  renderer.domElement.requestPointerLock();
}

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === renderer.domElement;

  if (!locked && gameStarted && !inventoryOpen) {
    startScreen.classList.remove("hidden");
    startButton.textContent = "RETURN TO WILDERNESS";
  }
});

document.addEventListener("mousemove", event => {
  if (document.pointerLockElement !== renderer.domElement) return;

  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;
  pitch = THREE.MathUtils.clamp(pitch, -1.52, 1.52);

  camera.rotation.set(pitch, yaw, 0);
});

document.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.repeat || !gameStarted) return;

  if (event.code === "KeyE" && !inventoryOpen) gather();
  if (event.code === "KeyF" && !inventoryOpen) eatBerry();
  if (event.code === "KeyI") toggleInventory();
  if (event.code === "Escape" && inventoryOpen) closeInventory();
});

document.addEventListener("keyup", event => {
  keys[event.code] = false;
});

document.addEventListener("contextmenu", event => event.preventDefault());

function nearestResource() {
  let best = null;
  let bestDistance = 3.5;

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));

  for (const target of resources) {
    const dx = target.x - player.x;
    const dz = target.z - player.z;
    const distance = Math.hypot(dx, dz);

    if (distance > bestDistance) continue;

    const direction = new THREE.Vector3(dx, 0, dz).normalize();
    if (distance > 0.01 && forward.dot(direction) < 0.25) continue;

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
  if (inventory.berries <= 0) return showToast("You have no berries.");
  if (hunger >= 100) return showToast("You're not hungry.");

  inventory.berries--;
  hunger = Math.min(100, hunger + 25);
  showToast("You ate berries.");
  updateHUD();
}

function toggleInventory() {
  if (inventoryOpen) return closeInventory();

  inventoryOpen = true;
  inventoryScreen.classList.remove("hidden");
  document.exitPointerLock();
  updateInventory();
}

function closeInventory() {
  inventoryOpen = false;
  inventoryScreen.classList.add("hidden");

  if (gameStarted) renderer.domElement.requestPointerLock();
}

document.getElementById("closeInventory").addEventListener("click", closeInventory);

function updateInventory() {
  const entries = [
    ["Wood", inventory.wood],
    ["Stone", inventory.stone],
    ["Fiber", inventory.fiber],
    ["Berries", inventory.berries]
  ];

  document.getElementById("inventoryItems").innerHTML = entries
    .map(([name, amount]) =>
      `<div class="inventoryRow"><span>${name}</span><strong>${amount}</strong></div>`
    )
    .join("");
}

function updateHUD() {
  document.getElementById("healthBar").style.width = `${health}%`;
  document.getElementById("hungerBar").style.width = `${hunger}%`;
  document.getElementById("healthText").textContent = Math.ceil(health);
  document.getElementById("hungerText").textContent = Math.ceil(hunger);

  document.getElementById("woodCount").textContent = inventory.wood;
  document.getElementById("stoneCount").textContent = inventory.stone;
  document.getElementById("fiberCount").textContent = inventory.fiber;
  document.getElementById("berryCount").textContent = inventory.berries;

  if (inventoryOpen) updateInventory();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 1800);
}

function updatePlayer(delta) {
  if (!gameStarted || inventoryOpen) return;
  if (document.pointerLockElement !== renderer.domElement) return;

  const forwardInput =
    Number(!!keys.KeyW || !!keys.ArrowUp) -
    Number(!!keys.KeyS || !!keys.ArrowDown);

  const sideInput =
    Number(!!keys.KeyD || !!keys.ArrowRight) -
    Number(!!keys.KeyA || !!keys.ArrowLeft);

  const move = new THREE.Vector3(
    -Math.sin(yaw) * forwardInput + Math.cos(yaw) * sideInput,
    0,
    -Math.cos(yaw) * forwardInput - Math.sin(yaw) * sideInput
  );

  if (move.lengthSq() > 0) move.normalize();

  const sprinting = !!(keys.ShiftLeft || keys.ShiftRight);
  const speed = sprinting ? 8 : player.speed;

  player.x = THREE.MathUtils.clamp(player.x + move.x * speed * delta, -96, 96);
  player.z = THREE.MathUtils.clamp(player.z + move.z * speed * delta, -96, 96);

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
  hint.textContent = target ? `Press E to gather ${target.label}` : "";
}

function updateSurvival(delta) {
  if (!gameStarted || inventoryOpen || health <= 0) return;

  hungerTimer += delta;

  if (hungerTimer >= 5) {
    hungerTimer = 0;
    hunger = Math.max(0, hunger - 0.7);

    if (hunger === 0) health = Math.max(0, health - 3);

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
}

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

  for (const key of Object.keys(inventory)) inventory[key] = 0;

  updateHUD();
}

function updateDayNight(delta) {
  elapsed += delta;

  const dayLength = 240;
  const phase = (elapsed % dayLength) / dayLength;
  const angle = phase * Math.PI * 2;
  const daylight = Math.max(0.12, Math.sin(angle) * 0.5 + 0.5);

  sunlight.position.set(Math.cos(angle) * 45, Math.max(5, Math.sin(angle) * 55), 20);
  sunlight.intensity = daylight * 1.4;
  scene.background.set(0x101a2c).lerp(new THREE.Color(0x9bc6d5), daylight);
  scene.fog.color.copy(scene.background);
  hemisphere.intensity = 0.35 + daylight * 1.2;

  const totalMinutes = Math.floor(phase * 1440);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const day = Math.floor(elapsed / dayLength) + 1;

  document.getElementById("clock").textContent =
    `DAY ${day} · ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  updatePlayer(delta);
  updateSurvival(delta);
  updateDayNight(delta);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
});

updateHUD();
animate();
