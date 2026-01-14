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
  17) Render (Resize + loop)
   ========================================================= */

/* =========================================================
   Importaciones (Three.js)
   ========================================================= */// Se importan los módulos principales de Three.js y algunos extras (controles, loader FBX y luces de área). 
import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { FBXLoader } from "jsm/loaders/FBXLoader.js";
import { RectAreaLightUniformsLib } from "jsm/lights/RectAreaLightUniformsLib.js";

// Aquí se deja la ruta del modelo FBX para tenerla centralizada y fácil de cambiar.
const FBX_PATH = "./assets/models/hiphopdavid.fbx";

/* =========================================================
   UI (Interfaz y estado)
   ========================================================= */
// ===== UI =====
// Se capturan los elementos del HTML para controlar el botón principal y los botones de cámara.
const btnToggle = document.querySelector("#btnToggle");
const camFront = document.querySelector("#camFront");
const camRight = document.querySelector("#camRight");
const camLeft  = document.querySelector("#camLeft");
const camBack  = document.querySelector("#camBack");

// Overlay estado
// Se crea un overlay flotante para mostrar mensajes de estado (carga, errores, info).
const statusEl = document.createElement("div");
statusEl.style.cssText = `
  position:fixed; top:12px; right:12px; z-index:9999;
  padding:10px 12px; border-radius:10px;
  background:rgba(0,0,0,.55); color:#fff; font:12px/1.35 system-ui,Arial;
  max-width:520px; backdrop-filter: blur(6px);
`;
statusEl.textContent = "Iniciando...";
document.body.appendChild(statusEl);

// Mientras carga, se bloquean botones para evitar clicks antes de tiempo.
btnToggle.disabled = true;
btnToggle.textContent = "Cargando...";
[camFront, camRight, camLeft, camBack].forEach((b) => (b.disabled = true));

/* =========================================================
   Motor Three.js (Renderer + escena)
   ========================================================= */
// ===== THREE =====
// Se inicializa el soporte de shaders para RectAreaLight (si no, estas luces no funcionan bien).
RectAreaLightUniformsLib.init();

// Se prepara el renderer usando el canvas del HTML.
const canvas = document.querySelector("#c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

// Se ajusta el pixel ratio para que se vea nítido sin pasarse de consumo.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Se activan sombras suaves para que el ring y el personaje tengan más profundidad.
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Se crea la escena con un fondo oscuro y niebla para darle ambiente.
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
scene.fog = new THREE.Fog(0x05060a, 8, 45);

/* =========================================================
   Cámaras (Cámara + OrbitControls + presets)
   ========================================================= */
// Cámara
// Se usa una cámara en perspectiva típica para escenas 3D con una distancia de recorte amplia.
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 600);
camera.position.set(0, 1.8, 4.5);

// Se añaden controles orbitales para rotar/zoom de forma suave.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 2.0;
controls.maxDistance = 22.0;

/* =========================================================
   Añadir Luces (Iluminación principal)
   ========================================================= */
// ===== LUCES (TODAS BLANCAS) =====
// Luz ambiente para que nada quede completamente negro.
scene.add(new THREE.AmbientLight(0xffffff, 0.72));

// Hemisphere en blanco también para levantar sombras con un relleno uniforme.
const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.60);
scene.add(hemi);

// Se define una función para crear focos direccionales con sombras bien configuradas.
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

// Se colocan luces direccionales desde 4 lados para iluminar de forma equilibrada.
makeDirLight(0, 12, 12, 1.70);
makeDirLight(0, 12, -12, 1.10);
makeDirLight(-12, 12, 0, 1.30);
makeDirLight(12, 12, 0, 1.30);

// Luz central desde arriba para simular focos del techo.
const overhead = new THREE.PointLight(0xffffff, 2.70, 90);
overhead.position.set(0, 10.0, 0);
overhead.castShadow = true;
scene.add(overhead);

// Luz de recorte (rim) desde atrás para separar silueta del fondo.
const rim = new THREE.PointLight(0xffffff, 1.00, 70);
rim.position.set(0, 4.5, -18);
scene.add(rim);

/* =========================================================
   Escenario (Grupo ground: todo el mundo dentro)
   ========================================================= */
// ===== Grupo mundo (TODO dentro) =====
// Se mete todo lo “del suelo” en un grupo para poder subir/bajar el conjunto de una sola vez.
const ground = new THREE.Group();
scene.add(ground);

// ===== RING (constantes obligatorias) =====
// Estas constantes se mantienen fijas porque controlan la altura de la lona y el ajuste del escenario.
const RING_TOP_Y = 0.355;    // altura lona respecto a ground
const GROUND_NUDGE = 0.87;   // - tu valor
let baseGroundY = 0;         // - una sola vez

/* =========================================================
   Escenario (Estadio + posters de luz)
   ========================================================= */
// ===== Helpers: Posters de luz (sin ruido) =====
// Este helper crea un “poster” emisivo + su marco + una RectAreaLight real apuntando al centro.
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
  // Se calcula la dirección hacia el punto objetivo para separar poster/luces de la pared.
  const inward = new THREE.Vector3().subVectors(aimAt, pos).normalize();

  // Material del panel iluminado para que parezca una pantalla/foco.
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

  // Poster (separado de la pared para evitar z-fighting).
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(w, h), posterMat);
  poster.position.copy(pos).add(inward.clone().multiplyScalar(0.25));
  poster.rotation.y = rotY;
  parent.add(poster);

  // Marco oscuro detrás para que el panel destaque.
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.25, h + 0.25, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.85, metalness: 0.1 })
  );
  frame.position.copy(pos).add(inward.clone().multiplyScalar(0.10));
  frame.rotation.y = rotY;
  frame.castShadow = true;
  parent.add(frame);

  // Luz real (RectAreaLight) para iluminación suave y amplia.
  const area = new THREE.RectAreaLight(color, rectIntensity, w, h);
  area.position.copy(pos).add(inward.clone().multiplyScalar(0.30));
  area.lookAt(aimAt);
  parent.add(area);

  return { poster, area, frame };
}

// Se construye un estadio compacto con paredes, techo y posters que iluminan el ring.
function createCompactStadiumWithPosters() {
  const stadium = new THREE.Group();
  ground.add(stadium);

  const R = 24;
  const H = 14;

  // Suelo interior (círculo) para dar base al estadio.
  const stadiumFloor = new THREE.Mesh(
    new THREE.CircleGeometry(R - 0.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x171c23, roughness: 1.0, metalness: 0.0 })
  );
  stadiumFloor.rotation.x = -Math.PI / 2;
  stadiumFloor.position.y = -0.03;
  stadiumFloor.receiveShadow = true;
  stadium.add(stadiumFloor);

  // Paredes interiores cilíndricas (render por dentro con BackSide).
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

  // Techo tipo anillo para cerrar el escenario.
  const roofRing = new THREE.Mesh(
    new THREE.TorusGeometry(R - 1.2, 0.75, 14, 90),
    new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.85, metalness: 0.15 })
  );
  roofRing.position.y = H - 0.7;
  roofRing.rotation.x = Math.PI / 2;
  roofRing.castShadow = true;
  stadium.add(roofRing);

  // Disco superior para el techo, con material oscuro.
  const roofDisc = new THREE.Mesh(
    new THREE.CircleGeometry(R - 3.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.95, metalness: 0.05, side: THREE.DoubleSide })
  );
  roofDisc.position.y = H - 0.9;
  roofDisc.rotation.x = -Math.PI / 2;
  stadium.add(roofDisc);

  // - Círculo (anillo) ahora BLANCO para que el look sea uniforme con las luces.
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

  // Posters — TODOS BLANCOS, apuntando hacia el centro del ring.
  const yPoster = H - 6.2;
  const wallZ = R - 0.65;
  const aimAt = new THREE.Vector3(0, 5.5, 0);

  // Detrás / Frente
  addLightPoster(stadium, { pos: new THREE.Vector3(0, yPoster, -wallZ), rotY: 0,        w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3(0, yPoster,  wallZ), rotY: Math.PI,  w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });

  // Izquierda / derecha
  addLightPoster(stadium, { pos: new THREE.Vector3(-wallZ, yPoster, 0), rotY: Math.PI/2,  w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3( wallZ, yPoster, 0), rotY: -Math.PI/2, w: 8, h: 3.8, color: 0xffffff, emissiveIntensity: 2.1, rectIntensity: 16, aimAt });

  // Diagonales (también blancas) para rellenar sombras y dar “show”.
  const diag = (R - 0.9) * 0.7071;
  addLightPoster(stadium, { pos: new THREE.Vector3( diag, yPoster - 0.6,  diag), rotY: -3*Math.PI/4, w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3(-diag, yPoster - 0.6,  diag), rotY:  3*Math.PI/4, w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3( diag, yPoster - 0.6, -diag), rotY: -Math.PI/4,   w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });
  addLightPoster(stadium, { pos: new THREE.Vector3(-diag, yPoster - 0.6, -diag), rotY:  Math.PI/4,   w: 6.5, h: 3.0, color: 0xffffff, emissiveIntensity: 1.9, rectIntensity: 10, aimAt });

  // Pantallas (las dejo igual) para aportar un toque de color en el ambiente.
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f18,
    roughness: 0.22,
    metalness: 0.05,
    emissive: 0x22c55e,
    emissiveIntensity: 0.55
  });

  // Se crea una función pequeña para instanciar pantallas y su marco.
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

  // Se colocan cuatro pantallas alrededor del estadio.
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
// ===== RING =====
// Esta función arma el ring completo: suelo, plataforma, lona, cuerdas y esquineros.
function createBoxingRing() {
  const ring = new THREE.Group();
  ground.add(ring);

  // Suelo exterior gris liso (AHORA CON LÍNEAS) para tener referencia visual.
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x1c2027, roughness: 1.0, metalness: 0.0 })
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.0;
  outer.receiveShadow = true;
  ring.add(outer);

  // - Grid con líneas blancas (todas las líneas) para dar guía de escala y composición.
  const grid = new THREE.GridHelper(50, 50, 0xffffff, 0xffffff);
  grid.position.y = 0.001;
  ring.add(grid);

  // Plataforma del ring, ligeramente elevada.
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

  // Lona superior, donde “actúa” el personaje.
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

  // Apron / bordes del ring para rematar el volumen.
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

  // Posts
  // Se crean los postes de las esquinas con un material algo metálico.
  const postMat = new THREE.MeshStandardMaterial({ color: 0x0f141b, roughness: 0.55, metalness: 0.25 });
  const postGeo = new THREE.CylinderGeometry(0.10, 0.10, 2.35, 20);

  // Función rápida para poner cada poste en su posición.
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

  // Cuerdas 3 alturas (líneas del ring)
  // Se modelan como cilindros entre dos puntos, en tres niveles para simular el ring real.
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.7, metalness: 0.0 });
  const ropeRadius = 0.035;
  const ropeHeights = [0.65, 1.05, 1.45];

  // Esta función calcula dirección, longitud y rotación para alinear el cilindro entre A y B.
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

    // Caso especial: si ya está alineado, no hace falta giro.
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

  // Se definen las esquinas del ring como vectores para reutilizarlas con las cuerdas.
  const p1 = new THREE.Vector3(-corner, 0, -corner);
  const p2 = new THREE.Vector3( corner, 0, -corner);
  const p3 = new THREE.Vector3( corner, 0,  corner);
  const p4 = new THREE.Vector3(-corner, 0,  corner);

  // Se tiran las cuerdas en las cuatro direcciones para cada altura.
  for (const y of ropeHeights) {
    ropeBetween(p1, p2, y);
    ropeBetween(p2, p3, y);
    ropeBetween(p3, p4, y);
    ropeBetween(p4, p1, y);
  }

  // Turnbuckles (no son luces, los dejo igual)
  // Los cojines de esquina dan el toque de color típico (rojo/azul).
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
// ===== GRADAS + CROWD =====
// Aquí se montan gradas simples alrededor y se rellena con público instanciado para rendimiento.
function createBleachersAndCrowd() {
  const grp = new THREE.Group();
  ground.add(grp);

  // Materiales para escalones y barandillas.
  const standMat = new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 1.0, metalness: 0.0 });
  const railMat  = new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.55, metalness: 0.15 });

  const stepCount = 6;
  const stepH = 0.35;
  const stepD = 1.35;

  const ringHalf = 6.0;
  const start = ringHalf + 1.2;

  const widthFB = 26;
  const widthLR = 26;

  // Gradas delante/detrás con escalones repetidos.
  function makeStandFrontBack(signZ) {
    for (let i = 0; i < stepCount; i++) {
      const geo = new THREE.BoxGeometry(widthFB, stepH, stepD);
      const step = new THREE.Mesh(geo, standMat);
      step.position.set(0, stepH/2 + i*stepH, signZ*(start + i*stepD));
      step.receiveShadow = true;
      step.castShadow = true;
      grp.add(step);
    }

    // Barandilla superior para rematar la grada.
    const railGeo = new THREE.CylinderGeometry(0.05, 0.05, widthFB, 14);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, stepCount*stepH + 0.55, signZ*(start + (stepCount-0.6)*stepD));
    rail.castShadow = true;
    grp.add(rail);
  }

  // Gradas izquierda/derecha, mismo concepto pero girado.
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

  // Se instancian las cuatro gradas alrededor.
  makeStandFrontBack( 1);
  makeStandFrontBack(-1);
  makeStandLeftRight( 1);
  makeStandLeftRight(-1);

  // Personas instanciadas
  // Se usa InstancedMesh para dibujar cientos de personas sin matar el rendimiento.
  const maxPeople = 900;
  const torsoGeo = new THREE.BoxGeometry(0.34, 0.56, 0.22);
  const legsGeo  = new THREE.BoxGeometry(0.34, 0.26, 0.34);
  const headGeo  = new THREE.SphereGeometry(0.16, 14, 14);

  // vertexColors permite variar color por instancia sin crear materiales nuevos.
  const torsoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0, vertexColors: true });
  const legsMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.0, vertexColors: true });
  const headMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0, vertexColors: true });

  const torsos = new THREE.InstancedMesh(torsoGeo, torsoMat, maxPeople);
  const legs   = new THREE.InstancedMesh(legsGeo,  legsMat,  maxPeople);
  const heads  = new THREE.InstancedMesh(headGeo,  headMat,  maxPeople);

  // Sombras activas y frustum culling desactivado para evitar “parpadeos” con instancias.
  torsos.castShadow = legs.castShadow = heads.castShadow = true;
  torsos.frustumCulled = legs.frustumCulled = heads.frustumCulled = false;

  // Objetos “dummy” para componer matrices de transformación por instancia.
  const dummy  = new THREE.Object3D();
  const dummy2 = new THREE.Object3D();
  const dummy3 = new THREE.Object3D();

  // Pequeñas utilidades para colores aleatorios de ropa y tonos de piel.
  function randChoice(arr){ return arr[(Math.random()*arr.length)|0]; }
  const shirtPalette = [0x111827, 0x1f2937, 0x334155, 0x0f172a, 0x3f3f46, 0x1e293b, 0x4b5563];
  const pantsPalette = [0x0f172a, 0x111827, 0x1f2937, 0x334155, 0x0b1220];

  function skinColor() {
    const skins = [0xf2d6c7, 0xe8c8b0, 0xd9b08c, 0xc6865a, 0x9c6a43];
    return randChoice(skins);
  }

  let peopleCount = 0;

  // Relleno de público en gradas delantera y trasera.
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

        // Torso
        dummy.position.set(x, ySeat + 0.44*scale, z);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        torsos.setMatrixAt(peopleCount, dummy.matrix);
        torsos.setColorAt(peopleCount, new THREE.Color(randChoice(shirtPalette)));

        // Piernas un poco adelantadas para que parezca sentado.
        const forward = new THREE.Vector3(0, 0, signZ > 0 ? -0.18 : 0.18);
        dummy2.position.set(x + forward.x, ySeat + 0.18*scale, z + forward.z);
        dummy2.rotation.set(0, rotY, 0);
        dummy2.scale.set(scale, scale, scale);
        dummy2.updateMatrix();
        legs.setMatrixAt(peopleCount, dummy2.matrix);
        legs.setColorAt(peopleCount, new THREE.Color(randChoice(pantsPalette)));

        // Cabeza
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

  // Relleno de público en laterales.
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

  // Se rellenan las cuatro gradas.
  populateFrontBack( 1);
  populateFrontBack(-1);
  populateLeftRight( 1);
  populateLeftRight(-1);

  // Se actualizan conteos y buffers para que el renderer pinte lo correcto.
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
// ===== Construcción escena =====
// Se construye el estadio, ring y público antes de cargar el personaje.
createCompactStadiumWithPosters();
createBoxingRing();
createBleachersAndCrowd();

/* =========================================================
   Modelo (Medidas + encuadre)
   ========================================================= */
// ===== Utils modelo =====
// tmpBox se reutiliza para evitar crear objetos nuevos cada frame.
const tmpBox = new THREE.Box3();

// Variables que guardan datos “medidos” del modelo para encuadrar cámara y target.
let modelCenter = new THREE.Vector3(0, 1, 0);
let modelRadius = 1.0;
let faceY = 1.6;
let modelHeight = 1.75;

// Ajuste automático del modelo: escala a altura deseada y centra en XZ.
function autoFrameObject(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);

  const height = Math.max(size.y, 1e-6);
  const desiredHeight = 1.75;
  obj.scale.multiplyScalar(desiredHeight / height);

  // Recalcular y centrar XZ
  box.setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  obj.position.x -= center.x;
  obj.position.z -= center.z;

  // Recalcular final para sacar medidas fiables.
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
// Cambia la cámara a una vista concreta (frente, detrás, izquierda, derecha) con distancia calculada.
function setCameraView(view) {
  const distByRadius = modelRadius * 2.7;
  const distByHeight = (modelHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * 1.25;
  const dist = Math.max(distByRadius, distByHeight);

  controls.target.set(modelCenter.x, faceY, modelCenter.z);
  const camY = faceY;

  if (view === "front") camera.position.set(modelCenter.x, camY, modelCenter.z + dist);
  if (view === "back")  camera.position.set(modelCenter.x, camY, modelCenter.z - dist);
  if (view === "left")  camera.position.set(modelCenter.x - dist, camY, modelCenter.z);
  if (view === "right") camera.position.set(modelCenter.x + dist, camY, modelCenter.z);

  // Se recalculan near/far para evitar clipping raro cuando el modelo cambia de tamaño.
  camera.near = Math.max(0.01, modelRadius / 120);
  camera.far = Math.max(220, modelRadius * 260);
  camera.updateProjectionMatrix();
  controls.update();
}

/* =========================================================
   Escenario (Alineación ring a los pies)
   ========================================================= */
// - Subir TODO el mundo para que el ring quede al ras del pie
// Esta función calcula el minY del modelo y ajusta el grupo ground para alinearlo con la lona.
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
// ===== Carga FBX =====
// Se crea el loader para importar el modelo y su animación.
const loader = new FBXLoader();

// Variables que controlan el modelo y su animación.
let model = null;
let mixer = null;
let action = null;
let isPlaying = false;

// Mensaje inicial de carga en el overlay.
statusEl.textContent = "Cargando hiphopdavid.fbx...";

// Se carga el FBX con callbacks: success, progress y error.
loader.load(
  FBX_PATH,
  (obj) => {
    model = obj;

    // Se recorre el modelo para activar sombras en cada mesh.
    model.traverse((n) => {
      if (n.isMesh) {
        n.castShadow = true;
        n.receiveShadow = true;
      }
    });

    // Se posiciona el modelo en origen y se añade a la escena.
    model.position.set(0, 0, 0);
    scene.add(model);

    // Se encuadra y se guardan medidas para cámara/target.
    const framed = autoFrameObject(model);
    modelCenter = framed.center;
    modelRadius = framed.radius;
    faceY = framed.faceY;
    modelHeight = framed.height;

    // Se arranca desde la vista frontal.
    setCameraView("front");

    // Si el FBX no trae animaciones, se avisa y se desactiva el botón.
    if (!obj.animations || obj.animations.length === 0) {
      statusEl.textContent = "⚠️ El FBX cargó pero NO trae animación dentro.";
      btnToggle.textContent = "Sin animación";
      btnToggle.disabled = true;
      return;
    }

    // Se crea el mixer y se selecciona el primer clip de animación.
    mixer = new THREE.AnimationMixer(model);
    action = mixer.clipAction(obj.animations[0]);

    // Se deja en frame 0: se reproduce pero se pausa para quedarse congelado.
    action.reset();
    action.play();
    action.paused = true;
    isPlaying = false;

    // Se fuerza un update para aplicar el primer frame antes de alinear el ring.
    mixer.update(0);
    lockRingToFeetOnce(model);

    // Se habilita UI ya con todo listo.
    btnToggle.disabled = false;
    btnToggle.textContent = "▶ Bailar";
    statusEl.textContent = "- Todas las luces blancas + anillo blanco + grid con líneas.";

    [camFront, camRight, camLeft, camBack].forEach((b) => (b.disabled = false));
  },
  (xhr) => {
    // Progreso de carga si el servidor devuelve el total.
    if (xhr && xhr.total) {
      const pct = ((xhr.loaded / xhr.total) * 100).toFixed(1);
      statusEl.textContent = `Cargando hiphopdavid.fbx... ${pct}%`;
    }
  },
  (err) => {
    // Si falla, se muestra error y se dan pistas típicas (ruta y Live Server).
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
// Toggle play/pause
// El botón alterna entre pausar y reanudar la animación sin reiniciar el clip.
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
// Cámaras
// Cada botón llama a setCameraView con la vista correspondiente.
camFront.addEventListener("click", () => setCameraView("front"));
camBack.addEventListener("click", () => setCameraView("back"));
camLeft.addEventListener("click", () => setCameraView("left"));
camRight.addEventListener("click", () => setCameraView("right"));

/* =========================================================
   Render (Resize + loop)
   ========================================================= */
// Resize
// Se actualiza renderer y aspect de cámara para que el canvas no se deforme.
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

// Loop
// Bucle principal: calcula delta, actualiza controles/animación y renderiza.
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  controls.update();

  if (mixer) mixer.update(dt);

  // Se mantiene el ground fijo al valor calculado para que el ring “no baile” con el modelo.
  ground.position.y = baseGroundY;

  renderer.render(scene, camera);
}
animate();
