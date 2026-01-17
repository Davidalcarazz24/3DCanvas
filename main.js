/* =========================================================
   ÍNDICE (comentarios guía)
   =========================================================
   1) Importaciones (Three.js)
   2) UI (Interfaz y estado)
   3) Motor Three.js (Renderer + escena)
   4) Cámaras (Cámara + OrbitControls + presets)
   5) Añadir Luces (Iluminación principal)
   6) Escenario (Grupo ground + constantes ring)
   7) Escenario (Estadio + posters de luz)
   8) Boxeo (Construcción del ring)
   9) Gradas (Público + bleachers)
  10) Escenario (Construcción: estadio + ring + gradas)
  11) Modelo (Medidas + encuadre)
  12) Cámaras (Vistas: frente/detrás/izquierda/derecha)
  13) Escenario (Alineación ring a los pies)
  14) Carga (FBX + animación)
  15) Movimiento e interacción (Bailar/Parar)
  16) Cámaras (Interacción botones)
  17) EXTRA: Movimiento WASD + Control de luz (slider/rueda)
  18) Render (Resize + loop)
   ========================================================= */

/* =========================================================
   Importaciones (Three.js)
   ========================================================= */
import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { FBXLoader } from "jsm/loaders/FBXLoader.js";
import { RectAreaLightUniformsLib } from "jsm/lights/RectAreaLightUniformsLib.js";

const FBX_PATH = "./assets/models/hiphopdavid.fbx";

/* =========================================================
   UI (Interfaz y estado)
   ========================================================= */
const btnToggle = document.querySelector("#btnToggle");
const camFront = document.querySelector("#camFront");
const camRight = document.querySelector("#camRight");
const camLeft  = document.querySelector("#camLeft");
const camBack  = document.querySelector("#camBack");

/* ===== NUEVO: UI LUZ (slider + texto) ===== */
const lightLevel = document.querySelector("#lightLevel");
const lightValue = document.querySelector("#lightValue");

// Overlay estado
const statusEl = document.createElement("div");
statusEl.style.cssText = `
  position:fixed; top:12px; right:12px; z-index:9999;
  padding:10px 12px; border-radius:10px;
  background:rgba(0,0,0,.55); color:#fff; font:12px/1.35 system-ui,Arial;
  max-width:520px; backdrop-filter: blur(6px);
`;
statusEl.textContent = "Iniciando...";
document.body.appendChild(statusEl);

btnToggle.disabled = true;
btnToggle.textContent = "Cargando...";
[camFront, camRight, camLeft, camBack].forEach((b) => (b.disabled = true));

/* La luz empieza desactivada hasta que capturemos las luces de la escena */
if (lightLevel) lightLevel.disabled = true;
if (lightValue) lightValue.textContent = "100%";

/* =========================================================
   Motor Three.js (Renderer + escena)
   ========================================================= */
RectAreaLightUniformsLib.init();

const canvas = document.querySelector("#c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 8, 45);

/* =========================================================
   Cámaras (Cámara + OrbitControls + presets)
   ========================================================= */
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 600);
camera.position.set(0, 1.8, 4.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 2.0;
controls.maxDistance = 22.0;

/* =========================================================
   Añadir Luces (Iluminación principal)
   ========================================================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.72));

const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.60);
scene.add(hemi);

function makeDirLight(x, y, z, intensity) {
  const l = new THREE.DirectionalLight(0xffffff, intensity);
  l.position.set(x, y, z);
  l.castShadow = true;
  l.shadow.mapSize.set(2048, 2048);
  l.shadow.camera.near = 0.5;
  l.shadow.camera.far = 90;
  l.shadow.camera.left = -30;
  l.shadow.camera.right = 30;
  l.shadow.camera.top = 30;
  l.shadow.camera.bottom = -30;
  scene.add(l);
  return l;
}

makeDirLight(0, 12, 12, 1.70);
makeDirLight(0, 12, -12, 1.10);
makeDirLight(-12, 12, 0, 1.30);
makeDirLight(12, 12, 0, 1.30);

const overhead = new THREE.PointLight(0xffffff, 2.70, 90);
overhead.position.set(0, 10.0, 0);
overhead.castShadow = true;
scene.add(overhead);

const rim = new THREE.PointLight(0xffffff, 1.00, 70);
rim.position.set(0, 4.5, -18);
scene.add(rim);

/* =========================================================
   Escenario (Grupo ground: todo el mundo dentro)
   ========================================================= */
const ground = new THREE.Group();
scene.add(ground);

const RING_TOP_Y = 0.355;
const GROUND_NUDGE = 0.87;
let baseGroundY = 0;

/* =========================================================
   Escenario (Estadio + posters de luz)
   ========================================================= */
function addLightPoster(parent, {
  pos = new THREE.Vector3(),
  rotY = 0,
  w = 6,
  h = 3,
  color = 0xffffff,
  emissiveIntensity = 1.6,
  rectIntensity = 10,
  aimAt = new THREE.Vector3(0, 5.5, 0)
}) {
  const inward = new THREE.Vector3().subVectors(aimAt, pos).normalize();

  const posterMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.0,
    emissive: new THREE.Color(color),
    emissiveIntensity,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  });

  const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), posterMat);
  poster.position.copy(pos).add(inward.clone().multiplyScalar(0.25));
  poster.rotation.y = rotY;
  parent.add(poster);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.25, h + 0.25, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.85, metalness: 0.1 })
  );
  frame.position.copy(pos).add(inward.clone().multiplyScalar(0.10));
  frame.rotation.y = rotY;
  frame.castShadow = true;
  parent.add(frame);

  const area = new THREE.RectAreaLight(color, rectIntensity, w, h);
  area.position.copy(pos).add(inward.clone().multiplyScalar(0.30));
  area.lookAt(aimAt);
  parent.add(area);

  return { poster, area, frame };
}

function createCompactStadiumWithPosters() {
  const stadium = new THREE.Group();
  ground.add(stadium);

  const R = 24;
  const H = 14;

  const stadiumFloor = new THREE.Mesh(
    new THREE.CircleGeometry(R - 0.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x171c23, roughness: 1.0, metalness: 0.0 })
  );
  stadiumFloor.rotation.x = -Math.PI / 2;
  stadiumFloor.position.y = -0.03;
  stadiumFloor.receiveShadow = true;
  stadium.add(stadiumFloor);

  const walls = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 72, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0c1118,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.BackSide
    })
  );
  walls.position.y = H / 2 - 0.03;
  stadium.add(walls);

  const roofRing = new THREE.Mesh(
    new THREE.TorusGeometry(R - 1.2, 0.75, 14, 90),
    new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.85, metalness: 0.15 })
  );
  roofRing.position.y = H - 0.7;
  roofRing.rotation.x = Math.PI / 2;
  roofRing.castShadow = true;
  stadium.add(roofRing);

  const roofDisc = new THREE.Mesh(
    new THREE.CircleGeometry(R - 3.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide })
  );
  roofDisc.position.y = H - 0.9;
  roofDisc.rotation.x = -Math.PI / 2;
  stadium.add(roofDisc);

  const ledRing = new THREE.Mesh(
    new THREE.TorusGeometry(R - 3.8, 0.28, 14, 90),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.25,
      metalness: 0.10,
      emissive: 0xffffff,
      emissiveIntensity: 1.35
    })
  );
  ledRing.position.y = H - 3.6;
  ledRing.rotation.x = Math.PI / 2;
  stadium.add(ledRing);

  const yPoster = H - 6.2;
  const wallZ = R - 0.65;
  const aimAt = new THREE.Vector3(0, 5.5, 0);

  addLightPoster(stadium, { pos: new THREE.Vector3(0, yPoster, -wallZ), rotY: 0,        w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3(0, yPoster,  wallZ), rotY: Math.PI,  w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });

  addLightPoster(stadium, { pos: new THREE.Vector3(-wallZ, yPoster, 0), rotY: Math.PI/2,  w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3( wallZ, yPoster, 0), rotY: -Math.PI/2, w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });

  const diag = (R - 0.9) * 0.7071;
  addLightPoster(stadium, { pos: new THREE.Vector3( diag, yPoster - 0.6,  diag), rotY: -3*Math.PI/4, w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3(-diag, yPoster - 0.6,  diag), rotY:  3*Math.PI/4, w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3( diag, yPoster - 0.6, -diag), rotY: -Math.PI/4,   w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3(-diag, yPoster - 0.6, -diag), rotY:  Math.PI/4,   w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f18,
    roughness: 0.22,
    metalness: 0.05,
    emissive: 0x22c55e,
    emissiveIntensity: 0.55
  });

  function addScreen(x, y, z, rotY) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), screenMat);
    s.position.set(x, y, z);
    s.rotation.y = rotY;
    stadium.add(s);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 4.0, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.85, metalness: 0.1 })
    );
    frame.position.set(x, y, z - 0.10 * Math.sign(z || 1));
    frame.rotation.y = rotY;
    frame.castShadow = true;
    stadium.add(frame);
  }

  const screenY = H - 8.1;
  addScreen(0, screenY, -(R - 0.9), 0);
  addScreen(0, screenY,  (R - 0.9), Math.PI);
  addScreen(-(R - 0.9), screenY, 0, Math.PI / 2);
  addScreen( (R - 0.9), screenY, 0, -Math.PI / 2);

  return stadium;
}

/* =========================================================
   Boxeo (Construcción del ring)
   ========================================================= */
function createBoxingRing() {
  const ring = new THREE.Group();
  ground.add(ring);

  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x1c2027, roughness: 1.0, metalness: 0.0 })
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.0;
  outer.receiveShadow = true;
  ring.add(outer);

  const grid = new THREE.GridHelper(50, 50, 0xffffff, 0xffffff);
  grid.position.y = 0.001;
  ring.add(grid);

  const matPlatform = new THREE.MeshStandardMaterial({
    color: 0x262b33,
    roughness: 0.95,
    metalness: 0.0
  });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(12, 0.35, 12), matPlatform);
  platform.position.y = 0.175;
  platform.receiveShadow = true;
  platform.castShadow = true;
  ring.add(platform);

  const matCanvas = new THREE.MeshStandardMaterial({
    color: 0x2e343e,
    roughness: 0.95,
    metalness: 0.0
  });
  const canvasTop = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 10.6), matCanvas);
  canvasTop.rotation.x = -Math.PI / 2;
  canvasTop.position.y = RING_TOP_Y;
  canvasTop.receiveShadow = true;
  ring.add(canvasTop);

  const matApron = new THREE.MeshStandardMaterial({
    color: 0x12161d,
    roughness: 1.0,
    metalness: 0.0
  });
  const apronH = 0.55;
  const apronT = 0.18;
  const half = 10.9 / 2;

  const sideGeoA = new THREE.BoxGeometry(10.9, apronH, apronT);
  const front = new THREE.Mesh(sideGeoA, matApron);
  front.position.set(0, 0.35, half);
  front.castShadow = true;
  ring.add(front);

  const back = front.clone();
  back.position.set(0, 0.35, -half);
  ring.add(back);

  const sideGeoB = new THREE.BoxGeometry(apronT, apronH, 10.9);
  const left = new THREE.Mesh(sideGeoB, matApron);
  left.position.set(-half, 0.35, 0);
  left.castShadow = true;
  ring.add(left);

  const right = left.clone();
  right.position.set(half, 0.35, 0);
  ring.add(right);

  const postMat = new THREE.MeshStandardMaterial({ color: 0x0f141b, roughness: 0.55, metalness: 0.25 });
  const postGeo = new THREE.CylinderGeometry(0.10, 0.10, 2.35, 20);

  function addPost(x, z) {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x, 1.25, z);
    p.castShadow = true;
    ring.add(p);
  }

  const corner = 5.25;
  addPost(-corner, -corner);
  addPost( corner, -corner);
  addPost(-corner,  corner);
  addPost( corner,  corner);

  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.7, metalness: 0.0 });
  const ropeRadius = 0.035;
  const ropeHeights = [0.65, 1.05, 1.45];

  function ropeBetween(a, b, y) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

    const geo = new THREE.CylinderGeometry(ropeRadius, ropeRadius, len, 16);
    const mesh = new THREE.Mesh(geo, ropeMat);
    mesh.position.set(mid.x, y, mid.z);

    const up = new THREE.Vector3(0, 1, 0);
    const nd = dir.clone().normalize();
    let axis = new THREE.Vector3().crossVectors(up, nd);
    const axisLen = axis.length();

    if (axisLen < 1e-6) {
      mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);
    } else {
      axis.normalize();
      const angle = Math.acos(THREE.MathUtils.clamp(up.dot(nd), -1, 1));
      mesh.quaternion.setFromAxisAngle(axis, angle);
    }

    mesh.castShadow = true;
    ring.add(mesh);
  }

  const p1 = new THREE.Vector3(-corner, 0, -corner);
  const p2 = new THREE.Vector3( corner, 0, -corner);
  const p3 = new THREE.Vector3( corner, 0,  corner);
  const p4 = new THREE.Vector3(-corner, 0,  corner);

  for (const y of ropeHeights) {
    ropeBetween(p1, p2, y);
    ropeBetween(p2, p3, y);
    ropeBetween(p3, p4, y);
    ropeBetween(p4, p1, y);
  }

  const padGeo = new THREE.BoxGeometry(0.30, 0.24, 0.30);
  const padRed = new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.8, metalness: 0.0 });
  const padBlue = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8, metalness: 0.0 });

  function addPad(x, z, mat) {
    const pad = new THREE.Mesh(padGeo, mat);
    pad.position.set(x, 1.10, z);
    pad.castShadow = true;
    ring.add(pad);
  }

  addPad(-corner, -corner, padRed);
  addPad( corner, -corner, padBlue);
  addPad(-corner,  corner, padBlue);
  addPad( corner,  corner, padRed);

  return ring;
}

/* =========================================================
   Gradas (Público + bleachers)
   ========================================================= */
function createBleachersAndCrowd() {
  const grp = new THREE.Group();
  ground.add(grp);

  const standMat = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 1.0, metalness: 0.0 });
  const railMat  = new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.55, metalness: 0.15 });

  const stepCount = 6;
  const stepH = 0.35;
  const stepD = 1.35;

  const ringHalf = 6.0;
  const start = ringHalf + 1.2;

  const widthFB = 26;
  const widthLR = 26;

  function makeStandFrontBack(signZ) {
    for (let i = 0; i < stepCount; i++) {
      const geo = new THREE.BoxGeometry(widthFB, stepH, stepD);
      const step = new THREE.Mesh(geo, standMat);
      step.position.set(0, stepH/2 + i*stepH, signZ*(start + i*stepD));
      step.receiveShadow = true;
      step.castShadow = true;
      grp.add(step);
    }

    const railGeo = new THREE.CylinderGeometry(0.05, 0.05, widthFB, 14);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, stepCount*stepH + 0.55, signZ*(start + (stepCount-0.6)*stepD));
    rail.castShadow = true;
    grp.add(rail);
  }

  function makeStandLeftRight(signX) {
    for (let i = 0; i < stepCount; i++) {
      const geo = new THREE.BoxGeometry(stepD, stepH, widthLR);
      const step = new THREE.Mesh(geo, standMat);
      step.position.set(signX*(start + i*stepD), stepH/2 + i*stepH, 0);
      step.receiveShadow = true;
      step.castShadow = true;
      grp.add(step);
    }

    const railGeo = new THREE.CylinderGeometry(0.05, 0.05, widthLR, 14);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(signX*(start + (stepCount-0.6)*stepD), stepCount*stepH + 0.55, 0);
    rail.castShadow = true;
    grp.add(rail);
  }

  makeStandFrontBack( 1);
  makeStandFrontBack(-1);
  makeStandLeftRight( 1);
  makeStandLeftRight(-1);

  const maxPeople = 900;
  const torsoGeo = new THREE.BoxGeometry(0.34, 0.56, 0.22);
  const legsGeo  = new THREE.BoxGeometry(0.34, 0.26, 0.34);
  const headGeo  = new THREE.SphereGeometry(0.16, 14, 14);

  const torsoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0, vertexColors: true });
  const legsMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0, vertexColors: true });
  const headMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0, vertexColors: true });

  const torsos = new THREE.InstancedMesh(torsoGeo, torsoMat, maxPeople);
  const legs   = new THREE.InstancedMesh(legsGeo,  legsMat,  maxPeople);
  const heads  = new THREE.InstancedMesh(headGeo,  headMat,  maxPeople);

  torsos.castShadow = legs.castShadow = heads.castShadow = true;
  torsos.frustumCulled = legs.frustumCulled = heads.frustumCulled = false;

  const dummy  = new THREE.Object3D();
  const dummy2 = new THREE.Object3D();
  const dummy3 = new THREE.Object3D();

  function randChoice(arr){ return arr[(Math.random()*arr.length)|0]; }
  const shirtPalette = [0x111827, 0x1f2937, 0x334155, 0x0f172a, 0x3f3f46, 0x1e293b, 0x4b5563];
  const pantsPalette = [0x0f172a, 0x111827, 0x1f2937, 0x334155, 0x0b1220];

  function skinColor() {
    const skins = [0xf2d6c7, 0xe8c8b0, 0xd9b08c, 0xc6865a, 0x9c6a43];
    return randChoice(skins);
  }

  let peopleCount = 0;

  function populateFrontBack(signZ) {
    const seats = Math.floor((widthFB - 2.0) / 0.85);
    const x0 = -((seats - 1) * 0.85) / 2;

    for (let row = 0; row < stepCount; row++) {
      const z = signZ*(start + row*stepD);
      const ySeat = (row+1)*stepH + 0.02;

      for (let s = 0; s < seats; s++) {
        if (peopleCount >= maxPeople) return;

        const x = x0 + s*0.85;
        const rotY = signZ > 0 ? Math.PI : 0;
        const scale = 0.92 + Math.random()*0.18;

        dummy.position.set(x, ySeat + 0.44*scale, z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        torsos.setMatrixAt(peopleCount, dummy.matrix);
        torsos.setColorAt(peopleCount, new THREE.Color(randChoice(shirtPalette)));

        const forward = new THREE.Vector3(0, 0, signZ > 0 ? -0.18 : 0.18);
        dummy2.position.set(x + forward.x, ySeat + 0.18*scale, z + forward.z);
        dummy2.rotation.set(0, rotY, 0);
        dummy2.scale.set(scale, scale, scale);
        dummy2.updateMatrix();
        legs.setMatrixAt(peopleCount, dummy2.matrix);
        legs.setColorAt(peopleCount, new THREE.Color(randChoice(pantsPalette)));

        dummy3.position.set(x, ySeat + 0.78*scale, z);
        dummy3.rotation.set(0, rotY, 0);
        dummy3.scale.set(scale, scale, scale);
        dummy3.updateMatrix();
        heads.setMatrixAt(peopleCount, dummy3.matrix);
        heads.setColorAt(peopleCount, new THREE.Color(skinColor()));

        peopleCount++;
      }
    }
  }

  function populateLeftRight(signX) {
    const seats = Math.floor((widthLR - 2.0) / 0.85);
    const z0 = -((seats - 1) * 0.85) / 2;

    for (let row = 0; row < stepCount; row++) {
      const x = signX*(start + row*stepD);
      const ySeat = (row+1)*stepH + 0.02;

      for (let s = 0; s < seats; s++) {
        if (peopleCount >= maxPeople) return;

        const z = z0 + s*0.85;
        const rotY = signX > 0 ? -Math.PI/2 : Math.PI/2;
        const scale = 0.92 + Math.random()*0.18;

        dummy.position.set(x, ySeat + 0.44*scale, z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        torsos.setMatrixAt(peopleCount, dummy.matrix);
        torsos.setColorAt(peopleCount, new THREE.Color(randChoice(shirtPalette)));

        const forward = new THREE.Vector3(signX > 0 ? -0.18 : 0.18, 0, 0);
        dummy2.position.set(x + forward.x, ySeat + 0.18*scale, z);
        dummy2.rotation.set(0, rotY, 0);
        dummy2.scale.set(scale, scale, scale);
        dummy2.updateMatrix();
        legs.setMatrixAt(peopleCount, dummy2.matrix);
        legs.setColorAt(peopleCount, new THREE.Color(randChoice(pantsPalette)));

        dummy3.position.set(x, ySeat + 0.78*scale, z);
        dummy3.rotation.set(0, rotY, 0);
        dummy3.scale.set(scale, scale, scale);
        dummy3.updateMatrix();
        heads.setMatrixAt(peopleCount, dummy3.matrix);
        heads.setColorAt(peopleCount, new THREE.Color(skinColor()));

        peopleCount++;
      }
    }
  }

  populateFrontBack( 1);
  populateFrontBack(-1);
  populateLeftRight( 1);
  populateLeftRight(-1);

  torsos.count = legs.count = heads.count = peopleCount;
  torsos.instanceMatrix.needsUpdate = true;
  legs.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;

  if (torsos.instanceColor) torsos.instanceColor.needsUpdate = true;
  if (legs.instanceColor) legs.instanceColor.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;

  grp.add(torsos, legs, heads);
}

/* =========================================================
   Escenario (Construcción: estadio + ring + gradas)
   ========================================================= */
createCompactStadiumWithPosters();
createBoxingRing();
createBleachersAndCrowd();

/* =========================================================
   NUEVO: Control global de luminosidad (captura todas las luces)
   ========================================================= */
const lightBases = [];     // aquí guardo { light, baseIntensity }
let lightPct = 100;        // 100% por defecto

function updateLightUI() {
  if (lightValue) lightValue.textContent = `${Math.round(lightPct)}%`;
  if (lightLevel) lightLevel.value = String(Math.round(lightPct));
}

function applyLightPct() {
  const mul = lightPct / 100;
  for (const it of lightBases) {
    it.light.intensity = it.base * mul;
  }
  updateLightUI();
}

function setLightPct(nextPct) {
  lightPct = THREE.MathUtils.clamp(nextPct, 20, 250);
  applyLightPct();
}

function initLightControl() {
  // Capturo todas las luces existentes en la escena y guardo su intensidad base
  lightBases.length = 0;
  scene.traverse((o) => {
    if (o && o.isLight && typeof o.intensity === "number") {
      lightBases.push({ light: o, base: o.intensity });
    }
  });

  // Si hay slider, lo activo cuando ya sé que hay luces
  if (lightLevel) {
    lightLevel.disabled = lightBases.length === 0;
    updateLightUI();

    // Arrastrar con el ratón
    lightLevel.addEventListener("input", () => {
      setLightPct(Number(lightLevel.value));
    });

    // Rueda del ratón encima del slider (sube/baja sin afectar al zoom)
    lightLevel.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const dir = e.deltaY > 0 ? -1 : 1;
        setLightPct(lightPct + dir * 5);
      },
      { passive: false }
    );
  }

  applyLightPct();
}

// Inicializo control de luz ya que el estadio y sus RectAreaLight ya están creados
initLightControl();

/* =========================================================
   Modelo (Medidas + encuadre)
   ========================================================= */
const tmpBox = new THREE.Box3();

let modelCenter = new THREE.Vector3(0, 1, 0);
let modelRadius = 1.0;
let faceY = 1.6;
let modelHeight = 1.75;

function autoFrameObject(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const height = Math.max(size.y, 1e-6);
  const desiredHeight = 1.75;
  obj.scale.multiplyScalar(desiredHeight / height);

  box.setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  obj.position.x -= center.x;
  obj.position.z -= center.z;

  box.setFromObject(obj);

  const h = box.max.y - box.min.y;
  const faceYLocal = box.min.y + h * 0.85;

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);

  return { center: sphere.center.clone(), radius: Math.max(sphere.radius, 0.001), faceY: faceYLocal, height: h };
}

/* =========================================================
   Cámaras (Vistas: frente/detrás/izquierda/derecha)
   ========================================================= */
function setCameraView(view) {
  const distByRadius = modelRadius * 2.7;
  const distByHeight = (modelHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * 1.25;
  const dist = Math.max(distByRadius, distByHeight);

  // ===== NUEVO: el centro debe ser en MUNDO (si el modelo se mueve con WASD) =====
  const cx = (model ? model.position.x : 0) + modelCenter.x;
  const cz = (model ? model.position.z : 0) + modelCenter.z;
  const cy = (model ? model.position.y : 0) + faceY;

  controls.target.set(cx, cy, cz);
  const camY = cy;

  if (view === "front") camera.position.set(cx, camY, cz + dist);
  if (view === "back")  camera.position.set(cx, camY, cz - dist);
  if (view === "left")  camera.position.set(cx - dist, camY, cz);
  if (view === "right") camera.position.set(cx + dist, camY, cz);

  camera.near = Math.max(0.01, modelRadius / 120);
  camera.far = Math.max(220, modelRadius * 260);
  camera.updateProjectionMatrix();
  controls.update();
}

/* =========================================================
   Escenario (Alineación ring a los pies)
   ========================================================= */
function lockRingToFeetOnce(obj) {
  obj.updateMatrixWorld(true);
  tmpBox.setFromObject(obj);
  const minY = tmpBox.min.y;

  baseGroundY = (minY - RING_TOP_Y) + GROUND_NUDGE;
  ground.position.y = baseGroundY;
}

/* =========================================================
   Carga (FBX + animación)
   ========================================================= */
const loader = new FBXLoader();

let model = null;
let mixer = null;
let action = null;
let isPlaying = false;

statusEl.textContent = "Cargando hiphopdavid.fbx...";

loader.load(
  FBX_PATH,
  (obj) => {
    model = obj;

    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });

    model.position.set(0, 0, 0);
    scene.add(model);

    const framed = autoFrameObject(model);
    modelCenter = framed.center;
    modelRadius = framed.radius;
    faceY = framed.faceY;
    modelHeight = framed.height;

    setCameraView("front");

    if (!obj.animations || obj.animations.length === 0) {
      statusEl.textContent = "⚠️ El FBX cargó pero NO trae animación dentro.";
      btnToggle.textContent = "Sin animación";
      btnToggle.disabled = true;
      return;
    }

    mixer = new THREE.AnimationMixer(model);
    action = mixer.clipAction(obj.animations[0]);

    action.reset();
    action.play();
    action.paused = true;
    isPlaying = false;

    mixer.update(0);
    lockRingToFeetOnce(model);

    btnToggle.disabled = false;
    btnToggle.textContent = "▶ Bailar";
    statusEl.textContent = "Listo: WASD + Luz por slider.";

    [camFront, camRight, camLeft, camBack].forEach((b) => (b.disabled = false));
  },
  (xhr) => {
    if (xhr && xhr.total) {
      const pct = ((xhr.loaded / xhr.total) * 100).toFixed(1);
      statusEl.textContent = `Cargando hiphopdavid.fbx... ${pct}%`;
    }
  },
  (err) => {
    console.error(err);
    statusEl.textContent =
      "❌ Error cargando el FBX. Revisa Live Server + ruta ./assets/models/hiphopdavid.fbx (F12 > Network).";
    btnToggle.textContent = "Error";
    btnToggle.disabled = true;
  }
);

/* =========================================================
   Movimiento e interacción (Bailar/Parar)
   ========================================================= */
btnToggle.addEventListener("click", () => {
  if (!action) return;

  if (isPlaying) {
    action.paused = true;
    isPlaying = false;
    btnToggle.textContent = "▶ Bailar";
    statusEl.textContent = "⏸ Parado (pose congelada).";
  } else {
    action.paused = false;
    isPlaying = true;
    btnToggle.textContent = "⏸ Parar";
    statusEl.textContent = "🥊 Bailando en el ring...";
  }
});

/* =========================================================
   Cámaras (Interacción botones)
   ========================================================= */
camFront.addEventListener("click", () => setCameraView("front"));
camBack.addEventListener("click", () => setCameraView("back"));
camLeft.addEventListener("click", () => setCameraView("left"));
camRight.addEventListener("click", () => setCameraView("right"));

/* =========================================================
   EXTRA: Movimiento WASD (funciona siempre que haya modelo)
   ========================================================= */
// Estado de teclas
const keys = { w:false, a:false, s:false, d:false };

// Vectores reutilizables (para no crear basura)
const vForward = new THREE.Vector3();
const vRight = new THREE.Vector3();
const vMove = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// Ajustes de movimiento (ring)
const MOVE_SPEED = 2.8;
const RING_LIMIT = 4.9;

// Listeners teclado
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") keys.w = true;
  if (e.code === "KeyA") keys.a = true;
  if (e.code === "KeyS") keys.s = true;
  if (e.code === "KeyD") keys.d = true;

  if (e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD") {
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") keys.w = false;
  if (e.code === "KeyA") keys.a = false;
  if (e.code === "KeyS") keys.s = false;
  if (e.code === "KeyD") keys.d = false;

  if (e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD") {
    e.preventDefault();
  }
}, { passive: false });

// Movimiento relativo a la cámara (W = hacia donde miras)
function updateWASD(dt) {
  if (!model) return;

  const f = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
  const r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  if (f === 0 && r === 0) return;

  camera.getWorldDirection(vForward);
  vForward.y = 0;
  if (vForward.lengthSq() < 1e-6) return;
  vForward.normalize();

  vRight.crossVectors(vForward, UP).normalize();

  vMove.set(0, 0, 0);
  vMove.addScaledVector(vForward, f);
  vMove.addScaledVector(vRight, r);
  if (vMove.lengthSq() < 1e-6) return;
  vMove.normalize();

  model.position.x += vMove.x * MOVE_SPEED * dt;
  model.position.z += vMove.z * MOVE_SPEED * dt;

  model.position.x = THREE.MathUtils.clamp(model.position.x, -RING_LIMIT, RING_LIMIT);
  model.position.z = THREE.MathUtils.clamp(model.position.z, -RING_LIMIT, RING_LIMIT);

  model.rotation.y = Math.atan2(vMove.x, vMove.z);

  // Mantengo el target del orbit en la cara del modelo mientras te mueves
  const cx = model.position.x + modelCenter.x;
  const cz = model.position.z + modelCenter.z;
  const cy = model.position.y + faceY;
  controls.target.set(cx, cy, cz);
}

/* =========================================================
   Render (Resize + loop)
   ========================================================= */
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();

  // ===== NUEVO: WASD =====
  updateWASD(dt);

  controls.update();
  if (mixer) mixer.update(dt);

  ground.position.y = baseGroundY;
  renderer.render(scene, camera);
}
animate();
