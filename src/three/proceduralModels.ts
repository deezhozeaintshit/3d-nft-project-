import * as THREE from 'three';

export interface ModelPartInfo {
  mesh: THREE.Mesh | THREE.Group;
  name: string;
  originalPosition: THREE.Vector3;
  explodeDirection: THREE.Vector3;
  category: 'chassis' | 'reactor' | 'core' | 'armor' | 'accent' | 'optics';
}

export interface Generated3DModel {
  rootGroup: THREE.Group;
  parts: ModelPartInfo[];
  rotatableGroup: THREE.Group;
  animatedRings: THREE.Mesh[];
  coreMesh: THREE.Mesh | null;
  dimensions: { height: number; width: number };
}

/**
 * Deterministic pseudo-random number generator for seeded 3D procedural variations
 */
function createRng(seed: number) {
  let s = Math.abs(seed) % 2147483647;
  if (s === 0) s = 1234567;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Creates procedural PBR materials with filmic physical parameters
 */
function createPBRMaterial(params: {
  color: string | number;
  metalness: number;
  roughness: number;
  emissive?: string | number;
  emissiveIntensity?: number;
  wireframe?: boolean;
  transparent?: boolean;
  opacity?: number;
}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(params.color),
    metalness: params.metalness,
    roughness: params.roughness,
    emissive: params.emissive ? new THREE.Color(params.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: params.emissiveIntensity || 0,
    wireframe: params.wireframe || false,
    transparent: params.transparent || false,
    opacity: params.opacity !== undefined ? params.opacity : 1.0,
    roughnessMap: null,
  });
}

/**
 * Creates soft radial contact shadow texture procedurally
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(256, 256, 10, 256, 256, 240);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.55)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// -------------------------------------------------------------
// 1. CYBERPUNK MECHA SENTINEL / TITAN
// -------------------------------------------------------------
function buildCyberSentinelMech(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'CyberSentinel_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  const baseRadius = 1.3 + rng() * 0.4;
  const baseSides = 6 + Math.floor(rng() * 4) * 2; // 6, 8, 10, 12

  // 1. Hydraulic Pedestal Chassis
  const baseGeom = new THREE.CylinderGeometry(baseRadius * 0.85, baseRadius, 0.35, baseSides);
  const baseMesh = new THREE.Mesh(
    baseGeom,
    createPBRMaterial({ color: '#18181b', metalness: 0.92, roughness: 0.35 })
  );
  baseMesh.position.set(0, 0.175, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  rotatable.add(baseMesh);
  parts.push({
    mesh: baseMesh,
    name: 'Hydraulic Pedestal Chassis',
    originalPosition: baseMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.6, 0),
    category: 'chassis',
  });

  // 2. Lower Stator Induction Ring
  const statorGeom = new THREE.TorusGeometry(baseRadius * 0.75, 0.07 + rng() * 0.04, 16, 36);
  const statorMesh = new THREE.Mesh(
    statorGeom,
    createPBRMaterial({
      color: colors.secondary,
      metalness: 0.95,
      roughness: 0.15,
      emissive: colors.secondary,
      emissiveIntensity: 1.2,
    })
  );
  statorMesh.rotation.x = Math.PI / 2;
  statorMesh.position.set(0, 0.45, 0);
  rotatable.add(statorMesh);
  parts.push({
    mesh: statorMesh,
    name: 'Induction Stator Coil',
    originalPosition: statorMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.3, 0),
    category: 'reactor',
  });

  // 3. Central Reactor Housing
  const reactorGeom = new THREE.CylinderGeometry(0.7 + rng() * 0.2, 0.9 + rng() * 0.15, 0.8, 12);
  const reactorMesh = new THREE.Mesh(
    reactorGeom,
    createPBRMaterial({ color: '#09090b', metalness: colors.metalness, roughness: 0.45 })
  );
  reactorMesh.position.set(0, 0.95, 0);
  reactorMesh.castShadow = true;
  rotatable.add(reactorMesh);
  parts.push({
    mesh: reactorMesh,
    name: 'Sub-Atomic Reactor Housing',
    originalPosition: reactorMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.2, 0),
    category: 'reactor',
  });

  // 4. Central Plasma Core (Variable geometry: icosahedron, dodecahedron, or torus knot)
  let coreGeom: THREE.BufferGeometry;
  const coreChoice = Math.floor(rng() * 3);
  if (coreChoice === 0) {
    coreGeom = new THREE.IcosahedronGeometry(0.52, 2);
  } else if (coreChoice === 1) {
    coreGeom = new THREE.DodecahedronGeometry(0.48, 1);
  } else {
    coreGeom = new THREE.TorusKnotGeometry(0.32, 0.1, 48, 8);
  }
  const coreMesh = new THREE.Mesh(
    coreGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.1,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 3.6,
    })
  );
  coreMesh.position.set(0, 1.75, 0);
  rotatable.add(coreMesh);
  parts.push({
    mesh: coreMesh,
    name: 'Zero-Point Plasma Spark',
    originalPosition: coreMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0),
    category: 'core',
  });

  // 5. Gyroscopic Orbit Ring Alpha
  const ringAGeom = new THREE.TorusGeometry(1.05 + rng() * 0.2, 0.045, 16, 48);
  const ringAMesh = new THREE.Mesh(
    ringAGeom,
    createPBRMaterial({
      color: colors.primary,
      metalness: 0.92,
      roughness: 0.15,
      emissive: colors.primary,
      emissiveIntensity: 1.5,
    })
  );
  ringAMesh.position.set(0, 1.75, 0);
  ringAMesh.rotation.x = Math.PI / (3 + rng());
  rotatable.add(ringAMesh);
  animatedRings.push(ringAMesh);
  parts.push({
    mesh: ringAMesh,
    name: 'Harmonic Flux Gyro Alpha',
    originalPosition: ringAMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0.8, 0.5, 0),
    category: 'accent',
  });

  // 6. Gyroscopic Orbit Ring Beta
  const ringBGeom = new THREE.TorusGeometry(1.3 + rng() * 0.25, 0.04, 16, 48);
  const ringBMesh = new THREE.Mesh(
    ringBGeom,
    createPBRMaterial({
      color: colors.secondary,
      metalness: 0.95,
      roughness: 0.12,
      emissive: colors.secondary,
      emissiveIntensity: 1.8,
    })
  );
  ringBMesh.position.set(0, 1.75, 0);
  ringBMesh.rotation.z = Math.PI / (4 + rng());
  rotatable.add(ringBMesh);
  animatedRings.push(ringBMesh);
  parts.push({
    mesh: ringBMesh,
    name: 'Harmonic Flux Gyro Beta',
    originalPosition: ringBMesh.position.clone(),
    explodeDirection: new THREE.Vector3(-0.8, 0.5, 0),
    category: 'accent',
  });

  // 7. Armored Torso Shell
  const torsoGeom = new THREE.OctahedronGeometry(1.15, 0);
  const torsoMesh = new THREE.Mesh(
    torsoGeom,
    createPBRMaterial({ color: colors.primary, metalness: colors.metalness, roughness: colors.roughness })
  );
  torsoMesh.position.set(0, 2.35, 0);
  torsoMesh.scale.set(1.15, 0.85, 1.05);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  rotatable.add(torsoMesh);
  parts.push({
    mesh: torsoMesh,
    name: 'Composite Chobham Armor',
    originalPosition: torsoMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0.7, 0),
    category: 'armor',
  });

  // 8. Left Shoulder Pylon
  const pylonSpan = 1.15 + rng() * 0.25;
  const pylonGeom = new THREE.BoxGeometry(0.45, 0.85, 0.5);
  const leftPylon = new THREE.Mesh(
    pylonGeom,
    createPBRMaterial({ color: '#27272a', metalness: 0.88, roughness: 0.28 })
  );
  leftPylon.position.set(-pylonSpan, 2.4, 0);
  leftPylon.rotation.z = 0.25;
  leftPylon.castShadow = true;
  rotatable.add(leftPylon);
  parts.push({
    mesh: leftPylon,
    name: 'Port Plasma Cannon Mount',
    originalPosition: leftPylon.position.clone(),
    explodeDirection: new THREE.Vector3(-1.3, 0.4, 0),
    category: 'chassis',
  });

  // 9. Right Shoulder Pylon
  const rightPylon = new THREE.Mesh(
    pylonGeom,
    createPBRMaterial({ color: '#27272a', metalness: 0.88, roughness: 0.28 })
  );
  rightPylon.position.set(pylonSpan, 2.4, 0);
  rightPylon.rotation.z = -0.25;
  rightPylon.castShadow = true;
  rotatable.add(rightPylon);
  parts.push({
    mesh: rightPylon,
    name: 'Starboard Cannon Mount',
    originalPosition: rightPylon.position.clone(),
    explodeDirection: new THREE.Vector3(1.3, 0.4, 0),
    category: 'chassis',
  });

  // 10. Sensor Visor / Headpiece Cowl
  const headGeom = new THREE.CylinderGeometry(0.4, 0.55, 0.45, 6);
  const headMesh = new THREE.Mesh(
    headGeom,
    createPBRMaterial({ color: '#18181b', metalness: 0.95, roughness: 0.15 })
  );
  headMesh.position.set(0, 3.0, 0);
  headMesh.castShadow = true;
  rotatable.add(headMesh);
  parts.push({
    mesh: headMesh,
    name: 'Targeting Computer Cowl',
    originalPosition: headMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 1.2, 0),
    category: 'optics',
  });

  // 11. Ocular Laser Visor Sensor
  const visorGeom = new THREE.BoxGeometry(0.58, 0.12, 0.3);
  const visorMesh = new THREE.Mesh(
    visorGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.05,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 4.2,
    })
  );
  visorMesh.position.set(0, 3.05, 0.35);
  rotatable.add(visorMesh);
  parts.push({
    mesh: visorMesh,
    name: 'Quantum Lidar Sensor Bar',
    originalPosition: visorMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 1.3, 0.6),
    category: 'optics',
  });

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh, dimensions: { height: 3.4, width: 2.9 } };
}

// -------------------------------------------------------------
// 2. BIOTECH NEURAL CORE / SYNAPSE PROCESSOR
// -------------------------------------------------------------
function buildBiotechNeuralCore(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'BiotechCore_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  // 1. Organic Bio-Plinth Base
  const plinthGeom = new THREE.CylinderGeometry(1.4, 1.7, 0.35, 10);
  const plinthMesh = new THREE.Mesh(
    plinthGeom,
    createPBRMaterial({ color: '#064e3b', metalness: 0.8, roughness: 0.3 })
  );
  plinthMesh.position.set(0, 0.175, 0);
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  rotatable.add(plinthMesh);
  parts.push({
    mesh: plinthMesh,
    name: 'Bio-Chamber Foundation',
    originalPosition: plinthMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.6, 0),
    category: 'chassis',
  });

  // 2. Translucent Cryo-Neural Dome Shell
  const domeGeom = new THREE.SphereGeometry(1.3, 32, 24);
  const domeMat = createPBRMaterial({
    color: '#a7f3d0',
    metalness: 0.1,
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
    emissive: colors.primary,
    emissiveIntensity: 0.6,
  });
  const domeMesh = new THREE.Mesh(domeGeom, domeMat);
  domeMesh.position.set(0, 1.85, 0);
  rotatable.add(domeMesh);
  parts.push({
    mesh: domeMesh,
    name: 'Cryo-Neural Containment Dome',
    originalPosition: domeMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 1.2, 0),
    category: 'armor',
  });

  // 3. Central Synaptic Nucleus (Pulsing glowing biological core)
  const nucleusGeom = new THREE.DodecahedronGeometry(0.55 + rng() * 0.15, 2);
  const nucleusMesh = new THREE.Mesh(
    nucleusGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.2,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 4.5,
    })
  );
  nucleusMesh.position.set(0, 1.85, 0);
  rotatable.add(nucleusMesh);
  parts.push({
    mesh: nucleusMesh,
    name: 'Synaptic Bio-Nucleus Core',
    originalPosition: nucleusMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0),
    category: 'core',
  });

  // 4, 5, 6, 7. Branching Neural Axon Conduits
  const axonCount = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < axonCount; i++) {
    const angle = (i * 2 * Math.PI) / axonCount;
    const axonRadius = 1.0 + rng() * 0.3;
    const px = Math.cos(angle) * axonRadius;
    const pz = Math.sin(angle) * axonRadius;

    const axonGeom = new THREE.TorusGeometry(0.7, 0.05, 12, 32, Math.PI);
    const axonMesh = new THREE.Mesh(
      axonGeom,
      createPBRMaterial({
        color: colors.primary,
        metalness: 0.85,
        roughness: 0.2,
        emissive: colors.primary,
        emissiveIntensity: 1.8,
      })
    );
    axonMesh.position.set(px, 1.85, pz);
    axonMesh.rotation.y = angle;
    axonMesh.rotation.x = Math.PI / 4;
    rotatable.add(axonMesh);
    parts.push({
      mesh: axonMesh,
      name: `Neural Axon Branch 0${i + 1}`,
      originalPosition: axonMesh.position.clone(),
      explodeDirection: new THREE.Vector3(px * 1.4, 0, pz * 1.4),
      category: 'reactor',
    });
  }

  // 8. Swirling Harmonic Bio-Ring
  const bioRingGeom = new THREE.TorusGeometry(1.45, 0.04, 16, 48);
  const bioRingMesh = new THREE.Mesh(
    bioRingGeom,
    createPBRMaterial({
      color: colors.secondary,
      metalness: 0.95,
      roughness: 0.12,
      emissive: colors.secondary,
      emissiveIntensity: 2.2,
    })
  );
  bioRingMesh.position.set(0, 1.85, 0);
  bioRingMesh.rotation.x = Math.PI / 3;
  rotatable.add(bioRingMesh);
  animatedRings.push(bioRingMesh);
  parts.push({
    mesh: bioRingMesh,
    name: 'DNA Harmonic Flux Orbit',
    originalPosition: bioRingMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0.8, 0),
    category: 'accent',
  });

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh: nucleusMesh, dimensions: { height: 3.5, width: 3.0 } };
}

// -------------------------------------------------------------
// 3. OBSIDIAN VOID RELIC / DARK MATTER PRISM
// -------------------------------------------------------------
function buildObsidianVoidRelic(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'ObsidianVoid_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  // 1. Deep Obsidian Altar Pedestal
  const altarGeom = new THREE.CylinderGeometry(1.5, 1.85, 0.35, 8);
  const altarMesh = new THREE.Mesh(
    altarGeom,
    createPBRMaterial({ color: '#09090b', metalness: 0.98, roughness: 0.08 })
  );
  altarMesh.position.set(0, 0.175, 0);
  altarMesh.castShadow = true;
  altarMesh.receiveShadow = true;
  rotatable.add(altarMesh);
  parts.push({
    mesh: altarMesh,
    name: 'Void Monolith Altar',
    originalPosition: altarMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.6, 0),
    category: 'chassis',
  });

  // 2. Central Obsidian Faceted Monolith
  const prismSides = 4 + Math.floor(rng() * 3); // 4, 5, 6
  const prismGeom = new THREE.ConeGeometry(0.85, 2.6, prismSides);
  const prismMesh = new THREE.Mesh(
    prismGeom,
    createPBRMaterial({
      color: '#18181b',
      metalness: 0.98,
      roughness: 0.05,
      emissive: '#1e1b4b',
      emissiveIntensity: 0.4,
    })
  );
  prismMesh.position.set(0, 1.9, 0);
  prismMesh.castShadow = true;
  rotatable.add(prismMesh);
  parts.push({
    mesh: prismMesh,
    name: 'Obsidian Singularity Spire',
    originalPosition: prismMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0.6, 0),
    category: 'core',
  });

  // 3. Inner Dark Matter Singularity Heart
  const heartGeom = new THREE.IcosahedronGeometry(0.45, 2);
  const heartMesh = new THREE.Mesh(
    heartGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.2,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 4.8,
    })
  );
  heartMesh.position.set(0, 1.9, 0);
  rotatable.add(heartMesh);
  parts.push({
    mesh: heartMesh,
    name: 'Dark Matter Event Horizon',
    originalPosition: heartMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0),
    category: 'core',
  });

  // 4, 5, 6, 7. Levitating Geometric Shards (Orbiting around the prism)
  const shardCount = 4 + Math.floor(rng() * 4);
  const shardMat = createPBRMaterial({
    color: '#27272a',
    metalness: 0.95,
    roughness: 0.06,
    emissive: colors.secondary,
    emissiveIntensity: 1.2,
  });

  for (let i = 0; i < shardCount; i++) {
    const angle = (i * 2 * Math.PI) / shardCount;
    const dist = 1.35 + rng() * 0.4;
    const px = Math.cos(angle) * dist;
    const pz = Math.sin(angle) * dist;
    const py = 1.4 + (i / shardCount) * 1.2;

    const shardGeom = new THREE.OctahedronGeometry(0.24 + rng() * 0.1, 0);
    const shard = new THREE.Mesh(shardGeom, shardMat);
    shard.position.set(px, py, pz);
    shard.rotation.set(angle, angle * 0.5, 0);
    shard.castShadow = true;
    rotatable.add(shard);
    parts.push({
      mesh: shard,
      name: `Floating Void Shard 0${i + 1}`,
      originalPosition: shard.position.clone(),
      explodeDirection: new THREE.Vector3(px * 1.6, py * 0.3, pz * 1.6),
      category: 'accent',
    });
  }

  // 8. Gold Inlaid Gravitational Gyro Ring
  const ringGeom = new THREE.TorusGeometry(1.5, 0.05, 16, 48);
  const ringMesh = new THREE.Mesh(
    ringGeom,
    createPBRMaterial({
      color: '#f59e0b',
      metalness: 0.98,
      roughness: 0.1,
      emissive: '#d97706',
      emissiveIntensity: 1.5,
    })
  );
  ringMesh.position.set(0, 1.9, 0);
  ringMesh.rotation.x = Math.PI / 2;
  rotatable.add(ringMesh);
  animatedRings.push(ringMesh);
  parts.push({
    mesh: ringMesh,
    name: 'Ancient Graviton Stator',
    originalPosition: ringMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.4, 0),
    category: 'reactor',
  });

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh: heartMesh, dimensions: { height: 3.8, width: 3.2 } };
}

// -------------------------------------------------------------
// 4. WINGED MECHA DRAGON / BEAST
// -------------------------------------------------------------
function buildWingedDragon(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'WingedDragon_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  const scaleMod = 0.9 + rng() * 0.3;

  // 1. Heavy Base Pedestal
  const baseGeom = new THREE.CylinderGeometry(1.5 * scaleMod, 1.8 * scaleMod, 0.35, 8);
  const baseMesh = new THREE.Mesh(
    baseGeom,
    createPBRMaterial({ color: '#111827', metalness: 0.92, roughness: 0.25 })
  );
  baseMesh.position.set(0, 0.175, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  rotatable.add(baseMesh);
  parts.push({
    mesh: baseMesh,
    name: 'Chassis Hearth',
    originalPosition: baseMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.6, 0),
    category: 'chassis',
  });

  // 2. Spine Segment Lower
  const spineGeom = new THREE.ConeGeometry(0.7, 1.2, 5);
  const spineMesh = new THREE.Mesh(
    spineGeom,
    createPBRMaterial({ color: colors.primary, metalness: colors.metalness, roughness: colors.roughness })
  );
  spineMesh.position.set(0, 0.9, 0);
  spineMesh.castShadow = true;
  rotatable.add(spineMesh);
  parts.push({
    mesh: spineMesh,
    name: 'Dorsal Spine Column',
    originalPosition: spineMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.2, 0),
    category: 'chassis',
  });

  // 3. Glowing Heart of the Dragon
  const heartGeom = new THREE.DodecahedronGeometry(0.55 + rng() * 0.1, 1);
  const heartMesh = new THREE.Mesh(
    heartGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.1,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 3.8,
    })
  );
  heartMesh.position.set(0, 1.8, 0);
  rotatable.add(heartMesh);
  parts.push({
    mesh: heartMesh,
    name: 'Inferno Dragon Core',
    originalPosition: heartMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0),
    category: 'core',
  });

  // 4. Chest Breastplate
  const chestGeom = new THREE.OctahedronGeometry(1.0, 0);
  const chestMesh = new THREE.Mesh(
    chestGeom,
    createPBRMaterial({ color: colors.secondary, metalness: 0.85, roughness: 0.2 })
  );
  chestMesh.position.set(0, 1.9, 0.3);
  chestMesh.scale.set(1.1, 1.2, 0.7);
  chestMesh.castShadow = true;
  rotatable.add(chestMesh);
  parts.push({
    mesh: chestMesh,
    name: 'Ventral Dragon Carapace',
    originalPosition: chestMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0.5, 0.8),
    category: 'armor',
  });

  // 5. Left Articulated Wing Array
  const wingSpan = 1.4 + rng() * 0.4;
  const wingGeom = new THREE.BoxGeometry(0.12, 1.8, 0.85);
  const wingMat = createPBRMaterial({ color: colors.primary, metalness: 0.9, roughness: 0.18 });
  const leftWing = new THREE.Mesh(wingGeom, wingMat);
  leftWing.position.set(-wingSpan, 2.2, -0.2);
  leftWing.rotation.set(0.3, -0.4, 0.7);
  leftWing.castShadow = true;
  rotatable.add(leftWing);
  animatedRings.push(leftWing);
  parts.push({
    mesh: leftWing,
    name: 'Port Solar Wing Fin',
    originalPosition: leftWing.position.clone(),
    explodeDirection: new THREE.Vector3(-1.6, 0.5, 0),
    category: 'accent',
  });

  // 6. Right Articulated Wing Array
  const rightWing = new THREE.Mesh(wingGeom, wingMat);
  rightWing.position.set(wingSpan, 2.2, -0.2);
  rightWing.rotation.set(0.3, 0.4, -0.7);
  rightWing.castShadow = true;
  rotatable.add(rightWing);
  animatedRings.push(rightWing);
  parts.push({
    mesh: rightWing,
    name: 'Starboard Solar Wing Fin',
    originalPosition: rightWing.position.clone(),
    explodeDirection: new THREE.Vector3(1.6, 0.5, 0),
    category: 'accent',
  });

  // 7. Horned Dragon Head Visor
  const headGeom = new THREE.ConeGeometry(0.45, 1.1, 4);
  const headMesh = new THREE.Mesh(
    headGeom,
    createPBRMaterial({ color: '#1f2937', metalness: 0.95, roughness: 0.12 })
  );
  headMesh.rotation.x = Math.PI / 3;
  headMesh.position.set(0, 2.8, 0.4);
  headMesh.castShadow = true;
  rotatable.add(headMesh);
  parts.push({
    mesh: headMesh,
    name: 'Horned Apex Sensor Helm',
    originalPosition: headMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 1.1, 0.7),
    category: 'optics',
  });

  // 8. Ocular Energy Blast Emitter
  const eyesGeom = new THREE.BoxGeometry(0.5, 0.1, 0.2);
  const eyesMesh = new THREE.Mesh(
    eyesGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.05,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 4.2,
    })
  );
  eyesMesh.position.set(0, 2.85, 0.75);
  rotatable.add(eyesMesh);
  parts.push({
    mesh: eyesMesh,
    name: 'Plasma Breath Emitter',
    originalPosition: eyesMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 1.2, 1.0),
    category: 'optics',
  });

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh: heartMesh, dimensions: { height: 3.5, width: 3.2 } };
}

// -------------------------------------------------------------
// 5. DIMENSIONAL WARP PORTAL / STARGATE / RING
// -------------------------------------------------------------
function buildDimensionalPortal(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'DimensionalPortal_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  // 1. Temple Base Altar
  const altarGeom = new THREE.CylinderGeometry(1.8, 2.1, 0.4, 12);
  const altarMesh = new THREE.Mesh(
    altarGeom,
    createPBRMaterial({ color: '#090d16', metalness: 0.95, roughness: 0.2 })
  );
  altarMesh.position.set(0, 0.2, 0);
  altarMesh.castShadow = true;
  altarMesh.receiveShadow = true;
  rotatable.add(altarMesh);
  parts.push({
    mesh: altarMesh,
    name: 'Warp Gate Dais',
    originalPosition: altarMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.6, 0),
    category: 'chassis',
  });

  // 2. Primary Stargate Ring (Vertical)
  const ringRadius = 1.45 + rng() * 0.3;
  const gateGeom = new THREE.TorusGeometry(ringRadius, 0.16, 16, 64);
  const gateMesh = new THREE.Mesh(
    gateGeom,
    createPBRMaterial({ color: colors.primary, metalness: colors.metalness, roughness: colors.roughness })
  );
  gateMesh.position.set(0, 1.9, 0);
  gateMesh.castShadow = true;
  rotatable.add(gateMesh);
  parts.push({
    mesh: gateMesh,
    name: 'Primary Gate Toroid',
    originalPosition: gateMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0),
    category: 'reactor',
  });

  // 3. Counter-Rotating Inner Glyphs Ring
  const glyphGeom = new THREE.TorusGeometry(ringRadius * 0.82, 0.08, 12, 48);
  const glyphMesh = new THREE.Mesh(
    glyphGeom,
    createPBRMaterial({
      color: colors.secondary,
      metalness: 0.95,
      roughness: 0.12,
      emissive: colors.secondary,
      emissiveIntensity: 2.2,
    })
  );
  glyphMesh.position.set(0, 1.9, 0);
  rotatable.add(glyphMesh);
  animatedRings.push(glyphMesh);
  parts.push({
    mesh: glyphMesh,
    name: 'Chronos Glyph Rotor',
    originalPosition: glyphMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0.8),
    category: 'accent',
  });

  // 4. Dimensional Event Horizon Core
  const horizonGeom = new THREE.CircleGeometry(ringRadius * 0.78, 32);
  const horizonMesh = new THREE.Mesh(
    horizonGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.2,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 3.8,
    })
  );
  horizonMesh.position.set(0, 1.9, 0);
  rotatable.add(horizonMesh);
  parts.push({
    mesh: horizonMesh,
    name: 'Event Horizon Vortex',
    originalPosition: horizonMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, -0.8),
    category: 'core',
  });

  // 5, 6, 7, 8. Four Quantum Pylons (North, South, East, West)
  const pylonGeom = new THREE.ConeGeometry(0.3, 0.8, 4);
  const pylonMat = createPBRMaterial({ color: '#fbbf24', metalness: 0.98, roughness: 0.08 });
  const pylonOffsets = [
    { pos: [0, 1.9 + ringRadius + 0.35, 0], rot: [0, 0, 0], dir: [0, 1.2, 0], name: 'Zenith Quantum Pylon' },
    { pos: [0, 1.9 - ringRadius - 0.2, 0], rot: [Math.PI, 0, 0], dir: [0, -0.8, 0], name: 'Nadir Quantum Pylon' },
    { pos: [-(ringRadius + 0.25), 1.9, 0], rot: [0, 0, Math.PI / 2], dir: [-1.2, 0, 0], name: 'Port Quantum Pylon' },
    { pos: [ringRadius + 0.25, 1.9, 0], rot: [0, 0, -Math.PI / 2], dir: [1.2, 0, 0], name: 'Starboard Quantum Pylon' },
  ];

  pylonOffsets.forEach((p) => {
    const pMesh = new THREE.Mesh(pylonGeom, pylonMat);
    pMesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
    pMesh.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    pMesh.castShadow = true;
    rotatable.add(pMesh);
    parts.push({
      mesh: pMesh,
      name: p.name,
      originalPosition: pMesh.position.clone(),
      explodeDirection: new THREE.Vector3(p.dir[0], p.dir[1], p.dir[2]),
      category: 'armor',
    });
  });

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh: horizonMesh, dimensions: { height: 3.8, width: 3.4 } };
}

// -------------------------------------------------------------
// 6. FUSION TOKAMAK REACTOR / QUANTUM CORE
// -------------------------------------------------------------
function buildQuantumTokamak(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'QuantumTokamak_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  // 1. Heavy Shielded Base
  const baseGeom = new THREE.CylinderGeometry(1.6, 1.9, 0.45, 10);
  const baseMesh = new THREE.Mesh(
    baseGeom,
    createPBRMaterial({ color: '#131b2e', metalness: 0.9, roughness: 0.3 })
  );
  baseMesh.position.set(0, 0.225, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  rotatable.add(baseMesh);
  parts.push({
    mesh: baseMesh,
    name: 'Cryo-Containment Base',
    originalPosition: baseMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.6, 0),
    category: 'chassis',
  });

  // 2. Central Magnetic Plasma Sphere (Glowing Core)
  const plasmaGeom = new THREE.IcosahedronGeometry(0.7 + rng() * 0.15, 3);
  const plasmaMesh = new THREE.Mesh(
    plasmaGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.1,
      roughness: 0.05,
      emissive: colors.accent,
      emissiveIntensity: 4.5,
    })
  );
  plasmaMesh.position.set(0, 1.8, 0);
  rotatable.add(plasmaMesh);
  parts.push({
    mesh: plasmaMesh,
    name: 'Tokamak Fusion Singularity',
    originalPosition: plasmaMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0),
    category: 'core',
  });

  // 3. Magnetic Containment Toroid
  const toroidGeom = new THREE.TorusGeometry(1.3, 0.18, 16, 48);
  const toroidMesh = new THREE.Mesh(
    toroidGeom,
    createPBRMaterial({ color: colors.primary, metalness: colors.metalness, roughness: colors.roughness })
  );
  toroidMesh.position.set(0, 1.8, 0);
  toroidMesh.rotation.x = Math.PI / 2;
  toroidMesh.castShadow = true;
  rotatable.add(toroidMesh);
  parts.push({
    mesh: toroidMesh,
    name: 'Toroidal Superconductor Core',
    originalPosition: toroidMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0.3, 0),
    category: 'reactor',
  });

  // 4, 5, 6. Stabilizer Struts
  const strutCount = 3 + Math.floor(rng() * 3); // 3, 4, 5
  const strutGeom = new THREE.BoxGeometry(0.28, 2.0, 0.32);
  const strutMat = createPBRMaterial({ color: colors.secondary, metalness: 0.92, roughness: 0.15 });

  for (let i = 0; i < strutCount; i++) {
    const angle = (i * 2 * Math.PI) / strutCount;
    const px = Math.cos(angle) * 1.5;
    const pz = Math.sin(angle) * 1.5;
    const strut = new THREE.Mesh(strutGeom, strutMat);
    strut.position.set(px, 1.8, pz);
    strut.rotation.y = -angle;
    strut.castShadow = true;
    rotatable.add(strut);
    parts.push({
      mesh: strut,
      name: `Stabilizer Coil Column 0${i + 1}`,
      originalPosition: strut.position.clone(),
      explodeDirection: new THREE.Vector3(px * 1.2, 0, pz * 1.2),
      category: 'armor',
    });
  }

  // Counter-Rotating Plasma Flux Rings
  const fluxGeom = new THREE.TorusGeometry(1.55, 0.05, 12, 36);
  const fluxMesh = new THREE.Mesh(
    fluxGeom,
    createPBRMaterial({
      color: colors.secondary,
      metalness: 0.95,
      roughness: 0.1,
      emissive: colors.secondary,
      emissiveIntensity: 2.2,
    })
  );
  fluxMesh.position.set(0, 1.8, 0);
  rotatable.add(fluxMesh);
  animatedRings.push(fluxMesh);
  parts.push({
    mesh: fluxMesh,
    name: 'Outer Magnetic Accelerator',
    originalPosition: fluxMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 1.0, 0),
    category: 'accent',
  });

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh: plasmaMesh, dimensions: { height: 3.4, width: 3.2 } };
}

// -------------------------------------------------------------
// 7. ASTRAL CELESTIAL MONOLITH / SPIRE
// -------------------------------------------------------------
function buildAstralMonolith(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'AstralMonolith_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  // 1. Octagonal Sacred Plinth Base
  const plinthGeom = new THREE.CylinderGeometry(1.6, 1.9, 0.4, 8);
  const plinthMesh = new THREE.Mesh(
    plinthGeom,
    createPBRMaterial({ color: '#0f172a', metalness: 0.95, roughness: 0.15 })
  );
  plinthMesh.position.set(0, 0.2, 0);
  plinthMesh.castShadow = true;
  plinthMesh.receiveShadow = true;
  rotatable.add(plinthMesh);
  parts.push({
    mesh: plinthMesh,
    name: 'Astral Plinth Foundation',
    originalPosition: plinthMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.6, 0),
    category: 'chassis',
  });

  // 2. Central Obelisk Spire
  const obeliskHeight = 2.8 + rng() * 0.8;
  const obeliskGeom = new THREE.ConeGeometry(0.7, obeliskHeight, 4);
  const obeliskMesh = new THREE.Mesh(
    obeliskGeom,
    createPBRMaterial({ color: colors.primary, metalness: colors.metalness, roughness: colors.roughness })
  );
  obeliskMesh.position.set(0, 1.9, 0);
  obeliskMesh.rotation.y = Math.PI / 4;
  obeliskMesh.castShadow = true;
  rotatable.add(obeliskMesh);
  parts.push({
    mesh: obeliskMesh,
    name: 'Celestial Monolith Spire',
    originalPosition: obeliskMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0.6, 0),
    category: 'core',
  });

  // 3. Radiant Stellar Heart
  const heartGeom = new THREE.DodecahedronGeometry(0.45, 0);
  const heartMesh = new THREE.Mesh(
    heartGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.2,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 4.2,
    })
  );
  heartMesh.position.set(0, 1.9, 0);
  rotatable.add(heartMesh);
  parts.push({
    mesh: heartMesh,
    name: 'Pulsing Star Seed',
    originalPosition: heartMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0, 0),
    category: 'core',
  });

  // 4. Inverted Golden Crown Apex
  const crownGeom = new THREE.ConeGeometry(0.58, 1.1, 4);
  const crownMesh = new THREE.Mesh(
    crownGeom,
    createPBRMaterial({ color: '#fbbf24', metalness: 0.98, roughness: 0.08 })
  );
  crownMesh.rotation.x = Math.PI;
  crownMesh.rotation.y = Math.PI / 4;
  crownMesh.position.set(0, 1.9 + obeliskHeight / 2 + 0.3, 0);
  crownMesh.castShadow = true;
  rotatable.add(crownMesh);
  parts.push({
    mesh: crownMesh,
    name: 'Golden Singularity Apex',
    originalPosition: crownMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 1.4, 0),
    category: 'accent',
  });

  // 5. Gyroscopic Orbit Ring
  const levRingGeom = new THREE.TorusGeometry(1.35, 0.06, 16, 48);
  const levRingMesh = new THREE.Mesh(
    levRingGeom,
    createPBRMaterial({
      color: colors.secondary,
      metalness: 0.98,
      roughness: 0.1,
      emissive: colors.secondary,
      emissiveIntensity: 2.0,
    })
  );
  levRingMesh.rotation.x = Math.PI / 2;
  levRingMesh.position.set(0, 0.7, 0);
  rotatable.add(levRingMesh);
  animatedRings.push(levRingMesh);
  parts.push({
    mesh: levRingMesh,
    name: 'Sacred Levitation Ring',
    originalPosition: levRingMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.3, 0),
    category: 'reactor',
  });

  // 6, 7, 8, 9. Orbital Resonator Shards
  const shardCount = 4 + Math.floor(rng() * 3);
  const shardGeom = new THREE.OctahedronGeometry(0.24, 0);
  const shardMat = createPBRMaterial({
    color: colors.secondary,
    metalness: 0.9,
    roughness: 0.2,
    emissive: colors.secondary,
    emissiveIntensity: 1.5,
  });

  for (let idx = 0; idx < shardCount; idx++) {
    const angle = (idx * 2 * Math.PI) / shardCount;
    const radius = 1.35 + rng() * 0.2;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    const shard = new THREE.Mesh(shardGeom, shardMat);
    shard.position.set(px, 1.9 + Math.sin(angle * 2) * 0.35, pz);
    shard.rotation.x = angle;
    shard.rotation.y = angle;
    rotatable.add(shard);
    parts.push({
      mesh: shard,
      name: `Orbital Shard Alpha-0${idx + 1}`,
      originalPosition: shard.position.clone(),
      explodeDirection: new THREE.Vector3(px * 1.5, 0, pz * 1.5),
      category: 'accent',
    });
  }

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh: heartMesh, dimensions: { height: 4.1, width: 3.0 } };
}

// -------------------------------------------------------------
// 8. AUTONOMOUS AERIAL DRONE / SCOUT SHIP
// -------------------------------------------------------------
function buildAutonomousDrone(colors: any, seed: number): Generated3DModel {
  const rng = createRng(seed);
  const root = new THREE.Group();
  root.name = 'Drone_Root';
  const rotatable = new THREE.Group();
  root.add(rotatable);
  const parts: ModelPartInfo[] = [];
  const animatedRings: THREE.Mesh[] = [];

  // 1. Central Aerodynamic Fuselage
  const fuselageGeom = new THREE.BoxGeometry(0.8, 0.45, 1.6);
  const fuselageMesh = new THREE.Mesh(
    fuselageGeom,
    createPBRMaterial({ color: colors.primary, metalness: colors.metalness, roughness: colors.roughness })
  );
  fuselageMesh.position.set(0, 1.8, 0);
  fuselageMesh.castShadow = true;
  rotatable.add(fuselageMesh);
  parts.push({
    mesh: fuselageMesh,
    name: 'Aerodynamic Fuselage Core',
    originalPosition: fuselageMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, 0.5, 0),
    category: 'chassis',
  });

  // 2. Gimbal Sensor Sphere
  const sensorGeom = new THREE.SphereGeometry(0.3, 16, 16);
  const sensorMesh = new THREE.Mesh(
    sensorGeom,
    createPBRMaterial({
      color: colors.accent,
      metalness: 0.1,
      roughness: 0.1,
      emissive: colors.accent,
      emissiveIntensity: 4.0,
    })
  );
  sensorMesh.position.set(0, 1.65, 0.85);
  rotatable.add(sensorMesh);
  parts.push({
    mesh: sensorMesh,
    name: 'Multispectral Sensor Gimbal',
    originalPosition: sensorMesh.position.clone(),
    explodeDirection: new THREE.Vector3(0, -0.4, 0.8),
    category: 'optics',
  });

  // 3, 4, 5, 6. Quad Ion Thrusters
  const thrusterPositions = [
    { pos: [-1.2, 1.8, 0.8], dir: [-1.0, 0, 0.5], name: 'Port Fore Thruster' },
    { pos: [1.2, 1.8, 0.8], dir: [1.0, 0, 0.5], name: 'Starboard Fore Thruster' },
    { pos: [-1.4, 1.8, -0.8], dir: [-1.0, 0, -0.5], name: 'Port Aft Thruster' },
    { pos: [1.4, 1.8, -0.8], dir: [1.0, 0, -0.5], name: 'Starboard Aft Thruster' },
  ];

  thrusterPositions.forEach((tp) => {
    const nacelleGeom = new THREE.CylinderGeometry(0.28, 0.35, 0.6, 16);
    const nacelleMesh = new THREE.Mesh(
      nacelleGeom,
      createPBRMaterial({ color: '#18181b', metalness: 0.9, roughness: 0.2 })
    );
    nacelleMesh.position.set(tp.pos[0], tp.pos[1], tp.pos[2]);
    nacelleMesh.castShadow = true;
    rotatable.add(nacelleMesh);
    parts.push({
      mesh: nacelleMesh,
      name: tp.name,
      originalPosition: nacelleMesh.position.clone(),
      explodeDirection: new THREE.Vector3(tp.dir[0], tp.dir[1], tp.dir[2]),
      category: 'reactor',
    });

    // Internal Thruster Glow Ring
    const glowGeom = new THREE.TorusGeometry(0.25, 0.04, 12, 24);
    const glowMesh = new THREE.Mesh(
      glowGeom,
      createPBRMaterial({
        color: colors.secondary,
        metalness: 0.9,
        roughness: 0.1,
        emissive: colors.secondary,
        emissiveIntensity: 2.8,
      })
    );
    glowMesh.position.set(tp.pos[0], tp.pos[1], tp.pos[2]);
    glowMesh.rotation.x = Math.PI / 2;
    rotatable.add(glowMesh);
    animatedRings.push(glowMesh);
  });

  return { rootGroup: root, parts, rotatableGroup: rotatable, animatedRings, coreMesh: sensorMesh, dimensions: { height: 2.8, width: 3.2 } };
}

/**
 * Intelligent Semantic Parser & Master Factory
 * Parses user's natural language prompt and seed to construct a truly unique 3D model!
 */
export function create3DModelForPreset(
  stylePreset: string,
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    metalness: number;
    roughness: number;
  },
  prompt: string = '',
  seed: number = 42
): Generated3DModel {
  const lowerPrompt = (prompt || '').toLowerCase().trim();

  // 1. Keyword Matching for prompt-tailored 3D Generation
  if (
    lowerPrompt.includes('dragon') ||
    lowerPrompt.includes('beast') ||
    lowerPrompt.includes('wing') ||
    lowerPrompt.includes('creature') ||
    lowerPrompt.includes('dino')
  ) {
    return buildWingedDragon(colors, seed);
  }

  if (
    lowerPrompt.includes('portal') ||
    lowerPrompt.includes('stargate') ||
    lowerPrompt.includes('ring') ||
    lowerPrompt.includes('gate') ||
    lowerPrompt.includes('vortex') ||
    lowerPrompt.includes('warp')
  ) {
    return buildDimensionalPortal(colors, seed);
  }

  if (
    lowerPrompt.includes('reactor') ||
    lowerPrompt.includes('tokamak') ||
    lowerPrompt.includes('fusion') ||
    lowerPrompt.includes('engine') ||
    lowerPrompt.includes('generator')
  ) {
    return buildQuantumTokamak(colors, seed);
  }

  if (
    lowerPrompt.includes('drone') ||
    lowerPrompt.includes('scout') ||
    lowerPrompt.includes('ship') ||
    lowerPrompt.includes('fighter') ||
    lowerPrompt.includes('plane') ||
    lowerPrompt.includes('uav')
  ) {
    return buildAutonomousDrone(colors, seed);
  }

  if (
    lowerPrompt.includes('spire') ||
    lowerPrompt.includes('monolith') ||
    lowerPrompt.includes('obelisk') ||
    lowerPrompt.includes('crystal') ||
    lowerPrompt.includes('celestial') ||
    stylePreset === 'celestial'
  ) {
    return buildAstralMonolith(colors, seed);
  }

  if (
    lowerPrompt.includes('bio') ||
    lowerPrompt.includes('neural') ||
    lowerPrompt.includes('synapse') ||
    lowerPrompt.includes('brain') ||
    lowerPrompt.includes('organic') ||
    stylePreset === 'biotech'
  ) {
    return buildBiotechNeuralCore(colors, seed);
  }

  if (
    lowerPrompt.includes('obsidian') ||
    lowerPrompt.includes('void') ||
    lowerPrompt.includes('dark') ||
    lowerPrompt.includes('prism') ||
    lowerPrompt.includes('black') ||
    stylePreset === 'obsidian'
  ) {
    return buildObsidianVoidRelic(colors, seed);
  }

  // Fallback to Heavy Mecha Sentinel / Titan with dynamic variations
  return buildCyberSentinelMech(colors, seed);
}
